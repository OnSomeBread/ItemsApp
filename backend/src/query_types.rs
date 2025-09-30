use crate::database_types::{DeviceItemQueryParams, DeviceTaskQueryParams};
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
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            Self::UninitalizedDatabase(msg) => {
                (StatusCode::SERVICE_UNAVAILABLE, Json(msg)).into_response()
            }
            Self::BadSqlQuery(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(msg)).into_response()
            }
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, Json(msg)).into_response(),
        }
    }
}

pub trait AppErrorHandling<T> {
    fn bad_sql(self, name: &'static str) -> Result<T, AppError>;
}

impl<T> AppErrorHandling<T> for Result<T, sqlx::Error> {
    fn bad_sql(self, name: &'static str) -> Result<T, AppError> {
        self.map_err(|_| AppError::BadSqlQuery(format!("{name} Query did not run successfully")))
    }
}

#[derive(Serialize)]
pub struct ItemStats {
    pub items_count: i64,
    pub time_till_items_refresh_secs: u64,
}

#[derive(Serialize)]
pub struct TaskStats {
    pub tasks_completed_count: usize,
    pub tasks_count: i64,
    pub kappa_completed_count: usize,
    pub kappa_required_count: usize,
    pub lightkeeper_completed_count: usize,
    pub lightkeeper_required_count: usize,
    pub time_till_tasks_refresh_secs: u64,
}

#[derive(Deserialize)]
pub struct ItemQueryParams {
    pub search: Option<String>,
    pub sort_asc: Option<bool>,
    pub sort_by: Option<String>,
    pub item_type: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub save: Option<bool>,
}

// impl ItemQueryParams {
//     pub fn is_all_none(&self) -> bool {
//         self.search.is_none()
//             && self.asc.is_none()
//             && self.sort_by.is_none()
//             && self.item_type.is_none()
//     }
// }

impl From<DeviceItemQueryParams> for ItemQueryParams {
    fn from(parms: DeviceItemQueryParams) -> Self {
        Self {
            search: Some(parms.search),
            sort_asc: Some(parms.sort_asc),
            sort_by: Some(parms.sort_by),
            item_type: Some(parms.item_type),

            limit: None,
            offset: None,
            save: Some(true),
        }
    }
}

#[derive(Deserialize)]
pub struct ItemHistoryQueryParams {
    pub item_id: Option<String>,
}

#[derive(Deserialize)]
pub struct IdsQueryParams {
    pub ids: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct TaskQueryParams {
    pub search: Option<String>,
    pub is_kappa: Option<bool>,
    pub is_lightkeeper: Option<bool>,
    pub obj_type: Option<String>,
    pub trader: Option<String>,
    pub player_lvl: Option<u32>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub include_completed: Option<bool>,
    pub save: Option<bool>,
}

// impl TaskQueryParams {
//     pub fn is_all_none(&self) -> bool {
//         self.search.is_none()
//             && self.is_kappa.is_none()
//             && self.is_lightkeeper.is_none()
//             && self.obj_type.is_none()
//             && self.trader.is_none()
//             && self.player_lvl.is_none()
//     }
// }

impl From<DeviceTaskQueryParams> for TaskQueryParams {
    fn from(parms: DeviceTaskQueryParams) -> Self {
        Self {
            search: Some(parms.search),
            is_kappa: Some(parms.is_kappa),
            is_lightkeeper: Some(parms.is_lightkeeper),
            obj_type: Some(parms.obj_type),
            trader: Some(parms.trader),
            #[allow(clippy::cast_sign_loss)]
            player_lvl: Some(parms.player_lvl as u32),
            limit: None,
            offset: None,
            include_completed: None,
            save: Some(true),
        }
    }
}

pub const VALID_SORT_BY: &[&str] = &[
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

pub const VALID_ITEM_TYPES: &[&str] = &[
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

pub const VALID_OBJ_TYPES: &[&str] = &[
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

pub const VALID_TRADERS: &[&str] = &[
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
