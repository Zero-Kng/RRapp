# Fundação + Fase 0 (Base de Restaurantes) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o backend Django do rrapp com a fundação de segurança e configuração, os modelos Cidade/Categoria/Restaurante e o pipeline que extrai, importa e mede a cobertura dos restaurantes do Rio de Janeiro a partir da base FSQ Open Source Places.

**Architecture:** Monorepo com `backend/` (Django 6). O pipeline de dados tem duas etapas desacopladas: (1) `extrair_fsq` usa DuckDB para filtrar a base gigante da Foursquare (Parquet) até um arquivo Parquet pequeno com os restaurantes da região; (2) `importar_restaurantes` lê esse arquivo, calcula o bairro de cada ponto com o mapa oficial de bairros (GeoJSON + Shapely) e faz *upsert* idempotente no PostgreSQL. Um relatório de cobertura decide se a base serve (go/no-go da Fase 0).

**Tech Stack:** Python 3.14, Django 6.0, PostgreSQL 17 (Docker), django-environ, psycopg 3, argon2-cffi, DuckDB, Shapely 2, pytest + pytest-django + factory_boy, ruff, bandit, pip-audit, GitHub Actions.

**Spec:** [`docs/superpowers/specs/2026-09-25-rrapp-design.md`](../specs/2026-09-25-rrapp-design.md) (detalhes em [`docs/design/`](../../design/))

## Global Constraints

- Python **3.14**; Django **>=6.0,<6.1**; PostgreSQL **17**.
- Nomes de domínio (modelos, campos, funções, comandos, mensagens) em **português**, sem acentos em identificadores.
- `LANGUAGE_CODE = "pt-br"`, `TIME_ZONE = "America/Sao_Paulo"`, `USE_TZ = True`.
- Todos os segredos via **variáveis de ambiente** (`backend/.env`, nunca versionado); `backend/.env.example` versionado sem valores reais.
- Hash de senhas: **Argon2** como primeiro hasher.
- URL do Admin **não é `/admin/`**: vem de `ADMIN_URL` (padrão local `admin-local/`).
- Prefixo de API: **`/api/v1/`**.
- Modelo de usuário **customizado** (`contas.Usuario`) desde a primeira migração.
- Restaurante: `fonte` + `id_externo` únicos em conjunto; `status` ∈ {`ativo`, `pendente`, `fechado`}; `faixa_preco` 1–4 ou nulo.
- Fonte dos dados importados: `fonte = "fsq_os"`.
- Slugs de restaurante nascem de `"<nome> <bairro>"` (ex.: `bar-do-mineiro-santa-teresa`) e **nunca mudam** depois de criados.
- Commits: mensagens em português no formato `tipo: descrição`, **sem linha `Co-Authored-By`**.
- Comandos do plano assumem **Git Bash no Windows** (venv ativado com `source .venv/Scripts/activate`). No PowerShell use `.venv\Scripts\Activate.ps1`.
- Todos os comandos Python rodam dentro de `backend/` com o venv ativado, salvo indicação.

## Review Focus

1. **Nomes sem caracteres latinos ou só com símbolos** (ex.: `日本料理`, `!!!`) geram slug vazio. Esperado: slug de reserva `restaurante`, `restaurante-2`… Teste na Task 3.
2. **Reimportação depois de uma correção manual no Admin** apaga o trabalho do moderador. Esperado: restaurantes com `bloquear_importacao=True` não são alterados, e um restaurante marcado `fechado` pela moderação não é reaberto. Testes na Task 6.
3. **Linha sem coordenadas** (latitude/longitude nulas). Esperado: sem mapa de bairros, o restaurante é criado sem coordenadas; com mapa, conta como "fora da cidade" em vez de quebrar. Testes nas Tasks 4 e 6.
4. **Textos maiores que as colunas** (nome > 200, endereço > 255). Esperado: são truncados, em vez de derrubar a importação inteira (que é uma transação única). Teste na Task 6.
5. **GeoJSON com nome de propriedade diferente do esperado** (ex.: `NOME` em vez de `nome`). Esperado: erro claro listando as propriedades disponíveis, e não um `KeyError` cru. Teste na Task 4.

---

## Estrutura de arquivos

```
rrapp/ (raiz = C:\Dev\Projetos\RR App)
├── README.md                          # como rodar o projeto
├── docker-compose.yml                 # PostgreSQL local
├── .github/
│   ├── workflows/backend.yml          # CI
│   └── dependabot.yml
├── data/                              # (gitignored) Parquet e GeoJSON baixados
└── backend/
    ├── .env.example
    ├── pyproject.toml                 # config do pytest e do ruff
    ├── requirements.txt               # dependências de execução
    ├── requirements-dev.txt           # + ferramentas de teste/qualidade
    ├── manage.py
    ├── config/
    │   ├── settings.py                # configuração lida do ambiente
    │   ├── urls.py                    # admin (URL secreta) + /api/v1/saude
    │   └── views.py                   # endpoint de saúde
    ├── contas/
    │   ├── models.py                  # Usuario (customizado)
    │   └── admin.py
    ├── lugares/
    │   ├── models.py                  # Cidade, Categoria, Restaurante
    │   ├── admin.py                   # moderação
    │   ├── slugs.py                   # gerar_slug_unico
    │   ├── bairros.py                 # LocalizadorDeBairros (ponto → bairro)
    │   ├── importacao.py              # importar_restaurantes (upsert idempotente)
    │   ├── cobertura.py               # gerar_relatorio
    │   ├── fsq/extracao.py            # extrair_restaurantes, ler_linhas (DuckDB)
    │   ├── migrations/0002_semear_rio.py
    │   └── management/commands/
    │       ├── extrair_fsq.py
    │       ├── importar_restaurantes.py
    │       └── relatorio_cobertura.py
    └── tests/
        ├── conftest.py                # fixture `rio`
        ├── factories.py               # CidadeFactory, CategoriaFactory, RestauranteFactory
        ├── helpers_fsq.py             # escreve Parquets de teste
        ├── test_saude.py
        ├── test_cidades.py
        ├── test_restaurantes_modelo.py
        ├── test_slugs.py
        ├── test_bairros.py
        ├── test_extracao.py
        ├── test_importacao.py
        ├── test_importar_comando.py
        ├── test_admin.py
        └── test_cobertura.py
```

---

### Task 1: Fundação do backend

**Files:**
- Create: `docker-compose.yml`, `README.md`
- Modify: `.gitignore` (acrescentar `staticfiles/`)
- Create: `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/pyproject.toml`, `backend/.env.example`
- Create (via `django-admin`/`startapp`, depois editar): `backend/manage.py`, `backend/config/settings.py`, `backend/config/urls.py`, `backend/config/views.py`, `backend/contas/models.py`, `backend/contas/admin.py`
- Test: `backend/tests/test_saude.py`

**Interfaces:**
- Consumes: nada
- Produces: `settings.ADMIN_URL: str` (termina com `/`); `contas.Usuario` (subclasse de `AbstractUser`, `email` único); rota `GET /api/v1/saude` → `{"status": "ok"}`; banco `rrapp` no Docker em `localhost:5432`.

- [ ] **Step 1: Criar o `docker-compose.yml` na raiz**

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: rrapp
      POSTGRES_USER: rrapp
      POSTGRES_PASSWORD: rrapp_local
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata: {}
```

Run: `docker compose up -d db` (na raiz; o Docker Desktop precisa estar aberto)
Expected: `Container ... Started`

- [ ] **Step 2: Criar dependências e configuração de ferramentas**

`backend/requirements.txt`:
```
Django>=6.0,<6.1
django-environ>=0.12
psycopg[binary]>=3.2
argon2-cffi>=23.1
duckdb>=1.3
shapely>=2.1
```

`backend/requirements-dev.txt`:
```
-r requirements.txt
pytest>=8.4
pytest-django>=4.11
factory_boy>=3.3
ruff>=0.12
bandit>=1.8
pip-audit>=2.9
```

`backend/pyproject.toml`:
```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings"
testpaths = ["tests"]
python_files = ["test_*.py"]

[tool.ruff]
line-length = 100
target-version = "py314"
extend-exclude = ["*/migrations/*"]

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "DJ", "S"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101", "S105", "S106", "S608"]
# SQL do DuckDB montado com valores escapados por _texto_sql (nunca vem de usuários do app)
"lugares/fsq/extracao.py" = ["S608"]
```

`backend/.env.example`:
```
DEBUG=True
SECRET_KEY=troque-por-uma-chave-local-qualquer
DATABASE_URL=postgres://rrapp:rrapp_local@localhost:5432/rrapp
ALLOWED_HOSTS=localhost,127.0.0.1
ADMIN_URL=admin-local/
```

Acrescentar ao `.gitignore` da raiz, na seção Python:
```
staticfiles/
```

- [ ] **Step 3: Criar o venv, instalar e gerar o projeto**

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements-dev.txt
cp .env.example .env
django-admin startproject config .
python manage.py startapp contas
rm contas/tests.py contas/views.py
mkdir tests
```
Expected: pastas `config/` e `contas/` criadas, `manage.py` em `backend/`.

- [ ] **Step 4: Substituir `backend/config/settings.py` inteiro**

```python
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
arquivo_env = BASE_DIR / ".env"
if arquivo_env.exists():
    environ.Env.read_env(arquivo_env)

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
ADMIN_URL = env("ADMIN_URL", default="admin-local/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "contas",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": env.db("DATABASE_URL")}

AUTH_USER_MODEL = "contas.Usuario"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Cabeçalhos de segurança (valem em qualquer ambiente)
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"

if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31_536_000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
```

