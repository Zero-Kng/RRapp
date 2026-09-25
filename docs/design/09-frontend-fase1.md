# Seção 9 — Identidade visual e frontend da Fase 1

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.
> Complementa a [Seção 5 — Frontend](05-frontend.md) com as decisões visuais e técnicas da Fase 1B.

## Identidade visual

| Decisão | Escolha |
|---|---|
| Estilo | **Moderno e limpo**: bastante espaço em branco, poucos elementos por tela, uma cor de destaque |
| Temas | **Claro e escuro**, seguindo o tema do sistema, com botão para alternar (a escolha fica salva no navegador) |
| Cor de destaque | **Azul**: `#1D64D8` (claro) / `#6AA4FF` (escuro), em botões, links e seleção |
| Estrelas | **Douradas**: `#B97803` (claro) / `#F5B83D` (escuro), separadas da cor de destaque para a nota se sobressair. O dourado do tema claro é um tom mais fechado que o da prévia (`#D98E04`), para atingir contraste 3:1 com o branco (WCAG 1.4.11) |
| Tipografia | **Plus Jakarta Sans** (Google Fonts), pesos 400, 500 e 700 |

### Paleta base

| Papel | Claro | Escuro |
|---|---|---|
| Fundo da página | `#F7F7F8` | `#111214` |
| Superfície (cartões) | `#FFFFFF` | `#1A1B1E` |
| Borda | `#E4E4E7` | `#2C2D31` |
| Texto principal | `#18181B` | `#F4F4F5` |
| Texto secundário | `#5F6068` | `#A1A1AA` |
| Destaque (azul) | `#1D64D8` | `#6AA4FF` |
| Texto sobre o destaque | `#FFFFFF` | `#06173A` |
| Estrelas | `#B97803` | `#F5B83D` |
| Erro | `#C4322F` | `#F07370` |
| Sucesso | `#15803D` | `#4ADE80` |

As cores ficam em **variáveis CSS** (`--cor-fundo`, `--cor-destaque`…). O Tailwind lê essas variáveis, e trocar o tema é só trocar os valores. Todo par de texto e fundo deve ter contraste mínimo **WCAG AA** (4,5:1 para texto normal).

## Telas da Fase 1

| Rota | Tela |
|---|---|
| `/` | **Início**: busca em destaque e "suas últimas visitas" (para quem ainda não registrou nada, um convite para começar) |
| `/buscar` | Busca com filtros (bairro, categoria, preço, nota mínima) e ordenação |
| `/r/:slug` | Página do restaurante: dados, nota média, histograma, meu último registro, críticas, botão **Registrar visita** |
| (modal) | **Registrar visita**: data, `EstrelasNota`, ♥, crítica, "já tinha ido antes" |
| `/u/:username` | Perfil com abas **Diário** e **Críticas** |
| `/configuracoes` | Editar perfil (avatar, nome, bio, cidade), trocar senha, tema, excluir conta |
| `/entrar`, `/cadastro` | Autenticação (cadastro com aceite dos termos) |
| `/esqueci-senha`, `/redefinir-senha` | Recuperação de senha (o link do e-mail aponta para `/redefinir-senha?uid=…&token=…`) |

Listas, desejos, favoritos e social ficam para as Fases 2 e 3.

## Decisões técnicas

### Comunicação com a API em desenvolvimento

O servidor do Vite faz **proxy** de `/api` e `/media` para o Django (`localhost:8000`). Para o navegador, frontend e API ficam na **mesma origem** (`localhost:5173`), e o cookie `SameSite=Strict`, o CSRF e os caminhos funcionam como em produção (onde `app.` e `api.` ficam no mesmo site).

### Tipos e cliente da API

- **`openapi-typescript`** gera `src/api/esquema.d.ts` a partir de `/api/schema`, com um script `npm run gerar-tipos`.
- **`openapi-fetch`** faz as chamadas tipadas. Um *middleware* coloca o token de acesso no cabeçalho e trata a renovação.
- Antes de gerar os tipos, a API passa a marcar como **obrigatórios na resposta** os campos que sempre vêm (hoje `nota`, `critica` etc. aparecem como opcionais) e a documentar o formato `{"erro": …}`.

### Sessão

- O token de acesso fica **só na memória** (nunca em `localStorage`).
- Ao abrir o app, ele tenta `POST /auth/token/renovar` (usando o cookie e o `X-CSRFToken`) para recuperar a sessão.
- Uma resposta `401` numa chamada autenticada faz o app renovar **uma vez** e repetir a requisição. Se a renovação falhar, ele leva para `/entrar?voltar=<rota atual>`.
- Renovações simultâneas são **agrupadas numa só**, para duas abas ou chamadas paralelas não se deslogarem mutuamente.

### Componentes

- **Radix UI** (primitivas sem estilo) para Dialog, DropdownMenu, Tabs e Toast. Elas já tratam foco, teclado e leitor de tela, e são estilizadas com Tailwind.
- **`EstrelasNota`** é componente próprio (ver [Seção 5](05-frontend.md)): meia estrela por toque, arrastar, teclado (setas), limpar tocando na nota atual, `role="slider"` com `aria-valuetext` "3,5 de 5 estrelas".

### Testes

- **Vitest + React Testing Library + MSW** para componentes e telas, com a API simulada.
- **Playwright** para os fluxos de ponta a ponta contra o backend real: cadastro, busca e registro de uma visita que aparece no diário.
- CI: novo job `frontend` com lint (ESLint + Prettier), `tsc`, Vitest e build.
