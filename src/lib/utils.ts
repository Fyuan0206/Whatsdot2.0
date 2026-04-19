import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Blueprint, CompletedWork } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
