# rrapp

Rede social de reviews de restaurantes (inspirada no Letterboxd). Design em [`docs/`](docs/).

## Rodando o backend localmente

Pré-requisitos: Python 3.14 e Docker Desktop (aberto).

O PostgreSQL do Docker usa a porta **5433**, porque a 5432 costuma estar ocupada por um PostgreSQL instalado no Windows.

### PowerShell

Um comando por linha. O Windows PowerShell não aceita `&&`.

    docker compose up -d db
    cd backend
    python -m venv .venv
    .venv\Scripts\python.exe -m pip install -r requirements-dev.txt
    copy .env.example .env
    .venv\Scripts\python.exe manage.py migrate
    .venv\Scripts\python.exe manage.py createsuperuser
    .venv\Scripts\python.exe manage.py runserver

### Git Bash

    docker compose up -d db
    cd backend
    python -m venv .venv
    source .venv/Scripts/activate
    pip install -r requirements-dev.txt
    cp .env.example .env
    python manage.py migrate
    python manage.py createsuperuser
    python manage.py runserver

### Endereços

- Saúde da API: http://localhost:8000/api/v1/saude
- Admin: http://localhost:8000/admin-local/

## Testes

    cd backend
    .venv\Scripts\python.exe -m pytest

(no Git Bash: `.venv/Scripts/python -m pytest`)
