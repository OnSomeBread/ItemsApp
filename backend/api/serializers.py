from rest_framework import serializers
from api.models import Item, SellFor, ItemTypes, PastApiCalls, SavedItemData
from django.contrib.auth.models import User

class SellForSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellFor
        fields = '__all__'

class ItemTypesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemTypes
        fields = '__all__'

class ItemSerializer(serializers.ModelSerializer):
    sells = SellForSerializer(many=True, read_only=True)
    itemtypes = ItemTypesSerializer(many=True, read_only=True)

    class Meta:
        model = Item
        fields = '__all__'

class SavedItemDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedItemData
        fields = '__all__'

class PastApiCallsSerializer(serializers.ModelSerializer):
    past_items = SavedItemDataSerializer(many=True, read_only=True)

    class Meta:
        model = PastApiCalls
        fields = '__all__'

class UserSerializers(serializers.ModelSerializer):
    class Meta:
        model = User
        # there are many other fields to play around with here like first/last name, groups, and is_staff 
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only':True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)