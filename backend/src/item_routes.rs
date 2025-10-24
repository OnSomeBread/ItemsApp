use crate::api_routers::Device;
use crate::database_types::{
    BuyFor, DeviceItemQueryParams, Item, ItemFromDB, SavedItemData, SellFor,
};
use crate::init_app_state::{AppState, ITEMS_UNIQUE_CACHE_PREFIX};
use crate::query_types::{AppError, AppError::BadRequest};
use crate::query_types::{AppErrorHandling, ItemHistoryQueryParams, ItemQueryParams, ItemStats};
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use sqlx::PgPool;
use sqlx::types::Uuid;
use std::collections::HashMap;
use std::time::Instant;

// gives data on different interesting stats about the data stored
pub async fn item_stats(State(app_state): State<AppState>) -> Result<Json<ItemStats>, AppError> {
    let items_count = sqlx::query_scalar!("SELECT COUNT(*) FROM Item")
        .fetch_one(&app_state.pgpool)
        .await
        .bad_sql("Item Stats")?;

    let time_in_seconds = app_state
        .next_items_call_timer
        .read()
        .await
        .saturating_duration_since(Instant::now())
        .as_secs();

    Ok(Json(ItemStats {
        items_count: items_count.unwrap_or(0),
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

    if let Some(values) = app_state.cache.get_vec(&cache_key).await {
        return Ok(Json(values));
    }

    // welp doing this is much cleaner but far slower than the main query ¯\_(ツ)_/¯
    // THIS QUERY REQUIRES INDEX ON item_id FOR BOTH buyfor and sellfor but is faster than above approach
    // let items_test: Vec<Item> = sqlx::query_as!(
    //     Item,
    //     r#"SELECT i.*,
    //         COALESCE(buys.buys, '{}') AS "buys!:Vec<BuyFor>",
    //         COALESCE(sells.sells, '{}') AS "sells!:Vec<SellFor>"
    //         FROM Item i
    //         LEFT JOIN LATERAL (
    //             SELECT ARRAY_AGG(b.*) AS buys
    //             FROM BuyFor b
    //             WHERE b.item_id = i._id
    //         ) buys ON TRUE
    //         LEFT JOIN LATERAL (
    //             SELECT ARRAY_AGG(s.*) AS sells
    //             FROM SellFor s
    //             WHERE s.item_id = i._id
    //         ) sells ON TRUE
    //         WHERE i.item_name ILIKE $1 AND i.item_types ILIKE $2
    //         ORDER BY i.base_price DESC LIMIT $3 OFFSET $4;"#,
    //     format!("%{}%", search),
    //     format!("%{}%", item_type),
    //     limit as i64,
    //     offset as i64
    // )
    // .fetch_all(&pgpool)
    // .await
    // .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    // return Ok(Json(items_test));

    let sort_by = sort_by.to_lowercase();
    let is_flea = sort_by == "flea_market"
        || sort_by == "buy_from_flea_instant_profit"
        || sort_by == "buy_from_trader_instant_profit"
        || sort_by == "per_slot"
        || sort_by == "avg_24h_price"
        || sort_by == "change_last_48h_percent";

    let mut txn = app_state.pgpool.begin().await.bad_sql("Items")?;
    let items_from_db = if sort_by == "flea_market" {
        let sql = format!(
            "SELECT i.* FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id 
            WHERE LOWER(b.trader_name) = 'flea market' AND i.item_name ILIKE $1 AND i.item_types ILIKE $2 AND ($3 IS FALSE OR i.is_flea = TRUE)
            ORDER BY b.price_rub {} LIMIT $4 OFFSET $5;",
            if sort_asc { "ASC" } else { "DESC" },
        );

        sqlx::query_as(&sql)
            .bind(format!("%{search}%"))
            .bind(format!("%{item_type}%"))
            .bind(is_flea)
            .bind(i64::from(limit))
            .bind(i64::from(offset))
            .fetch_all(&mut *txn)
            .await
            .bad_sql("Items")?
    } else {
        let sql = format!(
            "SELECT * FROM Item 
            WHERE item_name ILIKE $1 AND item_types ILIKE $2 AND ($3 IS FALSE OR is_flea = TRUE)
            ORDER BY {} {} LIMIT $4 OFFSET $5",
            sort_by,
            if sort_asc { "ASC" } else { "DESC" },
        );

        sqlx::query_as(&sql)
            .bind(format!("%{search}%"))
            .bind(format!("%{item_type}%"))
            .bind(is_flea)
            .bind(i64::from(limit))
            .bind(i64::from(offset))
            .fetch_all(&mut *txn)
            .await
            .bad_sql("Items")?
    };

    let items = items_from_db_to_items(items_from_db, txn).await?;

    let tokio_values = items.clone();
    tokio::spawn(async move {
        app_state
            .cache
            .insert_vec(cache_key, &tokio_values, ITEMS_UNIQUE_CACHE_PREFIX)
            .await;
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
    let cache_key = ITEMS_UNIQUE_CACHE_PREFIX.to_string() + item_id.clone().as_str() + "-history";

    if let Some(values) = app_state.cache.get_vec(&cache_key).await {
        return Ok(Json(values));
    }

    // since data is sampled at 1 every 10 minutes then 6 would be every hour
    let item_history_sample_amount = 12;
    let item_history = sqlx::query_as!(
        SavedItemData,
        "WITH numbered AS (SELECT *, ROW_NUMBER() OVER (ORDER BY recorded_time ASC) AS rn FROM SavedItemData WHERE item_id = $1) 
        SELECT price_rub, recorded_time FROM numbered WHERE rn % $2 = 1",
        item_id,
        item_history_sample_amount
    )
    .fetch_all(&app_state.pgpool)
    .await
    .bad_sql("ItemHistory")?;

    let tokio_values = item_history.clone();
    tokio::spawn(async move {
        app_state
            .cache
            .insert_vec(cache_key, &tokio_values, ITEMS_UNIQUE_CACHE_PREFIX)
            .await;
    });

    Ok(Json(item_history))
}

pub async fn get_items_help(Query(query_parms): Query<ItemQueryParams>) -> Json<ItemQueryParams> {
    Json(query_parms)
}
