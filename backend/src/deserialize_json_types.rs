use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuyForVendor {
    #[serde(rename = "name")]
    pub trader_name: String,
    pub min_trader_level: Option<i32>,
    pub buy_limit: Option<i32>,
}

#[derive(Deserialize, Serialize)]
pub struct BuyFor {
    pub price: i32,
    pub currency: String,
    #[serde(rename = "priceRUB")]
    pub price_rub: i32,
    pub vendor: BuyForVendor,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SellForVendor {
    #[serde(rename = "name")]
    pub trader_name: String,
    pub sell_offer_fee_rate: Option<f32>,
    pub sell_requirement_fee_rate: Option<f32>,
    pub found_in_raid_required: Option<bool>,
}

#[derive(Deserialize, Serialize)]
pub struct SellFor {
    pub price: i32,
    pub currency: String,
    #[serde(rename = "priceRUB")]
    pub price_rub: i32,
    pub vendor: SellForVendor,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    #[serde(rename = "id")]
    pub _id: String,
    #[serde(rename = "name")]
    pub item_name: String,
    pub short_name: String,
    pub avg_24h_price: Option<i32>,
    pub base_price: i32,
    pub change_last_48h_percent: Option<f32>,
    pub width: i32,
    pub height: i32,
    #[serde(rename = "link")]
    pub wiki: String,
    #[serde(rename = "types")]
    pub item_types: Vec<String>,
    #[serde(rename = "buyFor")]
    pub buys: Vec<BuyFor>,
    #[serde(rename = "sellFor")]
    pub sells: Vec<SellFor>,
}

pub const ITEMS_QUERY: &str = "
{
    items {
        id
        name
        shortName
        types
        avg24hPrice
        basePrice
        width
        height
        changeLast48hPercent
        link
        sellFor {
            price
            currency
            priceRUB
            vendor {
                name
                ... on FleaMarket {
                    foundInRaidRequired
                }
            }
        }
        buyFor {
            price
            currency
            priceRUB
            vendor {
                name
                ... on TraderOffer {
                    minTraderLevel
                    buyLimit
                }
            }
        }
    }
}
";

#[derive(Deserialize, Serialize)]
pub struct Map {
    pub name: String,
    pub wiki: String,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct NeededItem {
    #[serde(rename = "id")]
    pub _id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Objective {
    #[serde(rename = "type")]
    pub obj_type: String,
    #[serde(rename = "description")]
    pub obj_description: String,
    pub maps: Vec<Map>,
    pub count: Option<i32>,
    pub items: Option<Vec<NeededItem>>,
}

#[derive(Deserialize, Serialize)]
pub struct ReqTaskId {
    pub id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRequirement {
    pub status: Vec<String>,
    #[serde(rename = "task")]
    pub req_task_id: ReqTaskId,
}

#[derive(Deserialize, Serialize)]
pub struct Trader {
    pub name: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    #[serde(rename = "id")]
    pub _id: String,
    #[serde(rename = "name")]
    pub task_name: String,
    pub min_player_level: i32,
    pub trader: Trader,
    pub faction_name: String,
    pub kappa_required: bool,
    pub lightkeeper_required: bool,
    #[serde(rename = "wikiLink")]
    pub wiki: String,
    pub objectives: Vec<Objective>,
    #[serde(rename = "taskRequirements")]
    pub task_requirements: Vec<TaskRequirement>,
}

pub const TASKS_QUERY: &str = "
{
    tasks {
        taskRequirements {
            status
            task {
                id
            }
        }
        name
        id
        kappaRequired
        lightkeeperRequired
        objectives {
            type
            description
            maps {
                name
                wiki
            }
            ... on TaskObjectiveItem {
                items {
                id
                }
                count
            }
        }
        minPlayerLevel
        factionName
        wikiLink
        trader {
            name
        }
    }
}
";

#[derive(Deserialize, Serialize)]
pub struct ItemId {
    #[serde(rename = "id")]
    pub _id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ammo {
    pub accuracy_modifier: f32,
    pub ammo_type: Option<String>,
    pub caliber: String,
    pub armor_damage: Option<i32>,
    pub fragmentation_chance: Option<f32>,
    pub damage: Option<i32>,
    pub heavy_bleed_modifier: Option<f32>,
    pub initial_speed: f32,
    pub light_bleed_modifier: Option<f32>,
    pub penetration_chance: Option<f32>,
    pub penetration_power: Option<i32>,
    pub penetration_power_deviation: f32,
    pub projectile_count: i32,
    pub recoil_modifier: f32,
    pub ricochet_chance: Option<f32>,
    pub stack_max_size: Option<i32>,
    pub stamina_burn_per_damage: f32,
    pub tracer: Option<bool>,
    pub tracer_color: Option<String>,
    pub weight: Option<f32>,
    pub item: Option<ItemId>,
}

pub const AMMO_QUERY: &str = "
{
  ammo {
    accuracyModifier
    ammoType
    caliber
    armorDamage
    fragmentationChance
    damage
    heavyBleedModifier
    initialSpeed
    lightBleedModifier
    penetrationChance
    penetrationPower
    penetrationPowerDeviation
    projectileCount
    recoilModifier
    ricochetChance
    stackMaxSize
    staminaBurnPerDamage
    tracer
    tracerColor
    weight
    item {
      id
    }
  }
}
";
