mod ammo_routes;
mod api_routers;
mod caching;
mod database_types;
mod deserialize_json_types;
mod endpoint_tests;
mod init_app_state;
mod item_routes;
mod query_types;
mod task_routes;
mod upsert;

use anyhow::Result;
use axum::Router;
use axum::extract::Request;
use axum::http::Response;
use dotenvy::dotenv;
use init_app_state::init_app_state;
use std::env;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[tokio::main]
async fn main() -> Result<()> {
    let (non_blocking, _guard) = tracing_appender::non_blocking(std::io::stdout());
    tracing_subscriber::fmt().with_writer(non_blocking).init();

    dotenv().ok();
    let postgres_url = env::var("DATABASE_URL")?;
    let redis_url = env::var("REDIS_URL")?;

    let app_state = init_app_state(postgres_url, redis_url).await?;

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse()?,
            "http://127.0.0.1:3000".parse()?,
            "http://frontend:3000".parse()?,
        ])
        .allow_headers(Any)
        .allow_methods(Any);

    let app = Router::new()
        .nest("/api", api_routers::api_router())
        .with_state(app_state)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|req: &Request<_>| {
                    tracing::info_span!(
                        "request",
                        method = %req.method(),
                        path = %req.uri().path(),
                        version = ?req.version()
                    )
                })
                .on_response(
                    |res: &Response<_>, latency: Duration, span: &tracing::Span| {
                        let status = res.status();

                        if status.is_client_error() {
                            tracing::warn!(
                                parent: span,
                                status = %status,
                                latency_ms = %latency.as_millis(),
                                "request resulted in error status"
                            );
                        }

                        if latency > Duration::from_millis(500) {
                            tracing::warn!(
                                parent: span,
                                status = %status,
                                latency_ms = %latency.as_millis(),
                                "slow request"
                            );
                        }
                    },
                ),
        )
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
