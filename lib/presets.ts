import { DEFAULT_ADJUSTMENTS, type Adjustments } from "./adjustments";

export type Preset = {
  id: string;
  name: string;
  adjustments: Adjustments;
};

/** Tuned for scanned/document PDFs: lifted exposure, muted saturation, strong vibrance. */
export const DOCUMENT_MUTED_PRESET: Adjustments = {
  exposure: 66,
  brightness: 16,
  contrast: 0,
  saturation: -78,
  vibrance: 77,
  brilliance: -100,
  highlights: -19,
  shadows: -48,
};

export const PRESETS: Preset[] = [
  { id: "default", name: "Default", adjustments: DEFAULT_ADJUSTMENTS },
  {
    id: "document-muted",
    name: "Document (muted)",
    adjustments: DOCUMENT_MUTED_PRESET,
  },
];

export function adjustmentsEqual(a: Adjustments, b: Adjustments): boolean {
  return (Object.keys(a) as (keyof Adjustments)[]).every((key) => a[key] === b[key]);
}

export function findMatchingPreset(adjustments: Adjustments): Preset | undefined {
  return PRESETS.find((p) => adjustmentsEqual(adjustments, p.adjustments));
}
