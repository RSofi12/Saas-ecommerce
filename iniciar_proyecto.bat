@echo off
title FashionStore SaaS - Launcher
color 0b

echo ====================================================================
echo             FASHIONSTORE SAAS - ENTORNO LOCAL DE DESARROLLO
echo ====================================================================
echo.
echo  Detectando componentes y preparando lanzamiento...
echo.

:: 1. Lanzar Backend FastAPI en nueva ventana
echo  [1/2] Levantando Backend (FastAPI + Uvicorn) en http://localhost:8000 ...
start "FashionStore Backend (FastAPI)" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --reload --port 8000"

:: 2. Lanzar Frontend Angular en nueva ventana
echo  [2/2] Levantando Frontend (Angular 21) en http://localhost:4200 ...
start "FashionStore Frontend (Angular)" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ====================================================================
echo  Servidores en ejecucion en dos ventanas independientes!
echo.
echo   * Frontend Web PWA : http://localhost:4200
echo   * Backend API      : http://localhost:8000
echo   * Swagger Docs     : http://localhost:8000/docs
echo   * Credencial Demo  : Tiendafashion123!
echo ====================================================================
echo.
echo  Presiona cualquier tecla para cerrar esta ventana...
pause >nul

