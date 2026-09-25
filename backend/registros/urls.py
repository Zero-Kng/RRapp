from django.urls import path

from registros import views

urlpatterns = [
    path("registros", views.CriarRegistroView.as_view(), name="criar-registro"),
    path("registros/<int:pk>", views.RegistroView.as_view(), name="registro"),
]
