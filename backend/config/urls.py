from django.conf import settings
from django.contrib import admin
from django.urls import path

from config.views import saude

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/saude", saude, name="saude"),
]
