# Automatização da Agenda Tributária
# Este script cria automaticamente as tarefas do próximo mês

Write-Host "🤖 AUTOMAÇÃO DA AGENDA TRIBUTÁRIA" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Navegar para o diretório correto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendPath = Join-Path $scriptPath "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Diretório backend não encontrado: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Obter data atual e calcular próximo mês
$dataAtual = Get-Date
$proximoMes = $dataAtual.AddMonths(1)
$ano = $proximoMes.Year
$mes = $proximoMes.Month

Write-Host ""
Write-Host "📅 Data atual: $($dataAtual.ToString('dd/MM/yyyy'))" -ForegroundColor Yellow
Write-Host "📅 Próximo mês: $mes/$ano" -ForegroundColor Green
Write-Host ""

# Verificar se Node.js está disponível
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js disponível: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se o script existe
$scriptFile = "scripts/agenda-tributaria-api.js"
if (-not (Test-Path $scriptFile)) {
    Write-Host "❌ Script não encontrado: $scriptFile" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Executando criação de tarefas..." -ForegroundColor Cyan

try {
    # Executar o script de criação de tarefas
    $resultado = & node $scriptFile criar-mes $ano $mes 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SUCESSO! Tarefas criadas para $mes/$ano" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Output do script:" -ForegroundColor Yellow
        $resultado | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
    } else {
        Write-Host "❌ ERRO na execução do script" -ForegroundColor Red
        Write-Host "📋 Output do erro:" -ForegroundColor Yellow
        $resultado | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
} catch {
    Write-Host "❌ ERRO ao executar o script: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✨ Automação finalizada!" -ForegroundColor Cyan

# Opcional: Pausar para ver o resultado (remover em produção)
if ($Host.Name -eq "ConsoleHost") {
    Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
