use crate::deserialize_json_types::{ITEMS_QUERY, Item, TASKS_QUERY, Task};
use chrono::Utc;
use reqwest::Client;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;
use sqlx::PgPool;
use std::{error::Error, io::Write};

async fn run_query(query: &str) -> Result<Value, Box<dyn Error>> {
    let res = Client::new()
        .post("https://api.tarkov.dev/graphql")
        .header("Content-Type", "applicaion/json")
        .json(&serde_json::json!({"query": query}))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await?;

    if res.status().is_success() {
        return Ok(res.json().await?);
    }
    Err(format!("Query failed with status: {}", res.status()).into())
}

pub trait Upsert: Serialize + DeserializeOwned {
    fn get_page() -> &'static str;
    fn get_query() -> &'static str;
    async fn upsert_data(
        values: &[Self],
        pgpool: &PgPool,
        is_api_call: bool,
    ) -> Result<(), Box<dyn Error>>;

    async fn file_upsert(file_name: &str, pgpool: &PgPool) -> Result<(), Box<dyn Error>> {
        let page = Self::get_page();
        let file = std::fs::File::open(file_name)?;
        let json: Value = serde_json::from_reader(file)?;
        let values = Vec::<Self>::deserialize(&json["data"][page])?;
        Self::upsert_data(&values, pgpool, false).await?;

        tracing::info!(
            "finished {} upsert via file with {} entries",
            page,
            values.len()
        );

        Ok(())
    }

    async fn api_upsert(file_name: &str, pgpool: &PgPool) -> Result<(), Box<dyn Error>> {
        let page = Self::get_page();
        let json = run_query(Self::get_query()).await?;
        let values = Vec::<Self>::deserialize(&json["data"][page])?;
        Self::upsert_data(&values, pgpool, true).await?;

        let json_string =
            serde_json::to_string_pretty(&serde_json::json!({"data": {page: values}}))?;
        let mut file = std::fs::File::create(file_name)?;
        file.write_all(json_string.as_bytes())?;
        tracing::info!(
            "finished {} upsert via api with {} entries",
            page,
            values.len()
        );
        Ok(())
    }
}

impl Upsert for Item {
    fn get_page() -> &'static str {
        "items"
    }

    fn get_query() -> &'static str {
        ITEMS_QUERY
    }

    async fn upsert_data(
        values: &[Self],
        pgpool: &PgPool,
        is_api_call: bool,
    ) -> Result<(), Box<dyn Error>> {
        upsert_items(values, pgpool, is_api_call).await
    }
}

impl Upsert for Task {
    fn get_page() -> &'static str {
        "tasks"
    }

    fn get_query() -> &'static str {
        TASKS_QUERY
    }

    async fn upsert_data(
        values: &[Self],
        pgpool: &PgPool,
        _is_api_call: bool,
    ) -> Result<(), Box<dyn Error>> {
        upsert_tasks(values, pgpool).await
    }
}

