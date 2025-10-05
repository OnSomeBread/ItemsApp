use std::sync::{Arc, Mutex};
use std::time::Instant;

use bb8_redis::RedisConnectionManager;
use bb8_redis::bb8::Pool;
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
        api_call: Arc<Mutex<Option<Instant>>>,
    ) {
        tokio::spawn(async move {
            if let Ok(mut conn) = redispool.get().await
                && let Ok(data) = serde_json::to_string(&input_vec)
            {
                let _: redis::RedisResult<()> = conn.set(cache_key.clone(), data).await;

                if let Some(time_in_seconds) = get_time_in_seconds(&api_call) {
                    let _: redis::RedisResult<()> = conn.expire(cache_key, time_in_seconds).await;
                }
            }
        });
    }
}

impl RedisCache for Item {}
impl RedisCache for SavedItemData {}
impl RedisCache for Task {}
impl RedisCache for TaskBase {}
impl RedisCache for Ammo {}
