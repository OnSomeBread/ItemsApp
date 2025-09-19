mod api_routers;
mod database_types;
mod deserialize_json_types;
mod query_types;
mod upsert;
use axum::Router;
use bb8_redis::{RedisConnectionManager, bb8};
use dotenvy::dotenv;
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
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
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

    let pgpool1 = pgpool.clone();
    let pgpool2 = pgpool.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600 * 8)).await;
            let _ = upsert_data_api("most_recent_items.json", "items", &pgpool1).await;
        }
    });

    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600 * 12)).await;
            let _ = upsert_data_api("most_recent_tasks.json", "tasks", &pgpool2).await;
        }
    });

    let app_state = database_types::AppState { pgpool, redispool };

    let app = Router::new()
        .nest("/api", api_routers::api_router())
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
