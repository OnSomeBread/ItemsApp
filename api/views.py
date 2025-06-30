from rest_framework.response import Response
from rest_framework.decorators import api_view
from websiteApi.models import Item
from .serializers import ItemSerializer

@api_view(['GET'])
def getData(request):
    items = Item.objects.all()[:20]
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)