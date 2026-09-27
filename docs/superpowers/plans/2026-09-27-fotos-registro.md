# Fotos no registro — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anexar até 4 fotos a uma visita ao registrá-la, mostrá-las em miniatura no diário e na página do restaurante, abrir em tela cheia e deixar o dono apagá-las.

**Architecture:** Um módulo compartilhado de imagens (`config/imagens.py`) faz a validação e a regravação em WebP que hoje estão só no avatar; o avatar passa a usá-lo. A tabela `FotoRegistro` fica no app `registros`, com as versões grande (1.600 px) e miniatura (480 px), e um sinal apaga os arquivos. `POST/DELETE /registros/{id}/fotos` enviam e apagam uma foto; o `RegistroSerializer` passa a trazer `fotos`. No frontend, o "Registrar visita" ganha o campo de fotos e envia uma por vez depois de criar o registro; o cartão de registro mostra as miniaturas e abre uma tela cheia.

**Tech Stack:** Django 6 + DRF + drf-spectacular, Pillow + pillow-heif 1.8, pytest + factory_boy; React + TypeScript, TanStack Query, openapi-fetch, Radix Dialog, lucide-react, Vitest + Testing Library + MSW, Playwright (Edge).

**Spec:** [`docs/design/11-fotos-e-feed.md`](../../design/11-fotos-e-feed.md) (fatia 1: fotos no registro; o feed é a fatia 2 e NÃO entra aqui).

## Global Constraints

- Formatos aceitos: **JPG, PNG, WebP e HEIC**; até **10 MB** e **40 megapixels**; no máximo **4 fotos por registro**.
- Versões: `imagem` com lado maior até **1.600 px** e `miniatura` até **480 px**, ambas **WebP** regravadas do zero (sem EXIF/GPS), nome aleatório, em `fotos/`.
- Mensagens de erro no campo `imagem`, exatamente: "Envie uma imagem JPG, PNG, WebP ou HEIC." · "A imagem deve ter no máximo 10 MB." · "A imagem é grande demais (dimensões)." · "Cada visita pode ter até 4 fotos."
- Limite de envio: escopo `fotos`, **60/hour** por usuário; apagar usa o escopo `escrita` (30/min).
- Permissões: ver é público; enviar e apagar só o dono do registro (anônimo 401, outro usuário 403); registro de usuário suspenso ou inexistente, e foto que não é daquele registro, 404.
- Formato de erro `{"erro": {"codigo", "mensagem", "campos"}}`; `openapi.yml` regenerado (`python manage.py spectacular --file openapi.yml`) e tipos com `npm run gerar-tipos`.
- Frontend: oxlint `--deny-warnings`, Prettier, `tsc -b`; textos em português do Brasil; ícones lucide-react; nada de `dangerouslySetInnerHTML`.
- Arquivos **LF** (`.gitattributes`); edições por script com `newline="\n"`. Commits **sem** `Co-Authored-By` nem outra atribuição ao Claude.
- Comandos: `cd backend && .venv/Scripts/python -m pytest -q`; `cd frontend && npx vitest run && npm run lint && npm run typecheck`.

## Review Focus

1. **HEIC do iPhone chegando com `File.type` vazio** (comum no Windows) → o navegador aceita pela extensão `.heic`/`.heif` e o servidor decide. Teste na Task 5.
2. **Foto de celular em retrato (EXIF de orientação)** → salva "de pé", com `largura`/`altura` já da imagem girada. Teste na Task 1.
3. **Falha no meio do envio (a 2ª de 3 fotos dá erro)** → o registro e a 1ª foto ficam; "Tentar de novo" reenvia só a que falhou; fechar o modal não desfaz o registro. Teste na Task 5.
4. **Foto do registro de outra pessoa na tela cheia** → sem "Apagar esta foto"; pela API, 403. Testes nas Tasks 3 e 4.
5. **Registro só com foto, sem crítica** → aparece na página do restaurante e não aparece na aba Críticas do perfil. Teste na Task 3.

