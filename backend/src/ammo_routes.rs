use crate::{
    api_routers::{Device, RedisCache},
    database_types::{Ammo, DeviceAmmoQueryParams},
    init_app_state::AppState,
    query_types::{AmmoQueryParams, AppError, AppError::BadRequest, AppErrorHandling},
};
use axum::{
    Json,
    extract::{Query, State},
};
use sqlx::{PgPool, types::Uuid};

pub async fn get_ammo(
    device: Device,
    Query(query_parms): Query<AmmoQueryParams>,
    State(AppState {
        pgpool,
        redispool,
        next_items_call_timer: _,
        next_tasks_call_timer: _,
        next_ammo_call_timer,
    }): State<AppState>,
) -> Result<Json<Vec<Ammo>>, AppError> {
    let AmmoQueryParams {
        search,
        sort_by,
        sort_asc,
        damage,
        penetration_power,
        initial_speed,
        ammo_type,
        limit,
        offset,
        save,
    } = query_parms;

    // save query
    if save && let Some(device_id) = device.0 {
        save_ammo_query_parms(
            device_id,
            search.clone(),
            sort_by.clone(),
            sort_asc,
            damage,
            penetration_power,
            initial_speed,
            ammo_type.clone(),
            pgpool.clone(),
        );
    }

    // redis performance falls off at large amounts of items
    let cache_key = format!(
        "${}{}d{}p{}i{}{}l{}o{}{}",
        if sort_asc { "1" } else { "0" },
        sort_by,
        damage,
        penetration_power,
        initial_speed,
        ammo_type,
        limit,
        offset,
        search,
    );

    if let Some(values) = Ammo::get_vec(&cache_key, &redispool).await? {
        return Ok(Json(values));
    }

    let sql = format!(
        "SELECT * FROM Ammo 
        WHERE caliber ILIKE $1 AND damage >= $2 AND penetration_power >= $3 AND initial_speed >= $4 AND ammo_type ILIKE $5 ORDER BY {} {} LIMIT $6 OFFSET $7",
        sort_by,
        if sort_asc { "ASC" } else { "DESC" },
    );

    let ammo = sqlx::query_as(&sql)
        .bind(format!("%{search}%"))
        .bind(damage)
        .bind(penetration_power)
        .bind(initial_speed)
        .bind(format!("%{ammo_type}%"))
        .bind(i64::from(limit))
        .bind(i64::from(offset))
        .fetch_all(&pgpool)
        .await
        .bad_sql("Ammo")?;

    Ammo::set_vec(
        cache_key,
        ammo.clone(),
        redispool,
        next_ammo_call_timer.clone(),
    );

    Ok(Json(ammo))
}

#[allow(clippy::too_many_arguments)]
fn save_ammo_query_parms(
    device_id: Uuid,
    search: String,
    sort_by: String,
    sort_asc: bool,
    damage: i32,
    penetration_power: i32,
    initial_speed: f32,
    ammo_type: String,
    pgpool: PgPool,
) {
    tokio::spawn(async move {
        let _ = sqlx::query!(
            "UPDATE AmmoQueryParams
                    SET search = $2, sort_by = $3, sort_asc = $4, damage = $5, penetration_power = $6, initial_speed = $7, ammo_type = $8 WHERE id = $1",
            device_id,
            search,
            sort_by,
            sort_asc,
            damage,
            penetration_power,
            initial_speed,
            if ammo_type.is_empty() {
                "any".to_string()
            } else {
                ammo_type
            },
        )
        .execute(&pgpool)
        .await;
    });
}

pub async fn get_device_ammo_query_parms(
    device: Device,
    State(app_state): State<AppState>,
) -> Result<Json<DeviceAmmoQueryParams>, AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }
    let device_id = device.0.unwrap();

    let mut txn = app_state.pgpool.begin().await.bad_sql("AmmoQueryParams")?;

    sqlx::query!(
        "INSERT INTO DevicePreferences VALUES ($1) ON CONFLICT (id) DO NOTHING;",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("Device Preferences")?;

    sqlx::query!(
        "INSERT INTO AmmoQueryParams VALUES ($1) ON CONFLICT (id) DO NOTHING",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("AmmoQueryParams")?;

    let v = sqlx::query_as!(
        DeviceAmmoQueryParams,
        "SELECT * FROM AmmoQueryParams WHERE id = $1;",
        device_id
    )
    .fetch_one(&mut *txn)
    .await
    .bad_sql("AmmoQueryParams")?;

    txn.commit().await.bad_sql("AmmoQueryParams")?;

    Ok(Json(v))
}
