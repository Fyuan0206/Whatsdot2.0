import React from 'react';
import { X } from 'lucide-react';
import type { PerfTier } from '../types';
import { cn } from '../lib/utils';

export function PerfSettingsModal({
  tier,
  onChange,
  onClose,
}: {
  tier: PerfTier;
  onChange: (tier: PerfTier) => void;
  onClose: () => void;
}) {
  const option = (v: PerfTier, title: string, desc: string) => (
    <button
      key={v}
      onClick={() => onChange(v)}
      className={cn(
        "w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99]",
        tier === v ? "border-yellow-400 bg-yellow-50" : "border-gray-100 bg-white"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-black text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-1">{desc}</div>
        </div>
        <div className={cn("w-4 h-4 rounded-full border-2", tier === v ? "border-yellow-600 bg-yellow-400" : "border-gray-300")} />
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
          <div>
            <div className="text-lg font-black text-gray-900">特效性能</div>
            <div className="text-xs text-gray-500 mt-1">低端设备建议选“流畅优先”。</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-50 border border-gray-100 active:scale-95">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {option('low', '流畅优先', '粒子/金币雨降级，减少震动与动效。')}
          {option('medium', '平衡', '默认配置，兼顾动效与流畅。')}
          {option('high', '极致', '全屏粒子、金币雨、震动更强，耗电更高。')}
        </div>
      </div>
    </div>
  );
}

