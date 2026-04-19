import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Blueprint, LuckyCritReward, PerfTier, Rarity, RARITY_CONFIG } from '../types';
import { Sparkles, Play, ChevronRight, X, Zap, Crown } from 'lucide-react';
import { DouyinService } from '../services/douyin';
import { BLUEPRINTS } from '../constants/blueprints';
import { cn } from '../lib/utils';
import { CoinRainOverlay, ParticleOverlay, playLegendarySound, shakeAnim } from './DrawEffects';
import { track } from '../lib/analytics';
import { WinReveal } from './WinReveal';

interface DrawModalProps {
  blueprint: Blueprint;
  rarity: Rarity;
  pityProgress: number;
  pityHit: boolean;
  perfTier: PerfTier;
  enableEnhanced: boolean;
  luckyCritRewards: LuckyCritReward[];
  onStart: (bp: Blueprint, rarity: Rarity) => void;
  onClose: () => void;
}

const rarityColors: Record<Rarity, { bg: string; border: string; text: string; gradient: string }> = {
  green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', gradient: 'from-green-50 to-white' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', gradient: 'from-blue-50 to-white' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', gradient: 'from-purple-50 to-white' },
  gold: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', gradient: 'from-yellow-50 to-white' },
  red: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', gradient: 'from-red-50 to-white' },
  epic: { bg: 'bg-fuchsia-100', border: 'border-fuchsia-400', text: 'text-fuchsia-800', gradient: 'from-fuchsia-50 to-white' },
};

