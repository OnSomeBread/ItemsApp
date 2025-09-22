use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use serde::{Deserialize, Serialize};

// standard error handling for all endpoints
#[derive(Debug, serde::Serialize)]
pub enum AppError {
    // FailedRedisConnection(String),
    UninitalizedDatabase(String),
    BadSqlQuery(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::UninitalizedDatabase(msg) => {
                (StatusCode::SERVICE_UNAVAILABLE, Json(msg)).into_response()
            }
            AppError::BadSqlQuery(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(msg)).into_response()
            } // AppError::FailedRedisConnection(msg) => {
              //     (StatusCode::INTERNAL_SERVER_ERROR, Json(msg)).into_response()
              // }
        }
    }
}

// return type for /stats
#[derive(Serialize)]
pub struct Stats {
    pub items_count: i64,
    pub tasks_count: i64,
    pub kappa_required_count: i64,
    pub lightkeeper_required_count: i64,
    pub time_till_items_refresh_secs: i64,
    pub time_till_tasks_refresh_secs: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemQueryParams {
    pub search: Option<String>,
    pub asc: Option<bool>,
    pub sort_by: Option<String>,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemHistoryQueryParams {
    pub item_id: Option<String>,
}

#[derive(Deserialize)]
pub struct IdsQueryParams {
    pub ids: Option<Vec<String>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskQueryParams {
    pub search: Option<String>,
    pub is_kappa: Option<bool>,
    pub is_lightkeeper: Option<bool>,
    pub obj_type: Option<String>,
    pub trader: Option<String>,
    pub player_lvl: Option<u32>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub ids: Option<Vec<String>>,
}

pub const VALID_SORT_BY: &'static [&'static str] = &[
    "_id",
    "item_name",
    "short_name",
    "base_price",
    "avg_24h_price",
    "change_last_48h_percent",
    "buy_from_flea_instant_profit",
    "buy_from_trader_instant_profit",
    "per_slot",
    "flea_market",
];

pub const VALID_ITEM_TYPES: &'static [&'static str] = &[
    "any",
    "ammo",
    "ammobox",
    "armor",
    "armorplate",
    "backpack",
    "barter",
    "container",
    "glasses",
    "grenade",
    "gun",
    "headphones",
    "helmet",
    "injectors",
    "keys",
    "markedonly",
    "meds",
    "noflea",
    "pistolgrip",
    "provisions",
    "rig",
    "suppressor",
    "mods",
    "preset",
    "wearable",
];

pub const VALID_OBJ_TYPES: &'static [&'static str] = &[
    "shoot",
    "plantquestitem",
    "giveitem",
    "taskstatus",
    "extract",
    "givequestitem",
    "finditem",
    "plantitem",
    "findquestitem",
    "sellitem",
    "buildweapon",
    "mark",
    "useitem",
    "traderlevel",
    "visit",
    "traderstanding",
    "experience",
    "skill",
];

pub const VALID_TRADERS: &'static [&'static str] = &[
    "prapor",
    "therapist",
    "fence",
    "skier",
    "peacekeeper",
    "mechanic",
    "ragman",
    "jaeger",
    "ref",
];
