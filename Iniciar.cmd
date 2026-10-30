@echo off
setlocal
cd /d "%~dp0"
title English Tutor
set "URL=http://127.0.0.1:8765"

where uv >nul 2>&1
if errorlevel 1 goto :no_uv

rem Si ya esta en marcha, solo abrimos el navegador.
call :alive
if not errorlevel 1 goto :already

rem Compilar la interfaz si falta.
if exist "frontend\dist\index.html" goto :ui_ready
where npm >nul 2>&1
if errorlevel 1 goto :no_npm
echo Compilando la interfaz, solo la primera vez...
pushd frontend
if not exist node_modules call npm install
if errorlevel 1 goto :ui_failed
call npm run build
if errorlevel 1 goto :ui_failed
popd
:ui_ready

rem Ollama lo gestionas tu: solo avisamos.
powershell -NoProfile -Command "try { Invoke-RestMethod 'http://localhost:11434/api/version' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 echo AVISO: Ollama no responde en localhost:11434. Arrancalo para poder conversar.

rem Abrir el navegador en cuanto /health responda.
start "" /b powershell -NoProfile -Command "for ($i = 0; $i -lt 180; $i++) { try { Invoke-RestMethod '%URL%/health' -TimeoutSec 2 | Out-Null; Start-Process '%URL%'; break } catch { Start-Sleep -Seconds 1 } }"

echo English Tutor en %URL%  -  cierra esta ventana o pulsa Ctrl+C para detenerlo.
uv run uvicorn backend.api.app:app --host 127.0.0.1 --port 8765
echo.
echo El servidor se ha detenido.
pause
exit /b 0

:already
echo English Tutor ya esta en marcha. Abriendo el navegador...
start "" "%URL%"
exit /b 0

:no_uv
echo ERROR: no se encuentra "uv". Instalalo desde https://docs.astral.sh/uv/ y vuelve a intentarlo.
pause
exit /b 1

:no_npm
echo ERROR: falta la interfaz compilada y no se encuentra "npm". Instala Node.js desde https://nodejs.org/ y vuelve a intentarlo.
pause
exit /b 1

:ui_failed
popd
echo ERROR: no se pudo compilar la interfaz. Revisa los mensajes de arriba.
pause
exit /b 1

:alive
powershell -NoProfile -Command "try { $r = Invoke-RestMethod '%URL%/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%
