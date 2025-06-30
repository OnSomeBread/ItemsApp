from django.shortcuts import render
import requests
import json
from .models import Item, SellFor, Types

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

def upsertData(result):
    for item in result:
        # replace item field to fit with current model
        item['_id'] = item['id']
        del item['id']

        types = item['types']
        del item['types']

        sellfor = item['sellFor']
        del item['sellFor']

        obj, created = Item.objects.update_or_create(_id=item['_id'], name=item['name'], shortName=item['shortName'], avg24hPrice=item['avg24hPrice'], basePrice=item['basePrice'], width=item['width'], height=item['height'], changeLast48hPercent=item['changeLast48hPercent'], link=item['link'], defaults=item)

        itemTypes = [Types.objects.get_or_create(name=t)[0] for t in types]
        obj.types.set(itemTypes)

        # upsert the seller prices
        for entry in sellfor:
            SellFor.objects.update_or_create(item=obj, source=entry['source'], price=entry['price'], defaults=entry)


# Create your views here.
def upsertDataFromQuery(request):
    def run_query(query):
        headers = {"Content-Type": "application/json"}
        response = requests.post('https://api.tarkov.dev/graphql', headers=headers, json={'query': query})
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception("Query failed to run by returning code of {}. {}".format(response.status_code, query))

    # name contains char data that python cant parse to string
    new_query = """
    {
        items {
            id
            name
            shortName
            types
            avg24hPrice
            basePrice
            width
            height
            changeLast48hPercent
            link
            sellFor {
                price
                source
            }
        }
    }
    """

    result = run_query(new_query)
    upsertData(result['data']['items'])

def upsertDataFromJson(request):
    fileName = 'items.json'
    with open(fileName, 'r') as f:
        result = json.load(f)
        upsertData(result['data']['items'])
