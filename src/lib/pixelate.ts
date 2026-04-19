/**
 * 浏览器端 pixelate：与 tools/pixelate.py 的算法一致。
 * 中心裁方 → 饱和增强 → 降采样到 N×N → 前景 mask → LAB 空间 k-means → 按亮度排序导出。
 * 不做背景抠除（没有 rembg 等价方案）；透明 PNG 的 alpha 会被当作前景 mask。
 */

export interface PixelateOptions {
  /** 目标网格大小。允许 16 / 24 / 32 / 48 / 60 / 72。 */
  gridSize: number;
  /** 色号数（含背景白），6–20。 */
  colorCount: number;
  /** 饱和度增强，默认 1.3。 */
  saturation: number;
  /** alpha 前景阈值，默认 0.5。 */
  alphaThreshold: number;
}

export interface PixelateResult {
  gridSize: number;
  /** 长度 = gridSize*gridSize；0 = 背景空格，其余 ∈ [1, colors.length-1]。 */
  pattern: number[];
  /** colors[0] 固定 '#FFFFFF'；后面是 k-means 得到的主色，按亮度从暗到亮排序。 */
  colors: string[];
}

export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** 中心裁方到 targetPx（默认 min(w,h)），返回包含裁后图像的 canvas。 */
export function centerCropSquareToCanvas(img: HTMLImageElement, targetPx?: number): HTMLCanvasElement {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = Math.floor((img.naturalWidth - side) / 2);
  const sy = Math.floor((img.naturalHeight - side) / 2);
  const out = targetPx ?? side;
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
  return canvas;
}

function applySaturation(data: Uint8ClampedArray, saturation: number) {
  if (Math.abs(saturation - 1) < 1e-6) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    data[i] = clamp255(luma + saturation * (r - luma));
    data[i + 1] = clamp255(luma + saturation * (g - luma));
    data[i + 2] = clamp255(luma + saturation * (b - luma));
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
}

/** 把 RGB (0–255) 批量转 LAB；返回 Float32Array 每 3 个一组 L a b。 */
function rgbArrayToLab(rgb: Float32Array): Float32Array {
  const out = new Float32Array(rgb.length);
  // D65 白点
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  for (let i = 0; i < rgb.length; i += 3) {
    const r = srgbToLinear(rgb[i]);
    const g = srgbToLinear(rgb[i + 1]);
    const b = srgbToLinear(rgb[i + 2]);
    const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / Xn;
    const y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / Yn;
    const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / Zn;
    const fx = labF(x);
    const fy = labF(y);
    const fz = labF(z);
    out[i] = 116 * fy - 16;
    out[i + 1] = 500 * (fx - fy);
    out[i + 2] = 200 * (fy - fz);
  }
  return out;
}

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(Math.max(t, 1e-12)) : 7.787 * t + 16 / 116;
}

/** LAB 空间 k-means++（种子固定，可重复结果）。返回 centroids（RGB，已去量化回来）与每个前景点的 label。 */
function kmeansLab(
  rgbFlat: Float32Array,
  k: number,
  maxIters = 50,
): { centroidsRgb: Float32Array; labels: Int32Array } {
  const n = rgbFlat.length / 3;
  if (n === 0) {
    return { centroidsRgb: new Float32Array(0), labels: new Int32Array(0) };
  }
  if (n <= k) {
    // 不够分，每个点单独一簇
    const labels = new Int32Array(n);
    for (let i = 0; i < n; i++) labels[i] = i;
    return { centroidsRgb: rgbFlat.slice(0, n * 3), labels };
  }
  const labFlat = rgbArrayToLab(rgbFlat);

  // 伪随机（线性同余，固定种子以复现）
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // k-means++ 初始化
  const centroidLab = new Float32Array(k * 3);
  {
    const first = Math.floor(rand() * n);
    centroidLab[0] = labFlat[first * 3];
    centroidLab[1] = labFlat[first * 3 + 1];
    centroidLab[2] = labFlat[first * 3 + 2];
    const dist = new Float32Array(n);
    for (let m = 1; m < k; m++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        let best = Infinity;
        for (let c = 0; c < m; c++) {
          const dL = labFlat[i * 3] - centroidLab[c * 3];
          const da = labFlat[i * 3 + 1] - centroidLab[c * 3 + 1];
          const db = labFlat[i * 3 + 2] - centroidLab[c * 3 + 2];
          const d = dL * dL + da * da + db * db;
          if (d < best) best = d;
        }
        dist[i] = best;
        sum += best;
      }
      const target = rand() * sum;
      let acc = 0;
      let pick = n - 1;
      for (let i = 0; i < n; i++) {
        acc += dist[i];
        if (acc >= target) { pick = i; break; }
      }
      centroidLab[m * 3] = labFlat[pick * 3];
      centroidLab[m * 3 + 1] = labFlat[pick * 3 + 1];
      centroidLab[m * 3 + 2] = labFlat[pick * 3 + 2];
    }
  }

  const labels = new Int32Array(n);
  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;
    // assign
    for (let i = 0; i < n; i++) {
      let best = Infinity;
      let bestC = 0;
      const lL = labFlat[i * 3];
      const la = labFlat[i * 3 + 1];
      const lb = labFlat[i * 3 + 2];
      for (let c = 0; c < k; c++) {
        const dL = lL - centroidLab[c * 3];
        const da = la - centroidLab[c * 3 + 1];
        const db = lb - centroidLab[c * 3 + 2];
        const d = dL * dL + da * da + db * db;
        if (d < best) { best = d; bestC = c; }
      }
      if (labels[i] !== bestC) {
        changed = true;
        labels[i] = bestC;
      }
    }
    if (!changed && iter > 0) break;
    // update
    const sums = new Float32Array(k * 3);
    const counts = new Int32Array(k);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      sums[c * 3] += labFlat[i * 3];
      sums[c * 3 + 1] += labFlat[i * 3 + 1];
      sums[c * 3 + 2] += labFlat[i * 3 + 2];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroidLab[c * 3] = sums[c * 3] / counts[c];
        centroidLab[c * 3 + 1] = sums[c * 3 + 1] / counts[c];
        centroidLab[c * 3 + 2] = sums[c * 3 + 2] / counts[c];
      }
    }
  }

  // centroid LAB 回不到精确 RGB（需要反向转换复杂）；用每簇的 RGB 均值作为展示色更直观。
  const centroidsRgb = new Float32Array(k * 3);
  {
    const sums = new Float32Array(k * 3);
    const counts = new Int32Array(k);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      sums[c * 3] += rgbFlat[i * 3];
      sums[c * 3 + 1] += rgbFlat[i * 3 + 1];
      sums[c * 3 + 2] += rgbFlat[i * 3 + 2];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroidsRgb[c * 3] = sums[c * 3] / counts[c];
        centroidsRgb[c * 3 + 1] = sums[c * 3 + 1] / counts[c];
        centroidsRgb[c * 3 + 2] = sums[c * 3 + 2] / counts[c];
      } else {
        centroidsRgb[c * 3] = 255;
        centroidsRgb[c * 3 + 1] = 255;
        centroidsRgb[c * 3 + 2] = 255;
      }
    }
  }

  return { centroidsRgb, labels };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** 主入口：按选项生成 pattern + colors。 */
