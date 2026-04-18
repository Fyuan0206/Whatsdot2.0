import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CompletedWork, IroningMethod } from '../types';
import { BLUEPRINTS } from '../constants/blueprints';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';
import { DouyinService } from '../services/douyin';

interface IroningProps {
  work: CompletedWork;
  onFinish: (work: CompletedWork) => void;
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

  const targetCenter = 50;
  const targetHalfRange = 10;
  const targetMin = targetCenter - targetHalfRange;
  const targetMax = targetCenter + targetHalfRange;

  const familyKey = Object.keys(BLUEPRINTS).find(k =>
    BLUEPRINTS[k][work.rarity]?.id === work.blueprintId
  );
  const blueprint = familyKey ? BLUEPRINTS[familyKey][work.rarity] : null;

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
    setCoverAnimKey((k) => k + 1);
    setPhase('temp');
  };

  const scoreLabel = useMemo(() => {
    if (tempScore === null) return null;
    if (tempScore >= 0.9) return '完美';
    if (tempScore >= 0.75) return '很稳';
    if (tempScore >= 0.55) return '合适';
    return '勉强';
  }, [tempScore]);

  const lockTemperature = () => {
    if (tempLocked) return;
    if (tempValue < targetMin || tempValue > targetMax) {
      DouyinService.showToast('温度不对！要在合适区间松手');
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
        <p className="text-sm text-yellow-700 font-medium">
          {phase === 'choose'
            ? '选个烫法，决定成品质感'
            : phase === 'temp'
              ? '调温度，松手要在合适区间'
              : '拖动熨斗，把豆子烫得“炸裂”合体！'}
        </p>
      </div>

      <div className="relative w-full aspect-square bg-white rounded-[2.5rem] p-4 shadow-xl border-4 border-yellow-200 overflow-hidden flex items-center justify-center">
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
          className="grid gap-[1px] w-full h-full relative"
          style={{
            gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)`,
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
          {work.pixelData.map((p, i) => (
            <div
              key={i}
              className="w-full h-full transition-all duration-700"
              style={{
                backgroundColor: blueprint.colors[p],
                borderRadius: phase === 'ironing' && progress > 50 ? '0px' : '4px',
                transform: phase === 'ironing' && progress > 80 ? 'scale(1.05)' : 'scale(1)',
                opacity: phase === 'choose' ? 0.95 : 1,
                filter: phase === 'ironing' && progress > 90 ? 'brightness(1.1)' : 'none',
              }}
            />
          ))}
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

        {phase === 'choose' && (
          <div className="absolute inset-0 p-6 flex flex-col gap-4 justify-end">
            <button
              onClick={() => handleChoose('towel')}
              className="w-full py-4 bg-white/90 text-yellow-900 font-black rounded-2xl shadow-lg border-2 border-yellow-200 active:scale-[0.99] transition-transform"
            >
              毛巾烫法（柔和哑光）
            </button>
            <button
              onClick={() => handleChoose('mirror')}
              className="w-full py-4 bg-white/90 text-yellow-900 font-black rounded-2xl shadow-lg border-2 border-yellow-200 active:scale-[0.99] transition-transform"
            >
              镜面烫（光滑反光）
            </button>
          </div>
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

      {phase === 'temp' && method && (
        <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-yellow-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-yellow-900">温度滑块</div>
              <div className="text-[11px] text-yellow-700">松手要在合适区间，越接近中心越高品质</div>
            </div>
            <button
              onClick={() => setPhase('choose')}
              className="text-xs font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1"
            >
              换烫法
            </button>
          </div>

          <div className="relative">
            <div className="h-10 rounded-2xl border border-yellow-100 bg-yellow-50 relative overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-green-300/40"
                style={{
                  left: `${targetMin}%`,
                  width: `${targetMax - targetMin}%`,
                }}
              />
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-yellow-800/60"
                style={{ left: `${targetCenter}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={100}
              value={tempValue}
              disabled={tempLocked}
              onChange={(e) => setTempValue(Number(e.target.value))}
              onPointerUp={lockTemperature}
              onMouseUp={lockTemperature}
              onTouchEnd={lockTemperature}
              className={cn(
                "mt-3 w-full accent-yellow-600",
                tempLocked && "pointer-events-none opacity-60"
              )}
            />

            <div className="mt-2 flex items-center justify-between text-[11px] text-yellow-700 font-bold">
              <span>冷</span>
              <span>热</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-yellow-900">
              当前温度：{tempValue}
            </div>
            {tempLocked && scoreLabel && (
              <div className="text-sm font-black text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                品质：{scoreLabel}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'ironing' && (
        <div className="w-full max-w-xs bg-yellow-100 h-6 rounded-full border-2 border-yellow-200 overflow-hidden relative shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-red-400 to-yellow-400"
            animate={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-yellow-900 uppercase tracking-widest">
            {isDone ? '烫成了！' : `合体进度: ${Math.round(progress)}%`}
          </div>
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
