use crate::database_types::*;
use crate::init_app_state::AppState;
use crate::query_types::*;
use AppError::*;
use axum::{Router, extract::State, response::Json, routing::get};
use axum_extra::extract::Query;
//use bb8_redis::redis::AsyncTypedCommands;
use redis::AsyncCommands;

use sqlx::PgPool;
use std::collections::{HashMap, HashSet};
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

    Ok(Json(Stats {
        items_count: items_count.unwrap_or(0),
        tasks_count: tasks_count.unwrap_or(0),
        kappa_required_count: kappa_required_count.unwrap_or(0),
        lightkeeper_required_count: lightkeeper_required_count.unwrap_or(0),
    }))
}

async fn items_from_db_to_items(
    items_from_db: Vec<ItemFromDB>,
    pgpool: &PgPool,
) -> Result<Vec<Item>, AppError> {
    let ids: Vec<String> = items_from_db.iter().map(|item| item._id.clone()).collect();
    let (buy_for_vec, sell_for_vec) = try_join!(
        sqlx::query_as!(
            BuyFor,
            "SELECT DISTINCT ON (id) * FROM BuyFor WHERE item_id = ANY($1)",
            &ids
        )
        .fetch_all(pgpool),
        sqlx::query_as!(
            SellFor,
            "SELECT DISTINCT ON (id) * FROM SellFor WHERE item_id = ANY($1)",
            &ids
        )
        .fetch_all(pgpool)
    )
    .map_err(|_| {
        BadSqlQuery(String::from(
            "BuyFor and SellFor Query did not run successfully",
        ))
    })?;

    let mut hm: HashMap<String, (Vec<BuyFor>, Vec<SellFor>)> = HashMap::new();
    buy_for_vec.into_iter().for_each(|buy| {
        hm.entry(buy.item_id.clone())
            .or_insert((vec![], vec![]))
            .0
            .push(buy)
    });

    sell_for_vec.into_iter().for_each(|sell| {
        hm.entry(sell.item_id.clone())
            .or_insert((vec![], vec![]))
            .1
            .push(sell)
    });

    Ok(items_from_db
        .into_iter()
        .map(|item_from_db| {
            let mut item = Item::from(item_from_db);
            let (buys, sells) = hm.entry(item._id.clone()).or_insert((vec![], vec![]));
            item.buys = buys.drain(..).collect();
            item.sells = sells.drain(..).collect();
            item
        })
        .collect())
}

async fn get_items(
    Query(query_parms): Query<ItemQueryParams>,
    State(AppState {
        pgpool,
        redispool,
        next_items_call_timer,
        next_tasks_call_timer: _,
    }): State<AppState>,
) -> Result<Json<Vec<Item>>, AppError> {
    let search = query_parms.search.unwrap_or(String::new());
    let asc = query_parms.asc.unwrap_or(false);
    let mut sort_by = query_parms
        .sort_by
        .unwrap_or(String::from("_id"))
        .to_lowercase();
    let mut item_type = query_parms
        .item_type
        .unwrap_or(String::new())
        .to_lowercase();
    // HARDCAP LIMIT OF 500
    let limit = query_parms.limit.unwrap_or(30);
    let offset = query_parms.offset.unwrap_or(0);

    let valid_sort_by: HashSet<&str> = VALID_SORT_BY.iter().map(|&x| x).collect();
    if sort_by == String::from("any") || !valid_sort_by.contains(sort_by.as_str()) {
        sort_by = String::from("_id");
    }

    let valid_item_type: HashSet<&str> = VALID_ITEM_TYPES.iter().map(|&x| x).collect();

    if item_type == "any" || !valid_item_type.contains(item_type.as_str()) {
        item_type = String::new();
    }

    // redis performance falls off at large amounts of items
    let use_redis = limit <= 100;
    let mut conn = if use_redis {
        redispool.get().await.ok()
    } else {
        None
    };

    let cache_key = format!(
        "{}a{}{}{}l{}o{}",
        search,
        if asc { "1" } else { "0" },
        sort_by,
        item_type,
        limit,
        offset
    );

    // check if there is a cache hit from redis cache
    if let Some(conn) = conn.as_mut() {
        let tasks: Option<Option<String>> = conn.get(&cache_key).await.ok();
        if let Some(tasks) = tasks {
            if let Some(tasks) = tasks {
                return Ok(Json(serde_json::from_str(&tasks).unwrap()));
            }
        }
    }

    let sql = format!(
        "SELECT * FROM Item 
        WHERE item_name ILIKE $1 
        AND item_types ILIKE $2 
        ORDER BY {} {} 
        LIMIT $3 OFFSET $4",
        sort_by,
        if asc { "ASC" } else { "DESC" },
    );

    let items_from_db: Vec<ItemFromDB> = sqlx::query_as::<_, ItemFromDB>(&sql)
        .bind(format!("%{}%", search))
        .bind(format!("%{}%", item_type))
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&pgpool)
        .await
        .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;

    let items = items_from_db_to_items(items_from_db, &pgpool).await?;

    // save tasks in redis cache
    if use_redis {
        let pool = redispool.clone();
        let items = items.clone();
        let items_call = next_items_call_timer.clone();

        tokio::spawn(async move {
            if let Ok(mut conn) = pool.get().await {
                if let Ok(data) = serde_json::to_string(&items) {
                    let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                    let mut time_in_seconds = None;
                    if let Ok(mutex_timer) = items_call.lock() {
                        time_in_seconds = mutex_timer
                            .as_ref()
                            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64);

                        drop(mutex_timer);
                    }

                    if let Some(time_in_seconds) = time_in_seconds {
                        let _: redis::RedisResult<()> =
                            conn.expire(cache_key, time_in_seconds).await;
                    }
                }
            }
        });
    }

    Ok(Json(items))
}

