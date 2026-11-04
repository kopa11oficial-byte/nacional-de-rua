-- IMIP: proposta de migracao Double Tri, por aplicar.
-- Antes de executar, rever as regras oficiais de pontuacao.
BEGIN;
ALTER TABLE public.batalhas
 ADD COLUMN IF NOT EXISTS double_tri boolean NOT NULL DEFAULT false;
ALTER TABLE public.participacoes
 DROP CONSTRAINT IF EXISTS participacoes_lado_check;
ALTER TABLE public.participacoes
 ADD CONSTRAINT participacoes_lado_check
 CHECK (lado IN ('A','B','C','TRIO_A','TRIO_B','EQUIPA_A','EQUIPA_B'));

CREATE OR REPLACE FUNCTION public.confirmar_pontos_edicao(p_edicao_id uuid, p_batalhas jsonb, p_permanencias jsonb DEFAULT '[]'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_epoca_id uuid;
  v_batalha jsonb;
  v_participacao jsonb;
  v_pontuacao jsonb;
  v_batalha_id uuid;
  v_numero integer := 0;
  v_total integer := 0;
  v_lado text;
  v_mc_id uuid;
  v_pontos integer;
BEGIN

  -- 1. VERIFICAR AUTORIZAÇÃO

  IF (SELECT auth.uid()) IS NULL
     OR NOT public.pode_gerir_edicao(p_edicao_id) THEN

    RAISE EXCEPTION
      'Não tens autorização para confirmar esta edição';

  END IF;


  -- 2. BLOQUEAR A EDIÇÃO DURANTE A TRANSAÇÃO

  SELECT epoca_id
  INTO v_epoca_id
  FROM public.edicoes
  WHERE id = p_edicao_id
  FOR UPDATE;

  IF NOT FOUND OR v_epoca_id IS NULL THEN

    RAISE EXCEPTION
      'Edição ou época não encontrada';

  END IF;


  -- 3. IMPEDIR CONFIRMAÇÕES DUPLICADAS

  IF EXISTS (
    SELECT 1
    FROM public.batalhas
    WHERE edicao_id = p_edicao_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.pontuacoes
    WHERE edicao_id = p_edicao_id
  ) THEN

    RAISE EXCEPTION
      'Esta edição já tem batalhas ou pontuações. Verifica os dados antes de confirmar novamente';

  END IF;


  -- 4. VALIDAR OS DADOS RECEBIDOS

  IF jsonb_typeof(p_batalhas) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_batalhas) = 0
     OR jsonb_typeof(p_permanencias) IS DISTINCT FROM 'array' THEN

    RAISE EXCEPTION
      'Os dados da edição são inválidos';

  END IF;


  -- 5. REGISTAR AS BATALHAS

  FOR v_batalha IN
    SELECT value
    FROM jsonb_array_elements(p_batalhas)

  LOOP

    v_numero := v_numero + 1;


    -- VALIDAR FASE, PARTICIPANTES E RESULTADOS

    IF jsonb_typeof(v_batalha) IS DISTINCT FROM 'object'

      OR jsonb_typeof(
        v_batalha->'participacoes'
      ) IS DISTINCT FROM 'array'

      OR jsonb_array_length(
        v_batalha->'participacoes'
      ) < 2

      OR jsonb_typeof(
        v_batalha->'pontuacoes'
      ) IS DISTINCT FROM 'array'

      OR COALESCE(
        v_batalha->>'fase',
        ''
      ) NOT IN (
        'PRÉ-FASE',
        '1ª FASE',
        'REPESCAGEM',
        '2ª FASE',
        'SEMI-FINAL',
        'FINAL'
      )

      OR (v_batalha->>'pontos_lado_a')::integer < 0

      OR (v_batalha->>'pontos_lado_b')::integer < 0

      OR jsonb_typeof(
        v_batalha->'vitoria_2_0'
      ) IS DISTINCT FROM 'boolean'

    THEN

      RAISE EXCEPTION
        'Batalha % inválida',
        v_numero;

    END IF;


    -- REGRA OFICIAL DA REPESCAGEM
    --
    -- Apenas um round:
    -- 1-0 ou 0-1.
    --
    -- Nunca existe bónus 2-0.

    IF v_batalha->>'fase' = 'REPESCAGEM' THEN

      IF NOT (
        (
          (v_batalha->>'pontos_lado_a')::integer = 1
          AND
          (v_batalha->>'pontos_lado_b')::integer = 0
        )
        OR
        (
          (v_batalha->>'pontos_lado_a')::integer = 0
          AND
          (v_batalha->>'pontos_lado_b')::integer = 1
        )
      ) THEN

        RAISE EXCEPTION
          'Repescagem inválida na batalha %. O resultado deve ser 1-0 ou 0-1',
          v_numero;

      END IF;


      IF (
        v_batalha->>'vitoria_2_0'
      )::boolean IS DISTINCT FROM FALSE THEN

        RAISE EXCEPTION
          'A repescagem não pode ter bónus de 2-0 na batalha %',
          v_numero;

      END IF;

    END IF;


    -- DOUBLE TRI: tres participantes individuais, um unico vencedor.
    IF COALESCE((v_batalha->>'double_tri')::boolean, FALSE) THEN
      IF jsonb_array_length(v_batalha->'participacoes') <> 3
         OR (v_batalha->>'pontos_lado_a')::integer <> 0
         OR (v_batalha->>'pontos_lado_b')::integer <> 0
         OR (v_batalha->>'vitoria_2_0')::boolean <> FALSE
         OR v_batalha->>'fase' = 'REPESCAGEM'
         OR (
           SELECT COUNT(DISTINCT item->>'lado')
           FROM jsonb_array_elements(v_batalha->'participacoes') item
           WHERE item->>'lado' IN ('A','B','C')
         ) <> 3
         OR (
           SELECT COUNT(*)
           FROM jsonb_array_elements(v_batalha->'participacoes') item
           WHERE item->>'venceu' = 'true'
         ) <> 1
         OR (
           SELECT COUNT(DISTINCT item->>'mc_id')
           FROM jsonb_array_elements(v_batalha->'participacoes') item
         ) <> 3
      THEN
        RAISE EXCEPTION 'Double Tri invalido na batalha %: exige 3 MCs diferentes e 1 vencedor', v_numero;
      END IF;
    END IF;

    -- 6. GUARDAR A BATALHA

    INSERT INTO public.batalhas (
      edicao_id,
      numero,
      fase,
      ordem,
      pontos_lado_a,
      pontos_lado_b,
      vitoria_2_0,
      double_tri
    )
    VALUES (
      p_edicao_id,
      v_numero,
      v_batalha->>'fase',
      v_numero,
      (v_batalha->>'pontos_lado_a')::integer,
      (v_batalha->>'pontos_lado_b')::integer,
      (v_batalha->>'vitoria_2_0')::boolean,
      COALESCE((v_batalha->>'double_tri')::boolean, FALSE)
    )
    RETURNING id INTO v_batalha_id;


    -- 7. REGISTAR OS PARTICIPANTES

    FOR v_participacao IN
      SELECT value
      FROM jsonb_array_elements(
        v_batalha->'participacoes'
      )

    LOOP

      v_mc_id := (
        v_participacao->>'mc_id'
      )::uuid;

      v_lado := v_participacao->>'lado';


      IF v_mc_id IS NULL

        OR NOT EXISTS (
          SELECT 1
          FROM public.mcs
          WHERE id = v_mc_id
        )

        OR v_lado NOT IN ('A', 'B', 'C')
      OR (v_lado = 'C' AND COALESCE((v_batalha->>'double_tri')::boolean, FALSE) = FALSE)

        OR jsonb_typeof(
          v_participacao->'venceu'
        ) IS DISTINCT FROM 'boolean'

      THEN

        RAISE EXCEPTION
          'Participante inválido na batalha %',
          v_numero;

      END IF;


      IF EXISTS (
        SELECT 1
        FROM public.participacoes
        WHERE batalha_id = v_batalha_id
          AND mc_id = v_mc_id
      ) THEN

        RAISE EXCEPTION
          'MC repetido na batalha %',
          v_numero;

      END IF;


      INSERT INTO public.participacoes (
        batalha_id,
        mc_id,
        lado,
        venceu
      )
      VALUES (
        v_batalha_id,
        v_mc_id,
        v_lado,
        (
          v_participacao->>'venceu'
        )::boolean
      );

    END LOOP;


    -- VERIFICAR QUE EXISTEM DOIS LADOS

    IF NOT EXISTS (
      SELECT 1
      FROM public.participacoes
      WHERE batalha_id = v_batalha_id
        AND lado = 'A'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.participacoes
      WHERE batalha_id = v_batalha_id
        AND lado = 'B'
    ) THEN

      RAISE EXCEPTION
        'Falta um dos lados da batalha %',
        v_numero;

    END IF;


    -- 8. REGISTAR AS PONTUAÇÕES

    FOR v_pontuacao IN
      SELECT value
      FROM jsonb_array_elements(
        v_batalha->'pontuacoes'
      )

    LOOP

      v_mc_id := (
        v_pontuacao->>'mc_id'
      )::uuid;

      v_pontos := (
        v_pontuacao->>'pontos'
      )::integer;


      IF v_mc_id IS NULL
        OR v_pontos IS NULL
        OR v_pontos <= 0

        OR NULLIF(
          btrim(v_pontuacao->>'motivo'),
          ''
        ) IS NULL

        OR NOT EXISTS (
          SELECT 1
          FROM public.participacoes
          WHERE batalha_id = v_batalha_id
            AND mc_id = v_mc_id
        )

      THEN

        RAISE EXCEPTION
          'Pontuação inválida na batalha %',
          v_numero;

      END IF;


      -- PONTUAÇÃO DA REPESCAGEM
      --
      -- Cada MC vencedor recebe 2 pontos.
      -- Um MC derrotado não recebe pontos
      -- pela vitória na repescagem.

      IF v_batalha->>'fase' = 'REPESCAGEM' THEN

        IF v_pontos IS DISTINCT FROM 2 THEN

          RAISE EXCEPTION
            'Pontuação da repescagem inválida na batalha %. Cada vencedor recebe 2 pontos',
            v_numero;

        END IF;


        IF NOT EXISTS (
          SELECT 1
          FROM public.participacoes pa
          WHERE pa.batalha_id = v_batalha_id
            AND pa.mc_id = v_mc_id
            AND pa.venceu = TRUE
        ) THEN

          RAISE EXCEPTION
            'Pontuação atribuída a um não vencedor na repescagem da batalha %',
            v_numero;

        END IF;

      END IF;


      INSERT INTO public.pontuacoes (
        mc_id,
        epoca_id,
        edicao_id,
        batalha_id,
        motivo,
        pontos
      )
      VALUES (
        v_mc_id,
        v_epoca_id,
        p_edicao_id,
        v_batalha_id,
        v_pontuacao->>'motivo',
        v_pontos
      );


      v_total := v_total + 1;

    END LOOP;

  END LOOP;


  -- 9. REGISTAR BÓNUS DE PERMANÊNCIA

  FOR v_pontuacao IN
    SELECT value
    FROM jsonb_array_elements(
      p_permanencias
    )

  LOOP

    v_mc_id := (
      v_pontuacao->>'mc_id'
    )::uuid;

    v_pontos := (
      v_pontuacao->>'pontos'
    )::integer;


    IF v_mc_id IS NULL

      OR v_pontos IS DISTINCT FROM 1

      OR NOT EXISTS (
        SELECT 1
        FROM public.participacoes pa
        JOIN public.batalhas b
          ON b.id = pa.batalha_id
        WHERE b.edicao_id = p_edicao_id
          AND pa.mc_id = v_mc_id
      )

      OR EXISTS (
        SELECT 1
        FROM public.pontuacoes
        WHERE edicao_id = p_edicao_id
          AND batalha_id IS NULL
          AND mc_id = v_mc_id
      )

    THEN

      RAISE EXCEPTION
        'Permanência inválida ou repetida';

    END IF;


    INSERT INTO public.pontuacoes (
      mc_id,
      epoca_id,
      edicao_id,
      batalha_id,
      motivo,
      pontos
    )
    VALUES (
      v_mc_id,
      v_epoca_id,
      p_edicao_id,
      NULL,
      'Permanência até ao final da edição',
      1
    );


    v_total := v_total + 1;

  END LOOP;


  -- 10. CONFIRMAR QUE EXISTEM PONTOS

  IF v_total = 0 THEN

    RAISE EXCEPTION
      'Não existem pontuações válidas';

  END IF;


  RETURN v_total;

END;
$function$
;
COMMIT;