- [ ] **Step 5: Escrever o modelo de usuário customizado**

`backend/contas/models.py`:
```python
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Usuário do rrapp. Os campos de perfil entram no plano da Fase 1."""

    email = models.EmailField("e-mail", unique=True)
```

`backend/contas/admin.py`:
```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from contas.models import Usuario

admin.site.register(Usuario, UserAdmin)
```

- [ ] **Step 6: Escrever os testes que devem falhar**

`backend/tests/test_saude.py`:
```python
import pytest
from django.contrib.auth import get_user_model


def test_saude_responde_ok(client):
    resposta = client.get("/api/v1/saude")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}


def test_saude_recusa_post(client):
    resposta = client.post("/api/v1/saude")

    assert resposta.status_code == 405


@pytest.mark.django_db
def test_usa_usuario_customizado():
    assert get_user_model()._meta.label == "contas.Usuario"


@pytest.mark.django_db
def test_email_de_usuario_e_unico():
    from django.db import IntegrityError

    Usuario = get_user_model()
    Usuario.objects.create_user("ana", "ana@example.com", "senha-forte-123")
    with pytest.raises(IntegrityError):
        Usuario.objects.create_user("ana2", "ana@example.com", "senha-forte-123")
```

- [ ] **Step 7: Gerar a migração do usuário e rodar os testes para ver falhar**

```bash
python manage.py makemigrations contas
pytest tests/test_saude.py -v
```
Expected: `test_saude_responde_ok` e `test_saude_recusa_post` FAIL com `404`; os dois testes de usuário PASS.

- [ ] **Step 8: Implementar o endpoint de saúde e as rotas**

`backend/config/views.py`:
```python
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def saude(request):
    return JsonResponse({"status": "ok"})
```

`backend/config/urls.py` (substituir inteiro):
```python
from django.conf import settings
from django.contrib import admin
from django.urls import path

from config.views import saude

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/saude", saude, name="saude"),
]
```

- [ ] **Step 9: Rodar os testes, o lint e migrar o banco local**

```bash
pytest -v
ruff format . && ruff check .
python manage.py migrate
```
Expected: 4 testes PASS; ruff sem erros; migrações aplicadas.

- [ ] **Step 10: Escrever o `README.md` da raiz**

```markdown
# rrapp

Rede social de reviews de restaurantes (inspirada no Letterboxd). Design em [`docs/`](docs/).

## Rodando o backend localmente

Pré-requisitos: Python 3.14, Docker Desktop, Git Bash.

    docker compose up -d db
    cd backend
    python -m venv .venv
    source .venv/Scripts/activate
    pip install -r requirements-dev.txt
    cp .env.example .env
    python manage.py migrate
    python manage.py runserver

- Saúde da API: http://localhost:8000/api/v1/saude
- Admin: http://localhost:8000/admin-local/ (crie um usuário com `python manage.py createsuperuser`)

## Testes

    cd backend && pytest
```

- [ ] **Step 11: Commit**

```bash
cd ..
git add .gitignore docker-compose.yml README.md backend
git commit -m "feat: fundação do backend Django com usuário customizado e endpoint de saúde"
```
Confira com `git status` que `backend/.env` e `backend/.venv/` **não** foram adicionados.

---

### Task 2: Cidade e semente do Rio de Janeiro

**Files:**
- Create (via `startapp`): `backend/lugares/`
- Modify: `backend/lugares/models.py`, `backend/config/settings.py` (INSTALLED_APPS)
- Create: `backend/lugares/migrations/0002_semear_rio.py`, `backend/tests/conftest.py`
- Test: `backend/tests/test_cidades.py`

**Interfaces:**
- Consumes: projeto da Task 1
- Produces: `lugares.models.Cidade(nome: str, estado: str[2], slug: str único)`; cidade `slug="rio-de-janeiro"` sempre existente após as migrações; fixture pytest `rio` → `Cidade`.

- [ ] **Step 1: Criar o app e registrá-lo**

```bash
cd backend
python manage.py startapp lugares
rm lugares/tests.py lugares/views.py
```

Em `backend/config/settings.py`, acrescentar `"lugares",` depois de `"contas",` em `INSTALLED_APPS`.

- [ ] **Step 2: Escrever os testes que devem falhar**

`backend/tests/conftest.py`:
```python
import pytest


@pytest.fixture
def rio(db):
    from lugares.models import Cidade

    return Cidade.objects.get(slug="rio-de-janeiro")
```

`backend/tests/test_cidades.py`:
```python
import pytest
from django.db import IntegrityError, transaction

from lugares.models import Cidade


def test_rio_de_janeiro_existe_apos_migracoes(rio):
    assert rio.nome == "Rio de Janeiro"
    assert rio.estado == "RJ"
    assert str(rio) == "Rio de Janeiro (RJ)"


@pytest.mark.django_db
def test_nome_e_estado_sao_unicos_juntos():
    Cidade.objects.create(nome="Niterói", estado="RJ", slug="niteroi")
    with pytest.raises(IntegrityError), transaction.atomic():
        Cidade.objects.create(nome="Niterói", estado="RJ", slug="niteroi-2")


@pytest.mark.django_db
def test_slug_e_unico():
    with pytest.raises(IntegrityError), transaction.atomic():
        Cidade.objects.create(nome="Outra", estado="SP", slug="rio-de-janeiro")
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `pytest tests/test_cidades.py -v`
Expected: FAIL com `ImportError: cannot import name 'Cidade'`

- [ ] **Step 4: Implementar o modelo**

`backend/lugares/models.py`:
```python
from django.db import models


class Cidade(models.Model):
    nome = models.CharField(max_length=100)
    estado = models.CharField("estado (UF)", max_length=2)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(fields=["nome", "estado"], name="cidade_nome_estado_unica"),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.estado})"
```

- [ ] **Step 5: Gerar a migração inicial e a migração de semente**

```bash
python manage.py makemigrations lugares
python manage.py makemigrations lugares --empty --name semear_rio
```

Substituir o conteúdo de `backend/lugares/migrations/0002_semear_rio.py`:
```python
from django.db import migrations


def criar_rio(apps, schema_editor):
    Cidade = apps.get_model("lugares", "Cidade")
    Cidade.objects.get_or_create(
        slug="rio-de-janeiro", defaults={"nome": "Rio de Janeiro", "estado": "RJ"}
    )


def remover_rio(apps, schema_editor):
    Cidade = apps.get_model("lugares", "Cidade")
    Cidade.objects.filter(slug="rio-de-janeiro").delete()


class Migration(migrations.Migration):
    dependencies = [("lugares", "0001_initial")]

    operations = [migrations.RunPython(criar_rio, remover_rio)]
```

- [ ] **Step 6: Rodar os testes**

Run: `pytest -v`
Expected: todos PASS (7 testes).

- [ ] **Step 7: Migrar o banco local e fazer commit**

```bash
python manage.py migrate
ruff format . && ruff check .
cd ..
git add backend
git commit -m "feat: modelo Cidade com semente do Rio de Janeiro"
```

---

### Task 3: Categoria, Restaurante e slugs únicos

**Files:**
- Create: `backend/lugares/slugs.py`, `backend/tests/factories.py`
- Modify: `backend/lugares/models.py`
- Test: `backend/tests/test_slugs.py`, `backend/tests/test_restaurantes_modelo.py`

**Interfaces:**
- Consumes: `Cidade` (Task 2), `settings.AUTH_USER_MODEL`
- Produces:
  - `lugares.slugs.gerar_slug_unico(modelo: type[Model], texto: str, *, max_length: int = 200, reserva: str = "restaurante") -> str`
  - `lugares.models.Categoria(fsq_id: str|None único, nome_original: str, nome: str, slug: str único)`
  - `lugares.models.Restaurante` com os campos `fonte, id_externo, slug, nome, endereco, bairro, cidade, latitude, longitude, categorias (M2M Categoria, related_name="restaurantes"), faixa_preco, status, sugerido_por, bloquear_importacao, nota_media, total_avaliacoes, criado_em, atualizado_em`
  - `Restaurante.Status.ATIVO|PENDENTE|FECHADO` (valores `"ativo"`, `"pendente"`, `"fechado"`)
  - `tests/factories.py`: `CidadeFactory`, `CategoriaFactory`, `RestauranteFactory`

- [ ] **Step 1: Escrever os testes de modelo que devem falhar**

`backend/tests/factories.py`:
```python
import factory

from lugares.models import Categoria, Cidade, Restaurante


class CidadeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cidade

    nome = factory.Sequence(lambda n: f"Cidade {n}")
    estado = "RJ"
    slug = factory.Sequence(lambda n: f"cidade-{n}")


class CategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Categoria

    fsq_id = factory.Sequence(lambda n: f"fsq-cat-{n}")
    nome = factory.Sequence(lambda n: f"Categoria {n}")
    nome_original = factory.SelfAttribute("nome")
    slug = factory.Sequence(lambda n: f"categoria-{n}")


class RestauranteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Restaurante

    nome = factory.Sequence(lambda n: f"Restaurante {n}")
    slug = factory.Sequence(lambda n: f"restaurante-{n}")
    bairro = "Botafogo"
    cidade = factory.SubFactory(CidadeFactory)
