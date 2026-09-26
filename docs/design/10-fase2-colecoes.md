# Seção 10 — Fase 2: desejos, favoritos e listas

> Parte do design do RR App. Status: **em revisão** desde 2026-09-26.
> Detalha a Fase 2 ("organização pessoal completa") a partir das Seções [1](01-modelo-de-dados.md), [3](03-funcionalidades-e-fluxos.md), [4](04-api.md), [5](05-frontend.md) e [7](07-seguranca.md). Onde divergir delas, vale esta seção.

## Objetivo

Uma pessoa, sozinha e no celular, consegue:

- guardar restaurantes que quer conhecer (**desejos**);
- escolher os **3 favoritos** que aparecem no perfil;
- criar uma **lista** ranqueada, reordenar os itens e compartilhar o link dela.

### Fora da Fase 2

- Curtir e comentar listas (Fase 3, junto com o resto da parte social)
- "Listas populares" (Fase 4, porque depende das curtidas)
- Mudanças na tela inicial

## Modelo de dados

Um app Django novo, **`colecoes`**, reúne as quatro tabelas: todas são "um usuário guardando restaurantes". A dependência tem um sentido só: `colecoes` conhece `registros`, e não o contrário.

| Tabela | Campos | Regras |
|---|---|---|
| **Desejo** | `usuario`, `restaurante`, `adicionado_em` | Único por (`usuario`, `restaurante`) |
| **Favorito** | `usuario`, `restaurante`, `posicao` | `posicao` de 1 a 3; únicos por usuário: (`usuario`, `posicao`) e (`usuario`, `restaurante`) |
| **Lista** | `dono`, `slug`, `titulo` (1–100), `descricao` (≤1.000), `ranqueada`, `publica` (padrão: sim), `criada_em`, `atualizada_em` | `slug` único no site; no máximo **100 listas por usuário** |
| **ItemLista** | `lista`, `restaurante`, `posicao`, `nota` (≤280) | Único por (`lista`, `restaurante`); no máximo **100 itens por lista** |

Regras:

- **O slug da lista é gerado do título na criação e não muda ao renomear**, para um link compartilhado nunca quebrar. Títulos repetidos ganham sufixo (`-2`, `-3`…), como os restaurantes (`gerar_slug_unico`).
- **Registrar uma visita tira o restaurante dos desejos** do autor, por sinal `post_save` do `Registro` (só na criação). Vale para a API, o Admin e qualquer caminho futuro.
- **Excluir a conta apaga tudo** (decisão D13), por cascata a partir do usuário.
- **Apagar um restaurante** no Admin (ex.: duplicado) apaga, por cascata, os desejos, favoritos e itens de lista dele. Diferente do `Registro`, que protege o restaurante para não perder histórico: estas tabelas são só referências e podem ser refeitas.
- Só entram restaurantes que o registro de visita aceita: **qualquer status exceto `pendente`**.

## API

Tudo sob `/api/v1`, com o formato de erro e a paginação (20 por página) da Fase 1. Restaurantes são identificados pelo **slug**, como no registro de visita (`restaurante_slug`), e não pelo id que a Seção 4 citava.

### Desejos

```
PUT    /eu/desejos/{slug}                        → guarda; 204 (idempotente)
DELETE /eu/desejos/{slug}                        → tira; 204 (idempotente)
GET    /usuarios/{username}/desejos?ordem=recentes|bairro
```

- `PUT`/`DELETE` no slug, no lugar do `POST {restaurante_id}` da Seção 4: o botão liga e desliga, e um clique duplo nunca dá erro.
- `ordem=bairro` ordena por bairro e, dentro dele, por nome. O padrão é `recentes` (mais novo primeiro).
- Cada item traz o restaurante resumido e `adicionado_em`.

### Favoritos

```
PUT    /eu/favoritos        body: {"restaurantes": ["slug-1", "slug-2", "slug-3"]}
```

- De 0 a 3 slugs, sem repetição; a ordem do envio vira a posição. Substitui os favoritos de uma vez e devolve a lista gravada.
- `GET /usuarios/{username}` passa a trazer `favoritos`: a lista de restaurantes resumidos, na ordem das posições.

### Listas

```
POST   /listas                                   → cria: titulo, descricao, ranqueada, publica
GET    /listas/{slug}                            → dados + dono + todos os itens (máx. 100, sem paginação)
PATCH  /listas/{slug}                            → edita os dados
DELETE /listas/{slug}                            → apaga
PUT    /listas/{slug}/itens                      → substitui itens e ordem de uma vez
POST   /listas/{slug}/itens      body: {"restaurante": "slug"}  → acrescenta 1 no fim
DELETE /listas/{slug}/itens/{restaurante_slug}   → tira 1
GET    /usuarios/{username}/listas               → listas do perfil, com total_itens
GET    /eu/listas?contem={slug}                  → todas as minhas listas, sem paginação
```

- `PUT /listas/{slug}/itens` recebe `{"itens": [{"restaurante": "slug", "nota": "…"}]}`; a ordem do envio vira a posição (1, 2, 3…). Grava numa transação: ou tudo, ou nada.
- Os endpoints de 1 item servem ao diálogo "Adicionar à lista" da página do restaurante. `POST` de um restaurante que já está na lista devolve a lista sem mudança (idempotente); `DELETE` de um que não está, também.
- `GET /eu/listas` devolve cada lista com `total_itens` e, quando recebe `contem`, com `contem: true/false`. Não precisa de paginação por causa do limite de 100 listas.
- `GET /listas/{slug}` e `GET /usuarios/{username}/listas` trazem `publica`, `ranqueada`, `total_itens`, o dono resumido e as datas.

