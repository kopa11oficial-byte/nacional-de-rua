# Nacional de Rua — fecho funcional da versão 1.0

**Data:** 9 de novembro de 2026  
**Decisão:** versão 1.0 funcionalmente fechada para efeitos de passagem a operação e preparação da época oficial de 2027. **O desenvolvimento continua após o fecho**, com correções, melhorias, novas edições, perfis, organizações e funcionalidades.

## O que significa «fechado»

O fecho é uma **linha de base** do funcionamento existente, não o fim do projeto, não um bloqueio das edições pelas organizações e não uma garantia de ausência de erros. As melhorias futuras entram em versões subsequentes, preservando os dados, acessos, históricos e regras de pontuação já aprovados.

Não apagar perfis, edições de 2026, resultados, rankings, fotografias ou backups por causa deste fecho. Manter o site provisório acessível durante a transição de domínio.

## Evidências verificadas

- Testes manuais de MC, organização e suporte indicados como concluídos pelo responsável.
- Edições com resultados e rankings reais existentes e verificados pelo responsável. Nenhuma recalculação geral foi autorizada para este fecho.
- Reprodução de vídeos/cortes confirmada pelo responsável. Galeria fotográfica alimentada posteriormente pelas próprias organizações, conforme acordado.
- Recuperação local dos dados de aplicação `public` testada em base temporária: **27 rodas, 168 MCs, 14 edições (13 publicadas) e 321 pontuações**. As contagens coincidiram com o backup e a instância temporária foi removida.
- 23 ficheiros de imagens descarregados e verificados: 17 fotos MC e 6 imagens das rodas; cópia externa confirmada.
- Inventário de 20 contas Auth guardado. 20 entradas de `auth.users` e 20 de `auth.identities` extraídas do backup SQL e guardadas em pen USB protegida por BitLocker, com manifesto/hash registado.
- Auditoria de exposição das funções privilegiadas: nenhuma função anónima inesperada e nenhuma função reservada ao servidor exposta a `anon`/`authenticated`.
- O último workflow `Validar IMIP` da revisão pré-fecho `13338c8f255a206ef9312dd7a61c9af91b7266e9` terminou com sucesso. A validação GitHub não demonstra, por si só, que a última versão foi publicada na Cloudflare.

## Dependências da passagem para domínio oficial

**Domínio pretendido:** `nacionalderua.pt`. O nome aparecer no repositório **não prova registo, propriedade, disponibilidade ou DNS ativo**.

1. Confirmar registo/titularidade de `nacionalderua.pt` ou comprá-lo junto de uma entidade de registo de .pt.
2. Adicionar o domínio à mesma conta Cloudflare que tem o Worker `nacional-de-rua`, verificar delegação DNS/zona ativa.
3. Em Workers & Pages > `nacional-de-rua` > **Domains** (ou Settings > Domains & Routes), adicionar **Custom Domain** `nacionalderua.pt`; aguardar DNS/HTTPS. Não adicionar rota `custom_domain` no `wrangler.jsonc` antes da zona existir.
4. No Supabase Auth, configurar `Site URL` e `Redirect URLs` do domínio novo, mantendo os antigos durante a transição. Verificar recuperação de password/convites.
5. Ajustar `SITE_PUBLICO_URL` da Cloudflare para o domínio novo **só depois** de HTTPS e Auth estarem validados.
6. Verificar home, Rodas, Ranking, MCs/perfil, organização, suporte, links de login/recuperação e navegação no telemóvel. Confirmar que a versão publicada corresponde à última revisão estável.
7. Não desativar `workers.dev` sem verificar redirecionamentos, links antigos e todas as entradas públicas.

## Pontos que continuam em acompanhamento

- Testar um restauro integral do serviço Supabase Auth, incluindo identidades/UUIDs e permissões, num ambiente isolado. O backup Auth atual é uma cópia parcial de registos e não é prova de restauro completo.
- Testar um restauro de ficheiros Storage num destino isolado.
- Rever periodicamente os avisos e permissões de funções `SECURITY DEFINER`, com testes efetivos de negação de acesso.
- Melhorar miniaturas/fotografias quando as organizações alimentarem as galerias e durante a utilização real.
- Manutenção contínua, correções e novas versões. **Estes itens não anulam a decisão de fecho funcional da versão 1.0**, mas devem permanecer documentados e priorizados.

## Estado

**Versão 1.0: fecho funcional aceite.**  
**Domínio definitivo: por ativar/verificar.**  
**Publicação final e HTTPS no domínio definitivo: por confirmar.**  
**Trabalho contínuo: sim.**
