from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from django.db import transaction

from lugares.models import Categoria, Cidade, Restaurante
from lugares.slugs import gerar_slug_unico

FONTE_FSQ = "fsq_os"
PREFIXO_GASTRONOMIA = "Dining and Drinking"


class LocalizaBairro(Protocol):
    def bairro_de(self, latitude: float | None, longitude: float | None) -> str: ...


@dataclass
class ResultadoImportacao:
    criados: int = 0
    atualizados: int = 0
    marcados_fechados: int = 0
    ignorados_sem_nome: int = 0
    ignorados_fora_da_cidade: int = 0
    ignorados_ja_fechados: int = 0
    ignorados_bloqueados: int = 0


def _cortar(texto: str | None, limite: int) -> str:
    return (texto or "").strip()[:limite]


def _coordenada(valor: float | None) -> Decimal | None:
    return None if valor is None else Decimal(str(round(float(valor), 6)))


def _categorias(ids: list[str] | None, rotulos: list[str] | None) -> list[Categoria]:
    categorias = []
    for fsq_id, rotulo in zip(ids or [], rotulos or [], strict=False):
        if not rotulo or not rotulo.startswith(PREFIXO_GASTRONOMIA):
            continue
        categoria = Categoria.objects.filter(fsq_id=fsq_id).first()
        if categoria is None:
            nome = _cortar(rotulo.split(" > ")[-1], 120)
            categoria = Categoria.objects.create(
                fsq_id=fsq_id,
                nome_original=nome,
                nome=nome,
                slug=gerar_slug_unico(Categoria, nome, max_length=140, reserva="categoria"),
            )
        categorias.append(categoria)
    return categorias


@transaction.atomic
def importar_restaurantes(
    linhas: Iterable[dict], cidade: Cidade, localizador: LocalizaBairro | None = None
) -> ResultadoImportacao:
    """Cria ou atualiza restaurantes a partir de linhas extraídas da base FSQ.

    Idempotente: a chave é (fonte, id_externo). Slugs nunca mudam depois de criados.
    """
    resultado = ResultadoImportacao()
    for linha in linhas:
        _importar_linha(linha, cidade, localizador, resultado)
    return resultado


def _importar_linha(
    linha: dict,
    cidade: Cidade,
    localizador: LocalizaBairro | None,
    resultado: ResultadoImportacao,
) -> None:
    nome = _cortar(linha.get("name"), 200)
    if not nome:
        resultado.ignorados_sem_nome += 1
        return

    latitude, longitude = linha.get("latitude"), linha.get("longitude")
    bairro = ""
    if localizador is not None:
        bairro = _cortar(localizador.bairro_de(latitude, longitude), 100)
        if not bairro:
            resultado.ignorados_fora_da_cidade += 1
            return

    fechado = linha.get("date_closed") is not None
    id_externo = _cortar(linha["fsq_place_id"], 64)
    restaurante = Restaurante.objects.filter(fonte=FONTE_FSQ, id_externo=id_externo).first()

    if restaurante is None:
        if fechado:
            resultado.ignorados_ja_fechados += 1
            return
        restaurante = Restaurante.objects.create(
            fonte=FONTE_FSQ,
            id_externo=id_externo,
            slug=gerar_slug_unico(Restaurante, f"{nome} {bairro}", max_length=220),
            nome=nome,
            endereco=_cortar(linha.get("address"), 255),
            bairro=bairro,
            cidade=cidade,
            latitude=_coordenada(latitude),
            longitude=_coordenada(longitude),
        )
        resultado.criados += 1
    else:
        if restaurante.bloquear_importacao:
            resultado.ignorados_bloqueados += 1
            return
        restaurante.nome = nome
        restaurante.endereco = _cortar(linha.get("address"), 255)
        restaurante.bairro = bairro
        restaurante.latitude = _coordenada(latitude)
        restaurante.longitude = _coordenada(longitude)
        if fechado and restaurante.status != Restaurante.Status.FECHADO:
            restaurante.status = Restaurante.Status.FECHADO
            resultado.marcados_fechados += 1
        restaurante.save()
        resultado.atualizados += 1

    restaurante.categorias.set(
        _categorias(linha.get("fsq_category_ids"), linha.get("fsq_category_labels"))
    )
