import React from 'react';
import { ArrowLeft, Coins, Warehouse, Heart } from 'lucide-react';
import { GameView, PerfTier } from '../types';
import { cn } from '../lib/utils';

interface HeaderProps {
  tokens: number;
  view: GameView;
  onBack: () => void;
  onWarehouse?: () => void;
  onCollection?: () => void;
  perfTier?: PerfTier;
  onPerf?: () => void;
  activeTitle?: string;
}

export function Header({ tokens, view, onBack, onWarehouse, onCollection, perfTier, onPerf, activeTitle }: HeaderProps) {
  return (
    <header className="px-4 py-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-2">
        {view !== 'home' && view !== 'warehouse' && view !== 'collection' && (
          <button
            onClick={onBack}
            className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} className="text-yellow-700" />
          </button>
        )}
        <h1 className="text-xl font-black text-yellow-800 tracking-tighter">
          我勒个豆
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {view === 'home' && (
          <>
            {onPerf && perfTier && (
              <button
                onClick={onPerf}
                className="w-10 h-10 bg-white rounded-full shadow-sm border-2 border-yellow-200 active:scale-95 transition-transform flex items-center justify-center"
                title="特效性能"
              >
                <span className="text-[11px] font-black text-yellow-800">特效</span>
              </button>
            )}
            <button
              onClick={onWarehouse}
              className="p-2 bg-white rounded-full shadow-sm border-2 border-yellow-200 active:scale-95 transition-transform"
              title="仓库"
            >
              <Warehouse size={20} className="text-yellow-600" />
            </button>
            <button
              onClick={onCollection}
              className="p-2 bg-white rounded-full shadow-sm border-2 border-yellow-200 active:scale-95 transition-transform"
              title="收藏室"
            >
              <Heart size={20} className="text-red-500" />
            </button>
          </>
        )}
        {(view === 'warehouse' || view === 'collection') && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-yellow-400 text-yellow-900 font-bold text-sm rounded-full shadow-sm border-b-2 border-yellow-600 active:scale-95 transition-transform"
          >
            返回
          </button>
        )}
        {activeTitle && (
          <div className={cn("hidden sm:flex items-center px-3 py-1.5 bg-white rounded-full shadow-sm border-2 border-yellow-200")}>
            <span className="text-[11px] font-black text-yellow-800">{activeTitle}</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border-2 border-yellow-200">
          <Coins size={18} className="text-yellow-500" />
          <span className="font-bold text-yellow-900">{tokens}</span>
        </div>
      </div>
    </header>
  );
}