---

### Task 1: Módulo compartilhado de imagens e processamento da foto

**Files:**
- Create: `backend/config/imagens.py`, `backend/registros/fotos.py`
- Modify: `backend/contas/avatares.py` (passa a usar `config/imagens.py`, sem mudar o comportamento), `backend/requirements.txt` (`pillow-heif>=1.8`)
- Test: `backend/tests/test_fotos_processamento.py`; os testes de avatar em `backend/tests/test_perfil.py` guardam o comportamento do avatar

**Interfaces:**
- Produces:
  - `config.imagens.abrir_imagem(arquivo, *, tamanho_maximo: int, pixels_maximos: int, formatos: set[str], mensagem_formato: str, mensagem_tamanho: str) -> PIL.Image.Image` — levanta `serializers.ValidationError` com as mensagens do chamador (tamanho em bytes, formato, e "A imagem é grande demais (dimensões)."); devolve a imagem já com `ImageOps.exif_transpose` aplicado e em RGB/RGBA.
  - `config.imagens.regravar_webp(imagem: Image.Image, lado_maximo: int) -> ContentFile` — cópia reduzida (`thumbnail`), WebP qualidade 85, nome `"<uuid4 hex>.webp"`.
  - `registros.fotos.FotoProcessada` (dataclass): `imagem: ContentFile`, `miniatura: ContentFile`, `largura: int`, `altura: int` (da versão grande).
  - `registros.fotos.processar_foto(arquivo) -> FotoProcessada`, com `TAMANHO_MAXIMO = 10 * 1024 * 1024`, `PIXELS_MAXIMOS = 40_000_000`, `LADO_GRANDE = 1600`, `LADO_MINIATURA = 480`, `FORMATOS = {"JPEG", "PNG", "WEBP", "HEIF"}` e as mensagens das Global Constraints.
  - `pillow_heif.register_heif_opener()` chamado uma vez em `config/imagens.py` (no import).

- [ ] **Step 1: Escrever os testes que falham** em `tests/test_fotos_processamento.py`, gerando imagens com Pillow em memória (um helper `arquivo(formato, tamanho, exif=None)` como o `imagem()` de `test_perfil.py`; HEIC gerado com `format="HEIF"` depois de `register_heif_opener()`):

```python
@pytest.mark.parametrize("formato", ["JPEG", "PNG", "WEBP", "HEIF"])
def test_formatos_aceitos_viram_duas_versoes_webp(formato):
    foto = processar_foto(arquivo(formato, (3200, 2400)))
    for versao, lado in [(foto.imagem, 1600), (foto.miniatura, 480)]:
        with Image.open(versao) as salva:
            assert salva.format == "WEBP"
            assert max(salva.size) == lado
    assert (foto.largura, foto.altura) == (1600, 1200)
    assert foto.imagem.name != foto.miniatura.name and foto.imagem.name.endswith(".webp")

def test_foto_pequena_nao_e_ampliada():
    foto = processar_foto(arquivo("JPEG", (800, 600)))
    assert (foto.largura, foto.altura) == (800, 600)

def test_exif_e_gps_sao_removidos(): ...          # exif com 0x010F e GPS (0x8825) → getexif() vazio nas duas versões

def test_retrato_do_celular_fica_de_pe():         # Review Focus 2
    exif = Image.Exif(); exif[0x0112] = 6         # orientação: girar 90°
    foto = processar_foto(arquivo("JPEG", (2000, 1000), exif=exif))
    assert (foto.largura, foto.altura) == (800, 1600)

def test_maior_que_10_mb_e_recusado(): ...         # "A imagem deve ter no máximo 10 MB."
def test_acima_do_limite_de_pixels_e_recusado(monkeypatch): ...  # PIXELS_MAXIMOS reduzido a 1_000_000 no teste
    # e imagem 1200 x 1000 → "A imagem é grande demais (dimensões)." (gerar 40 MP de verdade pesaria na memória)
@pytest.mark.parametrize("conteudo", ["GIF", "texto"])
def test_formato_nao_aceito(conteudo): ...         # "Envie uma imagem JPG, PNG, WebP ou HEIC."
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && .venv/Scripts/python -m pip install "pillow-heif>=1.8" && .venv/Scripts/python -m pytest tests/test_fotos_processamento.py -q`
Expected: erro de importação (`registros.fotos` não existe).

