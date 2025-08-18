from fastapi import APIRouter, Request
from django.db.models import Subquery, OuterRef
from api.models import Item, SellFor, SavedItemData
from ..serializers import ItemSerializer, SavedItemHistorySerializer
from asgiref.sync import sync_to_async
from django.core.cache import cache
from api.api_scheduler import get_redis_timeout
import asyncio

router = APIRouter(prefix='/api', tags=['items'])

@sync_to_async(thread_sensitive=True)
def get_items_db_operations(search:str, sortBy:str, asc:str, item_type:str, limit:int, offset:int):
    # do a different search if asking for flea price since not all items have flea
    items = Item.objects
    if item_type != 'any':
        items = items.filter(itemtypes__name__iexact=item_type)
        
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
@router.get('/items')
async def get_items(request: Request):
    # grab all of the filter and sort params
    search:str = request.query_params.get('search', '')
    sortBy:str = request.query_params.get('sortBy', 'fleaMarket')
    asc:str = request.query_params.get('asc', '-')
    item_type:str = request.query_params.get('type', 'any')

    limit:str = request.query_params.get('limit', '30')
    limit:int = min(int(limit), 100) if limit.isdigit() else 30

    offset:str = request.query_params.get('offset', '0')
    offset:int = int(offset) if offset.isdigit() else 0
    
    # check if current query has already been done and if so just return it 
    cache_key:str = search + sortBy + asc + item_type + str(limit) + str(offset)
    if await cache.ahas_key(cache_key):
        return await cache.aget(cache_key)

    data = await get_items_db_operations(search, sortBy, asc, item_type, limit, offset)

    asyncio.create_task(cache.aset(cache_key, data, timeout=get_redis_timeout('items')))
    return data

@sync_to_async(thread_sensitive=True)
def get_item_history_db_operations(item_id:str):
    item_data = SavedItemData.objects.filter(item_id=item_id).values('item_id', 'avg24hPrice', 'changeLast48hPercent', 'fleaMarket', 'past_api_call__time')
    
    serializer = SavedItemHistorySerializer(item_data.order_by('past_api_call__time'), many=True)
    return serializer.data

# grabs past item flea market prices for a specific item id
@router.get('/item_history')
async def get_item_history(request: Request):
    item_id = request.query_params.get('item_id')

    if item_id == None:
        return 'no given item id'
    
    if await cache.ahas_key('history' + item_id):
        return await cache.aget('history' + item_id)

    data = await get_item_history_db_operations(item_id)
    asyncio.create_task(cache.aset('history' + item_id, data, timeout=get_redis_timeout('items')))

    return data

@sync_to_async(thread_sensitive=True)
def get_items_by_ids_db_operations(ids):
    # find all the items that weren't cached
    items = Item.objects.filter(_id__in=ids)
    serializer = ItemSerializer(items, many=True)
    return serializer.data

# returns json array of each item in the list of given ids
@router.get('/item_ids')
async def get_items_by_ids(request: Request):
    # a set is more appropriate here as fast remove opperations are needed here
    ids = set(request.query_params.getlist('ids'))

    # get all cached item ids
    found_items = []
    for item_id in ids.copy():
        if await cache.ahas_key(item_id):
            found_items.append(await cache.aget(item_id))
            ids.remove(item_id)

    data = await get_items_by_ids_db_operations(ids)

    # store all new ids
    for itm in data:
        asyncio.create_task(cache.aset(itm['_id'], itm, timeout=get_redis_timeout('items')))

    return data + found_items