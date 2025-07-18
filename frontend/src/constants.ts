export interface Sell {
  id: number;
  price: number;
  source: string;
  itemid: string;
}

export interface Type {
  id: number;
  name: string;
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
  count: number;
}

export const DISPLAY_ITEM_KEYS = [
  "name",
  "shortName",
  "basePrice",
  "traders",
  "fleaMarket",
];

export const ALL_TYPES = {
  any: "Any",
  ammo: "Ammo",
  ammoBox: "Ammo Box",
  armor: "Armor",
  armorPlate: "Armor Plate",
  backpack: "Backpack",
  barter: "Barter",
  container: "Container",
  glasses: "Glasses",
  grenade: "Grenade",
  gun: "Gun",
  headphones: "Headphones",
  helmet: "Helmet",
  injectors: "Injectors",
  keys: "Keys",
  markedOnly: "Marked Room Only",
  meds: "Medications",
  noFlea: "No Flea Market",
  pistolGrip: "Pistol Grip",
  provisions: "Provisions",
  rig: "Rig",
  suppressor: "Suppressor",
  mods: "Weapon Mod",
  preset: "Weapon Preset",
  wearable: "Wearable",
};

export const ALL_TRADERS = [
  "fence",
  "fleaMarket",
  "jaeger",
  "mechanic",
  "peacekeeper",
  "prapor",
  "ragman",
  "ref",
  "skier",
  "therapist",
];
