export const DEFAULT_ITEM_QUERY_PARAMS = {
  search: "",
  asc: false,
  sort_by: "flea_market",
  type: "any",
  limit: 40,
  offset: 0,
};

export const DEFAULT_TASK_QUERY_PARAMS = {
  search: "",
  is_kappa: false,
  is_lightkeeper: false,
  player_lvl: 99,
  obj_type: "any",
  trader: "any",
  limit: 40,
  offset: 0,
};

// this is for ItemComponent to specifiy which item details should be listed
export const DISPLAY_ITEM_KEYS = [
  "name",
  "shortName",
  "basePrice",
  "icon",
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
  _id: "ID",
  item_name: "Name",
  short_name: "Short Name",
  base_price: "Base Price",
  avg_24h_price: "Average Price 24 hours",
  change_last_48h_percent: "Change Last 48 hours Percent",
  buy_from_flea_instant_profit: "Buy From Flea Sell To Trader Profit",
  buy_from_trader_instant_profit: "Buy From Trader Sell To Flea Profit",
  per_slot: "Per Slot To Sell",
  flea_market: "Flea Market Price",
};

export const ALL_TRADERS = {
  prapor: "Prapor",
  therapist: "Therapist",
  fence: "Fence",
  skier: "Skier",
  peacekeeper: "Peacekeeper",
  mechanic: "Mechanic",
  ragman: "Ragman",
  jaeger: "Jaeger",
  ref: "Ref",
  any: "Any",
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

export const dev: boolean = false;
export const API_BASE: string = dev ? "http://localhost:8000" : "";
export const DOCKER_BACKEND: string = dev
  ? "http://localhost:8000"
  : "http://backend:8000";

//(process.env.NEXT_PUBLIC_BACKEND_SERVER as string) ?? "";
