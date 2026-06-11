// src/components/Welcome/WelcomeScreen.jsx
import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import styles from './WelcomeScreen.module.css';

const STARTERS = {
  home: [
    { tag: 'Emotional',  text: 'Paint something that feels like how my last year felt' },
    { tag: 'Transform',  text: 'Turn this photo into a renaissance-style artwork' },
    { tag: 'Storybook',  text: 'Generate a kids story and visualize it scene by scene' },
    { tag: 'Vision',     text: 'Make a vision board with my goals for the next 3 years' },
    { tag: 'Dream',      text: 'Create a dreamlike version of a cherished memory' },
    { tag: 'Poster',     text: 'Help me design a quote poster for my living room' },
  ],
  business: [
    { tag: 'Product',    text: 'Create premium-looking visuals for my product launch' },
    { tag: 'Campaign',   text: 'Design a seasonal campaign for the holidays' },
    { tag: 'Signage',    text: 'Create a sale poster that doesn\'t feel cheap' },
    { tag: 'Brand',      text: 'Generate brand-themed artwork using our values and colors' },
    { tag: 'Social',     text: 'Create Apple-esque product video loop concepts' },
    { tag: 'Dish',       text: 'Show this dish as indulgent but refined' },
  ],
};

export default function WelcomeScreen({ onPrompt }) {
  const { mode } = useStore();
  const starters = STARTERS[mode];

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={styles.orb}>✦</div>
      <h1 className={styles.heading}>What do you want to create today?</h1>
      <p className={styles.sub}>
        Describe a feeling, a vision, a campaign — and I'll bring it to life through image, story, and design.
      </p>
      <div className={styles.grid}>
        {starters.map((s, i) => (
          <motion.button
            key={s.tag}
            className={styles.card}
            onClick={() => onPrompt(s.text)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileHover={{ y: -2 }}
          >
            <span className={styles.tag}>{s.tag}</span>
            <span className={styles.text}>{s.text}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