// inserts all of the input items into the db
#[allow(clippy::too_many_lines)]
async fn upsert_items(
    items: &[Item],
    pool: &sqlx::Pool<sqlx::Postgres>,
    is_api_call: bool,
) -> Result<(), Box<dyn Error>> {
    let mut txn = pool.begin().await?;
    sqlx::query!("TRUNCATE TABLE Item CASCADE")
        .execute(&mut *txn)
        .await?;

    let ids: Vec<String> = items.iter().map(|item| item._id.clone()).collect();
    let names: Vec<String> = items.iter().map(|x| x.item_name.clone()).collect();
    let short_names: Vec<String> = items.iter().map(|x| x.short_name.clone()).collect();
    let avg_24h_prices: Vec<i32> = items.iter().map(|x| x.avg_24h_price.unwrap_or(0)).collect();
    let change_last_48h_percents: Vec<f32> = items
        .iter()
        .map(|x| x.change_last_48h_percent.unwrap_or(0.0))
        .collect();
    let types_arr: Vec<String> = items.iter().map(|x| x.item_types.join(", ")).collect();

    // fn calc_flea_tax(item_base_price: i32, flea: &SellFor) -> i32 {
    //     let v0 = item_base_price as f64;
    //     let vr = flea.price_rub as f64;
    //     let po = (v0 / vr).log10();
    //     let pr = (vr / v0).log10();

    //     // pulled from https://escapefromtarkov.fandom.com/wiki/Trading
    //     let flea_tax_float = v0 * .03_f64 * 4_f64.powf(po) + vr * .03_f64 * 4_f64.powf(pr);

    //     // round 2 decimal places
    //     ((flea_tax_float * 100_f64).round() / 100_f64) as i32
    // }

    // buy from flea instant profit = max(trader_sell_price) - flea_price
    let buy_from_flea_instant_profits: Vec<i32> = items
        .iter()
        .map(|item| {
            let max_sell = item.sells.iter().max_by_key(|x| {
                if x.vendor.trader_name == "Flea Market" {
                    0
                } else {
                    x.price_rub
                }
            });

            let max_sell_price = max_sell.map_or(0, |max_sell| max_sell.price_rub);

            let flea = item
                .buys
                .iter()
                .find(|x| x.vendor.trader_name == "Flea Market");

            flea.map_or(0, |flea| max_sell_price - flea.price_rub)
        })
        .collect();

    // sellfor already accounts for flea tax
    // buy from trader instant profits = flea_price - flea_tax - min(trader_buy_price)
    let buy_from_trader_instant_profits: Vec<i32> = items
        .iter()
        .map(|item| {
            let min_buy = item.buys.iter().min_by_key(|x| {
                if x.vendor.trader_name == "Flea Market" {
                    0
                } else {
                    x.price_rub
                }
            });

            let min_buy_price;
            if let Some(min_buy) = min_buy {
                min_buy_price = min_buy.price_rub;
            } else {
                return 0;
            }

            let flea = item
                .sells
                .iter()
                .find(|x| x.vendor.trader_name == "Flea Market");

            flea.map_or(0, |flea| flea.price_rub - min_buy_price)
        })
        .collect();

    // per slot = (max(trader_sell_price)) / (width * height)
    let per_slots: Vec<i32> = items
        .iter()
        .map(|item| {
            let max_sell = item.sells.iter().max_by_key(|x| x.price_rub);

            max_sell.map_or(0, |max_sell| {
                max_sell.price_rub / (item.width * item.height)
            })
        })
        .collect();

    // ITEM BULK INSERT
    sqlx::query!("INSERT INTO Item (_id, item_name, short_name, avg_24h_price, base_price, change_last_48h_percent, width, height, wiki, item_types, buy_from_flea_instant_profit, buy_from_trader_instant_profit, per_slot) 
    SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::int[], $5::int[], $6::real[], $7::int[], $8::int[], $9::text[], $10::text[], $11::int[], $12::int[], $13::int[]) 
    ON CONFLICT(_id) DO UPDATE SET avg_24h_price = EXCLUDED.avg_24h_price, change_last_48h_percent = EXCLUDED.change_last_48h_percent, buy_from_flea_instant_profit = EXCLUDED.buy_from_flea_instant_profit, buy_from_trader_instant_profit = EXCLUDED.buy_from_trader_instant_profit, per_slot = EXCLUDED.per_slot;",
        &ids,
        &names,
        &short_names,
        &avg_24h_prices,
        &items.iter().map(|item| item.base_price).collect::<Vec<i32>>(),
        &change_last_48h_percents,
        &items.iter().map(|item| item.width).collect::<Vec<i32>>(),
        &items.iter().map(|item| item.height).collect::<Vec<i32>>(),
        &items.iter().map(|item| item.wiki.clone()).collect::<Vec<String>>(),
        &types_arr,
        &buy_from_flea_instant_profits,
        &buy_from_trader_instant_profits,
        &per_slots).execute(&mut *txn).await?;

    let buy_for_prices: Vec<i32> = items
        .iter()
        .flat_map(|x| x.buys.iter().map(|y| y.price).collect::<Vec<i32>>())
        .collect();
    let buy_for_currencys: Vec<String> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.currency.clone())
                .collect::<Vec<String>>()
        })
        .collect();
    let buy_for_price_rubs: Vec<i32> = items
        .iter()
        .flat_map(|x| x.buys.iter().map(|y| y.price_rub).collect::<Vec<i32>>())
        .collect();
    let buy_for_traders: Vec<String> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.vendor.trader_name.clone())
                .collect::<Vec<String>>()
        })
        .collect();
    let buy_for_min_trader_levels: Vec<i32> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.vendor.min_trader_level.unwrap_or(0))
                .collect::<Vec<i32>>()
        })
        .collect();
    let buy_for_buy_limit: Vec<i32> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.vendor.buy_limit.unwrap_or(0))
                .collect::<Vec<i32>>()
        })
        .collect();

    let buy_for_item_ids = items
        .iter()
        .flat_map(|x| vec![x._id.clone(); x.buys.len()])
        .collect::<Vec<String>>();

    // BUYFOR BULK INSERT
    sqlx::query!(
        "INSERT INTO BuyFor (price, currency, price_rub, trader_name, min_trader_level, buy_limit, item_id) 
    SELECT * FROM UNNEST($1::int[], $2::text[], $3::int[], $4::text[], $5::int[], $6::int[], $7::text[]) 
    ON CONFLICT (id) DO UPDATE SET 
    price = EXCLUDED.price, currency = EXCLUDED.currency, price_rub = EXCLUDED.price_rub, trader_name = EXCLUDED.trader_name, min_trader_level = EXCLUDED.min_trader_level, buy_limit = EXCLUDED.buy_limit, item_id = EXCLUDED.item_id;",
        &buy_for_prices,
        &buy_for_currencys,
        &buy_for_price_rubs,
        &buy_for_traders,
        &buy_for_min_trader_levels,
        &buy_for_buy_limit,
        &buy_for_item_ids).execute(&mut *txn).await?;

    let sell_for_prices: Vec<i32> = items
        .iter()
        .flat_map(|x| x.sells.iter().map(|y| y.price).collect::<Vec<i32>>())
        .collect();
    let sell_for_currencys: Vec<String> = items
        .iter()
        .flat_map(|x| {
            x.sells
                .iter()
                .map(|y| y.currency.clone())
                .collect::<Vec<String>>()
        })
        .collect();
    let sell_for_price_rubs: Vec<i32> = items
        .iter()
        .flat_map(|x| x.sells.iter().map(|y| y.price_rub).collect::<Vec<i32>>())
        .collect();
    let sell_for_traders: Vec<String> = items
        .iter()
        .flat_map(|x| {
            x.sells
                .iter()
                .map(|y| y.vendor.trader_name.clone())
                .collect::<Vec<String>>()
        })
        .collect();

    let sell_for_found_in_raid_required: Vec<bool> = items
        .iter()
        .flat_map(|x| {
            x.sells
                .iter()
                .map(|y| y.vendor.found_in_raid_required.unwrap_or(false))
                .collect::<Vec<bool>>()
        })
        .collect();

    let sell_for_item_ids = items
        .iter()
        .flat_map(|x| vec![x._id.clone(); x.sells.len()])
        .collect::<Vec<String>>();

    // SELLFOR BULK INSERT
    sqlx::query!(
        "INSERT INTO SellFor
    (price, currency, price_rub, trader_name, found_in_raid_required, item_id) 
    SELECT * FROM UNNEST($1::int[], $2::text[], $3::int[], $4::text[], $5::bool[], $6::text[]) 
    ON CONFLICT (id) DO UPDATE SET 
    price = EXCLUDED.price, currency = EXCLUDED.currency, price_rub = EXCLUDED.price_rub, trader_name = EXCLUDED.trader_name, found_in_raid_required = EXCLUDED.found_in_raid_required, item_id = EXCLUDED.item_id;",
        &sell_for_prices,
        &sell_for_currencys,
        &sell_for_price_rubs,
        &sell_for_traders,
        &sell_for_found_in_raid_required,
        &sell_for_item_ids
    )
    .execute(&mut *txn)
    .await?;

    // SAVEDITEMDATA BULK INSERT ONLY ON UPSERT API
    if is_api_call {
        // delete all rows that are not the $1 most recent
        sqlx::query!(
            "DELETE FROM SavedItemData d USING 
            (SELECT id FROM (SELECT id, ROW_NUMBER() OVER 
            (PARTITION BY item_id ORDER BY recorded_time DESC) AS rn FROM SavedItemData) 
            t WHERE t.rn > $1) 
            sub WHERE d.id = sub.id;",
            1000
        )
        .execute(&mut *txn)
        .await?;

        let (saved_item_ids, best_flea_prices): (Vec<String>, Vec<i32>) = items
            .iter()
            .filter(|x| x.buys.iter().any(|b| b.vendor.trader_name == "Flea Market"))
            .map(|x| {
                (
                    x._id.clone(),
                    x.buys
                        .iter()
                        .find(|b| b.vendor.trader_name == "Flea Market")
                        .unwrap()
                        .price_rub,
                )
            })
            .unzip();

        sqlx::query!(
            "INSERT INTO SavedItemData (price_rub, recorded_time, item_id) 
            SELECT * FROM UNNEST($1::int[], $2::timestamptz[], $3::text[])",
            &best_flea_prices,
            &vec![Utc::now(); saved_item_ids.len()],
            &saved_item_ids,
        )
        .execute(&mut *txn)
        .await?;
    }

    txn.commit().await?;
    Ok(())
}

