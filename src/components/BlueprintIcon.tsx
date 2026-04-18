import React, { useMemo } from 'react';
import type { Blueprint } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

function samplePattern(pattern: number[], gridSize: number, target: number) {
  if (gridSize === target) return pattern;
  const out: number[] = [];
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const sx = Math.min(gridSize - 1, Math.floor((x / target) * gridSize));
      const sy = Math.min(gridSize - 1, Math.floor((y / target) * gridSize));
      out.push(pattern[sy * gridSize + sx] ?? 0);
    }
  }
  return out;
}

export function BlueprintIcon({
  blueprint,
  sizePx = 26,
  cells = 10,
  flash = false,
  className,
}: {
  blueprint: Blueprint;
  sizePx?: number;
  cells?: number;
  flash?: boolean;
  className?: string;
}) {
  const sampled = useMemo(() => samplePattern(blueprint.pattern, blueprint.gridSize, cells), [blueprint.pattern, blueprint.gridSize, cells]);

  const core = (
    <div
      className={cn("rounded-md overflow-hidden bg-white", className)}
      style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
    >
      <div
        className="grid w-full h-full"
        style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
      >
        {sampled.map((p, i) => (
          <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[p] }} />
        ))}
      </div>
    </div>
  );

  if (!flash) return core;

  return (
    <motion.div
      animate={{ filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)'], scale: [1, 1.06, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      className="rounded-md"
    >
      {core}
    </motion.div>
  );
}

