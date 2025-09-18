mod api_routers;
mod database_types;
mod query_types;
mod upsert;
use axum::Router;
use dotenvy::dotenv;
//use redis::AsyncCommands;

use sqlx::PgPool;
use std::env;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv().ok();
    let postgres_url = env::var("DATABASE_URL")?;
    // let redis_url = env::var("REDIS_URL")?;

    let pool = loop {
        match PgPool::connect(&postgres_url).await {
            Ok(p) => break p,
            Err(e) => {
                eprintln!("Waiting for DB... {}", e);
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    };
    sqlx::migrate!("./migrations").run(&pool).await?;

    // setting up redis and setting a key value pair
    // let client = redis::Client::open(redis_url)?;
    // let mut conn = client.get_async_connection().await?;

    // conn.set("hello", "world").await?;

    let (items_count, tasks_count): (i64, i64) = tokio::try_join!(
        sqlx::query_scalar("SELECT COUNT(*) FROM Item").fetch_one(&pool),
        sqlx::query_scalar("SELECT COUNT(*) FROM Task").fetch_one(&pool)
    )?;

    if items_count == 0 {
        upsert::upsert_data_file("most_recent_items.json", "items", &pool).await?;
    }

    if tasks_count == 0 {
        upsert::upsert_data_file("most_recent_tasks.json", "tasks", &pool).await?;
    }

    let app_state = database_types::AppState { pool };

    let app = Router::new()
        .nest("/api", api_routers::api_router())
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
