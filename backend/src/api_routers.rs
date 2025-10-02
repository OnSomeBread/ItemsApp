use crate::database_types::{
    Item, ItemBase, ItemFromDB, SavedItemData, Task, TaskBase, TaskFromDB,
};
use crate::init_app_state::AppState;
use crate::item_routes::{
    get_device_item_query_parms, get_item_history, get_items, item_stats, items_from_db_to_items,
};
use crate::query_types::{
    AppError, AppError::UninitalizedDatabase, AppErrorHandling, IdsQueryParams,
};
use crate::task_routes::{
    clear_completed_tasks, get_adj_list, get_completed_tasks, get_device_task_query_parms,
    get_tasks, get_tasks_base, set_completed_task, task_stats, tasks_from_db_to_tasks,
};
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::{Router, extract::State, response::Json, routing::get, routing::post};
use axum_extra::extract::Query;
use bb8_redis::RedisConnectionManager;
use bb8_redis::bb8::Pool;
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

    if items_count.unwrap_or(0) == 0 || tasks_count.unwrap_or(0) == 0 {
        Err(UninitalizedDatabase(String::from(
            "The Database has not yet been initalized",
        )))
    } else {
        Ok(String::from("Status Ok"))
    }
}

// in app state there are timers to see when when a page refreshes the helps to unwrap it into a number in seconds
pub fn get_time_in_seconds(timer: &Arc<Mutex<Option<Instant>>>) -> Option<i64> {
    #[allow(clippy::cast_possible_wrap)]
    timer.lock().map_or(None, |mutex_timer| {
        mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64)
    })
}

pub trait Page: Send + Serialize + DeserializeOwned + Clone + 'static {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError>;

    fn id(&self) -> &str;

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>>;
}

impl Page for Item {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError> {
        let mut txn = pgpool.begin().await.bad_sql("Items by Ids")?;
        let items_from_db = sqlx::query_as!(
            ItemFromDB,
            "SELECT * FROM Item WHERE _id = ANY($1)",
            not_found_ids
        )
        .fetch_all(&mut *txn)
        .await
        .bad_sql("Items by Ids")?;

        items_from_db_to_items(items_from_db, txn).await
    }

    fn id(&self) -> &str {
        &self._id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>> {
        app_state.next_items_call_timer.clone()
    }
}

impl Page for ItemBase {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError> {
        sqlx::query_as!(
            ItemBase,
            "SELECT _id, item_name FROM Item WHERE _id = ANY($1)",
            not_found_ids
        )
        .fetch_all(pgpool)
        .await
        .bad_sql("ItemBase by Ids")
    }

    fn id(&self) -> &str {
        &self._id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>> {
        app_state.next_items_call_timer.clone()
    }
}

impl Page for Task {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError> {
        let mut txn = pgpool.begin().await.bad_sql("Tasks by Ids")?;
        let tasks_from_db = sqlx::query_as!(
            TaskFromDB,
            "SELECT * FROM Task WHERE _id = ANY($1)",
            &not_found_ids
        )
        .fetch_all(&mut *txn)
        .await
        .bad_sql("Tasks by Ids")?;

        tasks_from_db_to_tasks(tasks_from_db, txn).await
    }

    fn id(&self) -> &str {
        &self._id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>> {
        app_state.next_tasks_call_timer.clone()
    }
}

impl Page for TaskBase {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError> {
        sqlx::query_as!(
            TaskBase,
            "SELECT _id, task_name FROM Task WHERE _id = ANY($1)",
            &not_found_ids
        )
        .fetch_all(pgpool)
        .await
        .bad_sql("TaskBase by Ids")
    }

