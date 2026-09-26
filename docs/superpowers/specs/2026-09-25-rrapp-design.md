# rrapp — Documento de Design de Software (SDD)

| | |
|---|---|
| **Projeto** | rrapp (nome provisório) |
| **Data** | 2026-09-25 |
| **Status** | Em revisão |
| **Detalhamento por seção** | [`docs/design/`](../../design/) |

---

## 1. Visão geral

O **rrapp** é uma **rede social de reviews de restaurantes**, inspirada no Letterboxd. Os usuários mantêm um **diário** das visitas, dão **notas de 0 a 5 estrelas em meias estrelas**, escrevem **críticas**, montam **listas** compartilháveis, guardam restaurantes que querem conhecer e acompanham o que as pessoas que seguem estão comendo.

O centro do produto é a **experiência social e pessoal** (diário, gosto, curadoria), não o guia comercial ao estilo Yelp/TripAdvisor.

### Funcionalidades

1. **Diário**: registro de cada visita a um restaurante, com data
2. **Avaliações e críticas**: nota (0–5, meias estrelas) e texto opcional
3. **Listas da comunidade**: listas temáticas, ranqueadas ou não, públicas ou privadas
4. **Lista de desejos**: restaurantes que o usuário quer conhecer
5. **Perfil customizável**: avatar, bio, cidade, 3 restaurantes favoritos
6. **Interações sociais**: seguir, feed, curtidas, comentários
7. **Banco de dados de restaurantes**: base própria, semeada com dados abertos

## 2. Objetivos

### Objetivo atual: MVP de validação

Validar a ideia com usuários reais (amigos e conhecidos) no **Rio de Janeiro**, com custo mínimo.

### Objetivo futuro: produto

Evoluir para um produto lançado e escalável, com **app mobile** convivendo com a versão web e expansão para outras cidades e estados.

### Princípios que decorrem disso

- **Tudo o que o MVP constrói deve servir ao produto**, sem reescrita: API separada e versionada, cidade como entidade, autenticação que funciona no web e no mobile.
- **YAGNI no resto**: o que só faz sentido com escala (tabela de atividades, staging, 2FA para usuários, login social) fica para a fase de produto.

### Critérios de sucesso do MVP

- A **Fase 1** (diário pessoal) está em produção e é usável por uma pessoa sozinha.
- As **Fases 1 a 4** estão em produção, com os fluxos ponta a ponta críticos passando no CI.
- Os testadores convidados conseguem se cadastrar, encontrar restaurantes do Rio, registrar visitas e seguir uns aos outros sem ajuda.

### Não-objetivos do MVP

- App mobile nativo
- Fotos em críticas, notificações, mensagens diretas, bloqueio de usuários, tags
- Login com Google/Apple, confirmação obrigatória de e-mail, 2FA para usuários comuns
- Cidades além do Rio de Janeiro (o modelo já suporta; só não serão importadas)
- Monetização

## 3. Registro de decisões

