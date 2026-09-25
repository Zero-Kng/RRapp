from django.urls import path

from contas import views

urlpatterns = [
    path("auth/cadastro", views.CadastroView.as_view(), name="cadastro"),
    path("auth/login", views.LoginView.as_view(), name="login"),
    path("auth/eu", views.EuView.as_view(), name="eu"),
    path("auth/token/renovar", views.RenovarTokenView.as_view(), name="renovar-token"),
    path("auth/logout", views.LogoutView.as_view(), name="logout"),
]