```

`backend/tests/test_restaurantes_modelo.py`:
```python
import pytest
from django.db import IntegrityError, transaction

from factories import CategoriaFactory, RestauranteFactory
from lugares.models import Restaurante


@pytest.mark.django_db
def test_restaurante_nasce_ativo_e_sem_avaliacoes():
    restaurante = RestauranteFactory(nome="Bar do Zé", bairro="Botafogo")

    assert restaurante.status == Restaurante.Status.ATIVO
    assert restaurante.total_avaliacoes == 0
    assert restaurante.nota_media is None
    assert restaurante.bloquear_importacao is False
    assert str(restaurante) == "Bar do Zé (Botafogo)"


@pytest.mark.django_db
def test_str_sem_bairro_mostra_so_o_nome():
    assert str(RestauranteFactory(nome="Bar do Zé", bairro="")) == "Bar do Zé"


@pytest.mark.django_db
def test_fonte_e_id_externo_sao_unicos_juntos():
    RestauranteFactory(fonte="fsq_os", id_externo="abc")
    with pytest.raises(IntegrityError), transaction.atomic():
        RestauranteFactory(fonte="fsq_os", id_externo="abc")


@pytest.mark.django_db
def test_varios_restaurantes_sem_id_externo_sao_permitidos():
    RestauranteFactory(fonte="", id_externo="")
    RestauranteFactory(fonte="", id_externo="")

    assert Restaurante.objects.count() == 2


@pytest.mark.django_db
def test_faixa_de_preco_fora_de_1_a_4_e_rejeitada_pelo_banco():
    with pytest.raises(IntegrityError), transaction.atomic():
        RestauranteFactory(faixa_preco=5)


@pytest.mark.django_db
def test_restaurante_tem_varias_categorias():
    restaurante = RestauranteFactory()
    japones, bar = CategoriaFactory(nome="Japonês"), CategoriaFactory(nome="Bar")

    restaurante.categorias.add(japones, bar)

    assert set(japones.restaurantes.all()) == {restaurante}
    assert restaurante.categorias.count() == 2
```

- [ ] **Step 2: Escrever os testes de slug que devem falhar**

`backend/tests/test_slugs.py`:
```python
import pytest

from factories import RestauranteFactory
from lugares.models import Restaurante
from lugares.slugs import gerar_slug_unico


@pytest.mark.django_db
def test_slug_simples():
    assert gerar_slug_unico(Restaurante, "Bar do Mineiro Santa Teresa") == (
        "bar-do-mineiro-santa-teresa"
    )


@pytest.mark.django_db
def test_slug_remove_acentos():
    assert gerar_slug_unico(Restaurante, "Feijoáda Café São João") == "feijoada-cafe-sao-joao"


@pytest.mark.django_db
def test_slug_repetido_ganha_sufixo_numerico():
    RestauranteFactory(slug="bar-do-ze-botafogo")
    RestauranteFactory(slug="bar-do-ze-botafogo-2")

    assert gerar_slug_unico(Restaurante, "Bar do Zé Botafogo") == "bar-do-ze-botafogo-3"


@pytest.mark.django_db
def test_texto_sem_letras_latinas_usa_reserva():
    assert gerar_slug_unico(Restaurante, "日本料理") == "restaurante"
    assert gerar_slug_unico(Restaurante, "!!!", reserva="categoria") == "categoria"


@pytest.mark.django_db
def test_reserva_repetida_tambem_ganha_sufixo():
    RestauranteFactory(slug="restaurante")

    assert gerar_slug_unico(Restaurante, "日本料理") == "restaurante-2"


@pytest.mark.django_db
def test_slug_respeita_tamanho_maximo_mesmo_com_sufixo():
    primeiro = gerar_slug_unico(Restaurante, "a" * 300, max_length=20)
    RestauranteFactory(slug=primeiro)
    segundo = gerar_slug_unico(Restaurante, "a" * 300, max_length=20)

    assert primeiro == "a" * 20
    assert segundo == "a" * 18 + "-2"
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `pytest tests/test_slugs.py tests/test_restaurantes_modelo.py -v`
Expected: FAIL com `ImportError` (`Categoria`, `Restaurante` ou `lugares.slugs` inexistentes)

- [ ] **Step 4: Implementar os modelos**

Acrescentar em `backend/lugares/models.py` (manter `Cidade`; ajustar os imports no topo):
```python
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


class Categoria(models.Model):
    # null (e não "") para permitir várias categorias criadas à mão sem violar o unique
    fsq_id = models.CharField(max_length=32, unique=True, null=True, blank=True)  # noqa: DJ001
    nome_original = models.CharField(max_length=120, blank=True)
    nome = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Restaurante(models.Model):
    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        PENDENTE = "pendente", "Pendente"
        FECHADO = "fechado", "Fechado"

    fonte = models.CharField(max_length=20, blank=True)
    id_externo = models.CharField(max_length=64, blank=True)
    slug = models.SlugField(max_length=220, unique=True)
    nome = models.CharField(max_length=200)
    endereco = models.CharField("endereço", max_length=255, blank=True)
    bairro = models.CharField(max_length=100, blank=True, db_index=True)
    cidade = models.ForeignKey(Cidade, on_delete=models.PROTECT, related_name="restaurantes")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    categorias = models.ManyToManyField(Categoria, blank=True, related_name="restaurantes")
    faixa_preco = models.PositiveSmallIntegerField(
        "faixa de preço",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ATIVO, db_index=True
    )
    sugerido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="restaurantes_sugeridos",
    )
    bloquear_importacao = models.BooleanField(
        default=False,
        help_text="Marque para que reimportações não sobrescrevam correções feitas à mão.",
    )
    nota_media = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    total_avaliacoes = models.PositiveIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["fonte", "id_externo"],
                condition=~Q(id_externo=""),
                name="restaurante_fonte_id_externo_unico",
            ),
            models.CheckConstraint(
                condition=Q(faixa_preco__isnull=True) | Q(faixa_preco__gte=1, faixa_preco__lte=4),
                name="restaurante_faixa_preco_1_a_4",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.bairro})" if self.bairro else self.nome
```

- [ ] **Step 5: Implementar `gerar_slug_unico`**

`backend/lugares/slugs.py`:
```python
from django.db.models import Model
from django.utils.text import slugify


def gerar_slug_unico(
    modelo: type[Model], texto: str, *, max_length: int = 200, reserva: str = "restaurante"
) -> str:
    """Gera um slug sem acentos, único no campo `slug` do modelo (sufixos -2, -3, ...)."""
    base = slugify(texto)[:max_length].strip("-") or reserva
    slug = base
    numero = 2
    while modelo.objects.filter(slug=slug).exists():
        sufixo = f"-{numero}"
        slug = f"{base[: max_length - len(sufixo)].rstrip('-')}{sufixo}"
        numero += 1
    return slug
```

- [ ] **Step 6: Gerar a migração e rodar os testes**

```bash
python manage.py makemigrations lugares
pytest -v
```
Expected: todos PASS.

- [ ] **Step 7: Lint, migrar e commit**

```bash
ruff format . && ruff check .
python manage.py migrate
cd ..
git add backend
git commit -m "feat: modelos Categoria e Restaurante com geração de slug único"
```

---

### Task 4: Localizador de bairros (coordenada → bairro)

**Files:**
- Create: `backend/lugares/bairros.py`
- Test: `backend/tests/test_bairros.py`

**Interfaces:**
- Consumes: nada do projeto (só Shapely)
- Produces: `lugares.bairros.LocalizadorDeBairros(geojson: dict, campo_nome: str = "nome")`, com `LocalizadorDeBairros.de_arquivo(caminho: Path, campo_nome: str = "nome") -> LocalizadorDeBairros` e `.bairro_de(latitude: float | None, longitude: float | None) -> str` (devolve `""` fora de qualquer bairro).

- [ ] **Step 1: Escrever os testes que devem falhar**

`backend/tests/test_bairros.py`:
```python
import json

import pytest

from lugares.bairros import LocalizadorDeBairros


def quadrado(lon_min, lat_min, lon_max, lat_max):
    return [
        [
            [lon_min, lat_min],
            [lon_max, lat_min],
            [lon_max, lat_max],
            [lon_min, lat_max],
            [lon_min, lat_min],
        ]
    ]


GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"nome": "Botafogo"},
            "geometry": {"type": "Polygon", "coordinates": quadrado(-43.20, -22.96, -43.18, -22.94)},
        },
        {
            "type": "Feature",
            "properties": {"nome": "Jardim Botânico"},
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [
                    quadrado(-43.18, -22.96, -43.16, -22.94),
                    quadrado(-43.10, -22.96, -43.08, -22.94),
                ],
            },
        },
    ],
}


@pytest.fixture
def localizador():
    return LocalizadorDeBairros(GEOJSON)


def test_ponto_dentro_de_poligono(localizador):
    assert localizador.bairro_de(-22.95, -43.19) == "Botafogo"


def test_ponto_na_segunda_parte_de_multipoligono(localizador):
    assert localizador.bairro_de(-22.95, -43.09) == "Jardim Botânico"


def test_ponto_fora_de_qualquer_bairro(localizador):
    assert localizador.bairro_de(-23.50, -43.50) == ""


def test_ponto_na_divisa_pertence_a_um_dos_vizinhos(localizador):
    assert localizador.bairro_de(-22.95, -43.18) in {"Botafogo", "Jardim Botânico"}


def test_coordenadas_nulas_nao_quebram(localizador):
    assert localizador.bairro_de(None, -43.19) == ""
    assert localizador.bairro_de(-22.95, None) == ""


def test_carrega_de_arquivo_utf8(tmp_path):
    caminho = tmp_path / "bairros.geojson"
    caminho.write_text(json.dumps(GEOJSON, ensure_ascii=False), encoding="utf-8")

    localizador = LocalizadorDeBairros.de_arquivo(caminho)

    assert localizador.bairro_de(-22.95, -43.17) == "Jardim Botânico"


def test_campo_de_nome_inexistente_explica_opcoes():
    with pytest.raises(ValueError, match="Disponíveis: nome"):
        LocalizadorDeBairros(GEOJSON, campo_nome="NOME")
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pytest tests/test_bairros.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'lugares.bairros'`

