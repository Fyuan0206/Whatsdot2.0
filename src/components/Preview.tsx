import React, { useState, useEffect, useMemo } from 'react';
import { CompletedWork, RARITY_CONFIG, Rarity } from '../types';
import { BLUEPRINTS } from '../constants/blueprints';
import { motion, AnimatePresence } from 'motion/react';
import { DouyinService } from '../services/douyin';
import { cn } from '../lib/utils';
import { Send, Music, Home, LayoutGrid, Sparkles, Crown } from 'lucide-react';
import { ParticleOverlay } from './DrawEffects';
import { PERF_TIER } from '../lib/perf';

interface PreviewProps {
  work: CompletedWork;
  onReward: () => void;
  onDone: () => void;
}

const rarityCardStyle: Record<Rarity, { badge: string; gradient: string; border: string }> = {
  green: { badge: 'bg-green-100 text-green-700 border-green-300', gradient: 'from-green-900/40 to-black', border: 'border-green-500/30' },
  blue: { badge: 'bg-blue-100 text-blue-700 border-blue-300', gradient: 'from-blue-900/40 to-black', border: 'border-blue-500/30' },
  purple: { badge: 'bg-purple-100 text-purple-700 border-purple-300', gradient: 'from-purple-900/50 to-black', border: 'border-purple-400/40' },
  gold: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-400', gradient: 'from-amber-900/50 to-black', border: 'border-amber-400/50' },
  red: { badge: 'bg-red-100 text-red-700 border-red-300', gradient: 'from-red-950/60 to-black', border: 'border-red-500/40' },
};

function openingLine(r: Rarity): string {
  if (r === 'gold' || r === 'red') return '传说降临...';
  if (r === 'purple') return '稀有来袭...';
  return '正在敲蛋...';
}

function particleTone(r: Rarity): 'purple' | 'gold' | 'red' | null {
  if (r === 'purple') return 'purple';
  if (r === 'gold') return 'gold';
  if (r === 'red') return 'red';
  return null;
}

