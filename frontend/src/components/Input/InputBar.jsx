// src/components/Input/InputBar.jsx
import React, { useState, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import useStore from '../../store/useStore';
import styles from './InputBar.module.css';

const STYLES = ['Auto', 'Photorealistic', 'Artistic', 'Minimalist', 'Cinematic', 'Illustration'];

export default function InputBar({ onSend, disabled }) {
  const [text, setText] = useState('');
  const { style, setStyle } = useStore();
  const taRef = useRef(null);

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    taRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className={styles.area}>
      <div className={styles.box}>
        {/* Style pills */}
        <div className={styles.stylePills}>
          {STYLES.map(s => (
            <button
              key={s}
              className={`${styles.pill} ${style.toLowerCase() === s.toLowerCase() ? styles.pillActive : ''}`}
              onClick={() => setStyle(s.toLowerCase())}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className={styles.inputRow}>
          <TextareaAutosize
            ref={taRef}
            className={styles.textarea}
            placeholder="Describe what you want to create…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            minRows={1}
            maxRows={5}
            disabled={disabled}
          />
          <button className={styles.sendBtn} onClick={submit} disabled={!text.trim() || disabled}>
            {disabled
              ? <div className={styles.spinner} />
              : <i className="ti ti-arrow-up" />
            }
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.tools}>
            <button className={styles.toolBtn} title="Attach photo">
              <i className="ti ti-photo" />
            </button>
            <button className={styles.toolBtn} title="Voice input">
              <i className="ti ti-microphone" />
            </button>
            <button className={styles.toolBtn} title="Brand kit">
              <i className="ti ti-color-swatch" />
            </button>
          </div>
          <span className={styles.hint}>↵ send · Shift+↵ newline</span>
        </div>
      </div>
    </div>
  );
}
