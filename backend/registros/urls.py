from django.urls import path

from registros import views, views_fotos

urlpatterns = [
    path("registros", views.CriarRegistroView.as_view(), name="criar-registro"),
    path("registros/<int:pk>", views.RegistroView.as_view(), name="registro"),
    path(
        "registros/<int:pk>/fotos",
        views_fotos.FotosDoRegistroView.as_view(),
        name="fotos-do-registro",
    ),
    path(
        "registros/<int:pk>/fotos/<int:foto_id>",
        views_fotos.FotoDoRegistroView.as_view(),
        name="foto-do-registro",
    ),
]
