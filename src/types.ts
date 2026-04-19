export interface UserProfile {
  /** 豆币：游戏内统一货币，用于抽卡、重命名等消费行为。 */
  coins: number;
  lastCheckIn: string; // ISO String
  referralCount: number;
  boxesOpened?: number;
  pityProgress?: number;
  perfTier?: PerfTier;
  activeTitle?: string;
  activeTitleExpiresAt?: string | null;
}

/** 1 次抽卡的豆币成本。 */
export const COIN_DRAW_COST = 1;
/** 1 次重命名作品的豆币成本。 */
export const COIN_RENAME_COST = 1;

export type Rarity = 'green' | 'blue' | 'purple' | 'gold' | 'red' | 'epic';

export type PerfTier = 'low' | 'medium' | 'high';

export type LuckyCritReward =
  | { kind: 'coins'; amount: number }
  | { kind: 'title'; title: string; expiresAt: string };

export const RARITY_CONFIG: Record<Rarity, { name: string; probability: number; gridSize: number }> = {
  green: { name: 'Lv1：小透明豆', probability: 0.6, gridSize: 12 },
  blue: { name: 'Lv2：佛系豆', probability: 0.4, gridSize: 12 },
  purple: { name: 'Lv3：社牛豆', probability: 0.1, gridSize: 24 },
  gold: { name: 'Lv4：显眼豆', probability: 0.05, gridSize: 24 },
  red: { name: 'Lv5：卷王豆', probability: 0.01, gridSize: 32 },
  /** 特殊皮肤等，抽卡权重为 0，仅通过 id 或入口下发 */
  epic: { name: 'Lv6：史诗豆', probability: 0, gridSize: 32 },
};

export interface Blueprint {
  id: string;
  name: string;
  gridSize: number;
  colors: string[];
  pattern: number[];
  rarity: Rarity;
  limited?: boolean;
  loreTitle?: string;
  loreText?: string;
}

export interface GameBlueprint {
  green: Blueprint;
  blue: Blueprint;
  purple: Blueprint;
  gold: Blueprint;
  red: Blueprint;
}

export type IroningMethod = 'towel' | 'mirror';

export interface CompletedWork {
  id: string;
  uid: string;
  blueprintId: string;
  rarity: Rarity;
  pixelData: number[];
  history?: { i: number; c: number }[];
  ironingMethod?: IroningMethod;
  ironingScore?: number;
  createdAt: any;
  keyword?: string;
  paletteColors?: string[];
  /** 用户花豆币改的作品名；为空时回退 blueprint.name。 */
  customName?: string;
  /** 是否收藏：收藏的作品进入收藏夹，且豆窖不会因 20 件上限将其挤出。 */
  favorite?: boolean;
}

export type GameView = 'home' | 'editor' | 'ironing' | 'preview' | 'vault' | 'collection' | 'coins';