### Página do restaurante

`GET /restaurantes/{slug}` ganha `na_minha_lista_de_desejos` (`false` para anônimos), mantendo a tela com uma requisição só.

## Permissões

| Ação | Anônimo | Outro usuário | Dono |
|---|---|---|---|
| Ver desejos, favoritos e listas públicas de um perfil | ✅ | ✅ | ✅ |
| Alterar desejos e favoritos | 401 | — (só os próprios) | ✅ |
| Criar lista | 401 | ✅ | ✅ |
| Ver lista **privada** (inclusive na listagem do perfil) | 404 | 404 | ✅ |
| Editar, apagar ou mexer nos itens de uma lista **pública** | 401 | 403 | ✅ |
| Editar, apagar ou mexer nos itens de uma lista **privada** | 404 | 404 | ✅ |

- A lista privada responde **404**, e não 403, para não revelar que existe (Seção 7).
- Usuário suspenso (`is_active=False`): desejos, favoritos e listas dele somem junto com o perfil (404), como o diário.

### Erros de validação

No formato `{"erro": {"codigo", "mensagem", "campos"}}`, com a mensagem no campo certo:

- título vazio ou com mais de 100 caracteres; descrição com mais de 1.000; nota de item com mais de 280;
- mais de 100 itens na lista; mais de 100 listas;
- restaurante repetido na lista ou nos favoritos; mais de 3 favoritos;
- restaurante inexistente ou `pendente`.

## Telas

As páginas ficam em `paginas/` e as peças da Fase 2 em `colecoes/`, como `registros/` guarda o modal de visita.

- **Navegação**: Início, Buscar, **Listas**, Perfil (embaixo no celular; "Listas" também no topo do desktop). Substitui a barra de 5 itens da Seção 5: o "+ Registrar" fica de fora, porque registrar já é fácil pela página do restaurante.
- **Restaurante**: ao lado de "Registrar visita", os botões **♡ Desejo** (liga e desliga na hora, com `aria-pressed`) e **+ Lista** (diálogo com as suas listas e uma caixa de marcar em cada uma: marcou, entrou; desmarcou, saiu; mais o atalho "Nova lista"). Sem login, os dois levam para "Entrar" e voltam depois.
- **Perfil**: os 3 favoritos em cartões abaixo do cabeçalho; abas **Diário, Críticas, Listas, Desejos**. Em Desejos, escolha entre "Mais recentes" e "Por bairro" (agrupado, com um título por bairro).
- **Configurações**: nova seção **Favoritos** com 3 espaços. Cada um tem "Escolher" (diálogo com a busca de restaurantes) e "Tirar"; a posição é a do espaço, e "Salvar" grava os três.
- **`/listas`** (exige login): suas listas, com total de itens e selo "Privada", e o botão **Nova lista**.
- **`/listas/nova`**: título, descrição, ranqueada, pública. Ao criar, vai para a edição.
- **`/l/:slug`**: título, dono (com link), descrição e itens, numerados se a lista for ranqueada, cada um com a sua nota. O dono vê **Editar** e **Compartilhar** (compartilhamento nativo do celular quando existir; senão, copia o link).
- **`/l/:slug/editar`** (só o dono): dados da lista, busca para acrescentar restaurantes e itens com **alça de arrastar** (dnd-kit: toque, mouse e teclado, com anúncios em português), **setas ↑↓**, "Tirar" e o campo de nota. Um botão **Salvar**, fixo embaixo no celular, grava dados e itens de uma vez. **Apagar lista** numa zona de perigo, com confirmação.

## Testes

- **Backend (TDD)**: regras de cada tabela, a matriz de permissões acima para cada endpoint, o sinal que tira dos desejos ao registrar (também pelo Admin), os limites e a transação do `PUT` de itens. O `openapi.yml` é regenerado e conferido pelo CI.
- **Frontend (Vitest + MSW)**: cada tela e cada estado (vazio, erro, carregando). A reordenação é testada pelo teclado e pelas setas; o jsdom não simula arrastar.
- **Ponta a ponta (Playwright)**: guardar um desejo, criar uma lista, adicionar um restaurante pela página dele, reordenar e abrir o link público. Na largura de 375 px, as páginas novas não rolam na horizontal.

## Entrega

Três fatias, nesta ordem, cada uma com backend, frontend e testes, num branch e num PR próprios:

1. **Desejos**: o app `colecoes`, a tabela Desejo, o sinal, os endpoints, o botão ♡ e a aba Desejos.
2. **Favoritos**: a tabela, `PUT /eu/favoritos`, os cartões no perfil e a seção em Configurações.
3. **Listas**: as tabelas, os endpoints, "Listas" na navegação, as quatro páginas, o diálogo "Adicionar à lista" e o arrastar.

Cada fatia tem o **próprio plano**, escrito logo antes dela. Antes de abrir o PR de cada fatia: teste de ponta a ponta passando, conferência manual no celular (375 px, claro e escuro) e revisão do branch por um revisor novo.