- [ ] **Step 3: Implementar**

`backend/lugares/bairros.py`:
```python
import json
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.strtree import STRtree


class LocalizadorDeBairros:
    """Descobre o bairro de uma coordenada a partir de um GeoJSON de limites (WGS84)."""

    def __init__(self, geojson: dict, campo_nome: str = "nome") -> None:
        geometrias = []
        nomes = []
        for feature in geojson.get("features", []):
            propriedades = feature.get("properties") or {}
            if campo_nome not in propriedades:
                disponiveis = ", ".join(sorted(propriedades)) or "nenhuma"
                raise ValueError(
                    f"Propriedade '{campo_nome}' não encontrada no GeoJSON. "
                    f"Disponíveis: {disponiveis}."
                )
            geometrias.append(shape(feature["geometry"]))
            nomes.append(str(propriedades[campo_nome]).strip())
        self._nomes = nomes
        self._arvore = STRtree(geometrias)

    @classmethod
    def de_arquivo(cls, caminho: Path, campo_nome: str = "nome") -> "LocalizadorDeBairros":
        with open(caminho, encoding="utf-8") as arquivo:
            return cls(json.load(arquivo), campo_nome)

    def bairro_de(self, latitude: float | None, longitude: float | None) -> str:
        if latitude is None or longitude is None:
            return ""
        ponto = Point(float(longitude), float(latitude))
        indices = self._arvore.query(ponto, predicate="intersects")
        if len(indices) == 0:
            return ""
        return self._nomes[int(min(indices))]
```

- [ ] **Step 4: Rodar os testes**

Run: `pytest tests/test_bairros.py -v`
Expected: 7 PASS

- [ ] **Step 5: Lint e commit**

```bash
ruff format . && ruff check .
cd ..
git add backend
git commit -m "feat: localizador de bairros por coordenada a partir de GeoJSON"
```

---

### Task 5: Extração da base FSQ com DuckDB

**Files:**
- Create: `backend/lugares/fsq/__init__.py` (vazio), `backend/lugares/fsq/extracao.py`
- Create: `backend/lugares/management/__init__.py`, `backend/lugares/management/commands/__init__.py` (vazios), `backend/lugares/management/commands/extrair_fsq.py`
- Create: `backend/tests/helpers_fsq.py`
- Test: `backend/tests/test_extracao.py`

**Interfaces:**
- Consumes: nada do projeto
- Produces:
  - `lugares.fsq.extracao.BBOX_RIO: tuple[float, float, float, float]` = `(lat_min, lon_min, lat_max, lon_max)`
  - `lugares.fsq.extracao.extrair_restaurantes(places: str, categorias: str, destino: Path, *, pais: str = "BR", bbox: tuple[float, float, float, float] = BBOX_RIO, hf_token: str | None = None) -> int`: grava o Parquet em `destino` e devolve o número de linhas
  - `lugares.fsq.extracao.ler_linhas(caminho: Path) -> Iterator[dict]`: dicts com as chaves `fsq_place_id, name, latitude, longitude, address, date_closed, fsq_category_ids, fsq_category_labels`
  - comando `python manage.py extrair_fsq --places ... --categorias ... --destino ... [--pais BR] [--bbox lat_min,lon_min,lat_max,lon_max]`, que lê `HF_TOKEN` do ambiente
  - `tests/helpers_fsq.py`: `escrever_places_brutos(caminho, linhas)`, `escrever_categorias(caminho, linhas)`, `escrever_extraido(caminho, linhas)`

- [ ] **Step 1: Escrever os helpers de teste**

`backend/tests/helpers_fsq.py`:
```python
from pathlib import Path

import duckdb

COLUNAS_EXTRAIDAS = [
    ("fsq_place_id", "VARCHAR"),
    ("name", "VARCHAR"),
    ("latitude", "DOUBLE"),
    ("longitude", "DOUBLE"),
    ("address", "VARCHAR"),
    ("date_closed", "DATE"),
    ("fsq_category_ids", "VARCHAR[]"),
    ("fsq_category_labels", "VARCHAR[]"),
]
COLUNAS_BRUTAS = COLUNAS_EXTRAIDAS + [("country", "VARCHAR"), ("region", "VARCHAR")]
COLUNAS_CATEGORIAS = [("category_id", "VARCHAR"), ("level1_category_name", "VARCHAR")]


def _escrever(caminho: Path, colunas: list[tuple[str, str]], linhas: list[dict]) -> Path:
    con = duckdb.connect()
    definicao = ", ".join(f"{nome} {tipo}" for nome, tipo in colunas)
    con.execute(f"CREATE TABLE t ({definicao})")
    marcadores = ", ".join("?" for _ in colunas)
    con.executemany(
        f"INSERT INTO t VALUES ({marcadores})",
        [[linha.get(nome) for nome, _ in colunas] for linha in linhas],
    )
    con.execute(f"COPY t TO '{caminho.as_posix()}' (FORMAT parquet)")
    con.close()
    return caminho


def escrever_places_brutos(caminho: Path, linhas: list[dict]) -> Path:
    return _escrever(caminho, COLUNAS_BRUTAS, linhas)


def escrever_categorias(caminho: Path, linhas: list[dict]) -> Path:
    return _escrever(caminho, COLUNAS_CATEGORIAS, linhas)


def escrever_extraido(caminho: Path, linhas: list[dict]) -> Path:
    return _escrever(caminho, COLUNAS_EXTRAIDAS, linhas)
```

- [ ] **Step 2: Escrever os testes que devem falhar**

`backend/tests/test_extracao.py`:
```python
from io import StringIO

import pytest
from django.core.management import call_command

from helpers_fsq import escrever_categorias, escrever_places_brutos
from lugares.fsq.extracao import extrair_restaurantes, ler_linhas

GASTRONOMIA = "Dining and Drinking"


def place(id_, *, lat=-22.95, lon=-43.19, pais="BR", ids=("c_bar",), rotulos=None):
    return {
        "fsq_place_id": id_,
        "name": f"Lugar {id_}",
        "latitude": lat,
        "longitude": lon,
        "address": "Rua A, 1",
        "date_closed": None,
        "fsq_category_ids": list(ids),
        "fsq_category_labels": rotulos or [f"{GASTRONOMIA} > Bar"],
        "country": pais,
        "region": "RJ",
    }


@pytest.fixture
def arquivos(tmp_path):
    places = escrever_places_brutos(
        tmp_path / "places.parquet",
        [
            place("dentro-bar"),
            place("dentro-loja", ids=("c_loja",), rotulos=["Retail > Loja"]),
            place("sao-paulo", lat=-23.55, lon=-46.63),
            place("outro-pais", pais="AR"),
            place(
                "dentro-misto",
                ids=("c_loja", "c_cafe"),
                rotulos=["Retail > Loja", f"{GASTRONOMIA} > Café"],
            ),
        ],
    )
    categorias = escrever_categorias(
        tmp_path / "categorias.parquet",
        [
            {"category_id": "c_bar", "level1_category_name": GASTRONOMIA},
            {"category_id": "c_cafe", "level1_category_name": GASTRONOMIA},
            {"category_id": "c_loja", "level1_category_name": "Retail"},
        ],
    )
    return places, categorias, tmp_path / "saida" / "rio.parquet"


def test_extrai_so_gastronomia_do_brasil_dentro_da_caixa(arquivos):
    places, categorias, destino = arquivos
    destino.parent.mkdir()

    total = extrair_restaurantes(str(places), str(categorias), destino)

    linhas = list(ler_linhas(destino))
    assert total == 2
    assert {linha["fsq_place_id"] for linha in linhas} == {"dentro-bar", "dentro-misto"}


def test_linhas_lidas_tem_as_colunas_esperadas(arquivos):
    places, categorias, destino = arquivos
    destino.parent.mkdir()
    extrair_restaurantes(str(places), str(categorias), destino)

    linha = next(item for item in ler_linhas(destino) if item["fsq_place_id"] == "dentro-bar")

    assert linha["name"] == "Lugar dentro-bar"
    assert linha["latitude"] == pytest.approx(-22.95)
    assert linha["date_closed"] is None
    assert linha["fsq_category_ids"] == ["c_bar"]
    assert linha["fsq_category_labels"] == [f"{GASTRONOMIA} > Bar"]


def test_comando_extrair_fsq_cria_pasta_e_informa_total(arquivos):
    places, categorias, destino = arquivos
    saida = StringIO()

    call_command(
        "extrair_fsq",
        "--places", str(places),
        "--categorias", str(categorias),
        "--destino", str(destino),
        stdout=saida,
    )

    assert destino.exists()
    assert "extraídos: 2" in saida.getvalue()
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `pytest tests/test_extracao.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'lugares.fsq'`

- [ ] **Step 4: Implementar a extração**

`backend/lugares/fsq/__init__.py`: arquivo vazio.

`backend/lugares/fsq/extracao.py`:
```python
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
```

- [ ] **Step 5: Implementar o comando**

`backend/lugares/management/__init__.py` e `backend/lugares/management/commands/__init__.py`: arquivos vazios.

`backend/lugares/management/commands/extrair_fsq.py`:
```python
import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from lugares.fsq.extracao import BBOX_RIO, extrair_restaurantes


