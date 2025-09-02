from json import load
from django.core.management.base import BaseCommand, CommandError
from api.management.commands.upsert import upsert_items, upsert_tasks

def upsert_from_json(collection:str, file_name:str):
    with open(file_name, 'r', encoding="utf-8") as f:
        result = load(f)

        print('upsert ' + collection + ' via file ' + file_name)
        if collection == 'items':
            upsert_items(result['data'][collection], False)
        elif collection == 'tasks':
            upsert_tasks(result['data'][collection], False)


class Command(BaseCommand):
    help = 'use to create or refresh the database'

    def add_arguments(self, parser):
        parser.add_argument('collection', nargs=1, type=str)
        parser.add_argument('file_name', nargs=1, type=str)

    def handle(self, *args, **options):
        collection = options['collection'][0].lower()
        collections = ['items', 'tasks']
        if collection in collections:
            upsert_from_json(collection, options['file_name'][0])
        
        else:
            pass
