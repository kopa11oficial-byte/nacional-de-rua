-- IMIP - inventario de recuperacao de contas (somente leitura)
-- Executar APENAS no SQL Editor do projeto Nacional de Rua.
-- O resultado contem emails e IDs pessoais. Exportar o CSV para armazenamento
-- cifrado fora do computador. NUNCA publicar os resultados no GitHub ou chat.
-- NAO inclui passwords, hashes, tokens nem credenciais.
-- Nao altera contas, permissoes ou tabelas.

select
    u.id as auth_user_id,
    u.email,
    u.created_at,
    (u.email_confirmed_at is not null) as email_confirmado,
    coalesce(u.raw_app_meta_data->>'tipo_acesso', '(nao definido)') as tipo_acesso,
    exists (
        select 1 from public.administradores a
        where a.auth_user_id = u.id
    ) as administrador,
    exists (
        select 1 from public.mcs m
        where m.auth_user_id = u.id
    ) as mc,
    exists (
        select 1 from public.organizacoes o
        where o.auth_user_id = u.id
    ) as organizacao,
    exists (
        select 1 from public.suportes_imip s
        where s.auth_user_id = u.id
    ) as suporte_geral,
    exists (
        select 1 from public.suportes_regionais_imip sr
        where sr.auth_user_id = u.id
    ) as suporte_regional
from auth.users u
order by u.created_at, u.id;
