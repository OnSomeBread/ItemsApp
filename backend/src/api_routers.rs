use crate::ammo_routes::{ammo_stats, get_ammo, get_ammo_help, get_device_ammo_query_parms};
use crate::database_types::{Ammo, Item, ItemBase, ItemFromDB, Task, TaskBase, TaskFromDB};
use crate::init_app_state::{
    AMMO_UNIQUE_CACHE_PREFIX, AppState, ITEMS_UNIQUE_CACHE_PREFIX, TASKS_UNIQUE_CACHE_PREFIX,
};
use crate::item_routes::{
    get_device_item_query_parms, get_item_history, get_items, get_items_help, item_stats,
    items_from_db_to_items,
};
use crate::query_types::{
    AppError, AppError::UninitalizedDatabase, AppErrorHandling, IdsQueryParams,
};
use crate::task_routes::{
    clear_completed_tasks, get_adj_list, get_completed_tasks, get_device_task_query_parms,
    get_required_items, get_tasks, get_tasks_base, get_tasks_help, set_completed_task, task_stats,
    tasks_from_db_to_tasks,
};
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::{Router, extract::State, response::Json, routing::get, routing::post};
use axum_extra::extract::Query;
use serde::{Serialize, de::DeserializeOwned};
use sqlx::types::Uuid;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::try_join;

use std::time::Instant;

// checks if the database is initalized
async fn health(State(app_state): State<AppState>) -> Result<String, AppError> {
    let (items_count, tasks_count, ammo_count) = try_join!(
        sqlx::query_scalar!("SELECT COUNT(*) FROM Item").fetch_one(&app_state.pgpool),
        sqlx::query_scalar!("SELECT COUNT(*) FROM Task").fetch_one(&app_state.pgpool),
        sqlx::query_scalar!("SELECT COUNT(*) FROM Ammo").fetch_one(&app_state.pgpool)
    )
    .map_err(|_| UninitalizedDatabase(String::from("The Database has not yet been initalized")))?;

    if items_count.unwrap_or(0) == 0
        || tasks_count.unwrap_or(0) == 0
        || ammo_count.unwrap_or(0) == 0
    {
        Err(UninitalizedDatabase(String::from(
            "The Database has not yet been initalized",
        )))
    } else {
        Ok(String::from("Status Ok"))
    }
}

// in app state there are timers to see when when a page refreshes the helps to unwrap it into a number in seconds
#[allow(clippy::cast_possible_wrap)]
pub async fn get_time_in_seconds(timer: &Arc<RwLock<Instant>>) -> i64 {
    timer
        .read()
        .await
        .saturating_duration_since(Instant::now())
        .as_secs() as i64
}

pub trait Page: Send + Sync + Serialize + DeserializeOwned + Clone + 'static {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError>;

    fn id(&self) -> &str;

    #[allow(dead_code)]
    fn get_app_state_timer(app_state: &AppState) -> Arc<RwLock<Instant>>;

    // each struct needs to have a unique but short postfix and prefix where prefix matches with the general page they are associated with
    fn make_cache_key(id: &str) -> String;
    fn unique_cache_key_prefix() -> &'static str;
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

    fn get_app_state_timer(app_state: &AppState) -> Arc<RwLock<Instant>> {
        app_state.next_items_call_timer.clone()
    }

    fn unique_cache_key_prefix() -> &'static str {
        ITEMS_UNIQUE_CACHE_PREFIX
    }

    fn make_cache_key(id: &str) -> String {
        Self::unique_cache_key_prefix().to_string() + id + "!"
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

    fn get_app_state_timer(app_state: &AppState) -> Arc<RwLock<Instant>> {
        app_state.next_items_call_timer.clone()
    }

    fn unique_cache_key_prefix() -> &'static str {
        ITEMS_UNIQUE_CACHE_PREFIX
    }

    fn make_cache_key(id: &str) -> String {
        Self::unique_cache_key_prefix().to_string() + id + "@"
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

    fn get_app_state_timer(app_state: &AppState) -> Arc<RwLock<Instant>> {
        app_state.next_tasks_call_timer.clone()
    }
    fn unique_cache_key_prefix() -> &'static str {
        TASKS_UNIQUE_CACHE_PREFIX
    }

    fn make_cache_key(id: &str) -> String {
        Self::unique_cache_key_prefix().to_string() + id + "#"
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

    fn get_app_state_timer(app_state: &AppState) -> Arc<RwLock<Instant>> {
        app_state.next_tasks_call_timer.clone()
    }

    fn unique_cache_key_prefix() -> &'static str {
        TASKS_UNIQUE_CACHE_PREFIX
    }

    fn make_cache_key(id: &str) -> String {
        Self::unique_cache_key_prefix().to_string() + id + "$"
    }
}

