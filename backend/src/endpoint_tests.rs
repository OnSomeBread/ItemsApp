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
    fn get_name(&self) -> &str;

    fn get_ids(values: &[Self]) -> Vec<String> {
        values.iter().map(|x| x.get_id().to_string()).collect()
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

            assert!(!data.is_empty());

            let ids: Vec<String> = Self::get_ids(&data);
            assert!(!prev_requests.contains(&ids));
            prev_requests.insert(ids);
        }
    }

    async fn ids_testing() {
        let values_from_base =
            Self::get_request_vec(format!("{}{}{}", URL, Self::get_base(), "?")).await;
        let ids = Self::get_ids(&values_from_base);
        let mut final_str = String::new();
        for v in &ids {
            final_str += "&ids=";
            final_str += v.as_str();
        }

        // removes inital &
        final_str.replace_range(0..1, "");

        let values_from_ids =
            Self::get_request_vec(format!("{}{}{}{}", URL, Self::get_base(), "?", final_str)).await;

        assert!(!values_from_base.is_empty() && !values_from_ids.is_empty());
        assert!(Self::get_ids(&values_from_base) == Self::get_ids(&values_from_ids));
    }

    async fn search_testing() {
        // test for strings that could break the backend
        let test_strings: &'static [&'static str] = &[
            "' OR 1=1 -- Test User'",
            "'",
            "",
            "OR 1=1 --",
            "Test User",
            r#"!@#$%^&*().,;:'"?"#,
            "1' or '1' = '1",
            "1'; DROP TABLE users; --",
            r#"" or ""=""#,
            "검색 텍스트",
        ];

        for t in test_strings {
            // get_request_vec already asserts request code is 200 also this does not get optimized out by the compiler
            let _ =
                Self::get_request_vec(format!("{}{}{}{}", URL, Self::get_base(), "?search=", t))
                    .await;
        }

        let values =
            Self::get_request_vec(format!("{}{}{}", URL, Self::get_base(), "?search=a")).await;

        assert!(!values.is_empty());
        assert!(
            values
                .iter()
                .all(|x| x.get_name().contains('a') || x.get_name().contains('A'))
        );
    }

    async fn limit_and_offset_testing() {
        let values =
            Self::get_request_vec(format!("{}{}{}", URL, Self::get_base(), "?limit=100")).await;
        assert!(values.len() == 100);

        let mut build_values = vec![];
        for n in (0..100).step_by(10) {
            build_values.extend(
                Self::get_request_vec(format!(
                    "{}{}{}{}",
                    URL,
                    Self::get_base(),
                    "?limit=10&offset=",
                    n
                ))
                .await,
            );
        }

        assert!(build_values.len() == 100);
    }
}

impl Test for Item {
    fn get_base() -> String {
        String::from("/items")
    }

    fn get_id(&self) -> &str {
        &self._id
    }

    fn get_name(&self) -> &str {
        &self.item_name
    }
}

impl Test for Task {
    fn get_base() -> String {
        String::from("/tasks")
    }
    fn get_id(&self) -> &str {
        &self._id
    }
    fn get_name(&self) -> &str {
        &self.task_name
    }
}

const URL: &str = "http://127.0.0.1:8000/api";

#[tokio::test]
async fn test_health() {
    let res = Client::new()
        .get(format!("{}{}", URL, "/health"))
        .send()
        .await
        .expect("health endpoint failed");

    assert!(res.status().is_success());
}

#[tokio::test]
async fn test_items_valid_sort_by_endpoint() {
    // this tests enforces that all valid sortby have a unique non empty output
    Item::valid_param_unique_testing(
        "sort_by",
        VALID_SORT_BY.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_items_valid_item_types_endpoint() {
    // this tests enforces that all valid item types have a unique non empty output
    Item::valid_param_unique_testing(
        "type",
        VALID_ITEM_TYPES.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_items_asc_endpoint() {
    // this tests enforces that asc and desc have a unique non empty output
    let asc = Item::get_request_vec(format!("{}{}", URL, "/items?asc=true&limit=100")).await;
    let desc = Item::get_request_vec(format!("{}{}", URL, "/items?asc=false&limit=100")).await;
    assert!(!asc.is_empty() && !desc.is_empty());
    assert!(Item::get_ids(&asc) != Item::get_ids(&desc));
}

#[tokio::test]
async fn test_tasks_valid_obj_types_endpoint() {
    // this tests enforces that all valid obj types have a unique non empty output
    Task::valid_param_unique_testing(
        "obj_type",
        VALID_OBJ_TYPES.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_tasks_valid_traders_endpoint() {
    // this tests enforces that all valid traders have a unique non empty output
    Task::valid_param_unique_testing(
        "trader",
        VALID_TRADERS.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_task_kappa_lightkeeper_endpoint() {
    // this tests enforces that kappa and lightkeeper have a unique non empty output

    let (neither, kappa, lightkeeper) = tokio::join!(
        Task::get_request_vec(format!("{}{}", URL, "/tasks?limit=1000")),
        Task::get_request_vec(format!("{}{}", URL, "/tasks?is_kappa=true&limit=1000")),
        Task::get_request_vec(format!(
            "{}{}",
            URL, "/tasks?is_lightkeeper=true&limit=1000"
        ))
    );

    assert!(!neither.is_empty() && !kappa.is_empty() && !lightkeeper.is_empty());
    assert!(
        Task::get_ids(&neither) != Task::get_ids(&kappa)
            && Task::get_ids(&neither) != Task::get_ids(&lightkeeper)
    );
}

#[tokio::test]
async fn test_ids_endpoint() {
    // this tests enforces that ids grab the correct data
    Item::ids_testing().await;
    Task::ids_testing().await;
}

#[tokio::test]
async fn test_search() {
    // this tests enforces that search does not break backend and works correctly
    Item::search_testing().await;
    Task::search_testing().await;
}

#[tokio::test]
async fn test_limit_and_offset() {
    // this tests enforces that limit and offset grab the correct values
    Item::limit_and_offset_testing().await;
    Task::limit_and_offset_testing().await;
}
