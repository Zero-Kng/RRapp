# Fase 1B (Frontend) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o frontend web da Fase 1 do rrapp (React + TypeScript), consumindo a API da Fase 1A: entrar/cadastrar, recuperar senha, buscar restaurantes, página do restaurante, registrar visita com estrelas, perfil com diário e críticas, configurações e tela inicial.

**Architecture:** SPA com Vite em `frontend/`. Os tipos da API são gerados do OpenAPI versionado em `backend/openapi.yml`, e as chamadas usam `openapi-fetch` com um *middleware* que injeta o token de acesso e renova a sessão num `401`. Os dados remotos ficam no TanStack Query; a sessão, num contexto React. O tema claro/escuro é feito só com variáveis CSS lidas pelo Tailwind 4. Em desenvolvimento, o Vite faz proxy de `/api` e `/media` para o Django, para tudo ficar na mesma origem.

**Tech Stack:** Node 24, Vite 8, React 19, TypeScript **5.9** (não 7: `typescript-eslint` e `openapi-typescript` ainda não aceitam), React Router 8, TanStack Query 5, Tailwind CSS 4, Radix UI (`radix-ui`), React Hook Form + Zod 4, openapi-typescript 7 + openapi-fetch, `@fontsource/plus-jakarta-sans`, Vitest 5 + React Testing Library + MSW 2, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-25-rrapp-design.md`](../specs/2026-09-25-rrapp-design.md), em especial [`05-frontend.md`](../../design/05-frontend.md) e [`09-frontend-fase1.md`](../../design/09-frontend-fase1.md).

## Global Constraints

- Paleta, fonte e telas exatamente como em `docs/design/09-frontend-fase1.md` (azul `#1D64D8`/`#6AA4FF`, estrelas `#B97803`/`#F5B83D`, Plus Jakarta Sans 400/500/700).
- Tema: `data-tema="claro"|"escuro"` em `<html>`; sem atributo = segue o sistema. Preferência em `localStorage["rrapp-tema"]`.
- Contraste mínimo WCAG AA; todo controle alcançável por teclado; `focus-visible` visível.
- Token de acesso **só em memória**. Nunca em `localStorage`/`sessionStorage`.
- Nota na interface: 0 a 5 em passos de 0,5, exibida com vírgula (`3,5`). Cidade padrão da Fase 1: `rio-de-janeiro`.
- Textos da interface em português, em sentence case, sem "por favor" nem "com sucesso".
- `frontend/src/api/esquema.d.ts` é **gerado**, versionado e nunca editado à mão; `backend/openapi.yml` idem.
- Comandos do plano em Git Bash a partir da raiz do repositório; instruções ao usuário em PowerShell.
- Commits sem `Co-Authored-By`.

## Review Focus

1. **Redirecionamento após login com `?voltar=` malicioso** (`//site.com`, `https://site.com`). Esperado: ir para `/`, nunca para outro site. Teste na Task 6.
2. **Clique duplo em "Salvar" no registro de visita.** Esperado: um único registro criado; botão desabilitado durante o envio. Teste na Task 11.
3. **Senha errada no login com uma sessão antiga ainda na memória.** Esperado: mensagem de credenciais inválidas, sem tentar renovar a sessão nem repetir o login. Teste na Task 4.
4. **Erro de validação vindo do servidor** (ex.: data no futuro, nome de usuário já em uso). Esperado: a mensagem aparece embaixo do campo certo, não um aviso genérico. Testes nas Tasks 6 e 11.
5. **Avatar grande demais ou de formato errado escolhido no arquivo.** Esperado: aviso antes de enviar (limite 2 MB, JPG/PNG/WebP), e o erro do servidor aparece no campo se o arquivo passar. Teste na Task 13.

---

## Estrutura de arquivos

```
backend/
  config/openapi.py              # hook: campos de resposta obrigatórios + esquema Erro
  openapi.yml                    # esquema versionado (fonte dos tipos do frontend)
frontend/
  index.html                     # script anti-flash do tema
  vite.config.ts  vitest.config.ts  playwright.config.ts  eslint.config.js  .prettierrc
  e2e/fluxo-principal.spec.ts
  src/
    main.tsx  App.tsx  rotas.tsx  estilos.css
    api/        esquema.d.ts (gerado)  tipos.ts  sessao.ts  cliente.ts  erros.ts
    tema/       tema.ts  SeletorTema.tsx
    sessao/     contexto.ts  SessaoProvider.tsx  RotaProtegida.tsx
    layout/     Layout.tsx
    componentes/ Botao.tsx  Campo.tsx  Aviso.tsx  Carregando.tsx  Avatar.tsx
                 NotaEstrelas.tsx  EstrelasNota.tsx  Histograma.tsx
                 CartaoRestaurante.tsx  CartaoRegistro.tsx  Paginacao.tsx  PaginaFormulario.tsx
    registros/  RegistrarVisita.tsx
    paginas/    Inicio  Buscar  Restaurante  Perfil  Configuracoes  Entrar  Cadastro
                EsqueciSenha  RedefinirSenha  Termos  NaoEncontrada   (.tsx cada)
    util/       datas.ts  titulo.ts
    testes/     setup.ts  servidor.ts  renderizar.tsx  dados.ts
```

Os testes ficam ao lado do código (`Arquivo.test.tsx`).

---

### Task 1: OpenAPI completo e versionado (backend)

**Files:**
- Create: `backend/config/openapi.py`, `backend/openapi.yml` (gerado), `backend/tests/test_openapi.py`
- Modify: `backend/config/settings.py` (`SPECTACULAR_SETTINGS`), `backend/contas/serializers.py` (campo `avatar`)

**Interfaces:**
- Produces: `config.openapi.completar_esquema(result, generator, request, public) -> dict`; componente `Erro`; `backend/openapi.yml` que a Task 4 consome.

- [ ] **Step 1: Escrever `backend/tests/test_openapi.py`**

