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
  asc: boolean;
  sort_by: string;
  type: string;
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
  id: number;
  status: string;
  req_task_id: string;
  task_id: string;
};

export type Objective = {
  id: number;
  obj_type: string;
  obj_description: string;
  map_name: "";
  map_wiki: "";
  task_id: string;
};

export type Task = {
  _id: string;
  task_name: string;
  normalized_name: string;
  experience: number;
  min_player_level: number;
  trader: string;
  faction_name: string;
  kappa_required: boolean;
  lightkeeper_required: boolean;
  wiki: string;
  task_requirements: TaskRequirement[];
  objectives: Objective[];
};

// adjlist is defined as an object with all task ids mapped to an array of tasks that precede or succeed the key
// in graph theory its defined as a double ended adjacency list since at any point in the object can move forward or backwords if exists
export type TaskAdjList = {
  [key: string]: [string, boolean][];
};
