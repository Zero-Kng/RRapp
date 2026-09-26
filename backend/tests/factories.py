import datetime

import factory

from colecoes.models import Desejo
from contas.models import Usuario
from lugares.models import Categoria, Cidade, Restaurante
from registros.models import Registro


class CidadeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cidade

    nome = factory.Sequence(lambda n: f"Cidade {n}")
    estado = "RJ"
    slug = factory.Sequence(lambda n: f"cidade-{n}")


class CategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Categoria

    fsq_id = factory.Sequence(lambda n: f"fsq-cat-{n}")
    nome = factory.Sequence(lambda n: f"Categoria {n}")
    nome_original = factory.SelfAttribute("nome")
    slug = factory.Sequence(lambda n: f"categoria-{n}")


class RestauranteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Restaurante

    nome = factory.Sequence(lambda n: f"Restaurante {n}")
    slug = factory.Sequence(lambda n: f"restaurante-{n}")
    bairro = "Botafogo"
    cidade = factory.SubFactory(CidadeFactory)


class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario

    username = factory.Sequence(lambda n: f"usuario{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    password = factory.django.Password("senha-forte-123")


class RegistroFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Registro

    usuario = factory.SubFactory(UsuarioFactory)
    restaurante = factory.SubFactory(RestauranteFactory)
    data_visita = datetime.date(2026, 9, 1)
    nota = 8


class DesejoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Desejo

    usuario = factory.SubFactory(UsuarioFactory)
    restaurante = factory.SubFactory(RestauranteFactory)
