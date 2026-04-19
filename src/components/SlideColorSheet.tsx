import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hslToHex } from '../lib/color';
import { cn } from '../lib/utils';

interface SlideColorSheetProps {
  open: boolean;
  onClose: () => void;
  /** 用户确认后返回 #RRGGBB */
  onConfirm: (hex: string) => void;
}

/**
 * 手机端滑动选色：仅色相 + 明暗两维滑动条，无 RGB 数字、无二维饱和/明度面板（替代系统 input[type=color]）。
 */
export default function SlideColorSheet({ open, onClose, onConfirm }: SlideColorSheetProps) {
  const [hue, setHue] = useState(28);
  const [lightness, setLightness] = useState(52);

  useEffect(() => {
    if (!open) return;
    setHue(28);
    setLightness(52);
  }, [open]);

  const previewHex = useMemo(() => hslToHex(hue, 100, lightness), [hue, lightness]);

  const handleConfirm = () => {
    onConfirm(previewHex);
    onClose();
  };

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1001] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="滑动选色"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl',
          'border-t-4 border-amber-200 sm:border-4',
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" aria-hidden />

        <p className="text-center text-sm font-black text-amber-900">滑动选色</p>
        <p className="mt-1 text-center text-xs text-gray-500">拖动下方滑条，无需输入数字</p>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div
            className="h-16 w-16 rounded-full border-4 border-white shadow-lg ring-2 ring-amber-100"
            style={{ backgroundColor: previewHex }}
            aria-hidden
          />
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-600">
              <span>色相</span>
            </div>
            <div className="slide-color-hue-wrap rounded-full p-1">
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="slide-color-range slide-color-hue-range h-12 w-full cursor-pointer"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={hue}
                aria-label="色相"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-600">
              <span>明暗</span>
            </div>
            <div
              className="slide-color-light-wrap rounded-full p-1"
              style={{
                background: `linear-gradient(to right, ${hslToHex(hue, 100, 12)}, ${hslToHex(hue, 100, 92)})`,
              }}
            >
              <input
                type="range"
                min={12}
                max={92}
                step={1}
                value={lightness}
                onChange={(e) => setLightness(Number(e.target.value))}
                className="slide-color-range slide-color-light-range h-12 w-full cursor-pointer"
                aria-valuemin={12}
                aria-valuemax={92}
                aria-valuenow={lightness}
                aria-label="明暗"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            className="min-h-[48px] flex-1 rounded-2xl border-2 border-gray-200 bg-white py-3 text-sm font-black text-gray-700 active:scale-[0.98]"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="min-h-[48px] flex-[1.2] rounded-2xl bg-amber-500 py-3 text-sm font-black text-white shadow-md border-b-4 border-amber-700 active:scale-[0.98]"
            onClick={handleConfirm}
          >
            使用此颜色
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