export default function Preview({ work, onReward, onDone }: PreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success'>('idle');
  const [replayPhase, setReplayPhase] = useState<'loot_opening' | 'loot_reveal' | 'paint'>('loot_opening');

  const familyKey = Object.keys(BLUEPRINTS).find((k) => BLUEPRINTS[k][work.rarity]?.id === work.blueprintId);
  const blueprint = familyKey ? BLUEPRINTS[familyKey][work.rarity] : null;
  const history = work.history ?? [];

  const isLegendary = work.rarity === 'gold' || work.rarity === 'red';
  const isRare = work.rarity === 'purple';
  const openingMs = isLegendary ? 2200 : isRare ? 2000 : 1600;
  const revealMs = 2000;

  const tone = useMemo(() => particleTone(work.rarity), [work.rarity]);
  const showParticles = PERF_TIER !== 'low' && tone !== null && (isRare || isLegendary);

  useEffect(() => {
    if (replayPhase !== 'loot_opening') return;
    const t = window.setTimeout(() => setReplayPhase('loot_reveal'), openingMs);
    return () => clearTimeout(t);
  }, [replayPhase, openingMs]);

  useEffect(() => {
    if (replayPhase !== 'loot_reveal') return;
    const t = window.setTimeout(() => {
      setReplayPhase('paint');
      setCurrentStep(0);
    }, revealMs);
    return () => clearTimeout(t);
  }, [replayPhase, revealMs]);

  useEffect(() => {
    if (!isPlaying || replayPhase !== 'paint') return;

    if (currentStep >= history.length) {
      const timer = setTimeout(() => setCurrentStep(0), 2000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, 100);

    return () => clearTimeout(timer);
  }, [isPlaying, replayPhase, currentStep, history.length]);

  const activePixels = new Array((blueprint?.gridSize || 12) * (blueprint?.gridSize || 12)).fill(0);
  history.slice(0, currentStep).forEach((h: { i: number; c: number }) => {
    activePixels[h.i] = h.c;
  });

  const handlePublish = async () => {
    setPublishStatus('publishing');
    try {
      await DouyinService.publishVideo({
        title: `我勒个豆！我拼了个【${blueprint?.name}】`,
      });
      setPublishStatus('success');
      onReward();
      DouyinService.showToast('分享成功！获得 1 张开豆券！');
    } catch (e) {
      console.error(e);
      setPublishStatus('idle');
    }
  };

  if (!blueprint) return null;

  const rarityConfig = RARITY_CONFIG[work.rarity];
  const card = rarityCardStyle[work.rarity];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-gray-900">延时回顾</h2>
      </div>

      <div className="relative aspect-square w-full bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-x-4 border-gray-800">
        <AnimatePresence mode="wait">
          {replayPhase === 'loot_opening' && (
            <motion.div
              key="opening"
              role="presentation"
              aria-label="盲盒开启动画"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-black to-zinc-950 px-6"
            >
              {showParticles && tone && (
                <ParticleOverlay perfTier={PERF_TIER} tone={tone} className="absolute inset-0 z-0" />
              )}

              <motion.div
                initial={{ scale: 0.45, rotate: 0 }}
                animate={
                  isLegendary
                    ? { scale: [0.45, 1.2, 1], rotate: [0, -12, 12, -12, 0] }
                    : isRare
                      ? { scale: [0.45, 1.15, 1], rotate: [0, -10, 10, -10, 0] }
                      : { scale: [0.45, 1.12, 1], rotate: [0, -8, 8, -8, 0] }
                }
                transition={{ duration: 0.95, ease: 'easeOut' }}
                className="relative z-[1] flex flex-col items-center gap-5"
              >
                {isLegendary ? (
                  <div
                    className={cn(
                      'relative w-36 h-36 rounded-[2rem] p-[3px] bg-gradient-to-br shadow-2xl',
                      work.rarity === 'red'
                        ? 'from-red-500 via-pink-500 to-yellow-400'
                        : 'from-yellow-400 via-amber-400 to-orange-300'
                    )}
                  >
                    <div className="w-full h-full rounded-[1.85rem] bg-white/90 flex items-center justify-center overflow-hidden">
                      <div
                        className="grid gap-[1px]"
                        style={{
                          gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)`,
                          width: '112px',
                          height: '112px',
                        }}
                      >
                        {blueprint.pattern.map((cIdx, i) => (
                          <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[cIdx] }} />
                        ))}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.06, 1] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                      className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-white/90 border border-white/70 shadow-lg flex items-center justify-center"
                    >
                      <Crown size={20} className={work.rarity === 'red' ? 'text-red-600' : 'text-yellow-700'} />
                    </motion.div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'w-32 h-32 rounded-3xl border-[6px] flex items-center justify-center shadow-2xl relative overflow-hidden bg-white',
                      card.border
                    )}
                  >
                    {isRare && showParticles && tone && (
                      <ParticleOverlay perfTier={PERF_TIER} tone={tone} className="absolute inset-0" />
                    )}
                    {!isRare && (
                      <motion.div
                        aria-hidden
                        className={cn(
                          'absolute inset-0',
                          work.rarity === 'green'
                            ? 'bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.35),transparent_60%)]'
                            : work.rarity === 'blue'
                              ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.35),transparent_60%)]'
                              : 'bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.35),transparent_60%)]'
                        )}
                        animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.95, 1.05, 0.95] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                      />
                    )}
                    <Sparkles size={52} className={cn('relative z-[1] animate-pulse', card.badge.split(' ')[1])} />
                  </div>
                )}

                <p className="text-center text-lg font-black italic tracking-widest text-white drop-shadow-lg">
                  {openingLine(work.rarity)}
                </p>
              </motion.div>
            </motion.div>
          )}

          {replayPhase === 'loot_reveal' && (
            <motion.div
              key="reveal"
              role="presentation"
              aria-label="抽卡结果"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className={cn('absolute inset-0 z-30 flex flex-col items-center justify-center px-5 bg-gradient-to-b', card.gradient)}
            >
              <div className="w-full max-w-[280px] rounded-[1.75rem] border-2 border-white/10 bg-black/55 backdrop-blur-md p-5 shadow-2xl text-center space-y-4">
                <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-black border-2', card.badge)}>
                  {rarityConfig.name}
                </span>
                <div
                  className="mx-auto rounded-2xl border-2 border-white/15 overflow-hidden bg-black/30 p-2 inline-block"
                  style={{ maxWidth: '200px' }}
                >
                  <div
                    className="grid gap-[1px]"
                    style={{
                      gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)`,
                      width: '168px',
                      height: '168px',
                    }}
                  >
                    {blueprint.pattern.map((cIdx, i) => (
                      <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[cIdx] }} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white font-black text-xl leading-tight">{blueprint.name}</p>
                  <p className="text-white/60 text-xs mt-2 font-medium">即将播放捏豆过程</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {replayPhase === 'paint' && (
          <motion.div
            key="paint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-10"
          >
            <div
              className="absolute inset-0 grid gap-[1px] p-8"
              style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
            >
              {activePixels.map((p, i) => (
                <div
                  key={i}
                  className="w-full h-full transition-all duration-300"
                  style={{
                    backgroundColor: blueprint.colors[p],
                    opacity: p === 0 ? 0.1 : 1,
                    transform: p !== 0 ? 'scale(1)' : 'scale(0.8)',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-6 items-center pointer-events-none">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <Music size={24} className="text-white animate-spin-slow" />
          </div>
        </div>

        <div className="absolute left-6 bottom-6 z-20 space-y-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-white" />
            <span className="text-white font-bold text-sm">我勒个豆拼手艺</span>
          </div>
          <p className="text-white text-xs opacity-80">我勒个豆！我拼了一个 {blueprint.name} #我勒个豆</p>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={handlePublish}
          disabled={publishStatus !== 'idle'}
          className={cn(
            'w-full py-5 rounded-[2rem] font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-b-8',
            publishStatus === 'success' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-red-500 text-white border-red-800'
          )}
        >
          <Send size={24} />
          {publishStatus === 'publishing' ? '正在连接抖音...' : publishStatus === 'success' ? '已炸裂' : '炸裂发豆'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onDone}
            className="py-4 bg-white text-yellow-800 font-bold rounded-2xl border-2 border-yellow-100 shadow-sm flex items-center justify-center gap-2"
          >
            <LayoutGrid size={20} />
            进入豆窖
          </button>
          <button
            onClick={() => window.location.reload()}
            className="py-4 bg-white text-gray-500 font-bold rounded-2xl border-2 border-gray-100 shadow-sm flex items-center justify-center gap-2"
          >
            <Home size={20} />
            回首页
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
