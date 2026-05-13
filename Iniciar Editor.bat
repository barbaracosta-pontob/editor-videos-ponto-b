@echo off
title Ponto B - Video Editor

:: Caminho para a pasta do projeto (ajuste se necessario)
set PROJECT_DIR=%~dp0

echo.
echo  Ponto B - Video Editor
echo  Iniciando servidor...
echo.

:: Inicia o servidor em background
start "PontoB Server" cmd /k "cd /d "%PROJECT_DIR%" && npm run dev"

:: Aguarda a porta 3000 responder antes de abrir o navegador
echo  Aguardando servidor iniciar na porta 3000...
set MAX_WAIT=60
set COUNT=0

:WAIT_LOOP
set /a COUNT+=1
if %COUNT% GTR %MAX_WAIT% (
    echo.
    echo  [AVISO] Servidor nao respondeu em %MAX_WAIT% segundos.
    echo  Verifique a janela "PontoB Server" para erros.
    pause
    exit /b 1
)

:: Testa se a porta esta ativa via PowerShell
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient('localhost', 3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto SERVER_READY

:: Mostra progresso a cada 5 tentativas
set /a MOD=%COUNT% %% 5
if %MOD% EQU 0 echo  ... %COUNT%s aguardando

timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:SERVER_READY
echo  Servidor ativo. Abrindo navegador...

:: Abre o navegador padrao na porta 3000
start http://localhost:3000

echo.
echo  Pronto. O editor foi aberto no navegador.
echo  Para encerrar o servidor, feche a janela "PontoB Server".
echo.
