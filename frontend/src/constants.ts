export const ON_MOBILE: boolean =
  window.matchMedia("(max-width: 767px)").matches;

export type Sell = {
  id: number;
  price: number;
  source: string;
  itemid: string;
};

export type ItemType = {
  id: number;
  name: string;
};

export type ItemHistory = {
  _id: string;
  avg24hPrice: number;
  changeLast48hPercent: number;
  fleaMarket: number;
  time: Date;
};

export type Item = {
  _id: string;
  sells: Sell[];
  types: ItemType[];
  name: string;
  shortName: string;
  avg24hPrice: number;
  basePrice: number;
  changeLast48hPercent: number;
  width: number;
  height: number;
  link: string;
  count: number;
};

export type ItemQueryParams = {
  search: string;
  asc: string;
  sortBy: string;
  type: string;
  limit: number;
  offset: number;
};

export const DEFAULT_ITEM_QUERY_PARAMS = {
  search: "",
  asc: "-",
  sortBy: "fleaMarket",
  type: "any",
  limit: ON_MOBILE ? 10 : 50,
  offset: 0,
};

export type TaskQueryParams = {
  search: string;
  isKappa: boolean;
  isLightKeeper: boolean;
  playerLvl: number;
  objType: string;
  trader: string;
  limit: number;
  offset: number;
};

export const DEFAULT_TASK_QUERY_PARAMS = {
  search: "",
  isKappa: false,
  isLightKeeper: false,
  playerLvl: 99,
  objType: "any",
  trader: "any",
  limit: 50,
  offset: 0,
};

// this is for ItemComponent to specifiy which item details should be listed
export const DISPLAY_ITEM_KEYS = [
  "name",
  "shortName",
  "basePrice",
  "traders",
  "fleaMarket",
];

export const ALL_ITEM_TYPES = {
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

export const ALL_ITEM_SORTBY = {
  name: "Name",
  shortName: "Short Name",
  basePrice: "Base Price",
  avg24hPrice: "Average Price 24 hours",
  changeLast48hPercent: "Change Last 48 hours Percent",
  fleaMarket: "Flea Market Price",
};

export type TaskRequirement = {
  // this isnt a game id which is why its named differently
  id: number;
  status: string;
  reqTaskId: string;
};

export type Map = {
  _id: string;
  name: string;
  normalizedName: string;
  players: string;
  description: string;
  wiki: string;
};

export type Objective = {
  _id: string;
  reqTaskId: string;
  objType: string;
  description: string;
  maps: Map[];
};

export type Task = {
  _id: string;
  name: string;
  normalizedName: string;
  experience: number;
  minPlayerLevel: number;
  trader: string;
  factionName: string;
  kappaRequired: boolean;
  lightkeeperRequired: boolean;
  wiki: string;
  taskRequirements: TaskRequirement[];
  objectives: Objective[];
};

export const ALL_TRADERS = {
  any: "Any",
  prapor: "Prapor",
  therapist: "Therapist",
  fence: "Fence",
  skier: "Skier",
  peacekeeper: "Peacekeeper",
  mechanic: "Mechanic",
  ragman: "Ragman",
  jaeger: "Jaeger",
  ref: "Ref",
};

export const ALL_TASK_OBJECTIVE_TYPES = {
  any: "Any",
  shoot: "Shoot",
  plantQuestItem: "Plant Quest Item",
  giveItem: "Give Item",
  taskStatus: "Task Status",
  extract: "Extract",
  giveQuestItem: "Give Quest Item",
  findItem: "Find Item",
  plantItem: "Plant Item",
  findQuestItem: "Find Quest Item",
  sellItem: "Sell Item",
  buildWeapon: "Build Weapon",
  mark: "Mark",
  useItem: "Use Item",
  traderLevel: "Trader Level",
  visit: "Visit",
  traderStanding: "Trader Standing",
  experience: "Experience",
  skill: "Skill",
};

export const BACKEND_ADDRESS: string = import.meta.env
  .VITE_BACKEND_SERVER as string;
