import pytest
from django.contrib.auth import get_user_model


def test_saude_responde_ok(client):
    resposta = client.get("/api/v1/saude")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}


def test_saude_recusa_post(client):
    resposta = client.post("/api/v1/saude")

    assert resposta.status_code == 405


@pytest.mark.django_db
def test_usa_usuario_customizado():
    assert get_user_model()._meta.label == "contas.Usuario"


@pytest.mark.django_db
def test_email_de_usuario_e_unico():
    from django.db import IntegrityError

    Usuario = get_user_model()
    Usuario.objects.create_user("ana", "ana@example.com", "senha-forte-123")
    with pytest.raises(IntegrityError):
        Usuario.objects.create_user("ana2", "ana@example.com", "senha-forte-123")
