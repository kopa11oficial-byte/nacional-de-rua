# IMIP - backup dos objetos publicos do Supabase Storage
# Le storage.objects no data.sql ja exportado. Nao pede password, nao usa service_role.
# Nao altera dados no Supabase. Windows PowerShell 5.1.
# powershell -ExecutionPolicy Bypass -File .\scripts\backup-storage-imip.ps1
param(
    [string]$Pasta,
    [switch]$ApenasVerificarLista
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$projectRef = "fprwitwlvntnlnfqttrl"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$verificador = Join-Path $PSScriptRoot "verificar-backup-imip.ps1"
$objetos = New-Object 'System.Collections.Generic.List[object]'
$chaves = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
$contagens = @{}
$destino = $null
$concluido = $false

function Validar-CaminhoObjeto([string]$caminho) {
    if ([string]::IsNullOrWhiteSpace($caminho) -or $caminho.Length -gt 1024) {
        throw "Foi encontrado um nome de ficheiro invalido ou excessivamente longo."
    }
    if ($caminho.StartsWith("/") -or $caminho.Contains("\") -or $caminho.Contains(":")) {
        throw "Um caminho de objeto nao pode ser absoluto nem conter barras invertidas."
    }
    $partes = @($caminho.Split("/"))
    if ($partes.Count -lt 1) { throw "Caminho vazio." }
    foreach ($parte in $partes) {
        if ($parte -eq "" -or $parte -eq "." -or $parte -eq "..") {
            throw "Caminho de objeto inseguro (pasta relativa)."
        }
        if ($parte -match '[<>:"|?*\x00-\x1F]' -or $parte.EndsWith(" ") -or $parte.EndsWith(".") -or
            $parte -match '^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$') {
            throw "Nome de objeto incompativel com Windows; nao foi feita nenhuma copia."
        }
    }
    return ,$partes
}

try {
    if ([string]::IsNullOrWhiteSpace($Pasta)) {
        $base = Join-Path $root "backups-local"
        $ultimo = Get-ChildItem -LiteralPath $base -Directory -ErrorAction Stop |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "manifesto.json") } |
            Sort-Object Name -Descending | Select-Object -First 1
        if ($null -eq $ultimo) { throw "Backup SQL nao encontrado." }
        $Pasta = $ultimo.FullName
    }
    $Pasta = (Resolve-Path -LiteralPath $Pasta -ErrorAction Stop).Path

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verificador -Pasta $Pasta
    if ($LASTEXITCODE -ne 0) {
        throw "A integridade do backup SQL nao esta confirmada."
    }

    $origem = Join-Path $Pasta "data.sql"
    $leitor = New-Object System.IO.StreamReader($origem,[System.Text.Encoding]::UTF8,$true)
    $emObjetos = $false
    $colunas = @()
    $idxBucket = -1
    $idxNome = -1
    $blocos = 0
    $fechado = $false

    try {
        while ($null -ne ($linha = $leitor.ReadLine())) {
            if ($emObjetos) {
                if ($linha -ceq '\.') {
                    $emObjetos = $false
                    $fechado = $true
                    continue
                }
                $campos = @($linha.Split([char]9))
                if ($campos.Count -ne $colunas.Count) {
                    throw "Numero de campos inesperado em storage.objects."
                }
                $bucket = [string]$campos[$idxBucket]
                $nome = [string]$campos[$idxNome]
                # Os campos COPY sao tab-delimitados. Para nomes com escapes
                # PostgreSQL invulgares, parar em vez de adivinhar um caminho.
                if ($bucket -match '\\' -or $nome -match '\\') {
                    throw "Nome de objeto com escape PostgreSQL nao suportado."
                }
                if ($bucket -notin @("fotos-mcs","imagens-rodas")) {
                    throw "Encontrado objeto num bucket privado ou nao previsto: $bucket. Requer plano de backup separado."
                }
                $partes = @(Validar-CaminhoObjeto $nome)
                $identidade = $bucket + "/" + $nome
                if (-not $chaves.Add($identidade)) {
                    throw "Objeto duplicado no dump."
                }
                $objetos.Add([pscustomobject]@{
                    bucket = $bucket
                    caminho = $nome
                    partes = $partes
                })
                if (-not $contagens.ContainsKey($bucket)) { $contagens[$bucket] = 0 }
                $contagens[$bucket] += 1
                continue
            }

            if ($linha -match '^\s*COPY\s+"?storage"?\."?objects"?\s*\(([^)]*)\)\s+FROM\s+stdin;\s*$') {
                $blocos += 1
                if ($blocos -ne 1) { throw "Dump contem mais de um bloco storage.objects." }
                $colunas = @($Matches[1].Split(",") | ForEach-Object { $_.Trim().Trim('"') })
                $idxBucket = [array]::IndexOf($colunas,"bucket_id")
                $idxNome = [array]::IndexOf($colunas,"name")
                if ($idxBucket -lt 0 -or $idxNome -lt 0) {
                    throw "Colunas de storage.objects nao reconhecidas no dump."
                }
                $emObjetos = $true
            }
        }
    } finally {
        $leitor.Dispose()
    }

    if ($blocos -ne 1 -or $emObjetos -or -not $fechado) {
        throw "storage.objects nao esta completo no data.sql. Backup Storage nao executado."
    }
    if ($objetos.Count -eq 0) { throw "A exportacao nao contem objetos; a copia nao pode ser validada." }

    Write-Host ""
    Write-Host "IMIP - ficheiros Storage encontrados no backup SQL:" -ForegroundColor Cyan
    foreach ($bucket in @("fotos-mcs","imagens-rodas")) {
        $n = 0
        if ($contagens.ContainsKey($bucket)) { $n = $contagens[$bucket] }
        Write-Host ("  " + $bucket + ": " + $n)
    }
    Write-Host ("  Total: " + $objetos.Count)

    if ($ApenasVerificarLista) {
        Write-Host "PRE-VISUALIZACAO CONCLUIDA. Nenhuma imagem foi descarregada." -ForegroundColor Yellow
        $concluido = $true
    } else {
        $data = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss_UTC")
        $destino = Join-Path $Pasta ("storage-objetos-" + $data)
        if (Test-Path -LiteralPath $destino) {
            throw "A pasta de destino ja existe; nao sera sobrescrita."
        }
        New-Item -Path $destino -ItemType Directory -Force | Out-Null

        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        $registos = @()
        foreach ($obj in $objetos) {
            $relativo = $obj.bucket
            $codificados = @()
            foreach ($segmento in $obj.partes) {
                $relativo = Join-Path $relativo $segmento
                $codificados += [uri]::EscapeDataString($segmento)
            }
            $local = Join-Path $destino $relativo
            $dir = Split-Path $local -Parent
            New-Item -Path $dir -ItemType Directory -Force | Out-Null

            $url = "https://$projectRef.supabase.co/storage/v1/object/public/" +
                $obj.bucket + "/" + ($codificados -join "/")
            Invoke-WebRequest -Uri $url -OutFile $local -UseBasicParsing -TimeoutSec 90 -ErrorAction Stop

            $ficheiro = Get-Item -LiteralPath $local -ErrorAction Stop
            if ($ficheiro.Length -lt 1) { throw "Ficheiro de Storage vazio: " + $obj.bucket }
            $hash = (Get-FileHash -LiteralPath $local -Algorithm SHA256).Hash
            $registos += @{
                bucket = $obj.bucket
                caminho = $obj.caminho
                bytes = $ficheiro.Length
                sha256 = $hash
            }
            Write-Host ("OK: " + $obj.bucket + " (" + $registos.Count + "/" + $objetos.Count + ")") -ForegroundColor Green
        }

        if ($registos.Count -ne $objetos.Count) {
            throw "Numero de transferencias diferente do numero de objetos."
        }
        $manifesto = @{
            projeto = "Nacional de Rua"
            ref = $projectRef
            origen = "storage.objects do data.sql local validado"
            criado_em_utc = (Get-Date).ToUniversalTime().ToString("o")
            data_sql_sha256 = (Get-FileHash -LiteralPath $origem -Algorithm SHA256).Hash
            ficheiros = @($registos)
        }
        $manifesto | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destino "manifesto-storage.json") -Encoding UTF8
        Write-Host ""
        Write-Host "BACKUP STORAGE CONCLUIDO E FICHEIROS VERIFICADOS" -ForegroundColor Green
        Write-Host ("Pasta: " + $destino)
        Write-Host ("Objetos descarregados: " + $registos.Count)
        Write-Host "Guardar tambem esta pasta numa copia externa cifrada." -ForegroundColor Yellow
        $concluido = $true
    }
} catch {
    Write-Host ("BACKUP STORAGE NAO CONFIRMADO: " + $_.Exception.Message) -ForegroundColor Red
} finally {
    if (-not $concluido -and -not [string]::IsNullOrWhiteSpace($destino)) {
        Write-Host ("Possiveis ficheiros parciais na pasta: " + $destino) -ForegroundColor Yellow
    }
}

if (-not $concluido) { exit 1 }
