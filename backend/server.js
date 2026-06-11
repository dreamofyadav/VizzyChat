// backend/server.js — Vizzy Chat API
// Stack: Node.js + Express + MongoDB (Mongoose) + Google Gemini Free API

import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import rateLimit      from 'express-rate-limit';
import dotenv         from 'dotenv';
import connectDB      from './db/connect.js';
import mongoose from 'mongoose';
import User           from './models/User.js';
import Conversation   from './models/Conversation.js';
import Asset          from './models/Asset.js';
import GenerationJob  from './models/GenerationJob.js';
import { streamVizzy, parseVizzyResponse, refineImagePrompt } from './services/gemini.js';
import { generateImages } from './services/imageGen.js';

dotenv.config();

// console.log("GEMINI KEY:", process.env.GEMINI_API_KEY);

const app  = express();
const PORT = process.env.PORT || 3003;

// ── Connect MongoDB ────────────────────────────────────────────
await connectDB();

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3002' }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Too many requests' } });
app.use('/api/', limiter);

// ── SSE helper ─────────────────────────────────────────────────
function sseSetup(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}
function sseSend(res, event, data) {
  res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
}

// ═══════════════════════════════════════════════════════════════
// POST /api/chat  — Main streaming chat endpoint
// ═══════════════════════════════════════════════════════════════


app.post('/api/chat', async (req, res) => {
  const { message, conversation_id, mode = 'home', user_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  sseSetup(res);

  // Get or create conversation in MongoDB
  let conv;
  if (conversation_id  && mongoose.Types.ObjectId.isValid(conversation_id)) {
    conv = await Conversation.findById(conversation_id);
  }
  if (!conv) {
    conv = await Conversation.create({ userId: user_id, mode, title: 'New creation', messages: [] });
  }

  // Get user memory
  let userMemory = [];
  if (user_id) {
    const user = await User.findById(String(user_id)).lean();
    userMemory = (user?.memory || []).map(m => `${m.type}: ${m.value}`);
  }

  // Add user message to conversation
  conv.messages.push({ role: 'user', content: message });
  await conv.save();

  sseSend(res, 'start', { conversation_id: conv._id.toString() });

  let fullText = '';

  await streamVizzy({
    messages: conv.messages.map(m => ({ role: m.role, content: m.content })),
    mode,
    memory: userMemory,
    onChunk: (chunk) => {
      fullText += chunk;
      sseSend(res, 'delta', { text: chunk });
    },
    onDone: async (text) => {
      const parsed = parseVizzyResponse(text);

      // Save assistant message
      conv.messages.push({ role: 'assistant', content: text, intent: parsed.intent });
      await conv.save();

      // Persist memory updates
      if (parsed.memory.length && user_id) {
        const user = await User.findById(String(user_id));
        if (user) {
          parsed.memory.forEach(m => user.addMemory('pref', m));
          await user.save();
        }
      }

      // Dispatch image generation — route to FLUX or DALL-E based on intent
      let generationJobs = [];
      if (parsed.hasImages) {
        const count = Math.max(1, Math.min(parsed.count || 2, 6));
        const jobId = await generateImages({
          prompt:         parsed.prompt,
          style:          parsed.style,
          intent:         parsed.intent,  // used to route: FLUX vs DALL-E
          count,
          userId:         user_id,
          conversationId: conv._id,
          mode,                           // home or business
        });
        generationJobs.push({ job_id: jobId, count, style: parsed.style, intent: parsed.intent });
        sseSend(res, 'generation_started', { jobs: generationJobs });
      }

      sseSend(res, 'done', {
        conversation_id: conv._id.toString(),
        intent: parsed.intent,
        memory_updates: parsed.memory,
        generation_jobs: generationJobs,
      });

      res.end();
    },
    onError: (err) => {
      sseSend(res, 'error', { message: err.message });
      res.end();
    },
  });
});

// ── GET /api/generate/:jobId ────────────────────────────────────
app.get('/api/generate/:jobId', async (req, res) => {
  // const job = await GenerationJob.findById(req.params.jobId).lean();
   const job = await mongoose.model('GenerationJob').findById(req.params.jobId).lean();
  if (!job) { return res.status(404).json({ error: 'Job not found' }); }
  res.json({
    status:    job.status,
    imageUrls: job.imageUrls || [],
    error:     job.error,
  });
});

// ── GET /api/memory/:userId ─────────────────────────────────────
app.get('/api/memory/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId).lean();
  res.json({ memory: (user?.memory || []).map(m => m.value) });
});

// ── POST /api/memory ────────────────────────────────────────────
app.post('/api/memory', async (req, res) => {
  const { user_id, type, value } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  let user = await User.findById(user_id);
  if (!user) { user = new User({ _id: user_id, email: 'guest@vizzy.ai' ,
});
}
  user.addMemory(type || 'pref', value);
  await user.save();
  res.json({ ok: true });
});

// ── GET /api/conversations ──────────────────────────────────────
app.get('/api/conversations', async (req, res) => {
  const { user_id } = req.query;
  const convs = await Conversation.find({ userId: user_id })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select('_id title mode createdAt updatedAt')
    .lean();
  res.json(convs);
});

// ── GET /api/conversations/:id ──────────────────────────────────
app.get('/api/conversations/:id', async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid conversation id' });
  }
  const conv = await Conversation.findById(req.params.id).lean();
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(conv);
});

// ── POST /api/refine ────────────────────────────────────────────
app.post('/api/refine', async (req, res) => {
  const { original_prompt, refinement, style, intent } = req.body;
  const refined = await refineImagePrompt(original_prompt, refinement, style);
  const jobId = await generateImages({ prompt: refined, style, intent: intent || '', count: 2 });
  res.json({ refined_prompt: refined, job_id: jobId });
});

// ── PATCH /api/assets/:id/save ──────────────────────────────────
app.patch('/api/assets/:id/save', async (req, res) => {
  await Asset.findByIdAndUpdate(req.params.id, { isSaved: true });
  res.json({ ok: true });
});

// ── GET /api/assets ─────────────────────────────────────────────
app.get('/api/assets', async (req, res) => {
  const { user_id, saved } = req.query;
  const filter = { userId: user_id };
  if (saved === 'true') filter.isSaved = true;
  const assets = await Asset.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json(assets);
});

// ── Health ──────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  db:     'mongodb',
  ai: {
    chat:         'gemini — brainstorming + conversation (free)',
    image_models: {
      flux_schnell: 'fast creative visuals, moodboards, story scenes',
      flux_dev:     'high-quality artistic, emotional, cinematic, portraits',
      sdxl:         'marketing, posters, product shots, brand visuals',
      fallback:     'pollinations.ai — no key needed, always available',
    },
    routing: 'auto — selected by intent + style per request',
  },
}));

app.listen(PORT, () => {
  const hfStatus = process.env.HF_API_KEY ? '✓ connected' : '✗ not set — using Pollinations fallback';
  console.log(`\n🎨  Vizzy Chat API  →  http://localhost:${PORT}`);
  console.log(`\n    AI Stack (all FREE):`);
  console.log(`    💬 Chat & intent     →  Gemini ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
  console.log(`    ⚡ Fast visuals       →  HF FLUX Schnell     ${hfStatus}`);
  console.log(`    🎨 Artistic/cinematic →  HF FLUX Dev         ${hfStatus}`);
  console.log(`    📣 Marketing/posters  →  HF SDXL             ${hfStatus}`);
  console.log(`    🔁 Fallback           →  Pollinations.ai (always on, no key)`);
  console.log(`    🗄️  Database           →  MongoDB\n`);
});
