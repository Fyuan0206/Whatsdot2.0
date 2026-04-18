import React from 'react';
import { Blueprint } from '../types';
import { cn } from '../lib/utils';

/** Read-only pixel grid — matches Editor canvas framing (gap, padding, empty-cell hint). */
export default function PixelWorkLayer({
  blueprint,
  pixelData,
  className,
  getCellStyle,
  getCellClassName,
}: {
  blueprint: Blueprint;
  pixelData: number[];
  className?: string;
  getCellStyle?: (index: number, colorIdx: number) => React.CSSProperties | undefined;
  getCellClassName?: (index: number, colorIdx: number) => string | undefined;
}) {
  return (
    <div
      className={cn(
        'w-full h-full grid gap-[1px] bg-gray-100 p-1 rounded-xl overflow-hidden',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
    >
      {pixelData.map((p, i) => (
        <div
          key={i}
          className={cn('w-full h-full relative transition-all duration-700', getCellClassName?.(i, p))}
          style={{
            backgroundColor: blueprint.colors[p],
            ...getCellStyle?.(i, p),
          }}
        >
          {p === 0 && (
            <div
              className="absolute inset-x-0 top-1/2 h-[1px] bg-gray-200/50 -rotate-45 pointer-events-none"
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}
