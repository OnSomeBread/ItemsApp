use redis_macros::{FromRedisValue, ToRedisArgs};
use serde::{Deserialize, Serialize};
use sqlx::types::chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct BuyFor {
    pub id: i32,
    pub price: i32,
    pub currency: String,
    pub price_rub: i32,
    pub trader_name: String,
    pub min_trader_level: i32,
    pub buy_limit: i32,
    pub item_id: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct SellFor {
    pub id: i32,
    pub price: i32,
    pub currency: String,
    pub price_rub: i32,
    pub trader_name: String,
    pub sell_offer_fee_rate: f32,
    pub sell_requirement_fee_rate: f32,
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
}

#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs, Clone)]
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
    pub buys: Vec<BuyFor>,
    pub sells: Vec<SellFor>,
}

impl From<ItemFromDB> for Item {
    fn from(item_from_db: ItemFromDB) -> Self {
        Item {
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
            buys: vec![],
            sells: vec![],
        }
    }
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct Objective {
    pub id: i32,
    pub obj_type: String,
    pub obj_description: String,
    pub map_name: String,
    pub map_wiki: String,
    pub task_id: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, FromRedisValue, ToRedisArgs, Clone)]
pub struct TaskRequirement {
    pub id: i32,
    pub status: String,
    pub req_task_id: String,
    pub task_id: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TaskFromDB {
    pub _id: String,
    pub task_name: String,
    pub normalized_name: String,
    pub experience: i32,
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
    pub normalized_name: String,
    pub experience: i32,
    pub min_player_level: i32,
    pub trader: String,
    pub faction_name: String,
    pub kappa_required: bool,
    pub lightkeeper_required: bool,
    pub wiki: String,
    pub objectives: Vec<Objective>,
    pub task_requirements: Vec<TaskRequirement>,
}

impl From<TaskFromDB> for Task {
    fn from(task_from_db: TaskFromDB) -> Self {
        Task {
            _id: task_from_db._id,
            task_name: task_from_db.task_name,
            normalized_name: task_from_db.normalized_name,
            experience: task_from_db.experience,
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

#[derive(Serialize, sqlx::FromRow)]
pub struct SavedItemData {
    pub id: i32,
    pub avg_24h_price: i32,
    pub change_last_48h_percent: f32,
    pub price_rub: i32,
    pub recorded_time: DateTime<Utc>,
    pub item_id: String,
}
