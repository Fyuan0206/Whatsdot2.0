import React, { useMemo, useState } from 'react';
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
  const [patternSelect, setPatternSelect] = useState<null | { x0: number; y0: number; x1: number; y1: number }>(null);
  const [isSelectingPattern, setIsSelectingPattern] = useState(false);
  const [isPasteMode, setIsPasteMode] = useState(false);

  const filledCount = pixels.filter(p => p !== 0).length;
  const totalCount = blueprint.gridSize * blueprint.gridSize;
  const supportsPatternBlock = blueprint.gridSize >= 24;

  const theme = useMemo(() => getEditorTheme(rarity), [rarity]);

  const normalizedPatternRect = useMemo(() => {
    if (!patternSelect) return null;
    const xMin = Math.min(patternSelect.x0, patternSelect.x1);
    const xMax = Math.max(patternSelect.x0, patternSelect.x1);
    const yMin = Math.min(patternSelect.y0, patternSelect.y1);
    const yMax = Math.max(patternSelect.y0, patternSelect.y1);
    return { xMin, xMax, yMin, yMax, w: xMax - xMin + 1, h: yMax - yMin + 1 };
  }, [patternSelect]);

  const selectedPatternBlock = useMemo(() => {
    if (!supportsPatternBlock || !normalizedPatternRect) return null;
    const { xMin, yMin, w, h } = normalizedPatternRect;
    const cells: number[] = [];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const idx = (yMin + dy) * blueprint.gridSize + (xMin + dx);
        cells.push(blueprint.pattern[idx] ?? 0);
      }
    }
    return { w, h, cells };
  }, [blueprint.gridSize, blueprint.pattern, normalizedPatternRect, supportsPatternBlock]);

  const handlePixelClick = (index: number) => {
    DouyinService.vibrateShort();
    const newPixels = [...pixels];
    newPixels[index] = newPixels[index] === selectedColorIdx ? 0 : selectedColorIdx;
    setPixels(newPixels);
    setHistory([...history, { i: index, c: newPixels[index] }]);
    setErrors([]);
  };

  const handleFinish = async () => {
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

  const applyPatternBlockAt = (anchorIndex: number) => {
    if (!selectedPatternBlock) return;
    DouyinService.vibrateShort();
    const size = blueprint.gridSize;
    const ax = anchorIndex % size;
    const ay = Math.floor(anchorIndex / size);

    const next = [...pixels];
    const nextHistory: { i: number; c: number }[] = [];

    for (let dy = 0; dy < selectedPatternBlock.h; dy++) {
      for (let dx = 0; dx < selectedPatternBlock.w; dx++) {
        const source = selectedPatternBlock.cells[dy * selectedPatternBlock.w + dx] ?? 0;
        if (source === 0) continue;
        const tx = ax + dx;
        const ty = ay + dy;
        if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
        const ti = ty * size + tx;
        if (next[ti] === source) continue;
        next[ti] = source;
        nextHistory.push({ i: ti, c: source });
      }
    }

    if (nextHistory.length === 0) return;
    setPixels(next);
    setHistory([...history, ...nextHistory]);
    setErrors([]);
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-md mx-auto">
      <div className={cn("bg-white rounded-3xl p-4 shadow-md border-2 flex flex-col items-center gap-2", theme.cardBorder)}>
        <div className="flex justify-between w-full items-center mb-1">
          <span className={cn("text-xs font-black uppercase tracking-widest", theme.titleText)}>拼豆指南</span>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", theme.counterText, theme.counterBg, theme.counterBorder)}>
            {filledCount}/{totalCount}
          </span>
        </div>
        <div
          className={cn("grid gap-[1px] p-2 rounded-xl border", theme.guideBg, theme.guideBorder)}
          style={{
            gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)`,
            width: '120px',
            height: '120px'
          }}
        >
          {blueprint.pattern.map((cIdx, i) => {
            const x = i % blueprint.gridSize;
            const y = Math.floor(i / blueprint.gridSize);
            const inRect = normalizedPatternRect
              ? x >= normalizedPatternRect.xMin && x <= normalizedPatternRect.xMax && y >= normalizedPatternRect.yMin && y <= normalizedPatternRect.yMax
              : false;
            return (
              <button
                key={i}
                onPointerDown={() => {
                  if (!supportsPatternBlock) return;
                  setIsPasteMode(false);
                  setIsSelectingPattern(true);
                  setPatternSelect({ x0: x, y0: y, x1: x, y1: y });
                }}
                onPointerEnter={() => {
                  if (!supportsPatternBlock || !isSelectingPattern) return;
                  setPatternSelect((prev) => (prev ? { ...prev, x1: x, y1: y } : prev));
                }}
                onPointerUp={() => setIsSelectingPattern(false)}
                onPointerCancel={() => setIsSelectingPattern(false)}
                className={cn("w-full h-full relative", supportsPatternBlock && "touch-none")}
                style={{ backgroundColor: blueprint.colors[cIdx], borderRadius: '1px' }}
              >
                {inRect && <div className={cn("absolute inset-0 border", theme.selectionBorder)} style={{ borderRadius: '1px' }} />}
              </button>
            );
          })}
        </div>
        {supportsPatternBlock ? (
          <div className="w-full flex flex-col gap-2 items-center">
            <div className="flex items-center gap-2">
              <button
                disabled={!selectedPatternBlock}
                onClick={() => setIsPasteMode((v) => !v)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold border",
                  selectedPatternBlock ? theme.pasteBtnActive : "bg-gray-100 text-gray-400 border-gray-200"
                )}
              >
                {isPasteMode ? '退出贴块' : '贴块加速'}
              </button>
              <button
                disabled={!patternSelect}
                onClick={() => {
                  setPatternSelect(null);
                  setIsPasteMode(false);
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold border",
                  patternSelect ? theme.clearBtn : "bg-gray-100 text-gray-400 border-gray-200"
                )}
              >
                清除选区
              </button>
            </div>
            <p className={cn("text-[10px] font-medium text-center", theme.hintText)}>
              在原图上拖动框选一块，再点画布放置，拼豆更快。
            </p>
          </div>
        ) : (
          <p className={cn("text-[10px] font-medium text-center", theme.hintText)}>12 格只支持手动填充。你觉得行就行！</p>
        )}
      </div>

      <div className={cn("aspect-square bg-white rounded-3xl p-3 shadow-xl border-4 relative", theme.canvasBorder)}>
        <div
          className="grid gap-[1px] w-full h-full bg-gray-100 p-1 rounded-xl overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {pixels.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                if (isPasteMode && selectedPatternBlock) return applyPatternBlockAt(i);
                return handlePixelClick(i);
              }}
              className="w-full h-full transition-colors relative"
              style={{ backgroundColor: blueprint.colors[p] }}
            >
              {p === 0 && <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gray-200/50 -rotate-45" />}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("bg-white rounded-[2rem] p-4 shadow-lg border-2", theme.paletteBorder)}>
        <div className="flex justify-center gap-3">
          {blueprint.colors.slice(1).map((color, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedColorIdx(idx + 1)}
              className={cn(
                "w-12 h-12 rounded-full border-4 transition-all flex items-center justify-center",
                selectedColorIdx === idx + 1 ? cn("scale-110 shadow-md", theme.paletteActiveBorder) : "border-transparent opacity-80"
              )}
              style={{ backgroundColor: color }}
            >
              {selectedColorIdx === idx + 1 && <Check size={20} className="text-white drop-shadow-sm" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 p-4 mt-auto">
        <button
          disabled={isFinishing}
          onClick={() => {
            setPixels(new Array(totalCount).fill(0));
            setHistory([]);
            setPatternSelect(null);
            setIsPasteMode(false);
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

function getEditorTheme(rarity: Rarity) {
  switch (rarity) {
    case 'green':
      return {
        cardBorder: "border-green-200",
        titleText: "text-green-800",
        counterText: "text-green-700",
        counterBg: "bg-green-50",
        counterBorder: "border-green-100",
        guideBg: "bg-green-50/60",
        guideBorder: "border-green-100",
        hintText: "text-green-700/70",
        canvasBorder: "border-green-200",
        paletteBorder: "border-green-100",
        paletteActiveBorder: "border-green-400",
        selectionBorder: "border-green-500/80",
        pasteBtnActive: "bg-green-600 text-white border-green-700",
        clearBtn: "bg-white text-green-800 border-green-200",
      };
    case 'blue':
      return {
        cardBorder: "border-blue-200",
        titleText: "text-blue-800",
        counterText: "text-blue-700",
        counterBg: "bg-blue-50",
        counterBorder: "border-blue-100",
        guideBg: "bg-blue-50/60",
        guideBorder: "border-blue-100",
        hintText: "text-blue-700/70",
        canvasBorder: "border-blue-200",
        paletteBorder: "border-blue-100",
        paletteActiveBorder: "border-blue-400",
        selectionBorder: "border-blue-500/80",
        pasteBtnActive: "bg-blue-600 text-white border-blue-700",
        clearBtn: "bg-white text-blue-800 border-blue-200",
      };
    case 'purple':
      return {
        cardBorder: "border-purple-200",
        titleText: "text-purple-800",
        counterText: "text-purple-700",
        counterBg: "bg-purple-50",
        counterBorder: "border-purple-100",
        guideBg: "bg-purple-50/60",
        guideBorder: "border-purple-100",
        hintText: "text-purple-700/70",
        canvasBorder: "border-purple-200",
        paletteBorder: "border-purple-100",
        paletteActiveBorder: "border-purple-400",
        selectionBorder: "border-purple-500/80",
        pasteBtnActive: "bg-purple-600 text-white border-purple-700",
        clearBtn: "bg-white text-purple-800 border-purple-200",
      };
    case 'gold':
      return {
        cardBorder: "border-yellow-200",
        titleText: "text-yellow-800",
        counterText: "text-yellow-700",
        counterBg: "bg-yellow-50",
        counterBorder: "border-yellow-100",
        guideBg: "bg-yellow-50/60",
        guideBorder: "border-yellow-100",
        hintText: "text-yellow-700/70",
        canvasBorder: "border-yellow-200",
        paletteBorder: "border-yellow-100",
        paletteActiveBorder: "border-yellow-400",
        selectionBorder: "border-yellow-500/80",
        pasteBtnActive: "bg-yellow-500 text-white border-yellow-700",
        clearBtn: "bg-white text-yellow-800 border-yellow-200",
      };
    case 'red':
      return {
        cardBorder: "border-red-200",
        titleText: "text-red-800",
        counterText: "text-red-700",
        counterBg: "bg-red-50",
        counterBorder: "border-red-100",
        guideBg: "bg-red-50/60",
        guideBorder: "border-red-100",
        hintText: "text-red-700/70",
        canvasBorder: "border-red-200",
        paletteBorder: "border-red-100",
        paletteActiveBorder: "border-red-400",
        selectionBorder: "border-red-500/80",
        pasteBtnActive: "bg-red-600 text-white border-red-700",
        clearBtn: "bg-white text-red-800 border-red-200",
      };
  }
}
