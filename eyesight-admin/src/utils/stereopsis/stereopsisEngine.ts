/**
 * RDS anaglyph stereopsis canvas engine (ported from titmus-prototype.html).
 * Red channel = left eye, blue channel = right eye.
 */

const DOT = 2;
const MONO = { r: 255, g: 0, b: 0 };
const MONO_B = { r: 0, g: 0, b: 255 };

export type IntroShapeType =
  | 'star'
  | 'triangle'
  | 'square'
  | 'circle'
  | 'diamond'
  | 'rect'
  | 'heart'
  | 'plus';

/** All shapes available for shape_id RDS (single large panel). */
export const ALL_INTRO_SHAPE_TYPES: IntroShapeType[] = [
  'star',
  'triangle',
  'square',
  'circle',
  'diamond',
  'rect',
  'heart',
  'plus',
];

export type GeoShapeType = 'circle' | 'triangle' | 'square';

export interface PaintOptions {
  depthIn?: boolean;
  density?: number;
  dotPx?: number;
  shiftCells?: number;
  fieldFn?: (x: number, y: number) => boolean;
  balancedStereo?: boolean;
}

export class SeededRng {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483646 || 1;
  }

  next = (): number => {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  };

  int = (n: number): number => Math.floor(this.next() * n);
}

export const arcsecToShiftCells = (
  arcsec: number,
  { minArc = 20, maxArc = 200, minCells = 2, maxCells = 8 } = {}
): number => {
  const a = Math.max(minArc, Math.min(maxArc, arcsec));
  const t = (a - minArc) / (maxArc - minArc);
  return Math.max(minCells, Math.round(minCells + t * (maxCells - minCells)));
};

export const shiftCellsForDotPx = (cellsAtDot2: number, dotPx: number): number =>
  Math.max(1, Math.round((cellsAtDot2 * DOT) / dotPx));

const inCircle = (x: number, y: number, cx: number, cy: number, r: number) =>
  (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const inTriangle = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
) => {
  const den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  if (Math.abs(den) < 1e-6) return false;
  const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / den;
  const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / den;
  return a >= 0 && b >= 0 && 1 - a - b >= 0;
};

const inPolygon = (x: number, y: number, pts: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const inStar = (x: number, y: number, cx: number, cy: number, outerR: number, innerRatio = 0.38) => {
  const innerR = outerR * innerRatio;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return inPolygon(x, y, pts);
};

export function paintAnaglyph(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  maskFn: (x: number, y: number) => boolean,
  rng: SeededRng,
  opts: PaintOptions = {}
) {
  const depthIn = opts.depthIn ?? false;
  const density = opts.density ?? 0.5;
  const dotPx = opts.dotPx ?? DOT;
  const shiftCells = opts.shiftCells ?? 4;
  const fieldFn = opts.fieldFn ?? (() => true);
  const balancedStereo = opts.balancedStereo ?? false;

  const pad = 4;
  const cols = Math.ceil((w - pad * 2) / dotPx);
  const rows = Math.ceil((h - pad * 2) / dotPx);
  const dots: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const cx = pad + gx * dotPx + dotPx / 2;
      const cy = pad + gy * dotPx + dotPx / 2;
      if (fieldFn(cx, cy) && rng.next() <= density) dots[gy][gx] = true;
    }
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  for (let i = 3; i < w * h * 4; i += 4) img.data[i] = 255;

  const stamp = (x: number, y: number, r: number, g: number, b: number) => {
    for (let dy = 0; dy < dotPx; dy++) {
      for (let dx = 0; dx < dotPx; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const i = (py * w + px) * 4;
        img.data[i] = Math.max(img.data[i], r);
        img.data[i + 1] = Math.max(img.data[i + 1], g);
        img.data[i + 2] = Math.max(img.data[i + 2], b);
        img.data[i + 3] = 255;
      }
    }
  };

  const hasDot = (gx: number, gy: number) =>
    gx >= 0 && gx < cols && gy >= 0 && gy < rows && dots[gy][gx];

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x = pad + gx * dotPx;
      const y = pad + gy * dotPx;
      const cx = x + dotPx / 2;
      const cy = y + dotPx / 2;
      if (!fieldFn(cx, cy)) continue;

      const hit = maskFn(cx, cy);
      const shift = hit ? (depthIn ? -shiftCells : shiftCells) : 0;

      if (balancedStereo && shift !== 0) {
        const half = Math.max(1, Math.round(Math.abs(shift) / 2));
        const sign = shift > 0 ? 1 : -1;
        if (hasDot(gx - sign * half, gy)) stamp(x, y, MONO.r, MONO.g, MONO.b);
        if (hasDot(gx + sign * half, gy)) stamp(x, y, MONO_B.r, MONO_B.g, MONO_B.b);
        continue;
      }
      if (hasDot(gx, gy)) stamp(x, y, MONO.r, MONO.g, MONO.b);
      if (hasDot(hit ? gx + shift : gx, gy)) stamp(x, y, MONO_B.r, MONO_B.g, MONO_B.b);
    }
  }

  ctx.putImageData(img, 0, 0);
}

const inHeart = (x: number, y: number, cx: number, cy: number, scale: number) => {
  const nx = (x - cx) / scale;
  const ny = -(y - cy) / scale;
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0.03;
};

