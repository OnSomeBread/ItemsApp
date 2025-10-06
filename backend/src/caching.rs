use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;

use bb8_redis::RedisConnectionManager;
use bb8_redis::bb8::Pool;
use moka::future::Cache;
use redis::AsyncCommands;
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::api_routers::get_time_in_seconds;
use crate::database_types::{Ammo, Item, SavedItemData, Task, TaskBase};
use crate::query_types::AppError;

pub trait RedisCache: DeserializeOwned + Serialize + Send + 'static {
    async fn get_vec(
        cache_key: &String,
        redispool: &Pool<RedisConnectionManager>,
    ) -> Result<Option<Vec<Self>>, AppError> {
        let mut conn = redispool.get().await.ok();

        if let Some(conn) = conn.as_mut() {
            let value: Option<Option<String>> = conn.get(cache_key).await.ok();
            if let Some(value_str) = value.flatten()
                && let Ok(val) = serde_json::from_str(&value_str)
            {
                return Ok(val);
            }
        }

        Ok(None)
    }

    fn set_vec(
        cache_key: String,
        input_vec: Vec<Self>,
        redispool: Pool<RedisConnectionManager>,
        api_call: Arc<Mutex<Instant>>,
    ) {
        tokio::spawn(async move {
            if let Ok(mut conn) = redispool.get().await
                && let Ok(data) = serde_json::to_string(&input_vec)
            {
                let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                let time_in_seconds = get_time_in_seconds(&api_call).await;
                let _: redis::RedisResult<()> = conn.expire(cache_key, time_in_seconds).await;
            }
        });
    }
}

impl RedisCache for Item {}
impl RedisCache for SavedItemData {}
impl RedisCache for Task {}
impl RedisCache for TaskBase {}
impl RedisCache for Ammo {}

#[derive(Clone)]
pub struct MokaCache {
    cache: Cache<String, String>,
    keys: Arc<Mutex<HashMap<String, Vec<String>>>>,
}

impl MokaCache {
    pub fn new() -> Self {
        Self {
            cache: Cache::new(2000),
            keys: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn insert<T>(&self, key: String, value: &T, cache_prefix: &'static str)
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        if let Ok(data) = serde_json::to_string(value) {
            self.cache.insert(key.clone(), data).await;
        }

        (*self.keys.lock().await)
            .entry(cache_prefix.to_string())
            .or_insert(Vec::new())
            .push(key);
    }

    pub async fn insert_vec<T>(&self, key: String, value: &Vec<T>, cache_prefix: &'static str)
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        if let Ok(data) = serde_json::to_string(value) {
            self.cache.insert(key.clone(), data).await;
        }

        (*self.keys.lock().await)
            .entry(cache_prefix.to_string())
            .or_insert(Vec::new())
            .push(key);
    }

    pub async fn get<T>(&self, key: &String) -> Option<T>
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        (self.cache.get(key).await)
            .map_or_else(|| None, |data| serde_json::from_str(data.as_str()).ok())
    }

    pub async fn get_vec<T>(&self, key: &String) -> Option<Vec<T>>
    where
        T: Serialize + DeserializeOwned + 'static + Clone + Send + Sync,
    {
        (self.cache.get(key).await)
            .map_or_else(|| None, |data| serde_json::from_str(data.as_str()).ok())
    }

    pub async fn invalidate_cache_prefix(&self, cache_prefix: &'static str) {
        if let Some(keys) = (*self.keys.lock().await).get(cache_prefix) {
            for key in keys {
                self.cache.invalidate(key).await;
            }
        }
    }
}
