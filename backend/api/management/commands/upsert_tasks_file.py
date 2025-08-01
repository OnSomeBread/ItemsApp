import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.management.commands.upsert import upsert_tasks

def upsert_tasks_from_json(file_name):
    with open(file_name, 'r') as f:
        result = json.load(f)
        with transaction.atomic():
            print('upsert tasks via file ' + file_name)
            upsert_tasks(result['data']['tasks'])


class Command(BaseCommand):
    help = 'use to create or refresh the database'

    def add_arguments(self, parser):
        parser.add_argument('file_name', nargs=1, type=str)

    def handle(self, *args, **options):
        upsert_tasks_from_json(options['file_name'][0])