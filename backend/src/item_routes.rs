use crate::api_routers::Device;
use crate::database_types::{
    BuyFor, DeviceItemQueryParams, Item, ItemFromDB, SavedItemData, SellFor,
};
use crate::init_app_state::{AppState, ITEM_SLEEP_TIME, ITEMS_UNIQUE_CACHE_PREFIX};
use crate::query_types::{AppError, AppError::BadRequest};
use crate::query_types::{AppErrorHandling, ItemHistoryQueryParams, ItemQueryParams, ItemStats};
use ahash::AHashMap as HashMap;
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use sqlx::types::Uuid;
use sqlx::{PgPool, Postgres};
use std::time::Instant;

// gives data on different interesting stats about the data stored
pub async fn item_stats(State(app_state): State<AppState>) -> Result<Json<ItemStats>, AppError> {
    let time_in_seconds = app_state
        .next_items_call_timer
        .read()
        .await
        .saturating_duration_since(Instant::now())
        .as_secs();

    if let Some(items_count) = app_state.cache.get("item_stats") {
        return Ok(Json(ItemStats {
            items_count,
            time_till_items_refresh_secs: time_in_seconds,
        }));
    }

    let items_count = sqlx::query_scalar!("SELECT COUNT(*) FROM Item")
        .fetch_one(&app_state.pgpool)
        .await
        .bad_sql("Item Stats")?
        .unwrap_or(0);

    tokio::spawn(async move {
        app_state
            .cache
            .insert("item_stats", items_count, ITEMS_UNIQUE_CACHE_PREFIX);
    });

    Ok(Json(ItemStats {
        items_count,
        time_till_items_refresh_secs: time_in_seconds,
    }))
}

