use crate::api_routers::{Device, RedisCache, fetch_tasks_by_ids, get_time_in_seconds};
use crate::database_types::{DeviceTaskQueryParams, Objective, Task, TaskFromDB, TaskRequirement};
use crate::init_app_state::AppState;
use crate::query_types::{AppError, AppError::BadRequest};
use crate::query_types::{
    AppErrorHandling, TaskQueryParams, TaskStats, VALID_OBJ_TYPES, VALID_TRADERS,
};
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use redis::AsyncCommands;
use sqlx::PgPool;
use sqlx::types::Uuid;
use std::collections::{HashMap, HashSet};
use std::time::Instant;
use tokio::try_join;

#[derive(sqlx::FromRow)]
struct GrabIds {
    _id: String,
}

// gives data on different interesting stats about the data stored
pub async fn task_stats(
    device: Device,
    State(app_state): State<AppState>,
) -> Result<Json<TaskStats>, AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }
    let device_id = device.0.unwrap();

    let (tasks_count, kappa_required, lightkeeper_required) = try_join!(
        sqlx::query_scalar!("SELECT COUNT(*) FROM Task").fetch_one(&app_state.pgpool),
        sqlx::query_as!(GrabIds, "SELECT _id FROM Task WHERE kappa_required = True")
            .fetch_all(&app_state.pgpool),
        sqlx::query_as!(
            GrabIds,
            "SELECT _id FROM Task WHERE lightkeeper_required = True"
        )
        .fetch_all(&app_state.pgpool),
    )
    .bad_sql("Stats")?;

    let completed_tasks: HashSet<String> =
        get_completed_task_by_device_id(&app_state.pgpool, device_id)
            .await?
            .into_iter()
            .collect();

    let kappa_completed_count = kappa_required
        .iter()
        .filter(|i| completed_tasks.contains(&i._id))
        .count();

    let lightkeeper_completed_count = lightkeeper_required
        .iter()
        .filter(|i| completed_tasks.contains(&i._id))
        .count();

    let mut time_in_seconds_tasks = None;
    #[allow(clippy::cast_possible_wrap)]
    if let Ok(mutex_timer) = app_state.next_tasks_call_timer.lock() {
        time_in_seconds_tasks = mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs());
    }

    Ok(Json(TaskStats {
        tasks_count: tasks_count.unwrap_or(0),
        kappa_completed_count,
        kappa_required_count: kappa_required.len(),
        lightkeeper_completed_count,
        lightkeeper_required_count: lightkeeper_required.len(),
        time_till_tasks_refresh_secs: time_in_seconds_tasks.unwrap_or(0),
    }))
}

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
    .bad_sql("Objective and Task Requirement")?;
    let task_requirement_vec = sqlx::query_as!(
        TaskRequirement,
        "SELECT * FROM TaskRequirement WHERE task_id = ANY($1)",
        &ids
    )
    .fetch_all(&mut *txn)
    .await
    .bad_sql("Objective and Task Requirement")?;

    txn.commit()
        .await
        .bad_sql("Objective and Task Requirement")?;

    let mut hm: HashMap<String, (Vec<Objective>, Vec<TaskRequirement>)> = HashMap::new();
    for buy in objective_vec {
        hm.entry(buy.task_id.clone())
            .or_insert((vec![], vec![]))
            .0
            .push(buy);
    }

    for sell in task_requirement_vec {
        hm.entry(sell.task_id.clone())
            .or_insert((vec![], vec![]))
            .1
            .push(sell);
    }

    Ok(tasks_from_db
        .into_iter()
        .map(|task_from_db| {
            let mut task = Task::from(task_from_db);
            let (objectives, task_requirements) =
                hm.entry(task._id.clone()).or_insert((vec![], vec![]));
            task.objectives = std::mem::take(objectives);
            task.task_requirements = std::mem::take(task_requirements);
            task
        })
        .collect())
}

