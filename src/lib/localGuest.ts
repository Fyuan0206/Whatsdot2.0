import type { UserProfile, CompletedWork } from '../types';

const GUEST_KEY = 'whatsdot_guest_id';
const PROFILE_KEY = 'whatsdot_profile';
const WORKS_KEY = 'whatsdot_works';

function defaultProfile(): UserProfile {
  return {
    tokens: 1,
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
      const parsed = JSON.parse(raw) as UserProfile;
      const base = defaultProfile();
      const merged: UserProfile = { ...base, ...parsed };
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
