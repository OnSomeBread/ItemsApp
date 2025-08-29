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
  itemtypes: ItemType[];
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

// adjlist is defined as an object with all task ids mapped to an array of tasks that precede or succeed the key
// in graph theory its defined as a double ended adjacency list since at any point in the object can move forward or backwords if exists
export type TaskAdjList = {
  [key: string]: [string, string][];
};