- [ ] **Step 3: Implementar** `config/imagens.py`, `registros/fotos.py` e reescrever `contas/avatares.processar_avatar` em cima de `abrir_imagem` + `regravar_webp` (mesmos limites e mensagens de hoje: 2 MB, 12 MP, JPG/PNG/WebP, 512 px). O limite de pixels é checado **antes** de `load()`, como hoje, contra bombas de descompressão.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && .venv/Scripts/python -m pytest -q && .venv/Scripts/ruff check . && .venv/Scripts/ruff format --check .`
Expected: tudo passa (os novos e os de avatar).

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat: processamento de fotos em WebP, com módulo de imagens compartilhado com o avatar"
```

---

### Task 2: Tabela FotoRegistro, arquivos apagados e fotos nos registros

**Files:**
- Modify: `backend/registros/models.py` (`FotoRegistro`), `backend/registros/signals.py` (apagar arquivos), `backend/registros/admin.py` (inline com miniatura), `backend/registros/serializers.py` (`FotoSerializer`, campo `fotos`), `backend/registros/views.py` (`registros_com_relacoes` com `prefetch_related("fotos")`), `backend/tests/factories.py` (`FotoRegistroFactory`)
- Create: `backend/registros/migrations/000X_fotoregistro.py` (gerada)
- Test: `backend/tests/test_fotos_modelo.py`

**Interfaces:**
- Consumes: `processar_foto` (Task 1) — a factory usa um `FotoProcessada` real para ter arquivos no disco.
- Produces:
  - `registros.models.FotoRegistro`: `registro` (FK `Registro`, `CASCADE`, `related_name="fotos"`), `imagem` e `miniatura` (`ImageField(upload_to="fotos/")`), `largura`, `altura` (`PositiveIntegerField`), `criada_em` (`auto_now_add`); `Meta.ordering = ["criada_em", "id"]`; constante `MAXIMO_FOTOS_POR_REGISTRO = 4` em `registros/models.py`.
  - `FotoSerializer` (esquema OpenAPI `Foto`): `id`, `imagem`, `miniatura` (URLs absolutas, como o avatar), `largura`, `altura`; todos só leitura.
  - `RegistroSerializer.fotos`: `FotoSerializer(many=True, read_only=True)`.
  - `tests.factories.FotoRegistroFactory(registro)`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/test_fotos_modelo.py` (com a fixture `midia_temporaria` de `test_perfil.py`, levada para `conftest.py` sem `autouse`):

```python
def test_apagar_foto_apaga_os_dois_arquivos(midia_temporaria): ...     # imagem.path e miniatura.path deixam de existir
def test_apagar_registro_apaga_os_arquivos_das_fotos(midia_temporaria): ...
def test_excluir_conta_apaga_os_arquivos_das_fotos(api_logado, usuario, midia_temporaria): ...  # POST /eu/excluir
def test_registro_traz_as_fotos_na_ordem_do_envio(api, midia_temporaria):
    registro = RegistroFactory()
    primeira, segunda = FotoRegistroFactory(registro=registro), FotoRegistroFactory(registro=registro)
    fotos = api.get(f"/api/v1/registros/{registro.id}").json()["fotos"]
    assert [f["id"] for f in fotos] == [primeira.id, segunda.id]
    assert set(fotos[0]) == {"id", "imagem", "miniatura", "largura", "altura"}
    assert fotos[0]["miniatura"].startswith("http")
