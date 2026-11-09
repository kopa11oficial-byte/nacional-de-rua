# IMIP - validar integridade de backup local (Windows PowerShell 5.1)
# Sem acesso a Internet, Docker ou Supabase. Nao altera qualquer ficheiro.
param(
    [string]$Pasta
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
    $projetoEsperado = "fprwitwlvntnlnfqttrl"
    if ([string]::IsNullOrWhiteSpace($Pasta)) {
        $raiz = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "backups-local"
        if (-not (Test-Path -LiteralPath $raiz -PathType Container)) {
            throw "Nao encontrei a pasta backups-local. Faz primeiro a exportacao."
        }
        $ultima = Get-ChildItem -LiteralPath $raiz -Directory |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "manifesto.json") } |
            Sort-Object Name -Descending |
            Select-Object -First 1
        if ($null -eq $ultima) {
            throw "Nao encontrei nenhum backup com manifesto.json."
        }
        $Pasta = $ultima.FullName
    }

    $Pasta = (Resolve-Path -LiteralPath $Pasta -ErrorAction Stop).Path
    $manifestoPath = Join-Path $Pasta "manifesto.json"
    $manifesto = Get-Content -LiteralPath $manifestoPath -Raw -Encoding UTF8 | ConvertFrom-Json

    if ($manifesto.referencia_supabase -ne $projetoEsperado) {
        throw "O backup nao pertence ao projeto Nacional de Rua."
    }
    if ($null -eq $manifesto.ficheiros -or @($manifesto.ficheiros).Count -ne 3) {
        throw "O manifesto nao descreve os 3 ficheiros esperados."
    }

    foreach ($nome in @("roles.sql", "schema.sql", "data.sql")) {
        $registos = @($manifesto.ficheiros | Where-Object { $_.nome -eq $nome })
        if ($registos.Count -ne 1) {
            throw "O manifesto nao tem exatamente um registo para $nome."
        }
        $registo = $registos[0]
        $caminho = Join-Path $Pasta $nome
        $arquivo = Get-Item -LiteralPath $caminho -ErrorAction Stop
        if ($arquivo.Length -lt 10 -or $arquivo.Length -ne [long]$registo.bytes) {
            throw "O tamanho de $nome nao corresponde ao manifesto."
        }
        $sha = (Get-FileHash -LiteralPath $caminho -Algorithm SHA256).Hash
        if ($sha -ne [string]$registo.sha256) {
            throw "O SHA-256 de $nome nao corresponde ao manifesto."
        }
        Write-Host ("OK: " + $nome + " (" + $arquivo.Length + " bytes)") -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "INTEGRIDADE DOS FICHEIROS CONFIRMADA" -ForegroundColor Green
    Write-Host ("Pasta: " + $Pasta)
    Write-Host "Ainda nao significa que foi testado o restauro da base de dados." -ForegroundColor Yellow
} catch {
    Write-Host ("VERIFICACAO FALHOU: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
