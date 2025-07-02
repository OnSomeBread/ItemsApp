from rest_framework import serializers
from api.models import Item, SellFor, Types
from django.contrib.auth.models import User

class SellForSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellFor
        fields = '__all__'

class TypesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Types
        fields = '__all__'

class ItemSerializer(serializers.ModelSerializer):
    sells = SellForSerializer(many=True, read_only=True)
    types = TypesSerializer(many=True)

    class Meta:
        model = Item
        fields = '__all__'

class UserSerializers(serializers.ModelSerializer):
    class Meta:
        model = User
        # there are many other fields to play around with here like first/last name, groups, and is_staff 
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only':True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)