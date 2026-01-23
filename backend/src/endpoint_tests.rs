#![cfg(test)]
use crate::{
    database_types::{
        Ammo, DeviceAmmoQueryParams, DeviceItemQueryParams, DeviceTaskQueryParams, Item, Task,
    },
    query_types::{
        VALID_AMMO_SORT_BY, VALID_AMMO_TYPE, VALID_ITEM_SORT_BY, VALID_ITEM_TYPES, VALID_OBJ_TYPES,
        VALID_TRADERS,
    },
    task_routes::AdjList,
};
use ahash::AHashSet as HashSet;
use reqwest::Client;
use serde::de::DeserializeOwned;

trait QueryParms: DeserializeOwned {
    fn get_base() -> String;
    fn get_search(&self) -> &str;
    async fn get() -> Self {
        let res = Client::new()
            .get(format!("{}{}", URL, Self::get_base()))
            .header("x-device-id", DEVICE_ID)
            .send()
            .await
            .unwrap_or_else(|_| {
                panic!("{}", (Self::get_base() + " endpoint did not get correctly"))
            });

        assert!(res.status().is_success());
        res.json().await.unwrap_or_else(|_| {
            panic!(
                "{}",
                (Self::get_base() + " endpoint did not serialize correctly")
            )
        })
    }
}

impl QueryParms for DeviceItemQueryParams {
    fn get_base() -> String {
        "/items/query_parms".to_string()
    }
    fn get_search(&self) -> &str {
        &self.search
    }
}
impl QueryParms for DeviceTaskQueryParams {
    fn get_base() -> String {
        "/tasks/query_parms".to_string()
    }
    fn get_search(&self) -> &str {
        &self.search
    }
}
impl QueryParms for DeviceAmmoQueryParams {
    fn get_base() -> String {
        "/ammo/query_parms".to_string()
    }
    fn get_search(&self) -> &str {
        &self.search
    }
}

trait Test: DeserializeOwned {
    type DeviceQueryParms: QueryParms;

    async fn get_request_vec(url: String) -> Vec<Self> {
        let res = Client::new().get(url).send().await.unwrap_or_else(|_| {
            panic!("{}", (Self::get_base() + " endpoint did not get correctly"))
        });

        assert!(res.status().is_success());
        res.json().await.unwrap_or_else(|_| {
            panic!(
                "{}",
                (Self::get_base() + " endpoint did not serialize correctly")
            )
        })
    }

    fn get_base() -> String;
    fn get_id(&self) -> &str;
    fn get_name(&self) -> &str;
    async fn get_query_parms() -> Self::DeviceQueryParms;

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
                "&limit=500"
            ))
            .await;

            assert!(!data.is_empty());

            let ids: Vec<String> = Self::get_ids(&data);
            assert!(!prev_requests.contains(&ids));
            prev_requests.insert(ids);
        }
    }

    async fn ids_testing(sort_by: &str) {
        let values_from_base = Self::get_request_vec(format!(
            "{}{}{}{}{}",
            URL,
            Self::get_base(),
            "?sort_by=",
            sort_by,
            "&sort_asc=true"
        ))
        .await;
        let ids = Self::get_ids(&values_from_base);
        let mut final_str = String::new();
        for v in &ids {
            final_str += "&ids=";
            final_str += v.as_str();
        }

        let values_from_ids = Self::get_request_vec(format!(
            "{}{}{}{}",
            URL,
            Self::get_base(),
            "/ids?",
            final_str
        ))
        .await;

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

    async fn device_id_testing() {
        let search = "a";

        // this adds device id to the database so that it can be saved in items
        let _ = Self::get_query_parms().await;

        let res = Client::new()
            .get(format!("{}{}?search={}", URL, Self::get_base(), search,))
            .header("x-device-id", DEVICE_ID)
            .send()
            .await
            .unwrap_or_else(|_| {
                panic!("{}", (Self::get_base() + " endpoint did not get correctly"))
            });

        assert!(res.status().is_success());
        let values1: Vec<Self> = res.json().await.unwrap_or_else(|_| {
            panic!(
                "{}",
                (Self::get_base() + " endpoint did not serialize correctly")
            )
        });

        assert!(!values1.is_empty());

        let query_parms = Self::get_query_parms().await;
        assert!(query_parms.get_search() == search);
    }
}

impl Test for Item {
    type DeviceQueryParms = DeviceItemQueryParams;

    async fn get_query_parms() -> Self::DeviceQueryParms {
        DeviceItemQueryParams::get().await
    }
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
    type DeviceQueryParms = DeviceTaskQueryParams;

    async fn get_query_parms() -> Self::DeviceQueryParms {
        DeviceTaskQueryParams::get().await
    }
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

impl Test for Ammo {
    type DeviceQueryParms = DeviceAmmoQueryParams;

