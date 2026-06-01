@echo off
title Ponto B - Video Editor

:: Caminho para a pasta do projeto (ajuste se necessario)
set PROJECT_DIR=%~dp0

:: ============================================================================
:: Cria atalho no Desktop na PRIMEIRA execucao (so uma vez por usuario).
::
:: Detalhes importantes:
:: - Usa [Environment]::GetFolderPath('DesktopDirectory') para resolver o
::   caminho REAL do Desktop. Em Windows com OneDrive ativo, o Desktop fica
::   redirecionado para OneDrive\Desktop, e %USERPROFILE%\Desktop vira um
::   caminho fantasma que o usuario nao ve. O .NET API resolve isso.
:: - Se o atalho ja existe nesse caminho, nao faz nada (execucao silenciosa).
:: - O icone vem do arquivo PontoB_Editor.ico na raiz do projeto (versionado
::   no git, entao todo mundo que clonar tem ele localmente).
:: - -ExecutionPolicy Bypass garante que rode mesmo se o usuario nao tiver
::   executado Set-ExecutionPolicy ainda.
:: - Output em verde quando cria, silencioso quando ja existe.
:: ============================================================================
set BAT_PATH=%~f0
set ICON_PATH=%PROJECT_DIR%PontoB_Editor.ico

powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('DesktopDirectory'); $p=Join-Path $d 'Ponto B - Video Editor.lnk'; $icoPath='%ICON_PATH%'; $ws=New-Object -ComObject WScript.Shell; $sc=$ws.CreateShortcut($p); $needsSave=$false; if(-not (Test-Path $p)){$sc.TargetPath='%BAT_PATH%'; $sc.WorkingDirectory='%PROJECT_DIR%'; $sc.Description='Ponto B - Editor de Reels'; $needsSave=$true}; if((Test-Path $icoPath) -and ($sc.IconLocation -notlike '*PontoB_Editor.ico*')){$sc.IconLocation=$icoPath+',0'; $needsSave=$true}; if($needsSave){$sc.Save(); Write-Host ''; Write-Host ('  Atalho atualizado em ' + $p) -ForegroundColor Green; Write-Host ''}"

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
