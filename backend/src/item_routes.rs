use crate::api_routers::{Device, RedisCache};
use crate::database_types::{
    BuyFor, DeviceItemQueryParams, Item, ItemFromDB, SavedItemData, SellFor,
};
use crate::init_app_state::AppState;
use crate::query_types::{AppError, AppError::BadRequest};
use crate::query_types::{
    AppErrorHandling, ItemHistoryQueryParams, ItemQueryParams, ItemStats, VALID_ITEM_TYPES,
    VALID_SORT_BY,
};
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use std::collections::{HashMap, HashSet};
use std::time::Instant;

// gives data on different interesting stats about the data stored
pub async fn item_stats(State(app_state): State<AppState>) -> Result<Json<ItemStats>, AppError> {
    let items_count = sqlx::query_scalar!("SELECT COUNT(*) FROM Item")
        .fetch_one(&app_state.pgpool)
        .await
        .bad_sql("Item Stats")?;

    let mut time_in_seconds_items = None;
    #[allow(clippy::cast_possible_wrap)]
    if let Ok(mutex_timer) = app_state.next_items_call_timer.lock() {
        time_in_seconds_items = mutex_timer
            .as_ref()
            .map(|t| t.saturating_duration_since(Instant::now()).as_secs() as i64);
    }

    Ok(Json(ItemStats {
        items_count: items_count.unwrap_or(0),
        time_till_items_refresh_secs: time_in_seconds_items.unwrap_or(0),
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
            .or_insert((vec![], vec![]))
            .0
            .push(buy);
    }

    for sell in sell_for_vec {
        hm.entry(sell.item_id.clone())
            .or_insert((vec![], vec![]))
            .1
            .push(sell);
    }

    Ok(items_from_db
        .into_iter()
        .map(|item_from_db| {
            let mut item = Item::from(item_from_db);
            let (buys, sells) = hm.entry(item._id.clone()).or_insert((vec![], vec![]));
            item.buys = std::mem::take(buys);
            item.sells = std::mem::take(sells);
            item
        })
        .collect())
}

// grabs items from the Item table based off of the query params
// there are 2 types of queries the first approach is to query for
// Item, BuyFor, SellFor as 3 separate queries which runs quickly
// for multiple runs then slows down presumibly from the extra connections
// the second approach is to query all at once as a join which does not have
// the connections issue and is much easier to work with but is also much slower
#[allow(clippy::too_many_lines)]
pub async fn get_items(
    device: Device,
    Query(query_parms): Query<ItemQueryParams>,
    State(AppState {
        pgpool,
        redispool,
        next_items_call_timer,
        next_tasks_call_timer: _,
    }): State<AppState>,
) -> Result<Json<Vec<Item>>, AppError> {
    let save = query_parms.save.unwrap_or(true);
    let search = query_parms.search.unwrap_or(String::new());
    let sort_asc = query_parms.sort_asc.unwrap_or(false);
    let mut sort_by = query_parms
        .sort_by
        .unwrap_or_else(|| String::from("base_price"))
        .to_lowercase();
    let mut item_type = query_parms
        .item_type
        .unwrap_or(String::new())
        .to_lowercase();
    let limit = std::cmp::min(query_parms.limit.unwrap_or(30), 100);
    let offset = query_parms.offset.unwrap_or(0);

    let valid_sort_by: HashSet<&str> = VALID_SORT_BY.iter().copied().collect();
    if sort_by == "any" || !valid_sort_by.contains(sort_by.as_str()) {
        sort_by = String::from("base_price");
    }

    let valid_item_type: HashSet<&str> = VALID_ITEM_TYPES.iter().copied().collect();
    if item_type == "any" || !valid_item_type.contains(item_type.as_str()) {
        item_type = String::new();
    }

    // save query
    if save && let Some(device_id) = device.0 {
        let search = search.clone();
        let sort_by = sort_by.clone();
        let item_type = item_type.clone();
        let pgpool = pgpool.clone();
        tokio::spawn(async move {
            let _ = sqlx::query!(
                "UPDATE ItemQueryParams
                    SET search = $2, sort_asc = $3, sort_by = $4, item_type = $5 WHERE id = $1",
                device_id,
                search,
                sort_asc,
                if sort_by.is_empty() {
                    "base_price".to_string()
                } else {
                    sort_by
                },
                if item_type.is_empty() {
                    "any".to_string()
                } else {
                    item_type
                },
            )
            .execute(&pgpool)
            .await;
        });
    }

    // redis performance falls off at large amounts of items
    let use_redis = limit <= 100;
    let cache_key = format!(
        "{}a{}{}{}l{}o{}",
        search,
        if sort_asc { "1" } else { "0" },
        sort_by,
        item_type,
        limit,
        offset
    );

    if use_redis && let Some(values) = Item::get_vec(&cache_key, &redispool).await? {
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

    let mut txn = pgpool.begin().await.bad_sql("Items")?;
    let items_from_db = if sort_by == "flea_market" {
        let sql = format!(
            "SELECT i.* FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id 
            WHERE LOWER(b.trader_name) = 'flea market' AND i.item_name ILIKE $1 AND i.item_types ILIKE $2 
            ORDER BY b.price_rub {} LIMIT $3 OFFSET $4;",
            if sort_asc { "ASC" } else { "DESC" },
        );

        sqlx::query_as(&sql)
            .bind(format!("%{search}%"))
            .bind(format!("%{item_type}%"))
            .bind(i64::from(limit))
            .bind(i64::from(offset))
            .fetch_all(&mut *txn)
            .await
            .bad_sql("Items")?
    } else {
        let sql = format!(
            "SELECT * FROM Item 
            WHERE item_name ILIKE $1 AND item_types ILIKE $2 
            ORDER BY {} {} LIMIT $3 OFFSET $4",
            sort_by,
            if sort_asc { "ASC" } else { "DESC" },
        );

        sqlx::query_as(&sql)
            .bind(format!("%{search}%"))
            .bind(format!("%{item_type}%"))
            .bind(i64::from(limit))
            .bind(i64::from(offset))
            .fetch_all(&mut *txn)
            .await
            .bad_sql("Items")?
    };

    let items = items_from_db_to_items(items_from_db, txn).await?;

    // save items in redis cache
    if use_redis {
        Item::set_vec(
            cache_key,
            items.clone(),
            redispool,
            next_items_call_timer.clone(),
        )
        .await;
    }

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

    if let Some(values) = SavedItemData::get_vec(&cache_key, &app_state.redispool).await? {
        return Ok(Json(values));
    }

    let item_history = sqlx::query_as!(
        SavedItemData,
        "SELECT * FROM SavedItemData WHERE item_id = $1",
        item_id
    )
    .fetch_all(&app_state.pgpool)
    .await
    .bad_sql("ItemHistory")?;

    SavedItemData::set_vec(
        cache_key,
        item_history.clone(),
        app_state.redispool,
        app_state.next_items_call_timer.clone(),
    )
    .await;

    Ok(Json(item_history))
}
