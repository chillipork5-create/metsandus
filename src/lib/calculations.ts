import { 
  LISA2_DATA, 
  LISA2_STEP, 
  KANDU_CONV_COEFFS, 
  STD_TABLE, 
  MAHT_KORDAJAD, 
  VORMIARV_K, 
  NORM_TAGAVARA_K, 
  TAGAVARA2_K, 
  LISA3_RATES 
} from './constants';

// --- Lisa 2 Calculations ---

export function getLisa2Rate(diameter: number, group: number): number {
  const i = group - 1;
  const match = LISA2_DATA.find((row) => diameter <= row[0]);
  if (match) return match[i + 1];

  // Diameter exceeds 102cm: use step formula
  const lastRow = LISA2_DATA[LISA2_DATA.length - 1];
  const steps = Math.ceil((diameter - 102) / 4);
  return lastRow[i + 1] + steps * LISA2_STEP[i];
}

// --- Lisa 3 & Pindala Calculations ---

export function getLisa3Rate(species: string, age: number): number {
  const rates = LISA3_RATES[species] || LISA3_RATES.mand;
  const match = rates.find((row) => age <= row[0]);
  return match ? match[1] : 0;
}

// FIX: clamp to 0 — narrow strip forests can produce negative area
export function calcKorrigeeritudPindala(perimeter: number, measuredArea: number): number {
  if (!perimeter || !measuredArea) return measuredArea;
  const error = (2.5 * perimeter) / 10000;
  return Math.max(measuredArea - error, 0);
}

// --- Stump Conversion ---

export function stumpToD13(species: string, dStump: number): number {
  const coeffs = KANDU_CONV_COEFFS[species];
  if (!coeffs) return 0;
  return coeffs.a + coeffs.b * dStump;
}

export function d13ToStump(species: string, d13: number): number {
  const coeffs = KANDU_CONV_COEFFS[species];
  if (!coeffs) return 0;
  return (d13 - coeffs.a) / coeffs.b;
}

// --- Täius & G ---

// Single canonical G calculation using Math.PI (not the ~0.00007854 approximation)
export function calcG(diameter: number, count: number, area: number = 1): number {
  if (!diameter || !count) return 0;
  return (Math.PI * Math.pow(diameter / 200, 2) * count) / area;
}

export function getGn(species: string, height: number): number {
  const speciesMap: Record<string, number> = {
    mand: 0, kuusk: 1, kask: 2, sanglepp: 3, haab: 3, kovleht: 4, tamm: 4
  };
  const idx = speciesMap[species];
  if (idx === undefined) return 0;

  const heights = Object.keys(STD_TABLE).map(Number).sort((a, b) => a - b);
  if (height <= heights[0]) return STD_TABLE[heights[0]][idx];
  if (height >= heights[heights.length - 1]) return STD_TABLE[heights[heights.length - 1]][idx];

  // Linear interpolation
  let lo = heights[0], hi = heights[heights.length - 1];
  for (let i = 0; i < heights.length - 1; i++) {
    if (height >= heights[i] && height <= heights[i + 1]) {
      lo = heights[i];
      hi = heights[i + 1];
      break;
    }
  }
  return STD_TABLE[lo][idx] + (STD_TABLE[hi][idx] - STD_TABLE[lo][idx]) * (height - lo) / (hi - lo);
}

// --- Volume Calculations ---

export function calcTreeVolume(species: string, d13: number, height: number): number {
  const k = (MAHT_KORDAJAD as any)[species];
  if (!k || d13 < 0.1 || height < 0.1) return 0;
  const formFactor = k.a + k.b / d13 + k.c / height + k.d / (d13 * height);
  return 0.0000785 * Math.pow(d13, 2) * height * formFactor;
}

export function calcStandFactor(species: string, height: number): number {
  const k = (VORMIARV_K as any)[species];
  if (!k || height < 6) return 0;
  return k.a + k.b / height + k.c * Math.sqrt(height) + k.d * Math.log(height);
}

export function calcNormVolume(species: string, height: number): number {
  const k = (NORM_TAGAVARA_K as any)[species];
  if (!k || height < 6) return 0;
  return k.a1 + k.b1 * height + k.c1 * Math.pow(height, 2) + k.d1 * Math.pow(height, 3);
}

export function calcYoungStandVolume(species: string, d13: number, height: number, count: number): number {
  const k = (TAGAVARA2_K as any)[species];
  if (!k || height >= 6 || d13 <= 0 || count <= 0) return 0;
  const factor = k.a + k.b / d13 + k.c / (height * Math.sqrt(count));
  return 0.0000785 * Math.pow(d13, 2) * height * count * factor;
}
