import React, { useState } from 'react';
import { Blueprint, CompletedWork, RARITY_CONFIG } from '../types';
import { BLUEPRINTS } from '../constants/blueprints';
import { motion } from 'motion/react';
import { Warehouse as WarehouseIcon, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkDetailModal } from './WorkDetailModal';
import { getDefaultPerfTier, loadPerfTier } from '../lib/perf';

interface WarehouseProps {
  works: CompletedWork[];
  onBack: () => void;
}

const WAREHOUSE_LIMIT = 20;

const rarityBadgeColors: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gold: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
};

export default function Warehouse({ works, onBack }: WarehouseProps) {
  const warehouseWorks = works.slice(0, WAREHOUSE_LIMIT);
  const [selected, setSelected] = useState<null | { work: CompletedWork; blueprint: Blueprint }>(null);
  const perfTier = loadPerfTier() ?? getDefaultPerfTier();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-yellow-900 flex items-center gap-2">
            <WarehouseIcon size={24} className="text-yellow-600" />
            仓库
          </h2>
          <p className="text-yellow-700 text-sm">最多存放 {WAREHOUSE_LIMIT} 个拼豆</p>
        </div>
        <div className="px-3 py-1.5 bg-yellow-100 rounded-full border-2 border-yellow-300">
          <span className="font-bold text-yellow-800 text-sm">
            {warehouseWorks.length}/{WAREHOUSE_LIMIT}
          </span>
        </div>
      </div>

      {warehouseWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border-4 border-dashed border-yellow-100 gap-4">
          <Package size={64} className="text-yellow-200" />
          <div className="text-center">
            <p className="text-yellow-800 font-bold">仓库空空如也...</p>
            <p className="text-yellow-600 text-sm">去豆窖存放更多拼豆吧！</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {warehouseWorks.map((work: CompletedWork) => (
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
  const familyKey = Object.keys(BLUEPRINTS).find(k =>
    BLUEPRINTS[k][work.rarity]?.id === work.blueprintId
  );
  const blueprint = familyKey ? BLUEPRINTS[familyKey][work.rarity] : null;

  if (!blueprint) return null;

  const config = RARITY_CONFIG[work.rarity];

  return (
    <motion.button
      whileHover={{ y: -5 }}
      className="bg-white rounded-[2rem] p-4 shadow-md border-2 border-yellow-50 relative overflow-hidden group"
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
