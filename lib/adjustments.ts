export type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  brilliance: number;
  highlights: number;
  shadows: number;
  vibrance: number;
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  brilliance: 0,
  highlights: 0,
  shadows: 0,
  vibrance: 0,
};

export const ADJUSTMENT_LABELS: {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "exposure", label: "Exposure", min: -100, max: 100 },
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "vibrance", label: "Vibrance", min: -100, max: 100 },
  { key: "brilliance", label: "Brilliance", min: -100, max: 100 },
  { key: "highlights", label: "Highlights", min: -100, max: 100 },
  { key: "shadows", label: "Shadows", min: -100, max: 100 },
];

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [h: number, s: number, l: number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): [r: number, g: number, b: number] {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
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
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

function applyExposure(r: number, g: number, b: number, amount: number) {
  const factor = Math.pow(2, (amount / 100) * 1.5);
  return [r * factor, g * factor, b * factor] as const;
}

function applyBrightness(r: number, g: number, b: number, amount: number) {
  const delta = (amount / 100) * 128;
  return [r + delta, g + delta, b + delta] as const;
}

function applyContrast(r: number, g: number, b: number, amount: number) {
  const c = (amount / 100) * 255;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  return [
    factor * (r - 128) + 128,
    factor * (g - 128) + 128,
    factor * (b - 128) + 128,
  ] as const;
}

function applyTone(
  r: number,
  g: number,
  b: number,
  amount: number,
  region: "highlights" | "shadows",
) {
  const lum = luminance(r, g, b) / 255;
  const weight =
    region === "highlights"
      ? Math.pow(Math.max(0, (lum - 0.45) / 0.55), 1.4)
      : Math.pow(Math.max(0, (0.55 - lum) / 0.55), 1.4);
  const delta = (amount / 100) * 90 * weight;
  return [r + delta, g + delta, b + delta] as const;
}

function applyBrilliance(r: number, g: number, b: number, amount: number) {
  const lum = luminance(r, g, b) / 255;
  const midWeight = 1 - Math.abs(lum - 0.5) * 2;
  const edgeWeight = 1 - midWeight;
  const boost = (amount / 100) * 70 * midWeight;
  const protect = (amount / 100) * 25 * edgeWeight * (amount > 0 ? -1 : 1);
  const delta = boost + protect;
  return [r + delta, g + delta, b + delta] as const;
}

function applySaturation(r: number, g: number, b: number, amount: number) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const factor = 1 + amount / 100;
  const [nr, ng, nb] = hslToRgb(h, clamp(s * factor, 0, 1), l);
  return [nr, ng, nb] as const;
}

function applyVibrance(r: number, g: number, b: number, amount: number) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const vibranceFactor = 1 + (amount / 100) * (1 - s);
  const [nr, ng, nb] = hslToRgb(h, clamp(s * vibranceFactor, 0, 1), l);
  return [nr, ng, nb] as const;
}

export function hasAdjustments(adj: Adjustments): boolean {
  return Object.values(adj).some((v) => v !== 0);
}

export function applyAdjustmentsToImageData(
  imageData: ImageData,
  adj: Adjustments,
): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (adj.exposure !== 0) [r, g, b] = applyExposure(r, g, b, adj.exposure);
    if (adj.brightness !== 0)
      [r, g, b] = applyBrightness(r, g, b, adj.brightness);
    if (adj.shadows !== 0)
      [r, g, b] = applyTone(r, g, b, adj.shadows, "shadows");
    if (adj.highlights !== 0)
      [r, g, b] = applyTone(r, g, b, adj.highlights, "highlights");
    if (adj.brilliance !== 0)
      [r, g, b] = applyBrilliance(r, g, b, adj.brilliance);
    if (adj.contrast !== 0) [r, g, b] = applyContrast(r, g, b, adj.contrast);
    if (adj.saturation !== 0)
      [r, g, b] = applySaturation(r, g, b, adj.saturation);
    if (adj.vibrance !== 0) [r, g, b] = applyVibrance(r, g, b, adj.vibrance);

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
}

export function renderAdjustedCanvas(
  source: HTMLCanvasElement,
  adj: Adjustments,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  if (!hasAdjustments(adj)) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyAdjustmentsToImageData(imageData, adj);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
