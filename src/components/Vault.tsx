import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { CompletedWork } from '../types';
import { BLUEPRINTS } from '../constants/blueprints';
import { motion } from 'motion/react';
import { Package, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface VaultProps {
  onDraw: () => void;
}

export default function Vault({ onDraw }: VaultProps) {
  const [works, setWorks] = useState<CompletedWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'works'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompletedWork));
      setWorks(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-yellow-900">我的豆窖</h2>
          <p className="text-yellow-700 text-sm">这些都是你的像素神作！</p>
        </div>
        <button
          onClick={onDraw}
          className="p-3 bg-yellow-400 text-yellow-900 rounded-2xl shadow-md border-b-4 border-yellow-600 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : works.length === 0 ? (
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
          {works.map((work: CompletedWork) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}

const WorkCard: React.FC<{ work: CompletedWork }> = ({ work }) => {
  const familyKey = Object.keys(BLUEPRINTS).find(k => 
    BLUEPRINTS[k].basic.id === work.blueprintId || BLUEPRINTS[k].rare.id === work.blueprintId
  );
  const blueprint = familyKey ? (work.isRare ? BLUEPRINTS[familyKey].rare : BLUEPRINTS[familyKey].basic) : null;

  if (!blueprint) return null;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-[2rem] p-4 shadow-md border-2 border-yellow-50 relative overflow-hidden group"
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
          work.isRare ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
        )}>
          {work.isRare ? '稀有' : '基础'}
        </span>
      </div>
    </motion.div>
  );
}
