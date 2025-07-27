# TODO find a better way to do this it's required for fastapi to have django settings
# but also run fastapi for uvicorn and django settings has to come before every other import
import os
from django.core.asgi import get_asgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendDjango.settings')
application = get_asgi_application()

from api.models import Item, SellFor, PastApiCalls, Task
from django.contrib.auth.models import User
from django.db.models import Subquery, OuterRef
from django.core.cache import cache
from .serializers import ItemSerializer, UserSerializers, PastApiCallsSerializer, TaskSerializer
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from django.core.cache import cache
from asgiref.sync import sync_to_async
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ['ALLOWED_ORIGINS'].split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/items")
async def test_fastapi_view(request: Request):
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

    # do a different search if asking for flea price since not all items have flea
    if item_type != 'any':
        items = await sync_to_async(Item.objects.filter)(itemtypes__name=item_type)
    else:
        items = Item.objects

    # id is needed for order_by to make it consistant because it normally varys 
    # leading to duplicates given to user if using pagination
    if sortBy == 'fleaMarket': 
        flea_market_prices = await sync_to_async((await sync_to_async(SellFor.objects.filter)(item=OuterRef('pk'), source='fleaMarket')).order_by)('-price', 'id')
        items = await sync_to_async(items.annotate)(fleaPrice=Subquery(flea_market_prices.values('price')[:1]))
        items = await sync_to_async((await sync_to_async(items.filter)(fleaPrice__isnull=False, name__icontains=search)).order_by)(asc + 'fleaPrice', '_id')
    else:
        items = await sync_to_async((await sync_to_async(items.filter)(name__icontains=search)).order_by)(asc + sortBy, '_id')
    
    serializer = ItemSerializer(items[offset:offset + limit], many=True)

    # TODO when api refreshes are implemented this will need to have a timeout that will last till next refresh
    data = await sync_to_async(lambda: serializer.data)()

    asyncio.create_task(cache.aset(cache_key, data, timeout=3600))
    return data

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

    # find all the items that weren't cached
    items = await sync_to_async(Item.objects.filter)(_id__in=ids)
    serializer = ItemSerializer(items[:30 - len(found_items)], many=True)
    data = await sync_to_async(lambda: serializer.data)()

    # store all new ids
    # TODO when api refreshes are implemented this will need to have a timeout that will last till next refresh
    for itm in data:
        asyncio.create_task(cache.aset(itm['_id'], itm, timeout=3600))

    return data + found_items

# should not be async as this should not be called often
@app.get("/api/apiCalls")
def get_past_api_calls(request: Request):
    passedCalls = PastApiCalls.objects.all()
    serializer = PastApiCallsSerializer(passedCalls, many=True)
    return serializer.data

@app.get("/api/tasks")
def get_tasks(request: Request):
    tasks = Task.objects.all()
    serializer = TaskSerializer(tasks[:30], many=True)
    return serializer.data