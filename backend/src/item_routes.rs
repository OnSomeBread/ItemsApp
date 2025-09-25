use crate::api_routers::RedisCache;
use crate::database_types::{BuyFor, Item, ItemFromDB, SavedItemData, SellFor};
use crate::init_app_state::AppState;
use crate::query_types::*;
use crate::query_types::{AppError, AppError::*};
use axum::{extract::State, response::Json};
use axum_extra::extract::Query;
use std::collections::{HashMap, HashSet};

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
        .map_err(|_| {
            BadSqlQuery(String::from(
                "BuyFor and SellFor Query did not run successfully",
            ))
        })?;

    let sell_for_vec = sqlx::query_as!(
        SellFor,
        "SELECT * FROM SellFor WHERE item_id = ANY($1)",
        &ids
    )
    .fetch_all(&mut *txn)
    .await
    .map_err(|_| {
        BadSqlQuery(String::from(
            "BuyFor and SellFor Query did not run successfully",
        ))
    })?;

    txn.commit()
        .await
        .map_err(|_| BadSqlQuery(String::from("Item Query did not run successfully")))?;

    let mut hm: HashMap<String, (Vec<BuyFor>, Vec<SellFor>)> = HashMap::new();
    buy_for_vec.into_iter().for_each(|buy| {
        hm.entry(buy.item_id.clone())
            .or_insert((vec![], vec![]))
            .0
            .push(buy)
    });

    sell_for_vec.into_iter().for_each(|sell| {
        hm.entry(sell.item_id.clone())
            .or_insert((vec![], vec![]))
            .1
            .push(sell)
    });

    Ok(items_from_db
        .into_iter()
        .map(|item_from_db| {
            let mut item = Item::from(item_from_db);
            let (buys, sells) = hm.entry(item._id.clone()).or_insert((vec![], vec![]));
            item.buys = buys.drain(..).collect();
            item.sells = sells.drain(..).collect();
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
pub async fn get_items(
    Query(query_parms): Query<ItemQueryParams>,
    State(AppState {
        pgpool,
        redispool,
        next_items_call_timer,
        next_tasks_call_timer: _,
    }): State<AppState>,
) -> Result<Json<Vec<Item>>, AppError> {
    let search = query_parms.search.unwrap_or(String::new());
    let asc = query_parms.asc.unwrap_or(false);
    let mut sort_by = query_parms
        .sort_by
        .unwrap_or(String::from("base_price"))
        .to_lowercase();
    let mut item_type = query_parms
        .item_type
        .unwrap_or(String::new())
        .to_lowercase();
    let limit = std::cmp::min(query_parms.limit.unwrap_or(30), 100);
    let offset = query_parms.offset.unwrap_or(0);

    let valid_sort_by: HashSet<&str> = VALID_SORT_BY.iter().map(|&x| x).collect();
    if sort_by == String::from("any") || !valid_sort_by.contains(sort_by.as_str()) {
        sort_by = String::from("base_price");
    }

    let valid_item_type: HashSet<&str> = VALID_ITEM_TYPES.iter().map(|&x| x).collect();

    if item_type == "any" || !valid_item_type.contains(item_type.as_str()) {
        item_type = String::new();
    }

    // redis performance falls off at large amounts of items
    let use_redis = limit <= 100;
    let cache_key = format!(
        "{}a{}{}{}l{}o{}",
        search,
        if asc { "1" } else { "0" },
        sort_by,
        item_type,
        limit,
        offset
    );

    if use_redis {
        if let Some(values) = Item::get_vec(&cache_key, &redispool).await? {
            return Ok(Json(values));
        }
    }

    // welp doing this is much cleaner but far slower than the main query ¯\_(ツ)_/¯
    // let items_test: Vec<Item> = sqlx::query_as!(
    //         Item,
    //         r#"SELECT i.*,
    //         COALESCE(ARRAY_AGG((b.*)) FILTER (WHERE b.item_id IS NOT NULL), '{}') AS "buys!:Vec<BuyFor>",
    //         COALESCE(ARRAY_AGG((s.*)) FILTER (WHERE s.item_id IS NOT NULL), '{}') AS "sells!:Vec<SellFor>"
    //         FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id LEFT JOIN SellFor s ON i._id = s.item_id

    //         WHERE i.item_name ILIKE $1 AND i.item_types ILIKE $2
    //         GROUP BY i._id ORDER BY i.base_price DESC LIMIT $3 OFFSET $4;"#,
    //         format!("%{}%", search),
    //         format!("%{}%", item_type),
    //         limit as i64,
    //         offset as i64
    //     ).fetch_all(&pgpool).await
    //     .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    // return Ok(Json(items_test));

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

    let items_from_db;
    let mut txn = pgpool
        .begin()
        .await
        .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;

    if sort_by == "flea_market" {
        let sql = format!(
            r#"SELECT i.* FROM Item i LEFT JOIN BuyFor b ON i._id = b.item_id 
            WHERE LOWER(b.trader_name) = 'flea market' AND i.item_name ILIKE $1 AND i.item_types ILIKE $2 
            ORDER BY b.price_rub {} LIMIT $3 OFFSET $4;"#,
            if asc { "ASC" } else { "DESC" },
        );

        items_from_db = sqlx::query_as(&sql)
            .bind(format!("%{}%", search))
            .bind(format!("%{}%", item_type))
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&mut *txn)
            .await
            .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    } else {
        let sql = format!(
            r#"SELECT * FROM Item 
            WHERE item_name ILIKE $1 AND item_types ILIKE $2 
            ORDER BY {} {} LIMIT $3 OFFSET $4"#,
            sort_by,
            if asc { "ASC" } else { "DESC" },
        );

        items_from_db = sqlx::query_as(&sql)
            .bind(format!("%{}%", search))
            .bind(format!("%{}%", item_type))
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&mut *txn)
            .await
            .map_err(|_| BadSqlQuery("Items Query did not run successfully".into()))?;
    }

    let items = items_from_db_to_items(items_from_db, txn).await?;

    // save tasks in redis cache
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
    .map_err(|_| BadSqlQuery(String::from("ItemHistory Query did not run successfully")))?;

    SavedItemData::set_vec(
        cache_key,
        item_history.clone(),
        app_state.redispool,
        app_state.next_items_call_timer.clone(),
    )
    .await;

    Ok(Json(item_history))
}
