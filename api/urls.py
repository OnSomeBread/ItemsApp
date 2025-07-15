from django.urls import path
from . import views

urlpatterns = [
    path('', views.getItems),
    path('cart', views.getItemsByIds),
    path('apiCalls', views.getPastApiCalls)
]