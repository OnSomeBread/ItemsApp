use dashmap::DashMap;
use serde::Serialize;
use serde::de::DeserializeOwned;
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

#[derive(Clone)]
enum CacheValue {
    CacheStr(Vec<u8>),
    CacheVec(Vec<Vec<u8>>),
}

#[derive(Clone)]
pub struct AppCache {
    cache: Arc<DashMap<Box<str>, CacheValue>>,
    keys: Arc<DashMap<char, Vec<String>>>,
}

impl AppCache {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
            keys: Arc::new(DashMap::new()),
        }
    }

    pub fn insert<T>(&self, key: String, value: &T, cache_prefix: char)
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        if let Ok(data) = postcard::to_allocvec(value) {
            self.cache
                .insert(key.clone().into(), CacheValue::CacheStr(data));
        }

        (*self.keys).entry(cache_prefix).or_default().push(key);
    }

    pub fn insert_vec<T>(&self, key: String, value: &[T], cache_prefix: char)
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        let mut data = vec![];
        for v in value {
            if let Ok(value_bytes) = postcard::to_allocvec(v) {
                data.push(value_bytes);
            } else {
                return;
            }
        }
        self.cache
            .insert(key.clone().into(), CacheValue::CacheVec(data));

        (*self.keys).entry(cache_prefix).or_default().push(key);
    }

    pub fn get<T>(&self, key: &str) -> Option<T>
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        let value = self.cache.get(key)?.clone();
        if let CacheValue::CacheStr(value) = value {
            postcard::from_bytes::<T>(&value).ok()
        } else {
            None
        }
    }

    pub fn get_vec<T>(&self, key: &str) -> Option<Vec<T>>
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        let value = self.cache.get(key)?.clone();
        if let CacheValue::CacheVec(values) = value {
            values
                .iter()
                .map(|v| postcard::from_bytes::<T>(v).ok())
                .collect()
        } else {
            None
        }
    }

    pub fn invalidate_cache_prefix(&self, cache_prefix: char) {
        let values = (*self.keys).get_mut(&cache_prefix);

        if let Some(keys) = values {
            keys.iter().for_each(|x| {
                self.cache.remove(x.as_str());
            });
        }
    }
}
