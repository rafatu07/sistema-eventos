@echo off
echo 🧪 Testando Sistema de Push Automatico
echo.
echo ⏰ Verificando status...
powershell -Command "Invoke-WebRequest -Uri http://localhost:3000/api/auto-process-events -Method GET | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
echo 🚀 Executando processamento...
powershell -Command "Invoke-WebRequest -Uri http://localhost:3000/api/auto-process-events -Method POST | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
echo ✅ Teste concluido!
pause