def _bbox(texto: str) -> tuple[float, float, float, float]:
    partes = [float(parte) for parte in texto.split(",")]
    if len(partes) != 4:
        raise ValueError("use lat_min,lon_min,lat_max,lon_max")
    return partes[0], partes[1], partes[2], partes[3]


class Command(BaseCommand):
    help = "Filtra a base FSQ Open Source Places e grava os restaurantes da região em Parquet."

    def add_arguments(self, parser):
        parser.add_argument("--places", required=True, help="Parquet(s) de places (aceita * e hf://)")
        parser.add_argument("--categorias", required=True, help="Parquet(s) de categorias")
        parser.add_argument("--destino", required=True, type=Path)
        parser.add_argument("--pais", default="BR")
        parser.add_argument(
            "--bbox", type=_bbox, default=BBOX_RIO, help="lat_min,lon_min,lat_max,lon_max"
        )

    def handle(self, *args, **opcoes):
        destino: Path = opcoes["destino"]
        destino.parent.mkdir(parents=True, exist_ok=True)
        try:
            total = extrair_restaurantes(
                opcoes["places"],
                opcoes["categorias"],
                destino,
                pais=opcoes["pais"],
                bbox=opcoes["bbox"],
                hf_token=os.environ.get("HF_TOKEN"),
            )
        except Exception as erro:
            raise CommandError(f"Falha na extração: {erro}") from erro
        self.stdout.write(f"extraídos: {total}")
        self.stdout.write(f"arquivo: {destino}")
```

- [ ] **Step 6: Rodar os testes**

Run: `pytest tests/test_extracao.py -v`
Expected: 3 PASS

- [ ] **Step 7: Lint e commit**

```bash
ruff format . && ruff check .
cd ..
git add backend
git commit -m "feat: extração de restaurantes da base FSQ Open Source Places"
```

---

### Task 6: Importação idempotente de restaurantes

**Files:**
- Create: `backend/lugares/importacao.py`, `backend/lugares/management/commands/importar_restaurantes.py`
- Test: `backend/tests/test_importacao.py`, `backend/tests/test_importar_comando.py`

**Interfaces:**
- Consumes: `Cidade`, `Categoria`, `Restaurante`, `Restaurante.Status` (Tasks 2–3); `gerar_slug_unico` (Task 3); `LocalizadorDeBairros` (Task 4); `ler_linhas` e `tests/helpers_fsq.escrever_extraido` (Task 5)
- Produces:
  - `lugares.importacao.FONTE_FSQ = "fsq_os"`
  - `lugares.importacao.ResultadoImportacao` (dataclass de contadores int: `criados, atualizados, marcados_fechados, ignorados_sem_nome, ignorados_fora_da_cidade, ignorados_ja_fechados, ignorados_bloqueados`)
  - `lugares.importacao.importar_restaurantes(linhas: Iterable[dict], cidade: Cidade, localizador: LocalizaBairro | None = None) -> ResultadoImportacao`
  - comando `python manage.py importar_restaurantes --arquivo X.parquet --cidade <slug> [--bairros X.geojson] [--campo-bairro nome]`

- [ ] **Step 1: Escrever os testes da função que devem falhar**

`backend/tests/test_importacao.py`:
```python
import datetime

import pytest

from lugares.importacao import FONTE_FSQ, importar_restaurantes
from lugares.models import Categoria, Restaurante


class LocalizadorFalso:
    def __init__(self, bairro="Botafogo"):
        self.bairro = bairro

    def bairro_de(self, latitude, longitude):
        return "" if latitude is None or longitude is None else self.bairro


def linha(**alteracoes):
    base = {
        "fsq_place_id": "fsq-1",
        "name": "Bar do Zé",
        "latitude": -22.951234567,
        "longitude": -43.187654321,
        "address": "Rua Voluntários da Pátria, 10",
        "date_closed": None,
        "fsq_category_ids": ["c_bar", "c_loja"],
        "fsq_category_labels": ["Dining and Drinking > Bar", "Retail > Loja"],
    }
    base.update(alteracoes)
    return base


@pytest.mark.django_db
def test_cria_restaurante_novo(rio):
    resultado = importar_restaurantes([linha()], rio, LocalizadorFalso())

    restaurante = Restaurante.objects.get()
    assert resultado.criados == 1
    assert restaurante.fonte == FONTE_FSQ
    assert restaurante.id_externo == "fsq-1"
    assert restaurante.slug == "bar-do-ze-botafogo"
    assert restaurante.bairro == "Botafogo"
    assert restaurante.cidade == rio
    assert restaurante.status == Restaurante.Status.ATIVO
    assert str(restaurante.latitude) == "-22.951235"


@pytest.mark.django_db
def test_so_categorias_de_gastronomia_sao_associadas(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())

    categoria = Restaurante.objects.get().categorias.get()
    assert categoria.fsq_id == "c_bar"
    assert categoria.nome == "Bar"
    assert categoria.nome_original == "Bar"
    assert Categoria.objects.count() == 1


@pytest.mark.django_db
def test_reimportar_atualiza_sem_duplicar_e_mantem_slug(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())

    resultado = importar_restaurantes([linha(name="Bar do Zé Novo")], rio, LocalizadorFalso())

    restaurante = Restaurante.objects.get()
    assert resultado.atualizados == 1
    assert resultado.criados == 0
    assert restaurante.nome == "Bar do Zé Novo"
    assert restaurante.slug == "bar-do-ze-botafogo"
    assert Categoria.objects.count() == 1


@pytest.mark.django_db
def test_linha_sem_nome_e_ignorada(rio):
    resultado = importar_restaurantes([linha(name="   "), linha(name=None)], rio)

    assert resultado.ignorados_sem_nome == 2
    assert not Restaurante.objects.exists()


@pytest.mark.django_db
def test_fora_da_cidade_e_ignorado_quando_ha_mapa_de_bairros(rio):
    resultado = importar_restaurantes([linha()], rio, LocalizadorFalso(bairro=""))

    assert resultado.ignorados_fora_da_cidade == 1
    assert not Restaurante.objects.exists()


@pytest.mark.django_db
def test_sem_coordenadas_e_sem_mapa_cria_sem_coordenadas(rio):
    importar_restaurantes([linha(latitude=None, longitude=None)], rio)

    restaurante = Restaurante.objects.get()
    assert restaurante.latitude is None
    assert restaurante.bairro == ""
    assert restaurante.slug == "bar-do-ze"


@pytest.mark.django_db
def test_sem_coordenadas_com_mapa_conta_como_fora_da_cidade(rio):
    resultado = importar_restaurantes([linha(latitude=None)], rio, LocalizadorFalso())

    assert resultado.ignorados_fora_da_cidade == 1


@pytest.mark.django_db
def test_novo_ja_fechado_nao_e_criado(rio):
    resultado = importar_restaurantes(
        [linha(date_closed=datetime.date(2025, 1, 1))], rio, LocalizadorFalso()
    )

    assert resultado.ignorados_ja_fechados == 1
    assert not Restaurante.objects.exists()


@pytest.mark.django_db
def test_existente_que_fechou_e_marcado_fechado(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())

    resultado = importar_restaurantes(
        [linha(date_closed=datetime.date(2026, 5, 1))], rio, LocalizadorFalso()
    )

    assert resultado.marcados_fechados == 1
    assert Restaurante.objects.get().status == Restaurante.Status.FECHADO


@pytest.mark.django_db
def test_fechado_pela_moderacao_nao_e_reaberto(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())
    Restaurante.objects.update(status=Restaurante.Status.FECHADO)

    importar_restaurantes([linha()], rio, LocalizadorFalso())

    assert Restaurante.objects.get().status == Restaurante.Status.FECHADO


@pytest.mark.django_db
def test_restaurante_bloqueado_nao_e_alterado(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())
    Restaurante.objects.update(nome="Nome Corrigido", bloquear_importacao=True)

    resultado = importar_restaurantes([linha(name="Nome da Base")], rio, LocalizadorFalso())

    assert resultado.ignorados_bloqueados == 1
    assert Restaurante.objects.get().nome == "Nome Corrigido"


@pytest.mark.django_db
def test_textos_longos_sao_truncados(rio):
    importar_restaurantes([linha(name="B" * 300, address="R" * 400)], rio, LocalizadorFalso())

    restaurante = Restaurante.objects.get()
    assert len(restaurante.nome) == 200
    assert len(restaurante.endereco) == 255


@pytest.mark.django_db
def test_nomes_iguais_no_mesmo_bairro_ganham_slugs_diferentes(rio):
    importar_restaurantes(
        [linha(fsq_place_id="a"), linha(fsq_place_id="b")], rio, LocalizadorFalso()
    )

    assert set(Restaurante.objects.values_list("slug", flat=True)) == {
        "bar-do-ze-botafogo",
        "bar-do-ze-botafogo-2",
    }
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pytest tests/test_importacao.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'lugares.importacao'`

- [ ] **Step 3: Implementar a importação**

`backend/lugares/importacao.py`:
```python
from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from django.db import transaction