```python
from pathlib import Path

import pytest
from django.core.management import call_command

OPCIONAIS = {("Sessao", "renovacao"), ("Acesso", "renovacao")}


@pytest.fixture
def esquema(api):
    return api.get("/api/schema", {"format": "json"}).json()


@pytest.mark.django_db
def test_campos_de_resposta_sao_obrigatorios(esquema):
    registro = esquema["components"]["schemas"]["Registro"]
    assert {"nota", "critica", "data_visita", "curtiu", "revisita", "restaurante"} <= set(
        registro["required"]
    )


@pytest.mark.django_db
def test_renovacao_continua_opcional(esquema):
    for componente, campo in OPCIONAIS:
        assert campo not in esquema["components"]["schemas"][componente].get("required", [])


@pytest.mark.django_db
def test_requisicoes_parciais_continuam_opcionais(esquema):
    assert "nota" not in esquema["components"]["schemas"]["PatchedRegistroRequest"].get(
        "required", []
    )


@pytest.mark.django_db
def test_avatar_pode_ser_nulo(esquema):
    for componente in ("Eu", "PerfilPublico", "UsuarioResumo"):
        assert esquema["components"]["schemas"][componente]["properties"]["avatar"]["nullable"]


@pytest.mark.django_db
def test_toda_operacao_documenta_o_formato_de_erro(esquema):
    erro = esquema["components"]["schemas"]["Erro"]
    assert erro["properties"]["erro"]["required"] == ["codigo", "mensagem", "campos"]
    for caminho, operacoes in esquema["paths"].items():
        for metodo, operacao in operacoes.items():
            referencia = operacao["responses"]["default"]["content"]["application/json"]
            assert referencia["schema"]["$ref"] == "#/components/schemas/Erro", (caminho, metodo)


@pytest.mark.django_db
def test_arquivo_openapi_versionado_esta_atualizado(tmp_path):
    gerado = tmp_path / "openapi.yml"
    call_command("spectacular", "--file", str(gerado))
    versionado = Path(__file__).resolve().parent.parent / "openapi.yml"

    normalizar = lambda caminho: caminho.read_text(encoding="utf-8").replace("\r\n", "\n")  # noqa: E731
    assert versionado.exists(), "Rode: python manage.py spectacular --file openapi.yml"
    assert normalizar(versionado) == normalizar(gerado), (
        "openapi.yml desatualizado. Rode: python manage.py spectacular --file openapi.yml"
    )
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && .venv/Scripts/python -m pytest tests/test_openapi.py -q`
Expected: FAIL (`required` ausente, `Erro` inexistente, `openapi.yml` inexistente)

- [ ] **Step 3: Implementar `completar_esquema` em `backend/config/openapi.py`**

Hook de pós-processamento do drf-spectacular:
1. Para todo componente em `components.schemas` cujo nome **não** termina em `Request` e que tem `properties`: `required = sorted(properties)`, exceto os pares de `OPCIONAIS` (os serializers DRF sempre devolvem todos os campos de leitura).
2. Acrescenta o componente `Erro`: objeto com `erro` obrigatório, contendo `codigo` (string), `mensagem` (string) e `campos` (objeto, `additionalProperties: true`), os três obrigatórios nessa ordem.
3. Em toda operação de `paths`, acrescenta `responses.default` com `description: "Erro"` e `application/json` → `$ref: #/components/schemas/Erro`.

Em `SPECTACULAR_SETTINGS`: `"POSTPROCESSING_HOOKS": ["drf_spectacular.hooks.postprocess_schema_enums", "config.openapi.completar_esquema"]`.

Em `EuSerializer`, `PerfilPublicoSerializer` e `UsuarioResumoSerializer`: declarar `avatar = serializers.ImageField(read_only=True, allow_null=True)`.

- [ ] **Step 4: Gerar o arquivo versionado e rodar tudo**

```bash
cd backend
.venv/Scripts/python manage.py spectacular --file openapi.yml
.venv/Scripts/python -m pytest -q
.venv/Scripts/python manage.py spectacular --validate --fail-on-warn --file ../.superpowers/schema.yml
```
Expected: todos PASS; validação sem avisos.

- [ ] **Step 5: Lint e commit**

```bash
.venv/Scripts/ruff format . && .venv/Scripts/ruff check .
cd .. && git add backend && git commit -m "feat: OpenAPI com campos obrigatórios, formato de erro e arquivo versionado"
```

---

### Task 2: Esqueleto do frontend

**Files:**
- Create (via `npm create vite@latest frontend -- --template react-ts`, depois ajustar): `frontend/*`
- Create: `frontend/vitest.config.ts`, `frontend/.prettierrc`, `frontend/.prettierignore`, `frontend/src/estilos.css`, `frontend/src/testes/setup.ts`, `frontend/src/testes/servidor.ts`, `frontend/src/App.test.tsx`
- Modify: `.gitignore` (raiz: `frontend/playwright-report/`, `frontend/test-results/`)

**Interfaces:**
- Produces: scripts npm `dev`, `build`, `lint`, `formatar`, `typecheck`, `test`, `gerar-tipos`, `tipos:verificar`; `servidor` (MSW `setupServer`) em `src/testes/servidor.ts`; classes Tailwind `bg-fundo`, `bg-superficie`, `border-borda`, `text-texto`, `text-texto-secundario`, `bg-destaque`/`text-destaque`, `text-sobre-destaque`, `text-estrela`, `text-erro`, `text-sucesso`.

- [ ] **Step 1: Criar o projeto e instalar dependências**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router @tanstack/react-query radix-ui react-hook-form zod @hookform/resolvers openapi-fetch @fontsource/plus-jakarta-sans
npm install -D typescript@~5.9.3 tailwindcss @tailwindcss/vite openapi-typescript vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw prettier
```
Apagar `src/App.css`, `src/assets/`, `public/vite.svg` e o conteúdo de demonstração do template. Manter o `eslint.config.js` do template, acrescentando aos `ignores`: `src/api/esquema.d.ts`, `playwright-report`, `test-results`.

- [ ] **Step 2: Configurar**

- `vite.config.ts`: plugins `react()` e `tailwindcss()`; `server.port = 5173`; `server.proxy`: `/api` e `/media` → `http://localhost:8000`.
- `vitest.config.ts`: `mergeConfig` com o Vite; `environment: "jsdom"`, `setupFiles: ["./src/testes/setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}"]`, `css: false`.
- `package.json` scripts: `"lint": "eslint . && prettier --check ."`, `"formatar": "prettier --write ."`, `"typecheck": "tsc -b"`, `"test": "vitest run"`, `"test:e2e": "playwright test"`, `"gerar-tipos": "openapi-typescript ../backend/openapi.yml -o src/api/esquema.d.ts"`, `"tipos:verificar": "npm run gerar-tipos && git diff --exit-code -- src/api/esquema.d.ts"`.
- `.prettierrc`: `{ "printWidth": 100 }`. `.prettierignore`: `dist`, `src/api/esquema.d.ts`, `playwright-report`, `test-results`.
- `src/estilos.css`: `@import "tailwindcss";`; variáveis `--cor-*` da paleta clara em `:root`; paleta escura em `@media (prefers-color-scheme: dark) { :root:not([data-tema="claro"]) {…} }` **e** em `:root[data-tema="escuro"] {…}`; `color-scheme` coerente; `@theme inline` mapeando `--color-fundo: var(--cor-fundo)` etc. e `--font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`; `body` com `bg-fundo text-texto font-sans antialiased`.
- `src/main.tsx`: importa `@fontsource/plus-jakarta-sans/400.css`, `/500.css`, `/700.css` e `./estilos.css`; renderiza `<App />` em `StrictMode`.
- `src/testes/setup.ts`: `@testing-library/jest-dom/vitest`; `servidor.listen({ onUnhandledRequest: "error" })` no `beforeAll`; no `afterEach`: `servidor.resetHandlers()`, `cleanup()`, `localStorage.clear()`, remover `data-tema` do `<html>`; `servidor.close()` no `afterAll`.
- `src/testes/servidor.ts`: `export const servidor = setupServer()` (sem handlers padrão por enquanto).

