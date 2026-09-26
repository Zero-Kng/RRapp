# Fase 2, fatia 1: Desejos — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar restaurantes que se quer conhecer (♡ Desejo na página do restaurante), vê-los numa aba do perfil e tirá-los automaticamente ao registrar uma visita.

**Architecture:** App Django novo `colecoes` com a tabela `Desejo` e um sinal que a limpa quando um `Registro` é criado; endpoints `PUT/DELETE /eu/desejos/{slug}` e `GET /usuarios/{username}/desejos`; o detalhe do restaurante ganha `na_minha_lista_de_desejos`. No frontend, um botão de alternar na página do restaurante e uma aba "Desejos" no perfil, com os tipos regenerados do OpenAPI.

**Tech Stack:** Django 6 + DRF + drf-spectacular, pytest + factory_boy; React + TypeScript, TanStack Query, openapi-fetch, Radix Tabs, lucide-react, Vitest + Testing Library + MSW, Playwright (Edge).

**Spec:** [`docs/design/10-fase2-colecoes.md`](../../design/10-fase2-colecoes.md) (fatia 1), dentro do SDD [`docs/superpowers/specs/2026-09-25-rrapp-design.md`](../specs/2026-09-25-rrapp-design.md).

## Global Constraints

- Restaurantes identificados pelo **slug** na API; só entram restaurantes com status **diferente de `pendente`**.
- Formato de erro: `{"erro": {"codigo", "mensagem", "campos"}}`; paginação por página, **20 por página**.
- Escritas limitadas pelo `ThrottleEscrita` (escopo `escrita`, 30/min), como os registros.
- Usuário suspenso (`is_active=False`): os desejos dele respondem **404**, como o diário (`_usuario_ativo`).
- `openapi.yml` regenerado com `python manage.py spectacular --file openapi.yml` e tipos com `npm run gerar-tipos`; o CI confere os dois.
- Frontend: oxlint `--deny-warnings`, Prettier, `tsc -b`; textos em português do Brasil; ícones lucide-react; nada de `dangerouslySetInnerHTML`.
- Arquivos com quebra de linha **LF** (`.gitattributes`); edições por script usam `newline="\n"`.
- Commits **sem** linha `Co-Authored-By` nem outra atribuição ao Claude.
- Comandos do backend: `cd backend && .venv/Scripts/python -m pytest -q`; do frontend: `cd frontend && npx vitest run && npm run lint && npm run typecheck`.

## Review Focus

1. **Registrar visita a um restaurante que outra pessoa deseja** → só o desejo do autor sai; o dos outros fica. Teste na Task 1.
2. **Editar um registro existente (PATCH) ou guardar o desejo de novo depois de ter ido** → o desejo não some; só a *criação* de um registro limpa. Testes nas Tasks 1 e 2.
3. **Restaurante sem bairro com `ordem=bairro`** → vai para o fim, sob o título "Sem bairro". Testes nas Tasks 2 e 4.
4. **Clique duplo no ♡** → uma requisição só; o botão fica desabilitado durante o envio. Teste na Task 3.
5. **Username com outra caixa (`/usuarios/ANA/desejos`)** → funciona como o diário (`iexact`). Teste na Task 2.

---

### Task 1: App `colecoes`, tabela Desejo e limpeza ao registrar

**Files:**
- Create: `backend/colecoes/__init__.py`, `apps.py`, `models.py`, `admin.py`, `signals.py`, `migrations/0001_initial.py` (gerada)
- Modify: `backend/config/settings.py` (`INSTALLED_APPS`: `"colecoes"` depois de `"registros"`), `backend/tests/factories.py` (`DesejoFactory`)
- Test: `backend/tests/test_desejos_modelo.py`

