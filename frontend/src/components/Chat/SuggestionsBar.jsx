// src/components/Chat/SuggestionsBar.jsx
import React, { useMemo } from 'react';
import styles from './SuggestionsBar.module.css';

const FALLBACK = [
  'Make it warmer and more golden',
  'Try a darker, moodier version',
  'Add more texture and depth',
  'Create a poster layout from this',
];

export default function SuggestionsBar({ text, onSelect }) {
  const suggestions = useMemo(() => {
    const matches = [...(text || '').matchAll(/→\s*(.+)/g)].map(m => m[1].trim()).filter(Boolean).slice(0, 4);
    return matches.length ? matches : FALLBACK;
  }, [text]);

  return (
    <div className={styles.bar}>
      {suggestions.map((s, i) => (
        <button key={i} className={styles.chip} onClick={() => onSelect(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
