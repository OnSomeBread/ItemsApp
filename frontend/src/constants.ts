export interface Sell {
  id:number;
  price:number;
  source:string;
  itemid:string
}

export interface Type {
  id:number;
  name:string;
}

export interface Item {
  _id: string;
  sells: Sell[];
  types: Type[];
  name: string;
  shortName: string;
  avg24hPrice: number;
  basePrice: number;
  changeLast48hPercent: number;
  width: number;
  height: number;
  link: string;
}

export const ALLTYPES = ['any','ammo', 'ammoBox', 'armor',
  'armorPlate', 'backpack',   'barter',
  'container',  'glasses',    'grenade',
  'gun',        'headphones', 'helmet',
  'injectors',  'keys',       'markedOnly',
  'meds',       'mods',       'noFlea',
  'pistolGrip', 'preset',     'provisions',
  'rig',        'suppressor', 'wearable']

 export const ALLTRADERS = ['fence', 'fleaMarket',
  'jaeger',      'mechanic',
  'peacekeeper', 'prapor',
  'ragman',      'ref',
  'skier',       'therapist']