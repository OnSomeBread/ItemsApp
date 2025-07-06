import requests
import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.management.commands.upsert_data import upsert_data

# Create your views here.
def upsert_data_from_query():
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
    with transaction.atomic():
        upsert_data(result['data']['items'])

def upsert_data_from_json(file_name):
    with open(file_name, 'r') as f:
        result = json.load(f)
        upsert_data(result['data']['items'])


class Command(BaseCommand):
    help = 'use to create or refresh the database'

    def handle(self, *args, **options):
        upsert_data_from_query()