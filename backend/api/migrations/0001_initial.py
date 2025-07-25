# Generated by Django 5.2.4 on 2025-07-26 14:01

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ItemTypes',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Map',
            fields=[
                ('_id', models.CharField(db_index=True, max_length=24, primary_key=True, serialize=False)),
                ('name', models.CharField(db_index=True, max_length=100)),
                ('normalizedName', models.CharField(max_length=100)),
                ('players', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('wiki', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='PastApiCalls',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('api_name', models.CharField(max_length=50)),
                ('time', models.TimeField()),
            ],
        ),
        migrations.CreateModel(
            name='Task',
            fields=[
                ('_id', models.CharField(db_index=True, max_length=24, primary_key=True, serialize=False)),
                ('name', models.CharField(db_index=True, max_length=100)),
                ('normalizedName', models.CharField(max_length=100, null=True)),
                ('experience', models.IntegerField(default=0, null=True)),
                ('minPlayerLevel', models.IntegerField(default=0)),
                ('trader', models.CharField(max_length=100, null=True)),
                ('factionName', models.CharField(max_length=100)),
                ('kappaRequired', models.BooleanField(default=False)),
                ('lightkeeperRequired', models.BooleanField(default=False)),
                ('wiki', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='Item',
            fields=[
                ('_id', models.CharField(db_index=True, max_length=24, primary_key=True, serialize=False)),
                ('name', models.CharField(db_index=True, max_length=100)),
                ('shortName', models.CharField(max_length=50)),
                ('avg24hPrice', models.IntegerField(default=0, null=True)),
                ('basePrice', models.IntegerField(default=0)),
                ('changeLast48hPercent', models.DecimalField(decimal_places=2, max_digits=8, null=True)),
                ('width', models.IntegerField(default=0)),
                ('height', models.IntegerField(default=0)),
                ('link', models.URLField()),
                ('itemtypes', models.ManyToManyField(blank=True, to='api.itemtypes')),
            ],
        ),
        migrations.CreateModel(
            name='SavedItemData',
            fields=[
                ('item_id', models.CharField(db_index=True, max_length=24, primary_key=True, serialize=False)),
                ('avg24hPrice', models.IntegerField(default=0, null=True)),
                ('changeLast48hPercent', models.DecimalField(decimal_places=2, max_digits=8, null=True)),
                ('fleaMarket', models.IntegerField(default=0)),
                ('past_api_call', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='past_items', to='api.pastapicalls')),
            ],
        ),
        migrations.CreateModel(
            name='SellFor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.IntegerField(default=0)),
                ('source', models.CharField(max_length=50)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sells', to='api.item')),
            ],
        ),
        migrations.CreateModel(
            name='Objective',
            fields=[
                ('_id', models.CharField(db_index=True, max_length=24, primary_key=True, serialize=False)),
                ('obj_type', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('maps', models.ManyToManyField(blank=True, to='api.map')),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='objectives', to='api.task')),
            ],
        ),
        migrations.CreateModel(
            name='TaskRequirement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(max_length=100)),
                ('req_task_id', models.CharField(db_index=True, max_length=24)),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='task_requirements', to='api.task')),
            ],
        ),
    ]
