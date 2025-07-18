from django.apps import AppConfig
from django.core.management import call_command
import os

class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        # to prevent the startup command from running on reload
        if os.environ.get('RUN_MAIN') != 'true':
            return

        call_command('makemigrations', 'api')
        call_command('migrate', 'api')

        # attempt to populate the db if empty
        from api.models import SavedItemData
        try:
            if SavedItemData.objects.count() == 0:
                print("populating the database...")
                call_command('upsert_items_api')
        except Exception as e:
            print(f"Error during population: {e}")
