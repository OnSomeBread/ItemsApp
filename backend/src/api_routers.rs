use crate::database_types::*;
use crate::init_app_state::AppState;
use crate::query_types::{AppError::*, *};
use axum::{Router, extract::State, response::Json, routing::get};
use axum_extra::extract::Query;
use redis::AsyncCommands;
use serde::{Serialize, de::DeserializeOwned};
use std::collections::{HashMap, HashSet};
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
fn get_time_in_seconds(timer: &Arc<Mutex<Option<Instant>>>) -> Option<i64> {
    if let Ok(mutex_timer) = timer.lock() {
        mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64)
    } else {
        None
    }
}

async fn items_from_db_to_items(
    items_from_db: Vec<ItemFromDB>,
    mut txn: sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<Vec<Item>, AppError> {
    let ids: Vec<String> = items_from_db.iter().map(|item| item._id.clone()).collect();
    let buy_for_vec = sqlx::query_as!(BuyFor, "SELECT * FROM BuyFor WHERE item_id = ANY($1)", &ids)
        .fetch_all(&mut *txn)
        .await
        .map_err(|_| {
            BadSqlQuery(String::from(
                "BuyFor and SellFor Query did not run successfully",
            ))
        })?;

    let sell_for_vec = sqlx::query_as!(
        SellFor,
        "SELECT * FROM SellFor WHERE item_id = ANY($1)",
        &ids
    )
    .fetch_all(&mut *txn)
    .await
    .map_err(|_| {
        BadSqlQuery(String::from(
            "BuyFor and SellFor Query did not run successfully",
        ))
    })?;

    txn.commit()
        .await
        .map_err(|_| BadSqlQuery(String::from("Item Query did not run successfully")))?;

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

// grabs items from the Item table based off of the query params
// there are 2 types of queries the first approach is to query for
// Item, BuyFor, SellFor as 3 separate queries which runs quickly
// for multiple runs then slows down presumibly from the extra connections
// the second approach is to query all at once as a join which does not have
// the connections issue and is much easier to work with but is also much slower
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
        .unwrap_or(String::from("base_price"))
        .to_lowercase();
    let mut item_type = query_parms
        .item_type
        .unwrap_or(String::new())
        .to_lowercase();
    let limit = std::cmp::min(query_parms.limit.unwrap_or(30), 100);
    let offset = query_parms.offset.unwrap_or(0);

    let valid_sort_by: HashSet<&str> = VALID_SORT_BY.iter().map(|&x| x).collect();
    if sort_by == String::from("any") || !valid_sort_by.contains(sort_by.as_str()) {
        sort_by = String::from("base_price");
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

    // welp doing this is much cleaner but far slower than the main query ¯\_(ツ)_/¯
    // let items_test: Vec<Item> = sqlx::query_as!(
    //         Item,
    //         r#"SELECT i.*,
    //         COALESCE(ARRAY_AGG((b.*)) FILTER (WHERE b.item_id IS NOT NULL), '{}') AS "buys!:Vec<BuyFor>",
    //         COALESCE(ARRAY_AGG((s.*)) FILTER (WHERE s.item_id IS NOT NULL), '{}') AS "sells!:Vec<SellFor>"
    //         FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id LEFT JOIN SellFor s ON i._id = s.item_id

    //         WHERE i.item_name ILIKE $1 AND i.item_types ILIKE $2
    //         GROUP BY i._id ORDER BY i.base_price DESC LIMIT $3 OFFSET $4;"#,
    //         format!("%{}%", search),
    //         format!("%{}%", item_type),
    //         limit as i64,
    //         offset as i64
    //     ).fetch_all(&pgpool).await
    //     .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    // return Ok(Json(items_test));

    // THIS QUERY REQUIRES INDEX ON item_id FOR BOTH buyfor and sellfor but is faster than above approach
    // let items_test: Vec<Item> = sqlx::query_as!(
    //     Item,
    //     r#"SELECT i.*,
    //         COALESCE(buys.buys, '{}') AS "buys!:Vec<BuyFor>",
    //         COALESCE(sells.sells, '{}') AS "sells!:Vec<SellFor>"
    //         FROM Item i
    //         LEFT JOIN LATERAL (
    //             SELECT ARRAY_AGG(b.*) AS buys
    //             FROM BuyFor b
    //             WHERE b.item_id = i._id
    //         ) buys ON TRUE
    //         LEFT JOIN LATERAL (
    //             SELECT ARRAY_AGG(s.*) AS sells
    //             FROM SellFor s
    //             WHERE s.item_id = i._id
    //         ) sells ON TRUE
    //         WHERE i.item_name ILIKE $1 AND i.item_types ILIKE $2
    //         ORDER BY i.base_price DESC LIMIT $3 OFFSET $4;"#,
    //     format!("%{}%", search),
    //     format!("%{}%", item_type),
    //     limit as i64,
    //     offset as i64
    // )
    // .fetch_all(&pgpool)
    // .await
    // .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    // return Ok(Json(items_test));

    let items_from_db;
    let mut txn = pgpool
        .begin()
        .await
        .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;

    if sort_by == "flea_market" {
        let sql = format!(
            r#"SELECT i.* FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id 
            WHERE LOWER(b.trader_name) = 'flea market' AND i.item_name ILIKE $1 AND i.item_types ILIKE $2 
            ORDER BY b.price_rub {} LIMIT $3 OFFSET $4;"#,
            if asc { "ASC" } else { "DESC" },
        );

        items_from_db = sqlx::query_as(&sql)
            .bind(format!("%{}%", search))
            .bind(format!("%{}%", item_type))
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&mut *txn)
            .await
            .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    } else {
        let sql = format!(
            r#"SELECT * FROM Item 
            WHERE item_name ILIKE $1 AND item_types ILIKE $2 
            ORDER BY {} {} LIMIT $3 OFFSET $4"#,
            sort_by,
            if asc { "ASC" } else { "DESC" },
        );

        items_from_db = sqlx::query_as(&sql)
            .bind(format!("%{}%", search))
            .bind(format!("%{}%", item_type))
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&mut *txn)
            .await
            .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    }

    let items = items_from_db_to_items(items_from_db, txn).await?;

    // save tasks in redis cache
    if use_redis {
        let pool = redispool.clone();
        let items = items.clone();
        let items_call = next_items_call_timer.clone();

        tokio::spawn(async move {
            if let Ok(mut conn) = pool.get().await {
                if let Ok(data) = serde_json::to_string(&items) {
                    let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                    if let Some(time_in_seconds) = get_time_in_seconds(&items_call) {
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
    let cache_key = item_id.clone() + "-history";
    let mut conn = app_state.redispool.get().await.ok();
    if let Some(conn) = conn.as_mut() {
        let item_history: Option<Option<String>> = conn.get(&cache_key).await.ok();
        if let Some(item_history) = item_history {
            if let Some(item_history) = item_history {
                return Ok(Json(serde_json::from_str(&item_history).unwrap()));
            }
        }
    }

    let item_history = sqlx::query_as!(
        SavedItemData,
        "SELECT * FROM SavedItemData WHERE item_id = $1",
        item_id
    )
    .fetch_all(&app_state.pgpool)
    .await
    .map_err(|_| BadSqlQuery(String::from("ItemHistory Query did not run successfully")))?;

    let pool = app_state.redispool.clone();
    let tokio_item_history = item_history.clone();
    let items_call = app_state.next_items_call_timer.clone();

    tokio::spawn(async move {
        if let Ok(mut conn) = pool.get().await {
            if let Ok(data) = serde_json::to_string(&tokio_item_history) {
                let _: redis::RedisResult<()> = conn.set(&cache_key, data).await;

                if let Some(time_in_seconds) = get_time_in_seconds(&items_call) {
                    let _: redis::RedisResult<()> = conn.expire(&cache_key, time_in_seconds).await;
                }
            }
        }
    });

    Ok(Json(item_history))
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
            if let Some(item) = item {
                if let Some(item) = item {
                    found_values.push(serde_json::from_str(&item).unwrap());
                } else {
                    not_found_ids.push(id);
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

async fn tasks_from_db_to_tasks(
    tasks_from_db: Vec<TaskFromDB>,
    mut txn: sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<Vec<Task>, AppError> {
    let ids: Vec<String> = tasks_from_db.iter().map(|task| task._id.clone()).collect();
    let objective_vec = sqlx::query_as!(
        Objective,
        "SELECT * FROM Objective WHERE task_id = ANY($1)",
        &ids
    )
    .fetch_all(&mut *txn)
    .await
    .map_err(|_| {
        BadSqlQuery(String::from(
            "Objective and TaskRequirement Query did not run successfully",
        ))
    })?;
    let task_requirement_vec = sqlx::query_as!(
        TaskRequirement,
        "SELECT * FROM TaskRequirement WHERE task_id = ANY($1)",
        &ids
    )
    .fetch_all(&mut *txn)
    .await
    .map_err(|_| {
        BadSqlQuery(String::from(
            "Objective and TaskRequirement Query did not run successfully",
        ))
    })?;

    txn.commit().await.map_err(|_| {
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

    let mut txn = pgpool
        .begin()
        .await
        .map_err(|_| BadSqlQuery(String::from("Tasks Query did not run successfully")))?;

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
            .fetch_all(&mut *txn)
            .await
            .map_err(|_| BadSqlQuery(String::from("Tasks Query did not run successfully")))?;

    let tasks = tasks_from_db_to_tasks(tasks_from_db, txn).await?;

    // save tasks in redis cache
    if use_redis {
        let pool = redispool.clone();
        let tasks = tasks.clone();
        let tasks_call = next_tasks_call_timer.clone();

        tokio::spawn(async move {
            if let Ok(mut conn) = pool.get().await {
                if let Ok(data) = serde_json::to_string(&tasks) {
                    let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                    if let Some(time_in_seconds) = get_time_in_seconds(&tasks_call) {
                        let _: redis::RedisResult<()> =
                            conn.expire(cache_key, time_in_seconds).await;
                    }
                }
            }
        });
    }

    Ok(Json(tasks))
}

// returns a HashMap which maps every task_id to a Vec<task_id, status> where status can only be
// "prerequisite" which is all the tasks that come before current task or
// "unlocks" is all the tasks that come after current task
// effectively mapping every task to their adjacent tasks
async fn get_adj_list(
    State(app_state): State<AppState>,
) -> Result<Json<HashMap<String, Vec<(String, String)>>>, AppError> {
    let cache_key = "adj_list";
    let mut conn = app_state.redispool.get().await.ok();
    if let Some(conn) = conn.as_mut() {
        let adj_list: Option<Option<String>> = conn.get(&cache_key).await.ok();
        if let Some(adj_list) = adj_list {
            if let Some(adj_list) = adj_list {
                return Ok(Json(serde_json::from_str(&adj_list).unwrap()));
            }
        }
    }

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

    let pool = app_state.redispool.clone();
    let tokio_adj_list = adj_list.clone();
    let tasks_call = app_state.next_tasks_call_timer.clone();

    // store the adj_list that have not been found in redis cache
    tokio::spawn(async move {
        if let Ok(mut conn) = pool.get().await {
            if let Ok(data) = serde_json::to_string(&tokio_adj_list) {
                let _: redis::RedisResult<()> = conn.set(&cache_key, data).await;

                if let Some(time_in_seconds) = get_time_in_seconds(&tasks_call) {
                    let _: redis::RedisResult<()> = conn.expire(&cache_key, time_in_seconds).await;
                }
            }
        }
    });

    Ok(Json(adj_list))
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
