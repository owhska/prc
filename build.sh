#!/bin/bash

# Script de build para o Render - força uso do npm
echo "🔧 Starting build process with npm..."

# Garante que não há yarn.lock
if [ -f "yarn.lock" ]; then
    echo "❌ Removing conflicting yarn.lock"
    rm yarn.lock
fi

if [ -f "frontend/yarn.lock" ]; then
    echo "❌ Removing conflicting frontend/yarn.lock"
    rm frontend/yarn.lock
fi

# Instala dependências na raiz se necessário
if [ -f "package.json" ]; then
    echo "📦 Installing root dependencies with npm..."
    npm ci || npm install
fi

# Vai para frontend e instala dependências
echo "📦 Installing frontend dependencies with npm..."
cd frontend

# Remove node_modules se existir para garantir instalação limpa
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning existing node_modules..."
    rm -rf node_modules
fi

# Instala dependências do frontend
npm ci || npm install

# Verifica se vite está disponível
echo "🔍 Checking if vite is available..."
if ! npx vite --version >/dev/null 2>&1; then
    echo "❌ Vite not found, installing explicitly..."
    npm install vite@^6.3.5 --save-dev
fi

# Executa o build
echo "🏗️ Building frontend..."
npm run build

echo "✅ Build completed successfully!"
