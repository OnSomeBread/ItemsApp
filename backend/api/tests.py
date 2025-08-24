import os
import pytest
import asyncio
from httpx import AsyncClient,ASGITransport
from django.core.cache import cache
from api.fastapi_views import app

url = os.environ['ALLOWED_HOSTS'].split(',')[0]

@pytest.fixture
async def cache_fixture():
    yield cache
    # ensure any pending tasks are completed
    await asyncio.sleep(0)

# BEGIN ITEM TESTS
@pytest.mark.asyncio(loop_scope="session")
async def test_get_items():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # running fleaMarket caching test
        res1 = await ac.get('/api/items?search=&sortBy=fleaMarket&type=meds&limit=30')
        assert res1.status_code == 200

        res2 = await ac.get('/api/items?search=&sortBy=fleaMarket&type=meds&limit=30')
        assert res2.status_code == 200

        assert len(res1.json()) == 30
        assert len(res2.json()) == 30
        assert res1.json() == res2.json()

        # running else sortBy caching test
        res3 = await ac.get('/api/items?search=&sortBy=basePrice&type=keys&limit=30')
        assert res3.status_code == 200

        res4 = await ac.get('/api/items?search=&sortBy=basePrice&type=keys&limit=30')
        assert res4.status_code == 200

        assert len(res3.json()) == 30
        assert len(res4.json()) == 30
        assert res3.json() == res4.json()

        # running sortBy fleamarket with type noflea which should return no items
        res5 = await ac.get('/api/items?search=&sortBy=fleaMarket&type=noFlea&limit=2000')
        assert res5.status_code == 200

        assert len(res5.json()) == 0

@pytest.mark.asyncio(loop_scope="session")
async def test_get_item_ids():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # grab init ids for test
        res1 = await ac.get('/api/items?search=&asc=-&sort=fleaMarket&type=any&limit=50')
        assert res1.status_code == 200
        assert len(res1.json()) == 50

        # use ids to perform ids caching test
        ids_str = '&ids='.join([itm['_id'] for itm in res1.json()])

        res2 = await ac.get('/api/item_ids?ids=' + ids_str)
        assert res2.status_code == 200

        res3 = await ac.get('/api/item_ids?ids=' + ids_str)
        assert res3.status_code == 200

        assert len(res1.json()) == len(res2.json())
        assert len(res1.json()) == len(res3.json())
        assert res2.json() == res3.json()

@pytest.mark.asyncio(loop_scope="session")
async def test_get_item_history():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # running caching test with hardcoded id
        res1 = await ac.get('/api/item_history?item_id=674d90b55704568fe60bc8f5')
        assert res1.status_code == 200

        res2 = await ac.get('/api/item_history?item_id=674d90b55704568fe60bc8f5')
        assert res2.status_code == 200

        assert res1.json() == res2.json()

# BEGIN TASK TESTS
@pytest.mark.asyncio(loop_scope="session")
async def test_get_tasks():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # running fleaMarket caching test
        res1 = await ac.get('/api/tasks?search=&isKappa=false&isLightKeeper=false&playerLvl=99&objType=any&trader=any&limit=50&offset=0')
        assert res1.status_code == 200

        res2 = await ac.get('/api/tasks?search=&isKappa=false&isLightKeeper=false&playerLvl=99&objType=any&trader=any&limit=50&offset=0')
        assert res2.status_code == 200

        assert len(res1.json()) == 50
        assert len(res2.json()) == 50
        assert res1.json() == res2.json()

        # running else sortBy caching test
        res3 = await ac.get('/api/tasks?search=&isKappa=true&isLightKeeper=true&playerLvl=80&objType=findItem&trader=prapor&limit=50&offset=0')
        assert res3.status_code == 200

        res4 = await ac.get('/api/tasks?search=&isKappa=true&isLightKeeper=true&playerLvl=80&objType=findItem&trader=prapor&limit=50&offset=0')
        assert res4.status_code == 200

        assert len(res3.json()) >= 0
        assert len(res4.json()) >= 0
        assert res3.json() == res4.json()

        # running find all gunsmith tasks test currently there are 25 gunsmith tasks
        res5 = await ac.get('/api/tasks?search=gunsmith+-+part&limit=50')
        assert res5.status_code == 200

        assert len(res5.json()) == 25

@pytest.mark.asyncio(loop_scope="session")
async def test_get_task_ids():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # grab init ids for test
        res1 = await ac.get('/api/tasks?limit=50')
        assert res1.status_code == 200
        assert len(res1.json()) == 50

        # use ids to perform ids caching test
        ids_str = '&ids='.join([itm['_id'] for itm in res1.json()])

        res2 = await ac.get('/api/task_ids?ids=' + ids_str)
        assert res2.status_code == 200

        res3 = await ac.get('/api/task_ids?ids=' + ids_str)
        assert res3.status_code == 200

        assert len(res1.json()) == len(res2.json())
        assert len(res1.json()) == len(res3.json())
        assert res2.json() == res3.json()

@pytest.mark.asyncio(loop_scope="session")
async def test_get_task_get_adj_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        res1 = await ac.get('/api/adj_list')
        assert res1.status_code == 200

        res2 = await ac.get('/api/adj_list')
        assert res2.status_code == 200

        assert len(res1.json()) > 0
        assert len(res2.json()) > 0
        assert res1.json() == res2.json()
