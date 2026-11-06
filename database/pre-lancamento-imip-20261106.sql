-- IMIP: regras de visibilidade dos testes 2026 e épocas oficiais a partir de 2027.
-- Nunca elimina edições, batalhas ou pontuações existentes.
DROP POLICY IF EXISTS "Permitir leitura publica das rodas" ON public.rodas;
CREATE POLICY "rodas_publicas_para_todos" ON public.rodas
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Leitura publica edicoes" ON public.edicoes;
CREATE POLICY "edicoes_publicas_2026_ou_publicadas_oficiais" ON public.edicoes
  FOR SELECT TO anon, authenticated
  USING (data_edicao < DATE '2027-01-01' OR estado='publicada');

-- Pontuações e batalhas de rascunhos oficiais apenas para seus gestores.
DROP POLICY IF EXISTS "Leitura publica batalhas" ON public.batalhas;
DROP POLICY IF EXISTS "acesso_le_batalhas" ON public.batalhas;
CREATE POLICY "batalhas_visiveis_por_edicao_e_gestor" ON public.batalhas
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.edicoes e
    WHERE e.id = batalhas.edicao_id
      AND (e.data_edicao < DATE '2027-01-01' OR e.estado='publicada'
        OR ((select auth.uid()) IS NOT NULL AND public.pode_gerir_edicao(batalhas.edicao_id)))
  ));

DROP POLICY IF EXISTS "Leitura publica participacoes" ON public.participacoes;
DROP POLICY IF EXISTS "acesso_le_participacoes" ON public.participacoes;
CREATE POLICY "participacoes_visiveis_por_edicao_e_gestor" ON public.participacoes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.batalhas b
    JOIN public.edicoes e ON e.id=b.edicao_id
    WHERE b.id=participacoes.batalha_id
      AND (e.data_edicao < DATE '2027-01-01' OR e.estado='publicada'
        OR ((select auth.uid()) IS NOT NULL AND public.pode_gerir_edicao(e.id)))
  ));

DROP POLICY IF EXISTS "pontuacoes_leitura_publica" ON public.pontuacoes;
CREATE POLICY "pontuacoes_visiveis_por_edicao_e_gestor" ON public.pontuacoes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.edicoes e
    WHERE e.id = pontuacoes.edicao_id
      AND (e.data_edicao < DATE '2027-01-01' OR e.estado='publicada'
        OR ((select auth.uid()) IS NOT NULL AND public.pode_gerir_edicao(pontuacoes.edicao_id)))
  ));

-- Vista antiga herda RLS do utilizador em vez de contornar a segurança.
ALTER VIEW public.ranking_nacional SET (security_invoker = true);

-- Os finalistas têm de ser validados em novembro, antes da final de dezembro.
CREATE OR REPLACE FUNCTION public.confirmar_finalistas_nacionais(p_ano integer, p_mcs uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  data_atual_portugal date;
BEGIN
  IF NOT public.e_administrador() THEN
    RAISE EXCEPTION
      'Apenas o administrador geral pode confirmar os finalistas.';
  END IF;

  IF p_ano IS NULL OR p_ano < 2027 THEN
    RAISE EXCEPTION
      'A primeira Final Nacional oficial é em 2027.';
  END IF;

  data_atual_portugal := (now() AT TIME ZONE 'Europe/Lisbon')::date;

  IF data_atual_portugal < make_date(p_ano, 11, 1) THEN
    RAISE EXCEPTION
      'Os finalistas só podem ser confirmados a partir de 1 de novembro da respetiva época.';
  END IF;

  IF p_mcs IS NULL
     OR cardinality(p_mcs) <> 16
     OR array_position(p_mcs, NULL) IS NOT NULL
     OR (
       SELECT count(DISTINCT id)
       FROM unnest(p_mcs) AS id
     ) <> 16 THEN
    RAISE EXCEPTION
      'É necessário indicar exatamente 16 MCs diferentes.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_mcs) AS id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.mcs AS mc
      WHERE mc.id = id
    )
  ) THEN
    RAISE EXCEPTION
      'A lista inclui um MC que não existe.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(p_ano);

  IF EXISTS (
    SELECT 1
    FROM public.finalistas_nacionais
    WHERE ano = p_ano
  ) THEN
    RAISE EXCEPTION
      'Os finalistas desta época já foram confirmados.';
  END IF;

  INSERT INTO public.finalistas_nacionais (ano, posicao, mc_id)
  SELECT p_ano, ordem::integer, id
  FROM unnest(p_mcs) WITH ORDINALITY AS lista(id, ordem);
END;
$function$;

-- Pré-criar 2027 sem activar prematuramente; 2026 continua como época de testes.
INSERT INTO public.epocas (nome,ano,data_inicio,data_fim,estado)
VALUES ('Época Nacional 2027',2027,DATE '2027-01-01',DATE '2027-10-31','planeamento')
ON CONFLICT (ano) DO NOTHING;

-- Eliminar acesso API directo a funções disparadas internamente por triggers.
REVOKE EXECUTE ON FUNCTION public.criar_organizacao_apos_registo() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_calcular_pontos() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;

-- Endurecer search_path das funções antigas sem alterar o seu código.
ALTER FUNCTION public.calcular_pontos_batalha(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.trigger_calcular_pontos() SET search_path TO public, pg_temp;
