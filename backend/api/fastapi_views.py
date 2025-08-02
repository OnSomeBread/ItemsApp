# it's required for fastapi to have django settings
# but also run fastapi for uvicorn and django settings has to come before every other import
import os
from django.core.asgi import get_asgi_application
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from django.core.management import call_command
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendDjango.settings')
django_app = get_asgi_application()

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from api.models import Item, Task

    print('django performing migrations')
    await sync_to_async(call_command)('makemigrations', 'api')
    await sync_to_async(call_command)('migrate', 'api')

    if await sync_to_async(Item.objects.count)() == 0:
        asyncio.create_task(sync_to_async(call_command)('upsert_items_file', 'most_recent_items.json'))

    if await sync_to_async(Task.objects.count)() == 0:
        asyncio.create_task(sync_to_async(call_command)('upsert_tasks_file', 'most_recent_tasks.json'))

    # TODO replace file upserts with api ones only in production
    # call_command('upsert_items_api')
    # call_command('upsert_tasks_api')

    # scheduler.add_job(
    #     lambda: call_command('upsert_items_file', 'most_recent_items.json'),
    #     trigger="interval",
    #     seconds=300,
    #     id="repeat-upsert-items"
    # )

    # scheduler.add_job(
    #     lambda: call_command('upsert_tasks_file', 'most_recent_tasks.json'),
    #     trigger="interval",
    #     seconds=300,
    #     id="repeat-upsert-tasks"
    # )

    # scheduler.start()

    yield

    # scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

app.mount("/django", django_app)

from api.models import Item, SellFor, PastApiCalls, Task, SavedItemData
from django.contrib.auth.models import User
from django.db.models import Subquery, OuterRef
from django.core.cache import cache
from .serializers import ItemSerializer, UserSerializers, SavedItemHistorySerializer, PastApiCallsSerializer, TaskSerializer
from django.core.cache import cache
from asgiref.sync import sync_to_async
import json
from datetime import datetime, timezone

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ['ALLOWED_ORIGINS'].split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# returns the number of seconds til next api call for the respective api
def get_redis_timeout(api: str):
    job = scheduler.get_job('repeat-upsert-' + api)
    if job: 
        return (job.next_run_time - datetime.now(timezone.utc)).total_seconds()
    return 3600

@sync_to_async(thread_sensitive=True)
def get_items_db_operations(search:str, sortBy:str, asc:str, item_type:str, limit:int, offset:int):
    # do a different search if asking for flea price since not all items have flea
    if item_type != 'any':
        items = Item.objects.filter(itemtypes__name=item_type)
    else:
        items = Item.objects

    # id is needed for order_by to make it consistant because it normally varys 
    # leading to duplicates given to user if using pagination
    if sortBy == 'fleaMarket': 
        flea_market_prices = SellFor.objects.filter(item=OuterRef('pk'), source='fleaMarket').order_by('-price', 'id')
        items = items.annotate(fleaPrice=Subquery(flea_market_prices.values('price')[:1]))
        items = items.filter(fleaPrice__isnull=False, name__icontains=search).order_by(asc + 'fleaPrice', '_id')
    else:
        items = items.filter(name__icontains=search).order_by(asc + sortBy, '_id')
    
    serializer = ItemSerializer(items[offset:offset + limit], many=True)
    return serializer.data

# returns json array of items that match the query params
@app.get("/api/items")
async def get_items(request: Request):
    # grab all of the filter and sort params
    search:str = request.query_params.get('search', '')
    sortBy:str = request.query_params.get('sortBy', 'fleaMarket')
    asc:str = request.query_params.get('asc', '-')
    item_type:str = request.query_params.get('type', 'any')

    limit:str = request.query_params.get('limit')
    try:
        limit = min(int(limit), 100)
    except:
        limit = 30

    offset:str = request.query_params.get('offset')
    try:
        offset = int(offset)
    except:
        offset = 0
    
    # check if current query has already been done and if so just return it 
    cache_key:str = search + sortBy + asc + item_type + str(limit) + str(offset)
    if await cache.ahas_key(cache_key):
        return await cache.aget(cache_key)

    data = await get_items_db_operations(search, sortBy, asc, item_type, limit, offset)

    asyncio.create_task(cache.aset(cache_key, data, timeout=get_redis_timeout('items')))
    return data

@sync_to_async(thread_sensitive=True)
def get_items_by_ids_db_operations(ids, found_count:int):
    # find all the items that weren't cached
    items = Item.objects.filter(_id__in=ids)
    serializer = ItemSerializer(items[:max(len(ids) - found_count, 0)], many=True)
    return serializer.data

