import os
import pytest
import asyncio
from httpx import AsyncClient,ASGITransport
from django.core.cache import cache
from api.fastapi_views import app

url = os.environ['ALLOWED_HOSTS'].split(',')[0]

# some code looks like duplicate code but its to see better in pytest logs like these 2 lines
# assert len(res1.json()) == 30
# assert len(res2.json()) == 30

@pytest.fixture
async def cache_fixture():
    yield cache
    # ensure any pending tasks are completed
    await asyncio.sleep(0)

# BEGIN ITEM TESTS
# testing /items
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

# testing /item_ids
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

# testing /item_history
@pytest.mark.asyncio(loop_scope="session")
async def test_get_item_history():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # running caching test with hardcoded id
        res1 = await ac.get('/api/item_history?item_id=674d90b55704568fe60bc8f5')
        assert res1.status_code == 200

        res2 = await ac.get('/api/item_history?item_id=674d90b55704568fe60bc8f5')
        assert res2.status_code == 200

        assert len(res1.json()) >= 0
        assert len(res2.json()) >= 0
        assert res1.json() == res2.json()

        # pass in no item test
        res3 = await ac.get('/api/item_history')
        assert res3.status_code == 200
        assert len(res3.json()) == 0

# BEGIN TASK TESTS
# testing /tasks
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

# testing /task_ids
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

# testing /adj_list
@pytest.mark.asyncio(loop_scope="session")
async def test_get_task_get_adj_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        # running test caching
        res1 = await ac.get('/api/adj_list')
        assert res1.status_code == 200

        res2 = await ac.get('/api/adj_list')
        assert res2.status_code == 200

        assert len(res1.json()) > 0
        assert len(res2.json()) > 0
        assert res1.json() == res2.json()

# this test is to test that all kappa required tasks matches with adj_list requirements for the task collector
# since the task collector requires ALL kappa required tasks since it is the kappa task
# this test is a fairly definitive test for task dependency using the end points /tasks, /task_ids, and /adj_list
@pytest.mark.asyncio(loop_scope="session")
async def test_collector_task():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        res1 = await ac.get('/api/adj_list')
        assert res1.status_code == 200

        res2 = await ac.get('/api/tasks?search=collector&isKappa=true&limit=1')
        assert res2.status_code == 200

        res3 = await ac.get('/api/tasks?search=&isKappa=true&limit=2000')
        assert res3.status_code == 200

        collector_task_id = res2.json()[0]['_id']
        task_reqs = set([task['_id'] for task in res3.json()])

        adj_list = res1.json()
        st = [collector_task_id]
        vis = set()
        while st:
            _id = st.pop()
            if _id in vis:
                continue
            vis.add(_id)

            immediate_task_reqs = adj_list[_id]

            res = await ac.get('/api/task_ids?ids=' + _id)
            assert res.status_code == 200
            task_ids_task_reqs = set([task['reqTaskId'] for task in res.json()[0]['taskRequirements']])
            
            for task_id in immediate_task_reqs:
                if task_id[1] == 'prerequisite' and task_id[0]:
                    assert task_id[0] in task_reqs
                    st.append(task_id[0])
                    task_ids_task_reqs.remove(task_id[0])
                    #task_reqs.remove(task_id[0]) # explained below why commented

            assert len(task_ids_task_reqs) == 0
        
        # this guarantee cannot be made since technically not all kappa required tasks can be reached from adj_list
        # there are some takes that dont unlock anything or have any prereqs but are still kappa required
        # assert len(task_reqs) == 0

# this test is to test that all lightkeeper required tasks matches with 
# adj_list requirements for the task Network Provider - Part 1
# this test is a fairly definitive test for task dependency using the end points /tasks, /task_ids, and /adj_list
@pytest.mark.asyncio(loop_scope="session")
async def test_network_provider_task():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        await cache.aclear()

        res1 = await ac.get('/api/adj_list')
        assert res1.status_code == 200

        res2 = await ac.get('/api/tasks?search=network+provider+-+part+1&isLightKeeper=true&limit=1')
        assert res2.status_code == 200

        res3 = await ac.get('/api/tasks?search=&isLightKeeper=true&limit=2000')
        assert res3.status_code == 200

        network_provider_id = res2.json()[0]['_id']
        task_reqs = set([task['_id'] for task in res3.json()])

        adj_list = res1.json()
        st = [network_provider_id]
        vis = set()
        while st:
            _id = st.pop()
            if _id in vis:
                continue
            vis.add(_id)

            immediate_task_reqs = adj_list[_id]

            res = await ac.get('/api/task_ids?ids=' + _id)
            assert res.status_code == 200
            task_ids_task_reqs = set([task['reqTaskId'] for task in res.json()[0]['taskRequirements']])
            
            for task_id in immediate_task_reqs:
                if task_id[1] == 'prerequisite' and task_id[0]:
                    assert task_id[0] in task_reqs
                    st.append(task_id[0])
                    task_ids_task_reqs.remove(task_id[0])
                    #task_reqs.remove(task_id[0]) # explained below why commented

            assert len(task_ids_task_reqs) == 0
        
        # this guarantee cannot be made since technically not all lightkeeper required tasks can be reached from adj_list
        # there are some takes that dont unlock anything or have any prereqs but are still lightkeeper required
        # assert len(task_reqs) == 0

# TESTS router pastApi
@pytest.mark.asyncio(loop_scope="session")
async def test_past_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url=url) as ac:
        res1 = await ac.get('/api/get_last_items_api_call')
        assert res1.status_code == 200

        assert len(res1.json()) > 0

        res2 = await ac.get('/api/get_last_tasks_api_call')
        assert res2.status_code == 200

        assert len(res2.json()) > 0

        # since a call happens for task and items on db init there will always be at least 2
        # however its not guarenteed to be the above 2 requests unless ofc they are on the same timer
        res3 = await ac.get('/api/get_most_recent_api_calls?count=2')
        assert res3.status_code == 200

        assert len(res3.json()) == 2