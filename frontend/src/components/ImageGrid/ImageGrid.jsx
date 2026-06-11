// src/components/ImageGrid/ImageGrid.jsx
import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import styles from './ImageGrid.module.css';

const PALETTES = [
  ['#2a1a3e','#5a2d72','#9b4dca','#d4a0f0','#f0d6ff','#150d1f'],
  ['#0a1628','#1a3a6e','#2e6bc4','#7ab3f2','#c8e4ff','#040a14'],
  ['#2e1208','#7a2c10','#c44020','#f07050','#ffc8b8','#180804'],
  ['#081e12','#1a5a34','#2ea460','#60e898','#b8fcd8','#040f09'],
  ['#1e180a','#5a4410','#c4941a','#f0c050','#fff0b8','#0f0c05'],
  ['#0e1418','#1a3848','#2e7098','#60b0d8','#b8e0f8','#060a0c'],
];

function drawArt(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 400;
  const H = canvas.height = 400;
  let s = (seed || Math.random() * 9999) | 0;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  const pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
  const type = ['swirl','mosaic','waves','nebula','geo'][Math.floor(rnd() * 5)];

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, pal[5]); bg.addColorStop(1, pal[0]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  if (type === 'swirl') {
    for (let i = 0; i < 10; i++) {
      const grd = ctx.createRadialGradient(rnd()*W, rnd()*H, 0, W/2, H/2, W*0.9);
      grd.addColorStop(0, pal[2]+'bb'); grd.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(rnd()*W, rnd()*H, 30+rnd()*100, 0, Math.PI*2);
      ctx.fillStyle = grd; ctx.fill();
    }
  } else if (type === 'mosaic') {
    const c = 5+Math.floor(rnd()*4), r = 5+Math.floor(rnd()*4);
    for (let row = 0; row < r; row++) for (let col = 0; col < c; col++) {
      if (rnd() > .25) { ctx.fillStyle = pal[Math.floor(rnd()*4)]; ctx.fillRect(col*(W/c)+1, row*(H/r)+1, W/c-2, H/r-2); }
    }
  } else if (type === 'waves') {
    for (let y = -10; y < H+10; y += 8) {
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 6) ctx.lineTo(x, y+Math.sin(x*.06+y*.02)*22);
      ctx.strokeStyle = pal[Math.floor(rnd()*4)]+'99'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else if (type === 'nebula') {
    for (let i = 0; i < 200; i++) {
      ctx.beginPath(); ctx.arc(rnd()*W, rnd()*H, 1+rnd()*20, 0, Math.PI*2);
      ctx.fillStyle = pal[Math.floor(rnd()*5)]+(rnd()>.5?'88':'44'); ctx.fill();
    }
  } else {
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); const pts = 3+Math.floor(rnd()*4), cx=rnd()*W, cy=rnd()*H, r=20+rnd()*80;
      ctx.moveTo(cx+r, cy);
      for (let j = 0; j < pts; j++) { const a=(j/pts)*Math.PI*2; ctx.lineTo(cx+Math.cos(a)*r*(0.7+rnd()*0.6), cy+Math.sin(a)*r*(0.7+rnd()*0.6)); }
      ctx.closePath(); ctx.fillStyle = pal[Math.floor(rnd()*4)]+'66'; ctx.fill();
    }
  }
  // Grain
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < W*H/30; i++) ctx.fillRect(rnd()*W, rnd()*H, 0.8, 0.8);
}

// ── Single Image Card ─────────────────────────────────────────
function ImageCard({ src, index, loading }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!loading && !src && canvasRef.current) {
      setTimeout(() => drawArt(canvasRef.current, (Date.now() + index * 37) | 0), index * 120);
    }
  }, [loading, src, index]);

  const handleSave = () => {
    if (src) {
      const a = document.createElement('a');
      a.href = src; a.download = `vizzy-${Date.now()}.png`; a.click();
    } else if (canvasRef.current) {
      const a = document.createElement('a');
      a.download = `vizzy-${Date.now()}.png`;
      a.href = canvasRef.current.toDataURL('image/png'); a.click();
    }
    toast.success('Image saved!');
  };

  return (
    <div className={styles.card}>
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Generating…</span>
        </div>
      ) : src ? (
        <img src={src} alt="Generated visual" className={styles.img} />
      ) : (
        <canvas ref={canvasRef} className={styles.canvas} />
      )}
      {!loading && (
        <div className={styles.overlay}>
          <div className={styles.actions}>
            <button className={styles.action} onClick={() => toast('Refine coming soon!')}>
              <i className="ti ti-wand" /> Refine
            </button>
            <button className={styles.action} onClick={handleSave}>
              <i className="ti ti-download" /> Save
            </button>
            <button className={styles.action} onClick={() => toast('Variant coming soon!')}>
              <i className="ti ti-copy" /> Variant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grid ─────────────────────────────────────────────────────
export default function ImageGrid({ images, jobs, loading }) {
  const count = Math.max(images.length, jobs.length, 1);
  const colClass = count === 1 ? styles.n1 : count <= 4 ? styles.n2 : styles.n3;

  return (
    <div className={styles.section}>
      <div className={styles.label}>
        <span>{count} visual{count > 1 ? 's' : ''} generated</span>
      </div>
      <div className={`${styles.grid} ${colClass}`}>
        {Array.from({ length: count }).map((_, i) => (
          <ImageCard
            key={i}
            src={images[i] || null}
            index={i}
            loading={loading && !images[i]}
          />
        ))}
      </div>
    </div>
  );
}
