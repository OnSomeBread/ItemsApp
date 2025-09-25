#![cfg(test)]
use crate::{
    database_types::{Item, Task},
    query_types::{VALID_ITEM_TYPES, VALID_OBJ_TYPES, VALID_SORT_BY, VALID_TRADERS},
};
use reqwest::Client;
use serde::de::DeserializeOwned;
use std::collections::HashSet;

trait Test: DeserializeOwned {
    async fn get_request_vec(url: String) -> Vec<Self> {
        let res = Client::new()
            .get(url)
            .send()
            .await
            .expect("Items endpoint did not get correctly");

        assert!(res.status().is_success());
        res.json()
            .await
            .expect("Item data did not serialize correctly")
    }

    fn get_base() -> String;
    fn get_id(&self) -> &str;

    fn get_ids(values: &Vec<Self>) -> Vec<String> {
        values.into_iter().map(|x| x.get_id().to_string()).collect()
    }

    async fn valid_param_unique_testing(key: &'static str, valid_options: Vec<String>) {
        let mut prev_requests = HashSet::new();
        for option in valid_options {
            let data = Self::get_request_vec(format!(
                "{}{}{}{}{}{}{}",
                URL,
                Self::get_base(),
                "?",
                key,
                "=",
                option,
                "&limit=100"
            ))
            .await;

            assert!(data.len() > 0);

            let ids: Vec<String> = Self::get_ids(&data);
            assert!(!prev_requests.contains(&ids));
            prev_requests.insert(ids);
        }
    }

    async fn ids_testing() {
        let values_from_base =
            Self::get_request_vec(format!("{}{}{}", URL, Self::get_base(), "?limit=30")).await;
        let ids = Self::get_ids(&values_from_base);
        let mut final_str = String::new();
        ids.iter().for_each(|v| {
            final_str += "&ids=";
            final_str += v.as_str()
        });

        final_str.replace_range(0..1, "");

        let values_from_ids =
            Self::get_request_vec(format!("{}{}{}{}", URL, Self::get_base(), "?", final_str)).await;

        assert!(values_from_base.len() > 0 && values_from_ids.len() > 0);
        assert!(Self::get_ids(&values_from_base) == Self::get_ids(&values_from_ids));
    }
}

impl Test for Item {
    fn get_base() -> String {
        return String::from("/items");
    }

    fn get_id(&self) -> &str {
        &self._id
    }
}

impl Test for Task {
    fn get_base() -> String {
        return String::from("/tasks");
    }
    fn get_id(&self) -> &str {
        &self._id
    }
}

const URL: &'static str = "http://127.0.0.1:8000/api";

#[tokio::test]
async fn test_items_valid_sort_by_endpoint() {
    // this tests enforces that all valid sortby have a unique non empty output
    Item::valid_param_unique_testing(
        "sortBy",
        VALID_SORT_BY.iter().map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_items_valid_item_types_endpoint() {
    // this tests enforces that all valid item types have a unique non empty output
    Item::valid_param_unique_testing(
        "type",
        VALID_ITEM_TYPES.iter().map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_items_asc_endpoint() {
    // this tests enforces that asc and desc have a unique non empty output
    let asc = Item::get_request_vec(format!("{}{}", URL, "/items?asc=true&limit=100")).await;
    let desc = Item::get_request_vec(format!("{}{}", URL, "/items?asc=false&limit=100")).await;
    assert!(asc.len() > 0 && desc.len() > 0);
    assert!(Item::get_ids(&asc) != Item::get_ids(&desc));
}

#[tokio::test]
async fn test_ids_endpoint() {
    // this tests enforces that ids grab the correct data
    Item::ids_testing().await;
    Task::ids_testing().await;
}

#[tokio::test]
async fn test_tasks_valid_obj_types_endpoint() {
    // this tests enforces that all valid obj types have a unique non empty output
    Task::valid_param_unique_testing(
        "objType",
        VALID_OBJ_TYPES.iter().map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_tasks_valid_traders_endpoint() {
    // this tests enforces that all valid traders have a unique non empty output
    Task::valid_param_unique_testing(
        "trader",
        VALID_TRADERS.iter().map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_task_kappa_lightkeeper_endpoint() {
    // this tests enforces that kappa and lightkeeper have a unique non empty output

    let (neither, kappa, lightkeeper) = tokio::join!(
        Task::get_request_vec(format!("{}{}", URL, "/tasks?limit=1000")),
        Task::get_request_vec(format!("{}{}", URL, "/tasks?isKappa=true&limit=1000")),
        Task::get_request_vec(format!("{}{}", URL, "/tasks?isLightkeeper=true&limit=1000"))
    );

    assert!(neither.len() > 0 && kappa.len() > 0 && lightkeeper.len() > 0);
    assert!(
        Task::get_ids(&neither) != Task::get_ids(&kappa)
            && Task::get_ids(&neither) != Task::get_ids(&lightkeeper)
    );
}
