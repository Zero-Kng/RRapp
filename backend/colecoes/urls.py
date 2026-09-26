from django.urls import path

from colecoes import views

urlpatterns = [
    path("eu/desejos/<slug:slug>", views.DesejoView.as_view(), name="desejo"),
    path("usuarios/<str:username>/desejos", views.DesejosView.as_view(), name="desejos"),
]