def test_diario_com_fotos_nao_faz_uma_consulta_por_registro(api, django_assert_max_num_queries, midia_temporaria): ...
    # 3 registros com 2 fotos cada: o mesmo número de consultas que com 1 registro
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && .venv/Scripts/python -m pytest tests/test_fotos_modelo.py -q`
Expected: erro de importação (`FotoRegistroFactory` / `FotoRegistro` inexistentes).

- [ ] **Step 3: Implementar** o modelo e a migração (`makemigrations registros`); o receptor `post_delete` de `FotoRegistro` que chama `instance.imagem.delete(save=False)` e `instance.miniatura.delete(save=False)`; `FotoRegistroInline` (`TabularInline`, só leitura, com uma coluna de miniatura via `format_html('<img src="{}" height="80">', foto.miniatura.url)`, `extra = 0`, `can_delete = True`) em `RegistroAdmin`; o serializer e o `prefetch_related("fotos")`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && .venv/Scripts/python -m pytest -q && .venv/Scripts/ruff check . && .venv/Scripts/ruff format --check .`
Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat: tabela de fotos do registro, com arquivos apagados junto"
```

---

### Task 3: API para enviar e apagar fotos

**Files:**
- Create: `backend/registros/views_fotos.py`
- Modify: `backend/registros/urls.py`, `backend/config/settings.py` (`"fotos": "60/hour"` em `DEFAULT_THROTTLE_RATES`), `backend/lugares/views.py` (`RegistrosDoRestauranteView`), `backend/openapi.yml` (regenerado)
- Test: `backend/tests/test_fotos_api.py`, `backend/tests/test_restaurante_detalhe.py` (ou o arquivo dos registros do restaurante)

**Interfaces:**
- Consumes: `processar_foto` (Task 1); `FotoRegistro`, `MAXIMO_FOTOS_POR_REGISTRO`, `FotoSerializer`, `registros_com_relacoes()` (Task 2); `ThrottleEscrita` de `config/api.py`.
- Produces:
  - `POST /api/v1/registros/<int:pk>/fotos` (multipart, campo `imagem`) → `201` com `FotoSerializer`; rota `fotos-do-registro`.
  - `DELETE /api/v1/registros/<int:pk>/fotos/<int:foto_id>` → `204`; rota `foto-do-registro`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/test_fotos_api.py` (fixture `midia_temporaria`):

```python
def test_dono_envia_foto(api_logado, usuario, midia_temporaria):
    registro = RegistroFactory(usuario=usuario)
    resposta = api_logado.post(URL.format(registro.id), {"imagem": arquivo("JPEG", (2000, 1500))}, format="multipart")
    assert resposta.status_code == 201
    assert resposta.json()["largura"] == 1600 and registro.fotos.count() == 1

def test_anonimo_nao_envia(api, midia_temporaria): ...                 # 401
def test_outra_pessoa_nao_envia(api_logado, midia_temporaria): ...     # registro de outro → 403
def test_registro_de_suspenso_ou_inexistente(api_logado, midia_temporaria): ...  # 404
def test_quinta_foto_e_recusada(api_logado, usuario, midia_temporaria):
    # 4 fotos já existentes → 400, erro["campos"]["imagem"] == ["Cada visita pode ter até 4 fotos."]
def test_arquivo_invalido_da_erro_no_campo(api_logado, usuario, midia_temporaria): ...  # texto → mensagem de formato
def test_envio_de_fotos_e_limitado(api_logado, usuario, monkeypatch, midia_temporaria):
    # THROTTLE_RATES {"fotos": "2/min", ...} → [201, 201, 429]
def test_dono_apaga_foto(api_logado, usuario, midia_temporaria): ...   # 204 e a foto some
def test_outra_pessoa_nao_apaga(api_logado, midia_temporaria): ...     # 403  (Review Focus 4)
def test_foto_de_outro_registro_da_404(api_logado, usuario, midia_temporaria): ...
```

E para a página do restaurante e o perfil (Review Focus 5):