from lugares.models import Categoria, Cidade, Restaurante
from lugares.slugs import gerar_slug_unico

FONTE_FSQ = "fsq_os"
PREFIXO_GASTRONOMIA = "Dining and Drinking"


class LocalizaBairro(Protocol):
    def bairro_de(self, latitude: float | None, longitude: float | None) -> str: ...


@dataclass
class ResultadoImportacao:
    criados: int = 0
    atualizados: int = 0
    marcados_fechados: int = 0
    ignorados_sem_nome: int = 0
    ignorados_fora_da_cidade: int = 0
    ignorados_ja_fechados: int = 0
    ignorados_bloqueados: int = 0


def _cortar(texto: str | None, limite: int) -> str:
    return (texto or "").strip()[:limite]


def _coordenada(valor: float | None) -> Decimal | None:
    return None if valor is None else Decimal(str(round(float(valor), 6)))


def _categorias(ids: list[str] | None, rotulos: list[str] | None) -> list[Categoria]:
    categorias = []
    for fsq_id, rotulo in zip(ids or [], rotulos or [], strict=False):
        if not rotulo or not rotulo.startswith(PREFIXO_GASTRONOMIA):
            continue
        categoria = Categoria.objects.filter(fsq_id=fsq_id).first()
        if categoria is None:
            nome = _cortar(rotulo.split(" > ")[-1], 120)
            categoria = Categoria.objects.create(
                fsq_id=fsq_id,
                nome_original=nome,
                nome=nome,
                slug=gerar_slug_unico(Categoria, nome, max_length=140, reserva="categoria"),
            )
        categorias.append(categoria)
    return categorias


@transaction.atomic
def importar_restaurantes(
    linhas: Iterable[dict], cidade: Cidade, localizador: LocalizaBairro | None = None
) -> ResultadoImportacao:
    """Cria ou atualiza restaurantes a partir de linhas extraídas da base FSQ.

    Idempotente: a chave é (fonte, id_externo). Slugs nunca mudam depois de criados.
    """
    resultado = ResultadoImportacao()
    for linha in linhas:
        _importar_linha(linha, cidade, localizador, resultado)
    return resultado


def _importar_linha(
    linha: dict,
    cidade: Cidade,
    localizador: LocalizaBairro | None,
    resultado: ResultadoImportacao,
) -> None:
    nome = _cortar(linha.get("name"), 200)
    if not nome:
        resultado.ignorados_sem_nome += 1
        return

    latitude, longitude = linha.get("latitude"), linha.get("longitude")
    bairro = ""
    if localizador is not None:
        bairro = _cortar(localizador.bairro_de(latitude, longitude), 100)
        if not bairro:
            resultado.ignorados_fora_da_cidade += 1
            return

    fechado = linha.get("date_closed") is not None
    id_externo = _cortar(linha["fsq_place_id"], 64)
    restaurante = Restaurante.objects.filter(fonte=FONTE_FSQ, id_externo=id_externo).first()

    if restaurante is None:
        if fechado:
            resultado.ignorados_ja_fechados += 1
            return
        restaurante = Restaurante.objects.create(
            fonte=FONTE_FSQ,
            id_externo=id_externo,
            slug=gerar_slug_unico(Restaurante, f"{nome} {bairro}", max_length=220),
            nome=nome,
            endereco=_cortar(linha.get("address"), 255),
            bairro=bairro,
            cidade=cidade,
            latitude=_coordenada(latitude),
            longitude=_coordenada(longitude),
        )
        resultado.criados += 1
    else:
        if restaurante.bloquear_importacao:
            resultado.ignorados_bloqueados += 1
            return
        restaurante.nome = nome
        restaurante.endereco = _cortar(linha.get("address"), 255)
        restaurante.bairro = bairro
        restaurante.latitude = _coordenada(latitude)
        restaurante.longitude = _coordenada(longitude)
        if fechado and restaurante.status != Restaurante.Status.FECHADO:
            restaurante.status = Restaurante.Status.FECHADO
            resultado.marcados_fechados += 1
        restaurante.save()
        resultado.atualizados += 1

    restaurante.categorias.set(
        _categorias(linha.get("fsq_category_ids"), linha.get("fsq_category_labels"))
    )
```

- [ ] **Step 4: Rodar os testes da função**

Run: `pytest tests/test_importacao.py -v`
Expected: 13 PASS

- [ ] **Step 5: Escrever o teste do comando que deve falhar**

`backend/tests/test_importar_comando.py`:
```python
import json
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from helpers_fsq import escrever_extraido
from lugares.models import Restaurante

BOTAFOGO = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"nome": "Botafogo"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [[-43.20, -22.96], [-43.18, -22.96], [-43.18, -22.94], [-43.20, -22.94],
                     [-43.20, -22.96]]
                ],
            },
        }
    ],
}


def linha(id_, lat, lon):
    return {
        "fsq_place_id": id_,
        "name": f"Restaurante {id_}",
        "latitude": lat,
        "longitude": lon,
        "address": "Rua X",
        "date_closed": None,
        "fsq_category_ids": ["c_rest"],
        "fsq_category_labels": ["Dining and Drinking > Restaurant"],
    }


@pytest.fixture
def arquivos(tmp_path):
    parquet = escrever_extraido(
        tmp_path / "rio.parquet",
        [linha("dentro", -22.95, -43.19), linha("niteroi", -22.90, -43.10)],
    )
    geojson = tmp_path / "bairros.geojson"
    geojson.write_text(json.dumps(BOTAFOGO), encoding="utf-8")
    return parquet, geojson


def test_importa_de_ponta_a_ponta(rio, arquivos):
    parquet, geojson = arquivos
    saida = StringIO()

    call_command(
        "importar_restaurantes",
        "--arquivo", str(parquet),
        "--cidade", "rio-de-janeiro",
        "--bairros", str(geojson),
        stdout=saida,
    )

    restaurante = Restaurante.objects.get()
    assert restaurante.id_externo == "dentro"
    assert restaurante.bairro == "Botafogo"
    assert "criados: 1" in saida.getvalue()
    assert "ignorados_fora_da_cidade: 1" in saida.getvalue()


def test_cidade_inexistente_da_erro_claro(db, arquivos):
    parquet, _ = arquivos
    with pytest.raises(CommandError, match="não cadastrada"):
        call_command("importar_restaurantes", "--arquivo", str(parquet), "--cidade", "atlantida")


def test_arquivo_inexistente_da_erro_claro(rio, tmp_path):
    with pytest.raises(CommandError, match="não encontrado"):
        call_command(
            "importar_restaurantes",
            "--arquivo", str(tmp_path / "nao-existe.parquet"),
            "--cidade", "rio-de-janeiro",
        )


def test_campo_de_bairro_errado_da_erro_claro(rio, arquivos):
    parquet, geojson = arquivos
    with pytest.raises(CommandError, match="Disponíveis: nome"):
        call_command(
            "importar_restaurantes",
            "--arquivo", str(parquet),
            "--cidade", "rio-de-janeiro",
            "--bairros", str(geojson),
            "--campo-bairro", "NOME",
        )
```

- [ ] **Step 6: Rodar para ver falhar**

Run: `pytest tests/test_importar_comando.py -v`
Expected: FAIL com `CommandError: Unknown command: 'importar_restaurantes'`

- [ ] **Step 7: Implementar o comando**

`backend/lugares/management/commands/importar_restaurantes.py`:
```python
from dataclasses import asdict
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from lugares.bairros import LocalizadorDeBairros
from lugares.fsq.extracao import ler_linhas
from lugares.importacao import importar_restaurantes
from lugares.models import Cidade


class Command(BaseCommand):
    help = "Importa restaurantes de um Parquet gerado por `extrair_fsq`."

    def add_arguments(self, parser):
        parser.add_argument("--arquivo", required=True, type=Path)
        parser.add_argument("--cidade", required=True, help="slug da cidade (ex.: rio-de-janeiro)")
        parser.add_argument("--bairros", type=Path, help="GeoJSON (WGS84) com limites de bairros")
        parser.add_argument("--campo-bairro", default="nome", help="propriedade com o nome")

    def handle(self, *args, **opcoes):
        try:
            cidade = Cidade.objects.get(slug=opcoes["cidade"])
        except Cidade.DoesNotExist as erro:
            raise CommandError(f"Cidade '{opcoes['cidade']}' não cadastrada.") from erro

        arquivo: Path = opcoes["arquivo"]
        if not arquivo.exists():
            raise CommandError(f"Arquivo {arquivo} não encontrado.")

        localizador = None
        if opcoes["bairros"]:
            try:
                localizador = LocalizadorDeBairros.de_arquivo(
                    opcoes["bairros"], opcoes["campo_bairro"]
                )
            except (OSError, ValueError) as erro:
                raise CommandError(str(erro)) from erro

        resultado = importar_restaurantes(ler_linhas(arquivo), cidade, localizador)
        for campo, valor in asdict(resultado).items():
            self.stdout.write(f"{campo}: {valor}")
