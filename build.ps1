# Script de build para o Render - PowerShell version
Write-Host "🔧 Starting build process with npm..." -ForegroundColor Green

# Garante que não há yarn.lock
if (Test-Path "yarn.lock") {
    Write-Host "❌ Removing conflicting yarn.lock" -ForegroundColor Red
    Remove-Item "yarn.lock" -Force
}

if (Test-Path "frontend/yarn.lock") {
    Write-Host "❌ Removing conflicting frontend/yarn.lock" -ForegroundColor Red
    Remove-Item "frontend/yarn.lock" -Force
}

# Instala dependências na raiz se necessário
if (Test-Path "package.json") {
    Write-Host "📦 Installing root dependencies with npm..." -ForegroundColor Blue
    try {
        npm ci
    } catch {
        npm install
    }
}

# Vai para frontend e instala dependências
Write-Host "📦 Installing frontend dependencies with npm..." -ForegroundColor Blue
Set-Location frontend

# Remove node_modules se existir para garantir instalação limpa
if (Test-Path "node_modules") {
    Write-Host "🧹 Cleaning existing node_modules..." -ForegroundColor Yellow
    Remove-Item "node_modules" -Recurse -Force
}

# Instala dependências do frontend
try {
    npm ci
} catch {
    npm install
}

# Verifica se vite está disponível
Write-Host "🔍 Checking if vite is available..." -ForegroundColor Cyan
try {
    npx vite --version | Out-Null
    Write-Host "✅ Vite is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Vite not found, installing explicitly..." -ForegroundColor Red
    npm install vite@^6.3.5 --save-dev
}

# Executa o build
Write-Host "🏗️ Building frontend..." -ForegroundColor Magenta
npm run build

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
