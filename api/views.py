from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.models import Item
from django.contrib.auth.models import User
from .serializers import ItemSerializer, UserSerializers

@api_view(['GET'])
def getData(request):
    items = Item.objects.all()[:50]
    serializer = ItemSerializer(items, many=True)
    permission_classes = [AllowAny]
    return Response(serializer.data)

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializers
    permission_classes = [AllowAny]