**Interfaces:**
- Produces: `colecoes.models.Desejo` com `usuario` (FK `AUTH_USER_MODEL`, `CASCADE`, `related_name="desejos"`), `restaurante` (FK `lugares.Restaurante`, `CASCADE`, `related_name="desejos"`), `adicionado_em` (`auto_now_add`); `Meta.ordering = ["-adicionado_em", "-id"]`; `UniqueConstraint(fields=["usuario", "restaurante"], name="desejo_unico_por_usuario")`. `tests/factories.DesejoFactory(usuario, restaurante)`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/test_desejos_modelo.py`:

```python
def test_desejo_e_unico_por_usuario_e_restaurante(db):
    desejo = DesejoFactory()
    with pytest.raises(IntegrityError):
        DesejoFactory(usuario=desejo.usuario, restaurante=desejo.restaurante)

def test_criar_registro_tira_o_restaurante_dos_desejos_do_autor(db):
    desejo = DesejoFactory()
    RegistroFactory(usuario=desejo.usuario, restaurante=desejo.restaurante)
    assert not Desejo.objects.filter(pk=desejo.pk).exists()

def test_registro_de_outra_pessoa_nao_mexe_no_meu_desejo(db):          # Review Focus 1
    desejo = DesejoFactory()
    RegistroFactory(restaurante=desejo.restaurante)  # outro usuário
    assert Desejo.objects.filter(pk=desejo.pk).exists()

def test_editar_registro_existente_nao_tira_desejo_guardado_depois(db):  # Review Focus 2
    registro = RegistroFactory()
    desejo = DesejoFactory(usuario=registro.usuario, restaurante=registro.restaurante)
    registro.critica = "Voltaria"
    registro.save()
    assert Desejo.objects.filter(pk=desejo.pk).exists()

def test_excluir_usuario_apaga_os_desejos(db):
    desejo = DesejoFactory()
    desejo.usuario.delete()
    assert not Desejo.objects.exists()

def test_apagar_restaurante_apaga_os_desejos(db):
    desejo = DesejoFactory()
    desejo.restaurante.delete()
    assert not Desejo.objects.exists()
```

O sinal é de ORM (`post_save`), então cobre o Admin e qualquer outro caminho que salve um `Registro`; não é preciso um teste pelo formulário do Admin.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && .venv/Scripts/python -m pytest tests/test_desejos_modelo.py -q`
Expected: erro de importação (`colecoes` não existe).

- [ ] **Step 3: Implementar** o app (`ColecoesConfig.ready()` importa `colecoes.signals`, como `registros/apps.py`), o modelo acima, `DesejoFactory` e o receptor `tirar_dos_desejos(sender, instance: Registro, created: bool, **kwargs)` em `colecoes/signals.py`, que só age quando `created` e apaga `Desejo.objects.filter(usuario_id=instance.usuario_id, restaurante_id=instance.restaurante_id)`. Registrar `Desejo` no Admin com `list_display = ["usuario", "restaurante", "adicionado_em"]`, `raw_id_fields = ["usuario", "restaurante"]`. Gerar a migração com `.venv/Scripts/python manage.py makemigrations colecoes`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && .venv/Scripts/python -m pytest -q`
Expected: todos passam (os 6 novos e a suíte antiga).

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat: tabela de desejos, tirada ao registrar uma visita"
```

---

### Task 2: API dos desejos e flag no detalhe do restaurante

**Files:**
- Create: `backend/colecoes/serializers.py`, `backend/colecoes/views.py`, `backend/colecoes/urls.py`
- Create: `backend/contas/consultas.py`
- Modify: `backend/config/urls.py` (`path("api/v1/", include("colecoes.urls"))`), `backend/contas/views.py` (usa `usuario_ativo`), `backend/lugares/serializers.py` (`RestauranteDetalheSerializer`), `backend/openapi.yml` (regenerado)
- Test: `backend/tests/test_desejos_api.py`, `backend/tests/test_restaurante_detalhe.py`

