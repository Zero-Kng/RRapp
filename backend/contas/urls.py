from django.urls import path

from contas import views

urlpatterns = [
    path("auth/cadastro", views.CadastroView.as_view(), name="cadastro"),
    path("auth/login", views.LoginView.as_view(), name="login"),
    path("auth/eu", views.EuView.as_view(), name="eu"),
    path("auth/token/renovar", views.RenovarTokenView.as_view(), name="renovar-token"),
    path("auth/logout", views.LogoutView.as_view(), name="logout"),
    path("auth/senha/esqueci", views.EsqueciSenhaView.as_view(), name="esqueci-senha"),
    path("auth/senha/redefinir", views.RedefinirSenhaView.as_view(), name="redefinir-senha"),
    path("eu", views.ExcluirContaView.as_view(), name="excluir-conta"),
    path("eu/senha", views.TrocarSenhaView.as_view(), name="trocar-senha"),
    path("eu/perfil", views.EditarPerfilView.as_view(), name="editar-perfil"),
    path("usuarios/<str:username>", views.PerfilPublicoView.as_view(), name="perfil"),
    path("usuarios/<str:username>/diario", views.DiarioView.as_view(), name="diario"),
    path("usuarios/<str:username>/criticas", views.CriticasView.as_view(), name="criticas"),
]
