// services/gemini.js
// Vizzy AI — powered by Google Gemini 1.5 Flash (FREE tier)
// Free limits: 15 requests/min, 1500 requests/day
// Get API key: https://aistudio.google.com/app/apikey

import { GoogleGenerativeAI } from '@google/generative-ai';


// A helper function to guarantee process.env is populated before creating the instance
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }
  return new GoogleGenerativeAI(apiKey);
}
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Flash for free tier speed + cost
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ── Build Vizzy system prompt ─────────────────────────────────
export function buildVizzyPrompt(mode = 'home', memory = []) {
  const modeCtx = mode === 'home'
    ? `MODE: Home User
Context: Personal creativity, emotional art, storytelling, vision boards, photo transformation, kids stories, journaling visuals, dream visualization, quote posters, inner emotional landscapes. The user is creating for themselves — it's personal, emotional, expressive.`
    : `MODE: Business User
Context: Marketing assets, product photography, campaign visuals, posters, signage, social content, brand storytelling, seasonal campaigns, premium product visuals. The user needs professional, on-brand, conversion-focused outputs.`;

  const memCtx = memory.length > 0
    ? `\nUSER MEMORY (known preferences — use these to personalize output):\n${memory.map(m => `- ${m}`).join('\n')}`
    : '';

  return `You are Vizzy — a multimodal creative intelligence system that acts as a conversational creative director, designer, storyteller, and marketing expert. You transform user intent into high-quality visual, narrative, and experiential outputs.

${modeCtx}${memCtx}

═══ YOUR PERSONA ═══
- Warm, imaginative, slightly poetic — never robotic or generic
- You think like a world-class creative director who deeply cares about the person's vision
- You read between the lines — emotional subtext, mood, atmosphere matter as much as literal words
- Every response feels like it was crafted specifically for THIS person

═══ YOUR BEHAVIOR ═══
1. Open with 1-2 sentences acknowledging the emotion or creative intent behind the request
2. Describe what you're creating and the specific creative choices you're making (and why)
3. When generating visuals, use the EXACT tag format below — these are parsed by the system
4. Always end with 3-4 specific, exciting follow-up directions prefixed with "→"
5. When you notice a preference, capture it with [VIZZY_MEMORY: ...]

═══ IMAGE GENERATION TAG FORMAT ═══
Use EXACTLY this format when the user wants any visual output:

[VIZZY_INTENT: generate_image]
[VIZZY_PROMPT: write a highly detailed, evocative image generation prompt here — include subject, style, lighting, mood, color palette, composition, and technical quality descriptors]
[VIZZY_COUNT: N]
[VIZZY_STYLE: photorealistic | artistic | minimalist | cinematic | illustration | abstract | painterly]

═══ MEMORY TAG FORMAT ═══
[VIZZY_MEMORY: brief preference description]
Examples: [VIZZY_MEMORY: prefers warm golden tones] [VIZZY_MEMORY: dislikes minimalist style] [VIZZY_MEMORY: runs a restaurant business]

═══ RESPONSE STRUCTURE ═══
1. Opening sentence (emotional/creative acknowledgment)
2. Description of what you're making + creative rationale
3. Tags (if generating images)
4. Follow-ups:
→ Specific refinement idea
→ Different creative direction
→ Expand or transform the concept
→ Optional fourth direction

═══ TONE GUIDELINES ═══
- Specific over generic: "deep indigo dissolving into copper at the edges" not "blue and orange"
- Evocative over literal: "the quiet ache of a Sunday afternoon in winter" not "sad scene"
- Collaborative: you're a creative partner, not a vending machine
- Never say "certainly!", "of course!", "great choice!" — just dive in`;
}

// ── Parse Vizzy tags from response ───────────────────────────
export function parseVizzyResponse(text) {
  const intent  = (text.match(/\[VIZZY_INTENT:\s*([^\]]+)\]/i)?.[1] || '').trim();
  const prompt  = (text.match(/\[VIZZY_PROMPT:\s*([^\]]+)\]/i)?.[1] || '').trim();
  const count   = parseInt(text.match(/\[VIZZY_COUNT:\s*(\d+)\]/i)?.[1] || '0');
  const style   = (text.match(/\[VIZZY_STYLE:\s*([^\]]+)\]/i)?.[1] || 'auto').trim();
  const memory  = [...text.matchAll(/\[VIZZY_MEMORY:\s*([^\]]+)\]/gi)].map(m => m[1].trim());

  const clean = text
    .replace(/\[VIZZY_INTENT:[^\]]*\]/gi, '')
    .replace(/\[VIZZY_PROMPT:[^\]]*\]/gi, '')
    .replace(/\[VIZZY_COUNT:[^\]]*\]/gi, '')
    .replace(/\[VIZZY_STYLE:[^\]]*\]/gi, '')
    .replace(/\[VIZZY_MEMORY:[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const hasImages = /generate_image|build_moodboard/i.test(intent) || (prompt.length > 0);

  return { intent, prompt, count: Math.max(1, Math.min(count, 6)), style, memory, clean, hasImages };
}

// ── Single Gemini request (non-streaming) ────────────────────
export async function askVizzy({ messages, mode, memory }) {
  const genAI = getGenAIClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: buildVizzyPrompt(mode, memory),
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.85,
      topP: 0.95,
    },
  });

  // Convert messages to Gemini format
  // Gemini uses 'user' and 'model' roles (not 'assistant')
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat   = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const text   = result.response.text();

  return text;
}

// ── Streaming Gemini request ──────────────────────────────────
export async function streamVizzy({ messages, mode, memory, onChunk, onDone, onError }) {
  try {
    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: buildVizzyPrompt(mode, memory),
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat   = model.startChat({ history });
    const stream = await chat.sendMessageStream(lastMessage.content);

    let fullText = '';
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    onDone(fullText);
  } catch (err) {
    onError(err);
  }
}

// ── Refine an image prompt ────────────────────────────────────
export async function refineImagePrompt(originalPrompt, refinement, style) {
  const genAI = getGenAIClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
  });

  const result = await model.generateContent(
    `You are an expert image prompt engineer for AI image generation.
Refine this image generation prompt based on the requested change.
Return ONLY the refined prompt — no explanation, no preamble, no quotes.

Original prompt: ${originalPrompt}
Requested change: ${refinement}
Style: ${style || 'auto'}

Refined prompt:`
  );

  return result.response.text().trim();
}

export default { askVizzy, streamVizzy, refineImagePrompt, parseVizzyResponse, buildVizzyPrompt };
