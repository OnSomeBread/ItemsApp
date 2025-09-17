use serde::Deserialize;
use std::error::Error;

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BuyForVendor {
    #[serde(rename = "name")]
    trader_name: String,
    min_trader_level: i32,
    buy_limit: i32,
}

#[derive(Deserialize, Clone)]
struct BuyFor {
    price: i32,
    currency: String,
    #[serde(rename = "priceRUB")]
    price_rub: i32,
    vendor: BuyForVendor,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SellForVendor {
    #[serde(rename = "name")]
    trader_name: String,
    sell_offer_fee_rate: Option<i32>,
    sell_requirement_fee_rate: Option<i32>,
    found_in_raid_required: Option<bool>,
}

#[derive(Deserialize, Clone)]
struct SellFor {
    price: i32,
    currency: String,
    #[serde(rename = "priceRUB")]
    price_rub: i32,
    vendor: SellForVendor,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Item {
    #[serde(rename = "id")]
    _id: String,
    #[serde(rename = "name")]
    item_name: String,
    short_name: String,
    avg_24h_price: Option<i32>,
    base_price: i32,
    change_last_48h_percent: Option<f32>,
    width: i32,
    height: i32,
    #[serde(rename = "link")]
    wiki: String,
    #[serde(rename = "types")]
    item_types: Vec<String>,
    #[serde(rename = "buyFor")]
    buys: Vec<BuyFor>,
    #[serde(rename = "sellFor")]
    sells: Vec<SellFor>,
}

#[derive(Deserialize)]
struct Map {
    name: String,
    wiki: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Objective {
    #[serde(rename = "type")]
    obj_type: String,
    #[serde(rename = "description")]
    obj_description: String,
    maps: Vec<Map>,
}

#[derive(Deserialize)]
struct ReqTaskId {
    id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaskRequirement {
    status: Vec<String>,
    #[serde(rename = "task")]
    req_task_id: ReqTaskId,
}

#[derive(Deserialize)]
struct Trader {
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Task {
    #[serde(rename = "id")]
    _id: String,
    #[serde(rename = "name")]
    task_name: String,
    normalized_name: String,
    experience: i32,
    min_player_level: i32,
    trader: Trader,
    faction_name: String,
    kappa_required: bool,
    lightkeeper_required: bool,
    #[serde(rename = "wikiLink")]
    wiki: String,
    objectives: Vec<Objective>,
    #[serde(rename = "taskRequirements")]
    task_requirements: Vec<TaskRequirement>,
}

pub async fn upsert_data_file(
    file_name: &str,
    page: &str,
    pool: &sqlx::Pool<sqlx::Postgres>,
) -> Result<(), Box<dyn Error>> {
    println!("starting {} upsert", page);
    let file = std::fs::File::open(file_name).expect("file did not open");
    let json: serde_json::Value =
        serde_json::from_reader(file).expect("file should be proper JSON");

    let result = &json["data"][page];

    if page == "items" {
        let item_data: Vec<Item> = Vec::<Item>::deserialize(result).unwrap();
        upsert_items(&item_data, pool, false).await?;
        println!("{}", &item_data.len());
    } else if page == "tasks" {
        let task_data: Vec<Task> = Vec::<Task>::deserialize(result).unwrap();
        upsert_tasks(&task_data, pool).await?;
        println!("{}", task_data.len());
    }
    Ok(())
}

// pub async fn upsert_data_api(
//     file_name: &str,
//     page: &str,
//     pool: &sqlx::Pool<sqlx::Postgres>,
// ) -> Result<(), Box<dyn Error>> {
//     println!("starting {} upsert", page);
//     let file = std::fs::File::open(file_name).expect("file did not open");
//     let json: serde_json::Value =
//         serde_json::from_reader(file).expect("file should be proper JSON");

//     let result = &json["data"][page];

//     if page == "items" {
//         let item_data: Vec<Item> = Vec::<Item>::deserialize(result).unwrap();
//         upsert_items(&item_data, pool, true).await?;
//         println!("{}", &item_data.len());
//     } else if page == "tasks" {
//         let task_data: Vec<Task> = Vec::<Task>::deserialize(result).unwrap();
//         upsert_tasks(&task_data, pool).await?;
//         println!("{}", task_data.len());
//     }
//     Ok(())
// }

// inserts all of the input items into the db
async fn upsert_items(
    items: &Vec<Item>,
    pool: &sqlx::Pool<sqlx::Postgres>, is_api_call:bool
) -> Result<(), Box<dyn Error>> {
    let mut txn = pool.begin().await?;

    let ids: Vec<String> = items.iter().map(|item| item._id.to_string()).collect();
    let names: Vec<String> = items.iter().map(|x| x.item_name.to_string()).collect();
    let short_names: Vec<String> = items.iter().map(|x| x.short_name.to_string()).collect();
    let avg_24h_prices: Vec<i32> = items.iter().map(|x| x.avg_24h_price.unwrap_or(0)).collect();
    let change_last_48h_percents: Vec<f32> = items.iter().map(|x| x.change_last_48h_percent.unwrap_or(0.0)).collect();
    let types_arr: Vec<String> = items.iter().map(|x| x.item_types.join(", ")).collect();

    // ITEM BULK INSERT
    sqlx::query!("INSERT INTO Item (_id, item_name, short_name, avg_24h_price, base_price, change_last_48h_percent, width, height, wiki, item_types) SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::int[], $5::int[], $6::real[], $7::int[], $8::int[], $9::text[], $10::text[]) ON CONFLICT(_id) DO UPDATE SET avg_24h_price = EXCLUDED.avg_24h_price, change_last_48h_percent = EXCLUDED.change_last_48h_percent;",
        &ids,
        &names,
        &short_names,
        &avg_24h_prices,
        &items.iter().map(|item| item.base_price).collect::<Vec<i32>>(),
        &change_last_48h_percents,
        &items.iter().map(|item| item.width).collect::<Vec<i32>>(),
        &items.iter().map(|item| item.height).collect::<Vec<i32>>(),
        &items.iter().map(|item| item.wiki.to_string()).collect::<Vec<String>>(),
        &types_arr)
        .execute(&mut *txn)
        .await?;

    let buy_for_prices: Vec<i32> = items
        .iter()
        .flat_map(|x| x.buys.iter().map(|y| y.price).collect::<Vec<i32>>())
        .collect();
    let buy_for_currencys: Vec<String> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.currency.to_string())
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
                .map(|y| y.vendor.trader_name.to_string())
                .collect::<Vec<String>>()
        })
        .collect();
    let buy_for_min_trader_levels: Vec<i32> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.vendor.min_trader_level)
                .collect::<Vec<i32>>()
        })
        .collect();
    let buy_for_buy_limit: Vec<i32> = items
        .iter()
        .flat_map(|x| {
            x.buys
                .iter()
                .map(|y| y.vendor.buy_limit)
                .collect::<Vec<i32>>()
        })
        .collect();

    let buy_for_item_ids = items.iter().flat_map(|x| vec![x._id.to_string(); x.buys.len()]).collect::<Vec<String>>();

    // BUYFOR BULK INSERT
    sqlx::query!("INSERT INTO BuyFor (price, currency, price_rub, trader_name, min_trader_level, buy_limit, item_id) SELECT * FROM UNNEST($1::int[], $2::text[], $3::int[], $4::text[], $5::int[], $6::int[], $7::text[]) ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, currency = EXCLUDED.currency, price_rub = EXCLUDED.price_rub, trader_name = EXCLUDED.trader_name, min_trader_level = EXCLUDED.min_trader_level, buy_limit = EXCLUDED.buy_limit, item_id = EXCLUDED.item_id;",
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
                .map(|y| y.currency.to_string())
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
                .map(|y| y.vendor.trader_name.to_string())
                .collect::<Vec<String>>()
        })
        .collect();

    let sell_for_sell_offer_fee_rate: Vec<i32> = items
        .iter()
        .flat_map(|x| {
            x.sells
                .iter()
                .map(|y| y.vendor.sell_offer_fee_rate.unwrap_or(0))
                .collect::<Vec<i32>>()
        })
        .collect();
    let sell_for_sell_requirement_fee_rate: Vec<i32> = items
        .iter()
        .flat_map(|x| {
            x.sells
                .iter()
                .map(|y| y.vendor.sell_requirement_fee_rate.unwrap_or(0))
                .collect::<Vec<i32>>()
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

    let sell_for_item_ids = items.iter().flat_map(|x| vec![x._id.to_string(); x.sells.len()]).collect::<Vec<String>>();

    // SELLFOR BULK INSERT
    sqlx::query!("INSERT INTO SellFor (price, currency, price_rub, trader_name, sell_offer_fee_rate, sell_requirement_fee_rate, found_in_raid_required, item_id) SELECT * FROM UNNEST($1::int[], $2::text[], $3::int[], $4::text[], $5::int[], $6::int[], $7::bool[], $8::text[]) ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, currency = EXCLUDED.currency, price_rub = EXCLUDED.price_rub, trader_name = EXCLUDED.trader_name, sell_offer_fee_rate = EXCLUDED.sell_offer_fee_rate, sell_requirement_fee_rate = EXCLUDED.sell_requirement_fee_rate, found_in_raid_required = EXCLUDED.found_in_raid_required, item_id = EXCLUDED.item_id;",
        &sell_for_prices,
        &sell_for_currencys,
        &sell_for_price_rubs,
        &sell_for_traders,
        &sell_for_sell_offer_fee_rate,
        &sell_for_sell_requirement_fee_rate,
        &sell_for_found_in_raid_required, 
        &sell_for_item_ids).execute(&mut *txn).await?;

    // SAVEDITEMDATA BULK INSERT ONLY ON UPSERT API

    txn.commit().await?;
    Ok(())
}

// insert all of the input tasks into the db
// no need to fully bulk optimize this since it is already fast
async fn upsert_tasks(
    tasks: &Vec<Task>,
    pool: &sqlx::Pool<sqlx::Postgres>,
) -> Result<(), Box<dyn Error>> {
    let mut txn = pool.begin().await?;
    for task in tasks {
        sqlx::query!("INSERT INTO Task (_id, task_name, normalized_name, experience, min_player_level, trader, faction_name, kappa_required, lightkeeper_required, wiki) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT(_id) DO NOTHING;",
            &task._id,
            &task.task_name,
            &task.normalized_name,
            &task.experience,
            &task.min_player_level,
            &task.trader.name,
            &task.faction_name,
            &task.kappa_required,
            &task.lightkeeper_required,
            &task.wiki)
            .execute(&mut *txn)
            .await?;

        sqlx::query!(
            "INSERT INTO Objective (obj_type, obj_description, map_name, map_wiki, task_id) SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[]) ON CONFLICT DO NOTHING;",
            &task.objectives.iter().map(|x| x.obj_type.clone()).collect::<Vec<String>>(),
            &task.objectives.iter().map(|x| x.obj_description.clone()).collect::<Vec<String>>(),
            &task.objectives.iter().map(|x| x.maps.iter().map(|x| x.name.clone()).collect::<Vec<String>>().join(", ")).collect::<Vec<String>>(),
            &task.objectives.iter().map(|x| x.maps.iter().map(|x| x.wiki.clone()).collect::<Vec<String>>().join(", ")).collect::<Vec<String>>(),
            &vec![task._id.to_string();task.objectives.len()],
        ).execute(&mut *txn)
        .await?;

        sqlx::query!(
            "INSERT INTO TaskRequirement (status, req_task_id, task_id) SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[]) ON CONFLICT DO NOTHING;",
            &task.task_requirements.iter().map(|x| x.status.join(", ")).collect::<Vec<String>>(),
            &task.task_requirements.iter().map(|x| x.req_task_id.id.to_string()).collect::<Vec<String>>(),
            &vec![task._id.to_string();task.task_requirements.len()],
        ).execute(&mut *txn)
        .await?;
    }

    txn.commit().await?;
    Ok(())
}
