from django.db import models

# every item can have many types
class Types(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name 

class Item(models.Model):
    _id = models.CharField(max_length=24)
    name = models.CharField(max_length=100)
    shortName = models.CharField(max_length=50)
    avg24hPrice = models.IntegerField(default=0)
    basePrice = models.IntegerField(default=0)
    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    changeLast48hPercent = models.DecimalField(max_digits=5, decimal_places=2)
    link = models.CharField(max_length=200)

    types = models.ManyToManyField(Types, blank=True)

    def __str__(self):
        return self.shortName

# every item can have many sources to sell from
class SellFor(models.Model):
    price = models.IntegerField(default=0)
    source = models.CharField(max_length=50)

    def __str__(self):
        return 'price for ' + self.item.shortName
