export type Sell = {
  item_id: string;
  id: number;
  price: number;
  currency: string;
  price_rub: number;
  trader_name: string;
  found_in_raid_required: boolean;
};

export type Buy = {
  item_id: string;
  id: number;
  price: number;
  currency: string;
  price_rub: number;
  trader_name: string;
  min_trader_level: number;
  buy_limit: number;
};

export type ItemHistory = {
  avg_24h_price: number;
  change_last_48h_percent: number;
  price_rub: number;
  recorded_time: Date;
  item_id: string;
};

export type Item = {
  _id: string;
  sells: Sell[];
  buys: Buy[];
  item_types: string;
  item_name: string;
  short_name: string;
  avg_24h_price: number;
  base_price: number;
  change_last_48h_percent: number;
  width: number;
  height: number;
  wiki: string;
  count: number;
  buy_from_flea_instant_profit: number;
  buy_from_trader_instant_profit: number;
  per_slot: number;
};

export type ItemQueryParams = {
  search: string;
  sort_asc: boolean;
  sort_by: string;
  item_type: string;
  limit: number;
  offset: number;
};

export type TaskQueryParams = {
  search: string;
  is_kappa: boolean;
  is_lightkeeper: boolean;
  player_lvl: number;
  obj_type: string;
  trader: string;
  limit: number;
  offset: number;
};

export type TaskRequirement = {
  status: string;
  req_task_id: string;
  task_id: string;
};

export type Objective = {
  obj_type: string;
  obj_description: string;
  map_name: "";
  map_wiki: "";
  task_id: string;
};

export type Task = {
  _id: string;
  task_name: string;
  min_player_level: number;
  trader: string;
  faction_name: string;
  kappa_required: boolean;
  lightkeeper_required: boolean;
  wiki: string;
  task_requirements: TaskRequirement[];
  objectives: Objective[];
};

export type TaskBase = {
  _id: string;
  task_name: string;
};

// adjlist is defined as an object with all task ids mapped to an array of tasks that precede or succeed the key
// in graph theory its defined as a double ended adjacency list since at any point in the object can move forward or backwords if exists
export type TaskAdjList = {
  [key: string]: [string, boolean][];
};

export type ItemStats = {
  items_count: number;
  time_till_items_refresh_secs: number;
};

export type TaskStats = {
  tasks_completed_count: number;
  tasks_count: number;
  kappa_completed_count: number;
  kappa_required_count: number;
  lightkeeper_completed_count: number;
  lightkeeper_required_count: number;
  time_till_tasks_refresh_secs: number;
};

export type AmmoStats = {
  ammo_count: number;
  time_till_ammo_refresh_secs: number;
};

export type Ammo = {
  accuracy_modifier: number;
  ammo_type: string;
  caliber: string;
  armor_damage: number;
  fragmentation_chance: number;
  damage: number;
  heavy_bleed_modifier: number;
  initial_speed: number;
  light_bleed_modifier: number;
  penetration_chance: number;
  penetration_power: number;
  penetration_power_deviation: number;
  projectile_count: number;
  recoil_modifier: number;
  ricochet_chance: number;
  stack_max_size: number;
  stamina_burn_per_damage: number;
  tracer: boolean;
  tracer_color: string;
  weight: number;
  item_id: string;
};

export type AmmoQueryParams = {
  search: string;
  sort_by: string;
  sort_asc: boolean;
  damage: number;
  penetration_power: number;
  initial_speed: number;
  ammo_type: string;
  limit: number;
  offset: number;
};
