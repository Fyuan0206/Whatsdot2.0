import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PerfTier } from '../types';
import { cn } from '../lib/utils';

type Tone = 'green' | 'blue' | 'purple' | 'gold' | 'red';

export function WinReveal({
  activeKey,
  perfTier,
  tone,
  children,
}: {
  activeKey: string;
  perfTier: PerfTier;
  tone: Tone;
  children: React.ReactNode;
}) {
  const burst = useMemo(() => {
    const count = perfTier === 'high' ? 30 : perfTier === 'medium' ? 18 : 10;
    const arr: { id: string; a: number; d: number; s: number; delay: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: `${activeKey}_${i}`,
        a: Math.random() * Math.PI * 2,
        d: 60 + Math.random() * (perfTier === 'high' ? 130 : 100),
        s: 3 + Math.random() * (perfTier === 'high' ? 8 : 6),
        delay: Math.random() * 0.06,
      });
    }
    return arr;
  }, [activeKey, perfTier]);

  const glow =
    tone === 'red'
      ? 'shadow-[0_0_0_3px_rgba(248,113,113,0.18),0_0_40px_rgba(239,68,68,0.35)]'
      : tone === 'gold'
        ? 'shadow-[0_0_0_3px_rgba(250,204,21,0.18),0_0_40px_rgba(234,179,8,0.35)]'
        : tone === 'purple'
          ? 'shadow-[0_0_0_3px_rgba(196,181,253,0.18),0_0_40px_rgba(168,85,247,0.28)]'
          : tone === 'blue'
            ? 'shadow-[0_0_0_3px_rgba(147,197,253,0.18),0_0_36px_rgba(59,130,246,0.22)]'
            : 'shadow-[0_0_0_3px_rgba(134,239,172,0.18),0_0_36px_rgba(34,197,94,0.22)]';

  const particleColor =
    tone === 'red'
      ? 'bg-red-300'
      : tone === 'gold'
        ? 'bg-yellow-300'
        : tone === 'purple'
          ? 'bg-purple-300'
          : tone === 'blue'
            ? 'bg-blue-300'
            : 'bg-green-300';

  return (
    <div className={cn("relative", glow)}>
      <div className="relative z-[1]">
        {children}
      </div>

      <AnimatePresence>
        <motion.div
          key={`reveal_${activeKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        >
          <motion.div
            initial={{ opacity: 0.0, scale: 0.92 }}
            animate={{ opacity: [0.0, 0.9, 0.0], scale: [0.92, 1.04, 1.08] }}
            transition={{ duration: perfTier === 'low' ? 0.55 : 0.7, ease: 'easeOut' }}
            className={cn(
              "absolute -inset-6 rounded-[2.5rem]",
              tone === 'red'
                ? "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.28),transparent_60%)]"
                : tone === 'gold'
                  ? "bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.28),transparent_60%)]"
                  : tone === 'purple'
                    ? "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.22),transparent_60%)]"
                    : tone === 'blue'
                      ? "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_60%)]"
                      : "bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.18),transparent_60%)]"
            )}
          />

          <motion.div
            initial={{ x: '-120%', opacity: 0.0 }}
            animate={{ x: '120%', opacity: [0.0, 0.6, 0.0] }}
            transition={{ duration: perfTier === 'low' ? 0.7 : 0.9, ease: 'easeInOut' }}
            className="absolute -inset-6 rotate-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />

          {perfTier !== 'low' && (
            <div className="absolute inset-0">
              {burst.map((p) => {
                const dx = Math.cos(p.a) * p.d;
                const dy = Math.sin(p.a) * p.d;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 0], x: dx, y: dy, scale: [0.6, 1.0, 0.8] }}
                    transition={{ duration: 0.75, ease: 'easeOut', delay: p.delay }}
                    className={cn("absolute left-1/2 top-1/2 rounded-full blur-[0.5px]", particleColor)}
                    style={{ width: `${p.s}px`, height: `${p.s}px`, marginLeft: `-${p.s / 2}px`, marginTop: `-${p.s / 2}px` }}
                  />
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

