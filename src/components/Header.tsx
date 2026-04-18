import React from 'react';
import { ArrowLeft, Coins } from 'lucide-react';
import { GameView } from '../types';

interface HeaderProps {
  tokens: number;
  view: GameView;
  onBack: () => void;
}

export function Header({ tokens, view, onBack }: HeaderProps) {
  return (
    <header className="px-4 py-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-2">
        {view !== 'home' && (
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

      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border-2 border-yellow-200">
        <Coins size={18} className="text-yellow-500" />
        <span className="font-bold text-yellow-900">{tokens}</span>
      </div>
    </header>
  );
}
