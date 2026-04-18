import React, { useMemo, useState } from 'react';
import { Blueprint, CompletedWork, RARITY_CONFIG } from '../types';
import { findBlueprintById } from '../constants/blueprints';
import { motion } from 'motion/react';
import { Heart, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkDetailModal } from './WorkDetailModal';
import { PERF_TIER } from '../lib/perf';

interface CollectionRoomProps {
  works: CompletedWork[];
  onBack: () => void;
}

function isRedColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r > 200 && r >= g && r >= b && g < 100 && b < 100;
}

function workHasRedPixels(work: CompletedWork, blueprint: { colors: string[] }): boolean {
  const pixelIndices = new Set(work.pixelData);
  for (const idx of pixelIndices) {
    if (idx > 0 && idx < blueprint.colors.length) {
      const color = blueprint.colors[idx];
      if (isRedColor(color)) {
        return true;
      }
    }
  }
  return false;
}

const rarityBadgeColors: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gold: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  epic: 'bg-fuchsia-100 text-fuchsia-800',
};

export default function CollectionRoom({ works, onBack }: CollectionRoomProps) {
  const redWorks = useMemo(() => {
    return works.filter(work => {
      const blueprint = findBlueprintById(work.blueprintId);
      if (!blueprint) return false;
      return workHasRedPixels(work, blueprint);
    });
  }, [works]);
  const [selected, setSelected] = useState<null | { work: CompletedWork; blueprint: Blueprint }>(null);
  const perfTier = PERF_TIER;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-red-700 flex items-center gap-2">
            <Heart size={24} className="text-red-500 fill-red-500" />
            收藏室
          </h2>
          <p className="text-red-600 text-sm">只展示红色的拼豆</p>
        </div>
        <div className="px-3 py-1.5 bg-red-100 rounded-full border-2 border-red-300">
          <span className="font-bold text-red-700 text-sm">
            {redWorks.length} 个
          </span>
        </div>
      </div>

      {redWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border-4 border-dashed border-red-100 gap-4">
          <Heart size={64} className="text-red-200" />
          <div className="text-center">
            <p className="text-red-800 font-bold">收藏室空空如也...</p>
            <p className="text-red-600 text-sm">收集更多红色拼豆来填满这里吧！</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {redWorks.map((work: CompletedWork) => (
            <WorkCard key={work.id} work={work} onOpen={(w, bp) => setSelected({ work: w, blueprint: bp })} />
          ))}
        </div>
      )}

      {selected && (
        <WorkDetailModal
          open={true}
          work={selected.work}
          blueprint={selected.blueprint}
          perfTier={perfTier}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

const WorkCard: React.FC<{ work: CompletedWork; onOpen: (work: CompletedWork, blueprint: Blueprint) => void }> = ({ work, onOpen }) => {
  const blueprint = findBlueprintById(work.blueprintId);

  if (!blueprint) return null;

  const config = RARITY_CONFIG[work.rarity];

  return (
    <motion.button
      whileHover={{ y: -5 }}
      className="bg-white rounded-[2rem] p-4 shadow-md border-2 border-red-100 relative overflow-hidden group"
      onClick={() => onOpen(work, blueprint)}
    >
      <div className="aspect-square w-full mb-3 rounded-2xl bg-gray-50 flex items-center justify-center p-4">
        <div
          className="grid gap-[0.5px] w-full h-full"
          style={{ gridTemplateColumns: `repeat(${blueprint.gridSize}, 1fr)` }}
        >
          {work.pixelData.map((p, i) => (
            <div
              key={i}
              style={{ backgroundColor: blueprint.colors[p] }}
              className="w-full h-full"
            />
          ))}
        </div>
      </div>
      <div className="text-center">
        <h4 className="text-sm font-black text-gray-800 truncate">{blueprint.name}</h4>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1",
          rarityBadgeColors[work.rarity]
        )}>
          {config.name}
        </span>
      </div>
    </motion.button>
  );
}
