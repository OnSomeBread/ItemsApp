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
