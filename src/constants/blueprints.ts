import { Blueprint, GameBlueprint, Rarity, RARITY_CONFIG } from '../types';
import { KUROMI_PASTEL_PATTERN_32 } from './kuromiPastelGrid';
import { IP_GREEN_8 } from './ipPixelTemplates';

function createPattern(size: number, fill: (x: number, y: number) => number): number[] {
  const pattern: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      pattern.push(fill(x, y));
    }
  }
  return pattern;
}

/**
 * 将小图居中嵌入大方格。
 * @param maxEdgePad 限制「上/左」起算的外侧留白最多几格；不填则用对称居中（与原先一致）。
 *                   与裁剪后的底稿配合，可避免白边叠成很多行（需求：单侧留白不超过约 2 格）。
 */
function padPattern(
  pattern: number[],
  fromSize: number,
  toSize: number,
  bgColor: number,
  maxEdgePad?: number,
): number[] {
  const result: number[] = [];
  const slack = toSize - fromSize;
  const half = Math.floor(slack / 2);
  const offset = maxEdgePad !== undefined ? Math.min(maxEdgePad, half) : half;
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

/** 裁掉全 0 的边，避免底稿自带空行再与 pad 叠加成很厚的白边 */
function cropBoundingBox(flat: number[], side: number): { cells: number[]; side: number } {
  let minY = side;
  let maxY = -1;
  let minX = side;
  let maxX = -1;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (flat[y * side + x] !== 0) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }
  if (maxY < 0) return { cells: flat, side };
  const h = maxY - minY + 1;
  const w = maxX - minX + 1;
  const ns = Math.max(h, w);
  const cells = new Array(ns * ns).fill(0);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      cells[(y - minY) * ns + (x - minX)] = flat[y * side + x];
    }
  }
  return { cells, side: ns };
}

function ipCropped(seed: number): { cells: number[]; side: number } {
  return cropBoundingBox(IP_GREEN_8[seed], 8);
}

const NEI4: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** 最近邻放大：同一角色轮廓在各稀有度保持一致（参考 kuromi 网格思路） */
function upscaleNN(from: number[], fromSize: number, toSize: number): number[] {
  return createPattern(toSize, (x, y) => {
    const sx = Math.min(fromSize - 1, Math.floor((x + 0.5) * fromSize / toSize));
    const sy = Math.min(fromSize - 1, Math.floor((y + 0.5) * fromSize / toSize));
    return from[sy * fromSize + sx];
  });
}

function addOutlineLayer(
  arr: number[],
  size: number,
  outlineIdx: number,
  isBody: (v: number) => boolean,
): number[] {
  const out = [...arr];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (out[i] !== 0) continue;
      let touch = false;
      for (const [dx, dy] of NEI4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
        if (isBody(arr[ny * size + nx])) touch = true;
      }
      if (touch) out[i] = outlineIdx;
    }
  }
  return out;
}

/** 蓝档：放大 + 外沿高光（索引 3） */
function blueFromGreen8(seed: number): number[] {
  const { cells, side } = ipCropped(seed);
  const up = upscaleNN(cells, side, 12);
  const out = [...up];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const i = y * 12 + x;
      if (up[i] !== 0) continue;
      let adj = false;
      for (const [dx, dy] of NEI4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= 12 || ny < 0 || ny >= 12) continue;
        if (up[ny * 12 + nx] > 0) adj = true;
      }
      if (adj && (x * 13 + y * 7 + seed) % 3 !== 0) out[i] = 3;
    }
  }
  return out;
}

/** 紫档：8→24 + 七色层次 + 外轮廓 */
function purpleFromGreen8(seed: number): number[] {
  const { cells, side } = ipCropped(seed);
  const big = upscaleNN(cells, side, 24);
  let m: number[] = big.map((v) => {
    if (v === 0) return 0;
    if (v === 1) return 2;
    if (v === 2) return 3;
    return 5;
  });
  m = addOutlineLayer(m, 24, 6, (v) => v > 0);
  return m.map((v, i) => {
    if (v !== 2 && v !== 3) return v;
    if ((i * 17 + seed * 31) % 23 === 0) return 4;
    return v;
  });
}

