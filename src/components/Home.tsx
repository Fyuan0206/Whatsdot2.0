import React from 'react';
import { motion } from 'motion/react';
import { Box, PlayCircle } from 'lucide-react';

interface HomeProps {
  onDraw: () => void;
}

export default function Home({ onDraw }: HomeProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="relative"
      >
        <div className="w-48 h-48 icon-box-primary">
          <div className="grid grid-cols-4 gap-1 transform rotate-12 scale-150 opacity-10">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-8 h-8 bg-black rounded-sm" />
            ))}
          </div>
          <motion.div
            animate={{ 
              rotate: [0, -5, 5, 0],
              y: [0, -10, 0]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Box size={80} className="text-white drop-shadow-2xl" />
          </motion.div>
        </div>
      </motion.div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-yellow-900 drop-shadow-sm">我勒个豆</h2>
        <p className="text-yellow-700 font-medium">看准图纸，捏出炸裂像素！</p>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDraw}
        className="group relative px-12 py-5 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full border-b-8 border-yellow-700 shadow-xl"
      >
        <span className="relative flex items-center gap-3 text-2xl font-black text-white italic tracking-widest drop-shadow-md">
          开个豆！
          <PlayCircle size={28} />
        </span>
      </motion.button>

      <div className="mt-8 p-4 bg-yellow-100 rounded-2xl border-2 border-dashed border-yellow-300 max-w-xs text-center">
        <p className="text-xs text-yellow-600">
          每日登录获赠 1 张开豆券<br />
          发抖音分享可再获 1 张！
        </p>
      </div>
    </div>
  );
}
