use crate::init_app_state::AppState;
use axum::{
    extract::{Request, State},
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use reqwest::StatusCode;
use std::time::Instant;

const MAX_TOKENS: f64 = 50.0;
const REFILL_RATE: f64 = 5.0;

pub async fn rate_limit_user(
    State(app_state): State<AppState>,
    headers: HeaderMap,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let Some(ip): Option<String> = headers
        .get("x-real-ip")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
    else {
        return Ok(next.run(req).await);
    };

    let mut e = app_state
        .rate_limit
        .entry(ip.clone())
        .or_insert_with(|| (MAX_TOKENS, Instant::now()));

    #[allow(clippy::cast_precision_loss)]
    let elapsed_secs = e.1.elapsed().as_millis() as u64 as f64 / 1_000.0;
    e.0 += elapsed_secs * REFILL_RATE;
    e.0 = e.0.min(MAX_TOKENS);
    e.1 = Instant::now();

    if e.0 < 1.0 {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    e.0 -= 1.0;

    drop(e);

    Ok(next.run(req).await)
}
