use redis_macros::{FromRedisValue, ToRedisArgs};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::types::chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone, sqlx::Type)]
pub struct BuyFor {
    #[serde(skip)]
    pub id: i32,
    pub price: i32,
    pub currency: String,
    pub price_rub: i32,
    pub trader_name: String,
    pub min_trader_level: i32,
    pub buy_limit: i32,
    pub item_id: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone, sqlx::Type)]
pub struct SellFor {
    #[serde(skip)]
    pub id: i32,
    pub price: i32,
    pub currency: String,
    pub price_rub: i32,
    pub trader_name: String,
    pub found_in_raid_required: bool,
    pub item_id: String,
}

#[derive(sqlx::FromRow)]
pub struct ItemFromDB {
    pub _id: String,
    pub item_name: String,
    pub short_name: String,
    pub avg_24h_price: i32,
    pub base_price: i32,
    pub change_last_48h_percent: f32,
    pub width: i32,
    pub height: i32,
    pub wiki: String,
    pub item_types: String,
    pub buy_from_flea_instant_profit: i32,
    pub buy_from_trader_instant_profit: i32,
    pub per_slot: i32,
    pub is_flea: bool,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct Item {
    pub _id: String,
    pub item_name: String,
    pub short_name: String,
    pub avg_24h_price: i32,
    pub base_price: i32,
    pub change_last_48h_percent: f32,
    pub width: i32,
    pub height: i32,
    pub wiki: String,
    pub item_types: String,
    pub buy_from_flea_instant_profit: i32,
    pub buy_from_trader_instant_profit: i32,
    pub per_slot: i32,
    pub is_flea: bool,
    pub buys: Vec<BuyFor>,
    pub sells: Vec<SellFor>,
}

#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs, Clone, sqlx::FromRow)]
#[allow(unused)]
pub struct ItemBase {
    pub _id: String,
    pub item_name: String,
}

impl From<ItemFromDB> for Item {
    fn from(item_from_db: ItemFromDB) -> Self {
        Self {
            _id: item_from_db._id,
            item_name: item_from_db.item_name,
            short_name: item_from_db.short_name,
            avg_24h_price: item_from_db.avg_24h_price,
            base_price: item_from_db.base_price,
            change_last_48h_percent: item_from_db.change_last_48h_percent,
            width: item_from_db.width,
            height: item_from_db.height,
            wiki: item_from_db.wiki,
            item_types: item_from_db.item_types,
            buy_from_flea_instant_profit: item_from_db.buy_from_flea_instant_profit,
            buy_from_trader_instant_profit: item_from_db.buy_from_trader_instant_profit,
            per_slot: item_from_db.per_slot,
            is_flea: item_from_db.is_flea,
            buys: vec![],
            sells: vec![],
        }
    }
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct Objective {
    #[serde(skip)]
    #[allow(dead_code)]
    pub id: i32,
    pub obj_type: String,
    pub obj_description: String,
    pub map_name: String,
    pub map_wiki: String,
    pub task_id: String,
    #[serde(skip)]
    #[allow(dead_code)]
    pub count: i32,
    #[serde(skip)]
    #[allow(dead_code)]
    pub needed_item_ids: Vec<String>,
}

#[derive(sqlx::FromRow)]
pub struct NeededItemsDB {
    pub count: i32,
    pub needed_item_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct TaskRequirement {
    #[serde(skip)]
    #[allow(dead_code)]
    pub id: i32,
    pub status: String,
    pub req_task_id: String,
    pub task_id: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TaskFromDB {
    pub _id: String,
    pub task_name: String,
    pub min_player_level: i32,
    pub trader: String,
    pub faction_name: String,
    pub kappa_required: bool,
    pub lightkeeper_required: bool,
    pub wiki: String,
}

#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs, Clone)]
pub struct Task {
    pub _id: String,
    pub task_name: String,
    pub min_player_level: i32,
    pub trader: String,
    pub faction_name: String,
    pub kappa_required: bool,
    pub lightkeeper_required: bool,
    pub wiki: String,
    pub objectives: Vec<Objective>,
    pub task_requirements: Vec<TaskRequirement>,
}

#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs, Clone, sqlx::FromRow)]
pub struct TaskBase {
    pub _id: String,
    pub task_name: String,
}

impl From<TaskFromDB> for Task {
    fn from(task_from_db: TaskFromDB) -> Self {
        Self {
            _id: task_from_db._id,
            task_name: task_from_db.task_name,
            min_player_level: task_from_db.min_player_level,
            trader: task_from_db.trader,
            faction_name: task_from_db.faction_name,
            kappa_required: task_from_db.kappa_required,
            lightkeeper_required: task_from_db.lightkeeper_required,
            wiki: task_from_db.wiki,
            objectives: vec![],
            task_requirements: vec![],
        }
    }
}

#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs, Clone, sqlx::FromRow)]
pub struct SavedItemData {
    pub price_rub: i32,
    pub recorded_time: DateTime<Utc>,
}

#[derive(sqlx::FromRow, Serialize, Deserialize)]
pub struct DeviceItemQueryParams {
    #[serde(skip)]
    #[allow(dead_code)]
    pub id: Uuid,
    pub search: String,
    pub sort_asc: bool,
    pub sort_by: String,
    pub item_type: String,
}

#[derive(sqlx::FromRow, Serialize, Deserialize)]
pub struct DeviceTaskQueryParams {
    #[serde(skip)]
    #[allow(dead_code)]
    pub id: Uuid,
    pub search: String,
    pub is_kappa: bool,
    pub is_lightkeeper: bool,
    pub player_lvl: i32,
    pub obj_type: String,
    pub trader: String,
}

#[derive(sqlx::FromRow, Serialize, Deserialize)]
pub struct DeviceAmmoQueryParams {
    #[serde(skip)]
    #[allow(dead_code)]
    pub id: Uuid,
    pub search: String,
    pub sort_by: String,
    pub sort_asc: bool,
    pub damage: i32,
    pub penetration_power: i32,
    pub initial_speed: f32,
    pub ammo_type: String,
}

// #[derive(sqlx::FromRow)]
// pub struct DevicePreferences {
//     pub id: Uuid,
//     pub completed_tasks: Vec<String>,
//     pub last_visited: DateTime<Utc>,
// }

#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs, Clone, sqlx::FromRow)]
pub struct Ammo {
    pub accuracy_modifier: f32,
    pub ammo_type: String,
    pub caliber: String,
    pub armor_damage: i32,
    pub fragmentation_chance: f32,
    pub damage: i32,
    pub heavy_bleed_modifier: f32,
    pub initial_speed: f32,
    pub light_bleed_modifier: f32,
    pub penetration_chance: f32,
    pub penetration_power: i32,
    pub penetration_power_deviation: f32,
    pub projectile_count: i32,
    pub recoil_modifier: f32,
    pub ricochet_chance: f32,
    pub stack_max_size: i32,
    pub stamina_burn_per_damage: f32,
    pub tracer: bool,
    pub tracer_color: String,
    pub weight: f32,
    pub item_id: String,
}
