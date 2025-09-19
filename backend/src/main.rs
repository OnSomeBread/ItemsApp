mod api_routers;
mod database_types;
mod deserialize_json_types;
mod query_types;
mod upsert;
use axum::Router;
use bb8_redis::{RedisConnectionManager, bb8};
use dotenvy::dotenv;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use upsert::*;

use sqlx::PgPool;
use std::env;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv().ok();
    let postgres_url = env::var("DATABASE_URL")?;
    let redis_url = env::var("REDIS_URL")?;

    let pgpool = loop {
        match PgPool::connect(&postgres_url).await {
            Ok(p) => break p,
            Err(e) => {
                eprintln!("Waiting for DB... {}", e);
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
        .max_size(10)
        .build(RedisConnectionManager::new(redis_url)?)
        .await?;

    let next_items_call_timer = Arc::new(Mutex::new(None::<Instant>));
    let next_tasks_call_timer = Arc::new(Mutex::new(None::<Instant>));

    let pgpool1 = pgpool.clone();
    let pgpool2 = pgpool.clone();
    let items_call = next_items_call_timer.clone();
    let tasks_call = next_tasks_call_timer.clone();

    // spawn background task to refresh items in the database via api call
    tokio::spawn(async move {
        loop {
            let items_refresh_time = Duration::from_secs(3600 * 8);
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

    let app_state = database_types::AppState {
        pgpool,
        redispool,
        next_items_call_timer,
        next_tasks_call_timer,
    };

    let app = Router::new()
        .nest("/api", api_routers::api_router())
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
