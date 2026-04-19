import React from 'react';
import { motion } from 'motion/react';
import { Coins } from 'lucide-react';
import { cn } from '../lib/utils';
import logoImg from '@/assets/logo.png';
import { WorldChannel } from './WorldChannel';
import { COIN_DRAW_COST } from '../types';

interface HomeProps {
  onDraw: () => void;
  coins?: number;
  pityProgress?: number;
  enableEnhanced?: boolean;
}

export default function Home({
  onDraw,
  coins = 0,
  pityProgress = 0,
  enableEnhanced = false,
}: HomeProps) {
  const canCoinDraw = coins >= COIN_DRAW_COST;
  const pct = Math.min(100, Math.max(0, Math.floor((pityProgress / 99) * 100)));
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="relative"
      >
        <div className="w-48 h-48 rounded-[3rem] border-8 border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3)] overflow-hidden bg-white flex items-center justify-center p-2">
          <img
            src={logoImg}
            alt="我勒个豆"
            width={192}
            height={192}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        </div>
      </motion.div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-yellow-900 drop-shadow-sm">我勒个豆</h2>
        <p className="text-yellow-700 font-medium">看准图纸，捏出炸裂像素！</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.button
          whileHover={canCoinDraw ? { scale: 1.05 } : undefined}
          whileTap={canCoinDraw ? { scale: 0.95 } : undefined}
          onClick={onDraw}
          disabled={!canCoinDraw}
          className={cn(
            "group relative px-12 py-5 rounded-full border-b-8 shadow-xl transition-all",
            canCoinDraw
              ? "bg-gradient-to-b from-yellow-400 to-yellow-600 border-yellow-700"
              : "bg-gradient-to-b from-gray-200 to-gray-300 border-gray-400 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "relative flex items-center gap-3 text-2xl font-black italic tracking-widest drop-shadow-md",
              canCoinDraw ? "text-white" : "text-gray-400"
            )}
          >
            开个豆！
            <Coins size={28} />
          </span>
        </motion.button>
      </div>

      {enableEnhanced && (
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-yellow-800 mb-1">
            <span>欧气值</span>
            <span>{pityProgress}/1?</span>
          </div>
          <div className="h-2.5 rounded-full bg-yellow-100 overflow-hidden border border-yellow-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              className={cn("h-full bg-gradient-to-r from-yellow-300 to-yellow-600")}
            />
          </div>
        </div>
      )}

      {enableEnhanced && (
        <div className="w-full px-1">
          <WorldChannel />
        </div>
      )}
    </div>
  );
}
