from django.db import models

# every item can have many types
class Types(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name 

class Item(models.Model):
    _id = models.CharField(max_length=24, primary_key=True)
    name = models.CharField(max_length=100)
    shortName = models.CharField(max_length=50)

    avg24hPrice = models.IntegerField(default=0, null=True)
    basePrice = models.IntegerField(default=0)
    changeLast48hPercent = models.DecimalField(max_digits=8, decimal_places=2, null=True)

    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    link = models.URLField()

    types = models.ManyToManyField(Types, blank=True)

    def __str__(self):
        return self.shortName

# every item can have many sources to sell from for different prices
class SellFor(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='sells')
    price = models.IntegerField(default=0)
    source = models.CharField(max_length=50)

    def __str__(self):
        return 'price for ' + self.item.shortName
