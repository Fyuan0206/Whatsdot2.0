import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';

interface SlotMachineProps {
  open: boolean;
  keywords: readonly string[];
  onPicked: (word: string) => void;
}

type Phase = 'rolling' | 'landed';

const ROLL_SCHEDULE_MS = [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 140, 220, 360, 560];

export default function SlotMachine({ open, keywords, onPicked }: SlotMachineProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('rolling');
  const [display, setDisplay] = useState<string>(() => keywords[0] ?? '');
  const targetRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const target = keywords[Math.floor(Math.random() * keywords.length)] ?? '';
    targetRef.current = target;
    setPhase('rolling');

    if (reduceMotion) {
      setDisplay(target);
      setPhase('landed');
      return;
    }

    let step = 0;
    const scheduleNext = () => {
      const interval = ROLL_SCHEDULE_MS[step] ?? ROLL_SCHEDULE_MS[ROLL_SCHEDULE_MS.length - 1];
      timerRef.current = window.setTimeout(() => {
        step++;
        if (step < ROLL_SCHEDULE_MS.length) {
          const pick = keywords[Math.floor(Math.random() * keywords.length)] ?? '';
          setDisplay(pick);
          scheduleNext();
        } else {
          setDisplay(target);
          setPhase('landed');
        }
      }, interval);
    };

    const pick = keywords[Math.floor(Math.random() * keywords.length)] ?? '';
    setDisplay(pick);
    scheduleNext();

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, keywords, reduceMotion]);

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="关键词摇一摇"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-4 border-amber-200">
        <div className="relative overflow-hidden rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-amber-50 py-8 shadow-inner">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-amber-100/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-amber-100/80 to-transparent" />
          <AnimatePresence mode="popLayout">
            <motion.div
              key={display + '-' + phase}
              initial={phase === 'rolling' ? { y: -30, opacity: 0 } : { scale: 0.6, opacity: 0 }}
              animate={phase === 'rolling' ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={phase === 'rolling' ? { y: 30, opacity: 0 } : { opacity: 0 }}
              transition={
                phase === 'rolling'
                  ? { duration: 0.08, ease: 'linear' }
                  : { type: 'spring', stiffness: 260, damping: 16 }
              }
              className={cn(
                'px-4 text-center font-black tracking-wide',
                phase === 'landed' ? 'text-3xl text-amber-600' : 'text-2xl text-amber-500/90'
              )}
            >
              {display}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          disabled={phase !== 'landed'}
          onClick={() => onPicked(targetRef.current)}
          className={cn(
            'mt-5 w-full min-h-[44px] rounded-2xl py-3 text-base font-black text-white shadow-md border-b-4 transition-all active:scale-[0.98]',
            phase === 'landed'
              ? 'bg-amber-500 border-amber-700'
              : 'bg-amber-300 border-amber-400 cursor-not-allowed opacity-80'
          )}
        >
          {phase === 'landed' ? '放飞豆吧~' : '摇一摇中…'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
