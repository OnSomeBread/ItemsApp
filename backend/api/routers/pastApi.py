from fastapi import APIRouter, Request
from api.models import PastApiCalls, SavedItemData, SavedTaskData
from ..serializers import PastApiCallsSerializer, SavedItemDataSerializer, SavedTaskDataSerializer
from asgiref.sync import sync_to_async

router = APIRouter(prefix='/api', tags=['pastApi'])

@router.get("/get_last_items_api_call")
async def get_last_items_call():
    @sync_to_async(thread_sensitive=True)
    def db_operations():
        saved_data = SavedItemData.objects.latest('past_api_call__time')
        serializer = SavedItemDataSerializer(saved_data, many=False)
        return serializer.data

    return await db_operations()

@router.get("/get_last_tasks_api_call")
async def get_last_tasks_call():
    @sync_to_async(thread_sensitive=True)
    def db_operations():
        saved_data = SavedTaskData.objects.latest('past_api_call__time')
        serializer = SavedTaskDataSerializer(saved_data, many=False)
        return serializer.data

    return await db_operations()

@router.get("/get_most_recent_api_calls")
async def get_last_items_call(request: Request):
    count:str = request.query_params.get('count', '10')
    count:int = int(count) if count.isdigit() else 10 

    @sync_to_async(thread_sensitive=True)
    def db_operations():
        # order by most recent to least recent
        passed_calls = PastApiCalls.objects.order_by('-time')
        serializer = PastApiCallsSerializer(passed_calls[:count], many=True)
        return serializer.data

    return await db_operations()
