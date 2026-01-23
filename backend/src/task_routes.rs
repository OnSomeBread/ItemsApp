use crate::api_routers::{Device, Page, fetch_tasks_by_ids};
use crate::database_types::{
    DeviceTaskQueryParams, ItemBase, NeededItemsDB, Objective, Task, TaskBase, TaskFromDB,
    TaskRequirement,
};
use crate::init_app_state::{AppState, ITEMS_UNIQUE_CACHE_PREFIX, TASKS_UNIQUE_CACHE_PREFIX};
use crate::query_types::{AppError, AppError::BadRequest};
use crate::query_types::{AppErrorHandling, TaskQueryParams, TaskStats};
use ahash::{AHashMap as HashMap, AHashSet as HashSet};
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use sqlx::PgPool;
use sqlx::types::Uuid;
use std::time::Instant;
use tokio::try_join;

pub type AdjList = HashMap<String, Vec<(String, bool)>>;

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

    let time_in_seconds_tasks = app_state
        .next_tasks_call_timer
        .read()
        .await
        .saturating_duration_since(Instant::now())
        .as_secs();

    Ok(Json(TaskStats {
        tasks_completed_count: completed_tasks.len(),
        tasks_count: tasks_count.unwrap_or(0),
        kappa_completed_count,
        kappa_required_count: kappa_required.len(),
        lightkeeper_completed_count,
        lightkeeper_required_count: lightkeeper_required.len(),
        time_till_tasks_refresh_secs: time_in_seconds_tasks,
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
            .or_insert_with(|| (Vec::new(), Vec::new()))
            .0
            .push(buy);
    }

    for sell in task_requirement_vec {
        hm.entry(sell.task_id.clone())
            .or_insert_with(|| (Vec::new(), Vec::new()))
            .1
            .push(sell);
    }

    Ok(tasks_from_db
        .into_iter()
        .map(|task_from_db| {
            let mut task = Task::from(task_from_db);
            let (objectives, task_requirements) = hm
                .entry(task._id.clone())
                .or_insert_with(|| (Vec::new(), Vec::new()));
            task.objectives = std::mem::take(objectives);
            task.task_requirements = std::mem::take(task_requirements);
            task
        })
        .collect())
}

#[allow(clippy::too_many_arguments)]
fn save_task_query_parms(device_id: Uuid, query_parms: TaskQueryParams, pgpool: PgPool) {
    tokio::spawn(async move {
        #[allow(clippy::cast_possible_wrap)]
        let _ = sqlx::query!(
            "UPDATE TaskQueryParams 
                    SET search = $2, is_kappa = $3, is_lightkeeper = $4, 
                    player_lvl = $5, obj_type = $6, trader = $7 WHERE id = $1",
            device_id,
            query_parms.search,
            query_parms.is_kappa,
            query_parms.is_lightkeeper,
            query_parms.player_lvl as i32,
            if query_parms.obj_type.is_empty() {
                "any".to_string()
            } else {
                query_parms.obj_type
            },
            if query_parms.trader.is_empty() {
                "any".to_string()
            } else {
                query_parms.trader
            }
        )
        .execute(&pgpool)
        .await;
    });
}

pub async fn get_tasks(
    device: Device,
    Query(query_parms): Query<TaskQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<Task>>, AppError> {
    let TaskQueryParams {
        save,
        search,
        is_kappa,
        is_lightkeeper,
        obj_type,
        trader,
        player_lvl,
        limit,
        offset,
        include_completed,
    } = query_parms.clone();

    #[allow(clippy::cast_possible_wrap)]
    let player_lvl = player_lvl as i32;

    let ids = if include_completed && let Some(device_id) = device.0 {
        get_completed_task_by_device_id(&app_state.pgpool, device_id).await?
    } else {
        vec![]
    };

    // save query
    if save && let Some(device_id) = device.0 {
        save_task_query_parms(device_id, query_parms, app_state.pgpool.clone());
    }

    let cache_key = format!(
        "{}{}{}{}{}{}l{}o{}{}",
        TASKS_UNIQUE_CACHE_PREFIX,
        if is_kappa { "1" } else { "0" },
        if is_lightkeeper { "1" } else { "0" },
        obj_type,
        player_lvl,
        trader,
        limit,
        offset,
        search,
    );

    // try not to create too many cache keys when its not needed
    let use_cache = ids.is_empty();
    if use_cache && let Some(values) = app_state.cache.get_vec(&cache_key) {
        return Ok(Json(values));
    }

    let mut txn = app_state.pgpool.begin().await.bad_sql("Tasks")?;
    let tasks_from_db = sqlx::query_as!(
                TaskFromDB,
                "SELECT * FROM Task t WHERE (task_name ILIKE '%' || $1 || '%' OR task_name % $1) AND trader ILIKE $2 AND min_player_level <= $3 AND NOT (_id = ANY($4)) AND 
                ($5 IS FALSE OR kappa_required = TRUE) AND ($6 IS FALSE OR lightkeeper_required = TRUE) AND 
                EXISTS (SELECT 1 FROM Objective o WHERE o.task_id = t._id AND o.obj_type ILIKE $7) ORDER BY _id ASC LIMIT $8 OFFSET $9",
                search,
                format!("%{trader}%"),
                player_lvl,
                &ids,
                is_kappa,
                is_lightkeeper,
                format!("%{obj_type}%"),
                i64::from(limit),
                i64::from(offset)
            )
            .fetch_all(&mut *txn)
            .await
            .bad_sql("Tasks")?;

    let tasks = tasks_from_db_to_tasks(tasks_from_db, txn).await?;

    // save tasks in redis cache
    if use_cache {
        let tokio_tasks = tasks.clone();
        tokio::spawn(async move {
            app_state
                .cache
                .insert_vec(cache_key, &tokio_tasks, TASKS_UNIQUE_CACHE_PREFIX);
        });
    }

    Ok(Json(tasks))
}

pub async fn get_tasks_base(
    device: Device,
    Query(query_parms): Query<TaskQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<TaskBase>>, AppError> {
    let TaskQueryParams {
        save: _,
        search,
        is_kappa,
        is_lightkeeper,
        obj_type,
        trader,
        player_lvl,
        limit,
        offset,
        include_completed,
    } = query_parms.clone();

    #[allow(clippy::cast_possible_wrap)]
    let player_lvl = player_lvl as i32;

    let ids = if include_completed && let Some(device_id) = device.0 {
        get_completed_task_by_device_id(&app_state.pgpool, device_id).await?
    } else {
        vec![]
    };

    let cache_key = format!(
        "{}b{}{}{}{}{}l{}o{}{}",
        TASKS_UNIQUE_CACHE_PREFIX,
        if is_kappa { "1" } else { "0" },
        if is_lightkeeper { "1" } else { "0" },
        obj_type,
        player_lvl,
        trader,
        limit,
        offset,
        search,
    );

    // try not to create too many cache keys when its not needed
    let use_cache = ids.is_empty();
    if use_cache && let Some(values) = app_state.cache.get_vec(&cache_key) {
        return Ok(Json(values));
    }

    let tasks = sqlx::query_as!(
                TaskBase,
                "SELECT _id, task_name FROM Task t WHERE (task_name ILIKE '%' || $1 || '%' OR task_name % $1) AND trader ILIKE $2 AND min_player_level <= $3 AND NOT (_id = ANY($4)) AND 
                ($5 IS FALSE OR kappa_required = TRUE) AND ($6 IS FALSE OR lightkeeper_required = TRUE) AND 
                EXISTS (SELECT 1 FROM Objective o WHERE o.task_id = t._id AND o.obj_type ILIKE $7) ORDER BY _id ASC LIMIT $8 OFFSET $9",
                search,
                format!("%{trader}%"),
                player_lvl,
                &ids,
                is_kappa,
                is_lightkeeper,
                format!("%{obj_type}%"),
                i64::from(limit),
                i64::from(offset)
            )
            .fetch_all(&app_state.pgpool)
            .await
            .bad_sql("TasksBase")?;

    // save tasks in redis cache
    if use_cache {
        let tokio_tasks = tasks.clone();
        tokio::spawn(async move {
            app_state
                .cache
                .insert_vec(cache_key, &tokio_tasks, TASKS_UNIQUE_CACHE_PREFIX);
        });
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
async fn fetch_adj_list(app_state: &AppState) -> Result<AdjList, AppError> {
    let cache_key = TASKS_UNIQUE_CACHE_PREFIX.to_string() + "adj_list";

    if let Some(ans) = app_state.cache.get_adj_list(&cache_key) {
        return Ok(ans);
    }

    let task_requirements = sqlx::query_as!(TaskRequirement, "SELECT * FROM TaskRequirement")
        .fetch_all(&app_state.pgpool)
        .await
        .bad_sql("TaskRequirements")?;

    let mut adj_list: AdjList = HashMap::new();
    for req in task_requirements {
        let from_id = req.task_id;
        let to_id = req.req_task_id;

        adj_list
            .entry(from_id.clone())
            .or_default()
            .push((to_id.clone(), false));

        adj_list.entry(to_id).or_default().push((from_id, true));
    }

    let cache = app_state.cache.clone();
    let tokio_adj_list = adj_list.clone();

    // store the adj_list that have not been found in redis cache
    tokio::spawn(async move {
        cache.insert_adj_list(cache_key, &tokio_adj_list, TASKS_UNIQUE_CACHE_PREFIX);
    });

    Ok(adj_list)
}

pub async fn get_adj_list(State(app_state): State<AppState>) -> Result<Json<AdjList>, AppError> {
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
) -> Result<Json<Vec<TaskBase>>, AppError> {
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

    let mut visited: HashSet<String> = HashSet::new();

    let mut st = vec![task_id.clone()];
    let mut marked_tasks: HashSet<String> = HashSet::new();
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

pub async fn get_tasks_help(Query(query_parms): Query<TaskQueryParams>) -> Json<TaskQueryParams> {
    Json(query_parms)
}

pub async fn get_required_items(
    device: Device,
    Query(query_parms): Query<TaskQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<(ItemBase, i32)>>, AppError> {
    let TaskQueryParams {
        save: _,
        search,
        is_kappa,
        is_lightkeeper,
        obj_type,
        trader,
        player_lvl,
        limit: _,
        offset: _,
        include_completed,
    } = query_parms.clone();

    #[allow(clippy::cast_possible_wrap)]
    let player_lvl = player_lvl as i32;

    let ids = if include_completed && let Some(device_id) = device.0 {
        get_completed_task_by_device_id(&app_state.pgpool, device_id).await?
    } else {
        vec![]
    };

    let count_cache_key = format!(
        "{}r{}{}{}{}{}{}",
        TASKS_UNIQUE_CACHE_PREFIX,
        if is_kappa { "1" } else { "0" },
        if is_lightkeeper { "1" } else { "0" },
        obj_type,
        player_lvl,
        trader,
        search,
    );

    let item_cache_key = format!(
        "{}r{}{}{}{}{}{}",
        ITEMS_UNIQUE_CACHE_PREFIX,
        if is_kappa { "1" } else { "0" },
        if is_lightkeeper { "1" } else { "0" },
        obj_type,
        player_lvl,
        trader,
        search,
    );

    // try not to create too many cache keys when its not needed
    let use_cache = ids.is_empty();
    if use_cache
        && let Some(counts) = app_state.cache.get_vec(&count_cache_key)
        && let Some(items) = app_state.cache.get_vec(&item_cache_key)
    {
        return Ok(Json(items.into_iter().zip(counts.into_iter()).collect()));
    }

    let values = sqlx::query_as!(
        NeededItemsDB,
        "SELECT o.count, o.needed_item_ids FROM Task t INNER JOIN Objective o 
        ON t._id = o.task_id AND o.obj_type ILIKE $7 WHERE (t.task_name ILIKE '%' || $1 || '%' OR t.task_name % $1) AND t.trader ILIKE $2 AND 
        t.min_player_level <= $3 AND NOT (t._id = ANY($4)) AND 
        ($5 IS FALSE OR t.kappa_required = TRUE) AND ($6 IS FALSE OR t.lightkeeper_required = TRUE)
        ORDER BY t._id ASC",
        search,
        format!("%{trader}%"),
        player_lvl,
        &ids,
        is_kappa,
        is_lightkeeper,
        format!("%{obj_type}%"),
    )
    .fetch_all(&app_state.pgpool)
    .await
    .bad_sql("NeededItems")?;

    // group item ids
    let mut item_to_count: HashMap<String, i32> = HashMap::new();
    for v in values {
        for item_id in v.needed_item_ids {
            *item_to_count.entry(item_id).or_insert(0) += v.count;
        }
    }

    let item_ids: Vec<String> = item_to_count.keys().cloned().collect();

    let items: Vec<ItemBase> = ItemBase::fetch_by_ids(&app_state.pgpool, &item_ids).await?;

    // CANT USE .values() HERE BECAUSE ORDER WOULD BE WRONG
    let counts: Vec<i32> = items
        .iter()
        .map(|i| *item_to_count.get(&i._id).unwrap_or(&0))
        .collect();

    // save tasks in redis cache
    if use_cache {
        let tokio_items = items.clone();
        let tokio_counts = counts.clone();
        tokio::spawn(async move {
            app_state
                .cache
                .insert_vec(item_cache_key, &tokio_items, ITEMS_UNIQUE_CACHE_PREFIX);

            app_state
                .cache
                .insert_vec(count_cache_key, &tokio_counts, TASKS_UNIQUE_CACHE_PREFIX);
        });
    }

    Ok(Json(items.into_iter().zip(counts.into_iter()).collect()))
}
