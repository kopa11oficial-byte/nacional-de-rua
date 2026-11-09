# IMIP - valida URLs PostgreSQL sem ligar a bases de dados.
# Sem logging de URLs, usuarios, passwords ou tokens.
function ConvertTo-ImipPgUri {
  param(
    [Parameter(Mandatory=$true)][string]$Ligacao,
    [string]$ProjectRef = "fprwitwlvntnlnfqttrl"
  )

  $texto = $Ligacao.Trim()
  if (($texto.StartsWith('"') -and $texto.EndsWith('"')) -or
      ($texto.StartsWith("'") -and $texto.EndsWith("'"))) {
    $texto = $texto.Substring(1,$texto.Length-2).Trim()
  }
  if ([string]::IsNullOrWhiteSpace($texto)) {
    throw "O campo PostgreSQL ficou vazio."
  }
  if ($texto -match '(?i)\[YOUR-PASSWORD\]') {
    throw "A ligacao ainda tem [YOUR-PASSWORD]. Substitui pela password da base de dados."
  }

  # Usar o ultimo @ para aceitar passwords com @ (sem percent-encoding).
  # O nome do projeto fica no usuario do pooler ou no host directo.
  $padrao = '^(?<scheme>postgres(?:ql)?)://(?<user>[^:/@]+):(?<password>.+)@(?<host>[a-zA-Z0-9.-]+):(?<port>[0-9]{2,5})/(?<database>[A-Za-z0-9_]+)(?<suffix>\?[^#]*)?$'
  if ($texto -notmatch $padrao) {
    throw "Formato PostgreSQL nao reconhecido. Copia a URI em Connect > Session pooler > URI."
  }
  $esquema = $Matches['scheme'].ToLowerInvariant()
  $utilizador = $Matches['user']
  $password = $Matches['password']
  $hostNome = $Matches['host'].ToLowerInvariant()
  $porta = [int]$Matches['port']
  $base = $Matches['database']
  $query = $Matches['suffix']

  $pooler = ($utilizador -ieq ('postgres.' + $ProjectRef) -and
              ($hostNome -match '(^|\.)pooler\.supabase\.(com|co)$'))
  $direct = ($utilizador -ieq 'postgres' -and
             ($hostNome -eq ('db.' + $ProjectRef + '.supabase.co') -or
              $hostNome -eq ('db.' + $ProjectRef + '.supabase.com')))
  if (-not ($pooler -or $direct)) {
    throw "A referencia do projeto ou o servidor nao correspondem ao Nacional de Rua. Copia a URI do projeto IMIP."
  }
  if ($porta -ne 5432 -and $porta -ne 6543) {
    throw "Porta PostgreSQL inesperada. Usa o Session pooler (5432)."
  }
  if ($base -ine 'postgres') {
    throw "A base de dados indicada nao e postgres."
  }

  # A Supabase CLI exige uma URL com passwords percent-encoded.
  # Se a password ja inclui percent-encoding, conserva-la; caso
  # contrario codifica automaticamente @, #, :, ?, !, etc.
  $passUrl = $password
  if ($password -notmatch '%[0-9a-fA-F]{2}') {
    $passUrl = [Uri]::EscapeDataString($password)
  }

  $resultado = '{0}://{1}:{2}@{3}:{4}/{5}{6}' -f $esquema,$utilizador,$passUrl,$hostNome,$porta,$base,$query
  $uri = $null
  if (-not [Uri]::TryCreate($resultado,[UriKind]::Absolute,[ref]$uri)) {
    throw "A URI nao pode ser interpretada; verifica apenas o formato em Connect."
  }
  if ($uri.Host -ine $hostNome) {
    throw "O servidor PostgreSQL da URI nao foi reconhecido."
  }
  return $resultado
}