| # | Decisão | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Web responsivo no MVP; app mobile depois, os dois coexistindo | Mobile primeiro; os dois desde o início | Validação mais rápida, sem lojas de apps |
| D2 | **Django + DRF** (backend) + **React** (frontend) | React + Supabase; Next.js full-stack | Aproveita o Python do desenvolvedor, painel Admin grátis para moderação, API separada pronta para o mobile |
| D3 | **TypeScript** no frontend | JavaScript | Tipos gerados da API (OpenAPI); padrão de mercado com React/React Native |
| D4 | Restaurantes: **base própria semeada com FSQ Open Source Places** + sugestões dos usuários | Buscar e armazenar via Google Places | Termos do Google proíbem armazenar; dados abertos permitem; custo zero |
| D5 | Lançamento focado no **Rio de Janeiro**, com `Cidade` como entidade | Tudo fixo no Rio | Expansão sem migração de dados |
| D6 | **Registro** único unindo diário e avaliação | Tabelas separadas de visita e avaliação | Modelo do Letterboxd; a nota não fica duplicada |
| D7 | Nota em **meias estrelas**, guardada como **inteiro 0–10** | Quartos; décimos | Simples de tocar no celular; sem erros de arredondamento |
| D8 | Média do restaurante usa **só a nota mais recente de cada usuário** | Média de todos os registros | Quem visita muito não pesa mais |
| D9 | **3 favoritos** no perfil | 4 (Letterboxd) | Preferência do produto |
| D10 | Feed calculado por consulta, **sem tabela de atividades** no MVP | Fan-out em tabela | Suficiente em pequena escala |
| D11 | Curtidas/comentários em **tabelas explícitas** | Relação genérica | Clareza e integridade |
| D12 | Autenticação **JWT**; token de renovação em **cookie `httpOnly`** (web) | Sessões do Django | Mesmo mecanismo no web e no mobile; protege contra XSS |
| D13 | **Excluir conta apaga tudo** | Anonimizar críticas | Mais simples e mais seguro perante a LGPD |
| D14 | **2FA obrigatório só para staff** no MVP | 2FA opcional para todos | Protege o crítico sem atrasar o MVP |
| D15 | **Monorepo** (`backend/`, `frontend/`, futuro `mobile/`) | Repositórios separados | Mudanças de API e tela no mesmo PR |
| D16 | **Domínio próprio obrigatório** (`app.` e `api.` no mesmo domínio) | Domínios padrão dos serviços | Necessário para o cookie `SameSite=Strict` |
| D17 | Visual **moderno e limpo**, temas **claro e escuro** seguindo o sistema | Diário escuro; carioca descontraído | Fácil de usar; o escuro atende quem prefere |
| D18 | Destaque **azul** com **estrelas douradas** | Coral, verde, âmbar, vinho; tudo azul | Escolha do produto; a nota se destaca de botões e links |
| D19 | Tipografia **Plus Jakarta Sans** | Inter, DM Sans, Manrope + Lora | Moderna e amigável |
| D20 | Início da Fase 1: **busca + suas últimas visitas** | Mais bem avaliados; só busca | Funciona com a API existente e não fica vazio |
| D21 | Dev com **proxy do Vite** (mesma origem); tipos via **openapi-typescript/openapi-fetch**; **Radix UI** | CORS entre portas; tipos à mão | Cookies/CSRF iguais à produção; tipos sempre em dia; acessibilidade pronta |
| D22 | Fase 2 entregue em **fatias por funcionalidade** (Desejos → Favoritos → Listas), cada uma com backend, frontend e PR próprios | Backend e depois frontend (como a Fase 1); tudo num PR | Cada fatia já é utilizável; PRs pequenos e revisáveis |
| D23 | Navegação inferior com **Início, Buscar, Listas, Perfil** | 5 itens com "+ Registrar"; manter 3 | Listas a um toque; registrar já é fácil pela página do restaurante |
| D24 | Reordenar listas **arrastando (dnd-kit), com setas ↑↓ de reserva** | Só setas; campo de posição | Natural no celular, sem excluir quem não consegue arrastar |
| D25 | **Slug da lista fixo** após a criação; restaurantes identificados por **slug** na API da Fase 2 | Slug que acompanha o título; ids | Links compartilhados não quebram; mesmo padrão do registro de visita |

## 4. Arquitetura

```
┌──────────────┐    JSON     ┌──────────────────┐        ┌────────────┐
│ React (web)  │ ◄─────────► │  Django + DRF    │ ◄────► │ PostgreSQL │
│ TS + Vite    │             │  /api/v1/        │        └────────────┘
└──────────────┘             │                  │        ┌────────────┐
┌──────────────┐    JSON     │  + Painel Admin  │ ◄────► │ R2 (avatar)│
│ App mobile   │ ◄─────────► │    (moderação)   │        └────────────┘
│ (futuro)     │             └────────┬─────────┘
└──────────────┘                      │ script de importação
                                      ▼
                          FSQ Open Source Places (dados abertos)
```

