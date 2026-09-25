"""Extrai restaurantes da base FSQ Open Source Places (Parquet) com DuckDB.

Os argumentos vêm só de quem opera o comando (nunca de usuários do app), mas mesmo
assim todo texto interpolado no SQL passa por `_texto_sql`.
"""

from collections.abc import Iterator
from pathlib import Path

import duckdb

CATEGORIA_RAIZ = "Dining and Drinking"
# (lat_min, lon_min, lat_max, lon_max) do município do Rio de Janeiro, com folga.
BBOX_RIO = (-23.09, -43.80, -22.74, -43.09)


def _texto_sql(valor: str) -> str:
    return "'" + valor.replace("'", "''") + "'"


def _caminho(valor: str | Path) -> str:
    texto = str(valor)
    return texto if "://" in texto else Path(texto).as_posix()


def extrair_restaurantes(
    places: str,
    categorias: str,
    destino: Path,
    *,
    pais: str = "BR",
    bbox: tuple[float, float, float, float] = BBOX_RIO,
    hf_token: str | None = None,
) -> int:
    lat_min, lon_min, lat_max, lon_max = (float(valor) for valor in bbox)
    con = duckdb.connect()
    try:
        if hf_token:
            con.execute(f"CREATE SECRET hf (TYPE huggingface, TOKEN {_texto_sql(hf_token)})")
        consulta = f"""
            SELECT p.fsq_place_id, p.name, p.latitude, p.longitude, p.address,
                   p.date_closed, p.fsq_category_ids, p.fsq_category_labels
            FROM read_parquet({_texto_sql(_caminho(places))}) AS p
            WHERE p.country = {_texto_sql(pais)}
              AND p.latitude BETWEEN {lat_min} AND {lat_max}
              AND p.longitude BETWEEN {lon_min} AND {lon_max}
              AND len(list_intersect(
                    p.fsq_category_ids,
                    (SELECT list(c.category_id)
                     FROM read_parquet({_texto_sql(_caminho(categorias))}) AS c
                     WHERE c.level1_category_name = {_texto_sql(CATEGORIA_RAIZ)})
                  )) > 0
        """
        destino_sql = _texto_sql(_caminho(destino))
        con.execute(f"COPY ({consulta}) TO {destino_sql} (FORMAT parquet)")
        return con.execute(f"SELECT count(*) FROM read_parquet({destino_sql})").fetchone()[0]
    finally:
        con.close()


def ler_linhas(caminho: Path) -> Iterator[dict]:
    con = duckdb.connect()
    try:
        cursor = con.execute(f"SELECT * FROM read_parquet({_texto_sql(_caminho(caminho))})")
        colunas = [descricao[0] for descricao in cursor.description]
        while lote := cursor.fetchmany(1000):
            for linha in lote:
                yield dict(zip(colunas, linha, strict=True))
    finally:
        con.close()
