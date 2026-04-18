export interface UserProfile {
  tokens: number;
  lastCheckIn: string; // ISO String
  referralCount: number;
}

export interface Blueprint {
  id: string;
  name: string;
  gridSize: number;
  colors: string[]; // Hex codes
  pattern: number[]; // Color indices
}

export interface GameBlueprint {
  basic: Blueprint;
  rare: Blueprint;
}

export interface CompletedWork {
  id: string;
  uid: string;
  blueprintId: string;
  isRare: boolean;
  pixelData: number[];
  createdAt: any;
}

export type GameView = 'home' | 'editor' | 'ironing' | 'preview' | 'vault';