**Interfaces:**
- Consumes: `Desejo`, `DesejoFactory` (Task 1); `RestauranteResumoSerializer`; `_usuario_ativo(username)` de `contas/views.py`, movido para `contas/consultas.py` como `usuario_ativo(username: str) -> Usuario` (mesmo corpo) e usado pelas views do diário, das críticas e dos desejos; `ThrottleEscrita` de `config/api.py`.
- Produces:
  - `PUT /api/v1/eu/desejos/<slug:slug>` → `204` sem corpo; `DELETE` idem. Nomes de rota: `desejo`.
  - `GET /api/v1/usuarios/<str:username>/desejos?ordem=recentes|bairro` → página de `DesejoSerializer`: `{"restaurante": RestauranteResumo, "adicionado_em": datetime}`. Nome de rota: `desejos`. Esquema OpenAPI do item: `Desejo`.
  - `RestauranteDetalhe.na_minha_lista_de_desejos: bool` (sempre presente; `false` para anônimos).

- [ ] **Step 1: Escrever os testes que falham** em `tests/test_desejos_api.py` (fixtures `api`, `api_logado`, `usuario` = ana do `conftest.py`):

```python
URL = "/api/v1/eu/desejos/{}"

def test_anonimo_nao_guarda_desejo(api, db):
    assert api.put(URL.format(RestauranteFactory().slug)).status_code == 401

def test_guardar_desejo_e_idempotente(api_logado, usuario):
    restaurante = RestauranteFactory()
    assert api_logado.put(URL.format(restaurante.slug)).status_code == 204
    assert api_logado.put(URL.format(restaurante.slug)).status_code == 204
    assert Desejo.objects.filter(usuario=usuario, restaurante=restaurante).count() == 1

def test_tirar_desejo_e_idempotente(api_logado, usuario):
    desejo = DesejoFactory(usuario=usuario)
    assert api_logado.delete(URL.format(desejo.restaurante.slug)).status_code == 204
    assert api_logado.delete(URL.format(desejo.restaurante.slug)).status_code == 204
    assert not Desejo.objects.exists()

@pytest.mark.parametrize("slug", ["nao-existe", "pendente"])
def test_restaurante_inexistente_ou_pendente(api_logado, slug):
    RestauranteFactory(slug="pendente", status=Restaurante.Status.PENDENTE)
    assert api_logado.put(URL.format(slug)).status_code == 404

def test_guardar_de_novo_depois_de_ter_ido(api_logado, usuario):          # Review Focus 2
    registro = RegistroFactory(usuario=usuario)
    assert api_logado.put(URL.format(registro.restaurante.slug)).status_code == 204
    assert Desejo.objects.filter(usuario=usuario).exists()

def test_lista_publica_do_perfil_mais_recentes_primeiro(api, usuario):
    velho, novo = DesejoFactory(usuario=usuario), DesejoFactory(usuario=usuario)
    DesejoFactory()  # de outra pessoa
    slugs = [d["restaurante"]["slug"] for d in api.get("/api/v1/usuarios/ana/desejos").json()["results"]]
    assert slugs == [novo.restaurante.slug, velho.restaurante.slug]

def test_ordem_por_bairro_e_nome_com_sem_bairro_no_fim(api, usuario):   # Review Focus 3
    for nome, bairro in [("Zé", "Botafogo"), ("Adega", "Tijuca"), ("Bar", ""), ("Aprazível", "Botafogo")]:
        DesejoFactory(usuario=usuario, restaurante=RestauranteFactory(nome=nome, bairro=bairro))
    nomes = [d["restaurante"]["nome"] for d in api.get("/api/v1/usuarios/ana/desejos", {"ordem": "bairro"}).json()["results"]]
    assert nomes == ["Aprazível", "Zé", "Adega", "Bar"]

def test_ordem_invalida(api, usuario):
    assert api.get("/api/v1/usuarios/ana/desejos", {"ordem": "nota"}).status_code == 400

def test_username_ignora_caixa(api, usuario):                            # Review Focus 5
    DesejoFactory(usuario=usuario)
    assert api.get("/api/v1/usuarios/ANA/desejos").json()["count"] == 1

def test_desejos_de_usuario_suspenso_ou_inexistente(api, usuario):
    usuario.is_active = False
    usuario.save()
    assert api.get("/api/v1/usuarios/ana/desejos").status_code == 404
    assert api.get("/api/v1/usuarios/ninguem/desejos").status_code == 404
```

