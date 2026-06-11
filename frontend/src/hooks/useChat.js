// src/hooks/useChat.js
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { sendChatMessage, pollJob } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

// NOTE: install uuid → npm i uuid
// or use crypto.randomUUID() if targeting modern browsers only

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export default function useChat() {
  const {
    mode, style, currentConvId, messages,
    addMessage, setCurrentConvId,
    addConversation, updateConversation,
    addMemory, setGenerating, isGenerating,
    newConversation: resetConversation,
  } = useStore();

  // ── Send a message ──────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isGenerating) return;

    setGenerating(true);
    // const convId = currentConvId || uid();
    // const convId = currentConvId || null;
    const convId = currentConvId || undefined;
    if (!currentConvId) setCurrentConvId(null);

    // Add user message immediately
    const userMsg = { id: uid(), role: 'user', content: text, createdAt: new Date() };
    addMessage(userMsg);

    // Placeholder assistant message for streaming
    const assistantId = uid();
    const assistantMsg = {
      id: assistantId, role: 'assistant', content: '', streaming: true,
      imageJobs: [], images: [], createdAt: new Date(),
    };
    addMessage(assistantMsg);

    let fullText = '';

    try {
      await sendChatMessage({
        message: text,
        // conversationId: convId,
        conversation_id: convId,
        mode,
        // userId: 'user_demo', // replace with real auth user ID
        user_id: 'user_demo',

        onDelta: (chunk) => {
          fullText += chunk;
          // Update the streaming message in place
          useStore.setState(s => ({
            messages: s.messages.map(m =>
              m.id === assistantId ? { ...m, content: fullText } : m
            ),
          }));
        },

        onGenerationStarted: (jobs) => {
          // Attach job IDs to the assistant message
          useStore.setState(s => ({
            messages: s.messages.map(m =>
              m.id === assistantId ? { ...m, imageJobs: jobs } : m
            ),
          }));

          // Poll each job for completion
          jobs.forEach(job => {
            pollJob(
              job.job_id,
              (completed) => {
                useStore.setState(s => ({
                  messages: s.messages.map(m =>
                    m.id === assistantId
                      ? { ...m, images: [...(m.images || []), ...completed.imageUrls] }
                      : m
                  ),
                }));
              },
              (err) => toast.error(`Image generation failed: ${err.message}`)
            );
          });
        },

        onDone: (data) => {
          // Finalize message — remove streaming flag
          useStore.setState(s => ({
            messages: s.messages.map(m =>
              m.id === assistantId
                ? { ...m, content: fullText, streaming: false, intent: data.intent }
                : m
            ),
          }));

          // Save memory updates
          if (data.memory_updates?.length) addMemory(data.memory_updates);

           // ── IMPORTANT: use backend Mongo ID ───────
          const newConvId = data.conversation_id;

          if (newConvId) {
            setCurrentConvId(newConvId);
          }

          // Update/create conversation in sidebar
          const title = text.split(' ').slice(0, 6).join(' ');
          const convData = { id:newConvId || convId, title, mode, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
          // const exists = useStore.getState().conversations.find(c => c.id === convId);
         const exists = (newConvId || convId) && useStore.getState().conversations.find((c) => c.id === (newConvId || convId));
          if (!exists) addConversation(convData);
          else {
            updateConversation(newConvId ||convId, { updatedAt: new Date() });
          }
          setGenerating(false);
        },

        onError: (err) => {
          useStore.setState(s => ({
            messages: s.messages.map(m =>
              m.id === assistantId
                ? { ...m, content: 'Something went wrong. Please try again.', streaming: false, error: true }
                : m
            ),
          }));
          toast.error(err.message || 'Failed to get response');
          setGenerating(false);
        },
      });

    } catch (err) {
      toast.error(err.message || 'Network error');
      setGenerating(false);
    }
  }, [mode, style, currentConvId, isGenerating, addMessage, setGenerating, addMemory, setCurrentConvId, addConversation, updateConversation]);

  // ── New conversation ────────────────────────────────────────
  const startNew = useCallback(() => {
    resetConversation();
  }, [resetConversation]);

  return { sendMessage, startNew, messages, isGenerating };
}
