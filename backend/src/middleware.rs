use crate::init_app_state::AppState;
use axum::{
    extract::{ConnectInfo, Request, State},
    middleware::Next,
    response::Response,
};
use axum_client_ip::ClientIp;
use reqwest::StatusCode;
use std::net::SocketAddr;

pub async fn get_connect_info(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    tracing::info!("{:?}", addr.ip());

    Ok(next.run(req).await)
}

pub async fn rate_limit_user(
    State(app_state): State<AppState>,
    ip: ClientIp,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    tracing::info!("{:?}", ip);

    Ok(next.run(req).await) //Err(StatusCode::TOO_MANY_REQUESTS)
}
