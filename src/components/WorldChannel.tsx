import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BLUEPRINTS, findBlueprintById } from '../constants/blueprints';
import { BlueprintIcon } from './BlueprintIcon';

function pickRandomMock(): { text: string; blueprintId: string } {
  const familyKeys = Object.keys(BLUEPRINTS);
  const fk = familyKeys[Math.floor(Math.random() * familyKeys.length)];
  const gb = BLUEPRINTS[fk];
  const rarities = (['green', 'blue', 'purple', 'gold', 'red'] as const).filter((r) => gb[r]);
  const r = rarities[Math.floor(Math.random() * rarities.length)];
  const bp = gb[r];
  const label = `玩家${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  return { text: `恭喜 ${label} 抽到了【${bp.name}】`, blueprintId: bp.id };
}

export function WorldChannel() {
  const [mock, setMock] = useState(() => pickRandomMock());
  const [marqueeKey, setMarqueeKey] = useState(0);
  const bp = useMemo(() => findBlueprintById(mock.blueprintId), [mock.blueprintId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMock(pickRandomMock());
      setMarqueeKey((k) => k + 1);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="w-full rounded-2xl border-2 border-yellow-100 bg-white shadow-sm px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-yellow-100 bg-gradient-to-b from-yellow-50 to-white px-2 py-2">
          {bp ? (
            <BlueprintIcon blueprint={bp} sizePx={28} cells={10} flash className="border border-yellow-200 shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-md bg-yellow-100 border border-yellow-200 shrink-0" />
          )}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="relative overflow-hidden whitespace-nowrap h-5">
              <motion.div
                key={marqueeKey}
                initial={{ x: '100%' }}
                animate={{ x: '-100%' }}
                transition={{ duration: 8, ease: 'linear' }}
                className="inline-block text-xs font-black text-yellow-900"
              >
                {mock.text}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
