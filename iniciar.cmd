@echo off
rem Dois cliques aqui abrem o rrapp: banco, backend, frontend e o navegador.
rem -ExecutionPolicy Bypass vale so para esta execucao; nao muda a configuracao do Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1"
if errorlevel 1 pause