export function DrawModal({
  blueprint,
  rarity,
  pityProgress,
  pityHit,
  perfTier,
  enableEnhanced,
  luckyCritRewards,
  onStart,
  onClose,
}: DrawModalProps) {
  const [phase, setPhase] = useState<'opening' | 'result'>('opening');
  const [finalBp, setFinalBp] = useState(blueprint);
  const [finalRarity, setFinalRarity] = useState(rarity);
  const [rx, setRx] = useState(-8);
  const [ry, setRy] = useState(20);
  const [dragging, setDragging] = useState(false);

  const isRare = finalRarity === 'purple';
  const isLegendary = finalRarity === 'gold' || finalRarity === 'red' || finalRarity === 'epic';
  const particleTone = useMemo((): 'purple' | 'gold' | 'red' | null => {
    if (finalRarity === 'purple') return 'purple';
    if (finalRarity === 'gold') return 'gold';
    if (finalRarity === 'red' || finalRarity === 'epic') return 'red';
    return null;
  }, [finalRarity]);
  const showParticles = useMemo(() => {
    if (!enableEnhanced) return false;
    if (perfTier === 'low') return false;
    return particleTone !== null && (isRare || isLegendary || pityHit);
  }, [enableEnhanced, isLegendary, isRare, perfTier, pityHit, particleTone]);

  useEffect(() => {
    const openingMs = enableEnhanced
      ? pityHit
        ? 2600
        : rarity === 'red' || rarity === 'gold' || rarity === 'epic'
          ? 2200
          : rarity === 'purple'
            ? 2000
            : 1600
      : 1800;
    const timer = setTimeout(() => {
      setPhase('result');
    }, openingMs);
    return () => clearTimeout(timer);
  }, [enableEnhanced, pityHit, rarity]);

  useEffect(() => {
    if (!enableEnhanced) return;
    if (phase !== 'result') return;
    if (isLegendary || pityHit) playLegendarySound(perfTier);
  }, [enableEnhanced, isLegendary, perfTier, phase, pityHit]);

  const handleUpgrade = async () => {
    const success = await DouyinService.watchAd();
    if (success) {
      track('draw_upgrade_ad', { from: finalRarity });
      const rarityOrder: Rarity[] = ['green', 'blue', 'purple', 'gold', 'red'];
      const currentIndex = rarityOrder.indexOf(finalRarity);
      if (currentIndex < rarityOrder.length - 1) {
        const familyKey = Object.keys(BLUEPRINTS).find(k =>
          BLUEPRINTS[k][finalRarity].id === finalBp.id
        );
        if (familyKey) {
          const newRarity = rarityOrder[currentIndex + 1];
          setFinalBp(BLUEPRINTS[familyKey][newRarity]);
          setFinalRarity(newRarity);
        }
      }
    }
  };

  const colors = rarityColors[finalRarity];
  const config = RARITY_CONFIG[finalRarity];
  const pityPct = Math.min(100, Math.max(0, Math.floor((pityProgress / 99) * 100)));
  const hasCrit = enableEnhanced && luckyCritRewards.length > 0;

  useEffect(() => {
    if (!enableEnhanced) return;
    track('loot_opening_shown', { rarity, pityHit, crit: luckyCritRewards.length > 0, perfTier });
    if (pityHit) track('pity_card_shown', { rarity, perfTier });
    else if (rarity === 'gold' || rarity === 'red' || rarity === 'epic')
      track('legendary_opening_shown', { rarity, perfTier });
    else if (rarity === 'purple') track('rare_opening_shown', { rarity, perfTier });
    if (luckyCritRewards.length > 0) track('crit_shown', { rarity, perfTier, rewards: luckyCritRewards.map((r) => r.kind) });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]">
      <AnimatePresence mode="wait">
        {phase === 'opening' ? (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={
              enableEnhanced && perfTier !== 'low' && (isRare || isLegendary || pityHit)
                ? { opacity: 1, ...shakeAnim(isLegendary || pityHit ? 'heavy' : 'light') }
                : { opacity: 1 }
            }
            exit={{ opacity: 0 }}
            transition={enableEnhanced && perfTier !== 'low' && (isRare || isLegendary || pityHit) ? { duration: 0.6 } : { duration: 0.2 }}
            className="flex flex-col items-center gap-6 relative"
          >
            {showParticles && particleTone && (
              <ParticleOverlay
                perfTier={perfTier}
                tone={particleTone}
                className="fixed inset-0 z-0"
              />
            )}

            <motion.div
              initial={{ scale: 0.5, rotate: 0 }}
              animate={
                enableEnhanced && pityHit
                  ? { scale: [0.45, 1.35, 1.05, 1], rotate: [0, -18, 18, -18, 0] }
                  : enableEnhanced && isLegendary
                    ? { scale: [0.5, 1.28, 1], rotate: [0, -14, 14, -14, 0] }
                    : enableEnhanced && isRare
                      ? { scale: [0.5, 1.22, 1], rotate: [0, -12, 12, -12, 0] }
                      : { scale: [0.5, 1.2, 1], rotate: [0, -10, 10, -10, 0] }
              }
              className="relative z-[1] flex flex-col items-center gap-6"
            >
              {enableEnhanced && pityHit ? (
                <PityCardReveal blueprint={finalBp} rarity={finalRarity} perfTier={perfTier} />
              ) : enableEnhanced && isLegendary ? (
                <LegendaryOpeningShowcase blueprint={finalBp} rarity={finalRarity} perfTier={perfTier} />
              ) : (
                <div
                  className={cn(
                    "w-40 h-40 rounded-3xl border-8 flex items-center justify-center shadow-2xl relative overflow-hidden",
                    enableEnhanced ? "bg-white" : "bg-yellow-400",
                    enableEnhanced ? colors.border : "border-yellow-600"
                  )}
                >
                  {enableEnhanced && perfTier !== 'low' && isRare && particleTone && (
                    <ParticleOverlay perfTier={perfTier} tone={particleTone} className="absolute inset-0" />
                  )}
                  {enableEnhanced && (!isRare || perfTier === 'low') && (
                    <motion.div
                      aria-hidden
                      className={cn(
                        "absolute inset-0",
                        finalRarity === 'green'
                          ? "bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.35),transparent_60%)]"
                          : finalRarity === 'blue'
                            ? "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.35),transparent_60%)]"
                            : "bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.35),transparent_60%)]"
                      )}
                      animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.95, 1.06, 0.95] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                    />
                  )}
                  <Sparkles size={60} className={cn("animate-pulse", enableEnhanced ? colors.text : "text-white")} />
                </div>
              )}

              <h2 className="text-2xl font-black text-white italic tracking-widest text-center">
                {enableEnhanced && pityHit
                  ? '99充能已满 · 抽卡爆裂！'
                  : enableEnhanced && isLegendary
                    ? '传说降临...'
                    : enableEnhanced && isRare
                      ? '稀有来袭...'
                      : '正在敲蛋...'}
              </h2>

              {enableEnhanced && hasCrit && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/90 border border-yellow-200 text-yellow-950 font-black text-xs shadow-lg"
                >
                  <Zap size={16} />
                  幸运暴击触发！
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ y: 50, opacity: 0 }}
            animate={
              enableEnhanced && (isRare || isLegendary || pityHit)
                ? { y: 0, opacity: 1, ...shakeAnim(isLegendary || pityHit ? 'heavy' : 'light') }
                : { y: 0, opacity: 1 }
            }
            transition={enableEnhanced && (isRare || isLegendary || pityHit) ? { duration: 0.6 } : undefined}
            className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl relative"
          >
            {showParticles && particleTone && <ParticleOverlay perfTier={perfTier} tone={particleTone} />}
            {hasCrit && <CoinRainOverlay perfTier={perfTier} />}

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className={colors.gradient.split(' ').reduce((acc, c) => acc + ' ' + c, '')}>
              <div className="p-8 flex flex-col items-center text-center gap-6">
                <div className="flex justify-center">
                  <span className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border-2 ${colors.border}`}>
                    {config.name}
                  </span>
                </div>

                <WinReveal
                  activeKey={`${finalBp.id}_${finalRarity}_${pityHit ? 'pity' : 'normal'}_${hasCrit ? 'crit' : 'nocrit'}`}
                  perfTier={perfTier}
                  tone={finalRarity === 'epic' ? 'red' : finalRarity}
                >
                  <div
                    className={cn(
                      "relative p-4 rounded-2xl border-4 overflow-hidden",
                      enableEnhanced && isLegendary ? "bg-white/70 border-white/70 shadow-xl" : "bg-gray-50 border-gray-100"
                    )}
                    style={{ perspective: enableEnhanced ? '900px' : undefined }}
                    onPointerDown={(e) => {
                      if (!enableEnhanced) return;
                      setDragging(true);
                      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!enableEnhanced || !dragging) return;
                      setRy((v) => v + e.movementX * 0.35);
                      setRx((v) => Math.max(-45, Math.min(45, v - e.movementY * 0.25)));
                    }}
                    onPointerUp={() => setDragging(false)}
                    onPointerCancel={() => setDragging(false)}
                  >
                    <motion.div
                      animate={
                        enableEnhanced && isLegendary && perfTier !== 'low' && !dragging
                          ? { rotateY: [ry, ry + 360] }
                          : {}
                      }
                      transition={
                        enableEnhanced && isLegendary && perfTier !== 'low' && !dragging
                          ? { duration: perfTier === 'high' ? 6 : 8, repeat: Infinity, ease: 'linear' }
                          : undefined
                      }
                      style={{
                        transformStyle: enableEnhanced ? 'preserve-3d' : undefined,
                        transform: enableEnhanced ? `rotateX(${rx}deg) rotateY(${ry}deg)` : undefined,
                      }}
                      className="relative"
                    >
                      {enableEnhanced && finalBp.limited && (
                        <div className="absolute inset-0 opacity-12">
                          <LimitedIllustration blueprint={finalBp} />
                        </div>
                      )}
                      <div
                        className="grid gap-[1px] relative"
                        style={{
                          gridTemplateColumns: `repeat(${finalBp.gridSize}, 1fr)`,
                          width: '160px',
                          height: '160px'
                        }}
                      >
                        {finalBp.pattern.map((colorIdx, i) => (
                          <div key={i} className="w-full h-full" style={{ backgroundColor: finalBp.colors[colorIdx] }} />
                        ))}
                      </div>
                    </motion.div>

                    {isLegendary && (
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4], rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3.6, ease: 'linear' }}
                        className="absolute -top-4 -right-4"
                      >
                        <Sparkles size={32} className="text-yellow-500 fill-yellow-500" />
                      </motion.div>
                    )}
                  </div>
                </WinReveal>

                <h3 className="text-3xl font-black text-gray-900">{finalBp.name}</h3>

                {enableEnhanced && finalBp.limited && (finalBp.loreTitle || finalBp.loreText) && (
                  <div className="w-full text-left bg-white/70 rounded-2xl border border-white/60 p-4 shadow-sm">
                    <div className="text-xs font-black text-gray-900">{finalBp.loreTitle || '限定故事'}</div>
                    <div className="text-[11px] text-gray-600 leading-relaxed mt-1">{finalBp.loreText}</div>
                  </div>
                )}

                {hasCrit && (
                  <div className="w-full bg-white/70 rounded-2xl border border-white/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 justify-center">
                      <Zap size={18} className="text-yellow-600" />
                      <span className="text-xs font-black text-yellow-900">幸运暴击</span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-700 font-bold text-center">
                      {luckyCritRewards.map((r, i) => (
                        <span key={i} className="inline-block mx-1">
                          {r.kind === 'coins' ? `豆币 +${r.amount}` : `称号「${r.title}」`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="w-full flex flex-col gap-3">
                  {finalRarity !== 'red' && finalRarity !== 'epic' && (
                    <button
                      onClick={handleUpgrade}
                      className={`w-full py-4 ${finalRarity === 'green' ? 'bg-green-600 hover:bg-green-700 border-green-900' : finalRarity === 'blue' ? 'bg-blue-600 hover:bg-blue-700 border-blue-900' : finalRarity === 'purple' ? 'bg-purple-600 hover:bg-purple-700 border-purple-900' : 'bg-yellow-600 hover:bg-yellow-700 border-yellow-900'} text-white font-black rounded-2xl shadow-lg border-b-4 flex items-center justify-center gap-2 group transition-all`}
                    >
                      <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                      豆能更炸（看广告升级）
                    </button>
                  )}

                  <button
                    onClick={() => onStart(finalBp, finalRarity)}
                    className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-2xl shadow-lg border-b-4 border-yellow-600 flex items-center justify-center gap-2 group transition-all"
                  >
                    <Play size={20} />
                    开始捏豆
                    <ChevronRight size={20} />
                  </button>
                </div>

                {enableEnhanced && (
                  <div className="w-full pt-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 mb-1">
                      <span>欧气值</span>
                      <span>{pityProgress}/1?</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5 overflow-hidden border border-black/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pityPct}%` }}
                        className={cn("h-full", pityHit ? "bg-gradient-to-r from-yellow-300 to-red-500" : "bg-gradient-to-r from-yellow-300 to-yellow-500")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

function LegendaryOpeningShowcase({
  blueprint,
  rarity,
  perfTier,
}: {
  blueprint: Blueprint;
  rarity: Rarity;
  perfTier: PerfTier;
}) {
  const cells = perfTier === 'high' ? 22 : perfTier === 'medium' ? 18 : 14;
  const sampled = useMemo(() => samplePattern(blueprint.pattern, blueprint.gridSize, cells), [blueprint.pattern, blueprint.gridSize, cells]);
  const frame =
    rarity === 'red' || rarity === 'epic'
      ? 'from-red-500 via-pink-500 to-yellow-400'
      : 'from-yellow-400 via-amber-400 to-orange-300';

  return (
    <div className="relative">
      <div className={cn("w-[220px] h-[260px] rounded-[2.5rem] p-[3px] bg-gradient-to-br shadow-2xl", frame)}>
        <div
          className="w-full h-full rounded-[2.35rem] bg-white/85 border border-white/70 overflow-hidden relative"
          style={{ perspective: '900px' }}
        >
          <motion.div
            animate={perfTier === 'low' ? {} : { rotateY: [0, 360] }}
            transition={perfTier === 'low' ? undefined : { duration: perfTier === 'high' ? 4.8 : 6.2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 rounded-[2rem] overflow-hidden bg-white shadow-inner border border-white/70"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="grid w-full h-full"
              style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
            >
              {sampled.map((p, i) => (
                <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[p] }} />
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.98, 1.05, 0.98] }}
            transition={{ duration: 1.05, repeat: Infinity }}
            className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.55),transparent_55%)]"
          />
        </div>
      </div>

      <motion.div
        animate={{ rotate: [0, 10, -10, 0], scale: [0.98, 1.05, 0.98] }}
        transition={{ duration: 1.1, repeat: Infinity }}
        className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-white/80 border border-white/70 shadow-xl flex items-center justify-center"
      >
        <Crown size={22} className={cn(rarity === 'red' || rarity === 'epic' ? "text-red-600" : "text-yellow-700")} />
      </motion.div>
    </div>
  );
}

