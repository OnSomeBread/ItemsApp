from fastapi import APIRouter
from api.models import PastApiCalls
from ..serializers import PastApiCallsSerializer

router = APIRouter(prefix='/api', tags=['pastApi'])

# should not be async as this should not be called often
# returns data from pastApiCalls not meant for user use but its here for development
@router.get("/apiCalls")
def get_past_api_calls():
    passed_calls = PastApiCalls.objects.all()
    serializer = PastApiCallsSerializer(passed_calls, many=True)
    return serializer.data
