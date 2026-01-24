use crate::database_types::{Ammo, Item, ItemBase, SavedItemData, Task, TaskBase};
use crate::query_types::AdjList;
use crate::task_routes::GrabIds;
use dashmap::DashMap;
use std::sync::Arc;

// pub trait RedisCache: DeserializeOwned + Serialize + Send + 'static {
//     async fn get_vec(
//         cache_key: &String,
//         redispool: &Pool<RedisConnectionManager>,
//     ) -> Result<Option<Vec<Self>>, AppError> {
//         let mut conn = redispool.get().await.ok();

//         if let Some(conn) = conn.as_mut() {
//             let value: Option<Option<String>> = conn.get(cache_key).await.ok();
//             if let Some(value_str) = value.flatten()
//                 && let Ok(val) = serde_json::from_str(&value_str)
//             {
//                 return Ok(val);
//             }
//         }

//         Ok(None)
//     }

//     fn set_vec(
//         cache_key: String,
//         input_vec: Vec<Self>,
//         redispool: Pool<RedisConnectionManager>,
//         api_call: Arc<Mutex<Instant>>,
//     ) {
//         tokio::spawn(async move {
//             if let Ok(mut conn) = redispool.get().await
//                 && let Ok(data) = serde_json::to_string(&input_vec)
//             {
//                 let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

//                 let time_in_seconds = get_time_in_seconds(&api_call).await;
//                 let _: redis::RedisResult<()> = conn.expire(cache_key, time_in_seconds).await;
//             }
//         });
//     }
// }

// // impl RedisCache for Item {}
// // impl RedisCache for SavedItemData {}
// // impl RedisCache for Task {}
// // impl RedisCache for TaskBase {}
// // impl RedisCache for Ammo {}

pub trait Cacheable: Sized + Clone {
    fn into_cache_type(self) -> CacheType;
    fn from_cache_type(cache_type: &CacheType) -> Option<Self>;
}

macro_rules! define_cache_types {
    ($($variant:ident($ty:ty)),* $(,)?) => {
        #[derive(Clone)]
        pub enum CacheType {
            $(
                $variant($ty),
            )*
        }

        $(
            impl Cacheable for $ty {
                fn into_cache_type(self) -> CacheType {
                    CacheType::$variant(self)
                }

                fn from_cache_type(cache: &CacheType) -> Option<Self> {
                    match cache {
                        CacheType::$variant(v) => Some(v.clone()),
                        _ => None,
                    }
                }
            }
        )*
    };
}

define_cache_types! {
    I32(i32),
    I64(i64),
    GrabIds(GrabIds),
    Item(Item),
    ItemBase(ItemBase),
    Ammo(Ammo),
    Task(Task),
    TaskBase(TaskBase),
    SavedItemData(SavedItemData),
    AdjList(AdjList),
}

#[derive(Clone)]
enum CacheValue {
    One(CacheType),
    Vec(Vec<CacheType>),
}

#[derive(Clone)]
pub struct AppCache {
    cache: Arc<DashMap<Box<str>, CacheValue>>,
    keys: Arc<DashMap<char, Vec<Box<str>>>>,
}

impl AppCache {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
            keys: Arc::new(DashMap::new()),
        }
    }

    pub fn insert<T>(&self, key: impl Into<Box<str>>, value: T, cache_prefix: char)
    where
        T: Cacheable + Clone + Send + Sync,
    {
        let key = key.into();
        self.cache
            .insert(key.clone(), CacheValue::One(value.into_cache_type()));

        (*self.keys).entry(cache_prefix).or_default().push(key);
    }

    pub fn insert_vec<T>(&self, key: impl Into<Box<str>>, value: Vec<T>, cache_prefix: char)
    where
        T: Cacheable + Clone + Send + Sync,
    {
        let key = key.into();
        self.cache.insert(
            key.clone(),
            CacheValue::Vec(value.into_iter().map(Cacheable::into_cache_type).collect()),
        );

        (*self.keys).entry(cache_prefix).or_default().push(key);
    }

    pub fn get<T>(&self, key: &str) -> Option<T>
    where
        T: Cacheable + Clone + Send + Sync,
    {
        let value = self.cache.get(key)?;
        match value.value() {
            CacheValue::One(v) => T::from_cache_type(v),
            CacheValue::Vec(_) => None,
        }
    }

    pub fn get_vec<T>(&self, key: &str) -> Option<Vec<T>>
    where
        T: Cacheable + Clone + Send + Sync,
    {
        match self.cache.get(key)?.value() {
            CacheValue::Vec(values) => values.iter().map(T::from_cache_type).collect(),
            CacheValue::One(_) => None,
        }
    }

    pub fn invalidate_cache_prefix(&self, cache_prefix: char) {
        let values = (*self.keys).get_mut(&cache_prefix);

        if let Some(keys) = values {
            keys.iter().for_each(|x| {
                self.cache.remove(x);
            });
        }
    }
}