- O **frontend** cuida só da apresentação e fala com o backend exclusivamente pela API.
- O **backend** concentra regras de negócio, permissões e dados.
- A **API versionada** (`/api/v1/`) é o contrato que o app mobile futuro consumirá sem mudanças no backend.

## 5. Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python, Django, Django REST Framework, drf-spectacular, simplejwt, django-otp, Pillow |
| Banco | PostgreSQL (busca textual sem acentos) |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, React Hook Form, Zod, vite-plugin-pwa |
| Testes | pytest, pytest-django, factory_boy, Vitest, React Testing Library, MSW, Playwright |
| CI | GitHub Actions, ruff, eslint, prettier, tsc, bandit, pip-audit, npm audit, gitleaks, Dependabot |
| Infra | Cloudflare Pages, Render/Railway, Neon/Render Postgres, Cloudflare R2, Resend/Brevo, Sentry |

## 6. Modelo de dados

> Detalhes: [01-modelo-de-dados.md](../../design/01-modelo-de-dados.md)

| Entidade | Campos principais | Regras |
|---|---|---|
| **Usuário** (customizado) | username, email, senha, nome_exibicao, bio, avatar, cidade | Modelo customizado desde o início |
| **Favorito** | usuário, restaurante, posição (1–3) | Máx. 3; sem repetição |
| **Cidade** | nome, estado (UF), slug | — |
| **Restaurante** | fonte + id_externo, slug, nome, endereço, bairro, cidade, lat/lng, categorias, faixa_preço (1–4), status, sugerido_por, nota_media, total_avaliacoes | `fonte`+`id_externo` únicos; status `ativo`/`pendente`/`fechado` |
| **Registro** | usuário, restaurante, data_visita, nota (0–10, opcional), crítica (≤5.000, opcional), curtiu, revisita | Remove o restaurante dos desejos ao ser criado |
| **Desejo** | usuário, restaurante, adicionado_em | Único por par |
| **Lista** / **ItemLista** | dono, slug, título, descrição, ranqueada, pública / lista, restaurante, posição, nota_do_item | — |
| **Segue** | seguidor, seguido | Único por par; não segue a si mesmo |
| **CurtidaRegistro**, **CurtidaLista** | usuário, alvo | Única por par |
| **ComentarioRegistro**, **ComentarioLista** | usuário, alvo, texto (≤1.000) | — |
| **Denúncia** | autor, tipo e id do alvo, motivo, status | Fila de moderação no Admin |

## 7. Dados de restaurantes

> Detalhes: [02-integracao-restaurantes.md](../../design/02-integracao-restaurantes.md)

1. **Semear** o banco com os restaurantes do Rio a partir do **FSQ Open Source Places** (Apache 2.0), por um script de importação idempotente, reutilizável para novas cidades.
2. **Buscar** no próprio PostgreSQL (busca textual, sem acentos).
3. **Completar** com sugestões dos usuários (`pendente`, aprovadas no Admin) e marcações de "fechou".
4. **Futuro**: Google Places apenas para exibir fotos e horários em tempo real, sem armazenar.

**Risco principal**: a cobertura e o formato da base no Rio ainda não foram verificados. Por isso a **Fase 0** é um teste rápido antes de construir em cima.

## 8. Funcionalidades e fluxos

> Detalhes: [03-funcionalidades-e-fluxos.md](../../design/03-funcionalidades-e-fluxos.md)

