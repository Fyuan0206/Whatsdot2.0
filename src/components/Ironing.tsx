import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CompletedWork, IroningMethod, Rarity } from '../types';
import { findBlueprintById } from '../constants/blueprints';
import PixelWorkLayer from './PixelWorkLayer';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';
import { DouyinService } from '../services/douyin';

interface IroningProps {
  work: CompletedWork;
  onFinish: (work: CompletedWork) => void;
}

/** 滑杆 0–100 与展示用摄氏温区的线性映射 */
function sliderPctToCelsius(pct: number, minC: number, maxC: number): number {
  return Math.round(minC + (pct / 100) * (maxC - minC));
}

type IroningTempStandard = {
  targetCenter: number;
  targetHalfRange: number;
  scaleMinC: number;
  scaleMaxC: number;
};

/** 稀有度越高，合适区越窄（更难对齐） */
const RARITY_RANGE_MULT: Record<Rarity, number> = {
  green: 1.12,
  blue: 1.06,
  purple: 1,
  gold: 0.94,
  red: 0.88,
};

function getIroningTempStandard(method: IroningMethod, rarity: Rarity): IroningTempStandard {
  if (method === 'towel') {
    const baseHalf = 10;
    const half = Math.max(4, Math.round(baseHalf * RARITY_RANGE_MULT[rarity]));
    return {
      targetCenter: 50,
      targetHalfRange: half,
      scaleMinC: 140,
      scaleMaxC: 200,
    };
  }
  const baseHalf = 8;
  const half = Math.max(3, Math.round(baseHalf * RARITY_RANGE_MULT[rarity]));
  return {
    targetCenter: 52,
    targetHalfRange: half,
    scaleMinC: 175,
    scaleMaxC: 240,
  };
}

