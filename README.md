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

### Documentação da API

Com o servidor rodando: http://localhost:8000/api/docs

### 2FA do Admin

O Admin exige um código de um app autenticador (Google Authenticator, Authy, Microsoft Authenticator...). Para configurar o seu usuário, rode uma vez (PowerShell, na pasta `backend`):

    .venv\Scripts\python.exe manage.py configurar_2fa seu_usuario

Escaneie o QR code com o app. No login do Admin, informe usuário, senha e o código de 6 dígitos que o app mostra.

Perdeu o celular? Rode o mesmo comando com `--recriar` para gerar um autenticador novo.

## Rodando o frontend

Pré-requisito: Node 24. O backend precisa estar no ar, na porta 8000 (veja acima): em desenvolvimento, o Vite repassa `/api` e `/media` para o Django.

Um comando por linha, no PowerShell:

    cd frontend
    npm install
    npm run dev

Endereço: http://localhost:5173

### Quando a API mudar

Regenere o contrato no backend e os tipos TypeScript no frontend:

    cd backend
    .venv\Scripts\python.exe manage.py spectacular --file openapi.yml
    cd ..rontend
    npm run gerar-tipos

## Testes

    cd backend
    .venv\Scripts\python.exe -m pytest

(no Git Bash: `.venv/Scripts/python -m pytest`)

Frontend (na pasta `frontend`):

    npm test
    npm run lint
    npm run typecheck

### Ponta a ponta (Playwright)

O teste percorre cadastro, busca, registro de visita e diário num navegador de verdade, contra o backend local. Antes de rodar, deixe no ar:

- o banco no Docker (`docker compose up -d db`);
- o `runserver` do Django, com os restaurantes do Rio importados (`manage.py importar_restaurantes`);
- uma vez só, o navegador do Playwright: `npx playwright install chromium`.

Depois, na pasta `frontend`:

    npm run test:e2e

O teste cria uma conta e a exclui no final. O backend aceita só 3 cadastros por hora por IP; se estourar, reinicie o `runserver` (o contador fica na memória).