    async fn get_query_parms() -> Self::DeviceQueryParms {
        DeviceAmmoQueryParams::get().await
    }
    fn get_base() -> String {
        String::from("/ammo")
    }
    fn get_id(&self) -> &str {
        &self.item_id
    }
    fn get_name(&self) -> &str {
        &self.caliber
    }
}

const URL: &str = "http://127.0.0.1:8000";
const DEVICE_ID: &str = "501b8491-c3fe-4e37-9428-ce1456c1d386";

#[tokio::test]
async fn test_health() {
    let res = Client::new()
        .get(URL.to_string())
        .send()
        .await
        .expect("health endpoint failed");

    assert!(res.status().is_success());
}

#[tokio::test]
async fn test_item_stats() {
    let res = Client::new()
        .get(format!("{}{}", URL, "/items/stats"))
        .send()
        .await
        .expect("item stats endpoint failed");

    assert!(res.status().is_success());
}

#[tokio::test]
async fn test_task_stats() {
    let res = Client::new()
        .get(format!("{}{}", URL, "/tasks/stats"))
        .header("x-device-id", DEVICE_ID)
        .send()
        .await
        .expect("task stats endpoint failed");

    assert!(res.status().is_success());
}

#[tokio::test]
async fn test_item_history() {
    let res = Client::new()
        .get(format!(
            "{}{}",
            URL, "/items/history?item_id=674d90b55704568fe60bc8f5"
        ))
        .send()
        .await
        .expect("item_history endpoint failed");

    assert!(res.status().is_success());
}

#[tokio::test]
async fn test_items_valid_sort_by() {
    // this tests enforces that all valid sortby have a unique non empty output
    Item::valid_param_unique_testing(
        "sort_by",
        VALID_ITEM_SORT_BY
            .iter()
            .map(|x| (*x).to_string())
            .collect(),
    )
    .await;
}

#[tokio::test]
async fn test_items_valid_item_types() {
    // this tests enforces that all valid item types have a unique non empty output
    Item::valid_param_unique_testing(
        "item_type",
        VALID_ITEM_TYPES.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_items_asc() {
    // this tests enforces that asc and desc have a unique non empty output
    let asc = Item::get_request_vec(format!("{}{}", URL, "/items?sort_asc=true&limit=100")).await;
    let desc = Item::get_request_vec(format!("{}{}", URL, "/items?sort_asc=false&limit=100")).await;
    assert!(!asc.is_empty() && !desc.is_empty());
    assert!(Item::get_ids(&asc) != Item::get_ids(&desc));
}

#[tokio::test]
async fn test_ammo_valid_sort_by() {
    // this tests enforces that all valid sortby have a unique non empty output
    Ammo::valid_param_unique_testing(
        "sort_by",
        VALID_AMMO_SORT_BY
            .iter()
            .map(|x| (*x).to_string())
            .collect(),
    )
    .await;
}

#[tokio::test]
async fn test_ammo_asc() {
    // this tests enforces that asc and desc have a unique non empty output
    let asc = Ammo::get_request_vec(format!("{}{}", URL, "/ammo?sort_asc=true&limit=100")).await;
    let desc = Ammo::get_request_vec(format!("{}{}", URL, "/ammo?sort_asc=false&limit=100")).await;
    assert!(!asc.is_empty() && !desc.is_empty());
    assert!(Ammo::get_ids(&asc) != Ammo::get_ids(&desc));
}

#[tokio::test]
async fn test_tasks_valid_obj_types() {
    // this tests enforces that all valid obj types have a unique non empty output
    Task::valid_param_unique_testing(
        "obj_type",
        VALID_OBJ_TYPES.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_tasks_valid_traders() {
    // this tests enforces that all valid traders have a unique non empty output
    Task::valid_param_unique_testing(
        "trader",
        VALID_TRADERS.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_tasks_player_lvl() {
    Task::valid_param_unique_testing(
        "player_lvl",
        ((0..80).step_by(20)).map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_ammo_valid_ammo_type() {
    // this tests enforces that all valid sortby have a unique non empty output
    Ammo::valid_param_unique_testing(
        "ammo_type",
        VALID_AMMO_TYPE.iter().map(|x| (*x).to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_ammo_damage() {
    Ammo::valid_param_unique_testing(
        "damage",
        ((0..250).step_by(20)).map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_ammo_penetration_power() {
    Ammo::valid_param_unique_testing(
        "penetration_power",
        ((0..100).step_by(20)).map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_ammo_initial_speed() {
    Ammo::valid_param_unique_testing(
        "initial_speed",
        ((0..1200).step_by(200)).map(|x| x.to_string()).collect(),
    )
    .await;
}

#[tokio::test]
async fn test_task_kappa_lightkeeper() {
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
async fn test_ids() {
    // this tests enforces that ids grab the correct data
    // we do this test twice since it has a unique caching set up
    Item::ids_testing("_id").await;
    Item::ids_testing("_id").await;

    Task::ids_testing("_id").await;
    Task::ids_testing("_id").await;

    Ammo::ids_testing("item_id").await;
    Ammo::ids_testing("item_id").await;
}

// this tests enforces that search does not break backend and works correctly
#[tokio::test]
async fn test_item_search() {
    Item::search_testing().await;
}

#[tokio::test]
async fn test_task_search() {
    Task::search_testing().await;
}

#[tokio::test]
async fn test_ammo_search() {
    Ammo::search_testing().await;
}

// this tests enforces that limit and offset grab the correct values
#[tokio::test]
async fn test_item_limit_and_offset() {
    Item::limit_and_offset_testing().await;
}

#[tokio::test]
async fn test_task_limit_and_offset() {
    Task::limit_and_offset_testing().await;
}

#[tokio::test]
async fn test_ammo_limit_and_offset() {
    Ammo::limit_and_offset_testing().await;
}

fn perform_dfs(start_id: String, ids: &HashSet<String>, adj_list: &AdjList) {
    let mut st = vec![start_id];
    let mut visited = HashSet::new();
    while let Some(id) = st.pop() {
        if visited.contains(&id) {
            continue;
        }

        visited.insert(id.clone());

        let adj_tasks = adj_list.get(&id).expect("did not find id in adj_list");
        for adj_task in adj_tasks.iter().filter(|task| !task.1) {
            assert!(ids.contains(&adj_task.0));
            st.push(adj_task.0.clone());
        }
    }

    // there are some tasks that are not required but have following tasks that are
    // all of these also have active status instead of required
    assert!(ids.len() - visited.len() < 10);
}

// this tests to make sure that the adj_list handles kappa required and lightkeeper required tasks correctly
#[tokio::test]
async fn test_adj_list() {
    let res = Client::new()
        .get(format!("{}{}", URL, "/tasks/adj_list"))
        .send()
        .await
        .expect("adj_list endpoint failed");

    assert!(res.status().is_success());

    let adj_list: AdjList = res.json().await.expect("adjlist endpoint failed");

    let (collector_vec, kappa, knockknock_vec, lightkeeper) = tokio::join!(
        Task::get_request_vec(format!(
            "{}{}",
            URL, "/tasks?search=collector&is_kappa=true&limit=1"
        )),
        Task::get_request_vec(format!("{}{}", URL, "/tasks?is_kappa=true&limit=1000")),
        Task::get_request_vec(format!(
            "{}{}",
            URL, "/tasks?search=knock-knock&is_lightkeeper=true&limit=1"
        )),
        Task::get_request_vec(format!(
            "{}{}",
            URL, "/tasks?is_lightkeeper=true&limit=1000"
        ))
    );

    // the collector is the final kappa task
    let collector = collector_vec[0].clone();
    assert!(collector._id == "5c51aac186f77432ea65c552");

    let kappa_ids: HashSet<String> = Task::get_ids(&kappa).into_iter().collect();
    perform_dfs(collector._id, &kappa_ids, &adj_list);

    // knock knock is the task where you meet the lightkeeper
    let knockknock = knockknock_vec[0].clone();
    assert!(knockknock._id == "625d7005a4eb80027c4f2e09");

    let lightkeeper_ids: HashSet<String> = Task::get_ids(&lightkeeper).into_iter().collect();
    perform_dfs(knockknock._id, &lightkeeper_ids, &adj_list);
}

// this tests to make sure that adding the device id header works correctly
#[tokio::test]
async fn test_item_device() {
    Item::device_id_testing().await;
}

#[tokio::test]
async fn test_task_device() {
    Task::device_id_testing().await;
}

#[tokio::test]
async fn test_ammo_device() {
    Ammo::device_id_testing().await;
}

#[tokio::test]
async fn normal_case_redis_testing() {
    let total_time = std::time::Instant::now();

    let mut handlers = vec![];

    // end number represents number of users
    for _ in 0..400 {
        handlers.push(std::thread::spawn(async || {
            // end number represents number of requests a user would make albeit with no time in between
            for _ in 0..5 {
                let v = Item::get_request_vec(format!("{}{}", URL, "/items")).await;
                assert!(!v.is_empty());
                let v = Task::get_request_vec(format!("{}{}", URL, "/tasks")).await;
                assert!(!v.is_empty());
                let v = Ammo::get_request_vec(format!("{}{}", URL, "/ammo")).await;
                assert!(!v.is_empty());
            }
        }));
    }

    for handle in handlers {
        handle.join().unwrap().await;
    }

    println!("{}ms", total_time.elapsed().as_millis());
}

#[tokio::test]
async fn large_limit_redis_testing() {
    let total_time = std::time::Instant::now();

    let mut handlers = vec![];

    // end number represents number of users
    for _ in 0..10 {
        handlers.push(std::thread::spawn(async || {
            // end number represents number of requests a user would make albeit with no time in between
            for _ in 0..3 {
                let v = Item::get_request_vec(format!("{}{}", URL, "/items?limit=1000")).await;
                assert!(!v.is_empty());
                let v = Task::get_request_vec(format!("{}{}", URL, "/tasks?limit=1000")).await;
                assert!(!v.is_empty());
                let v = Ammo::get_request_vec(format!("{}{}", URL, "/ammo?limit=1000")).await;
                assert!(!v.is_empty());
            }
        }));
    }

    for handle in handlers {
        handle.join().unwrap().await;
    }

    println!("{}ms", total_time.elapsed().as_millis());
}