/** 金档：8→24 + 六色金属感描边与高光点 */
function goldFromGreen8(seed: number): number[] {
  const { cells, side } = ipCropped(seed);
  let m: number[] = upscaleNN(cells, side, 24).map((v) => {
    if (v === 0) return 0;
    if (v === 1) return 2;
    if (v === 2) return 3;
    return 4;
  });
  m = addOutlineLayer(m, 24, 5, (v) => v > 0);
  return m.map((v, i) => {
    const x = i % 24;
    const y = Math.floor(i / 24);
    if (v === 3 && (x + y * 3 + seed) % 9 === 0) return 1;
    return v;
  });
}

/** 红档：8→32 + 七色 + 双描边感 + 外缘星屑 */
function redFromGreen8(seed: number): number[] {
  const { cells, side } = ipCropped(seed);
  let m: number[] = upscaleNN(cells, side, 32).map((v) => {
    if (v === 0) return 0;
    if (v === 1) return 2;
    if (v === 2) return 3;
    return 5;
  });
  m = addOutlineLayer(m, 32, 6, (v) => v > 0);
  const cx = 15 + (seed % 3);
  const cy = 15 + ((seed >> 1) % 3);
  return m.map((v, i) => {
    const x = i % 32;
    const y = Math.floor(i / 32);
    const d = Math.hypot(x - cx, y - cy);
    if (v === 0 && d > 11 && d < 15 && ((x ^ y) + seed) % 5 === 0) return 4;
    return v;
  });
}

type IpRow = {
  key: string;
  seed: number;
  g: string[];
  b: string[];
  p: string[];
  go: string[];
  r: string[];
  ng: string;
  nb: string;
  np: string;
  ngld: string;
  nr: string;
  loreGold: { loreTitle: string; loreText: string };
  loreRed: { loreTitle: string; loreText: string };
};

function makeIp(row: IpRow): GameBlueprint {
  const { key, seed } = row;
  const tight = ipCropped(seed);

  return {
    green: {
      id: `${key}_green`,
      name: row.ng,
      gridSize: 12,
      colors: row.g,
      pattern: padPattern(tight.cells, tight.side, 12, 0, 2),
      rarity: 'green',
    },
    blue: {
      id: `${key}_blue`,
      name: row.nb,
      gridSize: 12,
      colors: row.b,
      pattern: blueFromGreen8(seed),
      rarity: 'blue',
    },
    purple: {
      id: `${key}_purple`,
      name: row.np,
      gridSize: 24,
      colors: row.p,
      pattern: purpleFromGreen8(seed),
      rarity: 'purple',
    },
    gold: {
      id: `${key}_gold`,
      name: row.ngld,
      gridSize: 24,
      colors: row.go,
      limited: true,
      loreTitle: row.loreGold.loreTitle,
      loreText: row.loreGold.loreText,
      pattern: goldFromGreen8(seed),
      rarity: 'gold',
    },
    red: {
      id: `${key}_red`,
      name: row.nr,
      gridSize: 32,
      colors: row.r,
      limited: true,
      loreTitle: row.loreRed.loreTitle,
      loreText: row.loreRed.loreText,
      pattern: redFromGreen8(seed),
      rarity: 'red',
    },
  };
}

