from django.db.models import *
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

# every item can have many types
class ItemTypes(Model):
    name = CharField(max_length=50, unique=True)

class Item(Model):
    _id = CharField(max_length=24, primary_key=True, db_index=True)
    name = CharField(max_length=100, db_index=True)
    shortName = CharField(max_length=50)

    avg24hPrice = IntegerField(default=0, null=True)
    basePrice = IntegerField(default=0)
    changeLast48hPercent = DecimalField(max_digits=8, decimal_places=2, null=True)

    width = IntegerField(default=0)
    height = IntegerField(default=0)
    link = URLField()

    itemtypes = ManyToManyField(ItemTypes, blank=True)

# every item can have many sources to sell from for different prices
class SellFor(Model):
    item = ForeignKey(Item, on_delete=CASCADE, related_name='sells')
    price = IntegerField(default=0)
    source = CharField(max_length=50)

# since api calls are small this model stores only the data that changes often for each item
class PastApiCalls(Model):
    api_name = CharField(max_length=50)
    time = TimeField()

class SavedItemData(Model):
    past_api_call = ForeignKey(PastApiCalls, on_delete=CASCADE, related_name='past_items')

    # this should match up exactly with the related Item class id
    # could instead use reference with item but not needed here
    item_id = CharField(max_length=24, db_index=True)

    avg24hPrice = IntegerField(default=0, null=True)
    changeLast48hPercent = DecimalField(max_digits=8, decimal_places=2, null=True)
    fleaMarket = IntegerField(default=0)

# saving task data does not need to happen not nearly as often as saving item data
# since its not actively changing but also all of the data needs to be saved in order to restore
class SavedTaskData(Model):
    past_api_call = ForeignKey(PastApiCalls, on_delete=CASCADE, related_name='past_tasks')
    task_data = JSONField(default=dict)

class Task(Model):
    _id = CharField(max_length=24, primary_key=True, db_index=True)
    name = CharField(max_length=100, db_index=True)
    normalizedName = CharField(max_length=100, null=True)

    # there is another chart that maps experience points to player level
    # might remove experience here as it might just always represent minPlayerLevel
    experience = IntegerField(default=0, null=True)
    minPlayerLevel = IntegerField(default=0)

    # task giver
    trader = CharField(max_length=100, null=True)
    factionName = CharField(max_length=100)
    kappaRequired = BooleanField(default=False)
    lightkeeperRequired = BooleanField(default=False)
    wiki = URLField() # technically called wikiLink

# each task can have multiple task requirements which are other Task objects but here just grab id
# since that is all that is needed to make an adjancency list (Task Graph)
class TaskRequirement(Model):
    task = ForeignKey(Task, on_delete=CASCADE, related_name='taskRequirements')
    status = CharField(max_length=100)
    reqTaskId = CharField(max_length=24, db_index=True)

class Map(Model):
    _id = CharField(max_length=24, primary_key=True, db_index=True)
    name = CharField(max_length=100, db_index=True)
    normalizedName = CharField(max_length=100)
    players = CharField(max_length=100)
    description = TextField()
    wiki = URLField()

class Objective(Model):
    task = ForeignKey(Task, on_delete=CASCADE, related_name='objectives')
    _id = CharField(max_length=24, primary_key=True, db_index=True)
    objType = CharField(max_length=100)
    description = TextField()
    maps = ManyToManyField(Map, blank=True)


class UserManager(BaseUserManager):
    def create_user(self, email, password=None):
        user = self.model(email=self.normalize_email(email))
        user.set_password(password)
        user.save(using=self._db)
        return user

# auth users model
class User(AbstractBaseUser):
    email = EmailField(unique=True)
    # is_active = BooleanField(default=True)
    # is_staff = BooleanField(default=False)
    # is_superuser = BooleanField(default=False)

    # this stores the users site interations
    preferences_tasks = JSONField(default=dict, null=True)
    preferences_items = JSONField(default=dict, null=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'