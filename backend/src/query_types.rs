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

const fn default_true() -> bool {
    true
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
    #[serde(default)]
    pub search: String,
    #[serde(default)]
    pub sort_asc: bool,
    #[serde(default)]
    pub sort_by: String,
    #[serde(default)]
    pub item_type: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
    #[serde(default = "default_true")]
    pub save: bool,
}

#[derive(Deserialize)]
pub struct ItemHistoryQueryParams {
    pub item_id: Option<String>,
}

#[derive(Deserialize)]
pub struct IdsQueryParams {
    pub ids: Option<Vec<String>>,
}

const fn default_player_lvl() -> u32 {
    99
}

const fn default_limit() -> u32 {
    30
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Deserialize)]
pub struct TaskQueryParams {
    #[serde(default)]
    pub search: String,
    #[serde(default)]
    pub is_kappa: bool,
    #[serde(default)]
    pub is_lightkeeper: bool,
    #[serde(default)]
    pub obj_type: String,
    #[serde(default)]
    pub trader: String,
    #[serde(default = "default_player_lvl")]
    pub player_lvl: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
    #[serde(default = "default_true")]
    pub include_completed: bool,
    #[serde(default = "default_true")]
    pub save: bool,
}

#[derive(Deserialize)]
pub struct AmmoQueryParams {
    #[serde(default)]
    pub search: String,
    #[serde(default)]
    pub sort_by: String,
    #[serde(default)]
    pub sort_asc: bool,
    #[serde(default)]
    pub damage: i32,
    #[serde(default)]
    pub penetration_power: i32,
    #[serde(default)]
    pub initial_speed: f32,
    #[serde(default)]
    pub ammo_type: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
    #[serde(default = "default_true")]
    pub save: bool,
}

// pub const ITEM_ENABLE_FLEA_FOR: &[&str] = &[
//     "flea_market",
//     "buy_from_flea_instant_profit",
//     "buy_from_trader_instant_profit",
//     "per_slot",
//     "avg_24h_price",
//     "change_last_48h_percent",
// ];

pub const VALID_ITEM_SORT_BY: &[&str] = &[
    "_id",
    "item_name",
    "short_name",
    "base_price",
    "avg_24h_price",
    // right now the data from api just makes this either 0.0 or null so its not usable as of now
    //    "change_last_48h_percent",
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

pub const VALID_AMMO_SORT_BY: &[&str] = &[
    "accuracy_modifier",
    "ammo_type",
    "caliber",
    "armor_damage",
    "fragmentation_chance",
    "damage",
    "heavy_bleed_modifier",
    "initial_speed",
    "light_bleed_modifier",
    "penetration_chance",
    "penetration_power",
    "penetration_power_deviation",
    "projectile_count",
    "recoil_modifier",
    "ricochet_chance",
    "stack_max_size",
    "stamina_burn_per_damage",
    "tracer",
    "tracer_color",
    "weight",
    "item_id",
];

pub const VALID_AMMO_TYPE: &[&str] = &["bullet", "buckshot", "grenade", "flashbang"];
