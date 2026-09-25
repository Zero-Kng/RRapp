# Seção 8 — Testes e deploy

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.
> Nome provisório do projeto: **rrapp**.

## Estrutura do repositório (monorepo)

```
rrapp/
├── backend/           → Django + DRF
├── frontend/          → React + Vite + TypeScript
├── docs/              → design, segurança, decisões
├── docker-compose.yml → PostgreSQL local
└── .github/workflows/ → CI
```

Backend e frontend ficam **em um só repositório**: uma mudança que envolve API e tela entra em um único commit e um único PR. O app mobile futuro entra como a pasta `mobile/`.

## Ambiente local

- **PostgreSQL via Docker Compose**: `docker compose up` sobe o banco, sem instalar o Postgres manualmente.
- Django e Vite rodam **direto na máquina**, o que é mais simples de depurar durante o aprendizado.
- **Script de dados de exemplo**: cria usuários, registros e listas falsos para o app parecer "vivo" desde o primeiro dia.

## Testes

**Filosofia: TDD nas regras de negócio.** O teste é escrito antes do código. O foco não é testar tudo, e sim **o que dói se quebrar**.

### Backend (`pytest` + `pytest-django` + `factory_boy`)

- **Regras do modelo**:
  - A nota aceita apenas meias estrelas (0 a 5, passo 0,5)
  - A média usa apenas a nota mais recente de cada usuário
  - Registrar uma visita remove o restaurante dos desejos
  - Limite de 3 favoritos
  - Um usuário não pode seguir a si mesmo
- **API**: cada endpoint testado com caso de sucesso, dados inválidos e formato padrão de erro.
- **Matriz de permissões** (ver [Seção 7](07-seguranca.md)): para cada endpoint, testar **anônimo, usuário comum, dono e staff**. Garante, por exemplo, que ninguém edita a lista de outra pessoa nem vê uma lista privada.
- **Importação de restaurantes**: duplicados, campos faltando, reimportação sem duplicar.

### Frontend (`Vitest` + `React Testing Library` + `MSW`)

- **`EstrelasNota`**: toque em meia estrela, limpar nota, teclado, leitor de tela.
- **Formulários**: validação e exibição de erros vindos da API.
- O **MSW** simula a API, então os testes do frontend não dependem do backend rodando.

### Ponta a ponta (`Playwright`, apenas fluxos críticos)

1. Cadastro → login
2. Buscar restaurante → registrar visita com 3,5★ e crítica → ver no diário
3. Criar lista → adicionar restaurantes → reordenar
4. Seguir alguém → ver a atividade da pessoa no feed

### Cobertura

Meta de **~80% no backend**. Mais importante que o número: **toda regra de negócio e toda permissão tem teste**.

## CI (GitHub Actions)

A cada push ou PR, em paralelo:

| Etapa | Backend | Frontend |
|---|---|---|
| Estilo/lint | `ruff` | `eslint` + `prettier` |
| Tipos | — | `tsc` |
| Testes | `pytest` | `vitest` |
| Segurança | `bandit`, `pip-audit` | `npm audit` |
| Geral | `gitleaks`, `manage.py check --deploy` | build de produção |

O Playwright roda nos PRs para a `main`. **Se alguma etapa falhar, o merge fica bloqueado.**

## Deploy (MVP de baixo custo)

| Peça | Serviço sugerido | Custo aproximado |
|---|---|---|
| Frontend | **Cloudflare Pages** | Gratuito |
| Backend (Django) | **Render** ou **Railway** | ~US$ 5–7/mês (planos gratuitos "dormem" e deixam a primeira requisição lenta) |
| PostgreSQL | **Neon** ou Postgres do Render | Gratuito no início, com backups |
| Avatares | **Cloudflare R2** | Gratuito até 10 GB |
| E-mails | **Resend** ou **Brevo** | Gratuito (algumas centenas por dia) |
| Erros | **Sentry** | Gratuito |
| Domínio | `.com.br` no Registro.br | ~R$ 40/ano |

> Preços e limites mudam com frequência. Os valores serão confirmados antes do deploy.

### Domínio próprio é obrigatório

O cookie seguro do token de renovação (`SameSite=Strict`, ver [Seção 7](07-seguranca.md)) só funciona com frontend e API **no mesmo domínio**, por exemplo:

- `app.rrapp.com.br` (frontend)
- `api.rrapp.com.br` (backend)

Com os endereços padrão dos serviços (`xxx.pages.dev` e `yyy.onrender.com`), o login não funcionaria. O nome `rrapp` é provisório.

### Fluxo de deploy

1. Merge na `main` → CI verde → **deploy automático**
2. O backend roda as **migrações** e o `check --deploy` antes de receber tráfego
3. O frontend gera uma **URL de pré-visualização** para cada PR

### Ambientes

- **MVP**: local e produção
- **Fase de produto**: acrescenta **staging**
