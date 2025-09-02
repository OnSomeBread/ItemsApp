from asyncio import create_task
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from django.core.management import call_command
from asgiref.sync import sync_to_async
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from api.settings import DEBUG

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from api.models import Item, Task

    print('django performing migrations')
    await sync_to_async(call_command)('makemigrations', 'api')
    await sync_to_async(call_command)('migrate', 'api')

    if not DEBUG or await sync_to_async(Item.objects.count)() == 0:
        create_task(sync_to_async(call_command)('upsert_file', 'items', 'most_recent_items.json'))
    if not DEBUG or await sync_to_async(Task.objects.count)() == 0:
        create_task(sync_to_async(call_command)('upsert_file', 'tasks', 'most_recent_tasks.json'))

    if not DEBUG:
        scheduler.add_job(
            lambda: call_command('upsert_api', 'items', 'most_recent_items.json'),
            trigger="interval",
            hours=24,
            id="repeat-upsert-items"
        )

        scheduler.add_job(
            lambda: call_command('upsert_api', 'tasks', 'most_recent_tasks.json'),
            trigger="interval",
            hours=24,
            id="repeat-upsert-tasks"
        )

    scheduler.start()

    yield

    scheduler.shutdown()

# returns the number of seconds til next api call for the respective api
def get_redis_timeout(api: str):
    job = scheduler.get_job('repeat-upsert-' + api)
    if job:
        return (job.next_run_time - datetime.now(timezone.utc)).total_seconds()
    return 3600 * 6
