# IMIP - Testar restauro em PostgreSQL LOCAL no Docker
# Apenas para Windows PowerShell 5.1. Nao acede ao Supabase remoto.
# Exemplo: powershell -ExecutionPolicy Bypass -File .\scripts\testar-restauro-imip.ps1
param(
    [string]$Pasta
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$verificador = Join-Path $PSScriptRoot "verificar-backup-imip.ps1"
$preparador = Join-Path $PSScriptRoot "preparar-dados-publicos-imip.ps1"
$pastaIsolada = Join-Path $env:TEMP ("imip-restauro-local-" + ([guid]::NewGuid().ToString("N").Substring(0,12)))
$nomeInstancia = Split-Path $pastaIsolada -Leaf
$contentor = "supabase_db_" + $nomeInstancia
$iniciado = $false
$sucesso = $false
$limpezaOk = $false
$localCriado = $false
$erroPrincipal = $null

function Executar-CLI([string[]]$argsCli) {
    & npx.cmd --yes supabase @argsCli
    if ($LASTEXITCODE -ne 0) {
        throw ("Supabase CLI falhou: " + ($argsCli -join " "))
    }
}

try {
    if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
        throw "Docker nao disponivel. Abre o Docker Desktop."
    }
    if (-not (Get-Command "npx.cmd" -ErrorAction SilentlyContinue)) {
        throw "Node.js e npx sao necessarios."
    }
    & docker info --format '{{.ServerVersion}}' 1> $null 2> $null
    if ($LASTEXITCODE -ne 0) { throw "O Docker Engine nao esta ativo." }

    if ([string]::IsNullOrWhiteSpace($Pasta)) {
        $origem = Join-Path $root "backups-local"
        $ultima = Get-ChildItem -LiteralPath $origem -Directory -ErrorAction Stop |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "manifesto.json") } |
            Sort-Object Name -Descending | Select-Object -First 1
        if ($null -eq $ultima) { throw "Nao ha backups para restaurar." }
        $Pasta = $ultima.FullName
    }
    $Pasta = (Resolve-Path -LiteralPath $Pasta -ErrorAction Stop).Path

    # Este teste usa APENAS os ficheiros locais e nao pede credenciais.
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verificador -Pasta $Pasta
    if ($LASTEXITCODE -ne 0) { throw "A integridade do backup nao foi confirmada." }

    Write-Host ""
    Write-Host "IMIP - RESTAURO ISOLADO NO DOCKER (sem ligacao a producao)" -ForegroundColor Cyan
    Write-Host ("Backup: " + $Pasta)

    New-Item -ItemType Directory -Path $pastaIsolada -Force | Out-Null
    $localCriado = $true
    Push-Location $pastaIsolada
    try {
        Executar-CLI -argsCli @("init")
        Executar-CLI -argsCli @("db", "start")
        $iniciado = $true

        $nomes = @(& docker ps --format '{{.Names}}')
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel consultar os contentores Docker." }
        if ($nomes -notcontains $contentor) {
            throw ("Contentor de teste nao encontrado: " + $contentor)
        }

        # O PostgreSQL local criado pela Supabase CLI ja inclui os papeis
        # internos como supabase_admin. Nao executar ALTER ROLE do roles.sql:
        # estes papeis sao reservados e a instancia local rejeita modifica-los.
        # O roles.sql permanece no backup original, intacto e com hash validado.
        Write-Host "A usar os papeis internos da instancia Supabase local."
        Write-Host "roles.sql sera preservado, mas NAO sera importado neste teste."
        # Um db dump pode conter COPY de storage.* ou auth.*.
        # A instancia local nao permite importar algumas tabelas internas.
        # Gerar SQL apenas de public.* em pasta temporaria; NUNCA alterar data.sql.
        $dadosPublicos = Join-Path $pastaIsolada "data-publico.sql"
        Write-Host "A preparar uma copia temporaria apenas com dados da aplicacao..."
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preparador -Origem (Join-Path $Pasta "data.sql") -Destino $dadosPublicos
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel selecionar os dados public do backup." }

        & docker cp (Join-Path $Pasta "schema.sql") ($contentor + ":/tmp/schema.sql")
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel copiar schema.sql" }
        & docker cp $dadosPublicos ($contentor + ":/tmp/data-publico.sql")
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel copiar data-publico.sql" }

        Write-Host "A restaurar estrutura e dados do IMIP na base LOCAL temporaria..."
        & docker exec $contentor psql -U postgres -d postgres --set=ON_ERROR_STOP=1 --single-transaction --file=/tmp/schema.sql --command="SET session_replication_role = replica" --file=/tmp/data-publico.sql
        if ($LASTEXITCODE -ne 0) {
            throw "O restauro SQL falhou. A copia ainda NAO foi considerada restauravel."
        }

        $query = "SELECT (SELECT COUNT(*) FROM public.rodas), (SELECT COUNT(*) FROM public.mcs), (SELECT COUNT(*) FROM public.edicoes), (SELECT COUNT(*) FROM public.edicoes WHERE estado = 'publicada'), (SELECT COUNT(*) FROM public.pontuacoes);"
        $linhas = @(& docker exec $contentor psql -U postgres -d postgres --tuples-only --no-align --field-separator="|" --command=$query)
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel verificar as tabelas restauradas." }
        $numeros = @($linhas | Where-Object { $_ -match '^[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+
        Write-Host "NOTA: o SQL de teste incluiu apenas tabelas public (sem Auth/Storage)." -ForegroundColor Yellow
        Write-Host "NOTA: este teste usa os papeis internos locais; roles.sql NAO foi restaurado." -ForegroundColor Yellow
        Write-Host "NOTA: este teste nao inclui contas Auth nem ficheiros do Storage." -ForegroundColor Yellow
        $sucesso = $true
    } finally {
        # Somente a instancia de testes, criada num diretorio temporario.
        if ($localCriado) {
            Write-Host "A desligar a base LOCAL temporaria..."
            & npx.cmd --yes supabase stop --no-backup
            $limpezaOk = $LASTEXITCODE -eq 0
        }
        Pop-Location
    }
}
catch {
    $erroPrincipal = $_.Exception.Message
}
finally {
    if ($localCriado -and $limpezaOk) {
        Remove-Item -LiteralPath $pastaIsolada -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($localCriado -and -not $limpezaOk) {
        Write-Host ("A limpeza automatica nao foi confirmada; reve a instancia local " + $nomeInstancia) -ForegroundColor Yellow
    }
}

if ($null -ne $erroPrincipal) {
    Write-Host ("RESTAURO NAO VALIDADO: " + $erroPrincipal) -ForegroundColor Red
    exit 1
}
if (-not $sucesso -or -not $limpezaOk) {
    Write-Host "RESTAURO NAO VALIDADO: a limpeza da instancia de testes precisa de verificacao." -ForegroundColor Red
    exit 1
}
Write-Host "TESTE CONCLUIDO E INSTANCIA TEMPORARIA REMOVIDA" -ForegroundColor Green
 })
        if ($numeros.Count -ne 1) { throw "A leitura dos totais restaurados foi inesperada." }
        $valores = @($numeros[0].Split("|") | ForEach-Object { [int]$_ })
        if ($valores.Count -ne 5 -or @($valores | Where-Object { $_ -le 0 }).Count -gt 0) {
            throw "Uma das tabelas principais ficou vazia na base restaurada."
        }

        # Comparar com todos os registos COPY guardados na exportacao,
        # nao com totais atuais da producao que poderao ter mudado.
        $resumo = Get-Content -LiteralPath ($dadosPublicos + ".contagens.json") -Raw -Encoding UTF8 | ConvertFrom-Json
        $nomes = @("rodas","mcs","edicoes","pontuacoes")
        $indices = @(0,1,2,4)
        for ($i = 0; $i -lt $nomes.Count; $i++) {
            $nome = $nomes[$i]
            $esperado = [int]($resumo.$nome)
            $encontrado = [int]$valores[$indices[$i]]
            if ($esperado -ne $encontrado) {
                throw ("Divergencia na tabela " + $nome + ": backup=" + $esperado + ", restaurado=" + $encontrado)
            }
        }

        Write-Host ""
        Write-Host "RESTAURO SQL LOCAL CONCLUIDO" -ForegroundColor Green
        Write-Host ("Rodas: " + $valores[0] + "; MCs: " + $valores[1] + "; Edicoes: " + $valores[2] + " (publicadas: " + $valores[3] + "); Pontuacoes: " + $valores[4])
        Write-Host "Totais das 4 tabelas principais correspondem exatamente ao SQL original." -ForegroundColor Green
        Write-Host "NOTA: o SQL de teste incluiu apenas tabelas public (sem Auth/Storage)." -ForegroundColor Yellow
        Write-Host "NOTA: este teste usa os papeis internos locais; roles.sql NAO foi restaurado." -ForegroundColor Yellow
        Write-Host "NOTA: este teste nao inclui contas Auth nem ficheiros do Storage." -ForegroundColor Yellow
        $sucesso = $true
    } finally {
        # Somente a instancia de testes, criada num diretorio temporario.
        if ($localCriado) {
            Write-Host "A desligar a base LOCAL temporaria..."
            & npx.cmd --yes supabase stop --no-backup
            $limpezaOk = $LASTEXITCODE -eq 0
        }
        Pop-Location
    }
}
catch {
    $erroPrincipal = $_.Exception.Message
}
finally {
    if ($localCriado -and $limpezaOk) {
        Remove-Item -LiteralPath $pastaIsolada -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($localCriado -and -not $limpezaOk) {
        Write-Host ("A limpeza automatica nao foi confirmada; reve a instancia local " + $nomeInstancia) -ForegroundColor Yellow
    }
}

if ($null -ne $erroPrincipal) {
    Write-Host ("RESTAURO NAO VALIDADO: " + $erroPrincipal) -ForegroundColor Red
    exit 1
}
if (-not $sucesso -or -not $limpezaOk) {
    Write-Host "RESTAURO NAO VALIDADO: a limpeza da instancia de testes precisa de verificacao." -ForegroundColor Red
    exit 1
}
Write-Host "TESTE CONCLUIDO E INSTANCIA TEMPORARIA REMOVIDA" -ForegroundColor Green
