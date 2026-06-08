import { GeoPoint } from './lib/geo';
export type { GeoPoint };

export interface TreeRow {
  id: string;
  liik: string;
  grupp: number;
  diam: number;
  arv: number;
}
export type Lisa2Row = TreeRow;

// ── Üldinfo ──────────────────────────────────────────────────────────────────
export interface UldInfo {
  // Asukoht
  maakond: string;
  vald: string;
  uksus: string;
  katastr: string;
  kvartal: string;
  eraldis: string;
  // Eraldise andmed
  pindala: string;
  keskVanus: string;
  raievanus: string;
  keskDiam: string;
  // Takseerkirjeldus read (rinne-põhine)
  takseerRead: TakseerRida[];
  // Kokkuvõte
  kokkuvote: KokkuvoteRida[];
  // Raie-järgne takseerkirjeldus
  raieJargneRead: TakseerRida[];
  raieJargneKokkuvote: KokkuvoteRida[];
}

export interface TakseerRida {
  id: string;
  rinne: string;         // esimene / teine / põõsas / üksikpuud
  protsent: string;      // %
  puuliik: string;
  tekkeaasta: string;
  vanus: string;
  jooksevVanus: string;
  korgus: string;        // m
  labimoot: string;      // cm
  rinnaspindala: string; // m²/ha
  tekkeviis: string;
  maht: string;          // tm
  mahtHa: string;        // tm/ha
  puudeArv: string;      // tk/ha
}

export interface KokkuvoteRida {
  id: string;
  rinne: string;
  mahtTm: string;
  mahtTmHa: string;
  taiusProtsent: string;
  rinnaspindala: string;
}

// ── Existing interfaces ───────────────────────────────────────────────────────
export interface ProjectMeta {
  nimi: string;
  nr: string;
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
  coords: GeoPoint[];
}

export interface TaiusData { species: string; height: number; g: number; }
export interface KannuData { species: string; dStump: number; d13: number; }
export interface TagavaraData { species: string; g: number; h: number; }

export interface Project {
  id: string;
  meta: ProjectMeta;
  uldinfo: UldInfo;
  lisa2: Lisa2Data;
  lisa3: Lisa3Data;
  taius: TaiusData;
  kannu: KannuData;
  tagavara: TagavaraData;
}

export type TabType = 'uldinfo' | 'lisa2' | 'lisa3' | 'abiarvutused' | 'project';

function makeTakseerRida(): TakseerRida {
  return {
    id: Math.random().toString(36).substr(2, 9),
    rinne: 'esimene', protsent: '', puuliik: '', tekkeaasta: '',
    vanus: '', jooksevVanus: '', korgus: '', labimoot: '',
    rinnaspindala: '', tekkeviis: '', maht: '', mahtHa: '', puudeArv: '',
  };
}

function makeKokkuvoteRida(rinne: string): KokkuvoteRida {
  return { id: Math.random().toString(36).substr(2, 9), rinne, mahtTm: '', mahtTmHa: '', taiusProtsent: '', rinnaspindala: '' };
}

export function makeDefaultProject(nimi: string, id: string, kuupaev: string): Project {
  return {
    id,
    meta: { nimi, nr: '', koostaja: '', kuupaev, raieliik: '', markused: '' },
    uldinfo: {
      maakond: '', vald: '', uksus: '', katastr: '', kvartal: '', eraldis: '',
      pindala: '', keskVanus: '', raievanus: '', keskDiam: '',
      takseerRead: [makeTakseerRida()],
      raieJargneRead: [makeTakseerRida()],
      raieJargneKokkuvote: [
        makeKokkuvoteRida('Esimene'),
        makeKokkuvoteRida('Teine'),
        makeKokkuvoteRida('Üksikpuud'),
        makeKokkuvoteRida('Kokku'),
      ],
      kokkuvote: [
        makeKokkuvoteRida('Esimene'),
        makeKokkuvoteRida('Teine'),
        makeKokkuvoteRida('Üksikpuud'),
        makeKokkuvoteRida('Kokku'),
      ],
    },
    lisa2: { rows: [], kordaja: 1, kahju: '0' },
    lisa3: { rows: [], puuliik: 'mand', vanus: 0, alammaar: 0, tegelik: 0, kordaja: 1, measuredArea: 0, perimeter: 0, coords: [] },
    taius: { species: 'mand', height: 0, g: 0 },
    kannu: { species: 'mand', dStump: 0, d13: 0 },
    tagavara: { species: 'mand', g: 0, h: 0 },
  };
}

export function migrateProject(old: any): Project {
  let coords: GeoPoint[] = [];
  if (old.lisa3?.coords) {
    coords = Array.isArray(old.lisa3.coords) ? old.lisa3.coords : (() => { try { return JSON.parse(old.lisa3.coords); } catch { return []; } })();
  } else if (old.lisa3coords) {
    try { coords = JSON.parse(old.lisa3coords); } catch { coords = []; }
  }

  const base = old.meta ? old : null;

  return {
    id: old.id,
    meta: base ? old.meta : {
      nimi: old.nimi || '', nr: old.nr || '', koostaja: old.koostaja || '',
      kuupaev: old.kuupaev || '', raieliik: old.raieliik || '', markused: old.markused || '',
    },
    uldinfo: old.uldinfo ? {
      ...makeDefaultProject('', old.id, '').uldinfo,
      ...old.uldinfo,
      raieJargneRead: old.uldinfo.raieJargneRead ?? [makeTakseerRida()],
      raieJargneKokkuvote: old.uldinfo.raieJargneKokkuvote ?? makeDefaultProject('', old.id, '').uldinfo.raieJargneKokkuvote,
    } : makeDefaultProject('', old.id, '').uldinfo,
    lisa2: base ? old.lisa2 : { rows: old.lisa2rows || [], kordaja: parseFloat(old.lisa2kordaja || '1'), kahju: old.kahju || '0' },
    lisa3: base ? { ...old.lisa3, coords } : {
      rows: old.lisa3rows || [], puuliik: old.lisa3puuliik || 'mand',
      vanus: parseFloat(old.lisa3vanus || '0'), alammaar: parseFloat(old.lisa3alammaar || '0'),
      tegelik: parseFloat(old.lisa3tegelik || '0'), kordaja: parseFloat(old.lisa3kordaja || '1'),
      measuredArea: parseFloat(old.lisa3measuredArea || '0'), perimeter: parseFloat(old.lisa3perimeter || '0'),
      coords,
    },
    taius: base ? old.taius : { species: old.taiusSpecies || 'mand', height: parseFloat(old.taiusHeight || '0'), g: parseFloat(old.taiusG || '0') },
    kannu: base ? old.kannu : { species: old.kannuSpecies || 'mand', dStump: parseFloat(old.kannudStump || '0'), d13: parseFloat(old.kannud13 || '0') },
    tagavara: base ? old.tagavara : { species: old.tagavaraSpecies || 'mand', g: parseFloat(old.tagavaraG || '0'), h: parseFloat(old.tagavaraH || '0') },
  };
}
