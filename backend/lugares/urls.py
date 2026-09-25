from django.urls import path

from lugares import views

urlpatterns = [
    path("cidades", views.CidadesView.as_view(), name="cidades"),
    path("categorias", views.CategoriasView.as_view(), name="categorias"),
    path("bairros", views.BairrosView.as_view(), name="bairros"),
    path("restaurantes", views.RestaurantesView.as_view(), name="restaurantes"),
    path("restaurantes/<slug:slug>", views.RestauranteView.as_view(), name="restaurante"),
    path(
        "restaurantes/<slug:slug>/registros",
        views.RegistrosDoRestauranteView.as_view(),
        name="registros-do-restaurante",
    ),
]