- [ ] **Step 3: Teste de fumaça que falha**

`src/App.test.tsx`: renderizar `<App />` e esperar `screen.getByRole("link", { name: "rrapp" })`.
Run: `npm test` → Expected: FAIL (o `App` do template não tem esse link).

- [ ] **Step 4: `App.tsx` provisório**

`export function App()` devolvendo um `<header>` com `<a href="/">rrapp</a>` (a Task 5 substitui).
Run: `npm test && npm run lint && npm run typecheck && npm run build` → Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
cd .. && git add .gitignore frontend && git commit -m "feat: esqueleto do frontend com Vite, Tailwind, Vitest e MSW"
```

---

### Task 3: Tema claro/escuro

**Files:**
- Create: `frontend/src/tema/tema.ts`, `frontend/src/tema/SeletorTema.tsx`, `frontend/src/tema/tema.test.tsx`
- Modify: `frontend/index.html` (script anti-flash; `lang="pt-BR"`; `<title>rrapp</title>`)

**Interfaces:**
- Produces: `type Tema = "sistema" | "claro" | "escuro"`; `lerTema(): Tema`; `aplicarTema(tema: Tema): void`; `<SeletorTema />` (fieldset "Tema" com 3 rádios: Seguir o sistema, Claro, Escuro).

- [ ] **Step 1: Testes que falham** (`tema.test.tsx`)

- `test("sem preferência segue o sistema")`: `lerTema()` → `"sistema"`; `<html>` sem `data-tema`.
- `test("escolher escuro grava e aplica")`: `aplicarTema("escuro")` → `document.documentElement.dataset.tema === "escuro"` e `localStorage.getItem("rrapp-tema") === "escuro"`; `lerTema()` → `"escuro"`.
- `test("voltar para o sistema remove atributo e preferência")`.
- `test("valor inválido guardado vira sistema")`: `localStorage.setItem("rrapp-tema", "roxo")` → `lerTema() === "sistema"`.
- `test("o seletor marca a opção atual e troca o tema")`: com `"claro"` salvo, o rádio "Claro" está marcado; clicar em "Escuro" aplica `data-tema="escuro"`.

Run: `npm test -- tema` → Expected: FAIL (módulo inexistente).

- [ ] **Step 2: Implementar**

`tema.ts` com acesso a `localStorage` sempre em `try/catch` (navegador sem armazenamento → comporta-se como "sistema"). `index.html`: `<script>` inline no `<head>` que lê `rrapp-tema` e, se for `claro`/`escuro`, define `data-tema` antes da pintura.

- [ ] **Step 3: Rodar os testes, lint e commit**

Run: `npm test && npm run lint && npm run typecheck`
```bash
cd .. && git add frontend && git commit -m "feat: tema claro/escuro com preferência salva"
```

---

### Task 4: Cliente da API e sessão

**Files:**
- Create: `frontend/src/api/esquema.d.ts` (gerado), `frontend/src/api/tipos.ts`, `frontend/src/api/sessao.ts`, `frontend/src/api/cliente.ts`, `frontend/src/api/erros.ts`, testes `sessao.test.ts`, `cliente.test.ts`, `erros.test.ts`

**Interfaces:**
- Consumes: `backend/openapi.yml` (Task 1)
- Produces:
  - `tipos.ts`: aliases de `components["schemas"]`: `Eu`, `RestauranteResumo`, `RestauranteDetalhe`, `Registro`, `PerfilPublico`, `Categoria`, `Cidade`, `BarraHistograma`, `MeuRegistro`; `type Pagina<T> = { count: number; next: string | null; previous: string | null; results: T[] }`
  - `sessao.ts`: `tokenDeAcesso(): string | null`, `definirAcesso(token: string | null): void`, `aoMudarAcesso(ouvinte: () => void): () => void`, `lerCookie(nome: string): string | undefined`, `renovarSessao(opcoes?: { insistir?: boolean }): Promise<boolean>`, `ESPERA_ENTRE_TENTATIVAS = 400`
  - `cliente.ts`: `api` (cliente `openapi-fetch` tipado com `paths`, `baseUrl: window.location.origin`)
  - `erros.ts`: `codigoDeErro(erro: unknown): string | undefined`, `mensagemDeErro(erro: unknown): string`, `errosDeCampo(erro: unknown): Record<string, string>`, `dados<T>(chamada: Promise<{ data?: T; error?: unknown }>): Promise<T>` (lança o corpo de erro), `aplicarErros<C extends string>(erro, definirErro: (campo: C, e: { type: string; message: string }) => void, campos: readonly C[]): string | null` (devolve a mensagem geral só se nenhum campo do formulário recebeu erro)

- [ ] **Step 1: Gerar os tipos**

Run: `cd frontend && npm run gerar-tipos` → Expected: `src/api/esquema.d.ts` criado.

- [ ] **Step 2: Testes que falham**

`sessao.test.ts` (MSW em `*/api/v1/auth/token/renovar`):
- `test("renova com o cookie CSRF e guarda o novo acesso")`: `document.cookie = "csrftoken=abc"`; handler confere `X-CSRFToken === "abc"` e devolve `{ acesso: "novo" }` → `await renovarSessao()` é `true` e `tokenDeAcesso() === "novo"`.
- `test("chamadas simultâneas fazem uma única renovação")`: duas chamadas em paralelo → handler chamado 1 vez.
- `test("sem insistir, uma falha limpa a sessão")`: handler `401` → `false`, `tokenDeAcesso() === null`, handler chamado 1 vez.
- `test("insistindo, tenta de novo porque outra aba pode ter renovado")`: 1ª resposta `401`, 2ª `200` → `renovarSessao({ insistir: true })` é `true`, handler chamado 2 vezes.

`cliente.test.ts`:
- `test("envia o token de acesso")`: `definirAcesso("t1")`; handler de `GET */api/v1/auth/eu` confere `Authorization: Bearer t1`.
- `test("num 401 renova e repete a requisição com o novo token")`: 1º `eu` → `401`; renovação → `{ acesso: "t2" }`; 2º `eu` confere `Bearer t2` e devolve o usuário → `api.GET("/api/v1/auth/eu")` retorna `data` do usuário.
- `test("se a renovação falhar, devolve o 401 e limpa a sessão")` (usa a espera real de 400 ms).
- `test("login com senha errada não tenta renovar")` (**Review Focus 3**): `definirAcesso("antigo")`; `POST */api/v1/auth/login` → `401 credenciais_invalidas`; o handler de renovar **não** é chamado; o login não recebe `Authorization`.
- `test("POST com corpo JSON pode ser repetido depois da renovação")`: `POST */api/v1/registros` responde `401` e depois `201`; o 2º recebe o mesmo corpo JSON.

`erros.test.ts`:
- `mensagemDeErro({ erro: { codigo: "x", mensagem: "Algo", campos: {} } }) === "Algo"`; `mensagemDeErro(new TypeError("fetch")) === "Sem conexão com o servidor. Verifique a internet e tente de novo."`; qualquer outra coisa → `"Algo deu errado. Tente de novo."`.
- `errosDeCampo({ erro: { …, campos: { nota: ["Inválida."], geral: ["x"] } } })` → `{ nota: "Inválida.", geral: "x" }`.
- `aplicarErros` com campos `["nota"]`: chama `definirErro("nota", { type: "server", message: "Inválida." })` e devolve `null`; com campo não listado, devolve a mensagem geral.

Run: `npm test -- api` → Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

`sessao.ts`: renovação via `fetch(\`${window.location.origin}/api/v1/auth/token/renovar\`, { method: "POST", credentials: "same-origin", headers: { "X-CSRFToken": lerCookie("csrftoken") ?? "" } })`. Uma promessa em andamento compartilhada (`??=`, zerada no `finally`). Com `insistir`, espera `ESPERA_ENTRE_TENTATIVAS` e tenta mais uma vez. Qualquer falha final chama `definirAcesso(null)`.

`cliente.ts`, *middleware* do `openapi-fetch` (usa o `id` que ele fornece):
- `onRequest`: se houver token **e** o caminho não for `/api/v1/auth/login`, `/api/v1/auth/cadastro` nem começar com `/api/v1/auth/senha/`, põe `Authorization: Bearer <token>` e guarda `request.clone()` num `Map` pelo `id`.
- `onResponse`: retira a cópia; se o status for `401` e houver cópia, `await renovarSessao({ insistir: true })`; se renovou, atualiza o `Authorization` da cópia e devolve `fetch(copia)`; senão, devolve a resposta original.
- `onError`: retira a cópia.

- [ ] **Step 4: Rodar os testes, lint e commit**

Run: `npm test && npm run lint && npm run typecheck`
```bash
cd .. && git add frontend && git commit -m "feat: cliente tipado da API com renovação automática de sessão"
```

---

### Task 5: Sessão, componentes base, layout e rotas

**Files:**
- Create: `frontend/src/sessao/contexto.ts`, `SessaoProvider.tsx`, `RotaProtegida.tsx`; `frontend/src/componentes/Botao.tsx`, `Campo.tsx`, `Aviso.tsx`, `Carregando.tsx`, `PaginaFormulario.tsx`, `Avatar.tsx`; `frontend/src/layout/Layout.tsx`; `frontend/src/rotas.tsx`; `frontend/src/paginas/NaoEncontrada.tsx`; `frontend/src/util/titulo.ts`; `frontend/src/testes/renderizar.tsx`, `dados.ts`; testes `SessaoProvider.test.tsx`, `Layout.test.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `api`, `dados`, `renovarSessao`, `definirAcesso`, `aoMudarAcesso`, `tokenDeAcesso` (Task 4)
- Produces:
  - `useSessao(): { usuario: Eu | null; carregando: boolean; entrar(login: string, senha: string): Promise<void>; cadastrar(dados: { username: string; email: string; senha: string; aceite_termos: boolean }): Promise<void>; sair(opcoes?: { chamarApi?: boolean }): Promise<void>; atualizarUsuario(usuario: Eu): void }` (em `sessao/contexto.ts`; lança erro fora do provider)
  - `<SessaoProvider inicial?: { usuario: Eu | null }>`: sem `inicial`, na montagem chama `renovarSessao()` e, se der certo, `GET /api/v1/auth/eu`; quando o acesso vira `null`, zera o usuário; `sair` chama logout (se `chamarApi`), `definirAcesso(null)` e `queryClient.clear()`
  - `<RotaProtegida>{children}</RotaProtegida>`: durante o carregamento, `<Carregando />`; sem usuário, `<Navigate to={"/entrar?voltar=" + encodeURIComponent(caminho + busca)} replace />`
  - Componentes: `Botao` (props de `<button>` + `variante?: "primaria" | "secundaria" | "perigo"`, `type` padrão `"button"`); `Campo` (props de `<input>` + `rotulo: string`, `erro?: string`, `dica?: string`; `aria-invalid` e `aria-describedby`); `classeEntrada` (string de classes para `textarea`/`select`); `Aviso` (`tipo?: "erro" | "sucesso" | "info"`; `role="alert"` para erro, `"status"` nos outros); `Carregando` (`role="status"`, "Carregando…"); `PaginaFormulario({ titulo, children })`; `Avatar({ usuario: { username: string; nome_exibicao: string; avatar: string | null }, tamanho?: number })` (imagem ou iniciais)
  - `useTitulo(titulo: string)`: `document.title = \`${titulo} · rrapp\``
  - `<Rotas />` (em `rotas.tsx`): `/`, `buscar`, `r/:slug`, `u/:username`, `configuracoes` (protegida), `entrar`, `cadastro`, `esqueci-senha`, `redefinir-senha`, `termos`, `*`, todas dentro de `<Layout />`. As páginas ainda não criadas entram como componentes provisórios mínimos em seus arquivos, substituídos pelas próximas tasks.
  - `renderizar(ui?: ReactElement, opcoes?: { rota?: string; usuario?: Eu | null })` em `testes/renderizar.tsx`: `QueryClient` novo (sem retry), `SessaoProvider inicial={{ usuario }}`, `MemoryRouter initialEntries={[rota]}`, `ui ?? <Rotas />`; devolve `{ evento: userEvent.setup(), ...render(...) }`
  - `testes/dados.ts`: fixtures tipadas `cidadeRio`, `eu`, `aprazivel` (`RestauranteResumo`), `aprazivelDetalhe`, `registro(sobrescrever?)`, `perfilAna`, `pagina(resultados, extras?)`
  - `App`: `QueryClient` (`staleTime: 30_000`; retry só para erro sem `codigo`, até 2 vezes) + `SessaoProvider` + `BrowserRouter` + `Rotas`

- [ ] **Step 1: Testes que falham**

`SessaoProvider.test.tsx`:
- `test("ao abrir, recupera a sessão pelo cookie")`: renovar → `200 { acesso: "t" }`; `eu` → fixture → um componente de sonda mostra `usuario.username`.
- `test("sem sessão, fica anônimo")`: renovar → `401` → a sonda mostra "anônimo" e `carregando` vira `false`.
- `test("sair chama o logout e esquece o usuário")`.
- `test("se a sessão expirar durante o uso, o usuário é esquecido")`: `definirAcesso(null)` depois de logado → a sonda mostra "anônimo".

`Layout.test.tsx` (via `renderizar`):
- anônimo: links "Entrar" e "Criar conta" no cabeçalho.
- logado (`usuario: eu`): links "Meu perfil" (`/u/ana`), "Configurações" e botão "Sair".
- `test("rota protegida manda para o login guardando o destino")`: anônimo em `/configuracoes` → mostra a página de entrar (heading "Entrar"); o `voltar` preserva `/configuracoes`.
- `test("rota desconhecida mostra página não encontrada")`: `/xyz` → heading "Página não encontrada".

Atualizar `App.test.tsx`: com renovar → `401`, `<App />` mostra o link "rrapp".

Run: `npm test` → Expected: FAIL.

- [ ] **Step 2: Implementar**

Layout: cabeçalho fixo no topo (`bg-superficie`, borda inferior) com o logotipo "rrapp" em `text-destaque font-bold` e a navegação principal (escondida no celular); navegação inferior fixa só no celular (`sm:hidden`) com Início, Buscar e Perfil/Entrar; `<main className="mx-auto max-w-4xl px-4 py-6">` com `<Outlet />`. Depois de sair, navegar para `/`.

- [ ] **Step 3: Rodar os testes, lint e commit**

Run: `npm test && npm run lint && npm run typecheck`
```bash
cd .. && git add frontend && git commit -m "feat: sessão, layout, rotas e componentes base do frontend"
```

---

### Task 6: Entrar, cadastro e termos

**Files:**
- Create/Modify: `frontend/src/paginas/Entrar.tsx`, `Cadastro.tsx`, `Termos.tsx`; testes `Entrar.test.tsx`, `Cadastro.test.tsx`

**Interfaces:**
- Consumes: `useSessao().entrar/cadastrar`, `aplicarErros`, `mensagemDeErro`, componentes base (Task 5)
- Produces: `destinoSeguro(voltar: string | null): string` (exportado de `Entrar.tsx`): aceita só caminhos que começam com `/` e não com `//`; senão `/`.

- [ ] **Step 1: Testes que falham**

`Entrar.test.tsx`:
- `test("entra e volta para a página de origem")`: rota `/entrar?voltar=/configuracoes`; preencher "E-mail ou usuário" e "Senha"; clicar "Entrar" → login `200` (fixture de sessão) → a página de Configurações aparece.
- `test("credenciais inválidas mostram a mensagem da API")`: login `401` → `role="alert"` com "E-mail/usuário ou senha incorretos.".
- `test("campos vazios são avisados sem chamar a API")`.
- `test.each(["//site.com", "https://site.com", "configuracoes", null])("destino inseguro %s vira a página inicial")` (**Review Focus 1**): `destinoSeguro(valor) === "/"`; e `destinoSeguro("/u/ana") === "/u/ana"`.

`Cadastro.test.tsx`:
- `test("cria a conta e entra")`: preencher "Nome de usuário", "E-mail", "Senha", marcar "Li e aceito os termos de uso e a política de privacidade", clicar "Criar conta" → `POST */auth/cadastro` recebe o corpo completo (`aceite_termos: true`) → vai para `/`.
- `test("sem aceitar os termos não envia")`: mensagem "Aceite os termos para continuar.".
- `test("erro do servidor aparece no campo certo")` (**Review Focus 4**): cadastro `400` com `campos: { username: ["Este nome de usuário já está em uso."] }` → a mensagem aparece associada ao campo "Nome de usuário" (`toHaveAccessibleDescription`).

Run: `npm test -- Entrar Cadastro` → Expected: FAIL.

- [ ] **Step 2: Implementar**

Formulários com React Hook Form + `zodResolver`, com validação local em português:
- **Entrar:** `login` obrigatório ("Informe seu e-mail ou usuário."), `senha` obrigatória ("Informe sua senha.").
- **Cadastro:**
  - `username`: `/^[A-Za-z0-9_.]{3,30}$/`, com a mensagem "Use de 3 a 30 caracteres: letras sem acento, números, _ ou .".
  - `email`: formato de e-mail ("E-mail inválido.").
  - `senha`: no mínimo 8 caracteres ("A senha precisa ter pelo menos 8 caracteres.").
  - `aceite_termos`: `z.literal(true)` ("Aceite os termos para continuar.").
- **Links:** "Esqueci minha senha", "Criar conta" e "Já tenho conta".
- **Termos:** página estática "Termos de uso e privacidade". Resume os dados coletados (username, e-mail, senha protegida, perfil, registros), para que servem, a exclusão da conta pelo próprio usuário e o contato de privacidade. Leva o aviso "Versão 2026-09-25, a ser revisada antes do lançamento público.".

- [ ] **Step 3: Rodar os testes, lint e commit**

```bash
cd .. && git add frontend && git commit -m "feat: telas de entrar, cadastro e termos"
```

---

### Task 7: Esqueci e redefinir senha

**Files:**
- Create/Modify: `frontend/src/paginas/EsqueciSenha.tsx`, `RedefinirSenha.tsx`; testes correspondentes

**Interfaces:**
- Consumes: `api`, `dados`, `aplicarErros`, `codigoDeErro` (Task 4); componentes base

- [ ] **Step 1: Testes que falham**

- `test("pedido de redefinição mostra a mensagem da API e esconde o formulário")`: `POST */auth/senha/esqueci` → `202 { mensagem }` → `role="status"` com a mensagem.
- `test("redefinir com link válido confirma e oferece entrar")`: rota `/redefinir-senha?uid=MQ&token=abc`; preencher "Nova senha" e "Confirmar nova senha" iguais → o corpo enviado tem `uid`, `token` e `nova_senha` → aparecem a mensagem "Senha redefinida." e o link "Entrar".
- `test("senhas diferentes não são enviadas")`: "As senhas não conferem.".
- `test("link inválido explica e oferece pedir outro")`: `400 link_invalido` → a mensagem da API e o link "Pedir novo link" (`/esqueci-senha`).
- `test("link sem uid ou token")`: `/redefinir-senha` → aviso "Este link está incompleto." e o link "Pedir novo link".

- [ ] **Step 2: Implementar e verificar**

Run: `npm test && npm run lint && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend && git commit -m "feat: recuperação de senha no frontend"
```

---

### Task 8: Estrelas (exibição e entrada)

**Files:**
- Create: `frontend/src/componentes/NotaEstrelas.tsx`, `EstrelasNota.tsx`, testes correspondentes

**Interfaces:**
- Produces:
  - `formatarNota(nota: number): string` → `3.5` vira `"3,5"` e `4` vira `"4"` (`toLocaleString("pt-BR", { maximumFractionDigits: 1 })`)
  - `preenchimentos(valor: number): (0 | 0.5 | 1)[]` (5 itens)
  - `<Estrela preenchimento={0|0.5|1} tamanho={n} />` (SVG; metade preenchida com recorte; cor `text-estrela`; vazia com `text-texto-secundario/40`)
  - `<NotaEstrelas valor={number} tamanho?={16} />`: `role="img"`, `aria-label="3,5 de 5 estrelas"`
  - `<EstrelasNota valor={number | null} aoMudar={(v: number | null) => void} rotulo?="Nota" tamanho?={32} />`: `role="slider"`, `tabIndex=0`, `aria-valuemin=0`, `aria-valuemax=5`, `aria-valuenow`, `aria-valuetext` ("Sem nota" ou "3,5 de 5 estrelas"), `touch-none`, sem espaço entre as estrelas

- [ ] **Step 1: Testes que falham**

`NotaEstrelas.test.tsx`: `preenchimentos(3.5)` → `[1, 1, 1, 0.5, 0]`; `formatarNota(3.5) === "3,5"`; `formatarNota(4) === "4"`; rótulo acessível "3,5 de 5 estrelas".

`EstrelasNota.test.tsx` (componente controlado com `useState`; `getBoundingClientRect` simulado com `left: 0, width: 100`):
- `test("clicar na metade esquerda da 2ª estrela dá 1,5")`: `fireEvent.click(slider, { clientX: 25 })` → `aria-valuetext` "1,5 de 5 estrelas".
- `test("clicar na metade direita da 4ª estrela dá 4")`: `clientX: 75` → "4 de 5 estrelas".
- `test("clicar de novo na mesma nota limpa")` → "Sem nota".
- `test("setas ajustam de meia em meia estrela")`: a partir de vazio, `{ArrowRight}` ×7 → "3,5 de 5 estrelas"; `{ArrowLeft}` → "3 de 5 estrelas"; `{End}` → 5; `{Home}` → "0 de 5 estrelas"; `{Delete}` → "Sem nota".
- `test("arrastar com o botão pressionado ajusta a nota")`: `fireEvent.pointerMove(slider, { clientX: 55, buttons: 1 })` → "3 de 5 estrelas".

- [ ] **Step 2: Implementar a conversão de posição em nota**

Algoritmo da posição, que o teste fixa:
```ts
function valorNaPosicao(elemento: HTMLElement, x: number): number {
  const { left, width } = elemento.getBoundingClientRect();
  if (width <= 0) return 0.5;
  const estrelas = ((x - left) / width) * 5;
  return Math.min(5, Math.max(0.5, Math.ceil(estrelas * 2) / 2));
}
```
O clique usa `valorNaPosicao` e, se o valor for igual ao atual, limpa. O `pointermove` com `buttons === 1` marca "arrastou" (o próximo `click` é ignorado) e ajusta. O teclado segue: ArrowRight/ArrowUp +0,5 (máx. 5, partindo de 0 quando vazio); ArrowLeft/ArrowDown −0,5 (mín. 0); Home = 0; End = 5; Delete/Backspace = vazio; `preventDefault` nas teclas tratadas.

- [ ] **Step 3: Rodar os testes, lint e commit**

```bash
cd .. && git add frontend && git commit -m "feat: estrelas de nota com meia estrela, arraste e teclado"
```

---

### Task 9: Buscar

**Files:**
- Create/Modify: `frontend/src/paginas/Buscar.tsx`, `frontend/src/componentes/CartaoRestaurante.tsx`, `Paginacao.tsx`; `Buscar.test.tsx`

**Interfaces:**
- Consumes: `api`, `dados`, `NotaEstrelas`, `formatarNota` (Tasks 4 e 8)
- Produces:
  - `CIDADE_PADRAO = "rio-de-janeiro"` (exportado de `Buscar.tsx`)
  - `<CartaoRestaurante restaurante={RestauranteResumo} />`: um link para `/r/<slug>` com nome, bairro e até 2 categorias, preço (`$` repetido `faixa_preco` vezes), `NotaEstrelas` + nota com vírgula + `(total)` quando houver nota (senão "Sem avaliações"), e o selo "Fechado" se `status === "fechado"`
  - `<Paginacao pagina={n} temAnterior={bool} temProxima={bool} aoMudar={(n) => void} />`: botões "Anterior"/"Próxima" e o texto "Página n"

- [ ] **Step 1: Testes que falham**

- `test("mostra os resultados da busca da URL")`: rota `/buscar?q=aprazivel`; o handler confere a consulta (`q=aprazivel`, `cidade=rio-de-janeiro`) → link "Aprazível" (`/r/aprazivel-santa-teresa`), "4,5" e "1 restaurante".
- `test("enviar o termo atualiza a URL e a lista")`: digitar "adega" no campo de busca e enviar → nova requisição com `q=adega`, e a página volta para 1.
- `test("filtros viram parâmetros da consulta")`: escolher o bairro "Botafogo" e a nota mínima "4" → a requisição tem `bairro=Botafogo` e `nota_min=4`.
- `test("sem resultados mostra orientação")`: "Nenhum restaurante encontrado. Tente outro termo ou tire filtros."
- `test("paginação pede a próxima página")`: com `next` preenchido, clicar em "Próxima" → requisição com `page=2`.

- [ ] **Step 2: Implementar**

O estado da busca mora **na URL** (`useSearchParams`). O campo de texto é enviado por formulário (`role="search"`), e os selects de bairro (`GET /bairros?cidade=`), categoria (`GET /categorias`), preço ($ a $$$$), nota mínima (1 a 5) e ordem (relevância, mais bem avaliados, mais populares, A–Z) aplicam na hora. Toda mudança de filtro zera `page`. A lista usa `placeholderData: keepPreviousData`. Título da página: "Buscar".

- [ ] **Step 3: Rodar os testes, lint e commit**

```bash
cd .. && git add frontend && git commit -m "feat: busca de restaurantes com filtros e paginação"
```

---

### Task 10: Página do restaurante

**Files:**
- Create/Modify: `frontend/src/paginas/Restaurante.tsx`, `frontend/src/componentes/Histograma.tsx`, `CartaoRegistro.tsx`, `frontend/src/util/datas.ts`; testes

**Interfaces:**
- Consumes: `NotaEstrelas`, `formatarNota`, `codigoDeErro` (para o 404), `NaoEncontrada`, `Avatar`
- Produces:
  - `util/datas.ts`: `hojeLocal(): string` (`YYYY-MM-DD` no fuso do navegador); `formatarData(iso: string): string` ("20 de set. de 2026", lendo `YYYY-MM-DD` ao meio-dia local para não trocar de dia); `mesDoAno(iso: string): string` ("setembro de 2026")
  - `<Histograma barras={BarraHistograma[]} />`: 11 barras proporcionais à maior, `role="img"` com `aria-label` "Distribuição das notas: …" listando as faixas com quantidade > 0
  - `<CartaoRegistro registro={Registro} mostrar="usuario" | "restaurante" />`: cabeçalho com o usuário (avatar + link `/u/…`) ou o restaurante (link `/r/…`); `NotaEstrelas` se houver nota; data formatada; "♥" com `aria-label="Curtiu"`; crítica com `whitespace-pre-line`
  - Na página, o botão "Registrar visita" (só para logados) é criado aqui sem ação; a Task 11 liga o modal

- [ ] **Step 1: Testes que falham**

- `test("mostra dados, nota e histograma")`: rota `/r/aprazivel-santa-teresa` → heading "Aprazível", "Santa Teresa", "Rua Aprazível, 62", o link "Ver no mapa" com o `link_mapa`, "4,5" e "12 avaliações", e `role="img"` com a distribuição.
- `test("lista as críticas mais recentes")` → o texto da crítica e o link do autor `/u/ana`.
- `test("anônimo vê convite para entrar em vez do botão de registrar")` → link "Entre para registrar sua visita" (`/entrar?voltar=/r/aprazivel-santa-teresa`).
- `test("logado vê o botão Registrar visita e o seu último registro")`: com `meu_ultimo_registro` → "Sua última visita: 20 de set. de 2026".
- `test("restaurante inexistente mostra página não encontrada")`: `404 nao_encontrado` → heading "Página não encontrada".
- `formatarData("2026-09-20")` → "20 de set. de 2026"; `mesDoAno("2026-09-20")` → "setembro de 2026".

- [ ] **Step 2: Implementar e verificar**

As chaves de consulta são `["restaurante", slug]` e `["restaurante", slug, "registros"]`, para que invalidar `["restaurante", slug]` atualize as duas. Título da página: o nome do restaurante.

Run: `npm test && npm run lint && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend && git commit -m "feat: página do restaurante com histograma e críticas"
```

---

### Task 11: Registrar visita

**Files:**
- Create: `frontend/src/registros/RegistrarVisita.tsx`, `RegistrarVisita.test.tsx`
- Modify: `frontend/src/paginas/Restaurante.tsx` (abrir o modal)

**Interfaces:**
- Consumes: `EstrelasNota` (Task 8), `hojeLocal` (Task 10), `api`, `dados`, `aplicarErros`, `errosDeCampo`
- Produces: `<RegistrarVisita restaurante={{ slug: string; nome: string }} aberto={boolean} aoMudarAberto={(aberto: boolean) => void} />` (Radix `Dialog`, título "Registrar visita", descrição = nome do restaurante)

- [ ] **Step 1: Testes que falham**

- `test("salva data, nota, crítica e curtida")`: abrir, `{ArrowRight}` ×7 na nota, escrever "Vista linda." em "Crítica", marcar "Curti", clicar "Salvar" → `POST */registros` com `{ restaurante_slug, data_visita: hojeLocal(), nota: 3.5, critica: "Vista linda.", curtiu: true, revisita: false }` → o diálogo fecha.
- `test("salva só a visita, sem nota nem crítica")` → `nota: null`, `critica: ""`.
- `test("clique duplo cria um único registro")` (**Review Focus 2**): o handler responde após 100 ms; dois cliques rápidos em "Salvar" → o handler é chamado 1 vez, e o botão fica desabilitado com o texto "Salvando…" durante o envio.
- `test("erro de data vindo do servidor aparece no campo")` (**Review Focus 4**): `400` com `campos: { data_visita: ["A data da visita não pode estar no futuro."] }` → a mensagem fica associada ao campo "Data da visita".
- `test("data no futuro é barrada antes de enviar")`: "A data não pode estar no futuro."
- `test("crítica acima de 5.000 caracteres é barrada")` e contador "N/5000".
- `test("salvar atualiza a página do restaurante")`: após salvar, a consulta `["restaurante", slug]` é refeita (o handler de detalhe é chamado de novo).

- [ ] **Step 2: Implementar e verificar**

Campos:
- Data da visita: `type="date"`, `max` = hoje, padrão hoje.
- `EstrelasNota`: controlada fora do RHF.
- "Curti" e "Já tinha ido antes": checkboxes.
- "Crítica": `textarea` com contador.

O envio usa `useMutation`, e o botão fica desabilitado enquanto `isPending`. No sucesso: invalida `["restaurante", slug]`, `["diario"]` e `["perfil"]`, limpa o formulário e fecha. No erro:
- `aplicarErros` para `data_visita` e `critica`.
- Erro de `nota` num texto sob as estrelas.
- Mensagem geral só quando nenhum campo recebeu erro.

Run: `npm test && npm run lint && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend && git commit -m "feat: modal de registrar visita com nota em meias estrelas"
```

---

### Task 12: Perfil com diário e críticas

**Files:**
- Create/Modify: `frontend/src/paginas/Perfil.tsx`, `Perfil.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `CartaoRegistro`, `Paginacao`, `mesDoAno`, `NaoEncontrada`, Radix `Tabs`
- Produces: rota `/u/:username`; consultas `["perfil", username]`, `["diario", username, pagina]`, `["criticas", username, pagina]`

- [ ] **Step 1: Testes que falham**

- `test("mostra o cabeçalho do perfil")`: nome de exibição "Ana", "@ana", bio, cidade, "3 restaurantes visitados" e "2 este ano".
- `test("diário agrupa as visitas por mês")`: registros em setembro e agosto de 2026 → headings "setembro de 2026" e "agosto de 2026", cada um com seus restaurantes.
- `test("aba Críticas lista só as críticas")`: clicar na aba "Críticas" → requisição a `*/usuarios/ana/criticas` e o texto da crítica.
- `test("diário vazio convida a registrar")`: o próprio usuário vê "Você ainda não registrou visitas. Busque um restaurante e registre a primeira."; outro usuário vê "Nenhuma visita registrada ainda."
- `test("usuário inexistente mostra página não encontrada")`.

- [ ] **Step 2: Implementar e verificar**

Title: nome de exibição ou username.
Run: `npm test && npm run lint && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend && git commit -m "feat: perfil com diário por mês e críticas"
```

---

### Task 13: Configurações

**Files:**
- Create/Modify: `frontend/src/paginas/Configuracoes.tsx`, `Configuracoes.test.tsx`

**Interfaces:**
- Consumes: `useSessao().atualizarUsuario/sair`, `SeletorTema` (Task 3), `definirAcesso`, `api`, `aplicarErros`, Radix `Dialog`
- Produces: `TAMANHO_MAXIMO_AVATAR = 2 * 1024 * 1024`, `TIPOS_AVATAR = ["image/jpeg", "image/png", "image/webp"]` (exportados)

- [ ] **Step 1: Testes que falham**

- `test("salva nome, bio e cidade")`: `PATCH */eu/perfil` com JSON `{ nome_exibicao, bio, cidade: "rio-de-janeiro" }` → aviso "Perfil atualizado." e `atualizarUsuario` com a resposta (o cabeçalho passa a mostrar o novo nome).
- `test("envia o avatar como multipart")`: escolher um PNG pequeno → a requisição tem `Content-Type` `multipart/form-data` e a parte `avatar`.
- `test.each([["grande", 2 * 1024 * 1024 + 1, "image/png"], ["gif", 10, "image/gif"]])("avatar %s é barrado antes de enviar")` (**Review Focus 5**): mensagens "A imagem deve ter no máximo 2 MB." e "Envie uma imagem JPG, PNG ou WebP."; nenhuma requisição é feita.
- `test("erro do servidor no avatar aparece no campo")`: `400 { campos: { avatar: ["A imagem é grande demais (dimensões)."] } }`.
- `test("trocar senha guarda o novo acesso")`: `POST */eu/senha` → `{ acesso: "novo" }` → `tokenDeAcesso() === "novo"` e aviso "Senha alterada.". Com `400 senha_incorreta` → a mensagem da API.
- `test("excluir conta pede a senha e desloga")`: abrir "Excluir conta", digitar a senha, confirmar → `POST */eu/excluir` com `{ senha }` → `204` → vai para `/`, anônimo.
- O seletor de tema aparece na página (fieldset "Tema").

- [ ] **Step 2: Implementar e verificar**

Seções: **Perfil** (nome de exibição até 50, bio até 300 com contador, cidade via `GET /cidades`, avatar com prévia e "Remover foto"), **Aparência** (`SeletorTema`), **Senha** e **Zona de perigo** (excluir conta num `Dialog` de confirmação que explica que tudo será apagado).

O multipart vai por `api.PATCH("/api/v1/eu/perfil", { body: formulario, bodySerializer: (corpo) => corpo })`, com o cast de tipo necessário. Se o `Content-Type` sair como JSON, passe `headers: { "Content-Type": null }` para o navegador definir o *boundary*. O teste do Step 1 decide.

Run: `npm test && npm run lint && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend && git commit -m "feat: configurações de perfil, avatar, tema, senha e exclusão de conta"
```

---

### Task 14: Tela inicial

**Files:**
- Create/Modify: `frontend/src/paginas/Inicio.tsx`, `Inicio.test.tsx`

**Interfaces:**
- Consumes: `CartaoRegistro`, consulta `["diario", username, 1]` (a mesma chave da Task 12)

- [ ] **Step 1: Testes que falham**

- `test("buscar leva para a página de busca")`: digitar "aprazível" no campo `searchbox` e enviar → rota `/buscar?q=apraz%C3%ADvel` (verificar pelo heading "Buscar").
- `test("logado vê as últimas 5 visitas")`: o diário com 7 registros → aparecem 5, sob o heading "Suas últimas visitas", mais o link "Ver diário completo" (`/u/ana`).
- `test("logado sem visitas vê o convite")`: "Você ainda não registrou visitas. Busque um restaurante e registre a primeira."
- `test("anônimo vê a apresentação e o convite para criar conta")`: link "Criar conta".

- [ ] **Step 2: Implementar e verificar**

Heading principal: "Onde você comeu hoje?". O campo de busca tem o placeholder "Aprazível, Adega Pérola…" e o rótulo acessível "Buscar restaurante".

Run: `npm test && npm run lint && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend && git commit -m "feat: tela inicial com busca e últimas visitas"
```

---

### Task 15: Ponta a ponta, CI e README

**Files:**
- Create: `frontend/playwright.config.ts`, `frontend/e2e/fluxo-principal.spec.ts`, `.github/workflows/frontend.yml`
- Modify: `.github/dependabot.yml` (ecossistema `npm` em `/frontend`), `README.md` (seção "Rodando o frontend")

**Interfaces:**
- Consumes: tudo

- [ ] **Step 1: 👤 Instalar o navegador do Playwright**

Pedir permissão ao usuário (o download do Chromium do Playwright tem ~150 MB) e rodar:
```bash
cd frontend && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Escrever o teste de ponta a ponta**

`playwright.config.ts`: `testDir: "./e2e"`, `baseURL: "http://localhost:5173"`, `webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true }`, projeto `chromium`.

`e2e/fluxo-principal.spec.ts`, `test("cadastro, busca, registro de visita e diário")`:
1. Cadastro com username `e2e<timestamp em base36>` → rota `/`.
2. Buscar "aprazivel" → abrir o primeiro link "Aprazível".
3. "Registrar visita" → foco no `slider` "Nota" → `ArrowRight` ×7 → `aria-valuetext` "3,5 de 5 estrelas" → crítica "Teste automatizado." → "Salvar".
4. Ir para `/u/<username>` → ver "Aprazível" no diário.
5. **Limpeza:** Configurações → "Excluir conta" → senha → confirmar → rota `/`.

Pré-requisitos (anotados no README): o Docker com o banco, o `runserver` do Django e os restaurantes importados.

- [ ] **Step 3: Rodar o teste de ponta a ponta localmente**

Com o banco e o `runserver` no ar:
Run: `cd frontend && npm run test:e2e`
Expected: `1 passed`. O limite de 3 cadastros por hora por IP vale também aqui; se estourar, reinicie o `runserver`, porque o contador fica em memória.

- [ ] **Step 4: CI e Dependabot**

`.github/workflows/frontend.yml` (`push` na `main` e `pull_request`), job `frontend` em `frontend/`:
- `actions/checkout@v7`
- `actions/setup-node` com Node 24 e cache de `npm`
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run tipos:verificar`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`

O teste de ponta a ponta **não** roda no CI, porque depende da base de restaurantes importada.

Em `.github/dependabot.yml`, acrescentar o ecossistema `npm` em `/frontend`, semanal.

- [ ] **Step 5: README**

Acrescentar a seção "Rodando o frontend" com os comandos para PowerShell:
- `cd frontend`
- `npm install`
- `npm run dev`
- Endereço: http://localhost:5173 (o backend precisa estar no ar, na porta 8000)
- Comandos para regenerar os tipos quando a API mudar: `python manage.py spectacular --file openapi.yml` no backend e depois `npm run gerar-tipos` no frontend.

- [ ] **Step 6: Verificação manual e commit**

Abrir http://localhost:5173 no navegador do app, nos temas claro e escuro, na largura de celular (375 px) e na de desktop. Conferir: a busca, a página do Aprazível, o registro de visita com as estrelas, o diário e as configurações. Sem erros no console.

```bash
git add .github README.md frontend && git commit -m "test: fluxo de ponta a ponta, CI do frontend e documentação"
```

---

## Fora deste plano

- PWA (instalação na tela inicial): Fase 4, junto do polimento.
- Toasts (Radix Toast): avisos inline com `role="status"` bastam na Fase 1.
- Deploy do frontend (Cloudflare Pages), CSP do frontend em produção e `CSRF_COOKIE_DOMAIN`: plano de deploy.
- Desejos, listas, favoritos, feed e social: Fases 2 e 3.
