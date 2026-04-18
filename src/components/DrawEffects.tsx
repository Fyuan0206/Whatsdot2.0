import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import type { PerfTier } from '../types';
import { cn } from '../lib/utils';

export function ParticleOverlay({
  perfTier,
  tone,
  className,
}: {
  perfTier: PerfTier;
  tone: 'purple' | 'gold' | 'red';
  className?: string;
}) {
  const count = perfTier === 'high' ? 80 : perfTier === 'medium' ? 46 : 18;
  const items = useMemo(() => {
    const arr: { id: string; x: number; y: number; s: number; d: number; a: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: `${tone}_${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: 4 + Math.random() * (perfTier === 'high' ? 10 : 8),
        d: 900 + Math.random() * (perfTier === 'high' ? 1600 : 1200),
        a: 0.35 + Math.random() * 0.55,
      });
    }
    return arr;
  }, [count, perfTier, tone]);

  const color =
    tone === 'purple'
      ? 'bg-purple-300'
      : tone === 'red'
        ? 'bg-red-300'
        : 'bg-yellow-300';

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {items.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: `${p.x}vw`, y: `${p.y}vh`, scale: 0.6 }}
          animate={{ opacity: [0, p.a, 0], y: [`${p.y}vh`, `${p.y + 30}vh`], scale: [0.6, 1.2, 0.7] }}
          transition={{ duration: p.d / 1000, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 0.6 }}
          className={cn("absolute rounded-full blur-[1px]", color)}
          style={{ width: `${p.s}px`, height: `${p.s}px` }}
        />
      ))}
      <div className={cn("absolute inset-0 opacity-40", tone === 'purple' ? "bg-purple-500/10" : tone === 'red' ? "bg-red-500/10" : "bg-yellow-500/10")} />
    </div>
  );
}

export function CoinRainOverlay({ perfTier }: { perfTier: PerfTier }) {
  const count = perfTier === 'high' ? 42 : perfTier === 'medium' ? 24 : 10;
  const items = useMemo(() => {
    const arr: { id: string; x: number; delay: number; dur: number; s: number; r: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: `coin_${i}`,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.2 + Math.random() * (perfTier === 'high' ? 1.4 : 1.1),
        s: 10 + Math.random() * (perfTier === 'high' ? 14 : 10),
        r: Math.random() * 360,
      });
    }
    return arr;
  }, [count, perfTier]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((c) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: `${c.x}vw`, y: '-10vh', rotate: c.r }}
          animate={{ opacity: [0, 1, 1, 0], y: ['-10vh', '110vh'], rotate: [c.r, c.r + 360] }}
          transition={{ duration: c.dur, ease: 'easeIn', delay: c.delay }}
          className="absolute"
          style={{ width: `${c.s}px`, height: `${c.s}px` }}
        >
          <div className="w-full h-full rounded-full bg-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.45)] border border-yellow-200" />
        </motion.div>
      ))}
    </div>
  );
}

export function shakeAnim(strength: 'light' | 'heavy') {
  const s = strength === 'heavy' ? 10 : 5;
  return {
    x: [0, -s, s, -s, s, 0],
    y: [0, s, -s, s, -s, 0],
    rotate: [0, -1.5, 1.5, -1.5, 1.5, 0],
  } as const;
}

export function playLegendarySound(perfTier: PerfTier) {
  if (perfTier === 'low') return;
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = perfTier === 'high' ? 0.18 : 0.12;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    const freqs = [392, 523.25, 659.25];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.7, now + 0.02 + i * 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 + i * 0.05);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.8);
    });

    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        return;
      }
    }, 1000);
  } catch {
    return;
  }
}