export function pixelate(img: HTMLImageElement, opts: PixelateOptions): PixelateResult {
  const { gridSize, colorCount, saturation, alphaThreshold } = opts;
  const square = centerCropSquareToCanvas(img); // 原分辨率的方图
  const small = document.createElement('canvas');
  small.width = gridSize;
  small.height = gridSize;
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(square, 0, 0, gridSize, gridSize);
  const imageData = sctx.getImageData(0, 0, gridSize, gridSize);
  applySaturation(imageData.data, saturation);

  const total = gridSize * gridSize;
  const pattern = new Array<number>(total).fill(0);

  // 收集前景像素
  const fgIdx: number[] = [];
  const fgRgb: number[] = [];
  for (let i = 0; i < total; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    const a = imageData.data[i * 4 + 3] / 255;
    if (a > alphaThreshold) {
      fgIdx.push(i);
      fgRgb.push(r, g, b);
    }
  }

  if (fgIdx.length === 0) {
    return { gridSize, pattern, colors: ['#FFFFFF'] };
  }

  const rgbFlat = new Float32Array(fgRgb);
  // k = min(colorCount - 1, 前景点数)；-1 是因为 colors[0] 是背景白
  const k = Math.max(1, Math.min(colorCount - 1, Math.floor(fgIdx.length)));
  const { centroidsRgb, labels } = kmeansLab(rgbFlat, k);

  // 按亮度（R+G+B）升序排；重建索引映射
  const order = Array.from({ length: k }, (_, i) => i).sort((a, b) => {
    const sa = centroidsRgb[a * 3] + centroidsRgb[a * 3 + 1] + centroidsRgb[a * 3 + 2];
    const sb = centroidsRgb[b * 3] + centroidsRgb[b * 3 + 1] + centroidsRgb[b * 3 + 2];
    return sa - sb;
  });
  const remap = new Int32Array(k);
  for (let i = 0; i < k; i++) remap[order[i]] = i;

  // 构造 colors 数组；index 0 背景白
  const colors: string[] = ['#FFFFFF'];
  for (let i = 0; i < k; i++) {
    const c = order[i];
    colors.push(rgbToHex(centroidsRgb[c * 3], centroidsRgb[c * 3 + 1], centroidsRgb[c * 3 + 2]));
  }

  // 填 pattern：前景点用 remap + 1（因为 colors[0] 背景白）
  for (let i = 0; i < fgIdx.length; i++) {
    pattern[fgIdx[i]] = remap[labels[i]] + 1;
  }

  return { gridSize, pattern, colors };
}

/** 调试辅助：把 PixelateResult 画到 canvas（可选叠网格线），供预览。 */
export function renderPreview(
  result: PixelateResult,
  canvas: HTMLCanvasElement,
  options: { showGrid?: boolean; cellSize?: number } = {},
) {
  const { gridSize, pattern, colors } = result;
  const cell = options.cellSize ?? Math.floor(canvas.width / gridSize);
  const w = cell * gridSize;
  canvas.width = w;
  canvas.height = w;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, w);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const p = pattern[y * gridSize + x];
      if (p === 0) continue;
      ctx.fillStyle = colors[p];
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  if (options.showGrid !== false) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < gridSize; i++) {
      const v = i * cell;
      ctx.moveTo(v, 0); ctx.lineTo(v, w);
      ctx.moveTo(0, v); ctx.lineTo(w, v);
    }
    ctx.stroke();
  }
}
