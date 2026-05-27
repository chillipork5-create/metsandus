export interface Lisa2Row {
  id: string;
  liik: string;
  grupp: number;
  diam: number;
  arv: number;
}

export interface Project {
  id: string;
  nimi: string;
  nr: string;
  aadress: string;
  katastr: string;
  pindala: string;
  koostaja: string;
  kuupaev: string;
  raieliik: string;
  puuliik: string;
  vanus: string;
  vanusJooksev?: string;
  invKuupaev?: string;
  regKuupaev?: string;
  korgus: string;
  diam: string;
  g: string;
  taius: string;
  eraldisPindala?: string;
  kkt?: string;
  bonit?: string;
  kaitseala?: string;
  markused?: string;
  lisa2rows: Lisa2Row[];
  lisa3rows: Lisa2Row[];
  lisa2kordaja: string;
  kahju: string;
  
  // Lisa 3 parameters
  lisa3puuliik?: string;
  lisa3vanus?: string;
  lisa3alammaar?: string;
  lisa3tegelik?: string;
  lisa3measuredArea?: string;
  lisa3perimeter?: string;
  lisa3kordaja?: string;
  lisa3coords?: string; // Serialized GeoPoint[]

  // Täiuse arvutamise parameters
  taiusSpecies?: string;
  taiusHeight?: string;
  taiusG?: string;

  // Känd converter parameters
  kannuSpecies?: string;
  kannudStump?: string;
  kannud13?: string;

  // Tagavara parameters
  tagavaraSpecies?: string;
  tagavaraG?: string;
  tagavaraH?: string;
}

export type TabType = 'lisa2' | 'lisa3' | 'kannu' | 'taius' | 'maht' | 'project';