function introShapeMask(
  type: IntroShapeType,
  x: number,
  y: number,
  cx: number,
  cy: number,
  fieldR: number
) {
  if (type === 'circle') {
    return inCircle(x, y, cx, cy, fieldR * 0.72);
  }
  if (type === 'square') {
    const h = fieldR * 0.612;
    return Math.abs(x - cx) <= h && Math.abs(y - cy) <= h;
  }
  if (type === 'rect') {
    const hw = fieldR * 0.78;
    const hh = fieldR * 0.42;
    return Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh;
  }
  if (type === 'triangle') {
    const h = fieldR * 0.72;
    return inTriangle(
      x,
      y,
      cx,
      cy - h,
      cx - h,
      cy + h * 0.75,
      cx + h,
      cy + h * 0.75
    );
  }
  if (type === 'diamond') {
    const h = fieldR * 0.72;
    return inPolygon(x, y, [
      [cx, cy - h],
      [cx + h, cy],
      [cx, cy + h],
      [cx - h, cy],
    ]);
  }
  if (type === 'heart') {
    return inHeart(x, y, cx, cy + fieldR * 0.08, fieldR * 0.68);
  }
  if (type === 'plus') {
    const arm = fieldR * 0.58;
    const thick = fieldR * 0.17;
    const inH = Math.abs(y - cy) <= thick && Math.abs(x - cx) <= arm;
    const inV = Math.abs(x - cx) <= thick && Math.abs(y - cy) <= arm;
    return inH || inV;
  }
  return inStar(x, y, cx, cy, fieldR * 0.8);
}

function geoShapeMask(type: GeoShapeType, x: number, y: number, cx: number, cy: number, sz: number) {
  const h = sz * 0.44;
  if (type === 'circle') return inCircle(x, y, cx, cy, h);
  if (type === 'square') return Math.abs(x - cx) <= h && Math.abs(y - cy) <= h;
  return inTriangle(x, y, cx, cy - h, cx - h, cy + h * 0.75, cx + h, cy + h * 0.75);
}

const glyphCache: Record<string, ImageData> = {};
const DIGIT_DOT_PX = 7;

function getGlyph(digit: number, size: number): ImageData {
  const key = `${digit}@${size}`;
  if (!glyphCache[key]) {
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d')!;
    const fp = Math.round(size * 0.86);
    ctx.font = `700 ${fp}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(3, size * 0.023);
    ctx.strokeText(String(digit), size / 2, size / 2 + size * 0.04);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(digit), size / 2, size / 2 + size * 0.04);
    glyphCache[key] = ctx.getImageData(0, 0, size, size);
  }
  return glyphCache[key];
}

function digitAt(x: number, y: number, d: number, cx: number, cy: number, size: number) {
  const img = getGlyph(d, size);
  const lx = Math.floor(x - cx + size / 2);
  const ly = Math.floor(y - cy + size / 2);
  if (lx < 0 || ly < 0 || lx >= size || ly >= size) return false;
  return img.data[(ly * size + lx) * 4 + 3] > 48;
}

export function renderShapeSingle(canvas: HTMLCanvasElement, type: IntroShapeType, rng: SeededRng) {
  const w = 520;
  const h = 520;
  const cx = w / 2;
  const cy = h / 2;
  const fieldR = 215;
  const cells = arcsecToShiftCells(800, { minArc: 20, maxArc: 800, minCells: 2, maxCells: 12 });
  paintAnaglyph(
    canvas,
    w,
    h,
    (x, y) => inCircle(x, y, cx, cy, fieldR) && introShapeMask(type, x, y, cx, cy, fieldR),
    rng,
    {
      shiftCells: cells,
      depthIn: false,
      fieldFn: (x, y) => inCircle(x, y, cx, cy, fieldR),
      dotPx: DOT,
    }
  );
}

export function renderShapeRow(
  canvases: HTMLCanvasElement[],
  floatShape: GeoShapeType,
  floatAt: number,
  arcsec: number,
  rng: SeededRng
) {
  const cells = arcsecToShiftCells(arcsec, { minArc: 20, maxArc: 400, minCells: 2, maxCells: 8 });
  const fillers: GeoShapeType[] = ['circle', 'triangle', 'square'];
  const sz = 180;

  for (let i = 0; i < 5; i++) {
    const cv = canvases[i];
    if (!cv) continue;
    const t = i === floatAt ? floatShape : fillers[rng.int(fillers.length)];
    paintAnaglyph(
      cv,
      sz,
      sz,
      (x, y) => i === floatAt && geoShapeMask(t, x, y, sz / 2, sz / 2, sz),
      rng,
      { shiftCells: cells, depthIn: false, balancedStereo: true, dotPx: DOT }
    );
  }
}

export function renderDigitPanel(
  canvas: HTMLCanvasElement,
  digit: number,
  arcsec: number,
  rng: SeededRng
) {
  const s = 1080;
  const cx = s / 2;
  const cy = s / 2;
  const outerR = s * 0.47;
  const digitSize = 756;
  const cells = arcsecToShiftCells(arcsec);
  paintAnaglyph(
    canvas,
    s,
    s,
    (x, y) => inCircle(x, y, cx, cy, outerR) && digitAt(x, y, digit, cx, cy, digitSize),
    rng,
    {
      shiftCells: shiftCellsForDotPx(cells, DIGIT_DOT_PX),
      depthIn: false,
      fieldFn: (x, y) => inCircle(x, y, cx, cy, outerR),
      dotPx: DIGIT_DOT_PX,
    }
  );
}
