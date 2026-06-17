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

// Legacy types kept for migration only
export interface MootmisPuu { id: string; puuliik: string; diameeter: string; }
export interface MootmisKand { id: string; puuliik: string; diameeter: string; }

// New loendus-based structure
// loendus[puuliik][cm_string] = arv  (e.g. loendus["Mänd"]["14"] = 3)
export type MootmisLoendus = Record<string, Record<string, number>>;

export interface MootmisData {
  pindala: string;
  rinne: string;
  // New fields
  puudLoendus: MootmisLoendus;   // kasvavad puud: liik → cm → arv
  kandudLoendus: MootmisLoendus; // kännud: liik → cm → arv
  // Legacy fields kept for migration
  puud?: MootmisPuu[];
  kandud?: MootmisKand[];
}

export interface TakseerRida {
  id: string;
  rinne: string;
  protsent: string;
  puuliik: string;
  tekkeaasta: string;
  vanus: string;
  jooksevVanus: string;
  korgus: string;
  labimoot: string;
  rinnaspindala: string;
  tekkeviis: string;
  maht: string;
  mahtHa: string;
  puudeArv: string;
}

export interface KokkuvoteRida {
  id: string;
  rinne: string;
  mahtTm: string;
  mahtTmHa: string;
  taiusProtsent: string;
  rinnaspindala: string;
}

export interface UldInfo {
  maakond: string;
  vald: string;
  uksus: string;
  katastr: string;
  kvartal: string;
  eraldis: string;
  pindala: string;
  keskVanus: string;
  raievanus: string;
  keskDiam: string;
  takseerRead: TakseerRida[];
  kokkuvote: KokkuvoteRida[];
  raieJargneRead: TakseerRida[];
  raieJargneKokkuvote: KokkuvoteRida[];
  mootmised: MootmisData;
}

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

function genId() { return Math.random().toString(36).substr(2, 9); }

function makeTakseerRida(): TakseerRida {
  return {
    id: genId(), rinne: 'esimene', protsent: '', puuliik: '', tekkeaasta: '',
    vanus: '', jooksevVanus: '', korgus: '', labimoot: '',
    rinnaspindala: '', tekkeviis: 'looduslik', maht: '', mahtHa: '', puudeArv: '',
  };
}

function makeKokkuvoteRida(rinne: string): KokkuvoteRida {
  return { id: genId(), rinne, mahtTm: '', mahtTmHa: '', taiusProtsent: '', rinnaspindala: '' };
}

export function makeDefaultProject(nimi: string, id: string, kuupaev: string): Project {
  return {
    id,
    meta: { nimi, nr: '', koostaja: '', kuupaev, raieliik: '', markused: '' },
    uldinfo: {
      maakond: '', vald: '', uksus: '', katastr: '', kvartal: '', eraldis: '',
      pindala: '', keskVanus: '', raievanus: '', keskDiam: '',
      takseerRead: [makeTakseerRida()],
      kokkuvote: [makeKokkuvoteRida('Esimene'), makeKokkuvoteRida('Teine'), makeKokkuvoteRida('Üksikpuud'), makeKokkuvoteRida('Kokku')],
      raieJargneRead: [makeTakseerRida()],
      raieJargneKokkuvote: [makeKokkuvoteRida('Esimene'), makeKokkuvoteRida('Teine'), makeKokkuvoteRida('Üksikpuud'), makeKokkuvoteRida('Kokku')],
      mootmised: { pindala: '', rinne: 'esimene', puudLoendus: {}, kandudLoendus: {} },
    },
    lisa2: { rows: [], kordaja: 1, kahju: '0' },
    lisa3: { rows: [], puuliik: 'mand', vanus: 0, alammaar: 0, tegelik: 0, kordaja: 1, measuredArea: 0, perimeter: 0, coords: [] },
    taius: { species: 'mand', height: 0, g: 0 },
    kannu: { species: 'mand', dStump: 0, d13: 0 },
    tagavara: { species: 'mand', g: 0, h: 0 },
  };
}

