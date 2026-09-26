# Abre o rrapp no computador local: Docker, banco, backend, frontend e o navegador.
# Uso: dois cliques em iniciar.cmd (na raiz do projeto).

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz "backend"
$frontend = Join-Path $raiz "frontend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

function Passo([string]$texto) { Write-Host "`n> $texto" -ForegroundColor Cyan }
function Falha([string]$texto) { throw $texto }

# Pergunta ao próprio servidor, pelo "localhost" como o navegador faz: o Vite escuta no IPv6 (::1)
function Responde([string]$url) {
    try {
        $resposta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return $resposta.StatusCode -lt 500
    } catch { return $false }
}

function Esperar([string]$descricao, [int]$segundos, [scriptblock]$pronto) {
    $limite = (Get-Date).AddSeconds($segundos)
    while (-not (& $pronto)) {
        if ((Get-Date) -gt $limite) { Falha "$descricao não ficou pronto em $segundos segundos." }
        Start-Sleep -Seconds 2
    }
}

# Roda um programa externo só para saber se deu certo. No PowerShell 5.1, redirecionar a saída de
# erro de um programa externo vira erro "de verdade" com Stop, então aqui a regra fica desligada.
function DaCerto([scriptblock]$comando) {
    $ErrorActionPreference = "Continue"
    & $comando *> $null
    return $LASTEXITCODE -eq 0
}

function DockerPronto { DaCerto { docker info } }

function AbrirJanela([string]$titulo, [string]$pasta, [string]$comando) {
    $script = "`$Host.UI.RawUI.WindowTitle = '$titulo'; Set-Location '$pasta'; $comando"
    Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", $script
}

try {
    Write-Host "Abrindo o rrapp..." -ForegroundColor Green

    if (-not (Test-Path $python)) {
        Falha "Não achei o Python do backend em $python. Siga o README (Rodando o backend localmente)."
    }

    Passo "Docker"
    if (-not (DockerPronto)) {
        $docker = @(
            (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\Docker Desktop.exe"),
            (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe")
        ) | Where-Object { Test-Path $_ } | Select-Object -First 1
        if (-not $docker) { Falha "Não achei o Docker Desktop instalado." }
        Write-Host "  Abrindo o Docker Desktop (pode levar até 2 minutos)..."
        Start-Process $docker
        Esperar "O Docker" 180 { DockerPronto }
    }
    Write-Host "  Docker pronto."

    Passo "Banco de dados"
    Push-Location $raiz
    try {
        docker compose up -d db | Out-Null
        if ($LASTEXITCODE -ne 0) { Falha "Não consegui subir o banco (docker compose up -d db)." }
        Esperar "O banco" 60 { DaCerto { docker compose exec -T db pg_isready -U rrapp } }
    } finally { Pop-Location }
    Write-Host "  Banco pronto."

    Passo "Atualizando as tabelas (migrate)"
    Push-Location $backend
    try {
        & $python manage.py migrate --noinput | Out-Null
        if ($LASTEXITCODE -ne 0) { Falha "O migrate falhou. Rode-o no terminal, na pasta backend, para ver o erro." }
    } finally { Pop-Location }
    Write-Host "  Tabelas em dia."

    Passo "Backend (porta 8000)"
    $saude = "http://localhost:8000/api/v1/saude"
    if (Responde $saude) {
        Write-Host "  Já estava rodando."
    } else {
        AbrirJanela "rrapp - backend" $backend ".\.venv\Scripts\python.exe manage.py runserver 8000"
    }

    Passo "Frontend (porta 5173)"
    if (Responde "http://localhost:5173") {
        Write-Host "  Já estava rodando."
    } else {
        if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
            Write-Host "  Instalando as dependências do frontend (só na primeira vez)..."
            Push-Location $frontend
            try {
                npm install | Out-Null
                if ($LASTEXITCODE -ne 0) { Falha "O npm install falhou." }
            } finally { Pop-Location }
        }
        AbrirJanela "rrapp - frontend" $frontend "npm run dev"
    }

    Passo "Esperando o app responder"
    Esperar "O backend" 60 { Responde $saude }
    Esperar "O frontend" 60 { Responde "http://localhost:5173" }

    Start-Process "http://localhost:5173"
    Write-Host "`nPronto! O rrapp abriu no navegador." -ForegroundColor Green
    Write-Host "Para parar, feche as janelas 'rrapp - backend' e 'rrapp - frontend'."
    Start-Sleep -Seconds 4
} catch {
    Write-Host "`nNão deu para abrir o rrapp: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
