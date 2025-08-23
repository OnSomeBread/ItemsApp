import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.management.commands.upsert import upsert_items

# Create your views here.
def upsert_items_from_query():
    def run_query(query):
        headers = {"Content-Type": "application/json"}
        response = requests.post('https://api.tarkov.dev/graphql', headers=headers, json={'query': query}, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Query failed to run by returning code of {response.status_code}. {query}")

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
    with transaction.atomic():
        print('upsert tasks via api')
        upsert_items(result['data']['items'])

        with open('most_recent_items.json', 'w', encoding="utf-8") as f:
            f.write(result.json())

class Command(BaseCommand):
    help = 'use to create or refresh the database'

    def handle(self, *args, **options):
        upsert_items_from_query()
