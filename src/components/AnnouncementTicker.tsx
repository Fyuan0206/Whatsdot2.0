import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { Announcement } from '../services/announcements';
import type { Rarity } from '../types';
import { cn } from '../lib/utils';
import { findBlueprintById } from '../constants/blueprints';
import { BlueprintIcon } from './BlueprintIcon';

const rarityTheme: Record<Rarity, { bg: string; border: string; text: string; dot: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
  gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', dot: 'bg-yellow-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', dot: 'bg-red-500' },
};

export function AnnouncementTicker({ items }: { items: Announcement[] }) {
  const [idx, setIdx] = useState(0);

  const visible = useMemo(() => {
    if (items.length === 0) return null;
    return items[idx % items.length];
  }, [idx, items]);

  useEffect(() => {
    if (items.length === 0) return;
    const t = window.setInterval(() => setIdx((v) => v + 1), 4500);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!visible) return null;

  const theme = rarityTheme[visible.rarity];
  const text = `恭喜 ${visible.userLabel} 抽到了【${visible.blueprintName}】`;
  const bp = findBlueprintById(visible.blueprintId);

  return (
    <div className="fixed top-2 left-0 right-0 z-50 px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={visible.id}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          className={cn(
            "mx-auto max-w-lg rounded-full border shadow-lg overflow-hidden",
            theme.bg,
            theme.border
          )}
        >
          <div className="flex items-center gap-3 px-4 py-2">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.1, 0.95] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className={cn("w-2.5 h-2.5 rounded-full", theme.dot)}
            />
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3], rotate: [0, 12, -12, 0], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className={cn("p-1 rounded-full border", theme.border)}
            >
              {bp ? (
                <BlueprintIcon
                  blueprint={bp}
                  sizePx={18}
                  cells={8}
                  flash={true}
                  className={cn("rounded-sm border border-white/60", theme.border)}
                />
              ) : (
                <Sparkles size={14} className={cn(theme.text)} />
              )}
            </motion.div>
            <div className={cn("relative flex-1 overflow-hidden text-xs font-black whitespace-nowrap", theme.text)}>
              <motion.div
                key={`${visible.id}-marquee`}
                initial={{ x: '100%' }}
                animate={{ x: '-100%' }}
                transition={{ duration: 6, ease: 'linear' }}
                className="inline-block"
              >
                {text}
              </motion.div>
            </div>
            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", theme.border, theme.text)}>
              {visible.rarity.toUpperCase()}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
