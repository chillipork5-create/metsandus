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

export interface MootmisPuu {
  id: string;
  puuliik: string;
  diameeter: string;
}

export interface MootmisKand {
  id: string;
  puuliik: string;
  diameeter: string;
}

export interface MootmisData {
  pindala: string;
  rinne: string;
  puud: MootmisPuu[];
  kandud: MootmisKand[];
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
      mootmised: { pindala: '', rinne: 'esimene', puud: [], kandud: [] },
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
      mootmised: old.uldinfo.mootmised ?? def.uldinfo.mootmised,
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
