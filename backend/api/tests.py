from httpx import AsyncClient
from .fastapi_views import app
from django.core.cache import cache
import pytest
import os

@pytest.mark.asyncio
async def test_get_items_caching():
    async with AsyncClient() as ac:
        url = os.environ['ALLOWED_HOSTS'].split(',')[0]

        # remove the cache keys for the test
        await cache.adelete('basePrice-any500')
        await cache.adelete('fleaMarket-any500')

        print('running fleaMarket caching test')
        res1 = await ac.get(url + '/api?search=&asc=-&sort=fleaMarket&type=any&limit=50')
        assert res1.status_code == 200

        res2 = await ac.get(url + '/api?search=&asc=-&sort=fleaMarket&type=any&limit=50')
        assert res2.status_code == 200

        assert res1.json() == res2.json()

        print('running else sortBy caching test')
        res3 = await ac.get(url + '/api?search=&asc=-&sort=basePrice&type=any&limit=50')
        assert res3.status_code == 200

        res4 = await ac.get(url + '/api?search=&asc=-&sort=basePrice&type=any&limit=50')
        assert res4.status_code == 200

        assert res3.json() == res4.json()

@pytest.mark.asyncio
async def test_get_ids_caching():
    async with AsyncClient() as ac:
        url = os.environ['ALLOWED_HOSTS'].split(',')[0]

        print('running ids caching test')
        res1 = await ac.get(url + '/api?search=&asc=-&sort=fleaMarket&type=any&limit=50')
        assert res1.status_code == 200

        ids_str = '&'.join([itm['_id'] for itm in res1.json()])

        res2 = await ac.get(url + '/api/cart?ids=' + ids_str)
        assert res2.status_code == 200

        res3 = await ac.get(url + '/api/cart?ids=' + ids_str)
        assert res3.status_code == 200

        assert res2.json() == res3.json()