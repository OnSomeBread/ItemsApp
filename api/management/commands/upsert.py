from api.models import Item, SellFor, ItemTypes, Task, Maps, Objective, PassedApiCalls
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

# upsert all of the items
def upsert_items(result):
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

    PassedApiCalls.objects.create(api_name='items', time=datetime.now(), api_data=result)


# example task
# some objectives have unique entries and are handled dynamically meaning they wont have their own subclass since there are many of them
"""
{
    'id': '657315ddab5a49b71f098853', 
    'name': 'First in Line', 
    'objectives': 
    [
        {'id': '65732ac3c67dcd96adffa3c7', 'type': 'visit', 'description': 'Locate the Emercom station on Ground Zero', 'maps': [{'normalizedName': 'ground-zero'}, {'normalizedName': 'ground-zero-21'}]}, 
        {'id': '65817bf31404f3565aef9fec', 'type': 'giveItem', 'description': 'Hand over any found in raid medicine items', 'maps': [], 'count': 3, 'foundInRaid': True, 'item': {'name': 'Augmentin antibiotic pills', 'shortName': 'Augmentin'}, 'items': [{'name': 'Augmentin antibiotic pills', 'shortName': 'Augmentin'}, {'name': 'Golden Star balm', 'shortName': 'GoldenStar'}, {'name': 'Ibuprofen painkillers', 'shortName': 'Ibuprofen'}, {'name': 'Morphine injector', 'shortName': 'Morphine'}, {'name': 'Analgin painkillers', 'shortName': 'Analgin'}, {'name': 'Vaseline balm', 'shortName': 'Vaseline'}, {'name': 'Grizzly medical kit', 'shortName': 'Grizzly'}, {'name': 'AFAK tactical individual first aid kit', 'shortName': 'AFAK'}, {'name': 'Car first aid kit', 'shortName': 'Car'}, {'name': 'IFAK individual first aid kit', 'shortName': 'IFAK'}, {'name': 'AI-2 medkit', 'shortName': 'AI-2'}, {'name': 'Salewa first aid kit', 'shortName': 'Salewa'}, {'name': 'Aseptic bandage', 'shortName': 'Bandage'}, {'name': 'Army bandage', 'shortName': 'Bandage'}, {'name': 'CMS surgical kit', 'shortName': 'CMS'}, {'name': 'Aluminum splint', 'shortName': 'Alu splint'}, {'name': 'CAT hemostatic tourniquet', 'shortName': 'CAT'}, {'name': 'Esmarch tourniquet', 'shortName': 'Esmarch'}, {'name': 'CALOK-B hemostatic applicator', 'shortName': 'CALOK-B'}, {'name': 'Immobilizing splint', 'shortName': 'Splint'}, {'name': 'Surv12 field surgical kit', 'shortName': 'Surv12'}, {'name': '3-(b-TG) stimulant injector', 'shortName': '3-(b-TG)'}, {'name': 'AHF1-M stimulant injector', 'shortName': 'AHF1-M'}, {'name': 'Adrenaline injector', 'shortName': 'Adrenaline'}, {'name': 'L1 (Norepinephrine) injector', 'shortName': 'L1'}, {'name': 'M.U.L.E. stimulant injector', 'shortName': 'M.U.L.E.'}, {'name': 'Meldonin injector', 'shortName': 'Meldonin'}, {'name': 'Obdolbos cocktail injector', 'shortName': 'Obdolbos'}, {'name': 'Obdolbos 2 cocktail injector', 'shortName': 'Dolbos 2'}, {'name': 'P22 (Product 22) stimulant injector', 'shortName': 'P22'}, {'name': 'PNB (Product 16) stimulant injector', 'shortName': 'PNB'}, {'name': 'Perfotoran (Blue Blood) stimulant injector', 'shortName': 'Perfotoran'}, {'name': 'Propital regenerative stimulant injector', 'shortName': 'Propital'}, {'name': 'SJ12 TGLabs combat stimulant injector', 'shortName': 'SJ12'}, {'name': 'SJ1 TGLabs combat stimulant injector', 'shortName': 'SJ1'}, {'name': 'SJ6 TGLabs combat stimulant injector', 'shortName': 'SJ6'}, {'name': 'SJ9 TGLabs combat stimulant injector', 'shortName': 'SJ9'}, {'name': 'Trimadol stimulant injector', 'shortName': 'Trimadol'}, {'name': 'Zagustin hemostatic drug injector', 'shortName': 'Zagustin'}, {'name': 'eTG-change regenerative stimulant injector', 'shortName': 'eTG-c'}, {'name': 'xTG-12 antidote injector', 'shortName': 'xTG-12'}, {'name': 'Portable defibrillator', 'shortName': 'Defib'}, {'name': 'LEDX Skin Transilluminator', 'shortName': 'LEDX'}, {'name': 'Aquapeps water purification tablets', 'shortName': 'Aquapeps'}, {'name': 'Medical bloodset', 'shortName': 'Bloodset'}, {'name': 'Ophthalmoscope', 'shortName': 'OScope'}, {'name': 'Bottle of hydrogen peroxide', 'shortName': 'H2O2'}, {'name': 'Bottle of saline solution', 'shortName': 'NaCl'}, {'name': 'Pile of meds', 'shortName': 'Meds'}, {'name': 'Disposable syringe', 'shortName': 'Syringe'}, {'name': 'Bottle of OLOLO Multivitamins', 'shortName': 'Vitamins'}, {'name': 'Medical tools', 'shortName': 'MedTools'}]}
    ]
}
"""

def upsert_tasks(result):
    # create a maps cache
    existing_maps = {m.normalized_name: m for m in Maps.objects.all()}

    # grab only the new maps and add them to ItemTypes model
    new_maps = set(m['normalizedName'] for line in result for obj in line['objectives'] for m in obj['maps']) - existing_maps.keys()
    Maps.objects.bulk_create([Maps(normalized_name=m) for m in new_maps])

    # create dict to grab only the maps we need as a cache
    existing_maps.update({m.normalized_name: m for m in Maps.objects.filter(normalized_name__in=new_maps)})

    for task in result:
        task['_id'] = task.pop('id')
        objectives = task.pop('objectives')

        task, _ = Task.objects.update_or_create(_id=task['_id'], defaults=task)

        for obj in objectives:
            maps = [existing_maps[m['normalizedName']] for m in obj.pop('maps')]
            desc = obj.pop('description')
            obj_type = obj.pop('type')
            obj_id = obj.pop('id')

            out_obj, _ = Objective.objects.update_or_create(_id=obj_id, objective_type=obj_type, description=desc, task=task, objective_data=objectives)
            out_obj.maps.set(maps)
    
    PassedApiCalls.objects.create(api_name='tasks', time=datetime.now(), api_data=result)