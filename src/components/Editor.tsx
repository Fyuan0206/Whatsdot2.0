import React, { useState, useEffect, useRef } from 'react';
import { Blueprint, CompletedWork } from '../types';
import { cn } from '../lib/utils';
import { Check, Info, RotateCcw } from 'lucide-react';
import { DouyinService } from '../services/douyin';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';

interface EditorProps {
  blueprint: Blueprint;
  isRare: boolean;
  onComplete: (work: CompletedWork) => void;
}

export default function Editor({ blueprint, isRare, onComplete }: EditorProps) {
  const [pixels, setPixels] = useState<number[]>(new Array(blueprint.gridSize * blueprint.gridSize).fill(0));
  const [selectedColorIdx, setSelectedColorIdx] = useState(1);
  const [history, setHistory] = useState<{ i: number, c: number }[]>([]);
  const [errors, setErrors] = useState<number[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  const filledCount = pixels.filter(p => p !== 0).length;
  const totalCount = blueprint.gridSize * blueprint.gridSize;

  const handlePixelClick = (index: number) => {
    const newPixels = [...pixels];
    // Toggle if same color, or just apply
    newPixels[index] = newPixels[index] === selectedColorIdx ? 0 : selectedColorIdx;
    setPixels(newPixels);
    setHistory([...history, { i: index, c: newPixels[index] }]);
    setErrors([]); // Clear errors on modification
  };

  const handleFinish = async () => {
    // We still calculate accuracy for potential future stats, but we don't block anymore
    let isPerfect = true;
    pixels.forEach((p, i) => {
      if (p !== blueprint.pattern[i]) {
        isPerfect = false;
      }
    });

    setIsFinishing(true);
    try {
      const workData = {
        uid: auth.currentUser!.uid,
        blueprintId: blueprint.id,
        isRare: isRare,
        pixelData: pixels,
        history: history, // Save history for time-lapse
        isPerfect: isPerfect,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'works'), workData);
      
      onComplete({
        id: docRef.id,
        ...workData,
        createdAt: new Date()
      } as any);
    } catch (e) {
      console.error(e);
      DouyinService.showToast('保存失败，请重试');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-md mx-auto">
      {/* Reference Card */}
      <div className="bg-white rounded-3xl p-4 shadow-md border-2 border-yellow-200 flex flex-col items-center gap-2">
        <div className="flex justify-between w-full items-center mb-1">
          <span className="text-xs font-black text-yellow-800 uppercase tracking-widest">拼豆指南</span>
          <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
            {filledCount}/{totalCount}
          </span>
        </div>
        <div 
          className="grid gap-[1px] p-2 bg-yellow-50/50 rounded-xl border border-yellow-100"
          style={{ 
            gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)`,
            width: '120px',
            height: '120px'
          }}
        >
          {blueprint.pattern.map((cIdx, i) => (
            <div key={i} style={{ backgroundColor: blueprint.colors[cIdx], borderRadius: '1px' }} />
          ))}
        </div>
        <p className="text-[10px] text-yellow-600/60 font-medium text-center">可以照着拼，也可以随心创作。你觉得行就行！</p>
      </div>

      {/* Main Canvas */}
      <div className="aspect-square bg-white rounded-3xl p-3 shadow-xl border-4 border-yellow-200 relative">
        <div 
          className="grid gap-[1px] w-full h-full bg-gray-100 p-1 rounded-xl overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {pixels.map((p, i) => (
            <button
              key={i}
              onClick={() => handlePixelClick(i)}
              className="w-full h-full transition-colors relative"
              style={{ backgroundColor: blueprint.colors[p] }}
            >
              {p === 0 && <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gray-200/50 -rotate-45" />}
            </button>
          ))}
        </div>
      </div>

      {/* Palette */}
      <div className="bg-white rounded-[2rem] p-4 shadow-lg border-2 border-yellow-100">
        <div className="flex justify-center gap-3">
          {blueprint.colors.slice(1).map((color, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedColorIdx(idx + 1)}
              className={cn(
                "w-12 h-12 rounded-full border-4 transition-all flex items-center justify-center",
                selectedColorIdx === idx + 1 ? "border-yellow-400 scale-110 shadow-md" : "border-transparent opacity-80"
              )}
              style={{ backgroundColor: color }}
            >
              {selectedColorIdx === idx + 1 && <Check size={20} className="text-white drop-shadow-sm" />}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 p-4 mt-auto">
        <button
          disabled={isFinishing}
          onClick={() => {
            setPixels(new Array(totalCount).fill(0));
            setHistory([]);
            DouyinService.showToast('画布已清空');
          }}
          className="p-5 bg-white text-gray-400 rounded-3xl shadow-sm border-2 border-gray-100 active:scale-95"
        >
          <RotateCcw size={24} />
        </button>

        <button
          disabled={filledCount === 0 || isFinishing}
          onClick={handleFinish}
          className={cn(
            "flex-1 py-5 rounded-3xl font-black text-xl shadow-xl border-b-8 transition-all active:scale-95 flex items-center justify-center gap-2",
            filledCount > 0
              ? "bg-green-500 border-green-700 text-white" 
              : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
          )}
        >
          {isFinishing ? '正在成豆...' : '捏豆成了！'}
          <SparklesIcon className={cn("inline-block", filledCount > 0 && "animate-bounce")} />
        </button>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813 6.088 1.187-6.088 1.187-1.912 5.813-1.912-5.813-6.088-1.187 6.088-1.187z" />
    </svg>
  );
}
