// src/store/useStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // ── Mode ────────────────────────────────────────────────
      mode: 'home',
      setMode: (mode) => set({ mode }),

      // ── Style preference ────────────────────────────────────
      style: 'auto',
      setStyle: (style) => set({ style }),

      // ── Sidebar ─────────────────────────────────────────────
      sidebarOpen: true,
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      // ── Conversations list ───────────────────────────────────
      conversations: [],
      addConversation: (conv) =>
        set(s => ({ conversations: [conv, ...s.conversations].slice(0, 50) })),
      updateConversation: (id, updates) =>
        set(s => ({
          conversations: s.conversations.map(c => c.id === id ? { ...c, ...updates } : c),
        })),

      // ── Active conversation ──────────────────────────────────
      currentConvId: null,
      setCurrentConvId: (id) => set({ currentConvId: id }),

      // ── Messages for current conversation ───────────────────
      messages: [],
      addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
      clearMessages: () => set({ messages: [] }),

      // ── User memory ─────────────────────────────────────────
      memory: [],
      addMemory: (items) =>
        set(s => {
          const merged = [...new Set([...s.memory, ...items])].slice(-20);
          return { memory: merged };
        }),
      clearMemory: () => set({ memory: [] }),

      // ── Generating state ─────────────────────────────────────
      isGenerating: false,
      setGenerating: (v) => set({ isGenerating: v }),

      // ── New conversation ─────────────────────────────────────
      newConversation: () => set({
        currentConvId: null,
        messages: [],
        isGenerating: false,
      }),
    }),
    {
      name: 'vizzy-store',
      partialState: (s) => ({
        mode: s.mode,
        style: s.style,
        sidebarOpen: s.sidebarOpen,
        conversations: s.conversations,
        memory: s.memory,
      }),
    }
  )
);

export default useStore;
