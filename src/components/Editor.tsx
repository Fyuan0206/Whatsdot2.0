import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Blueprint, CompletedWork, Rarity } from '../types';
import { cn } from '../lib/utils';
import { Check, RotateCcw } from 'lucide-react';
import { DouyinService } from '../services/douyin';

interface EditorProps {
  guestUid: string;
  blueprint: Blueprint;
  rarity: Rarity;
  onComplete: (work: CompletedWork) => void;
}

export default function Editor({ guestUid, blueprint, rarity, onComplete }: EditorProps) {
  const [pixels, setPixels] = useState<number[]>(new Array(blueprint.gridSize * blueprint.gridSize).fill(0));
  const [selectedColorIdx, setSelectedColorIdx] = useState(1);
  const [history, setHistory] = useState<{ i: number, c: number }[]>([]);
  const [errors, setErrors] = useState<number[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  /** 刚按图纸铺满后需先 DIY（再改动画布）才能捏豆 */
  const [diyPending, setDiyPending] = useState(false);
  /** 小游戏内系统弹窗可能不可用，用页面内弹层保证可见 */
  const [diyGateOpen, setDiyGateOpen] = useState(false);
  /** 图纸铺满后开启：可对已上色连通区域自由改色 */
  const [diyModeActive, setDiyModeActive] = useState(false);
  const prevIsFullFillRef = useRef(false);

  const totalCount = blueprint.gridSize * blueprint.gridSize;

  const theme = useMemo(() => getEditorTheme(rarity), [rarity]);

  const { filledCount, drawableTotal } = useMemo(() => {
    let drawable = 0;
    let filled = 0;
    for (let i = 0; i < totalCount; i++) {
      if ((blueprint.pattern[i] ?? 0) > 0) {
        drawable++;
        if (pixels[i] !== 0) filled++;
      }
    }
    return { filledCount: filled, drawableTotal: drawable };
  }, [blueprint.pattern, pixels, totalCount]);

  const isFullFill = drawableTotal > 0 && filledCount === drawableTotal;

  useEffect(() => {
    if (isFullFill && !prevIsFullFillRef.current) {
      setDiyPending(true);
      setDiyModeActive(true);
    }
    prevIsFullFillRef.current = isFullFill;
  }, [isFullFill]);

  /**
   * 按图纸填色：仅当所选颜色与图纸色号一致时，铺满相连同色图纸区域。
   * DIY：图纸已铺满后，对已上色区域可按「当前珠色」连通块任意改色。
   */
  const fillConnectedPatternRegion = (startIndex: number) => {
    const patternColor = blueprint.pattern[startIndex] ?? 0;
    if (patternColor === 0) return;

    const size = blueprint.gridSize;
    const startPixel = pixels[startIndex];
    const useDiyFlood = diyModeActive && startPixel !== 0;

    if (useDiyFlood) {
      if (selectedColorIdx === startPixel) {
        DouyinService.showToast('该区域已经铺好啦');
        return;
      }
      const queue: number[] = [startIndex];
      const visited = new Set<number>([startIndex]);
      while (queue.length > 0) {
        const i = queue.shift()!;
        const x = i % size;
        const y = Math.floor(i / size);
        const tryAdd = (ni: number) => {
          if (visited.has(ni)) return;
          if ((blueprint.pattern[ni] ?? 0) === 0) return;
          if (pixels[ni] !== startPixel) return;
          visited.add(ni);
          queue.push(ni);
        };
        if (x > 0) tryAdd(i - 1);
        if (x < size - 1) tryAdd(i + 1);
        if (y > 0) tryAdd(i - size);
        if (y < size - 1) tryAdd(i + size);
      }
      const next = [...pixels];
      const nextHistory: { i: number; c: number }[] = [];
      for (const i of visited) {
        if (next[i] === selectedColorIdx) continue;
        next[i] = selectedColorIdx;
        nextHistory.push({ i, c: selectedColorIdx });
      }
      if (nextHistory.length === 0) return;
      DouyinService.vibrateShort();
      setPixels(next);
      setHistory([...history, ...nextHistory]);
      setErrors([]);
      setDiyPending(false);
      return;
    }

    if (selectedColorIdx !== patternColor) {
      DouyinService.vibrateShort();
      DouyinService.showToast('请先在下方选择与该区域一致的颜色');
      return;
    }

    const queue: number[] = [startIndex];
    const visited = new Set<number>([startIndex]);
    while (queue.length > 0) {
      const i = queue.shift()!;
      const x = i % size;
      const y = Math.floor(i / size);
      const tryAdd = (ni: number) => {
        if (visited.has(ni)) return;
        if ((blueprint.pattern[ni] ?? 0) !== patternColor) return;
        visited.add(ni);
        queue.push(ni);
      };
      if (x > 0) tryAdd(i - 1);
      if (x < size - 1) tryAdd(i + 1);
      if (y > 0) tryAdd(i - size);
      if (y < size - 1) tryAdd(i + size);
    }

    const next = [...pixels];
    const nextHistory: { i: number; c: number }[] = [];
    for (const i of visited) {
      if (next[i] === selectedColorIdx) continue;
      next[i] = selectedColorIdx;
      nextHistory.push({ i, c: selectedColorIdx });
    }
    if (nextHistory.length === 0) {
      DouyinService.showToast('该区域已经铺好啦');
      return;
    }
    DouyinService.vibrateShort();
    setPixels(next);
    setHistory([...history, ...nextHistory]);
    setErrors([]);
    setDiyPending(false);
  };

  const handleFinish = async () => {
    if (diyPending) {
      DouyinService.vibrateShort();
      setDiyGateOpen(true);
      DouyinService.showModal({ content: '请开始你的DIY' });
      return;
    }
    setIsFinishing(true);
    DouyinService.vibrateLong();
    try {
      const work: CompletedWork = {
        id: crypto.randomUUID(),
        uid: guestUid,
        blueprintId: blueprint.id,
        rarity,
        pixelData: pixels,
        history,
        createdAt: new Date(),
      };
      onComplete(work);
    } catch (e) {
      console.error(e);
      DouyinService.showToast('保存失败，请重试');
    } finally {
      setIsFinishing(false);
    }
  };

  const diyGatePortal =
    typeof document !== 'undefined' && diyGateOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="diy-gate-title"
            onClick={() => setDiyGateOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="diy-gate-title" className="text-center text-lg font-bold text-gray-900">
                请开始你的DIY
              </h2>
              <p className="mt-3 text-center text-sm text-gray-600 leading-relaxed">
                任选下方颜色，点画布上相连的同色珠粒即可 DIY 改色；完成后再点「捏豆成了」。
              </p>
              <button
                type="button"
                className="mt-6 w-full min-h-[44px] rounded-xl bg-amber-500 py-3 text-base font-bold text-white shadow-md active:scale-[0.98]"
                onClick={() => setDiyGateOpen(false)}
              >
                知道了
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
    <div className="flex flex-col h-full gap-4 max-w-md mx-auto">
      {diyModeActive && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-center shadow-sm"
          role="status"
        >
          <p className="text-sm font-bold text-amber-900">DIY 改色已开启</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
            在下方任选颜色，点击画布上与该点<span className="font-semibold">同色相连</span>的珠粒，整块一起换色。
          </p>
        </div>
      )}
      <div className={cn("aspect-square bg-white rounded-3xl p-3 shadow-xl border-4 relative", theme.canvasBorder)}>
        <div
          className="grid gap-[1px] w-full h-full bg-gray-100 p-1 rounded-xl overflow-hidden touch-manipulation"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {pixels.map((p, i) => {
            const x = i % blueprint.gridSize;
            const y = Math.floor(i / blueprint.gridSize);
            const patternIdx = blueprint.pattern[i] ?? 0;
            const guideColor = blueprint.colors[patternIdx] ?? '#e5e7eb';

            const style =
              p !== 0
                ? { backgroundColor: blueprint.colors[p] }
                : patternIdx > 0
                  ? {
                      backgroundColor: `${guideColor}26`,
                      boxShadow: `inset 0 0 0 2px ${guideColor}`,
                    }
                  : { backgroundColor: '#f3f4f6' };

            if (patternIdx === 0) {
              return (
                <div
                  key={i}
                  className="w-full h-full relative min-h-0 min-w-0 rounded-[1px] pointer-events-none"
                  style={style}
                  aria-hidden
                />
              );
            }

            const ariaDiy =
              diyModeActive && pixels[i] !== 0
                ? `画布 ${x + 1},${y + 1}，DIY：所选颜色将铺满与当前珠色相连的区域`
                : `画布 ${x + 1},${y + 1}，与图纸色号一致时点击可铺满相连区域，目标色号 ${patternIdx}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => fillConnectedPatternRegion(i)}
                className="w-full h-full transition-colors relative min-h-0 min-w-0 rounded-[1px] cursor-pointer"
                style={style}
                aria-label={ariaDiy}
              >
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("bg-white rounded-[2rem] p-4 shadow-lg border-2", theme.paletteBorder)}>
        <div className="flex justify-center gap-3">
          {blueprint.colors.slice(1).map((color, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedColorIdx(idx + 1)}
              className={cn(
                "w-12 h-12 rounded-full border-4 transition-all flex items-center justify-center",
                selectedColorIdx === idx + 1 ? cn("scale-110 shadow-md", theme.paletteActiveBorder) : "border-transparent opacity-80"
              )}
              style={{ backgroundColor: color }}
              aria-label={`选择色号 ${idx + 1}`}
              aria-pressed={selectedColorIdx === idx + 1}
            >
              {selectedColorIdx === idx + 1 && <Check size={20} className="text-white drop-shadow-sm" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 mt-auto">
        <div className="flex gap-4">
          <button
            type="button"
            disabled={isFinishing}
            onClick={() => {
              setPixels(new Array(totalCount).fill(0));
              setHistory([]);
              setDiyPending(false);
              setDiyModeActive(false);
              DouyinService.showToast('画布已清空');
            }}
            className="p-5 bg-white text-gray-400 rounded-3xl shadow-sm border-2 border-gray-100 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="清空画布"
          >
            <RotateCcw size={24} />
          </button>

          <button
            type="button"
            disabled={filledCount === 0 || isFinishing}
            onClick={handleFinish}
            className={cn(
              'flex-1 min-h-[44px] py-5 rounded-3xl font-black text-xl shadow-xl border-b-8 transition-all active:scale-95 flex items-center justify-center gap-2',
              filledCount > 0
                ? diyPending
                  ? 'bg-amber-500 border-amber-700 text-white'
                  : 'bg-green-500 border-green-700 text-white'
                : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
            )}
          >
            {isFinishing ? '正在成豆...' : '捏豆成了！'}
            <SparklesIcon className={cn('inline-block', filledCount > 0 && !diyPending && 'animate-bounce')} />
          </button>
        </div>
      </div>
    </div>
    {diyGatePortal}
    </>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813 6.088 1.187-6.088 1.187-1.912 5.813-1.912-5.813-6.088-1.187 6.088-1.187z" />
    </svg>
  );
}

function getEditorTheme(rarity: Rarity) {
  switch (rarity) {
    case 'green':
      return {
        canvasBorder: "border-green-200",
        paletteBorder: "border-green-100",
        paletteActiveBorder: "border-green-400",
      };
    case 'blue':
      return {
        canvasBorder: "border-blue-200",
        paletteBorder: "border-blue-100",
        paletteActiveBorder: "border-blue-400",
      };
    case 'purple':
      return {
        canvasBorder: "border-purple-200",
        paletteBorder: "border-purple-100",
        paletteActiveBorder: "border-purple-400",
      };
    case 'gold':
      return {
        canvasBorder: "border-yellow-200",
        paletteBorder: "border-yellow-100",
        paletteActiveBorder: "border-yellow-400",
      };
    case 'red':
      return {
        canvasBorder: "border-red-200",
        paletteBorder: "border-red-100",
        paletteActiveBorder: "border-red-400",
      };
  }
}