E em `tests/test_restaurante_detalhe.py`:

```python
def test_flag_de_desejo_no_detalhe(api, api_logado, usuario):
    restaurante = RestauranteFactory()
    url = f"/api/v1/restaurantes/{restaurante.slug}"
    assert api_logado.get(url).json()["na_minha_lista_de_desejos"] is False
    DesejoFactory(usuario=usuario, restaurante=restaurante)
    assert api_logado.get(url).json()["na_minha_lista_de_desejos"] is True
    api.force_authenticate(None)
    assert api.get(url).json()["na_minha_lista_de_desejos"] is False
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && .venv/Scripts/python -m pytest tests/test_desejos_api.py tests/test_restaurante_detalhe.py -q`
Expected: 404 nas rotas novas e `KeyError: 'na_minha_lista_de_desejos'`.

- [ ] **Step 3: Implementar**
  - `DesejoView(APIView)` com `put`/`delete`, `permission_classes = [IsAuthenticated]`, `throttle_classes = [ThrottleEscrita]`; restaurante por `get_object_or_404(Restaurante.objects.exclude(status=PENDENTE), slug=slug)`; `get_or_create` / `filter(...).delete()`; `extend_schema(request=None, responses={204: None})`.
  - `DesejosView(ListAPIView)` com `AllowAny`, filtro `FiltroDesejosSerializer` (`ordem = ChoiceField(["recentes", "bairro"], default="recentes", required=False)`) declarado no `extend_schema_view` como o do diário; ordem `bairro`: `Case(When(restaurante__bairro="", then=1), default=0)`, depois `restaurante__bairro`, `restaurante__nome`, `id`; ordem `recentes`: `-adicionado_em`, `-id`. `select_related("restaurante__cidade")` e `prefetch_related("restaurante__categorias")`.
  - `na_minha_lista_de_desejos = SerializerMethodField()` em `RestauranteDetalheSerializer`, usando `restaurante.desejos.filter(usuario=request.user).exists()` (sem importar `colecoes` em `lugares`).
  - Regenerar: `cd backend && .venv/Scripts/python manage.py spectacular --file openapi.yml`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && .venv/Scripts/python -m pytest -q && .venv/Scripts/ruff check . && .venv/Scripts/ruff format --check .`
Expected: tudo passa, inclusive `test_arquivo_openapi_versionado_esta_atualizado`.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat: API de desejos e flag na página do restaurante"
```

---

### Task 3: Botão ♡ Desejo na página do restaurante

**Files:**
- Create: `frontend/src/colecoes/BotaoDesejo.tsx`, `frontend/src/colecoes/BotaoDesejo.test.tsx`
- Modify: `frontend/src/api/esquema.d.ts` (gerado), `frontend/src/api/tipos.ts` (`export type Desejo = Esquemas["Desejo"]`), `frontend/src/testes/dados.ts` (`aprazivelDetalhe.na_minha_lista_de_desejos = false`; `desejo(sobrescrever)`), `frontend/src/paginas/Restaurante.tsx` (seção "Sua visita")

**Interfaces:**
- Consumes: endpoints e `RestauranteDetalhe.na_minha_lista_de_desejos` (Task 2).
- Produces: `BotaoDesejo({ restaurante }: { restaurante: RestauranteDetalhe })`; chave de consulta dos desejos `["desejos", username, ordem, pagina]` (prefixo `["desejos"]` para invalidar); fixture `desejo(sobrescrever?: Partial<Desejo>): Desejo`.

