import requests
import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.management.commands.upsert import upsert_tasks

# Create your views here.
def upsert_tasks_from_query():
    def run_query(query):
        headers = {"Content-Type": "application/json"}
        response = requests.post('https://api.tarkov.dev/graphql', headers=headers, json={'query': query})
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception("Query failed to run by returning code of {}. {}".format(response.status_code, query))

    # name contains char data that python cant parse to string
    new_query = """
        query {
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

    result = run_query(new_query)
    with transaction.atomic():
        upsert_tasks(result['data']['tasks'])

class Command(BaseCommand):
    help = 'use to create or refresh tasks'

    def handle(self, *args, **options):
        upsert_tasks_from_query()

