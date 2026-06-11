// src/components/Header/Header.jsx
import React from 'react';
import useStore from '../../store/useStore';
import styles from './Header.module.css';

export default function Header() {
  const { toggleSidebar, mode, messages } = useStore();
  const title = messages.find(m => m.role === 'user')?.content?.split(' ').slice(0,5).join(' ') || 'New creation';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.iconBtn} onClick={toggleSidebar} title="Toggle sidebar">
          <i className="ti ti-layout-sidebar" />
        </button>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.right}>
        <span className={`${styles.modeBadge} ${styles[mode]}`}>
          {mode === 'home' ? 'Home' : 'Business'}
        </span>
        <button className={styles.iconBtn} title="Export assets">
          <i className="ti ti-download" />
        </button>
        <button className={styles.iconBtn} title="Settings">
          <i className="ti ti-settings" />
        </button>
        <div className={styles.avatar} title="Profile">U</div>
      </div>
    </header>
  );
}
