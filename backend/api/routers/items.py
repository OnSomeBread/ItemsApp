from asyncio import create_task, gather
from os import environ
from asgiref.sync import sync_to_async
from django.core.cache import cache
from django.db.models import Subquery, OuterRef
from fastapi import APIRouter, Request
from api.models import Item, SellFor, SavedItemData
from ..serializers import ItemSerializer, SavedItemHistorySerializer
from api.api_scheduler import get_redis_timeout
from api.settings import REDIS_CACHE_ENABLED

router = APIRouter(prefix='/api', tags=['items'])

@sync_to_async(thread_sensitive=True)
def get_items_db_operations(search:str, sort_by:str, asc:str, item_type:str, limit:int, offset:int):
    # do a different search if asking for flea price since not all items have flea
    items = Item.objects
    if item_type != 'any':
        items = items.filter(itemtypes__name__iexact=item_type)

    # id is needed for order_by to make it consistant because it normally varys
    # leading to duplicates given to user if using pagination
    if sort_by == 'fleaMarket':
        flea_market_prices = SellFor.objects.filter(item=OuterRef('pk'), name='fleaMarket')
        flea_market_prices = flea_market_prices.order_by('-price', 'id')
        items = items.annotate(fleaPrice=Subquery(flea_market_prices.values('price')[:1]))
        items = items.filter(fleaPrice__isnull=False, name__icontains=search)
        items = items.order_by(asc + 'fleaPrice', '_id')
    else:
        items = items.filter(name__icontains=search).order_by(asc + sort_by, '_id')

    serializer = ItemSerializer(items[offset:offset + limit], many=True)
    return serializer.data

# returns json array of items that match the query params
@router.get('/items')
async def get_items(request: Request):
    # grab all of the filter and sort params
    search:str = request.query_params.get('search', '')
    sort_by:str = request.query_params.get('sortBy', 'basePrice')
    asc:str = request.query_params.get('asc', '-')
    item_type:str = request.query_params.get('type', 'any')

    limit:str = request.query_params.get('limit', '30')
    limit:int = min(int(limit), 100) if limit.isdigit() else 30

    offset:str = request.query_params.get('offset', '0')
    offset:int = int(offset) if offset.isdigit() else 0

    # check if current query has already been done and if so just return it
    cache_key:str = search + sort_by + asc + item_type + str(limit) + str(offset)
    if REDIS_CACHE_ENABLED and await cache.ahas_key(cache_key):
        return await cache.aget(cache_key)

    data = await get_items_db_operations(search, sort_by, asc, item_type, limit, offset)

    if REDIS_CACHE_ENABLED:
        await cache.aset(cache_key, data, timeout=get_redis_timeout('items'))

    return data

@sync_to_async(thread_sensitive=True)
def get_item_history_db_operations(item_id:str):
    item_data = SavedItemData.objects.filter(item_id=item_id)
    item_data = item_data.values('item_id', 'avg24hPrice', 'changeLast48hPercent', 'fleaMarket', 'past_api_call__time')

    serializer = SavedItemHistorySerializer(item_data.order_by('past_api_call__time'), many=True)
    return serializer.data

# grabs past item flea market prices for a specific item id
@router.get('/item_history')
async def get_item_history(request: Request):
    item_id = request.query_params.get('item_id')

    if item_id is None:
        return {}

    if REDIS_CACHE_ENABLED and await cache.ahas_key('history' + item_id):
        return await cache.aget('history' + item_id)

    data = await get_item_history_db_operations(item_id)
    if REDIS_CACHE_ENABLED:
        await cache.aset('history' + item_id, data, timeout=get_redis_timeout('items'))

    return data

# returns json array of each item in the list of given ids
@router.get('/item_ids')
async def get_items_by_ids(request: Request):
    # a set is more appropriate here as fast remove opperations are needed here
    ids = set(request.query_params.getlist('ids'))

    # get all cached item ids
    found_items = []
    if REDIS_CACHE_ENABLED:
        for item_id in ids.copy():
            if await cache.ahas_key(item_id):
                found_items.append(await cache.aget(item_id))
                ids.remove(item_id)

    @sync_to_async(thread_sensitive=True)
    def get_items_by_ids_db_operations():
        # find all the items that weren't cached
        items = Item.objects.filter(_id__in=ids)
        serializer = ItemSerializer(items, many=True)
        return serializer.data

    data = await get_items_by_ids_db_operations()

    # store all new ids
    if REDIS_CACHE_ENABLED:
        async_tasks = []
        for itm in data:
            async_tasks.append(create_task(cache.aset(itm['_id'], itm, timeout=get_redis_timeout('items'))))
        await gather(*async_tasks)

    return sorted(data + found_items, key=lambda item: item['_id'])
