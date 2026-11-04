
-- Central de Comunicação IMIP: propostas privadas, mensagens e suporte regional.
-- Não altera as tabelas existentes de pontuação, MCs ou as permissões funcionais.
create table if not exists public.suportes_regionais_imip (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email_contacto text not null,
  regiao text not null check (regiao in ('norte','centro','lisboa_margem_sul','algarve')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.propostas_imip (
  id uuid primary key default gen_random_uuid(),
  proponente_id uuid not null references auth.users(id) on delete cascade,
  nome_entidade text not null check (char_length(btrim(nome_entidade)) between 2 and 150),
  email text not null check (char_length(email) between 5 and 254),
  assunto text not null check (char_length(btrim(assunto)) between 5 and 160),
  regiao text not null check (regiao in ('norte','centro','lisboa_margem_sul','algarve','nacional')),
  estado text not null default 'recebida' check (estado in ('recebida','em_analise','a_aguardar_resposta','concluida')),
  regiao_responsavel text check (regiao_responsavel in ('norte','centro','lisboa_margem_sul','algarve')),
  criado_em timestamptz not null default now()
);

create table if not exists public.mensagens_propostas_imip (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas_imip(id) on delete cascade,
  autor_id uuid not null references auth.users(id),
  autor_tipo text not null check (autor_tipo in ('proponente','suporte')),
  conteudo text not null check (char_length(btrim(conteudo)) between 1 and 5000),
  interna boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint mensagens_propostas_imip_interna CHECK (not interna OR autor_tipo = 'suporte')
);

create index if not exists idx_propostas_imip_proponente
  on public.propostas_imip (proponente_id, criado_em desc);
create index if not exists idx_propostas_imip_estado
  on public.propostas_imip (estado, criado_em desc);
create index if not exists idx_mensagens_propostas_imip
  on public.mensagens_propostas_imip (proposta_id, criado_em);

create table if not exists public.notificacoes_propostas_imip (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references auth.users(id) on delete cascade,
  proposta_id uuid not null references public.propostas_imip(id) on delete cascade,
  mensagem_id uuid not null references public.mensagens_propostas_imip(id) on delete cascade,
  lida_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (destinatario_id, mensagem_id)
);
create index if not exists idx_notificacoes_propostas_imip_dest
  on public.notificacoes_propostas_imip (destinatario_id, criado_em desc)
  where lida_em is null;

-- A equipa regional acompanha a mesma caixa de entrada nacional.
-- O Suporte Geral é identificado pela função já existente e_administrador().
create or replace function public.tem_acesso_central_imip()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and ((select public.e_administrador()) or exists (
      select 1 from public.suportes_regionais_imip s
      where s.auth_user_id = (select auth.uid()) and s.ativo
    ));
$$;

-- Abre uma proposta e regista a primeira mensagem atomicamente.
create or replace function public.abrir_proposta_imip(
  p_nome_entidade text, p_assunto text, p_regiao text, p_mensagem text
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_uid uuid := (select auth.uid());
  v_email text := (select auth.jwt()->>'email');
begin
  if v_uid is null or nullif(btrim(v_email),'') is null then
    raise exception 'Confirma o teu email antes de enviar a proposta.';
  end if;
  if exists (
    select 1 from public.propostas_imip
    where proponente_id = v_uid and criado_em > now() - interval '1 minute'
  ) then
    raise exception 'Aguarda um minuto antes de enviar outra proposta.';
  end if;
  if char_length(btrim(p_mensagem)) not between 10 and 5000 then
    raise exception 'A mensagem deve ter entre 10 e 5000 caracteres.';
  end if;

  insert into public.propostas_imip
    (proponente_id, nome_entidade, email, assunto, regiao)
  values
    (v_uid, btrim(p_nome_entidade), lower(btrim(v_email)), btrim(p_assunto), p_regiao)
  returning id into v_id;

  insert into public.mensagens_propostas_imip
    (proposta_id, autor_id, autor_tipo, conteudo, interna)
  values (v_id, v_uid, 'proponente', btrim(p_mensagem), false);

  return v_id;
end;
$$;


-- Proteção anti-abuso válida também para inserts diretos pela API.
create or replace function public.limitar_frequencia_comunicacao_imip()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_total int;
begin
  if TG_TABLE_NAME = 'propostas_imip' then
    select count(*) into v_total
      from public.propostas_imip p
     where p.proponente_id = new.proponente_id
       and p.criado_em > now() - interval '1 minute';
    if v_total >= 1 then
      raise exception 'Aguarda um minuto antes de abrir outra proposta.';
    end if;
  elsif TG_TABLE_NAME = 'mensagens_propostas_imip' then
    select count(*) into v_total
      from public.mensagens_propostas_imip m
     where m.autor_id = new.autor_id
       and m.criado_em > now() - interval '1 minute';
    if v_total >= 6 then
      raise exception 'Limite de mensagens atingido. Aguarda um minuto.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limitar_propostas_imip on public.propostas_imip;
create trigger trg_limitar_propostas_imip
before insert on public.propostas_imip
for each row execute function public.limitar_frequencia_comunicacao_imip();

drop trigger if exists trg_limitar_mensagens_imip on public.mensagens_propostas_imip;
create trigger trg_limitar_mensagens_imip
before insert on public.mensagens_propostas_imip
for each row execute function public.limitar_frequencia_comunicacao_imip();

-- Ao chegar uma mensagem, notificar no site os quatro suportes existentes
-- e o Suporte Geral, sem multiplicar a conversa.
create or replace function public.notificar_mensagem_imip()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notificacoes_propostas_imip
    (destinatario_id, proposta_id, mensagem_id)
  select recipients.auth_user_id, new.proposta_id, new.id
  from (
    select auth_user_id from public.administradores
    union
    select auth_user_id from public.suportes_regionais_imip where ativo
    union
    select proponente_id from public.propostas_imip where id = new.proposta_id
  ) recipients
  where recipients.auth_user_id <> new.autor_id
    and (
      not new.interna
      or recipients.auth_user_id in (
        select auth_user_id from public.administradores
        union
        select auth_user_id from public.suportes_regionais_imip where ativo
      )
    )
  on conflict (destinatario_id, mensagem_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_notificar_mensagem_imip on public.mensagens_propostas_imip;
create trigger trg_notificar_mensagem_imip
after insert on public.mensagens_propostas_imip
for each row execute function public.notificar_mensagem_imip();

-- Só o Suporte Geral pode atribuir contas verificadas aos quatro suportes.
create or replace function public.atribuir_suporte_regional_imip(
  p_email text, p_regiao text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_email text;
begin
  if not (select public.e_administrador()) then
    raise exception 'Acesso reservado ao Suporte Geral.';
  end if;
  if p_regiao not in ('norte','centro','lisboa_margem_sul','algarve') then
    raise exception 'Região inválida.';
  end if;
  select u.id, u.email into v_user, v_email
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
    and u.email_confirmed_at is not null
  limit 1;
  if v_user is null then
    raise exception 'A conta não existe ou ainda não confirmou o email.';
  end if;
  insert into public.suportes_regionais_imip
    (auth_user_id, email_contacto, regiao, ativo)
  values (v_user, v_email, p_regiao, true)
  on conflict (auth_user_id)
  do update set email_contacto=excluded.email_contacto, regiao=excluded.regiao, ativo=true;
end;
$$;

create or replace function public.desativar_suporte_regional_imip(
  p_auth_user_id uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (select public.e_administrador()) then
    raise exception 'Acesso reservado ao Suporte Geral.';
  end if;
  update public.suportes_regionais_imip set ativo=false
  where auth_user_id = p_auth_user_id;
end;
$$;

alter table public.suportes_regionais_imip enable row level security;
alter table public.propostas_imip enable row level security;
alter table public.mensagens_propostas_imip enable row level security;
alter table public.notificacoes_propostas_imip enable row level security;

-- Restringir permissões por coluna e preservar mensagens privadas.
revoke all on public.suportes_regionais_imip from anon, authenticated;
revoke all on public.propostas_imip from anon, authenticated;
revoke all on public.mensagens_propostas_imip from anon, authenticated;
revoke all on public.notificacoes_propostas_imip from anon, authenticated;
grant select on public.suportes_regionais_imip to authenticated;
grant select, insert on public.propostas_imip to authenticated;
grant update (estado, regiao_responsavel) on public.propostas_imip to authenticated;
grant select, insert on public.mensagens_propostas_imip to authenticated;
grant select on public.notificacoes_propostas_imip to authenticated;
grant update (lida_em) on public.notificacoes_propostas_imip to authenticated;

create policy "equipa ou proprio regional le membros"
on public.suportes_regionais_imip for select to authenticated
using ((select public.e_administrador()) or auth_user_id=(select auth.uid()));

create policy "proponente e suporte leem propostas"
on public.propostas_imip for select to authenticated
using (proponente_id=(select auth.uid()) or (select public.tem_acesso_central_imip()));

create policy "proponente cria a propria proposta"
on public.propostas_imip for insert to authenticated
with check (
  proponente_id=(select auth.uid())
  and lower(email) = lower((select auth.jwt()->>'email'))
  and estado='recebida'
  and regiao_responsavel is null
);

create policy "suporte gere triagem de propostas"
on public.propostas_imip for update to authenticated
using ((select public.tem_acesso_central_imip()))
with check ((select public.tem_acesso_central_imip()));

create policy "proponente e suporte leem mensagens permitidas"
on public.mensagens_propostas_imip for select to authenticated
using (
  (select public.tem_acesso_central_imip())
  or (
    not interna
    and exists (
      select 1 from public.propostas_imip p
      where p.id = proposta_id and p.proponente_id=(select auth.uid())
    )
  )
);

create policy "participantes enviam mensagens com identidade verificada"
on public.mensagens_propostas_imip for insert to authenticated
with check (
  autor_id=(select auth.uid())
  and (
    (autor_tipo='suporte' and (select public.tem_acesso_central_imip()))
    or
    (autor_tipo='proponente' and not interna and exists (
      select 1 from public.propostas_imip p
      where p.id = proposta_id and p.proponente_id=(select auth.uid())
    ))
  )
);

create policy "cada destinatario consulta notificacoes"
on public.notificacoes_propostas_imip for select to authenticated
using (destinatario_id=(select auth.uid()));

create policy "cada destinatario marca notificacoes lidas"
on public.notificacoes_propostas_imip for update to authenticated
using (destinatario_id=(select auth.uid()))
with check (destinatario_id=(select auth.uid()));

revoke all on function public.tem_acesso_central_imip() from public, anon;
revoke all on function public.abrir_proposta_imip(text,text,text,text) from public, anon;
revoke all on function public.atribuir_suporte_regional_imip(text,text) from public, anon;
revoke all on function public.desativar_suporte_regional_imip(uuid) from public, anon;
revoke all on function public.notificar_mensagem_imip() from public, anon, authenticated;
revoke all on function public.limitar_frequencia_comunicacao_imip() from public, anon, authenticated;
grant execute on function public.tem_acesso_central_imip() to authenticated;
grant execute on function public.abrir_proposta_imip(text,text,text,text) to authenticated;
grant execute on function public.atribuir_suporte_regional_imip(text,text) to authenticated;
grant execute on function public.desativar_suporte_regional_imip(uuid) to authenticated;
