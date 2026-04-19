import type { UserProfile, CompletedWork, Blueprint } from '../types';

const GUEST_KEY = 'whatsdot_guest_id';
const PROFILE_KEY = 'whatsdot_profile';
const WORKS_KEY = 'whatsdot_works';
const CUSTOM_BLUEPRINTS_KEY = 'whatsdot_custom_blueprints';
const CUSTOM_BLUEPRINTS_LIMIT = 50;

function defaultProfile(): UserProfile {
  return {
    /** 首次进入给 1 枚，保证新用户能马上开一次豆；后续靠每日签到或看广告补 */
    coins: 1,
    lastCheckIn: new Date().toISOString(),
    referralCount: 0,
    boxesOpened: 0,
    pityProgress: 0,
    perfTier: 'high',
    activeTitle: '',
    activeTitleExpiresAt: null,
  };
}

export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `guest_${Math.random().toString(36).slice(2)}`;
  }
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile> & { tokens?: number };
      const base = defaultProfile();
      const merged: UserProfile = { ...base, ...parsed };
      /** 一次性迁移：把旧的 tokens 计入 coins，然后丢弃 tokens 字段 */
      if (typeof parsed.tokens === 'number') {
        merged.coins = (parsed.coins ?? 0) + parsed.tokens;
        delete (merged as Partial<UserProfile> & { tokens?: number }).tokens;
      }
      if (merged.activeTitleExpiresAt) {
        const expiresAt = new Date(merged.activeTitleExpiresAt).getTime();
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          merged.activeTitle = '';
          merged.activeTitleExpiresAt = null;
        }
      }
      return merged;
    }
  } catch {
    /* ignore */
  }
  const p = defaultProfile();
  saveProfile(p);
  return p;
}

export function saveProfile(p: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function parseCreatedAt(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string') return new Date(v);
  if (v && typeof v === 'object' && 'toDate' in (v as { toDate?: () => Date })) {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function loadWorks(): CompletedWork[] {
  try {
    const raw = localStorage.getItem(WORKS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as CompletedWork[];
    return arr.map((w) => ({
      ...w,
      createdAt: parseCreatedAt(w.createdAt),
    }));
  } catch {
    return [];
  }
}

export function saveWorks(works: CompletedWork[]): void {
  try {
    const serializable = works.map((w) => ({
      ...w,
      createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : w.createdAt,
    }));
    localStorage.setItem(WORKS_KEY, JSON.stringify(serializable));
  } catch {
    /* ignore */
  }
}

export function loadCustomBlueprints(): Blueprint[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BLUEPRINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Blueprint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomBlueprint(bp: Blueprint): void {
  const existing = loadCustomBlueprints().filter((b) => b.id !== bp.id);
  const next = [bp, ...existing].slice(0, CUSTOM_BLUEPRINTS_LIMIT);
  try {
    localStorage.setItem(CUSTOM_BLUEPRINTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
