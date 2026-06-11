// services/imageGen.js
// ═══════════════════════════════════════════════════════════════
// VIZZY IMAGE GENERATION — 100% FREE via Hugging Face
//
// THREE HF MODELS — smart routed by intent + style:
//
//  FLUX Schnell  (black-forest-labs/FLUX.1-schnell)
//    → fast generations, casual creative, moodboards,
//      vision boards, story scenes, quick iterations
//    → 4 inference steps, no CFG, fastest
//
//  FLUX Dev      (black-forest-labs/FLUX.1-dev)
//    → high-quality artistic, emotional, cinematic,
//      photorealistic, portraits, dream visuals
//    → 20-28 steps, better detail + prompt adherence
//
//  SDXL          (stabilityai/stable-diffusion-xl-base-1.0)
//    → marketing graphics, posters, product shots,
//      brand visuals, signage, illustrations, ads
//    → 30 steps, CFG 7.5, best for structured/composed images
//
//  Pollinations  → FREE fallback (no key needed, always works)
//
// Get free HF token: https://huggingface.co/settings/tokens
// ═══════════════════════════════════════════════════════════════

import GenerationJob from '../models/GenerationJob.js';
import Asset         from '../models/Asset.js';

// ── HF Model IDs (overridable via .env) ──────────────────────
const HF_MODELS = {
  flux_schnell: process.env.HF_FLUX_SCHNELL || 'black-forest-labs/FLUX.1-schnell',
  flux_dev:     process.env.HF_FLUX_DEV     || 'black-forest-labs/FLUX.1-dev',
  sdxl:         process.env.HF_SDXL         || 'stabilityai/stable-diffusion-xl-base-1.0',
};

// ── Routing rules ─────────────────────────────────────────────
//
// FLUX Dev   → best for: artistic, emotional, cinematic,
//              photorealistic, portrait, dream, abstract, painterly
//
// SDXL       → best for: marketing, poster, signage, product,
//              illustration, brand, ad, campaign, typography
//
// FLUX Schnell → best for: everything else — fast, good quality,
//                moodboards, vision boards, story scenes, quick tries
//

const FLUX_DEV_STYLES = [
  'artistic', 'cinematic', 'photorealistic', 'painterly',
  'abstract', 'minimalist',
];

const FLUX_DEV_INTENTS = [
  'emotional', 'dream', 'portrait', 'dreamscape', 'surreal',
  'visualization', 'moodboard', 'landscape', 'atmosphere',
];

const SDXL_STYLES = [
  'marketing', 'poster', 'illustration', 'signage',
];

const SDXL_INTENTS = [
  'marketing', 'poster', 'signage', 'ad', 'advertisement',
  'campaign', 'banner', 'flyer', 'label', 'product',
  'brand', 'promotion', 'social_post', 'typography',
];

const SDXL_KEYWORDS =
  /\b(poster|signage|banner|flyer|label|sale|discount|logo|typography|slogan|headline|ad|campaign|product shot|brand|illustration)\b/i;

function selectHFModel(intent = '', style = '', prompt = '') {
  const i = intent.toLowerCase();
  const s = style.toLowerCase();
  const p = prompt.toLowerCase();

  // SDXL for marketing / structured / composed images
  if (
    SDXL_INTENTS.some(k => i.includes(k)) ||
    SDXL_STYLES.some(k  => s.includes(k)) ||
    SDXL_KEYWORDS.test(p)
  ) return 'sdxl';

  // FLUX Dev for high-quality artistic / emotional / cinematic
  if (
    FLUX_DEV_INTENTS.some(k => i.includes(k)) ||
    FLUX_DEV_STYLES.some(k  => s.includes(k))
  ) return 'flux_dev';

  // FLUX Schnell for everything else — fast + good
  return 'flux_schnell';
}

// ── Main entry ────────────────────────────────────────────────
async function generateImages({ prompt, style, intent, count, userId, conversationId, mode }) {
  const modelKey = process.env.HF_API_KEY
    ? selectHFModel(intent, style, prompt)
    : 'pollinations'; // fallback if no HF key

  const job = await GenerationJob.create({
    userId, conversationId, prompt, style, count,
    generationApi: modelKey, status: 'pending',
  });

  // Fire-and-forget
  runGeneration({ jobId: job._id, prompt, style, intent, count, modelKey, userId, conversationId, mode });

  return job._id.toString();
}

