from api.models import *
from datetime import datetime

# example item 
"""
{
    'name': 'Colt M4A1 5.56x45 assault rifle', 
    'shortName': 'M4A1', 
    'avg24hPrice': 163943, 
    'basePrice': 18397, 
    'width': 1, 
    'height': 1, 
    'changeLast48hPercent': -33.33, 
    'link': 'https://tarkov.dev/item/colt-m4a1-556x45-assault-rifle', 
    '_id': '5447a9cd4bdc2dbd208b4567'
}
"""

# upsert all of the itemsManyToManyField
def upsert_items(result):
    # only save the data that will change often
    curr_api_call = PastApiCalls.objects.create(api_name='items', time=datetime.now())

    for item in result:
        # find the flea market price and only add entry if has flea
        for entry in item['sellFor']:
            if entry['source'] != 'fleaMarket':
                continue

            SavedItemData.objects.create(past_api_call=curr_api_call, item_id=item['id'], avg24hPrice=item['avg24hPrice'], changeLast48hPercent=item['changeLast48hPercent'], fleaMarket=entry['price'])
    
    # create a types cache
    existing_types = {t.name: t for t in ItemTypes.objects.all()}

    # grab only the new types and add them to ItemTypes model
    new_types = set(t for item in result for t in item['types']) - existing_types.keys()
    ItemTypes.objects.bulk_create([ItemTypes(name=t) for t in new_types])

    # create dict to grab only the types we need as a cache
    existing_types.update({t.name: t for t in ItemTypes.objects.filter(name__in=new_types)})

    # set up the item bulk create
    # this approach is memory wasteful and can be problemsome for larger json files but its quicker
    # items = []
    # types = []
    # sellfor = []
    # for item in result:
    #     # replace item field to fit with current model
    #     item['_id'] = item.pop('id')
        
    #     # remove these fields from items model because they have their own models
    #     types.append(item.pop('types'))
    #     sellfor.append(item.pop('sellFor'))
    #     items.append(Item(_id=item['_id'], name=item['name'], shortName=item['shortName'], width=item['width'], height=item['height'], link=item['link'], avg24hPrice=item['avg24hPrice'], basePrice=item['basePrice'], changeLast48hPercent=item['changeLast48hPercent']))

    # Item.objects.bulk_create(items, update_conflicts=True, unique_fields=['_id'], update_fields=['avg24hPrice', 'basePrice', 'changeLast48hPercent'])

    # for i in range(len(items)):
    #     # set the types associated with this item
    #     items[i].types.set([existing_types[t] for t in types[i]])

    #     # upsert the seller prices
    #     # delete the old sell data and bulk create new updates
    #     SellFor.objects.filter(item=items[i]).delete()
    #     SellFor.objects.bulk_create([
    #         SellFor(item=items[i], source=entry['source'], price=entry['price']) for entry in sellfor[i]
    #     ])

    # the individual insert to db appraoch
    for item in result:
        # replace item field to fit with current model
        item['_id'] = item.pop('id')
        
        # remove these fields from items model because they have their own models
        types = item.pop('types')
        sellfor = item.pop('sellFor')

        obj, _ = Item.objects.update_or_create(_id=item['_id'], defaults=item)

        # grab from the cache all the type objects we need for this item
        obj.itemtypes.set([existing_types[t] for t in types])

        # upsert the seller prices
        # delete the old sell data and bulk create new updates
        SellFor.objects.filter(item=obj).delete()
        SellFor.objects.bulk_create([
            SellFor(item=obj, source=entry['source'], price=entry['price']) for entry in sellfor
        ])


# example tasks query
"""
{
'taskRequirements': [], 
'name': 'First in Line', 
'experience': 1200, 
'id': '657315ddab5a49b71f098853', 
'kappaRequired': True, 
'lightkeeperRequired': True, 
'minPlayerLevel': 1, 
'factionName': 'Any', 
'normalizedName': 'first-in-line', 
'wikiLink': 'https://escapefromtarkov.fandom.com/wiki/First_in_Line', 
'trader': {'name': 'Therapist'}, 
'objectives': [
    {
        'id': '65732ac3c67dcd96adffa3c7', 
        'type': 'visit', 
        'description': 'Locate the Emercom station on Ground Zero', 
        'maps': [
            {
                'id': '653e6760052c01c1c805532f', 
                'name': 'Ground Zero', 
                'description': 'The business center of Tarkov. This is where TerraGroup was headquartered. This is where it all began.', 
                'normalizedName': 'ground-zero', 
                'players': '9-10', 
                'wiki': 'https://escapefromtarkov.fandom.com/wiki/Ground_Zero'
            }, 
            {
                'id': '65b8d6f5cdde2479cb2a3125', 
                'name': 'Ground Zero 21+', 
                'description': 'The business center of Tarkov. This is where TerraGroup was headquartered. This is where it all began. The area has yet again become a hot zone since the early days of the conflict.', 
                'normalizedName': 'ground-zero-21', 
                'players': '9-12', 
                'wiki': 'https://escapefromtarkov.fandom.com/wiki/Ground_Zero'
            }
        ]
    }, 
    {
        'id': '65817bf31404f3565aef9fec', 
        'type': 'giveItem', 
        'description': 'Hand over any found in raid medicine items', 
        'maps': []
    }]
}
"""
def upsert_tasks(result):
    curr_api_call = PastApiCalls.objects.create(api_name='tasks', time=datetime.now())
    SavedTaskData.objects.create(past_api_call=curr_api_call, task_data=result)

    # create a maps cache
    existing_maps = {m._id: m for m in Map.objects.all()}

    # grab only the new maps and add them to Map model
    all_maps = {m['id']: m for task in result for obj in task['objectives'] for m in obj['maps']}
    new_maps = {}
    for map_key in all_maps.keys():
        if map_key not in existing_maps:
            all_maps[map_key]['_id'] = all_maps[map_key].pop('id')
            new_maps[map_key] = all_maps[map_key]

    Map.objects.bulk_create([Map(**m) for m in new_maps.values()])

    # create dict to grab only the maps we need as a cache
    existing_maps.update({m._id: m for m in Map.objects.filter(_id__in=new_maps.keys())})

    for task in result:
        # rename some of the keys
        task['_id'] = task.pop('id')
        task['wiki'] = task.pop('wikiLink')
        task['trader'] = task['trader']['name']

        # these are in a separate model
        taskReqs = task.pop('taskRequirements')
        taskObjs = task.pop('objectives')

        inserted_task, _ = Task.objects.update_or_create(_id=task['_id'], defaults=task)

        # grab from the cache all the type objects we need for this item
        Objective.objects.filter(task=inserted_task).delete()
        prep_bulk = []

        for taskObj in taskObjs:
            # rename fields
            taskObj['task'] = inserted_task
            taskObj['_id'] = taskObj.pop('id')
            taskObj['objType'] = taskObj.pop('type')

            # remove maps before creating objective
            obj_maps = taskObj.pop('maps')
            
            obj_insert = Objective(**taskObj)
            obj_insert.save()

            # many to many field assignments require saved objects making bulk creates kinda difficult here
            obj_insert.maps.set([existing_maps[m['id'] if 'id' in m else m['_id']] for m in obj_maps])
            
            prep_bulk.append(obj_insert)
        #Objective.objects.bulk_create(prep_bulk)

        # upsert the seller prices
        # delete the old sell data and bulk create new updates
        TaskRequirement.objects.filter(task=inserted_task).delete()
        TaskRequirement.objects.bulk_create([
            TaskRequirement(task=inserted_task, status=', '.join(entry['status']), reqTaskId=entry['task']['id']) for entry in taskReqs
        ])