```python
def test_registro_so_com_foto_aparece_no_restaurante_e_nao_nas_criticas(api, midia_temporaria):
    registro = RegistroFactory(critica="")
    FotoRegistroFactory(registro=registro)
    ids_restaurante = [r["id"] for r in api.get(f"/api/v1/restaurantes/{registro.restaurante.slug}/registros").json()["results"]]
    ids_criticas = [r["id"] for r in api.get(f"/api/v1/usuarios/{registro.usuario.username}/criticas").json()["results"]]
    assert registro.id in ids_restaurante and registro.id not in ids_criticas
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && .venv/Scripts/python -m pytest tests/test_fotos_api.py -q`
Expected: 404 nas rotas novas.

- [ ] **Step 3: Implementar**
  - `FotosDoRegistroView(APIView).post`: `IsAuthenticated`, `ThrottleEscrita` com `throttle_scope = "fotos"`, `parser_classes = [MultiPartParser]`; registro por `get_object_or_404(registros_com_relacoes(), pk=pk)`; dono senão `PermissionDenied("Só o autor pode alterar este registro.")`; dentro de `transaction.atomic()`, `Registro.objects.select_for_update().get(pk=...)` e contagem das fotos antes de gravar (dois envios ao mesmo tempo não passam de 4); erros de `processar_foto` e do limite como `ValidationError({"imagem": [...]})`. `extend_schema` com `request={"multipart/form-data": {"type": "object", "properties": {"imagem": {"type": "string", "format": "binary"}}, "required": ["imagem"]}}` e `responses={201: FotoSerializer}`.
  - `FotoDoRegistroView(APIView).delete`: `IsAuthenticated`, `ThrottleEscrita` com `throttle_scope = "escrita"`; mesma checagem de registro e dono; foto por `get_object_or_404(registro.fotos, pk=foto_id)`.
  - `RegistrosDoRestauranteView`: trocar `.exclude(critica="")` por `.filter(~Q(critica="") | Exists(FotoRegistro.objects.filter(registro=OuterRef("pk"))))`.
  - Regenerar: `cd backend && .venv/Scripts/python manage.py spectacular --file openapi.yml`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && .venv/Scripts/python -m pytest -q && .venv/Scripts/ruff check . && .venv/Scripts/ruff format --check .`
Expected: tudo passa, inclusive o teste do `openapi.yml` versionado.

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "feat: API para enviar e apagar fotos de uma visita"
```

---

### Task 4: Miniaturas no cartão de registro e tela cheia

**Files:**
- Create: `frontend/src/registros/MiniaturasFotos.tsx`, `frontend/src/registros/TelaCheiaFotos.tsx`, `frontend/src/registros/MiniaturasFotos.test.tsx`
- Modify: `frontend/src/api/esquema.d.ts` (gerado), `frontend/src/api/tipos.ts` (`export type Foto = Esquemas["Foto"]`), `frontend/src/testes/dados.ts` (`registro()` com `fotos: []`; `foto(sobrescrever)`), `frontend/src/componentes/CartaoRegistro.tsx`

**Interfaces:**
- Consumes: `Registro.fotos` e `DELETE /registros/{id}/fotos/{foto_id}` (Tasks 2–3).
- Produces: `MiniaturasFotos({ registro }: { registro: Registro })` (nada quando `fotos` está vazio); `TelaCheiaFotos({ registro, inicial, aberto, aoMudarAberto })`; fixture `foto(sobrescrever?: Partial<Foto>): Foto`.

- [ ] **Step 1: Regenerar os tipos** (`cd frontend && npm run gerar-tipos`), acrescentar o tipo e as fixtures.

- [ ] **Step 2: Escrever os testes que falham** em `MiniaturasFotos.test.tsx` (renderizando o diário de `/u/ana` com MSW, como `Perfil.test.tsx`):