#[allow(clippy::too_many_lines)]
pub async fn get_tasks(
    device: Device,
    Query(query_parms): Query<TaskQueryParams>,
    State(AppState {
        pgpool,
        redispool,
        next_items_call_timer: _,
        next_tasks_call_timer,
    }): State<AppState>,
) -> Result<Json<Vec<Task>>, AppError> {
    let save = query_parms.save.unwrap_or(true);
    let search = query_parms.search.unwrap_or(String::new());
    let is_kappa = query_parms.is_kappa.unwrap_or(false);
    let is_lightkeeper = query_parms.is_lightkeeper.unwrap_or(false);
    let mut obj_type = query_parms.obj_type.unwrap_or(String::new());
    let mut trader = query_parms.trader.unwrap_or(String::new()).to_lowercase();
    #[allow(clippy::cast_possible_wrap)]
    let player_lvl = query_parms.player_lvl.unwrap_or(99) as i32;
    let limit = query_parms.limit.unwrap_or(30);
    let offset = query_parms.offset.unwrap_or(0);
    let include_completed = query_parms.include_completed.unwrap_or(true);
    let ids = if include_completed && device.0.is_some() {
        get_completed_task_by_device_id(&pgpool, device.0.unwrap()).await?
    } else {
        vec![]
    };

    // .to_lowercase happens here instead of above because I need the casing to be kept to pass to frontend
    let valid_obj_types: HashSet<&str> = VALID_OBJ_TYPES.iter().copied().collect();
    if obj_type.to_lowercase() == "any"
        || !valid_obj_types.contains(obj_type.to_lowercase().as_str())
    {
        obj_type = String::new();
    }

    let valid_traders: HashSet<&str> = VALID_TRADERS.iter().copied().collect();
    if trader == "any" || !valid_traders.contains(trader.as_str()) {
        trader = String::new();
    }

    // save query
    if save && let Some(device_id) = device.0 {
        let search = search.clone();
        let obj_type = obj_type.clone();
        let trader = trader.clone();
        let pgpool = pgpool.clone();
        tokio::spawn(async move {
            let _ = sqlx::query!(
                "UPDATE TaskQueryParams 
                    SET search = $2, is_kappa = $3, is_lightkeeper = $4, 
                    player_lvl = $5, obj_type = $6, trader = $7 WHERE id = $1",
                device_id,
                search,
                is_kappa,
                is_lightkeeper,
                player_lvl,
                if obj_type.is_empty() {
                    "any".to_string()
                } else {
                    obj_type
                },
                if trader.is_empty() {
                    "any".to_string()
                } else {
                    trader
                }
            )
            .execute(&pgpool)
            .await;
        });
    }

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

    // try not to create too many cache keys when its not needed
    let use_redis = ids.is_empty();
    if use_redis && let Some(values) = Task::get_vec(&cache_key, &redispool).await? {
        return Ok(Json(values));
    }

    let mut txn = pgpool.begin().await.bad_sql("Tasks")?;
    let tasks_from_db = sqlx::query_as!(
                TaskFromDB,
                "SELECT * FROM Task t WHERE task_name ILIKE $1 AND trader ILIKE $2 AND min_player_level <= $3 AND NOT (_id = ANY($4)) AND 
                ($5::bool IS FALSE OR kappa_required = TRUE) AND ($6::bool IS FALSE OR lightkeeper_required = TRUE) AND 
                EXISTS (SELECT 1 FROM Objective o WHERE o.task_id = t._id AND o.obj_type ILIKE $7)ORDER BY _id ASC LIMIT $8 OFFSET $9",
                format!("%{}%", search),
                format!("%{}%", trader),
                player_lvl,
                &ids,
                is_kappa,
                is_lightkeeper,
                format!("%{}%", obj_type),
                i64::from(limit),
                i64::from(offset)
            )
            .fetch_all(&mut *txn)
            .await
            .bad_sql("Tasks")?;

    let tasks = tasks_from_db_to_tasks(tasks_from_db, txn).await?;

    // save tasks in redis cache
    if use_redis {
        Task::set_vec(
            cache_key,
            tasks.clone(),
            redispool,
            next_tasks_call_timer.clone(),
        )
        .await;
    }

    Ok(Json(tasks))
}

