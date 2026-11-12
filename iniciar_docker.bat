@echo off
title FashionStore SaaS - Iniciar con Docker
color 0a

echo ====================================================================
echo             FASHIONSTORE SAAS - DOCKER COMPOSE LAUNCHER
echo ====================================================================
echo.
echo  Verificando Docker y levantando contenedores (DB, Backend, Frontend)...
echo.

docker compose up --build

echo.
echo ====================================================================
echo  Contenedores detenidos.
echo ====================================================================
pause

