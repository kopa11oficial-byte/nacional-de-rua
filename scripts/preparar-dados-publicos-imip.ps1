# IMIP - cria SQL temporario apenas com dados das tabelas public
# NAO altera data.sql original. Nao executa comandos na base de dados.
# Windows PowerShell 5.1, sem bibliotecas externas.
param(
    [Parameter(Mandatory=$true)][string]$Origem,
    [Parameter(Mandatory=$true)][string]$Destino
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$leitor = $null
$escritor = $null
$emCopia = $false
$incluir = $false
$tabelaAtual = ""
$blocosPublicos = 0
$blocosIgnorados = 0
$contagens = @{}
$linhaNumero = 0
$comandosOmitidos = @{}
$terminou = $false

try {
    $origemReal = (Resolve-Path -LiteralPath $Origem -ErrorAction Stop).Path
    $destinoReal = [System.IO.Path]::GetFullPath($Destino)
    if ([string]::Equals($origemReal,$destinoReal,[System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Origem e destino sao iguais. O backup original nao pode ser alterado."
    }
    $leitor = [System.IO.StreamReader]::new($origemReal,[System.Text.Encoding]::UTF8,$true)
    $escritor = [System.IO.StreamWriter]::new($destinoReal,$false,[System.Text.UTF8Encoding]::new($false))
    $escritor.WriteLine("-- IMIP: dados public apenas, gerados para TESTE LOCAL de restauro.")
    $escritor.WriteLine("-- Dados de auth, storage e outros schemas NAO sao incluidos.")
    $escritor.WriteLine("SET client_encoding = 'UTF8';")

    while ($null -ne ($linha = $leitor.ReadLine())) {
        $linhaNumero += 1

        if ($emCopia) {
            if ($linha -ceq '\.') {
                if ($incluir) { $escritor.WriteLine($linha) }
                $emCopia = $false
                $incluir = $false
                $tabelaAtual = ""
            } elseif ($incluir) {
                # Linha de COPY: escrever sem interpretar ou transformar os dados.
                $escritor.WriteLine($linha)
                $contagens[$tabelaAtual] += 1
            }
            continue
        }

        if ($linha -match '^\s*COPY\s+') {
            $padrao = '^\s*COPY\s+(?<schema>"[^"]+"|[A-Za-z_][A-Za-z_0-9]*)\.(?<table>"[^"]+"|[A-Za-z_][A-Za-z_0-9]*)\s*(?:\(.*\))?\s+FROM\s+stdin;\s*$'
            if ($linha -cnotmatch $padrao) {
                throw ("Formato COPY nao reconhecido na linha " + $linhaNumero + "; teste interrompido para evitar perda de dados.")
            }
            $esquema = $Matches["schema"].Trim('"')
            $nomeTabela = $Matches["table"].Trim('"')
            $incluir = $esquema -ceq "public"
            $emCopia = $true
            if ($incluir) {
                if (-not $contagens.ContainsKey($nomeTabela)) { $contagens[$nomeTabela] = 0 }
                $tabelaAtual = $nomeTabela
                $escritor.WriteLine($linha)
                $blocosPublicos += 1
            } else {
                $blocosIgnorados += 1
            }
            continue
        }

        if ($linha -match '^\s*SELECT\s+pg_catalog\.setval\s*\(') {
            # Manter os valores das sequencias da app, nunca os internos.
            if ($linha -match "^\s*SELECT\s+pg_catalog\.setval\s*\(\s*'public\.") {
                $escritor.WriteLine($linha)
            } elseif ($linha -notmatch "^\s*SELECT\s+pg_catalog\.setval\s*\(\s*'[^']+\.") {
                throw ("Sequencia inesperada na linha " + $linhaNumero)
            }
            continue
        }

        # Comandos administrativos e comentarios do pg_dump que nao transportam
        # registos da aplicacao. O ficheiro gerado define apenas UTF8.
        if ($linha -match '^\s*$' -or
            $linha -match '^\s*--' -or
            $linha -match '^\s*SET\s+' -or
            $linha -match '^\s*SELECT\s+pg_catalog\.set_config\s*\(' -or
            $linha -match '^\s*\\(?:restrict|unrestrict)\b') {
            continue
        }

        # Este filtro NAO executa SQL desconhecido. O restauro de dados
        # da aplicacao e feito exclusivamente a partir de COPY public.*
        # e de sequencias public.* explicitamente reconhecidas.
        # DML fora de COPY pode conter dados que nao seriam recuperados:
        # falhar em vez de fingir que o backup ficou completo.
        if ($linha -match '^\s*(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|REPLACE|UPSERT)\b') {
            $tipo = $Matches[0].Trim()
            throw ("Comando de dados " + $tipo + " fora de COPY, na linha " + $linhaNumero + ". Teste interrompido.")
        }

        # Dump pg_dump pode ter instrucoes de configuracao, grants,
        # comentarios e metacomandos entre os blocos de dados. Esses
        # comandos ficam fora do SQL temporario, nunca sao executados.
        # Mostrar apenas a categoria e numero de linha, sem dados.
        $trimmed = $linha.TrimStart()
        $tipo = "OUTRO"
        if ($trimmed -match '^([A-Za-z_][A-Za-z_0-9]*)\b') {
            $tipo = $Matches[1].ToUpperInvariant()
        } elseif ($trimmed.StartsWith("\")) {
            $tipo = "META_PSQL"
        }
        if (-not $comandosOmitidos.ContainsKey($tipo)) {
            $comandosOmitidos[$tipo] = 0
        }
        $comandosOmitidos[$tipo] += 1
    }

    if ($emCopia) { throw "Bloco COPY terminou sem linha de fecho. Exportacao incompleta." }
    foreach ($nomeObrigatorio in @("rodas","mcs","edicoes","pontuacoes")) {
        if (-not $contagens.ContainsKey($nomeObrigatorio) -or $contagens[$nomeObrigatorio] -le 0) {
            throw ("Dados obrigatorios ausentes: public." + $nomeObrigatorio)
        }
    }
    if ($blocosPublicos -lt 4) { throw "Numero de tabelas public inesperadamente baixo." }

    Write-Host ("Blocos public selecionados: " + $blocosPublicos) -ForegroundColor Green
    Write-Host ("Blocos internos ignorados para este teste: " + $blocosIgnorados)
    foreach ($nome in @("rodas","mcs","edicoes","pontuacoes")) {
        Write-Host ("Backup public." + $nome + ": " + $contagens[$nome] + " linhas")
    }
    if ($comandosOmitidos.Count -gt 0) {
        Write-Host "Instrucoes fora de COPY omitidas (apenas categorias, nunca dados):" -ForegroundColor Yellow
        foreach ($tipo in @($comandosOmitidos.Keys | Sort-Object)) {
            Write-Host ("  " + $tipo + ": " + $comandosOmitidos[$tipo])
        }
        Write-Host "Estas instrucoes NAO foram testadas como parte da recuperacao SQL." -ForegroundColor Yellow
    }
    # Contagens esperadas para comparar com a base restaurada.
    # Guardadas apenas na pasta local temporaria; sem linhas do backup.
    $resumoPath = $destinoReal + ".contagens.json"
    $contagens | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resumoPath -Encoding UTF8
    $terminou = $true
} catch {
    Write-Host ("FALHA AO PREPARAR DADOS: " + $_.Exception.Message) -ForegroundColor Red
} finally {
    if ($null -ne $leitor) { $leitor.Dispose() }
    if ($null -ne $escritor) { $escritor.Dispose() }
    if (-not $terminou -and (Test-Path -LiteralPath $Destino -PathType Leaf)) {
        Remove-Item -LiteralPath $Destino -Force -ErrorAction SilentlyContinue
    }
    $resumoPath = $Destino + ".contagens.json"
    if (-not $terminou -and (Test-Path -LiteralPath $resumoPath -PathType Leaf)) {
        Remove-Item -LiteralPath $resumoPath -Force -ErrorAction SilentlyContinue
    }
}

if (-not $terminou) { exit 1 }