function migrateMootmised(old: any): MootmisData {
  const def: MootmisData = { pindala: '', rinne: 'esimene', puudLoendus: {}, kandudLoendus: {} };
  if (!old) return def;
  const result: MootmisData = {
    pindala: old.pindala ?? '',
    rinne: old.rinne ?? 'esimene',
    puudLoendus: old.puudLoendus ?? {},
    kandudLoendus: old.kandudLoendus ?? {},
  };
  // Migrate legacy puud[] array → puudLoendus
  if (old.puud && Array.isArray(old.puud) && old.puud.length > 0 && !old.puudLoendus) {
    const loendus: MootmisLoendus = {};
    for (const p of old.puud as MootmisPuu[]) {
      const d = Math.round(parseFloat(p.diameeter) || 0);
      if (!d) continue;
      if (!loendus[p.puuliik]) loendus[p.puuliik] = {};
      loendus[p.puuliik][String(d)] = (loendus[p.puuliik][String(d)] || 0) + 1;
    }
    result.puudLoendus = loendus;
  }
  // Migrate legacy kandud[] array → kandudLoendus
  if (old.kandud && Array.isArray(old.kandud) && old.kandud.length > 0 && !old.kandudLoendus) {
    const loendus: MootmisLoendus = {};
    for (const k of old.kandud as MootmisKand[]) {
      const d = Math.round(parseFloat(k.diameeter) || 0);
      if (!d) continue;
      if (!loendus[k.puuliik]) loendus[k.puuliik] = {};
      loendus[k.puuliik][String(d)] = (loendus[k.puuliik][String(d)] || 0) + 1;
    }
    result.kandudLoendus = loendus;
  }
  return result;
}

export function migrateProject(old: any): Project {
  let coords: GeoPoint[] = [];
  if (old.lisa3?.coords) {
    coords = Array.isArray(old.lisa3.coords) ? old.lisa3.coords : (() => { try { return JSON.parse(old.lisa3.coords); } catch { return []; } })();
  } else if (old.lisa3coords) {
    try { coords = JSON.parse(old.lisa3coords); } catch { coords = []; }
  }

  const isNew = !!old.meta;
  const def = makeDefaultProject('', old.id, '');

  return {
    id: old.id,
    meta: isNew ? old.meta : {
      nimi: old.nimi || '', nr: old.nr || '', koostaja: old.koostaja || '',
      kuupaev: old.kuupaev || '', raieliik: old.raieliik || '', markused: old.markused || '',
    },
    uldinfo: old.uldinfo ? {
      ...def.uldinfo,
      ...old.uldinfo,
      raieJargneRead: old.uldinfo.raieJargneRead ?? [makeTakseerRida()],
      raieJargneKokkuvote: old.uldinfo.raieJargneKokkuvote ?? def.uldinfo.raieJargneKokkuvote,
      mootmised: migrateMootmised(old.uldinfo.mootmised),
    } : def.uldinfo,
    lisa2: isNew ? old.lisa2 : { rows: old.lisa2rows || [], kordaja: parseFloat(old.lisa2kordaja || '1'), kahju: old.kahju || '0' },
    lisa3: isNew ? { ...old.lisa3, coords } : {
      rows: old.lisa3rows || [], puuliik: old.lisa3puuliik || 'mand',
      vanus: parseFloat(old.lisa3vanus || '0'), alammaar: parseFloat(old.lisa3alammaar || '0'),
      tegelik: parseFloat(old.lisa3tegelik || '0'), kordaja: parseFloat(old.lisa3kordaja || '1'),
      measuredArea: parseFloat(old.lisa3measuredArea || '0'), perimeter: parseFloat(old.lisa3perimeter || '0'),
      coords,
    },
    taius: isNew ? old.taius : { species: old.taiusSpecies || 'mand', height: parseFloat(old.taiusHeight || '0'), g: parseFloat(old.taiusG || '0') },
    kannu: isNew ? old.kannu : { species: old.kannuSpecies || 'mand', dStump: parseFloat(old.kannudStump || '0'), d13: parseFloat(old.kannud13 || '0') },
    tagavara: isNew ? old.tagavara : { species: old.tagavaraSpecies || 'mand', g: parseFloat(old.tagavaraG || '0'), h: parseFloat(old.tagavaraH || '0') },
  };
}
