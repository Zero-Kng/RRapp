"""Ajustes no esquema OpenAPI do drf-spectacular, para os tipos do frontend saírem exatos."""

# Campos de resposta que de fato podem faltar (só vêm para o app mobile)
OPCIONAIS = {("Sessao", "renovacao"), ("Acesso", "renovacao")}

ESQUEMA_ERRO = {
    "type": "object",
    "required": ["erro"],
    "properties": {
        "erro": {
            "type": "object",
            "required": ["codigo", "mensagem", "campos"],
            "properties": {
                "codigo": {"type": "string"},
                "mensagem": {"type": "string"},
                "campos": {"type": "object", "additionalProperties": True},
            },
        }
    },
}

RESPOSTA_ERRO = {
    "description": "Erro",
    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erro"}}},
}


def completar_esquema(result, generator, request, public):
    """Marca como obrigatórios os campos de resposta e documenta o formato de erro.

    Os serializers do DRF sempre devolvem todos os campos de leitura (com `null` quando vazios),
    então nas respostas nenhum campo é realmente opcional. Os componentes de requisição
    (nome terminado em `Request`) ficam como o drf-spectacular gerou.
    """
    esquemas = result.setdefault("components", {}).setdefault("schemas", {})
    for nome, esquema in esquemas.items():
        propriedades = esquema.get("properties")
        if nome.endswith("Request") or not propriedades:
            continue
        esquema["required"] = sorted(
            campo for campo in propriedades if (nome, campo) not in OPCIONAIS
        )
    esquemas["Erro"] = ESQUEMA_ERRO

    for operacoes in result.get("paths", {}).values():
        for operacao in operacoes.values():
            if isinstance(operacao, dict) and "responses" in operacao:
                operacao["responses"].setdefault("default", RESPOSTA_ERRO)
    return result
