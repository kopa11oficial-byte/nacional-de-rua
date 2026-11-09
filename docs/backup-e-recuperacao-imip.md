# IMIP — Plano de backup e recuperação (Supabase Free)

**Estado em 9/11/2026:** rotina local preparada; **não existe backup exportado e restauro verificado** nesta revisão.  
**Supabase:** `fprwitwlvntnlnfqttrl` (Nacional de Rua).  
**Custo:** não altera o plano Free.

## O que é possível fazer gratuitamente

O Supabase [recomenda exportações manuais com a CLI no plano Free](https://supabase.com/docs/guides/platform/backups). Não há os backups diários automáticos incluídos nos planos pagos.

O script `scripts/backup-imip.ps1` cria **três ficheiros SQL locais** e um manifesto com tamanho e hash SHA-256. Segue o procedimento oficial:

- `roles.sql` — papéis/roles personalizados;
- `schema.sql` — estrutura da aplicação;
- `data.sql` — dados da aplicação (incluindo rodas, MCs, edições, batalhas e pontuação);
- `manifesto.json` — lista de ficheiros, data, tamanhos e hashes para conferir integridade.

**Atenção:** o comando oficial `supabase db dump` exclui schemas geridos pelo Supabase, incluindo `auth` e `storage`. Esta cópia NÃO contém contas e palavras-passe do Auth nem os ficheiros físicos de imagens/vídeos armazenados nos buckets. É um backup essencial dos dados de negócio, mas **não é, por si só, um restauro completo do IMIP**.

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

Até estas condições se verificarem, não afirmar que o projeto dispõe de um backup integral recuperável.
