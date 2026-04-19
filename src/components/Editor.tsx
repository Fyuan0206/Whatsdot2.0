import { useEffect, useMemo, useRef, useState } from 'react';
import { Blueprint, CompletedWork, Rarity } from '../types';
import { cn, createId } from '../lib/utils';
import { Check, Plus, RotateCcw } from 'lucide-react';
import { DouyinService } from '../services/douyin';
import { SLOT_KEYWORDS } from '../constants/slotKeywords';
import SlotMachine from './SlotMachine';
import SlideColorSheet from './SlideColorSheet';

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
  /** 图纸铺满后开启：可对已上色连通区域自由改色 */
  const [diyModeActive, setDiyModeActive] = useState(false);
  /** 老虎机弹窗：铺满后先抽灵感关键词 */
  const [slotOpen, setSlotOpen] = useState(false);
  /** 本次创作抽到的关键词 */
  const [drawnKeyword, setDrawnKeyword] = useState<string | null>(null);
  /** DIY 阶段用户通过拾色器追加的自定义色（按添加顺序） */
  const [customColors, setCustomColors] = useState<string[]>([]);
  /** 滑动选色弹层（替代系统 input[type=color]，避免二维色域与 RGB 数字面板） */
  const [slideColorOpen, setSlideColorOpen] = useState(false);
  const prevIsFullFillRef = useRef(false);

  /** 色板 = 图纸原色板 + 用户自定义色；selectedColorIdx 即此数组下标 */
  const paletteColors = useMemo(
    () => [...blueprint.colors, ...customColors],
    [blueprint.colors, customColors],
  );

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
      /** 铺满瞬间先弹老虎机抽关键词，抽完才激活 DIY */
      setSlotOpen(true);
    }
    prevIsFullFillRef.current = isFullFill;
  }, [isFullFill]);

  const handleSlotPicked = (word: string) => {
    setDrawnKeyword(word);
    setSlotOpen(false);
    setDiyModeActive(true);
  };

  const handleAddCustomColor = (hex: string) => {
    setCustomColors((prev) => {
      if (prev.includes(hex) || blueprint.colors.includes(hex)) {
        const existingIdx = paletteColors.indexOf(hex);
        if (existingIdx >= 0) setSelectedColorIdx(existingIdx);
        return prev;
      }
      const next = [...prev, hex];
      setSelectedColorIdx(blueprint.colors.length + next.length - 1);
      return next;
    });
  };

  /**
   * 按图纸填色：仅当所选颜色与图纸色号一致时，铺满相连同色图纸区域。
   * DIY：图纸首次铺满后，改为单格改色（任意 drawable 格，不沿连通块扩散）。
   */
  const fillConnectedPatternRegion = (startIndex: number) => {
    const patternColor = blueprint.pattern[startIndex] ?? 0;
    const size = blueprint.gridSize;

    if (diyModeActive) {
      /** 图纸外空白格：点一下上色，再点一次取消（清空为 0） */
      if (patternColor === 0) {
        const next = [...pixels];
        const prev = next[startIndex];
        if (prev === 0) {
          next[startIndex] = selectedColorIdx;
          setHistory([...history, { i: startIndex, c: selectedColorIdx }]);
        } else {
          next[startIndex] = 0;
          setHistory([...history, { i: startIndex, c: 0 }]);
        }
        DouyinService.vibrateShort();
        setPixels(next);
        setErrors([]);
        setDiyPending(false);
        return;
      }

      if (selectedColorIdx === pixels[startIndex]) {
        DouyinService.showToast('该格已是所选颜色');
        return;
      }
      const next = [...pixels];
      next[startIndex] = selectedColorIdx;
      DouyinService.vibrateShort();
      setPixels(next);
      setHistory([...history, { i: startIndex, c: selectedColorIdx }]);
      setErrors([]);
      setDiyPending(false);
      return;
    }

    if (patternColor === 0) return;

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
    if (!isFullFill) {
      DouyinService.vibrateShort();
      DouyinService.showToast('请先把图纸上的颜色全部填完');
      return;
    }
    if (diyPending) {
      DouyinService.vibrateShort();
      DouyinService.showToast('请先在画布上做 DIY 改色后再捏豆');
      return;
    }
    setIsFinishing(true);
    DouyinService.vibrateLong();
    try {
      const work: CompletedWork = {
        id: createId(),
        uid: guestUid,
        blueprintId: blueprint.id,
        rarity,
        pixelData: pixels,
        history,
        createdAt: new Date(),
        keyword: drawnKeyword ?? undefined,
        paletteColors: customColors.length > 0 ? paletteColors : undefined,
      };
      onComplete(work);
    } catch (e) {
      console.error(e);
      DouyinService.showToast('保存失败，请重试');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <>
    <div className="flex flex-col h-full gap-4 max-w-md mx-auto">
      {diyModeActive && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-center shadow-sm"
          role="status"
        >
          <p className="text-sm font-bold text-amber-900">
            {drawnKeyword ? (
              <>
                结合「<span className="text-amber-600">{drawnKeyword}</span>」开始你自己的 DIY 创作吧
              </>
            ) : (
              'DIY 改色已开启'
            )}
          </p>
        </div>
      )}
      <div
        className={cn(
          'flex shrink-0 flex-col bg-white rounded-3xl shadow-xl border-4 overflow-hidden',
          theme.canvasBorder
        )}
      >
        <div className="relative w-full min-h-0 min-w-0 aspect-square p-3 box-border">
        <div
          className="relative z-10 grid gap-[1px] w-full h-full bg-gray-100 p-1 rounded-xl overflow-hidden touch-manipulation"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {pixels.map((p, i) => {
            const x = i % blueprint.gridSize;
            const y = Math.floor(i / blueprint.gridSize);
            const patternIdx = blueprint.pattern[i] ?? 0;
            const guideColor = blueprint.colors[patternIdx] ?? '#e5e7eb';

            const style =
              p !== 0
                ? { backgroundColor: paletteColors[p] }
                : patternIdx > 0
                  ? {
                      backgroundColor: `${guideColor}26`,
                      boxShadow: `inset 0 0 0 2px ${guideColor}`,
                    }
                  : diyModeActive
                    ? {
                        backgroundColor: '#f3f4f6',
                        boxShadow: 'inset 0 0 0 2px #cbd5e1',
                      }
                    : { backgroundColor: '#f3f4f6' };

            if (patternIdx === 0 && !diyModeActive) {
              return (
                <div
                  key={i}
                  className="w-full h-full relative min-h-0 min-w-0 rounded-[1px] pointer-events-none"
                  style={style}
                  aria-hidden
                />
              );
            }

            const ariaDiy = diyModeActive
              ? patternIdx === 0
                ? `画布 ${x + 1},${y + 1}，DIY：图纸外空白格，点一下用所选颜色上色，再点一次取消颜色`
                : `画布 ${x + 1},${y + 1}，DIY：点击仅修改这一格珠粒为所选颜色`
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
      </div>

      <div className={cn("bg-white rounded-[2rem] p-4 shadow-lg border-2", theme.paletteBorder)}>
        <div className="flex items-start gap-2 touch-manipulation">
          <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-3">
            {paletteColors.slice(1).map((color, idx) => {
              const paletteIdx = idx + 1;
              const isCustom = paletteIdx >= blueprint.colors.length;
              return (
                <button
                  key={`${paletteIdx}-${color}`}
                  type="button"
                  onClick={() => setSelectedColorIdx(paletteIdx)}
                  className={cn(
                    "min-h-[48px] min-w-[48px] h-14 w-14 shrink-0 rounded-full border-4 transition-all flex items-center justify-center relative active:scale-95",
                    selectedColorIdx === paletteIdx
                      ? cn("scale-105 shadow-md", theme.paletteActiveBorder)
                      : "border-transparent opacity-90"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={isCustom ? `选择自定义色 ${color}` : `选择色号 ${paletteIdx}`}
                  aria-pressed={selectedColorIdx === paletteIdx}
                >
                  {selectedColorIdx === paletteIdx && <Check size={22} className="text-white drop-shadow-sm" strokeWidth={3} />}
                  {isCustom && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 ring-2 ring-white"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {diyModeActive && (
            <button
              type="button"
              className="flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full border-2 border-dashed border-amber-400 bg-gradient-to-b from-amber-50 to-white text-amber-600 shadow-sm transition-all touch-manipulation active:scale-[0.98] active:bg-amber-100/80"
              aria-label="添加自定义颜色，滑动选色"
              onClick={() => setSlideColorOpen(true)}
            >
              <Plus size={22} className="shrink-0" strokeWidth={2.5} aria-hidden />
            </button>
          )}
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
              setDrawnKeyword(null);
              setCustomColors([]);
              setSelectedColorIdx(1);
              prevIsFullFillRef.current = false;
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
              'flex-1 min-h-[44px] py-5 rounded-3xl font-black text-xl shadow-xl border-b-8 transition-all flex items-center justify-center gap-2',
              filledCount === 0 || isFinishing
                ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed opacity-90'
                : 'active:scale-95',
              filledCount > 0 &&
                !isFinishing &&
                (!isFullFill
                  ? 'bg-slate-200 border-slate-300 text-slate-400'
                  : diyPending
                    ? 'bg-slate-200 border-slate-300 text-slate-400'
                    : 'bg-green-500 border-green-700 text-white')
            )}
          >
            {isFinishing ? '正在成豆...' : '捏豆成了！'}
            <SparklesIcon className={cn('inline-block', isFullFill && !diyPending && 'animate-bounce')} />
          </button>
        </div>
      </div>
    </div>
    <SlotMachine open={slotOpen} keywords={SLOT_KEYWORDS} onPicked={handleSlotPicked} />
    <SlideColorSheet
      open={slideColorOpen}
      onClose={() => setSlideColorOpen(false)}
      onConfirm={(hex) => handleAddCustomColor(hex)}
    />
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
    case 'epic':
      return {
        canvasBorder: "border-fuchsia-200",
        paletteBorder: "border-fuchsia-100",
        paletteActiveBorder: "border-fuchsia-400",
      };
  }
}
