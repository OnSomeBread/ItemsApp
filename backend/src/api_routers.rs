use crate::database_types::*;
use crate::init_app_state::AppState;
use crate::item_routes::*;
use crate::query_types::{AppError::*, *};
use crate::task_routes::*;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::{Router, extract::State, response::Json, routing::get};
use axum_extra::extract::Query;
use redis::AsyncCommands;
use serde::{Serialize, de::DeserializeOwned};
use sqlx::types::Uuid;
use std::sync::{Arc, Mutex};
use tokio::try_join;

use std::time::Instant;

// checks if the database is initalized
async fn health(State(app_state): State<AppState>) -> Result<String, AppError> {
    let (items_count, tasks_count) = try_join!(
        sqlx::query_scalar!("SELECT COUNT(*) FROM Item").fetch_one(&app_state.pgpool),
        sqlx::query_scalar!("SELECT COUNT(*) FROM Task").fetch_one(&app_state.pgpool)
    )
    .map_err(|_| UninitalizedDatabase(String::from("The Database has not yet been initalized")))?;

    match items_count.unwrap_or(0) == 0 || tasks_count.unwrap_or(0) == 0 {
        true => Err(UninitalizedDatabase(String::from(
            "The Database has not yet been initalized",
        ))),
        false => Ok(String::from("Status Ok")),
    }
}

// gives data on different interesting stats about the data stored
async fn stats(State(app_state): State<AppState>) -> Result<Json<Stats>, AppError> {
    let (items_count, tasks_count, kappa_required_count, lightkeeper_required_count) = try_join!(
        sqlx::query_scalar!("SELECT COUNT(*) FROM Item").fetch_one(&app_state.pgpool),
        sqlx::query_scalar!("SELECT COUNT(*) FROM Task").fetch_one(&app_state.pgpool),
        sqlx::query_scalar!("SELECT COUNT(*) FROM Task WHERE kappa_required = True")
            .fetch_one(&app_state.pgpool),
        sqlx::query_scalar!("SELECT COUNT(*) FROM Task WHERE lightkeeper_required = True")
            .fetch_one(&app_state.pgpool)
    )
    .map_err(|_| BadSqlQuery(String::from("Stats Query did not run successfully")))?;

    let mut time_in_seconds_items = None;
    if let Ok(mutex_timer) = app_state.next_items_call_timer.lock() {
        time_in_seconds_items = mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64);
    }

    let mut time_in_seconds_tasks = None;
    if let Ok(mutex_timer) = app_state.next_items_call_timer.lock() {
        time_in_seconds_tasks = mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64);
    }

    Ok(Json(Stats {
        items_count: items_count.unwrap_or(0),
        tasks_count: tasks_count.unwrap_or(0),
        kappa_required_count: kappa_required_count.unwrap_or(0),
        lightkeeper_required_count: lightkeeper_required_count.unwrap_or(0),
        time_till_items_refresh_secs: time_in_seconds_items.unwrap_or(0),
        time_till_tasks_refresh_secs: time_in_seconds_tasks.unwrap_or(0),
    }))
}

// in app state there are timers to see when when a page refreshes the helps to unwrap it into a number in seconds
pub fn get_time_in_seconds(timer: &Arc<Mutex<Option<Instant>>>) -> Option<i64> {
    if let Ok(mutex_timer) = timer.lock() {
        mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64)
    } else {
        None
    }
}

trait Page: Send + Serialize + DeserializeOwned + Clone + 'static {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &Vec<String>,
    ) -> Result<Vec<Self>, AppError>;

    fn _id(&self) -> &str;

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>>;
}

