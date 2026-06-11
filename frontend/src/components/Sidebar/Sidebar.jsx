// src/components/Sidebar/Sidebar.jsx
import React from 'react';
import useStore from '../../store/useStore';
import useChat from '../../hooks/useChat';
import styles from './Sidebar.module.css';

const HISTORY_ICONS = ['ti-palette','ti-camera','ti-stars','ti-photo','ti-layout-grid','ti-wand'];

export default function Sidebar() {
  const { sidebarOpen, conversations, currentConvId, mode, setMode, memory } = useStore();
  const { startNew } = useChat();

  return (
    <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>

      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>V</div>
        <div>
          <div className={styles.logoName}>Vizzy</div>
          <div className={styles.logoTag}>creative studio</div>
        </div>
        <span className={styles.badge}>Beta</span>
      </div>

      {/* New chat button */}
      <button className={styles.newBtn} onClick={startNew}>
        <i className="ti ti-plus" /> New creation
      </button>

      {/* Conversation history */}
      <div className={styles.sectionLabel}>Recent</div>
      <div className={styles.historyScroll}>
        {conversations.length === 0 && (
          <div className={styles.empty}>No recent conversations</div>
        )}
        {conversations.map((conv, i) => (
          <div
            key={conv.id}
            className={`${styles.histItem} ${conv.id === currentConvId ? styles.active : ''}`}
          >
            <div className={styles.histIcon}>
              <i className={`ti ${HISTORY_ICONS[i % HISTORY_ICONS.length]}`} />
            </div>
            <div className={styles.histLabel}>
              {conv.title}
              <span>{conv.mode} · {conv.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Mode switcher */}
      <div className={styles.modeSection}>
        <div className={styles.sectionLabel} style={{ padding: 0, marginBottom: 8 }}>Mode</div>
        <div className={styles.modeSwitch}>
          <button
            className={`${styles.modeBtn} ${mode === 'home' ? styles.modeActive : ''}`}
            onClick={() => setMode('home')}
          >
            <i className="ti ti-home" /> Home
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'business' ? styles.modeActive : ''}`}
            onClick={() => setMode('business')}
          >
            <i className="ti ti-briefcase" /> Business
          </button>
        </div>
      </div>

      {/* Memory panel */}
      <div className={styles.memorySection}>
        <div className={styles.memoryTitle}>
          Memory <i className="ti ti-sparkles" style={{ color: 'var(--gold)', fontSize: 12 }} />
        </div>
        <div className={styles.memoryList}>
          {memory.length === 0 ? (
            <div className={styles.memoryItem}>
              <i className="ti ti-brain" /> Learning your preferences…
            </div>
          ) : (
            memory.slice(-4).map((m, i) => (
              <div key={i} className={styles.memoryItem}>
                <i className="ti ti-sparkles" /> {m}
              </div>
            ))
          )}
        </div>
      </div>

    </aside>
  );
}
