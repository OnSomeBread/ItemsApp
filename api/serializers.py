from rest_framework import serializers
from websiteApi.models import Item, SellFor, Types

class SellForSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellFor
        fields = '__all__'

class TypesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Types
        fields = '__all__'

class ItemSerializer(serializers.ModelSerializer):
    sellfor = SellForSerializer(read_only=True)
    types = TypesSerializer(many=True)

    class Meta:
        model = Item
        fields = '__all__'