/** HSL（色相 0–360，饱和度/明度 0–100）→ #RRGGBB */
export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;

  if (ss === 0) {
    const v = Math.round(ll * 255);
    const x = v.toString(16).padStart(2, '0');
    return `#${x}${x}${x}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hr = hh / 360;

  const r = hue2rgb(p, q, hr + 1 / 3);
  const g = hue2rgb(p, q, hr);
  const b = hue2rgb(p, q, hr - 1 / 3);

  const to = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n * 255)))
      .toString(16)
      .padStart(2, '0');

  return `#${to(r)}${to(g)}${to(b)}`;
}
