@echo off
chcp 65001 >nul
title Gotong Royong Digital - Server Aktif
color 0A

echo =======================================================
echo    🚀 MEMULAI PLATFORM GOTONG ROYONG DIGITAL
echo =======================================================
echo.
echo Sedang menyiapkan server lokal...
echo Membuka http://localhost:3000 di browser Anda...
echo.

start "" "http://localhost:3000"
node server.js
pause
