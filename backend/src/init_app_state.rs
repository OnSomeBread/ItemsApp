use crate::upsert::{upsert_data_api, upsert_data_file};
use bb8_redis::{RedisConnectionManager, bb8};
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

    let (items_count, tasks_count): (i64, i64) = tokio::try_join!(
        sqlx::query_scalar("SELECT COUNT(*) FROM Item").fetch_one(&pgpool),
        sqlx::query_scalar("SELECT COUNT(*) FROM Task").fetch_one(&pgpool)
    )?;

    if items_count == 0 {
        upsert_data_file("most_recent_items.json", "items", &pgpool).await?;
    }

    if tasks_count == 0 {
        upsert_data_file("most_recent_tasks.json", "tasks", &pgpool).await?;
    }

    let redispool = bb8::Pool::builder()
        .min_idle(2)
        .connection_timeout(Duration::from_millis(100))
        .max_size(10)
        .build(RedisConnectionManager::new(redis_url)?)
        .await?;

    let next_items_call_timer = Arc::new(Mutex::new(None::<Instant>));
    let next_tasks_call_timer = Arc::new(Mutex::new(None::<Instant>));

    let pgpool1 = pgpool.clone();
    let pgpool2 = pgpool.clone();
    let pgpool3 = pgpool.clone();
    let items_call = next_items_call_timer.clone();
    let tasks_call = next_tasks_call_timer.clone();

    // spawn background task to refresh items in the database via api call
    tokio::spawn(async move {
        loop {
            let items_refresh_time = Duration::from_secs(600);
            *items_call.lock().unwrap() = Some(Instant::now() + items_refresh_time);

            tokio::time::sleep(items_refresh_time).await;
            let _ = upsert_data_api("most_recent_items.json", "items", &pgpool1).await;
        }
    });

    // spawn background task to refresh tasks in the database via api call
    tokio::spawn(async move {
        loop {
            let tasks_refresh_time = Duration::from_secs(3600 * 12);
            *tasks_call.lock().unwrap() = Some(Instant::now() + tasks_refresh_time);

            tokio::time::sleep(tasks_refresh_time).await;
            let _ = upsert_data_api("most_recent_tasks.json", "tasks", &pgpool2).await;
        }
    });

    // spawn background task to delete device preferences that are inactive
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(3600 * 24)).await;
            let _ = sqlx::query!(
                r#"DELETE FROM DevicePreferences WHERE last_visited < NOW() - INTERVAL '30 days'"#,
            )
            .execute(&pgpool3)
            .await;
        }
    });

    Ok(AppState {
        pgpool,
        redispool,
        next_items_call_timer,
        next_tasks_call_timer,
    })
}
