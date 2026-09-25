from django.urls import path

from lugares import views

urlpatterns = [
    path("cidades", views.CidadesView.as_view(), name="cidades"),
    path("categorias", views.CategoriasView.as_view(), name="categorias"),
    path("bairros", views.BairrosView.as_view(), name="bairros"),
    path("restaurantes", views.RestaurantesView.as_view(), name="restaurantes"),
]