impl Page for Item {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &Vec<String>,
    ) -> Result<Vec<Self>, AppError> {
        let mut txn = pgpool.begin().await.map_err(|_| {
            BadSqlQuery(String::from("Items By IDs Query did not run successfully"))
        })?;
        let items_from_db = sqlx::query_as!(
            ItemFromDB,
            "SELECT * FROM Item WHERE _id = ANY($1)",
            not_found_ids
        )
        .fetch_all(&mut *txn)
        .await
        .map_err(|_| BadSqlQuery(String::from("Items By IDs Query did not run successfully")))?;

        Ok(items_from_db_to_items(items_from_db, txn).await?)
    }

    fn _id(&self) -> &str {
        &self._id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>> {
        app_state.next_items_call_timer.clone()
    }
}
impl Page for Task {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &Vec<String>,
    ) -> Result<Vec<Self>, AppError> {
        let mut txn = pgpool.begin().await.map_err(|_| {
            BadSqlQuery(String::from("Tasks by ids Query did not run successfully"))
        })?;
        let tasks_from_db = sqlx::query_as!(
            TaskFromDB,
            "SELECT * FROM Task WHERE _id = ANY($1)",
            &not_found_ids
        )
        .fetch_all(&mut *txn)
        .await
        .map_err(|_| BadSqlQuery(String::from("Tasks by ids Query did not run successfully")))?;

        Ok(tasks_from_db_to_tasks(tasks_from_db, txn).await?)
    }

    fn _id(&self) -> &str {
        &self._id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>> {
        app_state.next_tasks_call_timer.clone()
    }
}

// returns ids from respective page
async fn get_page_by_ids<T: Page>(
    Query(query_parms): Query<IdsQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<T>>, AppError> {
    let ids = query_parms.ids.unwrap_or(Vec::new());

    let mut conn = app_state.redispool.get().await.ok();
    let mut not_found_ids = vec![];
    let mut found_values: Vec<T> = vec![];

    // check if there is a cache hit from redis cache
    if let Some(conn) = conn.as_mut() {
        for id in ids {
            let item: Option<Option<String>> = conn.get(&id).await.ok();
            if let Some(item) = item.flatten() {
                found_values.push(serde_json::from_str(&item).unwrap());
            } else {
                not_found_ids.push(id);
            }
        }
    } else {
        not_found_ids = ids;
    }

    let mut values: Vec<T> = T::fetch_by_ids(&app_state.pgpool, &not_found_ids).await?;

    let pool = app_state.redispool.clone();
    let tokio_values = values.clone();
    let api_call_timer = T::get_app_state_timer(&app_state);

    // store the items that have not been found in redis cache
    tokio::spawn(async move {
        if let Ok(mut conn) = pool.get().await {
            for value in tokio_values {
                if let Ok(data) = serde_json::to_string(&value) {
                    let value_id = value._id();
                    let _: redis::RedisResult<()> = conn.set(&value_id, data).await;

                    if let Some(time_in_seconds) = get_time_in_seconds(&api_call_timer) {
                        let _: redis::RedisResult<()> =
                            conn.expire(&value_id, time_in_seconds).await;
                    }
                }
            }
        }
    });

    // add back the found items
    values.extend(found_values);
    values.sort_by_key(|v| v._id().to_owned());

    Ok(Json(values))
}

pub struct Device(pub Option<Uuid>);

impl<S> FromRequestParts<S> for Device
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, AppError> {
        let device_id = parts
            .headers
            .get("device-id")
            .and_then(|h| h.to_str().ok())
            .and_then(|id_str| Uuid::parse_str(id_str).ok());

        Ok(Device(device_id))
    }
}

fn items_router() -> Router<AppState> {
    Router::new()
        .route("/items", get(get_items))
        .route("/item_history", get(get_item_history))
        .route("/item_ids", get(get_page_by_ids::<Item>))
}

fn tasks_router() -> Router<AppState> {
    Router::new()
        .route("/tasks", get(get_tasks))
        .route("/task_ids", get(get_page_by_ids::<Task>))
        .route("/adj_list", get(get_adj_list))
}

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/stats", get(stats))
        .merge(items_router())
        .merge(tasks_router())
}