function PityCardReveal({
  blueprint,
  rarity,
  perfTier,
}: {
  blueprint: Blueprint;
  rarity: Rarity;
  perfTier: PerfTier;
}) {
  const cells = perfTier === 'high' ? 24 : perfTier === 'medium' ? 18 : 14;
  const sampled = useMemo(() => samplePattern(blueprint.pattern, blueprint.gridSize, cells), [blueprint.pattern, blueprint.gridSize, cells]);

  const frame =
    rarity === 'red'
      ? 'from-red-500 via-rose-500 to-yellow-400'
      : rarity === 'gold'
        ? 'from-yellow-400 via-amber-400 to-orange-300'
        : 'from-yellow-400 to-yellow-300';

  return (
    <motion.div
      initial={{ rotateY: 0, scale: 0.95 }}
      animate={perfTier === 'low' ? { scale: [0.95, 1.03, 1] } : { rotateY: [0, 160, 360], scale: [0.95, 1.1, 1] }}
      transition={{ duration: perfTier === 'low' ? 0.85 : 1.3, ease: 'easeInOut' }}
      className={cn("w-[220px] h-[280px] rounded-[2.75rem] p-[3px] bg-gradient-to-br shadow-2xl", frame)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="w-full h-full rounded-[2.6rem] bg-white/85 border border-white/70 overflow-hidden relative">
        <motion.div
          initial={{ opacity: 0.0 }}
          animate={{ opacity: [0.0, 0.8, 0.0] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),transparent_55%)]"
        />
        <div className="absolute inset-4 rounded-[2.2rem] overflow-hidden bg-white shadow-inner border border-white/70">
          <div
            className="grid w-full h-full"
            style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
          >
            {sampled.map((p, i) => (
              <div key={i} className="w-full h-full" style={{ backgroundColor: blueprint.colors[p] }} />
            ))}
          </div>
        </div>
        <div className="absolute left-5 top-5 text-xs font-black text-yellow-950">保底抽卡</div>
      </div>
    </motion.div>
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
