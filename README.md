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

- O PostgreSQL do Docker fica na porta **5433**, porque a 5432 costuma estar ocupada por um PostgreSQL instalado no Windows.
- Saúde da API: http://localhost:8000/api/v1/saude
- Admin: http://localhost:8000/admin-local/ (crie um usuário com `python manage.py createsuperuser`)

## Testes

    cd backend && pytest
