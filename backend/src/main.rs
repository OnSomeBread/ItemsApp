mod api_routers;
mod database_types;
mod deserialize_json_types;
mod endpoint_tests;
mod init_app_state;
mod item_routes;
mod query_types;
mod task_routes;
mod upsert;

use axum::Router;
use dotenvy::dotenv;
use init_app_state::init_app_state;
use std::env;
use std::error::Error;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv().ok();
    let postgres_url = env::var("DATABASE_URL")?;
    let redis_url = env::var("REDIS_URL")?;

    let app_state = init_app_state(postgres_url, redis_url).await?;

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse().unwrap(),
            "http://127.0.0.1:3000".parse().unwrap(),
            "http://frontend:3000".parse().unwrap(),
        ])
        .allow_headers(Any)
        .allow_methods(Any);

    let app = Router::new()
        .nest("/api", api_routers::api_router())
        .with_state(app_state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