const IP_ROWS: IpRow[] = [
  {
    key: 'my_melody',
    seed: 0,
    g: ['#FFFFFF', '#FFB7C5', '#E91E63', '#FFCDD2'],
    b: ['#FFFFFF', '#F8BBD0', '#EC407A', '#FCE4EC'],
    p: ['#FFFFFF', '#FF4081', '#FF80AB', '#F50057', '#F8BBD0', '#EC407A', '#AD1457'],
    go: ['#FFFFFF', '#FFD1DC', '#FF69B4', '#FF1493', '#F8BBD0', '#C2185B'],
    r: ['#FFFFFF', '#FF1744', '#FF5252', '#FF8A80', '#C62828', '#880E4F', '#F48FB1'],
    ng: '小美乐蒂',
    nb: '甜心美乐蒂',
    np: '糖果美乐蒂',
    ngld: '星糖美乐蒂',
    nr: '究极美乐蒂',
    loreGold: { loreTitle: '草莓兜帽', loreText: '粉色兜帽里藏着一整颗温柔的梦。' },
    loreRed: { loreTitle: '甜心誓约', loreText: '拼完这一幅，连空气都会变甜。' },
  },
  {
    key: 'kuromi',
    seed: 1,
    g: ['#FFFFFF', '#1A1A1A', '#E91E8C', '#9C27B0'],
    b: ['#FFFFFF', '#4A148C', '#CE93D8', '#E1BEE7'],
    p: ['#FFFFFF', '#6A1B9A', '#AB47BC', '#E1BEE7', '#F48FB1', '#EC407A', '#4A148C'],
    go: ['#FFFFFF', '#D1C4E9', '#7E57C2', '#5E35B1', '#B39DDB', '#311B92'],
    r: ['#FFFFFF', '#D500F9', '#AA00FF', '#EA80FC', '#6A1B9A', '#4A148C', '#FF4081'],
    ng: '小库洛米',
    nb: '暗夜库洛米',
    np: '叛逆库洛米',
    ngld: '幻紫库洛米',
    nr: '究极库洛米',
    loreGold: { loreTitle: '小恶魔日记', loreText: '坏笑只是伪装，可爱才是本体。' },
    loreRed: { loreTitle: '叛逆加冕', loreText: '像素王座只为最酷的你预留。' },
  },
  {
    key: 'pom_pom_purin',
    seed: 2,
    g: ['#FFFFFF', '#F4D03F', '#8B6914', '#FFF9E6'],
    b: ['#FFFFFF', '#FFE082', '#FFB300', '#FFF8E1'],
    p: ['#FFFFFF', '#FFC107', '#FF8F00', '#FFE082', '#FFF8E1', '#8D6E63', '#5D4037'],
    go: ['#FFFFFF', '#FFD54F', '#FFA000', '#FF8F00', '#F57C00', '#E65100'],
    r: ['#FFFFFF', '#FF6F00', '#FF9100', '#FFB74D', '#E65100', '#BF360C', '#FFCA28'],
    ng: '小布丁狗',
    nb: '奶霜布丁狗',
    np: '焦糖布丁狗',
    ngld: '流心布丁狗',
    nr: '究极布丁狗',
    loreGold: { loreTitle: '贝雷帽约定', loreText: '摇摇晃晃的脚步，也能走到晴天。' },
    loreRed: { loreTitle: '布丁王座', loreText: '一口甜，一整天的勇气。' },
  },
  {
    key: 'pochacco',
    seed: 3,
    g: ['#FFFFFF', '#ECEFF1', '#43A047', '#212121'],
    b: ['#FFFFFF', '#A5D6A7', '#2E7D32', '#E8F5E9'],
    p: ['#FFFFFF', '#66BB6A', '#388E3C', '#A5D6A7', '#212121', '#424242', '#E0E0E0'],
    go: ['#FFFFFF', '#C8E6C9', '#66BB6A', '#43A047', '#2E7D32', '#1B5E20'],
    r: ['#FFFFFF', '#1B5E20', '#2E7D32', '#43A047', '#66BB6A', '#A5D6A7', '#FFEB3B'],
    ng: '小帕恰狗',
    nb: '疾风帕恰狗',
    np: '绿茵帕恰狗',
    ngld: '闪电帕恰狗',
    nr: '究极帕恰狗',
    loreGold: { loreTitle: '弹跳日记', loreText: '跑起来时，风会替你加油。' },
    loreRed: { loreTitle: '冲刺之心', loreText: '终点线前，从不缺席。' },
  },
  {
    key: 'little_twin_stars',
    seed: 4,
    g: ['#FFFFFF', '#FFB6C1', '#B3E5FC', '#FFF59D'],
    b: ['#FFFFFF', '#81D4FA', '#F48FB1', '#E1F5FE'],
    p: ['#FFFFFF', '#F48FB1', '#81D4FA', '#FFF59D', '#B39DDB', '#A5D6A7', '#FFCC80'],
    go: ['#FFFFFF', '#F8BBD0', '#B3E5FC', '#FFF9C4', '#E1BEE7', '#B2EBF2'],
    r: ['#FFFFFF', '#EC407A', '#42A5F5', '#FFEE58', '#AB47BC', '#26C6DA', '#FF7043'],
    ng: '小双子星',
    nb: '星云双子星',
    np: '彩虹双子星',
    ngld: '梦境双子星',
    nr: '究极双子星',
    loreGold: { loreTitle: '双星寄语', loreText: '一颗在左，一颗在右，夜空就不孤单。' },
    loreRed: { loreTitle: '星轨交汇', loreText: '当两颗星对齐，愿望会发光。' },
  },
  {
    key: 'cinnamoroll',
    seed: 5,
    g: ['#FFFFFF', '#81D4FA', '#E1F5FE', '#4FC3F7'],
    b: ['#FFFFFF', '#B3E5FC', '#29B6F6', '#E3F2FD'],
    p: ['#FFFFFF', '#4FC3F7', '#0288D1', '#B3E5FC', '#E1F5FE', '#0277BD', '#01579B'],
    go: ['#FFFFFF', '#E1F5FE', '#4FC3F7', '#039BE5', '#0277BD', '#01579B'],
    r: ['#FFFFFF', '#0277BD', '#0288D1', '#29B6F6', '#4FC3F7', '#81D4FA', '#E1F5FE'],
    ng: '小玉桂狗',
    nb: '浮云玉桂狗',
    np: '晴空玉桂狗',
    ngld: '云端玉桂狗',
    nr: '究极玉桂狗',
    loreGold: { loreTitle: '大耳朵风', loreText: '耳朵一扇，烦恼被吹得好远。' },
    loreRed: { loreTitle: '天空邮差', loreText: '把温柔寄给下一个晴天。' },
  },
  {
    key: 'gudetama',
    seed: 6,
    g: ['#FFFFFF', '#FFEB3B', '#FFA000', '#F5F5F5'],
    b: ['#FFFFFF', '#FFF59D', '#FBC02D', '#FFFDE7'],
    p: ['#FFFFFF', '#FFEB3B', '#F9A825', '#F57F17', '#FFF9C4', '#E0E0E0', '#9E9E9E'],
    go: ['#FFFFFF', '#FFF176', '#FFD54F', '#FFB300', '#FF8F00', '#F57C00'],
    r: ['#FFFFFF', '#F57F17', '#FB8C00', '#FFB300', '#FFCA28', '#FFF176', '#E65100'],
    ng: '小蛋黄哥',
    nb: '温泉蛋黄哥',
    np: '培根蛋黄哥',
    ngld: '流心蛋黄哥',
    nr: '究极蛋黄哥',
    loreGold: { loreTitle: '懒得有理', loreText: '躺平也是一种认真生活的姿势。' },
    loreRed: { loreTitle: '煎锅加冕', loreText: '熟了，但还是不想动。' },
  },
  {
    key: 'kirby',
    seed: 7,
    g: ['#FFFFFF', '#FF8DC3', '#FF4081', '#C2185B'],
    b: ['#FFFFFF', '#F48FB1', '#EC407A', '#FCE4EC'],
    p: ['#FFFFFF', '#FF4081', '#F50057', '#FF80AB', '#F8BBD0', '#EC407A', '#880E4F'],
    go: ['#FFFFFF', '#F8BBD0', '#FF4081', '#E91E63', '#C2185B', '#AD1457'],
    r: ['#FFFFFF', '#FF1744', '#F50057', '#FF4081', '#C51162', '#880E4F', '#FF80AB'],
    ng: '小卡比',
    nb: '吸入卡比',
    np: '彩虹卡比',
    ngld: '星星卡比',
    nr: '究极卡比',
    loreGold: { loreTitle: '粉色旋风', loreText: '圆滚滚的勇气，也能吞掉困难。' },
    loreRed: { loreTitle: '星之誓约', loreText: '跳起来那一刻，整个像素宇宙都亮了。' },
  },
  {
    key: 'doraemon',
    seed: 8,
    g: ['#FFFFFF', '#2196F3', '#E53935', '#FFEB3B'],
    b: ['#FFFFFF', '#42A5F5', '#EF5350', '#FFF59D'],
    p: ['#FFFFFF', '#1E88E5', '#E53935', '#FDD835', '#FFFFFF', '#1565C0', '#C62828'],
    go: ['#FFFFFF', '#64B5F6', '#2196F3', '#1976D2', '#E53935', '#FBC02D'],
    r: ['#FFFFFF', '#0D47A1', '#1565C0', '#1976D2', '#C62828', '#F9A825', '#FFEB3B'],
    ng: '小哆啦A梦',
    nb: '道具哆啦A梦',
    np: '任意门哆啦',
    ngld: '时光哆啦A梦',
    nr: '究极哆啦A梦',
    loreGold: { loreTitle: '四次元口袋', loreText: '口袋里装的不是道具，是可能性。' },
    loreRed: { loreTitle: '铜锣烧之约', loreText: '甜一点，再勇敢一点。' },
  },
  {
    key: 'pikachu',
    seed: 9,
    g: ['#FFFFFF', '#FFCA28', '#212121', '#E53935'],
    b: ['#FFFFFF', '#FFE082', '#424242', '#FFEB3B'],
    p: ['#FFFFFF', '#FFC107', '#212121', '#F44336', '#FFEE58', '#F9A825', '#5D4037'],
    go: ['#FFFFFF', '#FFEB3B', '#FBC02D', '#F9A825', '#F57F17', '#E65100'],
    r: ['#FFFFFF', '#F57F17', '#FB8C00', '#FFB300', '#212121', '#E53935', '#FFEB3B'],
    ng: '小皮卡丘',
    nb: '十万伏皮卡丘',
    np: '电光皮卡丘',
    ngld: '雷云皮卡丘',
    nr: '究极皮卡丘',
    loreGold: { loreTitle: '电气脸颊', loreText: '噼啪一声，坏心情全部短路。' },
    loreRed: { loreTitle: '雷霆加冕', loreText: '这一击，只为你的笑容充电。' },
  },
  {
    key: 'psyduck',
    seed: 10,
    g: ['#FFFFFF', '#FFEE58', '#81C784', '#5D4037'],
    b: ['#FFFFFF', '#FFF59D', '#66BB6A', '#8D6E63'],
    p: ['#FFFFFF', '#FFEB3B', '#43A047', '#6D4C41', '#A1887F', '#FFD54F', '#33691E'],
    go: ['#FFFFFF', '#FFF59D', '#FDD835', '#F9A825', '#F57F17', '#5D4037'],
    r: ['#FFFFFF', '#F9A825', '#FB8C00', '#FFCA28', '#33691E', '#5D4037', '#FFEE58'],
    ng: '小可达鸭',
    nb: '迷糊可达鸭',
    np: '头痛可达鸭',
    ngld: '念力可达鸭',
    nr: '究极可达鸭',
    loreGold: { loreTitle: '头痛灵感', loreText: '越想越想不通，越想越想拼。' },
    loreRed: { loreTitle: '混沌之王', loreText: '脑袋一片空白，手里却全是答案。' },
  },
  {
    key: 'linabell',
    seed: 11,
    g: ['#FFFFFF', '#F8BBD9', '#EC407A', '#CE93D8'],
    b: ['#FFFFFF', '#F48FB1', '#AB47BC', '#F3E5F5'],
    p: ['#FFFFFF', '#EC407A', '#BA68C8', '#F8BBD0', '#CE93D8', '#AD1457', '#6A1B9A'],
    go: ['#FFFFFF', '#F8BBD0', '#EC407A', '#AB47BC', '#E1BEE7', '#6A1B9A'],
    r: ['#FFFFFF', '#AD1457', '#C2185B', '#E91E63', '#AB47BC', '#6A1B9A', '#F8BBD0'],
    ng: '小玲娜贝儿',
    nb: '探险玲娜贝儿',
    np: '花环玲娜贝儿',
    ngld: '森林玲娜贝儿',
    nr: '究极玲娜贝儿',
    loreGold: { loreTitle: '狐狸尾巴尖', loreText: '轻轻一摆，故事就开了头。' },
    loreRed: { loreTitle: '达菲好友', loreText: '把好奇心别在耳朵上，出发。' },
  },
  {
    key: 'stellalou',
    seed: 12,
    g: ['#FFFFFF', '#CE93D8', '#AB47BC', '#E1BEE7'],
    b: ['#FFFFFF', '#E1BEE7', '#8E24AA', '#F3E5F5'],
    p: ['#FFFFFF', '#BA68C8', '#7B1FA2', '#E1BEE7', '#9575CD', '#512DA8', '#D1C4E9'],
    go: ['#FFFFFF', '#E1BEE7', '#BA68C8', '#9C27B0', '#7B1FA2', '#4A148C'],
    r: ['#FFFFFF', '#6A1B9A', '#8E24AA', '#AB47BC', '#CE93D8', '#E1BEE7', '#FFD54F'],
    ng: '小星黛露',
    nb: '芭蕾星黛露',
    np: '舞台星黛露',
    ngld: '月光星黛露',
    nr: '究极星黛露',
    loreGold: { loreTitle: '芭蕾足尖', loreText: '旋转时，连星星都放慢了。' },
    loreRed: { loreTitle: '紫罗兰谢幕', loreText: '最后一幕，留给最亮的你。' },
  },
  {
    key: 'gelatoni',
    seed: 13,
    g: ['#FFFFFF', '#66BB6A', '#2E7D32', '#A5D6A7'],
    b: ['#FFFFFF', '#A5D6A7', '#388E3C', '#E8F5E9'],
    p: ['#FFFFFF', '#43A047', '#1B5E20', '#81C784', '#C8E6C9', '#33691E', '#558B2F'],
    go: ['#FFFFFF', '#C8E6C9', '#66BB6A', '#43A047', '#2E7D32', '#1B5E20'],
    r: ['#FFFFFF', '#1B5E20', '#2E7D32', '#388E3C', '#66BB6A', '#A5D6A7', '#FFCA28'],
    ng: '小杰拉多尼',
    nb: '调色杰拉多尼',
    np: '画室杰拉多尼',
    ngld: '灵感杰拉多尼',
    nr: '究极杰拉多尼',
    loreGold: { loreTitle: '猫爪沾彩', loreText: '每一笔都是冒险的脚印。' },
    loreRed: { loreTitle: '画布之王', loreText: '留白处，留给下一次心动。' },
  },
  {
    key: 'cookieann',
    seed: 14,
    g: ['#FFFFFF', '#FFF176', '#FFB300', '#8D6E63'],
    b: ['#FFFFFF', '#FFE082', '#FFA000', '#FFF8E1'],
    p: ['#FFFFFF', '#FFCA28', '#F57C00', '#FFF59D', '#A1887F', '#6D4C41', '#FFEB3B'],
    go: ['#FFFFFF', '#FFEE58', '#FDD835', '#F9A825', '#FF8F00', '#E65100'],
    r: ['#FFFFFF', '#F57C00', '#FB8C00', '#FFB300', '#FFCA28', '#8D6E63', '#FFF176'],
    ng: '小可琦安',
    nb: '厨师可琦安',
    np: '甜点可琦安',
    ngld: '烤箱可琦安',
    nr: '究极可琦安',
    loreGold: { loreTitle: '厨师帽歪歪', loreText: '面粉飞扬，也是幸福的雪。' },
    loreRed: { loreTitle: '终极食谱', loreText: '秘密配料：再加一点点勇气。' },
  },
  {
    key: 'shelliemay',
    seed: 15,
    g: ['#FFFFFF', '#F48FB1', '#EC407A', '#FCE4EC'],
    b: ['#FFFFFF', '#F8BBD0', '#D81B60', '#FCE4EC'],
    p: ['#FFFFFF', '#EC407A', '#AD1457', '#F48FB1', '#F8BBD0', '#880E4F', '#F06292'],
    go: ['#FFFFFF', '#F8BBD0', '#F48FB1', '#EC407A', '#C2185B', '#880E4F'],
    r: ['#FFFFFF', '#880E4F', '#AD1457', '#C2185B', '#EC407A', '#F48FB1', '#FFCDD2'],
    ng: '小雪莉玫',
    nb: '蝴蝶结雪莉玫',
    np: '派对雪莉玫',
    ngld: '玫瑰雪莉玫',
    nr: '究极雪莉玫',
    loreGold: { loreTitle: '绒毛拥抱', loreText: '抱紧一点，冬天就会变短。' },
    loreRed: { loreTitle: '温柔加冕', loreText: '玫瑰色像素，只为你盛开。' },
  },
];

