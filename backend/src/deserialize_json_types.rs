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

#[derive(Deserialize, Serialize)]
pub struct Map {
    pub name: String,
    pub wiki: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Objective {
    #[serde(rename = "type")]
    pub obj_type: String,
    #[serde(rename = "description")]
    pub obj_description: String,
    pub maps: Vec<Map>,
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
    pub normalized_name: String,
    pub experience: i32,
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

pub const ITEMS_QUERY: &'static str = r#"
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
"#;

pub const TASKS_QUERY: &'static str = r#"
{
    tasks {
        taskRequirements {
            status
            task {
                id
            }
        }
        name
        experience
        id
        kappaRequired
        lightkeeperRequired
        objectives {
            id
            type
            description
            maps {
                id
                name
                description
                normalizedName
                players
                wiki
            }
        }
        minPlayerLevel
        factionName
        normalizedName
        wikiLink
        trader {
            name
        }
    }
}
"#;
