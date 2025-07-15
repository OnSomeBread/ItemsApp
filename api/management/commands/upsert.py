from api.models import Item, SellFor, ItemTypes, PastApiCalls, SavedItemData
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