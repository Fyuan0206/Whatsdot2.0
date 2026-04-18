import type { PerfTier } from '../types';

const KEY = 'whatsdot_perf_tier';

export function loadPerfTier(): PerfTier | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
    return null;
  } catch {
    return null;
  }
}

export function savePerfTier(tier: PerfTier) {
  try {
    localStorage.setItem(KEY, tier);
  } catch {
    return;
  }
}

export function getDefaultPerfTier(): PerfTier {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low';
    const nav = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
    const mem = nav.deviceMemory ?? 8;
    const cores = nav.hardwareConcurrency ?? 8;
    if (mem <= 2 || cores <= 2) return 'low';
    if (mem <= 4 || cores <= 4) return 'medium';
    return 'high';
  } catch {
    return 'high';
  }
}

