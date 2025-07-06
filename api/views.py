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
    search = request.query_params.get('search')
    sortBy = request.query_params.get('sort')
    asc = request.query_params.get('asc')
    item_type = request.query_params.get('type')

    # do a different search if asking for flea price since not all items have flea
    #items = Item.objects.annotate(itemType=Subquery(Types))
    if sortBy == 'fleaMarket': 
        flea_market_prices = SellFor.objects.filter(item=OuterRef('pk'), source='fleaMarket').order_by('-price')
        items = Item.objects.annotate(fleaPrice=Subquery(flea_market_prices.values('price')[:1]))
        items = items.filter(fleaPrice__isnull=False, name__icontains=search).order_by(asc + 'fleaPrice')[:30]
    else:
        items = Item.objects.filter(name__icontains=search).order_by(asc + sortBy)[:30]
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializers
    permission_classes = [AllowAny]