impl Page for Ammo {
    async fn fetch_by_ids(
        pgpool: &sqlx::PgPool,
        not_found_ids: &[String],
    ) -> Result<Vec<Self>, AppError> {
        sqlx::query_as!(
            Ammo,
            "SELECT * FROM Ammo WHERE item_id = ANY($1)",
            &not_found_ids
        )
        .fetch_all(pgpool)
        .await
        .bad_sql("Ammo by Ids")
    }

    fn id(&self) -> &str {
        &self.item_id
    }

    fn get_app_state_timer(app_state: &AppState) -> Arc<RwLock<Instant>> {
        app_state.next_ammo_call_timer.clone()
    }

    fn unique_cache_key_prefix() -> &'static str {
        AMMO_UNIQUE_CACHE_PREFIX
    }

    fn make_cache_key(id: &str) -> String {
        Self::unique_cache_key_prefix().to_string() + id + "%"
    }
}

pub async fn fetch_tasks_by_ids<T: Page>(
    app_state: &AppState,
    ids: Vec<String>,
) -> Result<Vec<T>, AppError> {
    let mut not_found_ids = vec![];
    let mut found_values: Vec<T> = vec![];
    for id in ids {
        let cache_key = T::make_cache_key(id.as_str());
        if let Some(val) = app_state.cache.get(&cache_key).await {
            found_values.push(val);
        } else {
            not_found_ids.push(id);
        }
    }

    let mut values: Vec<T> = T::fetch_by_ids(&app_state.pgpool, &not_found_ids).await?;

    let tokio_values = values.clone();
    let cache = app_state.cache.clone();

    tokio::spawn(async move {
        for value in tokio_values {
            let key = T::make_cache_key(value.id());

            cache
                .insert(key, &value, T::unique_cache_key_prefix())
                .await;
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

fn items_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_items))
        .route("/stats", get(item_stats))
        .route("/history", get(get_item_history))
        .route("/ids", get(get_page_by_ids::<Item>))
        .route("/query_parms", get(get_device_item_query_parms))
        .route("/help", get(get_items_help))
}

fn tasks_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_tasks))
        .route("/base", get(get_tasks_base))
        .route("/stats", get(task_stats))
        .route("/ids", get(get_page_by_ids::<Task>))
        .route("/get_required_items", get(get_required_items))
        .route("/adj_list", get(get_adj_list))
        .route("/get_completed", get(get_completed_tasks))
        .route("/set_complete", post(set_completed_task))
        .route("/clear_completed_tasks", get(clear_completed_tasks))
        .route("/query_parms", get(get_device_task_query_parms))
        .route("/help", get(get_tasks_help))
}

fn ammo_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_ammo))
        .route("/stats", get(ammo_stats))
        .route("/ids", get(get_page_by_ids::<Ammo>))
        .route("/query_parms", get(get_device_ammo_query_parms))
        .route("/help", get(get_ammo_help))
}

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .nest("/items", items_router())
        .nest("/tasks", tasks_router())
        .nest("/ammo", ammo_router())
}
