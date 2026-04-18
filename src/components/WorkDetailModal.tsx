import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';
import type { Blueprint, CompletedWork, PerfTier } from '../types';
import { cn } from '../lib/utils';

export function WorkDetailModal({
  open,
  work,
  blueprint,
  perfTier,
  onClose,
  onDelete,
}: {
  open: boolean;
  work: CompletedWork;
  blueprint: Blueprint;
  perfTier: PerfTier;
  onClose: () => void;
  /** 若提供，在标题栏显示删除入口（由调用方处理确认与持久化） */
  onDelete?: () => void;
}) {
  const [rx, setRx] = useState(-10);
  const [ry, setRy] = useState(20);
  const [dragging, setDragging] = useState(false);

  const rarityFrame = useMemo(() => {
    switch (work.rarity) {
      case 'green':
        return 'from-green-100 to-white border-green-200';
      case 'blue':
        return 'from-blue-100 to-white border-blue-200';
      case 'purple':
        return 'from-purple-100 to-white border-purple-200';
      case 'gold':
        return 'from-yellow-100 to-white border-yellow-200';
      case 'red':
        return 'from-red-100 to-white border-red-200';
    }
  }, [work.rarity]);

  const showAutoSpin = perfTier !== 'low' && !dragging;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]"
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-5 flex items-center justify-between border-b border-gray-100 gap-2">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900">{blueprint.name}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-2 rounded-full bg-red-50 border border-red-100 text-red-600 active:scale-95"
                    title="删除作品"
                    aria-label="删除作品"
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full bg-gray-50 border border-gray-100 active:scale-95"
                  aria-label="关闭"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className={cn("p-5 bg-gradient-to-b border-b border-gray-100", rarityFrame)}>
              <div
                className="mx-auto w-[220px] h-[220px] rounded-[2rem] bg-white/70 border border-white/60 shadow-xl relative"
                style={{ perspective: '900px' }}
                onPointerDown={(e) => {
                  setDragging(true);
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!dragging) return;
                  setRy((v) => v + e.movementX * 0.35);
                  setRx((v) => Math.max(-45, Math.min(45, v - e.movementY * 0.25)));
                }}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
              >
                <motion.div
                  animate={showAutoSpin ? { rotateY: [ry, ry + 360] } : {}}
                  transition={showAutoSpin ? { duration: perfTier === 'high' ? 6 : 8, repeat: Infinity, ease: 'linear' } : undefined}
                  className="absolute inset-3 rounded-[1.6rem] overflow-hidden bg-white shadow-inner border border-white/70"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
                  }}
                >
                  <div className="absolute inset-0 opacity-10">
                    <LimitedIllustration blueprint={blueprint} />
                  </div>
                  <div className="absolute inset-0 p-3">
                    <div
                      className="grid gap-[0.5px] w-full h-full bg-gray-100/40 rounded-2xl overflow-hidden"
                      style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
                    >
                      {work.pixelData.map((p, i) => (
                        <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[p] }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
              <div className="text-center text-[10px] text-gray-600 mt-3 font-bold">
                按住拖动旋转查看细节
              </div>
            </div>

            {blueprint.limited && (blueprint.loreTitle || blueprint.loreText) && (
              <div className="p-5 space-y-2">
                <div className="text-sm font-black text-gray-900">{blueprint.loreTitle || '限定故事'}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{blueprint.loreText}</div>
                <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                  <div className="h-36 relative">
                    <LimitedIllustration blueprint={blueprint} />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />
                    <div className="absolute left-4 bottom-3 text-xs font-black text-gray-900">
                      限定插画
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LimitedIllustration({ blueprint }: { blueprint: Blueprint }) {
  const grad =
    blueprint.rarity === 'red'
      ? 'from-red-500/30 via-pink-500/20 to-yellow-500/10'
      : blueprint.rarity === 'gold'
        ? 'from-yellow-500/25 via-orange-500/15 to-pink-500/10'
        : 'from-purple-500/20 via-blue-500/10 to-white/0';

  return (
    <div className={cn("absolute inset-0 bg-gradient-to-br", grad)}>
      <div className="absolute inset-0 opacity-15">
        <div
          className="grid gap-[1px] w-full h-full"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {blueprint.pattern.map((p, i) => (
            <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[p] }} />
          ))}
        </div>
      </div>
    </div>
  );
}

