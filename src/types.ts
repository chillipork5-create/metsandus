// --- Shared row type for Lisa 2 and Lisa 3 tree lists ---
export interface TreeRow {
  id: string;
  liik: string;
  grupp: number;
  diam: number;  // number, not string
  arv: number;   // number, not string
}

// Keep Lisa2Row as alias for backwards compat
export type Lisa2Row = TreeRow;

// --- Structured sub-types instead of 38 flat fields ---
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
  kordaja: number;   // FIX: number not string
  kahju: string;
}

export interface Lisa3Data {
  rows: TreeRow[];
  puuliik: string;
  vanus: number;     // FIX: number not string
  alammaar: number;  // FIX: number not string
  tegelik: number;   // FIX: number not string
  kordaja: number;   // FIX: number not string
  measuredArea: number; // FIX: number not string
  perimeter: number;    // FIX: number not string
  coords: string;    // Serialized GeoPoint[] — kept as string (map data)
}

export interface TaiusData {
  species: string;
  height: number;  // FIX: number not string
  g: number;       // FIX: number not string
}

export interface KannuData {
  species: string;
  dStump: number;  // FIX: number not string
  d13: number;     // FIX: number not string
}

export interface TagavaraData {
  species: string;
  g: number;  // FIX: number not string
  h: number;  // FIX: number not string
}

// --- Main Project type — structured, no more 38 flat fields ---
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

// --- Default factories so new projects always have valid shape ---
export function makeDefaultProject(nimi: string, id: string, kuupaev: string): Project {
  return {
    id,
    meta: {
      nimi,
      nr: '',
      aadress: '',
      katastr: '',
      pindala: '',
      koostaja: '',
      kuupaev,
      raieliik: '',
      markused: '',
    },
    lisa2: {
      rows: [],
      kordaja: 1,
      kahju: '0',
    },
    lisa3: {
      rows: [],
      puuliik: 'mand',
      vanus: 0,
      alammaar: 0,
      tegelik: 0,
      kordaja: 1,
      measuredArea: 0,
      perimeter: 0,
      coords: '',
    },
    taius: {
      species: 'mand',
      height: 0,
      g: 0,
    },
    kannu: {
      species: 'mand',
      dStump: 0,
      d13: 0,
    },
    tagavara: {
      species: 'mand',
      g: 0,
      h: 0,
    },
  };
}

// --- Migration: convert old flat Project shape to new structured shape ---
export function migrateProject(old: any): Project {
  if (old.meta) return old as Project; // already new shape
  return {
    id: old.id,
    meta: {
      nimi: old.nimi || '',
      nr: old.nr || '',
      aadress: old.aadress || '',
      katastr: old.katastr || '',
      pindala: old.pindala || '',
      koostaja: old.koostaja || '',
      kuupaev: old.kuupaev || '',
      raieliik: old.raieliik || '',
      markused: old.markused || '',
    },
    lisa2: {
      rows: old.lisa2rows || [],
      kordaja: parseFloat(old.lisa2kordaja || '1'),
      kahju: old.kahju || '0',
    },
    lisa3: {
      rows: old.lisa3rows || [],
      puuliik: old.lisa3puuliik || 'mand',
      vanus: parseFloat(old.lisa3vanus || '0'),
      alammaar: parseFloat(old.lisa3alammaar || '0'),
      tegelik: parseFloat(old.lisa3tegelik || '0'),
      kordaja: parseFloat(old.lisa3kordaja || '1'),
      measuredArea: parseFloat(old.lisa3measuredArea || '0'),
      perimeter: parseFloat(old.lisa3perimeter || '0'),
      coords: old.lisa3coords || '',
    },
    taius: {
      species: old.taiusSpecies || 'mand',
      height: parseFloat(old.taiusHeight || '0'),
      g: parseFloat(old.taiusG || '0'),
    },
    kannu: {
      species: old.kannuSpecies || 'mand',
      dStump: parseFloat(old.kannudStump || '0'),
      d13: parseFloat(old.kannud13 || '0'),
    },
    tagavara: {
      species: old.tagavaraSpecies || 'mand',
      g: parseFloat(old.tagavaraG || '0'),
      h: parseFloat(old.tagavaraH || '0'),
    },
  };
}
