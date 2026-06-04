import { GeoPoint } from './lib/geo';

// Re-export for convenience
export type { GeoPoint };

// --- Shared row type for Lisa 2 and Lisa 3 tree lists ---
export interface TreeRow {
  id: string;
  liik: string;
  grupp: number;
  diam: number;
  arv: number;
}

export type Lisa2Row = TreeRow;

export interface ProjectMeta {
  nimi: string;
  nr: string;
  aadress: string;
  katastr: string;
  pindala: string;
  koostaja: string;
  kuupaev: string;
  raieliik: string;
  markused: string;
}

export interface Lisa2Data {
  rows: TreeRow[];
  kordaja: number;
  kahju: string;
}

export interface Lisa3Data {
  rows: TreeRow[];
  puuliik: string;
  vanus: number;
  alammaar: number;
  tegelik: number;
  kordaja: number;
  measuredArea: number;
  perimeter: number;
  // FIX: GeoPoint[] directly — no more double JSON serialization
  coords: GeoPoint[];
}

export interface TaiusData {
  species: string;
  height: number;
  g: number;
}

export interface KannuData {
  species: string;
  dStump: number;
  d13: number;
}

export interface TagavaraData {
  species: string;
  g: number;
  h: number;
}

export interface Project {
  id: string;
  meta: ProjectMeta;
  lisa2: Lisa2Data;
  lisa3: Lisa3Data;
  taius: TaiusData;
  kannu: KannuData;
  tagavara: TagavaraData;
}

export type TabType = 'lisa2' | 'lisa3' | 'kannu' | 'taius' | 'maht' | 'project';

export function makeDefaultProject(nimi: string, id: string, kuupaev: string): Project {
  return {
    id,
    meta: { nimi, nr: '', aadress: '', katastr: '', pindala: '', koostaja: '', kuupaev, raieliik: '', markused: '' },
    lisa2: { rows: [], kordaja: 1, kahju: '0' },
    lisa3: { rows: [], puuliik: 'mand', vanus: 0, alammaar: 0, tegelik: 0, kordaja: 1, measuredArea: 0, perimeter: 0, coords: [] },
    taius: { species: 'mand', height: 0, g: 0 },
    kannu: { species: 'mand', dStump: 0, d13: 0 },
    tagavara: { species: 'mand', g: 0, h: 0 },
  };
}

export function migrateProject(old: any): Project {
  if (old.meta && Array.isArray(old.meta && old.lisa3?.coords)) return old as Project;
  
  // Parse old coords string if needed
  let coords: GeoPoint[] = [];
  if (old.lisa3?.coords) {
    if (Array.isArray(old.lisa3.coords)) {
      coords = old.lisa3.coords;
    } else {
      try { coords = JSON.parse(old.lisa3.coords); } catch { coords = []; }
    }
  } else if (old.lisa3coords) {
    try { coords = JSON.parse(old.lisa3coords); } catch { coords = []; }
  }

  if (old.meta) {
    // Already new shape but coords may be string
    return { ...old, lisa3: { ...old.lisa3, coords } } as Project;
  }

  return {
    id: old.id,
    meta: {
      nimi: old.nimi || '', nr: old.nr || '', aadress: old.aadress || '',
      katastr: old.katastr || '', pindala: old.pindala || '', koostaja: old.koostaja || '',
      kuupaev: old.kuupaev || '', raieliik: old.raieliik || '', markused: old.markused || '',
    },
    lisa2: { rows: old.lisa2rows || [], kordaja: parseFloat(old.lisa2kordaja || '1'), kahju: old.kahju || '0' },
    lisa3: {
      rows: old.lisa3rows || [], puuliik: old.lisa3puuliik || 'mand',
      vanus: parseFloat(old.lisa3vanus || '0'), alammaar: parseFloat(old.lisa3alammaar || '0'),
      tegelik: parseFloat(old.lisa3tegelik || '0'), kordaja: parseFloat(old.lisa3kordaja || '1'),
      measuredArea: parseFloat(old.lisa3measuredArea || '0'), perimeter: parseFloat(old.lisa3perimeter || '0'),
      coords,
    },
    taius: { species: old.taiusSpecies || 'mand', height: parseFloat(old.taiusHeight || '0'), g: parseFloat(old.taiusG || '0') },
    kannu: { species: old.kannuSpecies || 'mand', dStump: parseFloat(old.kannudStump || '0'), d13: parseFloat(old.kannud13 || '0') },
    tagavara: { species: old.tagavaraSpecies || 'mand', g: parseFloat(old.tagavaraG || '0'), h: parseFloat(old.tagavaraH || '0') },
  };
}
