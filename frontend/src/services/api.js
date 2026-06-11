// src/services/api.js
// All API calls to the Vizzy backend (Node.js + MongoDB + Gemini)

const BASE = import.meta.env.VITE_API_URL || '/api';

// ── Helper ─────────────────────────────────────────────────────
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Chat — streaming via SSE ────────────────────────────────────
export async function sendChatMessage({
  message,
  conversation_id,
  mode,
  // userId,
  user_id,
  onDelta,
  onGenerationStarted,
  onDone,
  onError,
}) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // body: JSON.stringify({ message, conversation_id: conversationId, mode, user_id: userId }),
    body: JSON.stringify({ message, conversation_id, mode, user_id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    onError?.(new Error(err.error || 'Chat failed'));
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue; 
        try {
          const data = JSON.parse(line.slice(6));
          if (data.event === 'delta')   {            onDelta?.(data.text); }
          if (data.event === 'generation_started')  { onGenerationStarted?.(data.jobs); }
          if (data.event === 'done')             {   onDone?.(data); }
          if (data.event === 'error')           {    onError?.(new Error(data.message)); }
        } catch (e){}
      }
    }
  }


// ── Generation job polling ──────────────────────────────────────
export async function getJobStatus(jobId) {
  return request(`/generate/${jobId}`);
}

export async function pollJob(jobId, onComplete, onError, interval = 1500, maxAttempts = 20) {
  let attempts = 0;
  const poll = async () => {
    try {
      attempts++;
      const job = await getJobStatus(jobId);
      if (job.status === 'completed') { onComplete(job); return; }
      if (job.status === 'failed')    { onError(new Error(job.error || 'Generation failed')); return; }
      if (attempts < maxAttempts) setTimeout(poll, interval);
      else onError(new Error('Generation timed out'));
    } catch (err) { onError(err); }
  };
  setTimeout(poll, interval);
}

// ── Memory ──────────────────────────────────────────────────────
export async function getUserMemory(user_id) {
  return request(`/memory/${user_id}`);
}

export async function saveMemory(user_id, type, value) {
  return request('/memory', {
    method: 'POST',
    body: JSON.stringify({ user_id, type, value }),
  });
}

// ── Conversations ───────────────────────────────────────────────
export async function getConversations(user_id) {
  return request(`/conversations?user_id=${user_id}`);
}

export async function getConversation(id) {
  return request(`/conversations/${id}`);
}

// ── Assets ──────────────────────────────────────────────────────
export async function saveAsset(assetId) {
  return request(`/assets/${assetId}/save`, { method: 'PATCH' });
}

export async function getAssets(user_id) {
  return request(`/assets?user_id=${user_id}&saved=true`);
}

// ── Refine image ────────────────────────────────────────────────
export async function refineImage(originalPrompt, refinement, style) {
  return request('/refine', {
    method: 'POST',
    body: JSON.stringify({ original_prompt: originalPrompt, refinement, style }),
  });
}

export default {
  sendChatMessage,
  getJobStatus,
  pollJob,
  getUserMemory,
  saveMemory,
  getConversations,
  getConversation,
  saveAsset,
  getAssets,
  refineImage,
};