async fn get_item_history(
    Query(query_parms): Query<ItemHistoryQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<SavedItemData>>, AppError> {
    if query_parms.item_id.is_none() {
        return Ok(Json(vec![]));
    }

    let item_id = query_parms.item_id.unwrap();
    let item_history = sqlx::query_as!(
        SavedItemData,
        "SELECT * FROM SavedItemData WHERE item_id = $1",
        item_id
    )
    .fetch_all(&app_state.pgpool)
    .await
    .map_err(|_| BadSqlQuery(String::from("ItemHistory Query did not run successfully")))?;

    Ok(Json(item_history))
}

async fn get_items_by_ids(
    Query(query_parms): Query<IdsQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<Item>>, AppError> {
    let ids = query_parms.ids.unwrap_or(Vec::new());
    let items_from_db = sqlx::query_as!(ItemFromDB, "SELECT * FROM Item WHERE _id = ANY($1)", &ids)
        .fetch_all(&app_state.pgpool)
        .await
        .map_err(|_| BadSqlQuery(String::from("Items By IDs Query did not run successfully")))?;

    Ok(Json(
        items_from_db_to_items(items_from_db, &app_state.pgpool).await?,
    ))
}

async fn tasks_from_db_to_tasks(
    tasks_from_db: Vec<TaskFromDB>,
    pgpool: &PgPool,
) -> Result<Vec<Task>, AppError> {
    let ids: Vec<String> = tasks_from_db.iter().map(|task| task._id.clone()).collect();
    let (objective_vec, task_requirement_vec) = try_join!(
        sqlx::query_as!(
            Objective,
            "SELECT DISTINCT ON (id) * FROM Objective WHERE task_id = ANY($1)",
            &ids
        )
        .fetch_all(pgpool),
        sqlx::query_as!(
            TaskRequirement,
            "SELECT DISTINCT ON (id) * FROM TaskRequirement WHERE task_id = ANY($1)",
            &ids
        )
        .fetch_all(pgpool)
    )
    .map_err(|_| {
        BadSqlQuery(String::from(
            "Objective and TaskRequirement Query did not run successfully",
        ))
    })?;

    let mut hm: HashMap<String, (Vec<Objective>, Vec<TaskRequirement>)> = HashMap::new();
    objective_vec.into_iter().for_each(|buy| {
        hm.entry(buy.task_id.clone())
            .or_insert((vec![], vec![]))
            .0
            .push(buy)
    });

    task_requirement_vec.into_iter().for_each(|sell| {
        hm.entry(sell.task_id.clone())
            .or_insert((vec![], vec![]))
            .1
            .push(sell)
    });

    Ok(tasks_from_db
        .into_iter()
        .map(|task_from_db| {
            let mut task = Task::from(task_from_db);
            let (objectives, task_requirements) =
                hm.entry(task._id.clone()).or_insert((vec![], vec![]));
            task.objectives = objectives.drain(..).collect();
            task.task_requirements = task_requirements.drain(..).collect();
            task
        })
        .collect())
}

async fn get_tasks(
    Query(query_parms): Query<TaskQueryParams>,
    State(AppState {
        pgpool,
        redispool,
        next_items_call_timer: _,
        next_tasks_call_timer,
    }): State<AppState>,
) -> Result<Json<Vec<Task>>, AppError> {
    let search = query_parms.search.unwrap_or(String::new());
    let is_kappa = query_parms.is_kappa.unwrap_or(false);
    let is_lightkeeper = query_parms.is_lightkeeper.unwrap_or(false);
    let mut obj_type = query_parms.obj_type.unwrap_or(String::new()).to_lowercase();
    let mut trader = query_parms.trader.unwrap_or(String::new()).to_lowercase();
    let player_lvl = query_parms.player_lvl.unwrap_or(99);
    let limit = query_parms.limit.unwrap_or(30);
    let offset = query_parms.offset.unwrap_or(0);
    let ids = query_parms.ids.unwrap_or(Vec::new());

    let valid_obj_types: HashSet<&str> = VALID_OBJ_TYPES.iter().map(|&x| x).collect();
    if obj_type == String::from("any") || !valid_obj_types.contains(obj_type.as_str()) {
        obj_type = String::new();
    }

    let valid_traders: HashSet<&str> = VALID_TRADERS.iter().map(|&x| x).collect();
    if trader == String::from("any") || !valid_traders.contains(trader.as_str()) {
        trader = String::new();
    }

    // try not to create too many cache keys when its not needed
    let use_redis = ids.is_empty();
    let mut conn = if use_redis {
        redispool.get().await.ok()
    } else {
        None
    };

    let cache_key = format!(
        "{}k{}l{}{}{}p{}l{}o{}",
        search,
        if is_kappa { "1" } else { "0" },
        if is_lightkeeper { "1" } else { "0" },
        obj_type,
        trader,
        player_lvl,
        limit,
        offset
    );

    // check if there is a cache hit from redis cache
    if let Some(conn) = conn.as_mut() {
        let tasks: Option<Option<String>> = conn.get(&cache_key).await.ok();
        if let Some(tasks) = tasks {
            if let Some(tasks) = tasks {
                return Ok(Json(serde_json::from_str(&tasks).unwrap()));
            }
        }
    }

    let tasks_from_db = sqlx::query_as!(
                TaskFromDB,
                "SELECT * FROM Task t WHERE task_name ILIKE $1 AND trader ILIKE $2 AND min_player_level <= $3 AND NOT (_id = ANY($4)) AND ($5::bool IS FALSE OR kappa_required = TRUE) AND ($6::bool IS FALSE OR lightkeeper_required = TRUE) AND EXISTS (SELECT 1 FROM Objective o WHERE o.task_id = t._id AND o.obj_type ILIKE $7)ORDER BY _id ASC LIMIT $8 OFFSET $9",
                format!("%{}%", search),
                format!("%{}%", trader),
                player_lvl as i32,
                &ids,
                is_kappa,
                is_lightkeeper,
                format!("%{}%", obj_type),
                limit as i64,
                offset as i64
            )
            .fetch_all(&pgpool)
            .await
            .map_err(|_| BadSqlQuery(String::from("Tasks Query did not run successfully")))?;

    let tasks = tasks_from_db_to_tasks(tasks_from_db, &pgpool).await?;

    // save tasks in redis cache
    if use_redis {
        let pool = redispool.clone();
        let tasks = tasks.clone();
        let tasks_call = next_tasks_call_timer.clone();

        tokio::spawn(async move {
            if let Ok(mut conn) = pool.get().await {
                if let Ok(data) = serde_json::to_string(&tasks) {
                    let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                    let mut time_in_seconds = None;
                    if let Ok(mutex_timer) = tasks_call.lock() {
                        time_in_seconds = mutex_timer
                            .as_ref()
                            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64);

                        drop(mutex_timer);
                    }

                    if let Some(time_in_seconds) = time_in_seconds {
                        let _: redis::RedisResult<()> =
                            conn.expire(cache_key, time_in_seconds).await;
                    }
                }
            }
        });
    }

    Ok(Json(tasks))
}

async fn get_tasks_by_ids(
    Query(query_parms): Query<IdsQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<Task>>, AppError> {
    let ids: Vec<String> = query_parms.ids.unwrap_or(Vec::new());

    let tasks_from_db = sqlx::query_as!(TaskFromDB, "SELECT * FROM Task WHERE _id = ANY($1)", &ids)
        .fetch_all(&app_state.pgpool)
        .await
        .unwrap();

    Ok(Json(
        tasks_from_db_to_tasks(tasks_from_db, &app_state.pgpool).await?,
    ))
}

// returns a HashMap which maps every task_id to a Vec<task_id, status> where status can only be
// "prerequisite" which is all the tasks that come before current task or
// "unlocks" is all the tasks that come after current task
// effectively mapping every task to their adjacent tasks
async fn get_adj_list(
    State(app_state): State<AppState>,
) -> Result<Json<HashMap<String, Vec<(String, String)>>>, AppError> {
    let task_requirements = sqlx::query_as!(TaskRequirement, "SELECT * FROM TaskRequirement")
        .fetch_all(&app_state.pgpool)
        .await
        .map_err(|_| {
            BadSqlQuery(String::from(
                "TaskRequirement Query did not run successfully",
            ))
        })?;

    let mut adj_list = HashMap::new();
    task_requirements.into_iter().for_each(|req| {
        let from_id = req.task_id;
        let to_id = req.req_task_id;

        adj_list
            .entry(from_id.clone())
            .or_insert(vec![])
            .push((to_id.clone(), String::from("prerequisite")));

        adj_list
            .entry(to_id)
            .or_insert(vec![])
            .push((from_id, String::from("unlocks")));
    });

    Ok(Json(adj_list))
}

fn items_router() -> Router<AppState> {
    Router::new()
        .route("/items", get(get_items))
        .route("/item_history", get(get_item_history))
        .route("/item_ids", get(get_items_by_ids))
}

fn tasks_router() -> Router<AppState> {
    Router::new()
        .route("/tasks", get(get_tasks))
        .route("/task_ids", get(get_tasks_by_ids))
        .route("/adj_list", get(get_adj_list))
}

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/stats", get(stats))
        .merge(items_router())
        .merge(tasks_router())
}
