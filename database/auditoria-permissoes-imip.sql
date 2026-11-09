-- IMIP: auditoria de permissoes de funcoes privilegiadas (SOMENTE LEITURA).
-- Nao altera grants, RLS, resultados ou utilizadores.
-- Os avisos de SECURITY DEFINER exigem revisao funcional e testes reais.
-- NOTA: permissoes de EXECUTE e analise do codigo nao equivalem a teste de abuso.

with funcoes as (
  select p.oid,
         p.proname,
         pg_get_function_identity_arguments(p.oid) as argumentos,
         has_function_privilege('anon',p.oid,'EXECUTE') as anon_executa,
         has_function_privilege('authenticated',p.oid,'EXECUTE') as autenticado_executa
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
), revisao as (
  select *,
    (proname in (
      'pedir_acesso_perfil_mc',
      'pedir_acesso_perfil_organizacao',
      'pedir_registo_nova_roda'
    )) as formulario_publico_esperado,
    (proname in (
      'aprovar_pedido_roda_organizador',
      'aprovar_pedido_roda_organizador_existente',
      'aprovar_substituicao_responsavel_organizacao'
    )) as rpc_servidor_esperada
  from funcoes
)
select
  count(*) as funcoes_security_definer,
  count(*) filter (where anon_executa) as executaveis_anon,
  count(*) filter (where autenticado_executa) as executaveis_autenticado,
  count(*) filter (where anon_executa and not formulario_publico_esperado)
    as anon_inesperadas,
  count(*) filter (where rpc_servidor_esperada and
                  (anon_executa or autenticado_executa))
    as rpcs_servidor_expostas,
  count(*) filter (where formulario_publico_esperado and not anon_executa)
    as formularios_publicos_bloqueados,
  string_agg(proname, ', ' order by proname)
    filter (where anon_executa and not formulario_publico_esperado)
    as nomes_anon_inesperados
from revisao;
