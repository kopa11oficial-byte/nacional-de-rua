# IMIP — Plano de backup e recuperação (Supabase Free)

**Estado em 9/11/2026:** exportação SQL local concluída, integridade SHA-256 confirmada e segunda cópia fora do computador confirmada pelo responsável. **Restauro das tabelas `public` testado com sucesso numa base local em Docker, com contagens iguais às do backup. Auth, Storage e importação de roles ainda não foram validados.**  
**Supabase:** `fprwitwlvntnlnfqttrl` (Nacional de Rua).  
**Custo:** não altera o plano Free.

## O que é possível fazer gratuitamente

O Supabase [recomenda exportações manuais com a CLI no plano Free](https://supabase.com/docs/guides/platform/backups). Não há os backups diários automáticos incluídos nos planos pagos.

O script `scripts/backup-imip.ps1` cria **três ficheiros SQL locais** e um manifesto com tamanho e hash SHA-256. Segue o procedimento oficial:

- `roles.sql` — papéis/roles personalizados;
- `schema.sql` — estrutura da aplicação;
- `data.sql` — dados da aplicação (incluindo rodas, MCs, edições, batalhas e pontuação);
- `manifesto.json` — lista de ficheiros, data, tamanhos e hashes para conferir integridade.

**Atenção:** consoante a versão da CLI, o ficheiro `data.sql` pode conter instruções de tabelas internas de `storage` e outros schemas. Isso **não equivale a guardar os ficheiros físicos de fotografias/vídeos ou todas as contas Auth**. Esta exportação é essencial, mas **não é um backup integral do IMIP**. O script de teste filtra apenas as tabelas `public` numa cópia temporária, sem alterar o original.

## Executar no Windows

1. Instalar e abrir [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).
2. Instalar a [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), de forma que o comando `supabase --version` funcione no PowerShell.
3. Abrir o [projeto Nacional de Rua no Supabase](https://supabase.com/dashboard/project/fprwitwlvntnlnfqttrl), clicar em **Connect** e copiar a ligação PostgreSQL em **Session pooler**. Substituir o marcador da palavra-passe pela palavra-passe real da base de dados.
4. No PowerShell, dentro da pasta do repositório `nacional-de-rua`, executar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-imip.ps1
```

5. Quando solicitado, colar a ligação PostgreSQL no campo protegido. Não guardar essa ligação em ficheiros nem enviá-la por email ou chat.
6. Confirmar a mensagem **EXPORTAÇÃO CONCLUÍDA** e a presença da pasta `backups-local/AAAA-MM-DD_HH-mm-ss_UTC/` com os quatro ficheiros.

O script **não altera a base de dados** e o diretório `backups-local/` é ignorado pelo Git para evitar publicações acidentais. O manifesto não contém passwords.

## Guardar e validar

- Guardar uma segunda cópia num **disco externo cifrado** ou armazenamento com encriptação e autenticação forte. Uma cópia na mesma máquina **não protege** contra a perda dessa máquina.
- Não fazer commit dos ficheiros `.sql` nem do manifesto com dados da estrutura para o GitHub. **Nunca enviar a ligação PostgreSQL** para ferramentas públicas.
- Comparar o SHA-256 de cada ficheiro com o `manifesto.json` (PowerShell: `Get-FileHash .\backups-local\<pasta>\data.sql -Algorithm SHA256`).
- Fazer uma nova exportação antes do lançamento, depois de mudanças importantes e, pelo menos, semanalmente enquanto houver edições ativas.

## Teste local isolado no Windows (sem tocar na produção)

Foi criado o script `scripts/testar-restauro-imip.ps1`, que valida os hashes do backup, inicia uma base Supabase PostgreSQL **temporária no Docker**, importa `schema.sql` e uma versão temporária de `data.sql` limitada às tabelas `public`, verifica os totais de rodas, MCs, edições publicadas e pontuações e remove a instância de teste no final.

Executar na pasta do projeto, com Docker Desktop em execução:

```powershell
git pull --ff-only origin main
powershell -ExecutionPolicy Bypass -File .\scripts\testar-restauro-imip.ps1
```

- Não pede URL, credenciais ou password do Supabase remoto.
- O teste apenas pode iniciar a base local na máquina, numa pasta temporária independente. Pode descarregar imagens Docker.
- Se houver erro de compatibilidade nas extensões ou no SQL, **o restauro NÃO está validado**; não corrigir a produção para conseguir executar o teste.
- Limpar os contentores locais evita deixar outra cópia dos dados em execução; em caso de falha de limpeza, rever o Docker Desktop.
- Um teste SQL bem-sucedido **não valida** recuperação de contas do Supabase Auth, arquivos do Storage ou configurações da Cloudflare.

### Restauro local das tabelas da aplicação

O script `scripts/testar-restauro-imip.ps1` cria uma base de testes no Docker e utiliza `scripts/preparar-dados-publicos-imip.ps1` para gerar um SQL **temporário** com apenas os dados das tabelas `public`. Isto evita que tabelas internas como `storage.buckets_vectors` bloqueiem a importação na instância local.

```powershell
git pull --ff-only origin main
powershell -ExecutionPolicy Bypass -File .\scripts\testar-restauro-imip.ps1
```

O ficheiro original `data.sql` mantém-se intacto. O teste **não valida** a recuperação de contas Auth, ficheiros físicos do Storage nem a importação de `roles.sql`. Em caso de erro, não testar na base de produção.

### Resultado confirmado — 9 de novembro de 2026

Execução real do teste local confirmada por captura do terminal do responsável:

| Tabela | Registos recuperados |
|---|---:|
| `public.rodas` | 27 |
| `public.mcs` | 168 |
| `public.edicoes` | 14 (13 publicadas) |
| `public.pontuacoes` | 321 |

O script confirmou que os totais destas quatro tabelas coincidem com a exportação original, apresentou `RESTAURO SQL LOCAL CONCLUIDO` e concluiu com `TESTE CONCLUIDO E INSTANCIA TEMPORARIA REMOVIDA`. O backup original permaneceu inalterado, confirmado previamente por hashes SHA-256. A segunda cópia em armazenamento externo foi confirmada pelo responsável.

**Alcance:** recuperação local dos dados da aplicação nas tabelas `public`, não recuperação integral do projeto. O teste não importou `roles.sql` e não comprovou restauro das contas Auth, dos ficheiros físicos do Storage nem das configurações da Cloudflare.

## Backup dos ficheiros do Supabase Storage

Em 9/11/2026 foram identificados 23 objetos em buckets públicos: `fotos-mcs` (17) e `imagens-rodas` (6). Os buckets privados `galeria-mcs` e `videos-mcs` estavam vazios. Estes totais são uma observação de produção, **não** uma prova de que os ficheiros foram descarregados.

O script `scripts/backup-storage-imip.ps1` lê os caminhos dos objetos do `storage.objects` presente no `data.sql` validado. Descarrega cada ficheiro público através do endpoint oficial de Storage, sem precisar de palavra-passe, chave `service_role` ou alteração de permissões. Mantém a estrutura das pastas dos buckets e guarda um `manifesto-storage.json` com SHA-256 e tamanho de cada ficheiro.

No terminal PowerShell do VS Code:

```powershell
git pull --ff-only origin main
powershell -ExecutionPolicy Bypass -File .\scripts\backup-storage-imip.ps1
```

Para apenas contar objetos sem descarregar nenhum: `powershell -ExecutionPolicy Bypass -File .\scripts\backup-storage-imip.ps1 -ApenasVerificarLista`.

Resultado de sucesso esperado: `BACKUP STORAGE CONCLUIDO E FICHEIROS VERIFICADOS`. A pasta `storage-objetos-AAAA-MM-DD_HH-mm-ss_UTC` é criada dentro da pasta do backup SQL já existente, em `backups-local`, excluída do Git. É necessário copiar **também** esta nova pasta para um destino cifrado externo.

**Limites:** o Storage pode ter sido alterado depois do `data.sql` de origem; os objetos descarregados correspondem aos caminhos dessa exportação, não necessariamente a novos objetos adicionados posteriormente. Repetir a exportação SQL antes de novos backups. Este procedimento não recupera automaticamente permissões/políticas de Storage e não cobre buckets privados que venham a ter ficheiros; nesse caso deve ser implementado download autenticado, sem abrir o bucket ao público. Não foi realizado um teste integral de restauro dos ficheiros no projeto.
## Como verificar se realmente é recuperável

1. **Nunca testar o restauro na base de dados de produção.**
2. Num PostgreSQL isolado ou projeto de testes descartável, seguir a [documentação oficial de backup e restauro via CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
3. Confirmar que é possível recuperar pelo menos rodas, MCs, edições, batalhas e pontuações, e que os totais correspondem ao manifesto/ao momento da exportação.
4. Documentar a data do teste, destino usado e se foi bem-sucedido. Só então marcar `restauro_testado: true` num registo de auditoria separado; **não alterar retroativamente o manifesto original**.

### Componentes adicionais que precisam de plano próprio

- **Contas de utilizador:** o schema `auth` é gerido pelo Supabase e está excluído da exportação padrão. Um plano integral de recuperação deve abranger as contas e a reconfiguração do Auth, com acesso administrativo e procedimento testado.
- **Fotografias, capas e outros ficheiros:** exportar também os **objetos reais** dos buckets Supabase Storage, não apenas os metadados da base de dados. Consultar a [documentação de download de objetos](https://supabase.com/docs/guides/storage/management/download-objects).
- **Cloudflare e configurações:** manter o código, os segredos do servidor e a configuração de DNS/Worker documentados em ambiente seguro. O GitHub contém o código, mas não substitui as credenciais e os dados.

## Condição de fecho

**Backup concluído** = ficheiros SQL exportados e copiados em armazenamento seguro **fora do Supabase**.  
**Recuperação confirmada** = restauro validado num ambiente separado **e** plano documentado para Auth e Storage.

Os dados da aplicação `public` já passaram num teste real de restauro local. Ainda não afirmar que o projeto dispõe de um backup **integral** recuperável até haver plano e testes para Auth, Storage e privilégios.
