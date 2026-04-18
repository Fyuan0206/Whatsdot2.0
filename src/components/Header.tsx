import React from 'react';
import { ArrowLeft, Ticket, Warehouse, Heart } from 'lucide-react';
import { GameView } from '../types';

interface HeaderProps {
  tokens: number;
  view: GameView;
  onBack: () => void;
  onVault?: () => void;
  onCollection?: () => void;
}

export function Header({ tokens, view, onBack, onVault, onCollection }: HeaderProps) {
  return (
    <header className="px-4 py-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-2">
        {view !== 'home' && view !== 'vault' && view !== 'collection' && (
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
            <button
              onClick={onVault}
              className="p-2 bg-white rounded-full shadow-sm border-2 border-yellow-200 active:scale-95 transition-transform"
              title="我的豆窖"
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
        {(view === 'vault' || view === 'collection') && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-yellow-400 text-yellow-900 font-bold text-sm rounded-full shadow-sm border-b-2 border-yellow-600 active:scale-95 transition-transform"
          >
            返回
          </button>
        )}
        <div
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 min-h-[44px] rounded-full bg-gradient-to-b from-white to-amber-50/70 shadow-sm border-2 border-amber-200/90 ring-1 ring-amber-100/60"
          role="status"
          aria-label={`开豆券剩余 ${tokens} 张`}
          title="开豆券"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-700 shadow-inner"
            aria-hidden
          >
            <Ticket className="h-[18px] w-[18px] -rotate-6" strokeWidth={2.25} />
          </span>
          <span className="min-w-[1ch] font-black tabular-nums text-lg leading-none text-yellow-950">
            {tokens}
          </span>
        </div>
      </div>
    </header>
  );
}