```tsx
test("mostra as miniaturas das fotos do registro", async () => {
  // registro com 2 fotos → 2 botões "Ver foto 1 de 2" e "Ver foto 2 de 2" com <img alt=""> da miniatura
});
test("tocar numa miniatura abre a tela cheia na foto certa e navega", async () => {
  // clicar "Ver foto 2 de 2" → dialog com a imagem grande 2; "Foto anterior" → imagem 1; texto "1 / 2"
});
test("o dono apaga a foto com confirmação", async () => {
  // usuario = eu (ana); "Apagar esta foto" → "Apagar" no diálogo de confirmação → DELETE na foto certa;
  // a consulta do diário é recarregada
});
test("no registro de outra pessoa não há como apagar", async () => {   // Review Focus 4
  // anônimo ou outro usuário → sem botão "Apagar esta foto"
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/registros/MiniaturasFotos.test.tsx`
Expected: FAIL (componentes inexistentes).

- [ ] **Step 4: Implementar**
  - `MiniaturasFotos`: linha de botões quadrados 64 px (`object-cover`, `rounded-lg`), cada um com `aria-label="Ver foto N de T"`, `<img alt="" loading="lazy" width height>`; abre `TelaCheiaFotos`.
  - `TelaCheiaFotos`: `Dialog` do Radix em tela cheia sobre fundo escuro; `Dialog.Title` "Fotos de {usuário} em {restaurante}" (visualmente oculto); imagem grande com `alt="Foto N de T de {restaurante}"`; botões "Foto anterior"/"Próxima foto" (e setas do teclado), contador "N / T"; para o dono, "Apagar esta foto" com uma confirmação (`Dialog` interno, botões "Cancelar" e "Apagar"), que chama o DELETE e invalida `["diario"]`, `["criticas"]`, `["restaurante"]` e `["perfil"]`, fechando a tela cheia se não sobrar foto.
  - `CartaoRegistro`: `<MiniaturasFotos registro={registro} />` depois da crítica.

- [ ] **Step 5: Rodar e ver passar**