```

- [ ] **Step 8: Rodar todos os testes**

Run: `pytest -v`
Expected: todos PASS

- [ ] **Step 9: Lint e commit**

```bash
ruff format . && ruff check .
cd ..
git add backend
git commit -m "feat: importação idempotente de restaurantes com cálculo de bairro"
```

---

### Task 7: Admin para moderação dos restaurantes

**Files:**
- Modify: `backend/lugares/admin.py`
- Test: `backend/tests/test_admin.py`

**Interfaces:**
- Consumes: `Cidade`, `Categoria`, `Restaurante` (Tasks 2–3); `RestauranteFactory`, `CategoriaFactory` (Task 3); `settings.ADMIN_URL` (Task 1)
- Produces: telas de Admin em `/<ADMIN_URL>lugares/{cidade,categoria,restaurante}/`; categoria com `nome` editável direto na lista (para traduzir os nomes em inglês da base).

- [ ] **Step 1: Escrever os testes que devem falhar**

`backend/tests/test_admin.py`:
```python
import pytest

from factories import CategoriaFactory, RestauranteFactory


@pytest.fixture
def admin_logado(client, django_user_model):
    usuario = django_user_model.objects.create_superuser(
        "admin", "admin@example.com", "senha-forte-123"
    )
    client.force_login(usuario)
    return client


def url(settings, caminho):
    return f"/{settings.ADMIN_URL}{caminho}"


@pytest.mark.django_db
def test_lista_de_restaurantes_mostra_e_busca(admin_logado, settings):
    RestauranteFactory(nome="Bar do Zé", bairro="Botafogo")
    RestauranteFactory(nome="Cantina Italiana", bairro="Tijuca")

    resposta = admin_logado.get(url(settings, "lugares/restaurante/"), {"q": "Zé"})

    conteudo = resposta.content.decode()
    assert resposta.status_code == 200
    assert "Bar do Zé" in conteudo
    assert "Cantina Italiana" not in conteudo


@pytest.mark.django_db
def test_lista_de_restaurantes_filtra_por_status(admin_logado, settings):
    RestauranteFactory(nome="Aberto")
    RestauranteFactory(nome="Fechadinho", status="fechado")

    resposta = admin_logado.get(url(settings, "lugares/restaurante/"), {"status__exact": "fechado"})

    conteudo = resposta.content.decode()
    assert "Fechadinho" in conteudo
    assert "Aberto" not in conteudo


@pytest.mark.django_db
def test_pagina_de_edicao_do_restaurante_abre(admin_logado, settings):
    restaurante = RestauranteFactory()

    resposta = admin_logado.get(url(settings, f"lugares/restaurante/{restaurante.pk}/change/"))

    assert resposta.status_code == 200


@pytest.mark.django_db
def test_lista_de_categorias_permite_editar_nome(admin_logado, settings):
    CategoriaFactory(nome="Japanese Restaurant")

    resposta = admin_logado.get(url(settings, "lugares/categoria/"))

    assert resposta.status_code == 200
    assert 'name="form-0-nome"' in resposta.content.decode()


@pytest.mark.django_db
def test_lista_de_cidades_mostra_o_rio(admin_logado, settings):
    resposta = admin_logado.get(url(settings, "lugares/cidade/"))

    assert "Rio de Janeiro" in resposta.content.decode()
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pytest tests/test_admin.py -v`
Expected: FAIL com `404` (modelos não registrados no Admin)

- [ ] **Step 3: Implementar**

`backend/lugares/admin.py`:
```python
from django.contrib import admin

from lugares.models import Categoria, Cidade, Restaurante


@admin.register(Cidade)
class CidadeAdmin(admin.ModelAdmin):
    list_display = ("nome", "estado", "slug")
    search_fields = ("nome",)
    prepopulated_fields = {"slug": ("nome",)}


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("slug", "nome", "nome_original")
    list_display_links = ("slug",)
    list_editable = ("nome",)
    search_fields = ("nome", "nome_original")
    readonly_fields = ("fsq_id", "nome_original")


@admin.register(Restaurante)
class RestauranteAdmin(admin.ModelAdmin):
    list_display = ("nome", "bairro", "cidade", "status", "bloquear_importacao")
    list_filter = ("status", "cidade", "bloquear_importacao")
    list_select_related = ("cidade",)
    search_fields = ("nome", "bairro", "endereco")
    readonly_fields = (
        "fonte",
        "id_externo",
        "nota_media",
        "total_avaliacoes",
        "criado_em",
        "atualizado_em",
    )
    filter_horizontal = ("categorias",)
    raw_id_fields = ("sugerido_por",)
```

- [ ] **Step 4: Rodar os testes**

Run: `pytest -v`
Expected: todos PASS

- [ ] **Step 5: Lint e commit**

```bash
ruff format . && ruff check .
cd ..
git add backend
git commit -m "feat: telas de moderação de cidades, categorias e restaurantes no Admin"
```

---

### Task 8: Relatório de cobertura

**Files:**
- Create: `backend/lugares/cobertura.py`, `backend/lugares/management/commands/relatorio_cobertura.py`
- Test: `backend/tests/test_cobertura.py`

**Interfaces:**
- Consumes: `Cidade`, `Categoria`, `Restaurante` (Tasks 2–3); factories (Task 3); fixture `rio` (Task 2)
- Produces: `lugares.cobertura.gerar_relatorio(cidade: Cidade) -> dict` com as chaves `total: int`, `por_status: dict[str, int]`, `sem_bairro: int`, `top_bairros: list[tuple[str, int]]` (até 10), `top_categorias: list[tuple[str, int]]` (até 10); comando `python manage.py relatorio_cobertura --cidade <slug>`.

- [ ] **Step 1: Escrever os testes que devem falhar**

`backend/tests/test_cobertura.py`:
```python
from io import StringIO

import pytest
from django.core.management import call_command

from factories import CategoriaFactory, CidadeFactory, RestauranteFactory
from lugares.cobertura import gerar_relatorio
from lugares.models import Restaurante


@pytest.mark.django_db
def test_relatorio_conta_status_bairros_e_categorias(rio):
    japones = CategoriaFactory(nome="Japonês")
    boteco = CategoriaFactory(nome="Boteco")
    RestauranteFactory(cidade=rio, bairro="Botafogo").categorias.add(japones)
    RestauranteFactory(cidade=rio, bairro="Botafogo").categorias.add(japones, boteco)
    RestauranteFactory(cidade=rio, bairro="Tijuca")
    RestauranteFactory(cidade=rio, bairro="", status=Restaurante.Status.FECHADO)
    RestauranteFactory(cidade=CidadeFactory(), bairro="Centro").categorias.add(boteco)

    relatorio = gerar_relatorio(rio)

    assert relatorio["total"] == 4
    assert relatorio["por_status"] == {"ativo": 3, "fechado": 1}
    assert relatorio["sem_bairro"] == 1
    assert relatorio["top_bairros"] == [("Botafogo", 2), ("Tijuca", 1)]
    assert relatorio["top_categorias"] == [("Japonês", 2), ("Boteco", 1)]


@pytest.mark.django_db
def test_relatorio_de_cidade_vazia(rio):
    relatorio = gerar_relatorio(rio)

    assert relatorio == {
        "total": 0,
        "por_status": {},
        "sem_bairro": 0,
        "top_bairros": [],
        "top_categorias": [],
    }


@pytest.mark.django_db
def test_comando_imprime_relatorio(rio):
    RestauranteFactory(cidade=rio, bairro="Botafogo")
    saida = StringIO()

    call_command("relatorio_cobertura", "--cidade", "rio-de-janeiro", stdout=saida)

    texto = saida.getvalue()
    assert "total: 1" in texto
    assert "Botafogo: 1" in texto
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `pytest tests/test_cobertura.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'lugares.cobertura'`

- [ ] **Step 3: Implementar**

`backend/lugares/cobertura.py`:
```python
from django.db.models import Count

from lugares.models import Categoria, Cidade, Restaurante


def gerar_relatorio(cidade: Cidade) -> dict:
    restaurantes = Restaurante.objects.filter(cidade=cidade)
    por_status = restaurantes.values_list("status").annotate(n=Count("id")).order_by()
    top_bairros = (
        restaurantes.exclude(bairro="")
        .values_list("bairro")
        .annotate(n=Count("id"))
        .order_by("-n", "bairro")[:10]
    )
    top_categorias = (
        Categoria.objects.filter(restaurantes__cidade=cidade)
        .values_list("nome")
        .annotate(n=Count("restaurantes"))
        .order_by("-n", "nome")[:10]
    )
    return {
        "total": restaurantes.count(),
        "por_status": dict(por_status),
        "sem_bairro": restaurantes.filter(bairro="").count(),
        "top_bairros": list(top_bairros),
        "top_categorias": list(top_categorias),
    }
```

`backend/lugares/management/commands/relatorio_cobertura.py`:
```python
from django.core.management.base import BaseCommand, CommandError

from lugares.cobertura import gerar_relatorio
from lugares.models import Cidade


class Command(BaseCommand):
    help = "Mostra quantos restaurantes a cidade tem, por status, bairro e categoria."

    def add_arguments(self, parser):
        parser.add_argument("--cidade", required=True, help="slug da cidade")

    def handle(self, *args, **opcoes):
        try:
            cidade = Cidade.objects.get(slug=opcoes["cidade"])
        except Cidade.DoesNotExist as erro:
            raise CommandError(f"Cidade '{opcoes['cidade']}' não cadastrada.") from erro

        relatorio = gerar_relatorio(cidade)
        self.stdout.write(f"cidade: {cidade}")
        self.stdout.write(f"total: {relatorio['total']}")
        self.stdout.write(f"sem bairro: {relatorio['sem_bairro']}")
        for status, quantidade in relatorio["por_status"].items():
            self.stdout.write(f"status {status}: {quantidade}")
        self.stdout.write("bairros com mais restaurantes:")
        for bairro, quantidade in relatorio["top_bairros"]:
            self.stdout.write(f"  {bairro}: {quantidade}")
        self.stdout.write("categorias mais comuns:")
        for categoria, quantidade in relatorio["top_categorias"]:
            self.stdout.write(f"  {categoria}: {quantidade}")
```

