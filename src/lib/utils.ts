import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Blueprint, CompletedWork } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * UUID v4-style id. `crypto.randomUUID()` is unavailable on HTTP (non-secure contexts);
 * `getRandomValues` still works there in common browsers.
 */
export function createId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c?.randomUUID) {
    try {
      return c.randomUUID();
    } catch {
      /* fall through */
    }
  }
  if (c?.getRandomValues) {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6]! & 0x0f) | 0x40;
    b[8] = (b[8]! & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** DIY 自定义色可能被追加到色板之后，优先使用作品上存的完整色板。 */
export function getWorkPalette(
  work: Pick<CompletedWork, 'paletteColors'> | undefined | null,
  blueprint: Pick<Blueprint, 'colors'>,
): string[] {
  return work?.paletteColors ?? blueprint.colors;
}
