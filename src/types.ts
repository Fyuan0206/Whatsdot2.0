export interface UserProfile {
  tokens: number;
  lastCheckIn: string; // ISO String
  referralCount: number;
  boxesOpened?: number;
  pityProgress?: number;
  perfTier?: PerfTier;
  activeTitle?: string;
  activeTitleExpiresAt?: string | null;
}

export type Rarity = 'green' | 'blue' | 'purple' | 'gold' | 'red' | 'epic';

export type PerfTier = 'low' | 'medium' | 'high';

export type LuckyCritReward =
  | { kind: 'tokens'; amount: number }
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
}

export type GameView = 'home' | 'editor' | 'ironing' | 'preview' | 'vault' | 'collection';