# returns json array of each item in the list of given ids
@app.get("/api/cart")
async def get_items_by_ids(request: Request):
    # a set is more appropriate here as fast remove opperations are needed here
    ids = set(request.query_params.getlist('ids'))

    # get all cached item ids
    found_items = []
    for item_id in ids.copy():
        if await cache.ahas_key(item_id):
            found_items.append(await cache.aget(item_id))
            ids.remove(item_id)

    data = await get_items_by_ids_db_operations(ids, len(found_items))

    # store all new ids
    for itm in data:
        asyncio.create_task(cache.aset(itm['_id'], itm, timeout=get_redis_timeout('items')))

    return data + found_items

# should not be async as this should not be called often
# returns data from pastApiCalls not meant for user use but its here for development
@app.get("/api/apiCalls")
def get_past_api_calls(request: Request):
    passedCalls = PastApiCalls.objects.all()
    serializer = PastApiCallsSerializer(passedCalls, many=True)
    return serializer.data

@sync_to_async(thread_sensitive=True)
def get_tasks_db_operations(search:str, isKappa:bool, isLightKeeper:bool, playerLvl:int, objType:str, limit:int, offset:int, completedTasks: list[str]):
    tasks = Task.objects.exclude(_id__in=completedTasks)
    tasks = tasks.filter(name__icontains=search, minPlayerLevel__lte=playerLvl)

    if objType != 'any':
        tasks = tasks.filter(objectives__objType=objType).distinct()
    
    # the == True is needed here otherwise always its always True
    if isKappa == True:
        tasks = tasks.filter(kappaRequired=True)
    if isLightKeeper == True:
        tasks = tasks.filter(lightkeeperRequired=True)

    serializer = TaskSerializer(tasks[offset:offset + limit], many=True)
    return serializer.data

# returns json array of tasks that match the query params
@app.get("/api/tasks")
async def get_tasks(request: Request):
    search:str = request.query_params.get('search', '')
    isKappa: bool = request.query_params.get('isKappa', False)
    isLightKeeper: bool = request.query_params.get('isLightKeeper', False)
    playerLvl: int = request.query_params.get('playerLvl', 99)
    objType: str = request.query_params.get('objType', 'any')
    limit: str = request.query_params.get('limit')
    try:
        limit = min(int(limit), 100)
    except Exception:
        limit = 30

    offset:str = request.query_params.get('offset')
    try:
        offset = int(offset)
    except:
        offset = 0
    
    completedTasks:list[str] = request.query_params.get('ids', [])

    # check if this is a repeated query and if so return it
    cache_key:str = search + isKappa + isLightKeeper + playerLvl + objType + str(limit) + str(offset) + ''.join(completedTasks)
    if await cache.ahas_key(cache_key):
        return await cache.aget(cache_key)

    data = await get_tasks_db_operations(search, isKappa, isLightKeeper, playerLvl, objType, limit, offset, completedTasks)

    # save this query in the background
    asyncio.create_task(cache.aset(cache_key, data))
    return data

# since each task has its requirements we can send over an adjacency list to handle 
# completing a task and its required tasks in the same button
@app.get("/api/adj_list")
async def get_adj_list():
    # dont build it again if its already cached
    if await cache.ahas_key('adj_list'):
        return await cache.aget('adj_list')
    
    # if the most_recent_tasks.json file does not exist it likely means the db
    # is also not init since the api call creates the file and pops the db
    with open('most_recent_tasks.json', 'r') as f:
        result = json.load(f)['data']['tasks']
        adj_list = {}

        for task in result:
            for req in task['taskRequirements']:
                status = ', '.join(req['status'])
                from_id = task['id']
                to_id = req['task']['id']

                if from_id not in adj_list:
                    adj_list[from_id] = []

                adj_list[from_id].append((to_id, status))

        asyncio.create_task(cache.aset('adj_list', adj_list, timeout=get_redis_timeout('tasks')))
        return adj_list
    print('tasks.json does not exist')
    return {}

@sync_to_async(thread_sensitive=True)
def get_item_history_db_operations(item_id:str):
    item_data = SavedItemData.objects.filter(item_id=item_id).values('item_id', 'avg24hPrice', 'changeLast48hPercent', 'fleaMarket', 'past_api_call__time')

    serializer = SavedItemHistorySerializer(item_data, many=True)
    return serializer.data

# grabs past item flea market prices for a specific item id
@app.get('/api/item_history')
async def get_item_history(request: Request):
    item_id = request.query_params.get('item_id')

    if item_id == None:
        return 'no given item id'
    
    if await cache.ahas_key('history' + item_id):
        return await cache.aget('history' + item_id)

    data = await get_item_history_db_operations(item_id)
    asyncio.create_task(cache.aset('history' + item_id, data, timeout=get_redis_timeout('items')))

    return data