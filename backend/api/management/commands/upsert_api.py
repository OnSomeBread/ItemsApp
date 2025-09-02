from json import dump
from requests import post
import pytest
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from api.management.commands.upsert import upsert_items, upsert_tasks

def run_query(query):
    headers = {"Content-Type": "application/json"}
    response = post('https://api.tarkov.dev/graphql', headers=headers, json={'query': query}, timeout=30)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Query failed to run by returning code of {response.status_code}. {query}")

# name contains char data that python cant parse to string
ITEMS_QUERY = """
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

TASKS_QUERY = """
{
    tasks {
        taskRequirements {
            status
            task {
                id
            }
        }
        name
        experience
        id
        kappaRequired
        lightkeeperRequired
        objectives {
            id
            type
            description
            maps {
                id
                name
                description
                normalizedName
                players
                wiki
            }
        }
        minPlayerLevel
        factionName
        normalizedName
        wikiLink
        trader {
            name
        }
    }
}
"""
collection_to_query = {'items': ITEMS_QUERY, 'tasks': TASKS_QUERY}

def upsert_from_query(collection:str, file_name:str):
    print('upsert ' + collection + ' via api')

    try:
        query = collection_to_query[collection]
        result = run_query(query)
        
        if collection == 'items':
            upsert_items(result['data'][collection], True)
        elif collection == 'tasks':
            upsert_tasks(result['data'][collection], True)
        
        if pytest.main(['api/tests.py']) != 0:
            raise Exception("Pytest Failed")

        with open(file_name, 'w', encoding="utf-8") as f:
            dump(result, f)
    except Exception as e:
        print('failed to upsert fallback to file_name ' + str(e))
        call_command('upsert_file', collection, file_name)

class Command(BaseCommand):
    help = 'use to create or refresh tasks'

    def add_arguments(self, parser):
        parser.add_argument('collection', nargs=1, type=str)
        parser.add_argument('file_name', nargs=1, type=str)

    def handle(self, *args, **options):
        collection = options['collection'][0].lower()
        if collection in collection_to_query.keys():
            upsert_from_query(collection, options['file_name'][0])