// insert all of the input tasks into the db
// no need to fully bulk optimize this since it is already fast
async fn upsert_tasks(
    tasks: &[Task],
    pool: &sqlx::Pool<sqlx::Postgres>,
) -> Result<(), Box<dyn Error>> {
    let mut txn = pool.begin().await?;
    sqlx::query!("TRUNCATE TABLE Task CASCADE")
        .execute(&mut *txn)
        .await?;

    for task in tasks {
        sqlx::query!(
            "INSERT INTO Task 
        (_id, task_name, min_player_level, trader, 
        faction_name, kappa_required, lightkeeper_required, wiki) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT(_id) DO NOTHING;",
            &task._id,
            &task.task_name,
            &task.min_player_level,
            &task.trader.name,
            &task.faction_name,
            &task.kappa_required,
            &task.lightkeeper_required,
            &task.wiki
        )
        .execute(&mut *txn)
        .await?;

        for objective in &task.objectives {
            sqlx::query!(
                "INSERT INTO Objective 
                (obj_type, obj_description, map_name, map_wiki, count, needed_item_ids, task_id) 
                VALUES($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;",
                &objective.obj_type,
                &objective.obj_description,
                &objective
                    .maps
                    .iter()
                    .map(|x| x.name.clone())
                    .collect::<Vec<String>>()
                    .join(", "),
                &objective
                    .maps
                    .iter()
                    .map(|x| x.wiki.clone())
                    .collect::<Vec<String>>()
                    .join(", "),
                &objective.count.unwrap_or(0),
                &objective
                    .items
                    .clone()
                    .unwrap_or_else(Vec::new)
                    .iter()
                    .map(|x| x._id.clone())
                    .collect::<Vec<String>>(),
                &task._id,
            )
            .execute(&mut *txn)
            .await?;
        }

        sqlx::query!(
            "INSERT INTO TaskRequirement (status, req_task_id, task_id) SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[]) ON CONFLICT DO NOTHING;",
            &task.task_requirements.iter().map(|x| x.status.join(", ")).collect::<Vec<String>>(),
            &task.task_requirements.iter().map(|x| x.req_task_id.id.clone()).collect::<Vec<String>>(),
            &vec![task._id.clone();task.task_requirements.len()],
        ).execute(&mut *txn)
        .await?;
    }

    txn.commit().await?;
    Ok(())
}
