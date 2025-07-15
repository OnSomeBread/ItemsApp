from django.db import models

# every item can have many types
class ItemTypes(models.Model):
    name = models.CharField(max_length=50, unique=True, db_index=True)

class Item(models.Model):
    _id = models.CharField(max_length=24, primary_key=True, db_index=True)
    name = models.CharField(max_length=100, db_index=True)
    shortName = models.CharField(max_length=50)

    avg24hPrice = models.IntegerField(default=0, null=True)
    basePrice = models.IntegerField(default=0)
    changeLast48hPercent = models.DecimalField(max_digits=8, decimal_places=2, null=True)

    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    link = models.URLField()

    itemtypes = models.ManyToManyField(ItemTypes, blank=True)

# every item can have many sources to sell from for different prices
class SellFor(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='sells')
    price = models.IntegerField(default=0, db_index=True)
    source = models.CharField(max_length=50, db_index=True)

# since api calls are small this model stores only the data that changes often for each item
class PastApiCalls(models.Model):
    api_name = models.CharField(max_length=50)
    time = models.TimeField()

class SavedItemData(models.Model):
    past_api_call = models.ForeignKey(PastApiCalls, on_delete=models.CASCADE, related_name='past_items')

    # this should match up exactly with the related Item class id
    # could instead use reference with item but not needed here
    item_id = models.CharField(max_length=24, primary_key=True, db_index=True)

    avg24hPrice = models.IntegerField(default=0, null=True)
    changeLast48hPercent = models.DecimalField(max_digits=8, decimal_places=2, null=True)
    fleaMarket = models.IntegerField(default=0)