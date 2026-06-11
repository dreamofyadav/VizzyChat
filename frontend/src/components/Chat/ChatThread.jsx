// src/components/Chat/ChatThread.jsx
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import MessageBubble from './MessageBubble';
import SuggestionsBar from './SuggestionsBar';
import useChat from '../../hooks/useChat';
import styles from './ChatThread.module.css';

export default function ChatThread() {
  const { messages } = useStore();
  const { sendMessage } = useChat();
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Last assistant message for suggestions
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.streaming);

  return (
    <div className={styles.thread}>
      <div className={styles.scroll}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <MessageBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {lastAssistant && (
        <SuggestionsBar text={lastAssistant.content} onSelect={sendMessage} />
      )}
    </div>
  );
}
