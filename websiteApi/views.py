from django.shortcuts import render
import requests
import json
from models import Item, SellFor, Types

# Create your views here.
def upsertData():
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

def upsertDataFromJson():
    fileName = 'items.json'
    with open(fileName, 'r') as f:
        result = json.load(f)

        for item in result['data']['items']:
            # replace item field to fit with current model
            item['_id'] = item['id']
            del item['id']

            types = [Types.objects.create(name=t) for t in item['types']]
            del item['types']

            for entry in item['sellFor']:
                entry['source']
                entry['price']

            del item['sellFor']

            obj, created = Item.objects.update_or_create()
            obj.types.set(types)