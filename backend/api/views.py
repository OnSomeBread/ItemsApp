from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.models import Item, SellFor, PastApiCalls
from django.contrib.auth.models import User
from django.db.models import Subquery, OuterRef
from django.core.cache import cache
from .serializers import ItemSerializer, UserSerializers, PastApiCallsSerializer

@api_view(['GET'])
def get_items(request):
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
    
    cache_key = search + sortBy + asc + item_type + str(limit) + str(offset)
    if cache.has_key(cache_key):
        return Response(cache.get(cache_key))

    # do a different search if asking for flea price since not all items have flea
    if item_type != 'any':
        items = Item.objects.filter(itemtypes__name=item_type)
    else:
        items = Item.objects

    # id is needed for order_by to make it consistant because it normally varys 
    # leading to duplicates given to user if using pagination
    if sortBy == 'fleaMarket': 
        flea_market_prices = SellFor.objects.filter(item=OuterRef('pk'), source='fleaMarket').order_by('-price', 'id')
        items = items.annotate(fleaPrice=Subquery(flea_market_prices.values('price')[:1]))
        items = items.filter(fleaPrice__isnull=False, name__icontains=search).order_by(asc + 'fleaPrice', '_id')
    else:
        items = items.filter(name__icontains=search).order_by(asc + sortBy, '_id')
    serializer = ItemSerializer(items[offset:offset + limit], many=True)

    # TODO when api refreshes are implemented this will need to have a timeout that will last till next refresh
    cache.set(cache_key, serializer.data, timeout=3600)
    return Response(serializer.data)

@api_view(['GET'])
def get_items_by_ids(request):
    ids = request.query_params.getlist('ids')
    items = Item.objects.filter(_id__in=ids)

    serializer = ItemSerializer(items[:30], many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_past_api_calls(request):
    passedCalls = PastApiCalls.objects.all()
    serializer = PastApiCallsSerializer(passedCalls, many=True)
    return Response(serializer.data)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializers
    permission_classes = [AllowAny]