// this adds buyfor and sellfor to items so that it can be returned to user
// much faster than left later join these
pub async fn items_from_db_to_items(
    items_from_db: Vec<ItemFromDB>,
    mut txn: sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<Vec<Item>, AppError> {
    let ids: Vec<String> = items_from_db.iter().map(|item| item._id.clone()).collect();
    let buy_for_vec = sqlx::query_as!(BuyFor, "SELECT * FROM BuyFor WHERE item_id = ANY($1)", &ids)
        .fetch_all(&mut *txn)
        .await
        .bad_sql("BuyFor and SellFor")?;

    let sell_for_vec = sqlx::query_as!(
        SellFor,
        "SELECT * FROM SellFor WHERE item_id = ANY($1)",
        &ids
    )
    .fetch_all(&mut *txn)
    .await
    .bad_sql("BuyFor and SellFor")?;

    txn.commit().await.bad_sql("Items")?;

    let mut hm: HashMap<String, (Vec<BuyFor>, Vec<SellFor>)> = HashMap::new();
    for buy in buy_for_vec {
        hm.entry(buy.item_id.clone())
            .or_insert_with(|| (Vec::new(), Vec::new()))
            .0
            .push(buy);
    }

    for sell in sell_for_vec {
        hm.entry(sell.item_id.clone())
            .or_insert_with(|| (Vec::new(), Vec::new()))
            .1
            .push(sell);
    }

    Ok(items_from_db
        .into_iter()
        .map(|item_from_db| {
            let mut item = Item::from(item_from_db);
            let (buys, sells) = hm
                .entry(item._id.clone())
                .or_insert_with(|| (Vec::new(), Vec::new()));
            item.buys = std::mem::take(buys);
            item.sells = std::mem::take(sells);
            item
        })
        .collect())
}

fn save_item_query_parms(device_id: Uuid, query_parms: ItemQueryParams, pgpool: PgPool) {
    tokio::spawn(async move {
        let _ = sqlx::query!(
            "UPDATE ItemQueryParams
                    SET search = $2, sort_asc = $3, sort_by = $4, item_type = $5 WHERE id = $1",
            device_id,
            query_parms.search,
            query_parms.sort_asc,
            if query_parms.sort_by.is_empty() {
                "base_price".to_string()
            } else {
                query_parms.sort_by
            },
            if query_parms.item_type.is_empty() {
                "any".to_string()
            } else {
                query_parms.item_type
            },
        )
        .execute(&pgpool)
        .await;
    });
}

// grabs items from the Item table based off of the query params
// there are 2 types of queries the first approach is to query for
// Item, BuyFor, SellFor as 3 separate queries which runs quickly
// for multiple runs then slows down presumibly from the extra connections
// the second approach is to query all at once as a join which does not have
// the connections issue and is much easier to work with but is also much slower
pub async fn get_items(
    device: Device,
    Query(query_parms): Query<ItemQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<Item>>, AppError> {
    let ItemQueryParams {
        save,
        search,
        sort_asc,
        sort_by,
        item_type,
        limit,
        offset,
    } = query_parms.clone();

    let limit = std::cmp::min(limit, 500);

    // save query
    if save && let Some(device_id) = device.0 {
        save_item_query_parms(device_id, query_parms, app_state.pgpool.clone());
    }

    // redis performance falls off at large amounts of items
    let cache_key = format!(
        "{}{}{}{}{}{}{}",
        ITEMS_UNIQUE_CACHE_PREFIX,
        if sort_asc { "1" } else { "0" },
        sort_by,
        limit,
        item_type,
        offset,
        search,
    );

    // let prev_cache_key = format!(
    //     "{}{}{}{}{}{}{}",
    //     ITEMS_UNIQUE_CACHE_PREFIX,
    //     if sort_asc { "1" } else { "0" },
    //     sort_by,
    //     limit,
    //     item_type,
    //     offset,
    //     search,
    // );

    if let Some(values) = app_state.cache.get_vec(&cache_key) {
        return Ok(Json(values));
    }

    let sort_by = sort_by.to_lowercase();
    let is_flea = sort_by == "flea_market"
        || sort_by == "buy_from_flea_instant_profit"
        || sort_by == "buy_from_trader_instant_profit"
        || sort_by == "per_slot"
        || sort_by == "avg_24h_price"
        || sort_by == "change_last_48h_percent";

    let mut txn = app_state.pgpool.begin().await.bad_sql("Items")?;
    let mut qb: sqlx::QueryBuilder<'_, Postgres> = sqlx::query_builder::QueryBuilder::new("");
    if sort_by == "flea_market" {
        qb.push("SELECT i.* FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id WHERE LOWER(b.trader_name) = 'flea market' ");
    } else {
        qb.push("SELECT i.* FROM Item i WHERE 1=1 ");
    }

    if !search.is_empty() {
        qb.push("AND (i.item_name ILIKE ")
            .push_bind(format!("%{}%", search))
            .push(" OR i.item_name % ")
            .push_bind(search)
            .push(") ");
    }

    qb.push("AND i.item_types ILIKE ")
        .push_bind(format!("%{}%", item_type))
        .push(" ");

    if is_flea {
        qb.push("AND i.is_flea = TRUE ");
    }

    if sort_by == "flea_market" {
        qb.push("ORDER BY b.price_rub, i._id ");
    } else {
        qb.push("ORDER BY i.").push(sort_by).push(", i._id ");
    }

    qb.push(if sort_asc { "ASC" } else { "DESC" });
    qb.push(" LIMIT ")
        .push_bind(i64::from(limit))
        .push(" OFFSET ")
        .push_bind(i64::from(offset));

    let items_from_db = qb
        .build_query_as()
        .fetch_all(&mut *txn)
        .await
        .bad_sql("Items")?;

    let items = items_from_db_to_items(items_from_db, txn).await?;

    let tokio_values = items.clone();
    tokio::spawn(async move {
        app_state
            .cache
            .insert_vec(cache_key, tokio_values, ITEMS_UNIQUE_CACHE_PREFIX);
    });

    Ok(Json(items))
}

pub async fn get_device_item_query_parms(
    device: Device,
    State(app_state): State<AppState>,
) -> Result<Json<DeviceItemQueryParams>, AppError> {
    if device.0.is_none() {
        return Err(BadRequest("Endpoint Requires a device id".into()));
    }
    let device_id = device.0.unwrap();

    let mut txn = app_state.pgpool.begin().await.bad_sql("Items")?;

    sqlx::query!(
        "INSERT INTO DevicePreferences VALUES ($1) ON CONFLICT (id) DO NOTHING;",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("Device Preferences")?;

    sqlx::query!(
        "INSERT INTO ItemQueryParams VALUES ($1) ON CONFLICT (id) DO NOTHING",
        device_id
    )
    .execute(&mut *txn)
    .await
    .bad_sql("ItemQueryParams")?;

    let v = sqlx::query_as!(
        DeviceItemQueryParams,
        "SELECT * FROM ItemQueryParams WHERE id = $1;",
        device_id
    )
    .fetch_one(&mut *txn)
    .await
    .bad_sql("Items")?;

    txn.commit().await.bad_sql("ItemQueryParams")?;

    Ok(Json(v))
}

// returns flea market data by timestamp for a single id
pub async fn get_item_history(
    Query(query_parms): Query<ItemHistoryQueryParams>,
    State(app_state): State<AppState>,
) -> Result<Json<Vec<SavedItemData>>, AppError> {
    if query_parms.item_id.is_none() {
        return Ok(Json(vec![]));
    }

    let item_id = query_parms.item_id.unwrap();
    let cache_key = item_id.clone() + "-history";

    if let Some(values) = app_state.cache.get_vec(&cache_key) {
        return Ok(Json(values));
    }

    let rows = sqlx::query_as!(
        SavedItemData,
        "SELECT price_rub, recorded_time FROM SavedItemData WHERE item_id = $1 ORDER BY recorded_time ASC",
        item_id
    )
    .fetch_all(&app_state.pgpool)
    .await
    .bad_sql("ItemHistory")?;

    // since data is sampled at 1 every ITEM_SLEEP_TIME then item_history_sample_amount * ITEM_SLEEP_TIME = seconds difference of each sample
    let item_history: Vec<SavedItemData> = rows
        .into_iter()
        .step_by(3600 / ITEM_SLEEP_TIME as usize)
        .collect();

    let tokio_values = item_history.clone();
    tokio::spawn(async move {
        app_state
            .cache
            .insert_vec(cache_key, tokio_values, ITEMS_UNIQUE_CACHE_PREFIX);
    });

    Ok(Json(item_history))
}

pub async fn get_items_help(Query(query_parms): Query<ItemQueryParams>) -> Json<ItemQueryParams> {
    Json(query_parms)
}