pub async fn get_device_task_query_parms(
    device: Device,
    State(app_state): State<AppState>,
) -> Result<Json<DeviceTaskQueryParams>, AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }
    let device_id = device.0.unwrap();

    let mut txn = app_state.pgpool.begin().await.bad_sql("Tasks")?;

    sqlx::query!(
        "INSERT INTO DevicePreferences VALUES ($1) ON CONFLICT (id) DO NOTHING;",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("Device Preferences")?;

    sqlx::query!(
        "INSERT INTO TaskQueryParams VALUES ($1) ON CONFLICT (id) DO NOTHING",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("TaskQueryParams")?;

    let v = sqlx::query_as!(
        DeviceTaskQueryParams,
        "SELECT * FROM TaskQueryParams WHERE id = $1;",
        device_id
    )
    .fetch_one(&mut *txn)
    .await
    .bad_sql("Tasks")?;

    txn.commit().await.bad_sql("TaskQueryParams")?;

    Ok(Json(v))
}

// returns a HashMap which maps every task_id to a Vec<task_id, status> where status can only be
// "prerequisite" which is all the tasks that come before current task or
// "unlocks" is all the tasks that come after current task
// effectively mapping every task to their adjacent tasks
async fn fetch_adj_list(
    app_state: &AppState,
) -> Result<HashMap<String, Vec<(String, bool)>>, AppError> {
    let cache_key = "adj_list";
    let mut conn = app_state.redispool.get().await.ok();
    if let Some(conn) = conn.as_mut() {
        let adj_list: Option<Option<String>> = conn.get(cache_key).await.ok();
        if let Some(adj_list) = adj_list.flatten() {
            return Ok(serde_json::from_str(&adj_list).unwrap());
        }
    }

    let task_requirements = sqlx::query_as!(TaskRequirement, "SELECT * FROM TaskRequirement")
        .fetch_all(&app_state.pgpool)
        .await
        .bad_sql("TaskRequirements")?;

    let mut adj_list = HashMap::new();
    for req in task_requirements {
        let from_id = req.task_id;
        let to_id = req.req_task_id;

        adj_list
            .entry(from_id.clone())
            .or_insert(vec![])
            .push((to_id.clone(), false));

        adj_list
            .entry(to_id)
            .or_insert(vec![])
            .push((from_id, true));
    }

    let pool = app_state.redispool.clone();
    let tokio_adj_list = adj_list.clone();
    let tasks_call = app_state.next_tasks_call_timer.clone();

    // store the adj_list that have not been found in redis cache
    tokio::spawn(async move {
        if let Ok(mut conn) = pool.get().await
            && let Ok(data) = serde_json::to_string(&tokio_adj_list)
        {
            let _: redis::RedisResult<()> = conn.set(cache_key, data).await;

            if let Some(time_in_seconds) = get_time_in_seconds(&tasks_call) {
                let _: redis::RedisResult<()> = conn.expire(cache_key, time_in_seconds).await;
            }
        }
    });

    Ok(adj_list)
}

pub async fn get_adj_list(
    State(app_state): State<AppState>,
) -> Result<Json<HashMap<String, Vec<(String, bool)>>>, AppError> {
    Ok(Json(fetch_adj_list(&app_state).await?))
}

async fn get_completed_task_by_device_id(
    pgpool: &PgPool,
    device_id: Uuid,
) -> Result<Vec<String>, AppError> {
    let mut txn = pgpool.begin().await.bad_sql("Device Preferences")?;

    sqlx::query!(
        "INSERT INTO DevicePreferences VALUES ($1) ON CONFLICT (id) DO NOTHING;",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("Device Preferences")?;

    // grab the tasks the user already has set to completed
    let completed_tasks = sqlx::query_as!(
        GetOnlyCompletedTasks,
        "SELECT completed_tasks FROM DevicePreferences WHERE id = $1;",
        device_id
    )
    .fetch_one(&mut *txn)
    .await
    .bad_sql("Device Preferences")?
    .completed_tasks;

    txn.commit().await.bad_sql("Device Preferences")?;

    Ok(completed_tasks)
}

#[derive(sqlx::FromRow)]
struct GetOnlyCompletedTasks {
    completed_tasks: Vec<String>,
}

// get completed tasks using device id
pub async fn get_completed_tasks(
    device: Device,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<Task>>, AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }

    let completed_tasks =
        get_completed_task_by_device_id(&app_state.pgpool, device.0.unwrap()).await?;

    Ok(Json(fetch_tasks_by_ids(&app_state, completed_tasks).await?))
}

#[derive(serde::Deserialize)]
pub struct AffectedTask {
    task_id: String,
    direction: bool,
}

// performs a dfs completing all tasks either before or after depending on AffectedTask.direction
pub async fn set_completed_task(
    device: Device,
    State(app_state): State<AppState>,
    Json(task): Json<AffectedTask>,
) -> Result<(), AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }
    let device_id = device.0.unwrap();
    let task_id = task.task_id;

    // perform a dfs on adj_list
    let adj_list = fetch_adj_list(&app_state).await?;

    let mut visited = HashSet::new();

    let mut st = vec![task_id.clone()];
    let mut marked_tasks = HashSet::new();
    while let Some(top) = st.pop() {
        if visited.contains(&top) {
            continue;
        }
        marked_tasks.insert(top.clone());
        visited.insert(top.clone());

        if let Some(x) = adj_list.get(&top) {
            x.iter()
                .filter(|(_, status)| *status == task.direction)
                .for_each(|(adj_task_id, _)| st.push(adj_task_id.clone()));
        }
    }

    let mut completed_tasks: HashSet<String> =
        get_completed_task_by_device_id(&app_state.pgpool, device_id)
            .await?
            .into_iter()
            .collect();

    // if direction == true then all tasks that come after the
    // current task should be locked so remove them from completed tasks
    // if direction == false then all tasks that come before the
    // current task should be unlocked so add them to completed tasks

    if task.direction {
        // delete all marked tasks from completed_tasks
        for id in &marked_tasks {
            completed_tasks.remove(id);
        }
    } else {
        // combine the tasks
        completed_tasks.extend(marked_tasks.into_iter());
    }
    let result: Vec<String> = completed_tasks.into_iter().collect();

    // update what the user has as completed tasks
    sqlx::query!(
        "UPDATE DevicePreferences SET completed_tasks = $1 WHERE id = $2",
        &result,
        device_id,
    )
    .fetch_all(&app_state.pgpool)
    .await
    .bad_sql("Device Preferences")?;

    Ok(())
}

// sets the device completed tasks to empty
pub async fn clear_completed_tasks(
    device: Device,
    State(app_state): State<AppState>,
) -> Result<(), AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }

    sqlx::query!(
        "UPDATE DevicePreferences SET completed_tasks = $1 WHERE id = $2",
        &vec![],
        device.0.unwrap()
    )
    .execute(&app_state.pgpool)
    .await
    .bad_sql("Device Preferences")?;

    Ok(())
}
