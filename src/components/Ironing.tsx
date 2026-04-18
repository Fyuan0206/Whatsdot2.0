import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { CompletedWork, Blueprint } from '../types';
import { BLUEPRINTS } from '../constants/blueprints';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';

interface IroningProps {
  work: CompletedWork;
  onFinish: () => void;
}

export default function Ironing({ work, onFinish }: IroningProps) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  
  const familyKey = Object.keys(BLUEPRINTS).find(k => 
    BLUEPRINTS[k].basic.id === work.blueprintId || BLUEPRINTS[k].rare.id === work.blueprintId
  );
  const blueprint = familyKey ? (work.isRare ? BLUEPRINTS[familyKey].rare : BLUEPRINTS[familyKey].basic) : null;

  const handleDrag = (_: any, info: any) => {
    // Simple progress calculation based on drag movement
    if (isDone) return;
    const newProgress = Math.min(progress + Math.abs(info.delta.x + info.delta.y) * 0.2, 100);
    setProgress(newProgress);
    if (newProgress >= 100) {
      setIsDone(true);
    }
  };

  if (!blueprint) return null;

  return (
    <div className="flex flex-col h-full gap-6 items-center">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-yellow-900 italic">烫豆时刻！</h2>
        <p className="text-sm text-yellow-700 font-medium">拖动熨斗，把豆子烫得“炸裂”合体！</p>
      </div>

      <div className="relative w-full aspect-square bg-white rounded-[2.5rem] p-4 shadow-xl border-4 border-yellow-200 overflow-hidden flex items-center justify-center">
        {/* The Beads Art */}
        <div 
          className="grid gap-[1px] w-full h-full relative"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {work.pixelData.map((p, i) => (
            <div 
              key={i} 
              className="w-full h-full transition-all duration-700"
              style={{ 
                backgroundColor: blueprint.colors[p],
                // Visual effect: as progress increases, beads "fuse" (lose their rounded-ish inside look)
                borderRadius: progress > 50 ? '0px' : '4px',
                transform: progress > 80 ? 'scale(1.05)' : 'scale(1)',
                filter: progress > 90 ? 'brightness(1.1)' : 'none'
              }} 
            />
          ))}
        </div>

        {/* Parchment Paper Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="absolute inset-4 bg-white/40 pointer-events-none border-2 border-white/50 rounded-xl"
          style={{ 
            backdropFilter: 'blur(2px)',
            mixBlendMode: 'soft-light'
          }}
        />

        {/* The Iron */}
        {!isDone && (
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

        {/* Steam Effects */}
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
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs bg-yellow-100 h-6 rounded-full border-2 border-yellow-200 overflow-hidden relative shadow-inner">
        <motion.div 
          className="h-full bg-gradient-to-r from-red-400 to-yellow-400"
          animate={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-yellow-900 uppercase tracking-widest">
          {isDone ? '烫成了！' : `合体进度: ${Math.round(progress)}%`}
        </div>
      </div>

      <button
        onClick={onFinish}
        disabled={!isDone}
        className={cn(
          "w-full max-w-xs py-5 rounded-3xl font-black text-2xl shadow-xl transition-all active:scale-95 border-b-8 flex items-center justify-center gap-2 mt-auto",
          isDone 
            ? "bg-green-500 border-green-800 text-white" 
            : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
        )}
      >
        查看神作
        <Sparkles size={24} className={isDone ? "animate-bounce" : ""} />
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
