import asyncio
import json
import os
from fastapi import APIRouter, Request
from api.models import Task
from asgiref.sync import sync_to_async
from django.core.cache import cache
from ..serializers import TaskSerializer
from api.api_scheduler import get_redis_timeout


router = APIRouter(prefix='/api', tags=['tasks'])
REDIS_CACHE_ENABLED = 'REDIS_URL' in os.environ

@sync_to_async(thread_sensitive=True)
def get_tasks_db_operations(search:str, is_kappa:bool, is_light_keeper:bool, player_lvl:int, obj_type:str, trader:str, limit:int, offset:int, completed_tasks: list[str]):
    tasks = Task.objects.exclude(_id__in=completed_tasks)
    tasks = tasks.filter(name__icontains=search, minPlayerLevel__lte=player_lvl)

    if trader.lower() != 'any':
        tasks = tasks.filter(trader__iexact=trader)

    if obj_type.lower() != 'any':
        tasks = tasks.filter(objectives__objType__iexact=obj_type).distinct()

    if is_kappa:
        tasks = tasks.filter(kappaRequired=True)
    if is_light_keeper:
        tasks = tasks.filter(lightkeeperRequired=True)

    serializer = TaskSerializer(tasks.order_by('_id')[offset:offset + limit], many=True)
    return serializer.data

# returns json array of tasks that match the query params
@router.get("/tasks")
async def get_tasks(request: Request):
    # grab all of the query params
    search:str = request.query_params.get('search', '')
    is_kappa:bool = request.query_params.get('isKappa', 'false').lower() == 'true'
    is_light_keeper:bool = request.query_params.get('isLightKeeper', 'false').lower() == 'true'
    obj_type:str = request.query_params.get('objType', 'any')
    trader:str = request.query_params.get('trader', 'any')

    player_lvl:str = request.query_params.get('playerLvl', '99')
    player_lvl:int = int(player_lvl) if player_lvl.isdigit() else 99

    limit:str = request.query_params.get('limit', '30')
    limit:int = min(int(limit), 300) if limit.isdigit() else 30

    offset:str = request.query_params.get('offset', '0')
    offset:int = int(offset) if offset.isdigit() else 0

    completed_tasks:list[str] = request.query_params.getlist('ids')

    # check if this is a repeated query and if so return it
    cache_key:str = search + str(is_kappa) + str(is_light_keeper) + obj_type + trader + str(player_lvl) + str(limit) + str(offset) + ''.join(completed_tasks)
    if REDIS_CACHE_ENABLED and await cache.ahas_key(cache_key):
        return await cache.aget(cache_key)

    data = await get_tasks_db_operations(search, is_kappa, is_light_keeper, player_lvl, obj_type, trader, limit, offset, completed_tasks)

    # save this query in the background
    if REDIS_CACHE_ENABLED:
        await cache.aset(cache_key, data)
    return data

# returns json array of each task in the list of given ids
@router.get("/task_ids")
async def get_tasks_by_ids(request: Request):
    # a set is more appropriate here as fast remove opperations are needed here
    ids = set(request.query_params.getlist('ids'))

    # get all cached task ids
    found_tasks = []
    if REDIS_CACHE_ENABLED:
        for task_id in ids.copy():
            if await cache.ahas_key(task_id):
                found_tasks.append(await cache.aget(task_id))
                ids.remove(task_id)
    
    @sync_to_async(thread_sensitive=True)
    def get_tasks_by_ids_db_operations():
        # find all the tasks that weren't cached
        tasks = Task.objects.filter(_id__in=ids)
        serializer = TaskSerializer(tasks, many=True)
        return serializer.data

    data = await get_tasks_by_ids_db_operations()

    # store all new ids
    if REDIS_CACHE_ENABLED:
        for tsk in data:
            asyncio.create_task(cache.aset(tsk['_id'], tsk, timeout=get_redis_timeout('tasks')))

    return sorted(data + found_tasks, key=lambda task: task['_id'])

# since each task has its requirements we can send over an adjacency list to handle
# completing a task and its required tasks in the same button
@router.get("/adj_list")
async def get_adj_list():
    # dont build it again if its already cached
    if REDIS_CACHE_ENABLED and await cache.ahas_key('adj_list'):
        return await cache.aget('adj_list')

    # if the most_recent_tasks.json file does not exist it likely means the db
    # is also not init since the api call creates the file and pops the db
    with open('most_recent_tasks.json', 'r', encoding="utf-8") as f:
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

        if REDIS_CACHE_ENABLED:
            await cache.aset('adj_list', adj_list, timeout=get_redis_timeout('tasks'))

        return adj_list
    print('ERROR most_recent_tasks.json DOES NOT EXIST')
    return {}
