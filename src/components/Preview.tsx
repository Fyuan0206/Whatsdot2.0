import React, { useState, useEffect } from 'react';
import { CompletedWork } from '../types';
import { BLUEPRINTS } from '../constants/blueprints';
import { motion } from 'motion/react';
import { DouyinService } from '../services/douyin';
import { cn } from '../lib/utils';
import { Send, Music, Download, Home, LayoutGrid } from 'lucide-react';

interface PreviewProps {
  work: CompletedWork;
  onReward: () => void;
  onDone: () => void;
}

export default function Preview({ work, onReward, onDone }: PreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success'>('idle');

  const familyKey = Object.keys(BLUEPRINTS).find(k => 
    BLUEPRINTS[k].basic.id === work.blueprintId || BLUEPRINTS[k].rare.id === work.blueprintId
  );
  const blueprint = familyKey ? (work.isRare ? BLUEPRINTS[familyKey].rare : BLUEPRINTS[familyKey].basic) : null;
  const history = (work as any).history || [];

  // Time-lapse simulation
  useEffect(() => {
    if (!isPlaying) return;
    
    if (currentStep >= history.length) {
      setTimeout(() => setCurrentStep(0), 2000); // Replay
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(s => s + 1);
    }, 100);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, history]);

  // Re-calculate pixel state based on current step
  const activePixels = new Array((blueprint?.gridSize || 8) * (blueprint?.gridSize || 8)).fill(0);
  history.slice(0, currentStep).forEach((h: any) => {
    activePixels[h.i] = h.c;
  });

  const handlePublish = async () => {
    setPublishStatus('publishing');
    try {
      await DouyinService.publishVideo({
        title: `我勒个豆！我拼了个【${blueprint?.name}】`,
      });
      setPublishStatus('success');
      onReward();
      DouyinService.showToast('分享成功！获得 1 张开豆券！');
    } catch (e) {
      console.error(e);
      setPublishStatus('idle');
    }
  };

  if (!blueprint) return null;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-gray-900">延时回顾</h2>
        <p className="text-gray-500 text-sm">点击炸裂发豆，分享你的神作！</p>
      </div>

      {/* Video Mock Area */}
      <div className="relative aspect-square w-full bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-x-4 border-gray-800">
        <div 
          className="absolute inset-0 grid gap-[1px] p-8"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {activePixels.map((p, i) => (
            <div 
              key={i} 
              className="w-full h-full transition-all duration-300"
              style={{ 
                backgroundColor: blueprint.colors[p],
                opacity: p === 0 ? 0.1 : 1,
                transform: p !== 0 ? 'scale(1)' : 'scale(0.8)'
              }} 
            />
          ))}
        </div>
        
        {/* Douyin UI Overlays */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
             <Music size={24} className="text-white animate-spin-slow" />
          </div>
        </div>

        <div className="absolute left-6 bottom-6 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-white" />
            <span className="text-white font-bold text-sm">我勒个豆拼手艺</span>
          </div>
          <p className="text-white text-xs opacity-80">我勒个豆！我拼了一个 {blueprint.name} #我勒个豆</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <button
          onClick={handlePublish}
          disabled={publishStatus !== 'idle'}
          className={cn(
            "w-full py-5 rounded-[2rem] font-black text-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-b-8",
            publishStatus === 'success' ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-red-500 text-white border-red-800"
          )}
        >
          <Send size={24} />
          {publishStatus === 'publishing' ? '正在连接抖音...' : publishStatus === 'success' ? '已炸裂' : '炸裂发豆'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onDone}
            className="py-4 bg-white text-yellow-800 font-bold rounded-2xl border-2 border-yellow-100 shadow-sm flex items-center justify-center gap-2"
          >
            <LayoutGrid size={20} />
            进入豆窖
          </button>
          <button
            onClick={() => window.location.reload()}
            className="py-4 bg-white text-gray-500 font-bold rounded-2xl border-2 border-gray-100 shadow-sm flex items-center justify-center gap-2"
          >
            <Home size={20} />
            回首页
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
