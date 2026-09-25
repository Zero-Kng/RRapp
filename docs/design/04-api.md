# Seção 4 — API (endpoints)

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.

## Convenções

- **Prefixo versionado `/api/v1/`**: quando o app mobile existir, versões antigas instaladas nos celulares continuam funcionando mesmo que a API evolua para `/v2/`.
- **JSON** em todas as respostas, com campos em `snake_case`.
- **Nota na API**: número de `0` a `5` em passos de `0.5` (ex.: `3.5`). O backend converte para o inteiro de 0 a 10 guardado no banco e rejeita valores fora dos passos (ex.: `3.7`).
- **Paginação**:
  - Feed: **cursor** ("próximos 20 depois deste"), estável mesmo com conteúdo novo chegando.
  - Demais listagens: paginação por número de página.
- **Identificadores legíveis**: restaurantes e listas usam `slug` na URL (ex.: `/restaurantes/bar-do-mineiro-santa-teresa`), e os usuários usam o `username`.

## Endpoints

Todos os caminhos abaixo ficam sob `/api/v1`.

### Autenticação

```
POST   /auth/cadastro
POST   /auth/login
POST   /auth/logout
POST   /auth/token/renovar
GET    /auth/eu                                → usuário logado
```

### Cidades e restaurantes

```
GET    /cidades
GET    /restaurantes?cidade=&q=&bairro=&categoria=&preco=&nota_min=&ordem=
GET    /restaurantes/{slug}                    → detalhes + média + histograma
GET    /restaurantes/{slug}/registros          → críticas (populares | recentes)
GET    /restaurantes/{slug}/amigos             → notas de quem eu sigo
POST   /restaurantes/sugestoes                 → sugerir novo (fica pendente)
POST   /restaurantes/{slug}/reportar-fechado
GET    /categorias
GET    /bairros?cidade=
```

### Registros (diário + avaliação)

```
POST   /registros
GET    /registros/{id}
PATCH  /registros/{id}
DELETE /registros/{id}
POST   /registros/{id}/curtir
DELETE /registros/{id}/curtir
GET    /registros/{id}/comentarios
POST   /registros/{id}/comentarios
DELETE /comentarios/{id}
```

### Usuários e perfil

```
GET    /usuarios/{username}                    → perfil + favoritos + números
PATCH  /eu/perfil                              → bio, avatar, cidade…
PUT    /eu/favoritos                           → [id1, id2, id3]
GET    /usuarios/{username}/diario?ano=&mes=
GET    /usuarios/{username}/criticas
GET    /usuarios/{username}/listas
GET    /usuarios/{username}/desejos
GET    /usuarios/{username}/seguidores
GET    /usuarios/{username}/seguindo
POST   /usuarios/{username}/seguir
DELETE /usuarios/{username}/seguir
```

### Desejos

```
POST   /eu/desejos                             body: {restaurante_id}
DELETE /eu/desejos/{restaurante_id}
```

### Listas

```
POST   /listas
GET    /listas/{slug}
PATCH  /listas/{slug}
DELETE /listas/{slug}
PUT    /listas/{slug}/itens                    → substitui itens e ordem de uma vez
GET    /listas/populares
POST   /listas/{slug}/curtir
DELETE /listas/{slug}/curtir
GET    /listas/{slug}/comentarios
POST   /listas/{slug}/comentarios
```

### Feed e descoberta

```
GET    /feed?cursor=                           → atividade de quem eu sigo
GET    /populares?cidade=                      → restaurantes e críticas em alta na semana
GET    /sugestoes/usuarios                     → quem seguir
```

## Decisões de design

### `PUT /listas/{slug}/itens` substitui a lista inteira

Ao reordenar itens arrastando no celular, o app envia a ordem final de uma só vez, em vez de dezenas de pequenas atualizações. É mais simples e evita listas em estado intermediário.

### Dados do "eu" embutidos nas respostas

A resposta da página do restaurante já inclui `meu_ultimo_registro`, `na_minha_lista_de_desejos` e `curti`. A tela carrega com **uma** requisição em vez de quatro, o que importa na internet móvel.

## Documentação automática

O **drf-spectacular** gera automaticamente a documentação da API (OpenAPI/Swagger) a partir do código:

- Página `/api/docs` para testar os endpoints no navegador
- O app mobile poderá gerar código cliente a partir do esquema OpenAPI
