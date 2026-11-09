# IMIP — Revisão do Supabase antes do lançamento

**Data:** 9 de novembro de 2026  
**Projeto Supabase:** Nacional de Rua  
**Plano:** Free (sem alteração de plano ou custos)

## Estado confirmado

- Ligações de MC, organização e suporte anteriormente testadas pelo responsável do projeto.
- A época 2027 permanece em planeamento; nenhum dado de ranking, batalha ou pontuação foi alterado nesta revisão.
- A revisão anterior corrigiu a associação edição/roda em `frees_campeao` e otimizou oito políticas RLS.
- A revisão anterior acrescentou índices às relações prioritárias.
- **Tabelas internas com RLS e sem políticas:** `administradores`, `auditoria`, `mc_ativacoes_acesso`, `pedidos_registo_rodas` e `suportes_imip`. Confirmado que `anon` e `authenticated` não dispõem de SELECT ou INSERT diretos sobre estas tabelas. São acessíveis apenas através de fluxos internos autorizados.
- Não foram encontrados objetos de tabela na schema `public` com RLS desativado.
- A verificação simulada como utilizador autenticado da Batalha Central devolveu autorização para a própria edição e recusou gestão de uma edição da Klandestina. Uma identidade sem associação não recebeu permissões de administração, suporte ou gestão de edições.
- O acesso público de novos pedidos de MCs, organizações e rodas é **intencional**. Estas três funções usam `SECURITY DEFINER` para permitir submissão sem uma conta; possuem validações e controlo básico de repetição. Não revogar `EXECUTE` a `anon` sem substituir os formulários por uma alternativa segura.
- As restantes funções `SECURITY DEFINER` com `EXECUTE` para `authenticated` incluem verificações de propriedade, administrador ou suporte; o simples aviso da ferramenta não demonstra exploração. Requerem revisão contínua quando forem modificadas.

## Avisos conhecidos aceites ou pendentes

- **Auth / leaked password protection:** funcionalidade Supabase Pro ou superior; o projeto mantém-se em **Free**, conforme decisão expressa do responsável. Manter requisitos de palavras-passe fortes e únicas. Não assinalar este aviso como corrigido.
- **RLS enabled without policies:** cinco tabelas internas bloqueadas ao acesso direto de utilizadores e público; não criar políticas permissivas artificialmente.
- **Functions SECURITY DEFINER:** as funções públicas de submissão e as funções de gestão autenticada devem permanecer disponíveis. Alterar privilégios somente com análise das dependências e testes de regressão.
- **RLS performance `propostas_imip`:** aviso restante; confirmar necessidade antes de modificar uma regra de proposta em produção.
- **Multiple permissive policies:** aviso de composição/performance, não necessariamente vulnerabilidade. Revisar ao modificar regras correspondentes.
- **Foreign keys sem índice:** priorizar relações de uso comprovado; não criar índices apenas para silenciar a ferramenta.
- **Cópia de segurança da base de dados e restauro testado:** não verificados nesta revisão; devem constar no controlo final de lançamento.

## Resultado

A revisão não encontrou escalada de permissões nos cenários verificados e os fluxos de acesso essenciais devem manter-se disponíveis. **Não equivale a auditoria de segurança completa nem a garantia de inexistência de vulnerabilidades.** Executar novamente os *Database Advisors* e testes de aplicação após mudanças de autenticação, permissões ou resultados.