- [ ] **Step 4: Rodar os testes**

Run: `pytest -v`
Expected: todos PASS

- [ ] **Step 5: Lint e commit**

```bash
ruff format . && ruff check .
cd ..
git add backend
git commit -m "feat: relatório de cobertura de restaurantes por cidade"
```

---

### Task 9: CI no GitHub Actions e Dependabot

**Files:**
- Create: `.github/workflows/backend.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: `backend/requirements-dev.txt`, `backend/pyproject.toml`, configurações de produção do `settings.py` (Task 1)
- Produces: pipeline que roda lint, testes, bandit, pip-audit, `check --deploy` e gitleaks em cada push/PR.

- [ ] **Step 1: Confirmar localmente que as verificações de segurança passam**

```bash
cd backend
bandit -q -r . -x ./tests,./.venv
pip-audit -r requirements.txt
DEBUG=False ALLOWED_HOSTS=api.rrapp.com.br \
  SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')" \
  python manage.py check --deploy --fail-level WARNING
```
Expected: bandit sem achados (se ele apontar `B608` em `lugares/fsq/extracao.py`, que é o SQL do DuckDB com valores escapados, acrescente `# nosec B608` ao fim da linha indicada e rode de novo); pip-audit `No known vulnerabilities found`; check `System check identified no issues`. Se o pip-audit apontar vulnerabilidade, atualize a versão mínima no `requirements.txt` e repita.

- [ ] **Step 2: Criar o workflow**

`.github/workflows/backend.yml`:
```yaml
name: backend

on:
  push:
    branches: [main]
  pull_request:

jobs:
  testes:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: rrapp
          POSTGRES_USER: rrapp
          POSTGRES_PASSWORD: rrapp_ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U rrapp"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DEBUG: "True"
      SECRET_KEY: chave-usada-apenas-no-ci
      DATABASE_URL: postgres://rrapp:rrapp_ci@localhost:5432/rrapp
      ADMIN_URL: painel-ci/
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with:
          python-version: "3.14"
          cache: pip
          cache-dependency-path: backend/requirements*.txt
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: ruff format --check .
      - run: pytest
      - run: bandit -q -r . -x ./tests
      - run: pip-audit -r requirements.txt
      - name: check --deploy
        env:
          DEBUG: "False"
          ALLOWED_HOSTS: api.rrapp.com.br
        run: |
          export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
          python manage.py check --deploy --fail-level WARNING

  segredos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: pip
    directory: /backend
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add .github
git commit -m "ci: testes, lint e verificações de segurança do backend no GitHub Actions"
```

O workflow roda de verdade quando o repositório for publicado no GitHub. Criar o repositório remoto é uma decisão do usuário e **não faz parte deste plano**: pergunte antes de criar ou fazer push.

---

### Task 10: Execução da Fase 0 com dados reais (go/no-go)

Esta task roda o pipeline com os dados reais e registra o resultado. **Ela exige ações do usuário** (contas e downloads), então o executor para e pede em cada ponto marcado com 👤.

**Files:**
- Create: `docs/design/fase0-resultados.md`
- Dados (gitignored): `data/fsq/`, `data/bairros-rio.geojson`, `data/rio-restaurantes.parquet`

**Interfaces:**
- Consumes: comandos `extrair_fsq` (Task 5), `importar_restaurantes` (Task 6), `relatorio_cobertura` (Task 8); Admin (Task 7)
- Produces: banco local com os restaurantes do Rio; documento de resultados com decisão go/no-go.

- [ ] **Step 1: 👤 Acesso à base FSQ**

Peça ao usuário para:
1. Criar/entrar numa conta no Hugging Face
2. Abrir https://huggingface.co/datasets/foursquare/fsq-os-places e aceitar os termos de acesso
3. Gerar um token de **leitura** em https://huggingface.co/settings/tokens

O token é colocado **pelo próprio usuário** no `backend/.env` (`HF_TOKEN=...`) ou exportado no terminal dele. O executor nunca digita nem registra o token.

- [ ] **Step 2: Descobrir a release mais recente**

Na aba "Files" do dataset, anote a pasta mais recente em `release/` (em 2026-09-25 era `dt=2026-09-15`).

- [ ] **Step 3: Extrair os restaurantes do Rio lendo direto do Hugging Face**

```bash
cd backend
export HF_TOKEN=...   # o próprio usuário executa esta linha
python manage.py extrair_fsq \
  --places "hf://datasets/foursquare/fsq-os-places/release/dt=2026-09-15/places/parquet/*.parquet" \
  --categorias "hf://datasets/foursquare/fsq-os-places/release/dt=2026-09-15/categories/parquet/*.parquet" \
  --destino ../data/rio-restaurantes.parquet
```
Expected: `extraídos: N`, com N na casa dos milhares.

**Se demorar demais ou falhar por rede:** a alternativa é baixar os Parquets de places para `data/fsq/`. São vários GB, então **👤 peça permissão ao usuário, informando o tamanho mostrado no Hugging Face**, antes de rodar:
```bash
pip install -U "huggingface_hub[cli]"
huggingface-cli download foursquare/fsq-os-places --repo-type dataset \
  --include "release/dt=2026-09-15/*" --local-dir ../data/fsq
```
e repita o comando com `--places "../data/fsq/release/dt=2026-09-15/places/parquet/*.parquet"` e o equivalente para `--categorias`.

- [ ] **Step 4: 👤 Obter o mapa de bairros do Rio**

Peça permissão ao usuário e baixe de https://www.data.rio (busque "Limite de Bairros") o arquivo **GeoJSON** para `data/bairros-rio.geojson`. Depois confira:

```bash
python -c "import json; d=json.load(open('../data/bairros-rio.geojson', encoding='utf-8')); f=d['features'][0]; print(len(d['features']), sorted(f['properties']), str(f['geometry']['coordinates'])[:80])"
```
Expected: cerca de 160 bairros; a lista de propriedades mostra o campo com o nome do bairro (ex.: `nome`); as coordenadas começam perto de `-43.x, -22.x`. **Se aparecerem números como `680000, 7460000`**, o arquivo está em UTM: baixe de novo escolhendo o sistema WGS84/EPSG:4326.

- [ ] **Step 5: Importar**

```bash
python manage.py importar_restaurantes \
  --arquivo ../data/rio-restaurantes.parquet \
  --cidade rio-de-janeiro \
  --bairros ../data/bairros-rio.geojson \
  --campo-bairro nome
```
(troque `nome` pelo campo descoberto no Step 4)
Expected: contadores impressos, com `criados` na casa dos milhares.

- [ ] **Step 6: Rodar de novo para provar a idempotência**

Repita o comando do Step 5.
Expected: `criados: 0` e `atualizados` igual ao `criados` da primeira execução.

- [ ] **Step 7: Relatório e amostra manual**

```bash
python manage.py relatorio_cobertura --cidade rio-de-janeiro
python manage.py createsuperuser
python manage.py runserver
```
👤 Peça ao usuário uma lista de **20 restaurantes do Rio que ele conhece** (misturando bairros e estilos) e procure cada um no Admin (`http://localhost:8000/admin-local/lugares/restaurante/`). Anote quantos foram encontrados e se o bairro está correto.

- [ ] **Step 8: Registrar o resultado**

Criar `docs/design/fase0-resultados.md` com os números reais:

```markdown
# Fase 0 — Resultados da base de restaurantes

> Executado em AAAA-MM-DD com a release `dt=...` da FSQ Open Source Places.

## Números

| Métrica | Valor |
|---|---|
| Extraídos (caixa do Rio, gastronomia) | |
| Criados | |
| Fora do município | |
| Já fechados (ignorados) | |
| Total ativo no Rio | |
| Sem bairro | |

## Top bairros e categorias

(colar a saída do `relatorio_cobertura`)

## Amostra manual

| Restaurante | Encontrado? | Bairro correto? |
|---|---|---|

## Critérios de go/no-go

- [ ] ≥ 2.000 restaurantes ativos no Rio
- [ ] ≥ 15 dos 20 restaurantes da amostra encontrados
- [ ] ≥ 90% dos encontrados com bairro correto

## Decisão

GO / NO-GO, com a justificativa. Em caso de NO-GO: plano B do SDD (semeadura manual dos bairros prioritários).

## Observações

(categorias em inglês que precisam de tradução, duplicatas percebidas, etc.)
```

- [ ] **Step 9: Commit**

```bash
cd ..
git add docs/design/fase0-resultados.md
git commit -m "docs: resultados da Fase 0 da base de restaurantes"
```

---

## Fora deste plano (vão para os próximos)

- **Plano da Fase 1:** DRF, JWT, cadastro/login, perfil (avatar, bio, cidade), busca de restaurantes com filtros, página do restaurante, Registro (diário + nota), frontend React, 2FA do Admin, arquivo de lock das dependências e medição de cobertura de testes.
- Tradução dos nomes de categoria (feita no Admin, pela lista editável da Task 7).
- Deploy (Render/Cloudflare) e domínio.
