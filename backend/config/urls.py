from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerSplitView

from config.views import saude

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/saude", saude, name="saude"),
    path("api/v1/", include("contas.urls")),
    path("api/v1/", include("lugares.urls")),
    path("api/v1/", include("registros.urls")),
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs", SpectacularSwaggerSplitView.as_view(url_name="schema"), name="docs"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = "config.views.nao_encontrado"
