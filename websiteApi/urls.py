from django.urls import path
from . import views

urlpatterns = [
    path('upsertData', views.upsertDataFromJson)
]