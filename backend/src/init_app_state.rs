use crate::deserialize_json_types::{Ammo, Item, Task};
use crate::upsert::Upsert;
use bb8_redis::{RedisConnectionManager, bb8};
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use std::error::Error;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct AppState {
    pub pgpool: sqlx::PgPool,
    pub redispool: bb8::Pool<RedisConnectionManager>,
    pub next_items_call_timer: Arc<Mutex<Option<Instant>>>,
    pub next_tasks_call_timer: Arc<Mutex<Option<Instant>>>,
}

const ITEMS_FILE: &str = "most_recent_items.json";
const ITEM_SLEEP_TIME: u64 = 600;

const TASKS_FILE: &str = "most_recent_tasks.json";
const TASK_SLEEP_TIME: u64 = 3600 * 24;

const AMMO_FILE: &str = "most_recent_ammo.json";
const AMMO_SLEEP_TIME: u64 = 3600 * 24;

const DELETE_DEVICE_PREFERENCES_TIME: u64 = 3600 * 24;

#[allow(clippy::too_many_lines)]
pub async fn init_app_state(
    postgres_url: String,
    redis_url: String,
) -> Result<AppState, Box<dyn Error>> {
    let pgpool = loop {
        match PgPoolOptions::new()
            .min_connections(1)
            .max_connections(10)
            .idle_timeout(Duration::from_mins(30))
            .connect(&postgres_url)
            .await
        {
            Ok(p) => break p,
            Err(e) => {
                tracing::warn!("Waiting for DB... {e}");
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    };
    sqlx::migrate!("./migrations").run(&pgpool).await?;

    init_data(&pgpool).await?;

    let redispool = bb8::Pool::builder()
        .min_idle(2)
        .connection_timeout(Duration::from_millis(100))
        .max_size(10)
        .build(RedisConnectionManager::new(redis_url)?)
        .await?;

    let next_items_call_timer = Arc::new(Mutex::new(None::<Instant>));
    let next_tasks_call_timer = Arc::new(Mutex::new(None::<Instant>));
    let next_ammo_call_timer = Arc::new(Mutex::new(None::<Instant>));

    background_tasks(
        &next_items_call_timer,
        &next_tasks_call_timer,
        &next_ammo_call_timer,
        &pgpool,
    );

    Ok(AppState {
        pgpool,
        redispool,
        next_items_call_timer,
        next_tasks_call_timer,
    })
}

// this initializes the database
async fn init_data(pgpool: &PgPool) -> Result<(), Box<dyn Error>> {
    let (items_count, tasks_count, ammo_count): (i64, i64, i64) = tokio::try_join!(
        sqlx::query_scalar("SELECT COUNT(*) FROM Item").fetch_one(pgpool),
        sqlx::query_scalar("SELECT COUNT(*) FROM Task").fetch_one(pgpool),
        sqlx::query_scalar("SELECT COUNT(*) FROM Ammo").fetch_one(pgpool)
    )?;

    if items_count == 0 {
        let pgpool = pgpool.clone();
        tokio::spawn(async move { Item::init(ITEMS_FILE, pgpool).await });
    }

    if tasks_count == 0 {
        let pgpool = pgpool.clone();
        tokio::spawn(async move {
            tokio::spawn(async move { Task::init(TASKS_FILE, pgpool).await });
        });
    }

    if ammo_count == 0 {
        let pgpool = pgpool.clone();
        tokio::spawn(async move {
            tokio::spawn(async move { Ammo::init(AMMO_FILE, pgpool).await });
        });
    }

    Ok(())
}

// this spawns all of the background tasks that the app will need
fn background_tasks(
    next_items_call_timer: &Arc<Mutex<Option<Instant>>>,
    next_tasks_call_timer: &Arc<Mutex<Option<Instant>>>,
    next_ammo_call_timer: &Arc<Mutex<Option<Instant>>>,
    pgpool: &PgPool,
) {
    let pgpool1 = pgpool.clone();
    let pgpool2 = pgpool.clone();
    let pgpool3 = pgpool.clone();
    let pgpool4 = pgpool.clone();
    let items_call = next_items_call_timer.clone();
    let tasks_call = next_tasks_call_timer.clone();
    let ammo_call = next_ammo_call_timer.clone();

    // spawn background task to refresh items in the database via api call
    tokio::spawn(async move {
        let pgpool1 = pgpool1;
        let items_call = items_call;
        loop {
            Item::background_task(ITEMS_FILE, &items_call, ITEM_SLEEP_TIME, &pgpool1).await;
        }
    });

    // spawn background task to refresh tasks in the database via api call
    tokio::spawn(async move {
        let pgpool2 = pgpool2;
        let tasks_call = tasks_call;
        loop {
            Task::background_task(TASKS_FILE, &tasks_call, TASK_SLEEP_TIME, &pgpool2).await;
        }
    });

    // spawn background task to refresh ammo via api call
    tokio::spawn(async move {
        let pgpool3 = pgpool3;
        let ammo_call = ammo_call;
        loop {
            Ammo::background_task(AMMO_FILE, &ammo_call, AMMO_SLEEP_TIME, &pgpool3).await;
        }
    });

    // spawn background task to delete device preferences that are inactive
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(DELETE_DEVICE_PREFERENCES_TIME)).await;
            let v = sqlx::query!(
                r#"DELETE FROM DevicePreferences WHERE last_visited < NOW() - INTERVAL '30 days'"#,
            )
            .execute(&pgpool4)
            .await;

            match v {
                Ok(value) => {
                    tracing::info!("successfully deleted {} rows", value.rows_affected());
                }
                Err(e) => {
                    tracing::error!("failed to delete old device preferences with error {}", e);
                }
            }
        }
    });
}
