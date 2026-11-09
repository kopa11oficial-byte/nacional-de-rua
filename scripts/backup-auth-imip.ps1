# IMIP - copia confidencial do Supabase Auth para disco EXTERNO CIFRADO
# Windows PowerShell 5.1. Nao modifica a base de dados de producao.
# NUNCA guardar esta copia em GitHub, partilhar em chats ou email.
# A exportacao pode conter hashes de passwords e tokens/sessoes.
# Para recuperar contas e necessario testar importacao num ambiente novo.

param(
  [string]$DestinoCifrado
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRef = "fprwitwlvntnlnfqttrl"
. (Join-Path $PSScriptRoot "validar-ligacao-imip.ps1")
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pasta = $null
$ficheiro = $null
$secureUrl = $null
$dbUrl = $null
$completo = $false

try {
  if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    throw "Docker nao encontrado. Abre Docker Desktop."
  }
  & docker info --format '{{.ServerVersion}}' 1> $null 2> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker Desktop nao esta ativo." }

  if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue) -and
      -not (Get-Command "npx.cmd" -ErrorAction SilentlyContinue)) {
    throw "E necessario Supabase CLI ou npx (Node.js)."
  }

  Write-Host ""
  Write-Host "IMIP - BACKUP CONFIDENCIAL DAS CONTAS AUTH" -ForegroundColor Cyan
  Write-Host "Contem dados de autenticacao sensiveis, potencialmente hashes de passwords e tokens." -ForegroundColor Yellow
  Write-Host "Esta copia deve ser guardada diretamente numa unidade EXTERNA CIFRADA." -ForegroundColor Yellow
  Write-Host "Nunca mostrar o conteudo do SQL, credenciais ou URLs em capturas de ecra." -ForegroundColor Yellow

  if ([string]::IsNullOrWhiteSpace($DestinoCifrado)) {
    $DestinoCifrado = Read-Host "Indica a pasta EXISTENTE no disco cifrado (por exemplo E:\IMIP)"
  }
  if (-not [System.IO.Path]::IsPathRooted($DestinoCifrado)) {
    throw "Indica um caminho absoluto para uma pasta existente e cifrada."
  }
  $base = (Resolve-Path -LiteralPath $DestinoCifrado -ErrorAction Stop).Path
  if (-not (Test-Path -LiteralPath $base -PathType Container)) {
    throw "O destino nao e uma pasta."
  }
  if ($base.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "O destino nao pode estar dentro do projeto GitHub."
  }
  if ([System.IO.Path]::GetPathRoot($base) -eq [System.IO.Path]::GetPathRoot($repoRoot)) {
    throw "Usa uma unidade externa cifrada ou um volume cifrado montado noutra letra."
  }

  $confirmar = Read-Host "Confirmas que a unidade indicada esta CIFRADA? Escreve SIM"
  if ($confirmar -cne "SIM") {
    throw "Operacao cancelada: o destino tem de estar cifrado."
  }

  Write-Host "Abre Supabase > Connect > Session pooler e copia a ligacao PostgreSQL." -ForegroundColor Cyan
  $secureUrl = Read-Host "Cola a ligacao PostgreSQL no campo protegido" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
  try {
    $dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }

  # A validacao anterior so aceitava .supabase.com e rejeitava
  # ligacoes Direct .supabase.co e algumas passwords com caracteres especiais.
  # A funcao nao revela a ligacao. Usa apenas dados ficticios nos testes CI.
  $dbUrl = ConvertTo-ImipPgUri -Ligacao $dbUrl -ProjectRef $projectRef
  Write-Host "Formato PostgreSQL do projeto IMIP validado, sem expor credenciais." -ForegroundColor Green

  $carimbo = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss_UTC")
  $pasta = Join-Path $base ("IMIP-Auth-" + $carimbo)
  if (Test-Path -LiteralPath $pasta) {
    throw "A pasta de destino ja existe; nao vou sobrescrever ficheiros."
  }
  New-Item -ItemType Directory -Path $pasta -Force | Out-Null
  $ficheiro = Join-Path $pasta "auth-dados.sql"

  Write-Host "A exportar Auth DIRETAMENTE para a unidade cifrada..."
  if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    & supabase db dump --db-url $dbUrl --schema auth --data-only --use-copy -f $ficheiro
  } else {
    & npx.cmd --yes supabase db dump --db-url $dbUrl --schema auth --data-only --use-copy -f $ficheiro
  }
  if ($LASTEXITCODE -ne 0) { throw "A exportacao Auth falhou." }

  $item = Get-Item -LiteralPath $ficheiro -ErrorAction Stop
  if ($item.Length -lt 100) { throw "O ficheiro Auth ficou vazio ou incompleto." }

  # Nunca imprimir linhas do ficheiro Auth. Contar apenas linhas dos COPY.
  $userCount = 0
  $identityCount = 0
  $userBlocks = 0
  $identityBlocks = 0
  $emCopia = ""
  $leitor = New-Object System.IO.StreamReader($ficheiro,[System.Text.Encoding]::UTF8,$true)
  try {
    while ($null -ne ($linha = $leitor.ReadLine())) {
      if ($emCopia -ne "") {
        if ($linha -ceq '\.') {
          $emCopia = ""
        } elseif ($emCopia -eq "users") {
          $userCount += 1
        } elseif ($emCopia -eq "identities") {
          $identityCount += 1
        }
        continue
      }
      if ($linha -match '^\s*COPY\s+(?:"?auth"?\.)"?users"?\s*\(.*\)\s+FROM\s+stdin;\s*$') {
        $emCopia = "users"
        $userBlocks += 1
      } elseif ($linha -match '^\s*COPY\s+(?:"?auth"?\.)"?identities"?\s*\(.*\)\s+FROM\s+stdin;\s*$') {
        $emCopia = "identities"
        $identityBlocks += 1
      }
    }
  } finally {
    $leitor.Dispose()
  }

  if ($emCopia -ne "" -or $userBlocks -ne 1 -or
      $identityBlocks -ne 1 -or $userCount -lt 1 -or $identityCount -lt 1) {
    throw "Nao foi possivel confirmar os blocos de utilizadores e identidades. Backup Auth NAO validado."
  }

  $hash = (Get-FileHash -LiteralPath $ficheiro -Algorithm SHA256).Hash
  $manifesto = @{
    projeto = "Nacional de Rua"
    referencia_supabase = $projectRef
    gerado_em_utc = (Get-Date).ToUniversalTime().ToString("o")
    origem = "Supabase CLI auth, data-only, use-copy"
    ficheiro = "auth-dados.sql"
    bytes = $item.Length
    sha256 = $hash
    utilizadores = $userCount
    identidades = $identityCount
    restauracao_testada = $false
    contem_dados_sensiveis = $true
  }
  $manifesto | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath (Join-Path $pasta "manifesto-auth.json") -Encoding UTF8

  Write-Host ""
  Write-Host "EXPORTACAO AUTH CONCLUIDA E INTEGRIDADE REGISTADA" -ForegroundColor Green
  Write-Host ("Contas em auth.users: " + $userCount)
  Write-Host ("Identidades em auth.identities: " + $identityCount)
  Write-Host ("Tamanho SQL: " + $item.Length + " bytes")
  Write-Host ("Pasta cifrada: " + $pasta)
  Write-Host "A exportacao nao constitui teste de restauro do Auth." -ForegroundColor Yellow
  Write-Host "NUNCA publiques, envies ou partilhes auth-dados.sql." -ForegroundColor Yellow
  $completo = $true
} catch {
  Write-Host ("BACKUP AUTH NAO CONFIRMADO: " + $_.Exception.Message) -ForegroundColor Red
} finally {
  $dbUrl = $null
  $secureUrl = $null
  if (-not $completo -and $null -ne $ficheiro -and
      (Test-Path -LiteralPath $ficheiro -PathType Leaf)) {
    Remove-Item -LiteralPath $ficheiro -Force -ErrorAction SilentlyContinue
    Write-Host "Ficheiro SQL parcial eliminado da pasta cifrada." -ForegroundColor Yellow
  }
}
if (-not $completo) { exit 1 }
