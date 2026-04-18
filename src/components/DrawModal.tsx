import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Blueprint } from '../types';
import { Sparkles, Play, ChevronRight, X } from 'lucide-react';
import { DouyinService } from '../services/douyin';
import { BLUEPRINTS } from '../constants/blueprints';

interface DrawModalProps {
  blueprint: Blueprint;
  isRare: boolean;
  onStart: (bp: Blueprint, isRare: boolean) => void;
  onClose: () => void;
}

export function DrawModal({ blueprint, isRare, onStart, onClose }: DrawModalProps) {
  const [phase, setPhase] = useState<'opening' | 'result'>('opening');
  const [finalBp, setFinalBp] = useState(blueprint);
  const [finalRare, setFinalRare] = useState(isRare);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('result');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpgrade = async () => {
    const success = await DouyinService.watchAd();
    if (success) {
      // Find the rare version of this blueprint family
      const familyKey = Object.keys(BLUEPRINTS).find(k => 
        BLUEPRINTS[k].basic.id === finalBp.id || BLUEPRINTS[k].rare.id === finalBp.id
      );
      if (familyKey) {
        setFinalBp(BLUEPRINTS[familyKey].rare);
        setFinalRare(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {phase === 'opening' ? (
          <motion.div
            key="opening"
            initial={{ scale: 0.5, rotate: 0 }}
            animate={{ 
              scale: [0.5, 1.2, 1],
              rotate: [0, -10, 10, -10, 0]
            }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-40 h-40 bg-yellow-400 rounded-3xl border-8 border-yellow-600 flex items-center justify-center shadow-2xl">
              <Sparkles size={60} className="text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white italic tracking-widest">
              正在敲蛋...
            </h2>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className={cn(
              "p-8 flex flex-col items-center text-center gap-6",
              finalRare ? "bg-gradient-to-b from-purple-50 to-white" : "bg-white"
            )}>
              <div className="space-y-1">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  finalRare ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {finalRare ? '稀有图纸' : '基础图纸'}
                </span>
                <h3 className="text-3xl font-black text-gray-900">{finalBp.name}</h3>
              </div>

              {/* Blueprint Preview */}
              <div className="relative p-4 bg-gray-50 rounded-2xl border-4 border-gray-100">
                <div 
                  className="grid gap-[1px]"
                  style={{ 
                    gridTemplateColumns: `repeat(${finalBp.gridSize}, 1fr)`,
                    width: '160px',
                    height: '160px'
                  }}
                >
                  {finalBp.pattern.map((colorIdx, i) => (
                    <div 
                      key={i} 
                      className="w-full h-full"
                      style={{ backgroundColor: finalBp.colors[colorIdx] }}
                    />
                  ))}
                </div>
                {finalRare && (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                    className="absolute -top-4 -right-4"
                  >
                    <Sparkles size={32} className="text-yellow-500 fill-yellow-500" />
                  </motion.div>
                )}
              </div>

              <div className="w-full flex flex-col gap-3">
                {(!finalRare) && (
                  <button
                    onClick={handleUpgrade}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-lg border-b-4 border-purple-900 flex items-center justify-center gap-2 group transition-all"
                  >
                    <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    豆能更炸（看广告升级）
                  </button>
                )}

                <button
                  onClick={() => onStart(finalBp, finalRare)}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-2xl shadow-lg border-b-4 border-yellow-600 flex items-center justify-center gap-2 group transition-all"
                >
                  <Play size={20} />
                  {finalRare ? '开心捏豆' : '直接捏豆'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Utility to merge classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
