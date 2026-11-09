# IMIP - backup manual da base de dados (Windows, Supabase Free)
# Executar no teu computador: powershell -ExecutionPolicy Bypass -File .\scripts\backup-imip.ps1
# Requer Supabase CLI e Docker Desktop instalado e aberto.
# Nao envia dados para o GitHub nem grava a ligacao/credenciais em ficheiros.
# IMPORTANTE: esta exportacao oficial nao inclui utilizadores Auth nem ficheiros Storage.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRef = "fprwitwlvntnlnfqttrl"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupRoot = Join-Path $repoRoot "backups-local"
$folder = Join-Path $backupRoot ((Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss_UTC"))
$dbUrl = $null
$secureUrl = $null
$uri = $null

function Verificar-Comando([string]$nome) {
    if (-not (Get-Command $nome -ErrorAction SilentlyContinue)) {
        throw "Falta instalar '$nome'. Consulta docs/backup-e-recuperacao-imip.md."
    }
}

function Executar-Exportacao([string]$nome, [string[]]$opcoes) {
    $destino = Join-Path $folder $nome
    Write-Host ("A criar " + $nome + " ...")
    if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
        & supabase db dump --db-url $dbUrl -f $destino @opcoes
    } else {
        # npx executa a CLI oficial sem instalacao global, em Windows com Node 20+.
        & npx.cmd --yes supabase db dump --db-url $dbUrl -f $destino @opcoes
    }

    if ($LASTEXITCODE -ne 0) {
        throw "A exportacao $nome falhou. Nao consideres esta pasta uma copia de seguranca valida."
    }
    $ficheiro = Get-Item -LiteralPath $destino -ErrorAction Stop
    if ($ficheiro.Length -lt 10) {
        throw "O ficheiro $nome esta vazio ou incompleto."
    }
}

try {
    if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
        Verificar-Comando "node"
        Verificar-Comando "npx.cmd"
        $nodeVersion = (& node --version).TrimStart("v")
        if ([int](($nodeVersion -split "\\.")[0]) -lt 20) {
            throw "O Supabase via npx precisa de Node.js 20 ou superior."
        }
        Write-Host "Supabase CLI global nao instalada: sera usada pelo npx (sem instalacao global)."
    }
    Verificar-Comando "docker"

    & docker info --format '{{.ServerVersion}}' 1> $null 2> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Abre o Docker Desktop antes de executar o backup."
    }

    Write-Host ""
    Write-Host "IMIP - copia de seguranca local da base de dados" -ForegroundColor Cyan
    Write-Host "Projeto: Nacional de Rua ($projectRef)"
    Write-Host "Abre o Supabase > Connect > Session pooler e copia a ligacao PostgreSQL."
    Write-Host "A ligacao contem a palavra-passe da base de dados. Nao a partilhes por chat nem a coloques no GitHub."
    Write-Host ""

    $secureUrl = Read-Host "Cola a ligacao PostgreSQL completa (campo protegido)" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
    try {
        $dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }

    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        throw "Nao foi indicada uma ligacao a base de dados."
    }
    try { $uri = [System.Uri]::new($dbUrl) }
    catch { throw "A ligacao tem um formato invalido. Copia-a do Supabase > Connect." }

    if ($uri.Scheme -notin @("postgresql", "postgres")) {
        throw "A ligacao tem de ser PostgreSQL."
    }
    if ($dbUrl -notlike "*$projectRef*") {
        throw "A ligacao nao identifica o projeto Nacional de Rua. Operacao cancelada para evitar exportar outra base de dados."
    }
    if ($dbUrl -match '\[YOUR-PASSWORD\]' -or $dbUrl -match '\[PASSWORD\]') {
        throw "Substitui o marcador de password pela palavra-passe da base de dados."
    }

    New-Item -Path $folder -ItemType Directory -Force | Out-Null

    # Processo recomendado na documentacao oficial do Supabase para plano gratuito.
    Executar-Exportacao "roles.sql" @("--role-only")
    Executar-Exportacao "schema.sql" @()
    Executar-Exportacao "data.sql" @("--data-only", "--use-copy")

    $ficheiros = @("roles.sql", "schema.sql", "data.sql")
    $dadosFicheiros = @()
    foreach ($nome in $ficheiros) {
        $destino = Join-Path $folder $nome
        $item = Get-Item -LiteralPath $destino
        $hash = Get-FileHash -LiteralPath $destino -Algorithm SHA256
        $dadosFicheiros += @{
            nome = $nome
            bytes = $item.Length
            sha256 = $hash.Hash
        }
    }

    $manifesto = @{
        projeto = "Nacional de Rua"
        referencia_supabase = $projectRef
        gerado_em_utc = (Get-Date).ToUniversalTime().ToString("o")
        metodo = "Supabase CLI db dump: roles + schema + data (public)"
        verificacao = "ficheiros presentes, nao vazios, hashes SHA-256"
        restauro_testado = $false
        auth_incluido = $false
        storage_ficheiros_incluidos = $false
        ficheiros = $dadosFicheiros
    }

    $manifestoPath = Join-Path $folder "manifesto.json"
    $manifesto | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestoPath -Encoding UTF8

    Write-Host ""
    Write-Host "EXPORTACAO CONCLUIDA" -ForegroundColor Green
    Write-Host "Pasta: $folder"
    Write-Host "Ficheiros: roles.sql, schema.sql, data.sql e manifesto.json"
    Write-Host ""
    Write-Host "ATENCAO: ainda falta guardar uma copia FORA deste computador, num local cifrado, e testar o restauro." -ForegroundColor Yellow
    Write-Host "Os utilizadores Auth e os ficheiros Storage nao estao incluidos nesta exportacao." -ForegroundColor Yellow
    Write-Host "Nunca publiques os ficheiros no GitHub."
}
catch {
    Write-Error ("Backup nao confirmado: " + $_.Exception.Message)
    exit 1
}
finally {
    $dbUrl = $null
    $secureUrl = $null
}