- [ ] **Step 1: Regenerar os tipos** (`cd frontend && npm run gerar-tipos`) e acrescentar o tipo e as fixtures. `npm run typecheck` deve acusar só a fixture `aprazivelDetalhe` sem o campo novo, até ela ser corrigida.

- [ ] **Step 2: Escrever os testes que falham** em `BotaoDesejo.test.tsx`, renderizando a página `/r/aprazivel-santa-teresa` com `renderizar` e MSW:

```tsx
test("logado guarda e tira o desejo", async () => {
  // GET do detalhe responde conforme a variável `desejado`; PUT/DELETE a alteram e respondem 204
  const botao = await screen.findByRole("button", { name: "Desejo" });
  expect(botao).toHaveAttribute("aria-pressed", "false");
  await evento.click(botao);
  await waitFor(() => expect(botao).toHaveAttribute("aria-pressed", "true"));
  expect(metodos).toEqual(["PUT"]);
  await evento.click(botao);
  await waitFor(() => expect(botao).toHaveAttribute("aria-pressed", "false"));
  expect(metodos).toEqual(["PUT", "DELETE"]);
});

test("clique duplo faz uma requisição só", async () => {        // Review Focus 4
  // o servidor segura a resposta do PUT até o teste liberar
  fireEvent.click(botao);
  fireEvent.click(botao);
  expect(botao).toBeDisabled();
  liberar();
  await waitFor(() => expect(botao).toHaveAttribute("aria-pressed", "true"));
  expect(metodos).toEqual(["PUT"]);
});

test("anônimo é levado a entrar e volta ao restaurante", async () => {
  expect(await screen.findByRole("link", { name: "Desejo" })).toHaveAttribute(
    "href", "/entrar?voltar=%2Fr%2Faprazivel-santa-teresa",
  );
});

test("erro ao guardar aparece como aviso", async () => {
  // PUT responde 500
  expect(await screen.findByRole("alert")).toHaveTextContent("Algo deu errado. Tente de novo.");
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/colecoes`
Expected: FAIL (componente inexistente).

- [ ] **Step 4: Implementar `BotaoDesejo`**
  - Logado: `Botao variante="secundaria"` com `aria-pressed`, ícone `Heart` (preenchido quando ativo, na cor de destaque) e o texto "Desejo"; `useMutation` com `api.PUT`/`api.DELETE` em `/api/v1/eu/desejos/{slug}`; `disabled` enquanto `isPending` e uma trava por `useRef` contra o clique duplo, como `RegistrarVisita`; no sucesso, `invalidateQueries({ queryKey: ["restaurante", slug] })` e `invalidateQueries({ queryKey: ["desejos"] })`; no erro, `<Aviso>` com `mensagemDeErro(erro)`.
  - Anônimo: `Link` "Desejo" (mesmo ícone, visual de botão secundário) para `/entrar?voltar=${encodeURIComponent(pathname)}`.
  - Em `Restaurante.tsx`, colocar `<BotaoDesejo restaurante={restaurante} />` logo depois de "Registrar visita" (ou do link "Entre para registrar sua visita").

- [ ] **Step 5: Rodar e ver passar**

Run: `cd frontend && npx vitest run && npm run lint && npm run typecheck`
Expected: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend && git commit -m "feat: botão de desejo na página do restaurante"
```

---

### Task 4: Aba Desejos no perfil

**Files:**
- Create: `frontend/src/colecoes/Desejos.tsx`, `frontend/src/colecoes/Desejos.test.tsx`
- Modify: `frontend/src/paginas/Perfil.tsx` (aba nova), `frontend/src/registros/RegistrarVisita.tsx` (`invalidateQueries({ queryKey: ["desejos"] })` no `onSuccess`)

**Interfaces:**
- Consumes: `GET /usuarios/{username}/desejos` (Task 2); chave `["desejos", username, ordem, pagina]` e fixture `desejo()` (Task 3); `CartaoRestaurante`, `Paginacao`, `Carregando`, `Aviso`.
- Produces: `Desejos({ username, ehVoce }: { username: string; ehVoce: boolean })`.

- [ ] **Step 1: Escrever os testes que falham** em `Desejos.test.tsx` (página `/u/ana`, clicando na aba "Desejos"):

```tsx
test("mostra os desejos mais recentes primeiro", async () => {
  expect(await within(painel).findAllByRole("link", { name: /Aprazível|Adega Pérola/ })).toHaveLength(2);
  expect(ordens).toEqual(["recentes"]);
});

