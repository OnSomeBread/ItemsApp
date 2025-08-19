from fastapi import APIRouter, Request
from api.models import Task
from ..serializers import TaskSerializer
from asgiref.sync import sync_to_async
from django.core.cache import cache
from api.api_scheduler import get_redis_timeout
import asyncio
import json
import os

router = APIRouter(prefix='/api', tags=['tasks'])
REDIS_CACHE_ENABLED = 'REDIS_URL' in os.environ

@sync_to_async(thread_sensitive=True)
def get_tasks_db_operations(search:str, isKappa:bool, isLightKeeper:bool, playerLvl:int, objType:str, trader:str, limit:int, offset:int, completedTasks: list[str]):
    tasks = Task.objects.exclude(_id__in=completedTasks)
    tasks = tasks.filter(name__icontains=search, minPlayerLevel__lte=playerLvl)

    if trader.lower() != 'any':
        tasks = tasks.filter(trader__iexact=trader)

    if objType.lower() != 'any':
        tasks = tasks.filter(objectives__objType__iexact=objType).distinct()
    
    if isKappa:
        tasks = tasks.filter(kappaRequired=True)
    if isLightKeeper:
        tasks = tasks.filter(lightkeeperRequired=True)

    serializer = TaskSerializer(tasks.order_by('_id')[offset:offset + limit], many=True)
    return serializer.data

# returns json array of tasks that match the query params
@router.get("/tasks")
async def get_tasks(request: Request):
    # grab all of the query params
    search:str = request.query_params.get('search', '')
    isKappa:bool = request.query_params.get('isKappa', 'false').lower() == 'true'
    isLightKeeper:bool = request.query_params.get('isLightKeeper', 'false').lower() == 'true'
    objType:str = request.query_params.get('objType', 'any')
    trader:str = request.query_params.get('trader', 'any')
    
    playerLvl:str = request.query_params.get('playerLvl', '99')
    playerLvl:int = int(playerLvl) if playerLvl.isdigit() else 99

    limit:str = request.query_params.get('limit', '30')
    limit:int = min(int(limit), 100) if limit.isdigit() else 30

    offset:str = request.query_params.get('offset', '0')
    offset:int = int(offset) if offset.isdigit() else 0
    
    completedTasks:list[str] = request.query_params.getlist('ids')

    # check if this is a repeated query and if so return it
    cache_key:str = search + str(isKappa) + str(isLightKeeper) + objType + trader + str(playerLvl) + str(limit) + str(offset) + ''.join(completedTasks)
    if REDIS_CACHE_ENABLED and await cache.ahas_key(cache_key):
        return await cache.aget(cache_key)

    data = await get_tasks_db_operations(search, isKappa, isLightKeeper, playerLvl, objType, trader, limit, offset, completedTasks)

    # save this query in the background
    asyncio.create_task(cache.aset(cache_key, data)) if REDIS_CACHE_ENABLED else None
    return data

@sync_to_async(thread_sensitive=True)
def get_tasks_by_ids_db_operations(ids):
    # find all the tasks that weren't cached
    tasks = Task.objects.filter(_id__in=ids)
    serializer = TaskSerializer(tasks, many=True)
    return serializer.data

# returns json array of each task in the list of given ids
@router.get("/task_ids")
async def get_tasks_by_ids(request: Request):
    # a set is more appropriate here as fast remove opperations are needed here
    ids = set(request.query_params.getlist('ids'))
    if not REDIS_CACHE_ENABLED:
        return await get_tasks_by_ids_db_operations(ids)

    # get all cached task ids
    found_tasks = []
    for task_id in ids.copy():
        if await cache.ahas_key(task_id):
            found_tasks.append(await cache.aget(task_id))
            ids.remove(task_id)

    data = await get_tasks_by_ids_db_operations(ids)

    # store all new ids
    for tsk in data:
        asyncio.create_task(cache.aset(tsk['_id'], tsk, timeout=get_redis_timeout('tasks')))

    return data + found_tasks

# since each task has its requirements we can send over an adjacency list to handle 
# completing a task and its required tasks in the same button
@router.get("/adj_list")
async def get_adj_list():
    # dont build it again if its already cached
    if REDIS_CACHE_ENABLED and await cache.ahas_key('adj_list'):
        return await cache.aget('adj_list')
    
    # if the most_recent_tasks.json file does not exist it likely means the db
    # is also not init since the api call creates the file and pops the db
    with open('most_recent_tasks.json', 'r') as f:
        result = json.load(f)['data']['tasks']
        adj_list = {}

        for task in result:
            for req in task['taskRequirements']:
                #status = ', '.join(req['status'])
                from_id = task['id']
                to_id = req['task']['id']

                if from_id not in adj_list:
                    adj_list[from_id] = []
                adj_list[from_id].append((to_id, 'prerequisite'))

                # make this a double ended adj_list
                if to_id not in adj_list:
                    adj_list[to_id] = []
                adj_list[to_id].append((from_id, 'unlocks'))

        asyncio.create_task(cache.aset('adj_list', adj_list, timeout=get_redis_timeout('tasks'))) if REDIS_CACHE_ENABLED else None
        return adj_list
    print('tasks.json does not exist')
    return {}