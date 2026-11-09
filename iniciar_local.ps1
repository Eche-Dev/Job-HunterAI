# =====================================================================
# Script de Arranque Rápido en Local — Job Hunter AI
# =====================================================================
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Iniciando Job Hunter AI (Entorno Local)" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Levantar Backend FastAPI en una ventana separada (Puerto 8000)
Write-Host "[1/2] Arrancando Backend FastAPI en http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn app.main:app --reload --port 8000"

# 2. Levantar Frontend Next.js en esta ventana (Puerto 3000)
Write-Host "[2/2] Arrancando Frontend Next.js en http://localhost:3000 ..." -ForegroundColor Green
Write-Host " -> Web Pública: http://localhost:3000" -ForegroundColor Cyan
Write-Host " -> Panel Admin: http://localhost:3000/gatekeeper-admin (Usa el usuario y clave de tu .env)" -ForegroundColor Cyan

$env:NEXT_PUBLIC_API_URL = "http://localhost:8000"
Set-Location "$PSScriptRoot\frontend"
npm run dev
