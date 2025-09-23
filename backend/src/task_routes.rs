use crate::api_routers::get_time_in_seconds;
use crate::database_types::{Objective, Task, TaskFromDB, TaskRequirement};
use crate::init_app_state::AppState;
use crate::query_types::*;
use crate::query_types::{AppError, AppError::*};
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use redis::AsyncCommands;
use std::collections::{HashMap, HashSet};

// this adds task requirements and objectives to tasks so that it can be returned to user
// much faster than left later join these
pub async fn tasks_from_db_to_tasks(
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

pub async fn get_tasks(
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
pub async fn get_adj_list(
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
