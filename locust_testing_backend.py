import random
import string
import json
from locust import HttpUser, task, between


with open('backend/most_recent_items.json', encoding="utf-8") as f:
    item_ids = [item['id'] for item in json.load(f)['data']['items']]

with open('backend/most_recent_tasks.json', encoding="utf-8") as f:
    task_ids = [task['id'] for task in json.load(f)['data']['tasks']]

class WebsiteUser(HttpUser):
    wait_time = between(1, 2)
    host = "http://localhost:8000"

    def on_start(self):
        self.client.headers.update({"Connection": "close"})

    @task
    def get_items(self):
        # copied from frontend constants
        itemtypes_arr = ['any','ammo','ammoBox','armor','armorPlate','backpack','barter','container','glasses','grenade','gun','headphones','helmet','injectors','keys','markedOnly','meds','noFlea','pistolGrip','provisions','rig','suppressor','mods','preset','wearable']
        sortby_arr = ['name', 'shortName', 'basePrice', 'avg24hPrice', 'changeLast48hPercent', 'fleaMarket']

        random_search = ''.join(random.choices(string.ascii_lowercase, k=random.randint(0, 2)))
        random_asc = '-' if random.randint(0, 1) == 0 else ''
        random_sortby = sortby_arr[random.randint(0, len(sortby_arr) - 1)]
        random_itemtype = itemtypes_arr[random.randint(0, len(itemtypes_arr) - 1)]
        random_limit = random.randint(0, 200)
        random_offset = random.randint(0, 200)

        # example query /api/items?search=&asc=-&sortBy=fleaMarket&type=any&limit=50&offset=0
        self.client.get(f'/api/items?search={random_search}&asc={random_asc}&sortBy={random_sortby}&type={random_itemtype}&limit={random_limit}&offset={random_offset}', timeout=10)

    @task
    def get_item_history(self):
        self.client.get('/api/item_history?item_id=' + item_ids[random.randint(0, len(item_ids) - 1)], timeout=10)

    @task
    def get_item_ids(self):
        self.client.get('/api/item_ids?ids=' + '&ids='.join(item_ids[random.randint(1, len(item_ids) - 1)] for _ in range(random.randint(0, 50))), timeout=10)

    @task
    def get_tasks(self):
        # copied from frontend constants
        objtypes_arr = ['any', 'shoot', 'plantQuestItem', 'giveItem', 'taskStatus', 'extract', 'giveQuestItem', 'findItem', 'plantItem', 'findQuestItem', 'sellItem', 'buildWeapon', 'mark', 'useItem', 'traderLevel', 'visit', 'traderStanding', 'experience', 'skill']

        random_search = ''.join(random.choices(string.ascii_lowercase, k=random.randint(0, 2)))
        random_is_kappa = 'true' if random.randint(0, 1) == 0 else 'false'
        random_is_light_keeper = 'true' if random.randint(0, 1) == 0 else 'false'
        random_lvl = random.randint(0, 99)
        random_objtype = objtypes_arr[random.randint(0, len(objtypes_arr) - 1)]
        random_limit = random.randint(0, 200)
        random_offset = random.randint(0, 200)

        random_completed_tasks_count = random.randint(0, 50)
        random_completed_tasks = ('&ids=' if random_completed_tasks_count > 0 else '')  + '&ids='.join(task_ids[random.randint(1, len(task_ids) - 1)] for _ in range(random_completed_tasks_count))

        # example query
        # /api/tasks?search=&isKappa=false&isLightKeeper=false&playerLvl=99&objType=any&limit=50&offset=0
        self.client.get(f'/api/tasks?search={random_search}&isKappa={random_is_kappa}&isLightKeeper={random_is_light_keeper}&playerLvl={random_lvl}&objType={random_objtype}&limit={random_limit}&offset={random_offset}' + random_completed_tasks, timeout=10)

    # this gets cached after the first time which doesn't really make for a good stress test
    # @task
    # def get_task_adj_list(self):
    #     self.client.get('/api/adj_list', timeout=10)

    @task
    def get_task_ids(self):
        self.client.get('/api/task_ids?ids=' + '&ids='.join(task_ids[random.randint(1, len(task_ids) - 1)] for _ in range(random.randint(0, 50))), timeout=10)
