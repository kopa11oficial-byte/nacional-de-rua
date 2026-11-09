# Extrai SOMENTE auth.users e auth.identities de uma exportacao SQL existente.
# Sem rede, passwords ou alteracoes ao SQL de origem.
# O destino deve estar numa unidade cifrada e protegida.
param(
  [Parameter(Mandatory=$true)][string]$Origem,
  [Parameter(Mandatory=$true)][string]$Destino
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$leitor = $null
$escritor = $null
$ok = $false
$emBloco = ""
$blocos = @{"users"=0;"identities"=0}
$linhas = @{"users"=0;"identities"=0}

try {
  $source = (Resolve-Path -LiteralPath $Origem -ErrorAction Stop).Path
  $target = [IO.Path]::GetFullPath($Destino)
  if ([string]::Equals($source,$target,[StringComparison]::OrdinalIgnoreCase)) {
    throw "O SQL original nao pode ser alterado."
  }
  if (Test-Path -LiteralPath $target) {
    throw "O destino ja existe. Nao vamos sobrescrever."
  }

  $leitor = New-Object IO.StreamReader($source,[Text.Encoding]::UTF8,$true)
  $escritor = New-Object IO.StreamWriter($target,$false,(New-Object Text.UTF8Encoding($false)))
  $escritor.WriteLine("-- IMIP: copias dos registos auth.users e auth.identities")
  $escritor.WriteLine("-- Ficheiro CONFIDENCIAL: nao publicar, enviar ou partilhar.")
  $escritor.WriteLine("SET client_encoding = 'UTF8';")
  $escritor.WriteLine("")

  $padrao = '^\s*COPY\s+(?:"?auth"?\.)"?(?<tabela>users|identities)"?\s*\([^)]*\)\s+FROM\s+stdin;\s*$'
  while ($null -ne ($linha = $leitor.ReadLine())) {
    if ($emBloco -ne "") {
      $escritor.WriteLine($linha)
      if ($linha -ceq '\.') {
        $emBloco = ""
        $escritor.WriteLine("")
      } else {
        $linhas[$emBloco] += 1
      }
      continue
    }

    if ($linha -match $padrao) {
      $tabela = $Matches["tabela"]
      $blocos[$tabela] += 1
      if ($blocos[$tabela] -ne 1) {
        throw "Mais de um bloco de uma tabela Auth; nao se assume exportacao completa."
      }
      $emBloco = $tabela
      $escritor.WriteLine($linha)
    }
  }

  if ($emBloco -ne "" -or $blocos["users"] -ne 1 -or $blocos["identities"] -ne 1) {
    throw "O SQL anterior NAO contem ambos os blocos auth.users e auth.identities. Nao e possivel reutilizar esta copia."
  }
  if ($linhas["users"] -lt 1 -or $linhas["identities"] -lt 1) {
    throw "As tabelas Auth nao tem dados suficientes para validar a copia."
  }
  $ok = $true
  Write-Host "EXTRACAO AUTH A PARTIR DO SQL CONCLUIDA" -ForegroundColor Green
  Write-Host ("Contas em auth.users: " + $linhas["users"])
  Write-Host ("Identidades em auth.identities: " + $linhas["identities"])
} catch {
  Write-Host ("EXTRACAO NAO CONFIRMADA: " + $_.Exception.Message) -ForegroundColor Red
} finally {
  if ($null -ne $leitor) { $leitor.Dispose() }
  if ($null -ne $escritor) { $escritor.Dispose() }
  if (-not $ok -and (Test-Path -LiteralPath $Destino -PathType Leaf)) {
    Remove-Item -LiteralPath $Destino -Force -ErrorAction SilentlyContinue
  }
}
if (-not $ok) { exit 1 }
