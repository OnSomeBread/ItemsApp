from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.models import Item, SellFor, Types
from django.contrib.auth.models import User
from django.db.models import Subquery, OuterRef
from .serializers import ItemSerializer, UserSerializers

@api_view(['GET'])
def getData(request):
    # grab all of the filter and sort params
    search:str = request.query_params.get('search')
    sortBy:str = request.query_params.get('sort')
    asc:str = request.query_params.get('asc')
    item_type:str = request.query_params.get('type')

    limit = request.query_params.get('limit')
    try:
        limit = min(int(limit), 100)
    except:
        limit = 30

    offset = request.query_params.get('offset')
    try:
        offset = int(offset)
    except:
        offset = 0

    # do a different search if asking for flea price since not all items have flea
    if item_type != 'any':
        items = Item.objects.filter(types__name=item_type)
    else:
        items = Item.objects

    if sortBy == 'fleaMarket': 
        flea_market_prices = SellFor.objects.filter(item=OuterRef('pk'), source='fleaMarket').order_by('-price')
        items = items.annotate(fleaPrice=Subquery(flea_market_prices.values('price')[:1]))
        items = items.filter(fleaPrice__isnull=False, name__icontains=search).order_by(asc + 'fleaPrice')
    else:
        items = items.filter(name__icontains=search).order_by(asc + sortBy)
    serializer = ItemSerializer(items[offset:offset + limit], many=True)
    return Response(serializer.data)

@api_view(['GET'])
def getItemsByIds(request):
    ids = request.query_params.getlist('ids')
    limit = 30

    items = Item.objects.filter(_id__in=ids)

    serializer = ItemSerializer(items[:limit], many=True)
    return Response(serializer.data)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializers
    permission_classes = [AllowAny]