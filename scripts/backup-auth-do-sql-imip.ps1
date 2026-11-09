# IMIP - criar copia CONFIDENCIAL de Auth a partir do backup SQL que ja existe
# NAO liga ao Supabase, NAO pede password, NAO altera a base de dados.
# Se o SQL antigo nao contem auth.users e auth.identities, nao cria backup.
# Executar apenas num destino externo cifrado, por exemplo D:\IMIP.
param(
  [Parameter(Mandatory=$true)][string]$DestinoCifrado
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$raizProjeto = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$verificador = Join-Path $PSScriptRoot "verificar-backup-imip.ps1"
$extrator = Join-Path $PSScriptRoot "extrair-auth-imip.ps1"
$destino = $null
$sucesso = $false

try {
  $base = (Resolve-Path -LiteralPath $DestinoCifrado -ErrorAction Stop).Path
  if (-not (Test-Path -LiteralPath $base -PathType Container)) {
    throw "A pasta da unidade cifrada nao existe."
  }
  if ([IO.Path]::GetPathRoot($base) -eq [IO.Path]::GetPathRoot($raizProjeto)) {
    throw "Usa a pen USB cifrada, numa unidade diferente do computador."
  }

  Write-Host ""
  Write-Host "IMIP - PROTECAO DAS CONTAS A PARTIR DO BACKUP SQL JA EXISTENTE" -ForegroundColor Cyan
  Write-Host "Esta operacao nao liga ao Supabase nem pede qualquer password." -ForegroundColor Green
  Write-Host "O resultado pode conter hashes de passwords. Destino apenas cifrado." -ForegroundColor Yellow
  $confirmacao = Read-Host "Confirmas que o destino esta CIFRADO? Escreve SIM"
  if ($confirmacao -cne "SIM") { throw "Operacao cancelada." }

  $localBase = Join-Path $raizProjeto "backups-local"
  $backup = Get-ChildItem -LiteralPath $localBase -Directory -ErrorAction Stop |
      Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "manifesto.json") } |
      Sort-Object Name -Descending |
      Select-Object -First 1
  if ($null -eq $backup) { throw "Nao foi encontrado o backup SQL local anterior." }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verificador -Pasta $backup.FullName
  if ($LASTEXITCODE -ne 0) { throw "A integridade do backup anterior nao foi confirmada." }

  $origem = Join-Path $backup.FullName "data.sql"
  $pasta = "IMIP-Auth-SQL-" + (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss_UTC")
  $destino = Join-Path $base $pasta
  if (Test-Path -LiteralPath $destino) {
    throw "O destino ja existe; nao vai ser sobrescrito."
  }
  New-Item -ItemType Directory -Path $destino -Force | Out-Null
  $dados = Join-Path $destino "auth-dados.sql"

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $extrator -Origem $origem -Destino $dados
  if ($LASTEXITCODE -ne 0) { throw "O SQL anterior nao continha os blocos Auth necessarios." }

  $item = Get-Item -LiteralPath $dados -ErrorAction Stop
  if ($item.Length -lt 200) { throw "O ficheiro confidencial ficou incompleto." }

  $manifesto = @{
    projeto = "Nacional de Rua"
    origem = "backup SQL local (auth.users e auth.identities)"
    copia_parcial_auth = $true
    restauracao_testada = $false
    ficheiro = "auth-dados.sql"
    criado_em_utc = (Get-Date).ToUniversalTime().ToString("o")
    sha256 = (Get-FileHash -LiteralPath $dados -Algorithm SHA256).Hash
    bytes = $item.Length
  }
  $manifesto | ConvertTo-Json -Depth 4 |
      Set-Content -LiteralPath (Join-Path $destino "manifesto-auth.json") -Encoding UTF8
  Write-Host ""
  Write-Host "BACKUP AUTH LOCAL GUARDADO NA PEN CIFRADA E INTEGRIDADE REGISTADA" -ForegroundColor Green
  Write-Host ("Pasta: " + $destino)
  Write-Host "Esta copia contem utilizadores e identidades, NAO todo o servico Auth." -ForegroundColor Yellow
  Write-Host "Ainda falta testar a recuperacao num ambiente separado." -ForegroundColor Yellow
  Write-Host "Nao partilhes o SQL nem copies estes ficheiros para o GitHub." -ForegroundColor Yellow
  $sucesso = $true
} catch {
  Write-Host ("BACKUP AUTH LOCAL NAO CONCLUIDO: " + $_.Exception.Message) -ForegroundColor Red
} finally {
  if (-not $sucesso -and $null -ne $destino -and (Test-Path -LiteralPath $destino -PathType Container)) {
    Remove-Item -LiteralPath $destino -Recurse -Force -ErrorAction SilentlyContinue
  }
}
if (-not $sucesso) { exit 1 }