export const BLUEPRINTS: Record<string, GameBlueprint> = Object.fromEntries(
  IP_ROWS.map((row) => [row.key, makeIp(row)]),
) as Record<string, GameBlueprint>;

/** 独立皮肤蓝图（不在各 IP 五档家族表内，通过 id 参与编辑/展示） */
export const SKINS: Record<string, Blueprint> = {
  kuromi_pastel: {
    id: 'kuromi_pastel',
    name: '酷洛米甜酷版',
    gridSize: 32,
    colors: [
      '#FDF7FE',
      '#EDDCE8',
      '#6D5258',
      '#656766',
      '#945B6A',
      '#B38D98',
      '#CCA2AE',
      '#A97986',
      '#D8B8C9',
      '#793647',
      '#D2778F',
      '#8A3C51',
    ],
    limited: true,
    loreTitle: '甜酷出击',
    loreText: '黑灰小恶魔戴着粉色骷髅，举手的一瞬间，像在说：今天也要可爱地赢。',
    pattern: KUROMI_PASTEL_PATTERN_32,
    rarity: 'epic',
  },
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
  const skin = SKINS[blueprintId];
  if (skin) return skin;
  for (const family of Object.keys(BLUEPRINTS)) {
    const fam = BLUEPRINTS[family];
    for (const r of ['green', 'blue', 'purple', 'gold', 'red'] as const) {
      const bp = fam[r];
      if (bp.id === blueprintId) return bp;
    }
  }
  return null;
}