    fn id(&self) -> &str {
        &self._id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<Mutex<Option<Instant>>> {
        app_state.next_tasks_call_timer.clone()
    }
}

pub async fn fetch_tasks_by_ids<T: Page>(
    app_state: &AppState,
    ids: Vec<String>,
) -> Result<Vec<T>, AppError> {
    let mut conn = app_state.redispool.get().await.ok();
    let mut not_found_ids = vec![];
    let mut found_values: Vec<T> = vec![];

    // check if there is a cache hit from redis cache
    if let Some(conn) = conn.as_mut() {
        for id in ids {
            let values: Option<Option<String>> = conn.get(&id).await.ok();
            if let Some(value_str) = values.flatten() {
                if let Ok(val) = serde_json::from_str(&value_str) {
                    found_values.push(val);
                }
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
    let api_call_timer = T::get_app_state_timer(app_state);

    // store the items that have not been found in redis cache
    tokio::spawn(async move {
        if let Ok(mut conn) = pool.get().await {
            for value in tokio_values {
                if let Ok(data) = serde_json::to_string(&value) {
                    let value_id = value.id();
                    let _: redis::RedisResult<()> = conn.set(value_id, data).await;

                    if let Some(time_in_seconds) = get_time_in_seconds(&api_call_timer) {
                        let _: redis::RedisResult<()> =
                            conn.expire(value_id, time_in_seconds).await;
                    }
                }
            }
        }
    });

    // add back the found items
    values.extend(found_values);
    values.sort_by(|a, b| a.id().cmp(b.id()));
    Ok(values)
}

// returns ids from respective page
async fn get_page_by_ids<T: Page>(
    Query(query_parms): Query<IdsQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<T>>, AppError> {
    let ids = query_parms.ids.unwrap_or(Vec::new());

    Ok(Json(fetch_tasks_by_ids(&app_state, ids).await?))
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
            .get("x-device-id")
            .and_then(|h| h.to_str().ok())
            .and_then(|id_str| Uuid::parse_str(id_str).ok());

        Ok(Self(device_id))
    }
}

pub trait RedisCache: DeserializeOwned + Serialize + Send + 'static {
    async fn get_vec(
        cache_key: &String,
        redispool: &Pool<RedisConnectionManager>,
    ) -> Result<Option<Vec<Self>>, AppError> {
        let mut conn = redispool.get().await.ok();

        if let Some(conn) = conn.as_mut() {
            let value: Option<Option<String>> = conn.get(cache_key).await.ok();
            if let Some(value_str) = value.flatten()
                && let Ok(val) = serde_json::from_str(&value_str)
            {
                return Ok(val);
            }
        }

        Ok(None)
    }

    fn set_vec(
        cache_key: String,
        input_vec: Vec<Self>,
        redispool: Pool<RedisConnectionManager>,
        api_call: Arc<Mutex<Option<Instant>>>,
    ) {
        tokio::spawn(async move {
            if let Ok(mut conn) = redispool.get().await
                && let Ok(data) = serde_json::to_string(&input_vec)
            {
                let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                if let Some(time_in_seconds) = get_time_in_seconds(&api_call) {
                    let _: redis::RedisResult<()> = conn.expire(cache_key, time_in_seconds).await;
                }
            }
        });
    }
}

impl RedisCache for Item {}
impl RedisCache for SavedItemData {}
impl RedisCache for Task {}
impl RedisCache for TaskBase {}

fn items_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_items))
        .route("/stats", get(item_stats))
        .route("/history", get(get_item_history))
        .route("/ids", get(get_page_by_ids::<Item>))
        .route("/query_parms", get(get_device_item_query_parms))
}

fn tasks_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_tasks))
        .route("/base", get(get_tasks_base))
        .route("/stats", get(task_stats))
        .route("/ids", get(get_page_by_ids::<Task>))
        .route("/adj_list", get(get_adj_list))
        .route("/get_completed", get(get_completed_tasks))
        .route("/set_complete", post(set_completed_task))
        .route("/clear_completed_tasks", get(clear_completed_tasks))
        .route("/query_parms", get(get_device_task_query_parms))
}

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .nest("/items", items_router())
        .nest("/tasks", tasks_router())
}
