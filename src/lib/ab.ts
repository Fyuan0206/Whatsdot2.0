type Variant = 'control' | 'variant';

const KEY = 'whatsdot_ab';

function hashToUnitInterval(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function getVariant(experimentKey: string, uid: string, split = 0.5): Variant {
  try {
    const raw = localStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, Variant>) : {};
    const k = `${experimentKey}:${uid}`;
    if (map[k]) return map[k];
    const v: Variant = hashToUnitInterval(k) < split ? 'variant' : 'control';
    map[k] = v;
    localStorage.setItem(KEY, JSON.stringify(map));
    return v;
  } catch {
    return hashToUnitInterval(`${experimentKey}:${uid}`) < split ? 'variant' : 'control';
  }
}