- **Início**: feed de quem o usuário segue; para novos usuários, populares da semana e sugestões de quem seguir.
- **Buscar**: por nome, com filtros de bairro, categoria, preço e nota mínima, mais "Sugerir restaurante".
- **Restaurante**: dados, nota média, histograma, "amigos que foram", críticas populares e ações (registrar, desejo, lista, fechou).
- **Registrar visita**: modal rápido com data, nota, ♥, crítica e revisita.
- **Perfil**: 3 favoritos, números e abas (Diário, Críticas, Listas, Desejos, Seguidores/Seguindo).
- **Listas**: criar, reordenar, nota por item, curtir e comentar, listas populares.
- **Social**: seguir é unilateral e sem aprovação; não há perfis privados no MVP.

## 9. API

> Detalhes: [04-api.md](../../design/04-api.md)

- Prefixo **`/api/v1/`**, JSON, `snake_case`.
- Nota exposta como `0`–`5` em passos de `0.5`; valores fora do passo são rejeitados.
- Paginação por **cursor** no feed e por página nas demais listagens.
- Slugs legíveis para restaurantes e listas; `username` para usuários.
- `PUT /listas/{slug}/itens` substitui itens e ordem de uma vez.
- As respostas embutem o estado do usuário logado (`meu_ultimo_registro`, `curti`…), para cada tela carregar com uma requisição.
- Documentação OpenAPI automática em `/api/docs` (drf-spectacular).

## 10. Frontend

> Detalhes: [05-frontend.md](../../design/05-frontend.md)

- React + TypeScript + Vite; código organizado **por funcionalidade** (`features/`).
- Tipos TypeScript **gerados do esquema OpenAPI**.
- **Mobile-first**: barra de navegação inferior no celular e navegação superior com colunas no desktop.
- Componente **`EstrelasNota`**: meia estrela por toque, arraste, toque para limpar, acessível por teclado e leitor de tela.
- PWA instalável.

## 10.1 Identidade visual e frontend da Fase 1

> Detalhes: [09-frontend-fase1.md](../../design/09-frontend-fase1.md)

- Moderno e limpo; claro e escuro; azul (`#1D64D8` / `#6AA4FF`) com estrelas douradas (`#B97803` / `#F5B83D`); Plus Jakarta Sans.
- Telas da Fase 1: Início, Buscar, Restaurante, Registrar visita, Perfil (Diário/Críticas), Configurações, autenticação e recuperação de senha.
- Proxy do Vite em dev, tipos gerados do OpenAPI, token de acesso só em memória com renovação automática, Radix UI, Vitest + MSW + Playwright.

## 10.2 Fase 2: desejos, favoritos e listas

> Detalhes: [10-fase2-colecoes.md](../../design/10-fase2-colecoes.md)

- App Django `colecoes` com Desejo, Favorito, Lista e ItemLista; registrar uma visita tira o restaurante dos desejos.
- Botões ♡ Desejo e + Lista na página do restaurante; favoritos no perfil e em Configurações; abas Listas e Desejos no perfil; páginas `/listas`, `/listas/nova`, `/l/:slug` e `/l/:slug/editar`.
- Lista privada responde 404 a terceiros; limites de 100 itens por lista e 100 listas por usuário.
- Curtir e comentar listas e "Listas populares" ficam para as Fases 3 e 4.

## 11. Autenticação e erros

> Detalhes: [06-autenticacao-e-erros.md](../../design/06-autenticacao-e-erros.md)

- JWT: token de acesso de **15 min** (em memória) e token de renovação de **30 dias** (cookie `httpOnly`/`Secure` no web).
- Cadastro, login, logout, "esqueci minha senha" por e-mail e excluir conta (apaga tudo).
- Formato único de erro: `{"erro": {"codigo", "mensagem", "campos"}}`.
- Frontend: erros no campo, *toasts*, nova tentativa automática, renovação transparente de token e estados vazios pensados.
- Sentry no backend e no frontend.

## 12. Segurança

> Detalhes: [07-seguranca.md](../../design/07-seguranca.md)

