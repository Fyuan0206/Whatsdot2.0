import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Coins, Heart, Pause, Pencil, Play, Trash2, X } from 'lucide-react';
import type { Blueprint, CompletedWork, PerfTier } from '../types';
import { COIN_RENAME_COST } from '../types';
import { cn } from '../lib/utils';

export function WorkDetailModal({
  open,
  work,
  blueprint,
  perfTier,
  coins = 0,
  onClose,
  onDelete,
  onRename,
  onToggleFavorite,
}: {
  open: boolean;
  work: CompletedWork;
  blueprint: Blueprint;
  perfTier: PerfTier;
  /** 当前豆币余额。用于重命名入口的可用性与提示。 */
  coins?: number;
  onClose: () => void;
  /** 若提供，在标题栏显示删除入口（由调用方处理确认与持久化） */
  onDelete?: () => void;
  /** 若提供，可重命名作品；成功后由调用方扣豆币并持久化。 */
  onRename?: (newName: string) => void;
  /** 若提供，可切换收藏状态（加入/移出收藏夹） */
  onToggleFavorite?: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const displayName = work.customName || blueprint.name;

  useEffect(() => {
    if (!open) {
      setRenaming(false);
      setNameDraft('');
    }
  }, [open, work.id]);

  const canAffordRename = coins >= COIN_RENAME_COST;
  const startRename = () => {
    setNameDraft(work.customName ?? '');
    setRenaming(true);
  };
  const confirmRename = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    if (trimmed === displayName) {
      setRenaming(false);
      return;
    }
    onRename?.(trimmed);
    setRenaming(false);
  };
  const cancelRename = () => {
    setRenaming(false);
    setNameDraft('');
  };
  const [rx, setRx] = useState(-10);
  const [ry, setRy] = useState(20);
  const [dragging, setDragging] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  /** 切到「静止」后的短暂缓动回正；为 true 时 motion 用 ease 过渡，而非即时 */
  const [settling, setSettling] = useState(false);

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
      case 'epic':
        return 'from-fuchsia-100 to-white border-fuchsia-200';
    }
  }, [work.rarity]);

  const canAutoSpin = perfTier !== 'low';
  const showAutoSpin = autoSpin && canAutoSpin && !dragging;

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
            <div className="p-5 flex flex-col gap-2 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  {renaming ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        placeholder={blueprint.name}
                        maxLength={18}
                        autoFocus
                        className="min-w-0 max-w-[160px] px-2 py-1 text-base font-bold text-gray-900 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={confirmRename}
                        disabled={!nameDraft.trim() || !canAffordRename}
                        className={cn(
                          "p-1.5 rounded-full border transition-all active:scale-90",
                          nameDraft.trim() && canAffordRename
                            ? "bg-amber-500 border-amber-600 text-white shadow-sm"
                            : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                        aria-label="确认重命名"
                        title={canAffordRename ? `消耗 ${COIN_RENAME_COST} 豆币确认` : '豆币不足'}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="p-1.5 rounded-full border border-gray-200 bg-white text-gray-500 active:scale-90"
                        aria-label="取消"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-black text-gray-900 truncate">{displayName}</div>
                      {onRename && (
                        <button
                          type="button"
                          onClick={startRename}
                          className="shrink-0 p-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-amber-400 hover:text-amber-600 active:scale-90"
                          title="重命名作品"
                          aria-label="重命名作品"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={onToggleFavorite}
                      className={cn(
                        "p-2 rounded-full border active:scale-95 transition-colors",
                        work.favorite
                          ? "bg-red-50 border-red-200 text-red-500"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:text-red-400 hover:border-red-200"
                      )}
                      title={work.favorite ? '已在收藏夹 · 点击移出' : '加入收藏夹'}
                      aria-label={work.favorite ? '从收藏夹移出' : '加入收藏夹'}
                      aria-pressed={!!work.favorite}
                    >
                      <Heart size={18} className={cn(work.favorite && 'fill-red-500')} />
                    </button>
                  )}
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
              {renaming && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-bold",
                    canAffordRename ? "text-amber-700" : "text-red-500"
                  )}
                >
                  <Coins size={12} />
                  <span>
                    {canAffordRename
                      ? `确认将消耗 ${COIN_RENAME_COST} 豆币（当前 ${coins} 枚）`
                      : `豆币不足：需要 ${COIN_RENAME_COST}，当前 ${coins} 枚`}
                  </span>
                </div>
              )}
            </div>

            <div className={cn("p-5 bg-gradient-to-b border-b border-gray-100", rarityFrame)}>
              <div
                className={cn(
                  "mx-auto w-[220px] h-[220px] rounded-[2rem] bg-white/70 border border-white/60 shadow-xl relative select-none",
                  dragging ? "cursor-grabbing" : "cursor-grab"
                )}
                style={{ perspective: '900px', touchAction: 'none' }}
                onPointerDown={(e) => {
                  setDragging(true);
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 0 && e.pointerType === 'mouse') return;
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  setRy((v) => v + e.movementX * 0.4);
                  setRx((v) => Math.max(-45, Math.min(45, v - e.movementY * 0.3)));
                }}
                onPointerUp={(e) => {
                  setDragging(false);
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                }}
                onPointerCancel={(e) => {
                  setDragging(false);
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                }}
              >
                <motion.div
                  className="absolute inset-3 rounded-[1.6rem] overflow-hidden bg-white shadow-inner border border-white/70 pointer-events-none"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={
                    showAutoSpin
                      ? { rotateX: rx, rotateY: [ry, ry + 360] }
                      : { rotateX: rx, rotateY: ry }
                  }
                  transition={
                    showAutoSpin
                      ? {
                          rotateX: { duration: 0.25 },
                          rotateY: {
                            duration: perfTier === 'high' ? 6 : 8,
                            repeat: Infinity,
                            ease: 'linear',
                          },
                        }
                      : settling
                        ? { duration: 0.45, ease: 'easeOut' }
                        : { duration: 0 }
                  }
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
                        <div key={i} className="w-full h-full" style={{ backgroundColor: (work.paletteColors ?? blueprint.colors)[p] }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
              <div className="flex flex-col items-center gap-2 mt-3">
                <div
                  role="tablist"
                  aria-label="旋转模式"
                  className="inline-flex items-center gap-1 p-1 rounded-full border border-gray-200 bg-gray-50"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={autoSpin}
                    disabled={!canAutoSpin}
                    onClick={() => {
                      if (!canAutoSpin) return;
                      setAutoSpin(true);
                      setSettling(false);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-3 h-7 rounded-full text-xs font-bold transition-all",
                      autoSpin && canAutoSpin
                        ? "bg-amber-500 text-white shadow-sm"
                        : canAutoSpin
                          ? "text-gray-600 hover:text-amber-600"
                          : "text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Play size={12} />
                    旋转
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!autoSpin}
                    onClick={() => {
                      setAutoSpin(false);
                      setSettling(true);
                      setRx(0);
                      setRy(0);
                      window.setTimeout(() => setSettling(false), 500);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-3 h-7 rounded-full text-xs font-bold transition-all",
                      !autoSpin
                        ? "bg-gray-800 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Pause size={12} />
                    静止
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 font-medium">
                  按住拖动可手动旋转查看细节
                </span>
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
        : blueprint.rarity === 'epic'
          ? 'from-fuchsia-500/30 via-pink-500/20 to-purple-500/10'
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