test("por bairro agrupa com um título por bairro e 'Sem bairro' no fim", async () => { // Review Focus 3
  await evento.selectOptions(screen.getByLabelText("Ordenar"), "bairro");
  const titulos = await within(painel).findAllByRole("heading", { level: 3 });
  expect(titulos.map((t) => t.textContent)).toEqual(["Santa Teresa", "Tijuca", "Sem bairro"]);
  expect(ordens.at(-1)).toBe("bairro");
});

test("vazio no próprio perfil ensina a guardar", async () => {
  expect(await screen.findByText("Você ainda não guardou restaurantes. Toque em Desejo na página de um restaurante.")).toBeVisible();
});

test("vazio no perfil de outra pessoa", async () => {
  expect(await screen.findByText("Nenhum desejo ainda.")).toBeVisible();
});
```

Em `RegistrarVisita.test.tsx`, um teste de que salvar a visita invalida o prefixo `["desejos"]` (espiar `clienteConsultas.invalidateQueries`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/colecoes src/registros`
Expected: FAIL (aba e componente inexistentes; invalidação ausente).

- [ ] **Step 3: Implementar**
  - `Desejos`: `select` "Ordenar" com "Mais recentes" (`recentes`) e "Por bairro" (`bairro`), que volta para a página 1 ao mudar; `useQuery` na chave acima; em `bairro`, agrupar os itens da página em seções (`section` + `h3`) pelo bairro, com `""` rotulado "Sem bairro"; itens com `CartaoRestaurante`; `Paginacao` como no diário.
  - `Perfil.tsx`: aba "Desejos" depois de "Críticas" (`Tabs.Trigger value="desejos"`), montando `<Desejos username=… ehVoce=… />`.
  - `RegistrarVisita.tsx`: invalidar `["desejos"]` junto das outras chaves.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run && npm run lint && npm run typecheck`
Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat: aba de desejos no perfil"
```

---

### Task 5: Ponta a ponta e verificação no celular

**Files:**
- Modify: `frontend/e2e/fluxo-principal.spec.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–4.

- [ ] **Step 1: Acrescentar ao teste de ponta a ponta**, antes de registrar a visita ao Aprazível: tocar em "Desejo" (fica `aria-pressed="true"`), abrir `/u/<username>`, aba "Desejos", ver "Aprazível"; depois de registrar a visita, a aba "Desejos" mostra "Você ainda não guardou restaurantes…" (o sinal tirou o desejo). Em 375 px, `/u/<username>` com a aba Desejos aberta não rola na horizontal (`scrollWidth <= clientWidth`).

- [ ] **Step 2: Rodar com Docker, `runserver` e o Vite no ar**

Run: `cd frontend && npm run test:e2e`
Expected: `1 passed`. (Limite de 3 cadastros por hora por IP: se estourar, reinicie o `runserver`.)

- [ ] **Step 3: Verificação manual** no navegador do app, em 375 px e no desktop, temas claro e escuro: ♡ na página do restaurante (liga, desliga, anônimo vai para "Entrar"), aba Desejos nas duas ordens, desejo some ao registrar a visita. Sem erros de JavaScript no console.

- [ ] **Step 4: Rodar tudo e fazer o commit**

Run: `cd backend && .venv/Scripts/python -m pytest -q` e `cd frontend && npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: tudo passa.

```bash
git add frontend && git commit -m "test: desejos no fluxo de ponta a ponta"
```
