from pathlib import Path

import duckdb

COLUNAS_EXTRAIDAS = [
    ("fsq_place_id", "VARCHAR"),
    ("name", "VARCHAR"),
    ("latitude", "DOUBLE"),
    ("longitude", "DOUBLE"),
    ("address", "VARCHAR"),
    ("date_closed", "DATE"),
    ("fsq_category_ids", "VARCHAR[]"),
    ("fsq_category_labels", "VARCHAR[]"),
]
COLUNAS_BRUTAS = COLUNAS_EXTRAIDAS + [("country", "VARCHAR"), ("region", "VARCHAR")]
COLUNAS_CATEGORIAS = [("category_id", "VARCHAR"), ("level1_category_name", "VARCHAR")]


def _escrever(caminho: Path, colunas: list[tuple[str, str]], linhas: list[dict]) -> Path:
    con = duckdb.connect()
    definicao = ", ".join(f"{nome} {tipo}" for nome, tipo in colunas)
    con.execute(f"CREATE TABLE t ({definicao})")
    marcadores = ", ".join("?" for _ in colunas)
    con.executemany(
        f"INSERT INTO t VALUES ({marcadores})",
        [[linha.get(nome) for nome, _ in colunas] for linha in linhas],
    )
    con.execute(f"COPY t TO '{caminho.as_posix()}' (FORMAT parquet)")
    con.close()
    return caminho


def escrever_places_brutos(caminho: Path, linhas: list[dict]) -> Path:
    return _escrever(caminho, COLUNAS_BRUTAS, linhas)


def escrever_categorias(caminho: Path, linhas: list[dict]) -> Path:
    return _escrever(caminho, COLUNAS_CATEGORIAS, linhas)


def escrever_extraido(caminho: Path, linhas: list[dict]) -> Path:
    return _escrever(caminho, COLUNAS_EXTRAIDAS, linhas)