- **Controle de acesso** no backend; listas privadas retornam `404` para terceiros; serializers públicos sem dados sensíveis.
- **Contas**: rotação de token com lista negra, CSRF no endpoint de renovação, Argon2, sem enumeração de contas, link de redefinição de uso único (1 h).
- **Admin**: URL secreta, **2FA obrigatório**, permissões mínimas, auditoria.
- **Injeção/XSS**: somente ORM, nada de `dangerouslySetInnerHTML` com conteúdo de usuário, CSP, HSTS e demais cabeçalhos.
- **Uploads**: validação real, regravação, remoção de EXIF/GPS, nome aleatório, armazenamento em R2.
- **Abuso**: limites de requisições, denúncias, suspensão de contas, limites de tamanho.
- **Operação**: segredos em variáveis de ambiente, `check --deploy`, gitleaks, Dependabot, pip-audit, npm audit, Bandit, banco com usuário sem privilégios de administrador, backups diários com teste de restauração, logs sem dados sensíveis.
- **LGPD**: política e termos com aceite versionado, minimização de dados, exclusão e exportação de dados, contato do encarregado.
- **Incidentes**: checklist em `docs/seguranca/incidentes.md`.

## 13. Testes e deploy

> Detalhes: [08-testes-e-deploy.md](../../design/08-testes-e-deploy.md)

- **Monorepo**; PostgreSQL local via Docker Compose; script de dados de exemplo.
- **TDD** nas regras de negócio; **matriz de permissões** (anônimo, usuário, dono, staff) para cada endpoint; ~80% de cobertura no backend.
- Frontend com Vitest, RTL e MSW; **Playwright** nos 4 fluxos críticos.
- **CI** no GitHub Actions bloqueando merge em falha de lint, tipos, testes ou segurança.
- **Deploy** automático a partir da `main`; migrações e `check --deploy` antes do tráfego; domínio próprio (`app.rrapp.com.br` e `api.rrapp.com.br`, nome provisório).
- Ambientes: local e produção (staging na fase de produto).

## 14. Fases de entrega

| Fase | Entrega | Resultado |
|---|---|---|
| **0** | Teste da base FSQ Open Source Places e importação do Rio | Base de restaurantes pronta |
| **1** | Cadastro/login, busca, página do restaurante, registrar visita com nota, perfil básico com diário | Usável sozinho, como diário |
| **2** | Desejos, listas, favoritos | Organização pessoal completa |
| **3** | Seguir, feed, curtidas, comentários | Vira rede social |
| **4** | Sugerir/fechado, denúncias, populares, histograma, exportar dados, polimento | Pronto para convidar testadores |

A infraestrutura de segurança (JWT, permissões, cabeçalhos, CI de segurança) é construída **junto com a Fase 1**, e não depois.

## 15. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Cobertura ou qualidade insuficiente da base aberta no Rio | Alto | Fase 0 valida antes de tudo; sugestões dos usuários; plano B com semeadura manual dos bairros prioritários |
| Escopo grande para o MVP | Médio | Fases independentes e utilizáveis; cada uma pode ser a última |
| Curva de aprendizado (Django, React, TypeScript ao mesmo tempo) | Médio | Stack bem documentada; TDD dá feedback rápido; fases pequenas |
| Conteúdo abusivo em rede pública | Médio | Denúncias, moderação no Admin, limites de requisições |
| Mudança de preço ou limites dos serviços gratuitos | Baixo | Serviços intercambiáveis (Postgres padrão, S3 compatível) |

## 16. Glossário

- **Registro**: uma entrada no diário (visita), com nota e crítica opcionais.
- **Desejo**: restaurante na lista de "quero ir".
- **Slug**: identificador legível na URL (ex.: `bar-do-mineiro-santa-teresa`).
- **JWT**: token assinado que identifica o usuário nas requisições.
- **OWASP Top 10**: lista de referência das falhas de segurança web mais comuns.
- **LGPD**: Lei Geral de Proteção de Dados (Lei 13.709/2018).
