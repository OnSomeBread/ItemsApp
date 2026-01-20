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

const CONFIG: bincode::config::Configuration<
    bincode::config::LittleEndian,
    bincode::config::Fixint,
> = bincode::config::standard().with_fixed_int_encoding();

enum CacheValue {
    CacheStr(Arc<[u8]>),
    CacheVec(Vec<Arc<[u8]>>),
}

impl Clone for CacheValue {
    fn clone(&self) -> Self {
        match self {
            Self::CacheStr(s) => Self::CacheStr(Arc::clone(s)),
            Self::CacheVec(v) => Self::CacheVec(v.iter().map(Arc::clone).collect()),
        }
    }
}

pub struct AppCache {
    cache: Arc<DashMap<Box<str>, CacheValue>>,
    keys: Arc<DashMap<char, Vec<String>>>,
}

// without this keys gets deep copied instead of Arc::cloned
impl Clone for AppCache {
    fn clone(&self) -> Self {
        Self {
            cache: self.cache.clone(),
            keys: Arc::clone(&self.keys),
        }
    }
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
        if let Ok(data) = bincode::serde::encode_to_vec(value, CONFIG) {
            self.cache
                .insert(key.clone().into(), CacheValue::CacheStr(data.into()));
        }

        (*self.keys).entry(cache_prefix).or_default().push(key);
    }

    pub fn insert_vec<T>(&self, key: String, value: &[T], cache_prefix: char)
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        let mut data = vec![];
        for v in value {
            if let Ok(v_str) = bincode::serde::encode_to_vec(v, CONFIG) {
                data.push(v_str.into());
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
            if let Ok((v, _)) = bincode::serde::decode_from_slice(&value, CONFIG) {
                v
            } else {
                None
            }
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
                .map(|v| {
                    if let Ok((v, _)) = bincode::serde::decode_from_slice(v, CONFIG) {
                        Some(v)
                    } else {
                        None
                    }
                })
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

// completly dynamic data caching approach but turns out is much slower than just serde_json
// pub struct AppCache {
//     cache: Cache<String, Arc<dyn CacheValue>>,
//     keys: Arc<Mutex<HashMap<String, Vec<String>>>>,
// }

// trait CacheValue: Send + Sync {
//     fn as_any(&self) -> &dyn Any;
// }

// // this allows for generic types as the cache value
// impl<T> CacheValue for T
// where
//     T: Send + Sync + Clone + 'static,
// {
//     fn as_any(&self) -> &dyn Any {
//         self
//     }
// }

// impl AppCache {
//     pub fn new() -> Self {
//         Self {
//             cache: Cache::new(1000),
//             keys: Arc::new(Mutex::new(HashMap::new())),
//         }
//     }

//     pub async fn insert<T>(&self, key: String, value: T, cache_prefix: &'static str)
//     where
//         T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
//     {
//         self.cache.insert(key.clone(), Arc::new(value)).await;

//         (*self.keys.lock().await)
//             .entry(cache_prefix.to_string())
//             .or_insert(Vec::new())
//             .push(key);
//     }

//     pub async fn insert_vec<T>(&self, key: String, value: Vec<T>, cache_prefix: &'static str)
//     where
//         T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
//     {
//         self.cache.insert(key.clone(), Arc::new(value)).await;

//         (*self.keys.lock().await)
//             .entry(cache_prefix.to_string())
//             .or_insert(Vec::new())
//             .push(key);
//     }

//     pub async fn get<T>(&self, key: &String) -> Option<T>
//     where
//         T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
//     {
//         (self.cache.get(key).await)
//             .map_or_else(|| None, |data| data.as_any().downcast_ref::<T>().cloned())
//     }

//     pub async fn get_vec<T>(&self, key: &String) -> Option<Vec<T>>
//     where
//         T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
//     {
//         (self.cache.get(key).await).map_or_else(
//             || None,
//             |data| data.as_any().downcast_ref::<Vec<T>>().cloned(),
//         )
//     }

//     pub async fn invalidate_cache_prefix(&self, cache_prefix: &'static str) {
//         if let Some(keys) = (*self.keys.lock().await).get_mut(cache_prefix) {
//             for key in keys.clone() {
//                 self.cache.invalidate(&key).await;
//             }
//             keys.clear();
//         }
//     }
// }
