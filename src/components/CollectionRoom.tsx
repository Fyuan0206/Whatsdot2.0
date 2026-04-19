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
  coins?: number;
  onRenameWork?: (workId: string, newName: string) => void;
  onToggleFavorite?: (workId: string) => void;
}

const rarityBadgeColors: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gold: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  epic: 'bg-fuchsia-100 text-fuchsia-800',
};

export default function CollectionRoom({ works, onBack, coins = 0, onRenameWork, onToggleFavorite }: CollectionRoomProps) {
  const favoriteWorks = useMemo(
    () =>
      [...works]
        .filter((w) => w.favorite)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [works],
  );
  const [selected, setSelected] = useState<null | { work: CompletedWork; blueprint: Blueprint }>(null);
  const perfTier = PERF_TIER;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-red-700 flex items-center gap-2">
            <Heart size={24} className="text-red-500 fill-red-500" />
            收藏夹
          </h2>
        </div>
        <div className="px-3 py-1.5 bg-red-100 rounded-full border-2 border-red-300">
          <span className="font-bold text-red-700 text-sm">
            {favoriteWorks.length} 个
          </span>
        </div>
      </div>

      {favoriteWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border-4 border-dashed border-red-100 gap-4">
          <Heart size={64} className="text-red-200" />
          <div className="text-center">
            <p className="text-red-800 font-bold">收藏夹空空如也...</p>
          </div>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-red-400 text-white font-black rounded-full shadow-lg border-b-4 border-red-600"
          >
            去豆窖挑选
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {favoriteWorks.map((work: CompletedWork) => (
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
          coins={coins}
          onClose={() => setSelected(null)}
          onRename={
            onRenameWork
              ? (newName) => {
                  onRenameWork(selected.work.id, newName);
                  setSelected((prev) =>
                    prev ? { ...prev, work: { ...prev.work, customName: newName } } : prev,
                  );
                }
              : undefined
          }
          onToggleFavorite={
            onToggleFavorite
              ? () => {
                  onToggleFavorite(selected.work.id);
                  setSelected((prev) =>
                    prev ? { ...prev, work: { ...prev.work, favorite: !prev.work.favorite } } : prev,
                  );
                }
              : undefined
          }
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
              style={{ backgroundColor: (work.paletteColors ?? blueprint.colors)[p] }}
              className="w-full h-full"
            />
          ))}
        </div>
      </div>
      <div className="text-center">
        <h4 className="text-sm font-black text-gray-800 truncate">{work.customName || blueprint.name}</h4>
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