Run: `cd frontend && npx vitest run && npm run lint && npm run typecheck`
Expected: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend && git commit -m "feat: miniaturas e tela cheia das fotos das visitas"
```

---

### Task 5: Campo de fotos no "Registrar visita"

**Files:**
- Create: `frontend/src/util/fotos.ts`, `frontend/src/util/fotos.test.ts`, `frontend/src/registros/CampoFotos.tsx`
- Modify: `frontend/src/registros/RegistrarVisita.tsx`, `frontend/src/registros/RegistrarVisita.test.tsx`

**Interfaces:**
- Consumes: `POST /registros/{id}/fotos` (Task 3); o `RegistroSerializer` devolvido pelo `POST /registros` traz o `id`.
- Produces:
  - `util/fotos.ts`: `TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024`, `MAXIMO_FOTOS = 4`, `TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]`, `validarFoto(arquivo: File): string | null` (mesmas mensagens do backend; com `type` vazio, decide pela extensão `.jpg .jpeg .png .webp .heic .heif`).
  - `CampoFotos({ fotos, aoMudar, desabilitado })`, com `fotos: File[]`.

- [ ] **Step 1: Escrever os testes que falham**
  - `util/fotos.test.ts`:

```ts
test.each([
  ["IMG_1.HEIC", ""], ["foto.heif", ""], ["prato.jpg", "image/jpeg"], ["prato.webp", "image/webp"],
])("aceita %s", (nome, tipo) => expect(validarFoto(new File([new Uint8Array(10)], nome, { type: tipo }))).toBeNull());  // Review Focus 1
test("recusa GIF", ...)            // "Envie uma imagem JPG, PNG, WebP ou HEIC."
test("recusa acima de 10 MB", ...) // "A imagem deve ter no máximo 10 MB."
```

  - `RegistrarVisita.test.tsx`:

```tsx
test("salva a visita e envia as fotos uma por vez, com progresso", async () => {
  // 2 fotos escolhidas no campo "Fotos (até 4)" → POST /registros e depois 2 POST /registros/1/fotos, em sequência;
  // durante o envio aparece "Enviando fotos… 1 de 2"; no fim o modal fecha
});
test("não deixa escolher mais de 4 fotos", async () => {
  // escolher 5 → só 4 ficam e aparece "Cada visita pode ter até 4 fotos."
});
test("tirar uma foto antes de salvar", async () => { /* botão "Tirar foto 1" */ });
test("falha no meio: registro fica salvo e só a foto que falhou é reenviada", async () => {  // Review Focus 3
  // 3 fotos; a 2ª responde 500 na primeira tentativa → o modal continua aberto com "Não foi possível enviar 1 foto."
  // e o botão "Tentar de novo"; a 1ª passada faz 3 POSTs de foto (a 2ª falha), e "Tentar de novo" faz só mais 1,
  // o da 2ª foto, e fecha;
  // o POST /registros aconteceu uma vez só
});
test("fechar depois de uma falha mantém o registro", async () => {
  // "Fechar" com uma foto pendente → modal fecha, consultas do diário invalidadas, sem novo POST /registros
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/util/fotos.test.ts src/registros/RegistrarVisita.test.tsx`
Expected: FAIL (módulo e campo inexistentes).

- [ ] **Step 3: Implementar**
  - `CampoFotos`: rótulo "Fotos (até 4)", `input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple` (visualmente oculto, acionado por um botão "Adicionar foto" enquanto houver menos de 4), prévias 64 px com `URL.createObjectURL` (liberadas com `revokeObjectURL`), cada uma com o botão "Tirar foto N"; mensagens de `validarFoto` e do limite abaixo do campo.
  - `RegistrarVisita`: depois do `POST /registros`, se houver fotos, o modal passa a um estado "enviando": envia uma por vez com `api.POST("/api/v1/registros/{id}/fotos", { params, body: formData })` (o cast como no avatar em `Configuracoes.tsx`), mostrando "Enviando fotos… N de T". Guarda quais falharam; se alguma falhar, mostra "Não foi possível enviar N foto(s)." com "Tentar de novo" (reenvia só as que falharam) e "Fechar". Ao terminar (ou fechar), invalida as chaves que já invalida hoje e fecha. O botão "Salvar" continua protegido contra clique duplo.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && npx vitest run && npm run lint && npm run typecheck`
Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add frontend && git commit -m "feat: fotos no registrar visita, enviadas uma por vez com nova tentativa"
```

---

### Task 6: Ponta a ponta e verificação no celular

**Files:**
- Modify: `frontend/e2e/fluxo-principal.spec.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–5.

- [ ] **Step 1: No registro de visita do teste de ponta a ponta**, anexar uma foto gerada no próprio teste (`page.setInputFiles` com um PNG em memória, `buffer` de um canvas ou de bytes fixos de um PNG 200×150) antes de "Salvar"; depois, no diário de `/u/<username>`, ver o botão "Ver foto 1 de 1", abrir a tela cheia e fechar. Em 375 px, o diário com a miniatura e o modal com o campo de fotos não rolam na horizontal.

- [ ] **Step 2: Rodar com Docker, `runserver` e o Vite no ar** (o `iniciar.cmd` sobe tudo)

Run: `cd frontend && npm run test:e2e`
Expected: `1 passed`. (Limite de 3 cadastros por hora: se estourar, reinicie o `runserver`.)

- [ ] **Step 3: Verificação manual** no navegador do app, em 375 px e no desktop, temas claro e escuro: escolher fotos (inclusive uma de celular em retrato), ver o progresso, miniaturas no diário e na página do restaurante, tela cheia com navegação, apagar uma foto própria, e ausência do botão de apagar em registro de outra pessoa. Sem erros de JavaScript no console.

- [ ] **Step 4: Rodar tudo e fazer o commit**

Run: `cd backend && .venv/Scripts/python -m pytest -q` e `cd frontend && npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: tudo passa.

```bash
git add frontend && git commit -m "test: foto na visita no fluxo de ponta a ponta"
```