// ── Runner ────────────────────────────────────────────────────
async function runGeneration({ jobId, prompt, style, intent, count, modelKey, userId, conversationId, mode }) {
  try {
    await GenerationJob.findByIdAndUpdate(jobId, { status: 'processing', startedAt: new Date() });
    const start = Date.now();
    let imageUrls = [];

    if (modelKey === 'pollinations') {
      imageUrls = await generateWithPollinations(prompt, style, mode, count);
    } else {
      imageUrls = await generateWithHF(modelKey, prompt, style, mode, count);
      // If HF fails entirely, fall back to Pollinations
      if (imageUrls.length === 0) {
        console.warn(`[HF:${modelKey}] No images returned — falling back to Pollinations`);
        imageUrls = await generateWithPollinations(prompt, style, mode, count);
      }
    }

    const elapsed = Date.now() - start;
    console.log(`[${modelKey.toUpperCase()}] ✓ ${imageUrls.length} image(s) in ${elapsed}ms`);

    const assets = await Asset.insertMany(
      imageUrls.map(url => ({
        userId,
        conversationId,
        originalPrompt: prompt,
        refinedPrompt:  buildPrompt(modelKey, prompt, style, mode),
        imageUrl:        url,
        thumbnailUrl:    url,
        status:         'completed',
        generationApi:   modelKey,
        style,
        generationMs:    elapsed,
        mode:            mode || 'home',
      }))
    );

    await GenerationJob.findByIdAndUpdate(jobId, {
      status:      'completed',
      imageUrls,
      assetIds:    assets.map(a => a._id),
      completedAt: new Date(),
    });

  } catch (err) {
    console.error(`[IMAGE GEN ERROR] model=${modelKey} | ${err.message}`);
    await GenerationJob.findByIdAndUpdate(jobId, {
      status: 'failed', error: err.message, completedAt: new Date(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// HUGGING FACE — all three models
// ═══════════════════════════════════════════════════════════════
async function generateWithHF(modelKey, prompt, style, mode, count) {
  const modelId   = HF_MODELS[modelKey];
  const builtPrompt = buildPrompt(modelKey, prompt, style, mode);
  const batchSize = Math.min(count, 4);

  console.log(`[HF:${modelKey}] model: ${modelId} | ${batchSize} image(s)`);
  console.log(`[HF:${modelKey}] prompt: ${builtPrompt.slice(0, 100)}...`);

  // Model-specific parameters
  const params = getModelParams(modelKey, style);

  const requests = Array.from({ length: batchSize }, (_, i) =>
    callHFInference(modelId, builtPrompt, { ...params, seed: Date.now() + i * 137 })
  );

  const results = await Promise.allSettled(requests);
  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

async function callHFInference(modelId, prompt, parameters, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/models/${modelId}`,
        {
          method: 'POST',
          headers: {
            Authorization:      `Bearer ${process.env.HF_API_KEY}`,
            'Content-Type':     'application/json',
            'x-wait-for-model': 'true',
          },
          body: JSON.stringify({ inputs: prompt, parameters }),
        }
      );

      // Model still loading — wait and retry
      if (res.status === 503) {
        const wait = attempt * 15000; // 15s, 30s
        console.log(`[HF] Model loading (attempt ${attempt}) — waiting ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HF ${res.status}: ${errText.slice(0, 200)}`);
      }

      // Convert binary response to base64 data URL
      const buffer      = await res.arrayBuffer();
      const base64      = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;

    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[HF] Attempt ${attempt} failed: ${err.message} — retrying...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

// ── Per-model inference parameters ───────────────────────────
function getModelParams(modelKey, style) {
  const isPortrait = style === 'portrait';
  const isWide     = style === 'wide';
  const w = isWide ? 1344 : isPortrait ? 768  : 1024;
  const h = isWide ? 768  : isPortrait ? 1344 : 1024;

  switch (modelKey) {

    // ── FLUX Schnell ────────────────────────────────────────────
    // Optimized for speed — 4 steps, no guidance needed
    // Best aspect ratios: 1:1, 16:9, 9:16
    case 'flux_schnell':
      return {
        num_inference_steps: 4,
        guidance_scale:      0,   // schnell ignores CFG
        width:               w,
        height:              h,
      };

    // ── FLUX Dev ────────────────────────────────────────────────
    // High quality — 20-28 steps, low guidance (3-4.5 works best)
    // Excellent prompt adherence, rich detail
    case 'flux_dev':
      return {
        num_inference_steps: 28,
        guidance_scale:      3.5,
        width:               w,
        height:              h,
      };

    // ── SDXL ────────────────────────────────────────────────────
    // Classic Stable Diffusion XL — 30 steps, CFG 7.5
    // Great for structured compositions, illustrations, posters
    // Note: SDXL works best at 1024x1024
    case 'sdxl':
      return {
        num_inference_steps: 30,
        guidance_scale:      7.5,
        width:               1024,
        height:              1024,
        negative_prompt:     'blurry, low quality, distorted, ugly, watermark, text overlay',
      };

    default:
      return { num_inference_steps: 20, guidance_scale: 7 };
  }
}

// ═══════════════════════════════════════════════════════════════
// POLLINATIONS — free fallback, no key needed
// ═══════════════════════════════════════════════════════════════
async function generateWithPollinations(prompt, style, mode, count) {
  const builtPrompt   = buildPollinationsPrompt(prompt, style, mode);
  const encodedPrompt = encodeURIComponent(builtPrompt);
  const seed          = Date.now();

  const w = style === 'wide' ? 1280 : style === 'portrait' ? 768  : 1024;
  const h = style === 'wide' ? 720  : style === 'portrait' ? 1024 : 1024;

  console.log(`[POLLINATIONS] ${count} image(s) — no key needed`);

  const requests = Array.from({ length: Math.min(count, 6) }, (_, i) => {
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}` +
      `?width=${w}&height=${h}&seed=${seed + i * 100}&model=flux&nologo=true&enhance=true`;

    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Pollinations ${res.status}`);
        return url; // Pollinations returns the image at the URL directly
      })
      .catch(err => { console.error('[POLLINATIONS]', err.message); return null; });
  });

  const results = await Promise.all(requests);
  return results.filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDERS — tuned per model
// ═══════════════════════════════════════════════════════════════

function buildPrompt(modelKey, prompt, style, mode) {
  if (modelKey === 'sdxl')        return buildSDXLPrompt(prompt, style, mode);
  if (modelKey === 'flux_dev')    return buildFluxDevPrompt(prompt, style, mode);
  if (modelKey === 'flux_schnell') return buildFluxSchnellPrompt(prompt, style, mode);
  return buildPollinationsPrompt(prompt, style, mode);
}

// FLUX Schnell — short, clean, direct (it's fast + simple)
function buildFluxSchnellPrompt(prompt, style, mode) {
  const styleMap = {
    photorealistic: 'photo, realistic, sharp, natural light',
    artistic:       'painting, artistic, expressive, colorful',
    cinematic:      'cinematic, moody lighting, film grain',
    minimalist:     'minimalist, clean, simple, elegant',
    illustration:   'illustration, digital art, clean lines',
    abstract:       'abstract art, bold shapes, expressive',
    painterly:      'oil painting, brushstrokes, warm light',
    auto:           'high quality, detailed',
  };
  const modeHint = mode === 'business' ? 'professional, polished' : 'personal, expressive';
  return `${prompt}, ${styleMap[style] || styleMap.auto}, ${modeHint}, no text, no watermark`.trim();
}

// FLUX Dev — detailed, evocative, richer descriptions
function buildFluxDevPrompt(prompt, style, mode) {
  const styleMap = {
    photorealistic: 'hyperrealistic photography, 8K UHD, DSLR quality, natural lighting, sharp focus, photorealistic',
    artistic:       'masterpiece fine art painting, highly detailed, expressive brushwork, rich texture, museum quality',
    cinematic:      'cinematic still frame, anamorphic lens bokeh, dramatic chiaroscuro lighting, film grain, 4K',
    minimalist:     'minimalist composition, generous negative space, refined color palette, elegant simplicity',
    illustration:   'professional digital illustration, crisp clean lines, vibrant balanced colors, editorial quality',
    abstract:       'abstract expressionism, bold organic forms, emotional color language, dynamic gestural composition',
    painterly:      'oil painting style, visible impasto brushstrokes, luminous warm golden light, depth and richness',
    auto:           'highly detailed, professional quality, beautifully composed',
  };
  const modeHint = {
    home:     'emotionally evocative, intimate and personal feeling, soul-stirring',
    business: 'professional polish, commercial quality, brand-appropriate aesthetic',
  };
  return `${prompt}. ${styleMap[style] || styleMap.auto}. ${modeHint[mode] || ''}. No text overlays, no watermarks.`.trim();
}

// SDXL — structured, with negative prompt support
function buildSDXLPrompt(prompt, style, mode) {
  const styleMap = {
    marketing:   'professional commercial photography, product lifestyle, brand quality, clean studio lighting',
    poster:      'graphic design poster, bold composition, clean layout, print-ready quality',
    illustration:'professional vector illustration, clean bold lines, vibrant flat colors, editorial style',
    signage:     'signage design, clear visual hierarchy, bold typography space, clean professional layout',
    cinematic:   'cinematic wide angle, professional photography, dramatic lighting, high production value',
    minimalist:  'minimalist clean design, generous white space, refined typography layout',
    auto:        'high quality, professional, detailed, sharp',
  };
  const modeHint = {
    home:     'warm personal aesthetic, inviting atmosphere',
    business: 'professional marketing quality, brand-aligned, polished commercial aesthetic',
  };
  return `${prompt}, ${styleMap[style] || styleMap.auto}, ${modeHint[mode] || ''}, highly detailed, sharp focus`.trim();
}

// Pollinations — clean and descriptive
function buildPollinationsPrompt(prompt, style, mode) {
  const styleMap = {
    photorealistic: 'hyperrealistic photography, 8K, natural lighting',
    artistic:       'fine art, expressive, painterly, rich texture',
    cinematic:      'cinematic, dramatic lighting, film grain',
    minimalist:     'minimalist, clean, elegant, negative space',
    illustration:   'digital illustration, crisp, vibrant, editorial',
    abstract:       'abstract art, bold forms, expressive color',
    painterly:      'oil painting, brushstrokes, warm luminous light',
    auto:           'high quality, detailed, professional',
  };
  const modeHint = mode === 'business' ? 'professional, polished' : 'emotionally evocative, personal';
  return `${prompt}. ${styleMap[style] || styleMap.auto}. ${modeHint}. No text, no watermarks`.trim();
}

export { generateImages, selectHFModel, HF_MODELS };
export default generateImages;
