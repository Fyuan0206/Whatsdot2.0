import React, { useMemo, useState } from 'react';
import { Blueprint, CompletedWork, RARITY_CONFIG } from '../types';
import { findBlueprintById } from '../constants/blueprints';
import { motion } from 'motion/react';
import { Heart, Package, Plus, Trash2, Warehouse } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkDetailModal } from './WorkDetailModal';
import { PERF_TIER } from '../lib/perf';

interface VaultProps {
  works: CompletedWork[];
  onDraw: () => void;
  onDeleteWork: (workId: string) => void;
  coins?: number;
  onRenameWork?: (workId: string, newName: string) => void;
  onToggleFavorite?: (workId: string) => void;
}

/** 与旧「仓库」一致：豆窖最多展示最近若干件 */
const VAULT_DISPLAY_LIMIT = 20;

const rarityBadgeColors: Record<string, string> = {
  green: 'bg-green-100 text-green-700 border-green-400',
  blue: 'bg-blue-100 text-blue-700 border-blue-400',
  purple: 'bg-purple-100 text-purple-700 border-purple-400',
  gold: 'bg-yellow-100 text-yellow-700 border-yellow-400',
  red: 'bg-red-100 text-red-700 border-red-400',
};

export default function Vault({ works, onDraw, onDeleteWork, coins = 0, onRenameWork, onToggleFavorite }: VaultProps) {
  const sorted = useMemo(
    () =>
      [...works].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [works],
  );
  const displayed = useMemo(
    () => sorted.slice(0, VAULT_DISPLAY_LIMIT),
    [sorted],
  );
  /** 不同图纸（blueprint）种数，与「件数」区分，避免多件同款时数字与直觉不符 */
  const uniqueBlueprintCount = useMemo(
    () => new Set(sorted.map((w) => w.blueprintId)).size,
    [sorted],
  );
  const [selected, setSelected] = useState<null | { work: CompletedWork; blueprint: Blueprint }>(null);
  const perfTier = PERF_TIER;

  const requestDeleteWork = (workId: string) => {
    if (!window.confirm('确定删除这件作品？删除后无法恢复。')) return;
    if (selected?.work.id === workId) setSelected(null);
    onDeleteWork(workId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-yellow-900 flex items-center gap-2">
            <Warehouse size={24} className="text-yellow-600 shrink-0" aria-hidden />
            我的豆窖
          </h2>
          {sorted.length > VAULT_DISPLAY_LIMIT && (
            <p className="text-[11px] text-yellow-600/90 mt-1">
              共 {sorted.length} 件，仅显示最近 {VAULT_DISPLAY_LIMIT} 件
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-yellow-100 rounded-full border-2 border-yellow-300 text-right leading-tight">
            <div className="font-bold text-yellow-800 text-sm tabular-nums">
              {uniqueBlueprintCount} 种图纸
            </div>
            <div className="text-[10px] font-bold text-yellow-700/90 tabular-nums">
              {Math.min(sorted.length, VAULT_DISPLAY_LIMIT)}/{VAULT_DISPLAY_LIMIT} 件
            </div>
          </div>
          <button
            type="button"
            onClick={onDraw}
            className="p-3 bg-yellow-400 text-yellow-900 rounded-2xl shadow-md border-b-4 border-yellow-600 active:scale-95 transition-transform"
            title="去开豆"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border-4 border-dashed border-yellow-100 gap-4">
          <Package size={64} className="text-yellow-200" />
          <div className="text-center">
            <p className="text-yellow-800 font-bold">空空如也...</p>
            <p className="text-yellow-600 text-sm">赶紧去抽个盲盒开开眼吧！</p>
          </div>
          <button
            onClick={onDraw}
            className="px-8 py-3 bg-yellow-400 text-yellow-900 font-black rounded-full shadow-lg border-b-4 border-yellow-600"
          >
            现在去开豆
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {displayed.map((work: CompletedWork) => (
            <WorkCard
              key={work.id}
              work={work}
              onOpen={(w, bp) => setSelected({ work: w, blueprint: bp })}
              onRequestDelete={requestDeleteWork}
              onToggleFavorite={onToggleFavorite}
            />
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
          onDelete={() => requestDeleteWork(selected.work.id)}
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

const WorkCard: React.FC<{
  work: CompletedWork;
  onOpen: (work: CompletedWork, blueprint: Blueprint) => void;
  onRequestDelete: (workId: string) => void;
  onToggleFavorite?: (workId: string) => void;
}> = ({ work, onOpen, onRequestDelete, onToggleFavorite }) => {
  const blueprint = findBlueprintById(work.blueprintId);

  if (!blueprint) return null;

  const config = RARITY_CONFIG[work.rarity];

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        "bg-white rounded-[2rem] shadow-md border-2 relative overflow-hidden group",
        work.favorite ? "border-red-200" : "border-yellow-50"
      )}
    >
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {onToggleFavorite && (
          <button
            type="button"
            className={cn(
              "p-2 rounded-xl bg-white/95 shadow-sm border active:scale-95 transition-all",
              work.favorite
                ? "border-red-200 text-red-500"
                : "border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-400"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(work.id);
            }}
            title={work.favorite ? '已在收藏夹 · 点击移出' : '加入收藏夹'}
            aria-label={work.favorite ? '从收藏夹移出' : '加入收藏夹'}
            aria-pressed={!!work.favorite}
          >
            <Heart size={16} className={cn(work.favorite && 'fill-red-500')} aria-hidden />
          </button>
        )}
      </div>
      <button
        type="button"
        className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-white/95 shadow-sm border border-red-100 text-red-600 hover:bg-red-50 active:scale-95 transition-transform"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete(work.id);
        }}
        title="删除作品"
        aria-label="删除作品"
      >
        <Trash2 size={16} aria-hidden />
      </button>
      <motion.button
        type="button"
        className="block w-full p-4 text-left rounded-[2rem]"
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
            "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 border",
            rarityBadgeColors[work.rarity]
          )}>
            {config.name}
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}