export default function Ironing({ work, onFinish }: IroningProps) {
  const [method, setMethod] = useState<IroningMethod | null>(work.ironingMethod ?? null);
  const [phase, setPhase] = useState<'choose' | 'temp' | 'ironing'>(
    work.ironingMethod ? 'ironing' : 'choose'
  );
  const [coverAnimKey, setCoverAnimKey] = useState(0);
  const [tempValue, setTempValue] = useState(50);
  const [tempLocked, setTempLocked] = useState(false);
  const [tempScore, setTempScore] = useState<number | null>(work.ironingScore ?? null);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [mirrorReveal, setMirrorReveal] = useState<'idle' | 'cover' | 'flash' | 'done'>('idle');
  /** 为 false 时温度滑杆自动缓慢摆动；触摸/键盘/拖动后为 true */
  const [tempManual, setTempManual] = useState(false);

  const ironingStandard = useMemo(
    () => getIroningTempStandard(method ?? 'towel', work.rarity),
    [method, work.rarity]
  );
  const { targetCenter, targetHalfRange, scaleMinC, scaleMaxC } = ironingStandard;
  const targetMin = targetCenter - targetHalfRange;
  const targetMax = targetCenter + targetHalfRange;
  const bandMinC = sliderPctToCelsius(targetMin, scaleMinC, scaleMaxC);
  const bandMaxC = sliderPctToCelsius(targetMax, scaleMinC, scaleMaxC);
  const currentC = sliderPctToCelsius(tempValue, scaleMinC, scaleMaxC);
  const inGreenBand = tempValue >= targetMin && tempValue <= targetMax;

  const blueprint = findBlueprintById(work.blueprintId);

  const canStartIroning = phase === 'ironing' && method && tempScore !== null;
  const canFinish = isDone && (method !== 'mirror' || mirrorReveal === 'done');

  const finishWork = () => {
    if (!method || tempScore === null) return;
    onFinish({
      ...work,
      ironingMethod: method,
      ironingScore: tempScore,
    });
  };

  const handleChoose = (m: IroningMethod) => {
    setMethod(m);
    setTempLocked(false);
    setTempScore(null);
    setTempValue(50);
    setTempManual(false);
    setCoverAnimKey((k) => k + 1);
    setPhase('temp');
  };

  /** 烫成功：温度分 + 拖动合体；完成时记为 100% */
  const ironingSuccessPct = useMemo(() => {
    if (phase !== 'ironing' || tempScore === null) return 0;
    if (isDone) return 100;
    const wTemp = 0.38;
    const wDrag = 0.62;
    return Math.min(
      100,
      Math.round(100 * (tempScore * wTemp + (progress / 100) * wDrag))
    );
  }, [phase, tempScore, progress, isDone]);

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (phase !== 'temp' || tempManual || reduceMotion) return;
    let raf = 0;
    const t0 = performance.now();
    const periodMs = 9000;
    const tick = (now: number) => {
      const angle = ((now - t0) / periodMs) * Math.PI * 2;
      const raw = 50 + 44 * Math.sin(angle);
      const next = Math.round(Math.max(2, Math.min(98, raw)));
      setTempValue((prev) => (prev === next ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, tempManual, reduceMotion]);

  const lockTemperature = () => {
    if (tempLocked) return;
    if (tempValue < targetMin || tempValue > targetMax) {
      DouyinService.showToast(`温度不对！请移到约 ${bandMinC}–${bandMaxC}°C 后再点确定`);
      return;
    }
    const dist = Math.abs(tempValue - targetCenter);
    const score = Math.max(0, 1 - dist / targetHalfRange);
    setTempScore(score);
    setTempLocked(true);
    setPhase('ironing');
  };

  const handleDrag = (_: any, info: any) => {
    if (isDone) return;
    if (!canStartIroning) return;
    const newProgress = Math.min(progress + Math.abs(info.delta.x + info.delta.y) * 0.2, 100);
    setProgress(newProgress);
    if (newProgress >= 100) {
      setIsDone(true);
      if (method === 'mirror') {
        setMirrorReveal('cover');
        window.setTimeout(() => setMirrorReveal('flash'), 700);
        window.setTimeout(() => setMirrorReveal('done'), 1100);
      } else {
        setMirrorReveal('done');
      }
    }
  };

  if (!blueprint) return null;

  return (
    <div className="flex flex-col h-full gap-6 items-center">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-yellow-900 italic">烫豆时刻！</h2>
        {phase === 'choose' && (
          <p className="text-sm text-yellow-700 font-medium">选个烫法，决定成品质感</p>
        )}
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col gap-3">
        <div className="relative w-full aspect-square bg-white rounded-[2.5rem] p-3 sm:p-4 shadow-xl border-4 border-yellow-200 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence mode="wait">
            {phase === 'temp' && method === 'towel' && (
              <motion.div
                key={`towel_${coverAnimKey}`}
                initial={{ y: '-110%' }}
                animate={{ y: '0%' }}
                exit={{ y: '110%' }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(168,85,247,0.08)), repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0 8px, rgba(255,255,255,0.03) 8px 16px)',
                }}
              />
            )}
            {phase === 'temp' && method === 'mirror' && (
              <motion.div
                key={`foil_${coverAnimKey}`}
                initial={{ y: '-110%' }}
                animate={{ y: '0%' }}
                exit={{ y: '110%' }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(148,163,184,0.30), rgba(226,232,240,0.25), rgba(100,116,139,0.20))',
                }}
              />
            )}

            {phase === 'ironing' && method === 'mirror' && mirrorReveal === 'cover' && (
              <motion.div
                key="mirror_cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-4 rounded-xl border-2 border-white/40"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(226,232,240,0.25), rgba(100,116,139,0.25))',
                  backdropFilter: 'blur(2px)',
                }}
              />
            )}
            {phase === 'ironing' && method === 'mirror' && mirrorReveal === 'flash' && (
              <motion.div
                key="mirror_flash"
                initial={{ opacity: 0, x: '-60%' }}
                animate={{ opacity: 1, x: '60%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute inset-4 rounded-xl pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <div
          className="w-full h-full relative z-0 min-h-0"
          style={{
            filter:
              phase === 'ironing' && method === 'towel'
                ? isDone
                  ? 'blur(0.6px) saturate(0.9) brightness(0.98)'
                  : 'saturate(0.95) brightness(0.99)'
                : phase === 'ironing' && method === 'mirror'
                  ? isDone
                    ? 'contrast(1.06) saturate(1.05) brightness(1.03)'
                    : 'contrast(1.03) saturate(1.02)'
                  : 'none',
          }}
        >
          <PixelWorkLayer
            blueprint={blueprint}
            pixelData={work.pixelData}
            getCellStyle={() => ({
              borderRadius: phase === 'ironing' && progress > 50 ? '0px' : undefined,
              transform: phase === 'ironing' && progress > 80 ? 'scale(1.05)' : 'scale(1)',
              filter: phase === 'ironing' && progress > 90 ? 'brightness(1.1)' : 'none',
            })}
          />
        </div>

        {phase === 'ironing' && method === 'towel' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            className="absolute inset-4 pointer-events-none rounded-xl"
            style={{
              background:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 6px, rgba(255,255,255,0.06) 6px 12px)',
              mixBlendMode: 'soft-light',
            }}
          />
        )}

        {phase === 'ironing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: method === 'mirror' ? 0.35 : 0.6 }}
            className="absolute inset-4 bg-white/40 pointer-events-none border-2 border-white/50 rounded-xl"
            style={{
              backdropFilter: 'blur(2px)',
              mixBlendMode: method === 'mirror' ? 'overlay' : 'soft-light',
            }}
          />
        )}

        {phase === 'ironing' && !isDone && (
          <motion.div
            drag
            dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
            onDrag={handleDrag}
            whileTap={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            className="absolute z-30 cursor-grab active:cursor-grabbing"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-red-400/20 rounded-full blur-xl group-active:animate-ping" />
              <IronIcon className="w-24 h-24 text-red-500 drop-shadow-2xl" />
              <div className="absolute top-0 right-0 bg-white px-2 py-0.5 rounded-full text-[10px] font-black text-red-500 shadow-sm border border-red-100 animate-bounce">
                烫它！
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'ironing' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-20, -100],
                  x: [Math.random() * 200 - 100, Math.random() * 200 - 100],
                  opacity: [0, 0.5, 0],
                  scale: [1, 2]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2 + Math.random(),
                  delay: i * 0.4
                }}
                className="absolute bottom-10 left-1/2 w-8 h-8 bg-white/30 rounded-full blur-md"
              />
            ))}
          </div>
        )}
        </div>

      {phase === 'choose' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full px-0.5"
        >
          <div className="rounded-2xl border border-yellow-200 bg-white shadow-md px-4 py-4">
            <p className="text-center text-base sm:text-lg font-black text-yellow-950 leading-snug line-clamp-2 px-1">
              {blueprint.name}
            </p>
            <p className="text-center text-[12px] text-yellow-700/90 mt-1 mb-4">选一种烫法</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChoose('towel')}
                aria-label="毛巾烫法：柔和质感"
                className="touch-manipulation flex flex-col items-center justify-center gap-2 min-h-[92px] rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/90 to-white px-2 py-3 text-yellow-950 shadow-sm active:scale-[0.98] transition-transform"
              >
                <TowelIcon className="w-10 h-10 shrink-0 text-amber-800" />
                <span className="text-[12px] font-bold leading-tight">毛巾烫</span>
                <span className="text-[10px] font-medium text-yellow-700/80 leading-tight">柔和质感</span>
              </button>
              <button
                type="button"
                onClick={() => handleChoose('mirror')}
                aria-label="镜面烫：高光锃亮"
                className="touch-manipulation flex flex-col items-center justify-center gap-2 min-h-[92px] rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-slate-50 to-white px-2 py-3 text-yellow-950 shadow-sm active:scale-[0.98] transition-transform"
              >
                <FoilIcon className="w-10 h-10 shrink-0 text-slate-600" />
                <span className="text-[12px] font-bold leading-tight">镜面烫</span>
                <span className="text-[10px] font-medium text-slate-600 leading-tight">高光锃亮</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
      </div>

      {phase === 'temp' && method && (
        <div className="w-full max-w-md bg-white rounded-3xl border-2 border-yellow-100 shadow-sm p-5 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setPhase('choose')}
              className="touch-manipulation shrink-0 text-xs font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5 min-h-[36px]"
            >
              换烫法
            </button>
          </div>

          <div className="relative pt-1">
            <div className="relative min-h-[48px] w-full">
              <div
                className="pointer-events-none absolute left-0 right-0 top-1/2 h-[10px] -translate-y-1/2 rounded-full border border-amber-200/80 bg-amber-100/85 overflow-hidden shadow-inner"
                aria-hidden
              >
                <motion.div
                  className="absolute inset-y-0 rounded-md bg-emerald-400/55"
                  style={{
                    left: `${targetMin}%`,
                    width: `${targetMax - targetMin}%`,
                  }}
                  animate={
                    reduceMotion
                      ? { opacity: 0.45 }
                      : { opacity: inGreenBand ? [0.45, 0.65, 0.45] : 0.42 }
                  }
                  transition={
                    reduceMotion || !inGreenBand
                      ? { duration: 0.2 }
                      : { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }
                  }
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-yellow-900/55 z-[1]"
                  style={{ left: `${targetCenter}%`, transform: 'translateX(-50%)' }}
                />
              </div>
              <label className="sr-only" htmlFor="ironing-temp-range">
                选择熨烫温度，当前约 {currentC} 摄氏度
              </label>
              <input
                id="ironing-temp-range"
                type="range"
                min={0}
                max={100}
                value={tempValue}
                onPointerDown={() => setTempManual(true)}
                onKeyDown={() => setTempManual(true)}
                onChange={(e) => {
                  setTempManual(true);
                  setTempValue(Number(e.target.value));
                }}
                aria-valuetext={`约 ${currentC} 摄氏度`}
                style={{
                  accentColor: inGreenBand ? '#16a34a' : '#d97706',
                  ['--ironing-thumb' as string]: inGreenBand ? '#22c55e' : '#f59e0b',
                }}
                className={cn(
                  'ironing-temp-range ironing-temp-range--merged absolute inset-0 z-[2] w-full h-12 min-h-[48px]',
                  'cursor-pointer touch-manipulation'
                )}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={lockTemperature}
            className={cn(
              'touch-manipulation w-full min-h-[52px] rounded-2xl font-black text-lg shadow-md border-b-4 transition-all active:scale-[0.99] active:border-b-2 active:translate-y-0.5',
              inGreenBand
                ? 'bg-green-500 border-green-800 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700'
                : 'bg-amber-100 border-amber-300 text-yellow-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'
            )}
          >
            确定
          </button>
        </div>
      )}

      {phase === 'ironing' && tempScore !== null && (
        <div
          className="w-full max-w-xs relative h-9 rounded-full border-2 border-yellow-200 bg-yellow-100/90 overflow-hidden shadow-inner"
          role="progressbar"
          aria-valuenow={ironingSuccessPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="烫成功进度"
        >
          <motion.div
            className={cn(
              'h-full rounded-full',
              isDone
                ? 'bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300'
                : 'bg-gradient-to-r from-amber-400 via-orange-400 to-red-400'
            )}
            initial={false}
            animate={{ width: `${ironingSuccessPct}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          />
        </div>
      )}

      <button
        onClick={finishWork}
        disabled={!canFinish}
        className={cn(
          "w-full max-w-xs py-5 rounded-3xl font-black text-2xl shadow-xl transition-all active:scale-95 border-b-8 flex items-center justify-center gap-2 mt-auto",
          canFinish
            ? "bg-green-500 border-green-800 text-white" 
            : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
        )}
      >
        查看神作
        <Sparkles size={24} className={canFinish ? "animate-bounce" : ""} />
      </button>
    </div>
  );
}

function IronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18a5 5 0 0 1 0-10c1.24 0 2.4.402 3.34 1.08L16.2 4.4a1 1 0 0 1 1.6.8V17a3 3 0 0 1-5.7 1.34L7 18z" />
      <path d="M12 11h.01" />
    </svg>
  );
}

/** 折叠毛巾 */
function TowelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 5h12a2 2 0 0 1 2 2v3H4V7a2 2 0 0 1 2-2z" />
      <path d="M4 10h16v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2z" />
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

/** 锡纸 / 金属箔片 */
function FoilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8l14-2 2 3-14 10-4-2 2-9z" />
      <path d="M8 11l6 4" opacity="0.45" />
      <path d="M6 14l4-3M11 16l3-2" opacity="0.35" />
    </svg>
  );
}
