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

# every task has multiple objectives where each objective can be on many maps
class Task(models.Model):
    _id = models.CharField(max_length=24, primary_key=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)

class Maps(models.Model):
    normalized_name = models.CharField(max_length=50)

class Objective(models.Model):
    _id = models.CharField(max_length=24, db_index=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='objectives')
    maps = models.ManyToManyField(Maps, related_name='objectives', blank=True)
    objective_type = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    # the api has this field changing depending on objective type
    # in theory could make the 18 subclass variations
    # but this is much more dynamic
    objective_data = models.JSONField(default=dict, blank=True)