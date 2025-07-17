from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_items),
    path('cart', views.get_items_by_ids),
    path('apiCalls', views.get_past_api_calls)
]