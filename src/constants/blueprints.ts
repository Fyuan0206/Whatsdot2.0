import { Blueprint, GameBlueprint, Rarity, RARITY_CONFIG } from '../types';

function createPattern(size: number, fill: (x: number, y: number) => number): number[] {
  const pattern: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      pattern.push(fill(x, y));
    }
  }
  return pattern;
}

function padPattern(pattern: number[], fromSize: number, toSize: number, bgColor: number): number[] {
  const result: number[] = [];
  const offset = Math.floor((toSize - fromSize) / 2);
  for (let y = 0; y < toSize; y++) {
    for (let x = 0; x < toSize; x++) {
      if (x >= offset && x < offset + fromSize && y >= offset && y < offset + fromSize) {
        result.push(pattern[(y - offset) * fromSize + (x - offset)]);
      } else {
        result.push(bgColor);
      }
    }
  }
  return result;
}

function createSquarePattern(size: number, centerColor: number, edgeColor: number, bgColor: number = 0): number[] {
  return createPattern(size, (x, y) => {
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    const dist = Math.abs(x - cx) + Math.abs(y - cy);
    if (dist === 0) return centerColor;
    if (dist <= 2) return edgeColor;
    return bgColor;
  });
}

export const BLUEPRINTS: Record<string, GameBlueprint> = {
  strawberry: {
    green: {
      id: 'strawberry_green',
      name: '小草莓',
      gridSize: 12,
      colors: ['#FFFFFF', '#FF4D4D', '#2ECC71', '#F1C40F'],
      pattern: padPattern([
        0,0,2,2,0,0,0,0,
        0,2,2,2,2,0,0,0,
        0,0,1,1,1,0,0,0,
        0,1,1,1,1,1,0,0,
        0,1,3,1,1,1,0,0,
        0,1,1,1,1,1,0,0,
        0,0,1,1,1,0,0,0,
        0,0,0,0,0,0,0,0
      ], 8, 12, 0),
      rarity: 'green'
    },
    blue: {
      id: 'strawberry_blue',
      name: '冰霜草莓',
      gridSize: 12,
      colors: ['#FFFFFF', '#74B9FF', '#A29BFE', '#DFE6E9'],
      pattern: createPattern(12, (x, y) => {
        const cx = 5, cy = 5;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < 4) return 1;
        if (dx * dx + dy * dy < 16) return 2;
        if (dx * dx + dy * dy < 36) return 3;
        return 0;
      }),
      rarity: 'blue'
    },
    purple: {
      id: 'strawberry_purple',
      name: '彩虹草莓',
      gridSize: 24,
      colors: ['#FFFFFF', '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082'],
      pattern: padPattern([
        0,0,0,4,4,0,0,0,0,0,
        0,0,4,4,4,4,0,0,0,0,
        0,0,0,1,1,1,0,0,0,0,
        0,0,1,1,2,2,2,0,0,0,
        0,1,1,2,2,3,3,3,0,0,
        0,1,1,2,2,3,3,3,0,0,
        0,0,5,5,5,6,6,6,0,0,
        0,0,5,5,5,6,6,6,0,0,
        0,0,0,1,1,1,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0
      ], 10, 24, 0),
      rarity: 'purple'
    },
    gold: {
      id: 'strawberry_gold',
      name: '钻石草莓',
      gridSize: 24,
      colors: ['#FFFFFF', '#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#9370DB'],
      limited: true,
      loreTitle: '糖果星尘',
      loreText: '传说在像素宇宙的果园里，只有被星尘吻过的草莓才会在夜里发光。',
      pattern: createPattern(24, (x, y) => {
        const cx = 11, cy = 11;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) return 1;
        if (dist < 6) return 2;
        if (dist < 9) return 3;
        if (dist < 11) return 4;
        return 0;
      }),
      rarity: 'gold'
    },
    red: {
      id: 'strawberry_red',
      name: '究极草莓王',
      gridSize: 32,
      colors: ['#FFFFFF', '#FF0000', '#FF4444', '#FF6666', '#CC0000', '#880000', '#FF0088'],
      limited: true,
      loreTitle: '果王降临',
      loreText: '每一颗像素都在咆哮：把它拼出来，你就能召唤红色的好运。',
      pattern: createPattern(32, (x, y) => {
        const cx = 15, cy = 15;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) return 1;
        if (dist < 7) return 2;
        if (dist < 10) return 3;
        if (dist < 13) return 4;
        return 0;
      }),
      rarity: 'red'
    }
  },
  dino: {
    green: {
      id: 'dino_green',
      name: '小恐龙',
      gridSize: 12,
      colors: ['#FFFFFF', '#27AE60', '#F1C40F', '#34495E'],
      pattern: padPattern([
        0,0,1,1,1,1,0,0,
        0,1,1,3,1,1,1,0,
        0,1,1,1,1,0,0,0,
        0,1,1,1,1,1,0,0,
        0,0,1,1,1,2,0,0,
        0,0,1,1,1,2,0,0,
        0,0,1,0,1,0,0,0,
        0,0,0,0,0,0,0,0
      ], 8, 12, 0),
      rarity: 'green'
    },
    blue: {
      id: 'dino_blue',
      name: '冰晶恐龙',
      gridSize: 12,
      colors: ['#FFFFFF', '#3498DB', '#85C1E9', '#AED6F1'],
      pattern: createPattern(12, (x, y) => {
        const cx = 5, cy = 6;
        const dx = x - cx, dy = y - cy;
        if (y > 8 && x >= 4 && x <= 6) return 1;
        if (dy * 2 > dx + 6 && dy * 2 > -dx + 6) return 2;
        if (dy * 2 > dx + 3 && dy * 2 > -dx + 3) return 1;
        return 0;
      }),
      rarity: 'blue'
    },
    purple: {
      id: 'dino_purple',
      name: '机甲恐龙',
      gridSize: 24,
      colors: ['#FFFFFF', '#2ECC71', '#3498DB', '#E74C3C', '#F1C40F', '#9B59B6', '#34495E'],
      pattern: padPattern([
        0,0,0,0,1,1,1,1,0,0,0,0,
        0,0,0,1,1,1,1,1,1,0,0,0,
        0,0,1,1,6,1,1,1,1,1,0,0,
        0,0,1,1,1,1,1,1,1,0,0,0,
        0,2,2,1,1,4,4,1,1,1,0,0,
        0,2,2,1,1,4,4,1,1,1,1,0,
        0,1,1,1,1,1,1,1,1,1,1,0,
        0,0,3,3,3,3,3,3,3,3,0,0,
        0,0,1,1,1,1,1,1,1,0,0,0,
        0,0,1,0,0,1,0,0,1,0,0,0,
        0,1,1,0,1,1,0,1,1,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0
      ], 12, 24, 0),
      rarity: 'purple'
    },
    gold: {
      id: 'dino_gold',
      name: '黄金暴龙',
      gridSize: 24,
      colors: ['#FFFFFF', '#F1C40F', '#D4AC0D', '#B7950B', '#9A7D0A', '#7D6608'],
      limited: true,
      loreTitle: '金甲咆哮',
      loreText: '它的鳞片不是金属，是被时间打磨出来的荣耀。',
      pattern: createPattern(24, (x, y) => {
        const cx = 12, cy = 12;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (x >= 8 && x <= 16 && y >= 10 && y <= 14) return 1;
        if (y === 15 && x >= 6 && x <= 18) return 2;
        if (dist < 5) return 3;
        if (dist < 8) return 4;
        if (y === 16 && x >= 10 && x <= 14) return 5;
        return 0;
      }),
      rarity: 'gold'
    },
    red: {
      id: 'dino_red',
      name: '究极恐龙帝',
      gridSize: 32,
      colors: ['#FFFFFF', '#E74C3C', '#C0392B', '#922B21', '#641E16', '#FF6B6B', '#FF0000'],
      limited: true,
      loreTitle: '帝王之息',
      loreText: '只要你敢下第一颗豆，它就会在你手心里醒来。',
      pattern: createPattern(32, (x, y) => {
        const cx = 15, cy = 14;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (x >= 9 && x <= 21 && y >= 11 && y <= 18) return 1;
        if (y === 19 && x >= 7 && x <= 23) return 2;
        if (dist < 5) return 3;
        if (dist < 9) return 4;
        if (dist < 12) return 5;
        if (y === 20 && x >= 12 && x <= 18) return 6;
        return 0;
      }),
      rarity: 'red'
    }
  },
  unicorn: {
    green: {
      id: 'unicorn_green',
      name: '独角兽',
      gridSize: 12,
      colors: ['#FFFFFF', '#ECF0F1', '#E84393', '#FDCB6E'],
      pattern: padPattern([
        0,0,0,3,0,0,0,0,
        0,0,1,1,1,0,0,0,
        0,1,1,1,1,1,0,0,
        1,1,1,1,2,1,1,0,
        0,1,1,1,1,1,0,0,
        0,0,2,2,2,0,0,0,
        0,0,1,0,1,0,0,0,
        0,0,0,0,0,0,0,0
      ], 8, 12, 0),
      rarity: 'green'
    },
    blue: {
      id: 'unicorn_blue',
      name: '星空独角兽',
      gridSize: 12,
      colors: ['#FFFFFF', '#A29BFE', '#81ECEC', '#74B9FF'],
      pattern: createPattern(12, (x, y) => {
        const cx = 5, cy = 6;
        const dx = x - cx, dy = y - cy;
        if (x === 5 && y < 4) return 1;
        if (dx * dx + (y - 7) * (y - 7) < 9) return 2;
        if (dx * dx + (y - 7) * (y - 7) < 25) return 3;
        return 0;
      }),
      rarity: 'blue'
    },
    purple: {
      id: 'unicorn_purple',
      name: '彩虹独角兽',
      gridSize: 24,
      colors: ['#FFFFFF', '#FD79A8', '#A29BFE', '#81ECEC', '#55E6C1', '#F9CA24', '#F0932B'],
      pattern: padPattern([
        0,0,0,0,0,5,0,0,0,0,0,0,
        0,0,0,0,1,1,1,0,0,0,0,0,
        0,0,0,1,1,1,1,1,0,0,0,0,
        0,0,1,1,1,1,1,1,1,0,0,0,
        0,1,1,1,1,1,1,1,1,1,0,0,
        0,2,2,2,1,1,1,3,3,3,0,0,
        0,0,1,1,1,1,1,1,1,0,0,0,
        0,4,4,4,4,4,4,4,4,4,0,0,
        0,0,1,1,1,1,1,1,1,0,0,0,
        0,0,6,6,6,6,6,6,6,0,0,0,
        0,0,1,0,0,1,0,0,1,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0
      ], 12, 24, 0),
      rarity: 'purple'
    },
    gold: {
      id: 'unicorn_gold',
      name: '黄金独角兽',
      gridSize: 24,
      colors: ['#FFFFFF', '#F1C40F', '#FFD700', '#FFA500', '#FF69B4', '#00CED1'],
      limited: true,
      loreTitle: '日冕之角',
      loreText: '传说它的独角能把愿望变成真实的像素。',
      pattern: createPattern(24, (x, y) => {
        const cx = 12, cy = 10;
        const dx = x - cx, dy = y - cy;
        if (x === 12 && y < 4) return 1;
        if (dx * dx + (y - 10) * (y - 10) < 16) return 2;
        if (dx * dx + (y - 10) * (y - 10) < 49) return 3;
        if (dx * dx + (y - 12) * (y - 12) < 64) return 4;
        if (y >= 16 && y <= 20 && x >= 8 && x <= 16) return 5;
        return 0;
      }),
      rarity: 'gold'
    },
    red: {
      id: 'unicorn_red',
      name: '究极独角尊',
      gridSize: 32,
      colors: ['#FFFFFF', '#FF0000', '#FF4444', '#FF6666', '#CC0000', '#880000', '#FFD700'],
      limited: true,
      loreTitle: '赤焰誓约',
      loreText: '当红色的光穿过独角，所有平淡都会被点燃。',
      pattern: createPattern(32, (x, y) => {
        const cx = 15, cy = 12;
        const dx = x - cx, dy = y - cy;
        if (x === 15 && y < 5) return 6;
        const dist = Math.sqrt(dx * dx + (y - 12) * (y - 12));
        if (dist < 4) return 1;
        if (dist < 8) return 2;
        if (dist < 12) return 3;
        if (y >= 20 && y <= 25 && x >= 9 && x <= 22) return 4;
        return 0;
      }),
      rarity: 'red'
    }
  }
};

export function getRandomRarity(): Rarity {
  const weights: Array<[Rarity, number]> = [
    ['green', RARITY_CONFIG.green.probability],
    ['blue', RARITY_CONFIG.blue.probability],
    ['purple', RARITY_CONFIG.purple.probability],
    ['gold', RARITY_CONFIG.gold.probability],
    ['red', RARITY_CONFIG.red.probability],
  ];

  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  const roll = Math.random() * total;
  let cursor = 0;
  for (const [rarity, w] of weights) {
    cursor += w;
    if (roll < cursor) return rarity;
  }
  return 'green';
}

export function getBlueprintByRarity(family: string, rarity: Rarity): GameBlueprint[keyof GameBlueprint] | null {
  const familyBlueprints = BLUEPRINTS[family];
  if (!familyBlueprints) return null;
  return familyBlueprints[rarity];
}

export function findBlueprintById(blueprintId: string): Blueprint | null {
  for (const family of Object.keys(BLUEPRINTS)) {
    const fam = BLUEPRINTS[family];
    for (const r of ['green', 'blue', 'purple', 'gold', 'red'] as const) {
      const bp = fam[r];
      if (bp.id === blueprintId) return bp;
    }
  }
  return null;
}
