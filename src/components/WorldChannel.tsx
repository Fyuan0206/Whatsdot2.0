import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import type { Announcement } from '../services/announcements';
import { cn } from '../lib/utils';
import { findBlueprintById } from '../constants/blueprints';
import { BlueprintIcon } from './BlueprintIcon';
import { track } from '../lib/analytics';

export function WorldChannel({
  items,
  abVariant,
}: {
  items: Announcement[];
  abVariant: 'control' | 'variant';
}) {
  const [open, setOpen] = useState(false);
  const [marqueeKey, setMarqueeKey] = useState(0);

  const latest = items[0] ?? null;
  const bp = useMemo(() => (latest ? findBlueprintById(latest.blueprintId) : null), [latest]);

  useEffect(() => {
    if (!latest) return;
    setMarqueeKey((v) => v + 1);
  }, [latest?.id]);

  return (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            track(next ? 'world_channel_open' : 'world_channel_close', { variant: abVariant });
            return next;
          });
        }}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 bg-white shadow-sm active:scale-[0.99] transition-transform",
          open ? "border-yellow-300" : "border-yellow-100"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center justify-center">
            <MessageCircle size={18} className="text-yellow-800" />
          </div>
          <div className="text-left">
            <div className="text-sm font-black text-yellow-900">世界频道</div>
            <div className="text-[11px] text-yellow-700 font-bold">全服播报 · 抽到好东西就上墙</div>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-yellow-700" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 bg-white rounded-[2rem] border-2 border-yellow-100 shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-yellow-50 bg-gradient-to-b from-yellow-50 to-white">
              <div className="flex items-center gap-3">
                {bp ? (
                  <BlueprintIcon blueprint={bp} sizePx={28} cells={10} flash={true} className="border border-yellow-200" />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-yellow-100 border border-yellow-200" />
                )}
                <div className="flex-1 overflow-hidden">
                  {latest ? (
                    <div className="relative overflow-hidden whitespace-nowrap text-xs font-black text-yellow-900">
                      <motion.div
                        key={`${latest.id}_${marqueeKey}`}
                        initial={{ x: '100%' }}
                        animate={{ x: '-100%' }}
                        transition={{ duration: 6, ease: 'linear' }}
                        className="inline-block"
                      >
                        恭喜 {latest.userLabel} 抽到了【{latest.blueprintName}】
                      </motion.div>
                    </div>
                  ) : (
                    <div className="text-xs font-black text-yellow-700">暂无播报</div>
                  )}
                </div>
                {latest && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-900">
                    {latest.rarity.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-5 text-xs text-gray-500 font-bold">还没有人抽到高价值物品。</div>
              ) : (
                <div className="p-3 space-y-2">
                  {items.slice(0, 12).map((a) => {
                    const itemBp = findBlueprintById(a.blueprintId);
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-yellow-50/60 border border-yellow-100">
                        {itemBp ? (
                          <BlueprintIcon blueprint={itemBp} sizePx={24} cells={8} flash={a.id === latest?.id} className="border border-white/70" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-yellow-100 border border-yellow-200" />
                        )}
                        <div className="flex-1 text-[11px] text-yellow-900 font-bold truncate">
                          {a.userLabel} 抽到【{a.blueprintName}】
                        </div>
                        <div className="text-[10px] font-black text-yellow-700">{a.rarity.toUpperCase()}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

