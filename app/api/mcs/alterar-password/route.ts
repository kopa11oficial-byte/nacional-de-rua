import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type CloudflareBindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

function responder(status: number, mensagem: string) {
  return NextResponse.json(
    { erro: mensagem },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const autorizacao = request.headers.get("authorization");
  const token = autorizacao?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return responder(401, "O link expirou ou a sessão não está ativa.");
  }

  try {
    const corpo: unknown = await request.json();

    if (
      !corpo ||
      typeof corpo !== "object" ||
      !("password" in corpo) ||
      typeof corpo.password !== "string"
    ) {
      return responder(400, "Indica uma palavra-passe válida.");
    }

    if (corpo.password.length < 8) {
      return responder(
        400,
        "A palavra-passe deve ter pelo menos 8 caracteres.",
      );
    }

    const contexto = getCloudflareContext();
    const env = contexto.env as unknown as CloudflareBindings;

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return responder(
        500,
        "Falta configurar o acesso do servidor ao Supabase.",
      );
    }

    const supabaseAdmin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: utilizadorResposta, error: erroUtilizador } =
      await supabaseAdmin.auth.getUser(token);

    const utilizador = utilizadorResposta.user;

    if (erroUtilizador || !utilizador) {
      return responder(
        401,
        "O link expirou. Pede um novo acesso ao suporte.",
      );
    }

    // A mesma conta pode ser MC e Suporte Regional.
    // Autorizar pela ligação real ao perfil MC, não por um tipo exclusivo
    // em app_metadata, para preservar os restantes privilégios da conta.
    const { data: perfilMC, error: erroPerfilMC } = await supabaseAdmin
      .from("mcs")
      .select("id")
      .eq("auth_user_id", utilizador.id)
      .eq("ativo", true)
      .maybeSingle();

    const appMetadataAtual = utilizador.app_metadata ?? {};
    const regioes = ["norte", "centro", "lisboa_margem_sul", "algarve"] as const;
    const regiaoConvite = appMetadataAtual.convite_suporte_regiao;
    const regiaoValida =
      typeof regiaoConvite === "string" &&
      regioes.some((regiao) => regiao === regiaoConvite);
    const conviteSuporte =
      appMetadataAtual.convite_suporte_pendente === true &&
      regiaoValida &&
      Boolean(utilizador.email_confirmed_at) &&
      Boolean(utilizador.email);

    if (erroPerfilMC || (!perfilMC && !conviteSuporte)) {
      return responder(
        403,
        "A sessão não está ligada a um MC ou a um convite IMIP válido. Solicita uma nova ligação ao suporte.",
      );
    }

    // Ativar a função de suporte antes de alterar a password.
    // A alteração de credenciais pode invalidar a sessão do convite;
    // neste caso a função regional não deve ficar pendente.
    let suporteNovo = false;
    if (conviteSuporte) {
      const { data: suporteExistente, error: erroLeituraSuporte } = await supabaseAdmin
        .from("suportes_regionais_imip")
        .select("auth_user_id")
        .eq("auth_user_id", utilizador.id)
        .maybeSingle();

      if (erroLeituraSuporte) {
        console.error("IMIP: falha ao consultar suporte antes da ativação.", erroLeituraSuporte.code);
        return responder(503, "Não foi possível confirmar a ativação do suporte. Tenta novamente.");
      }

      suporteNovo = !suporteExistente;
      const { error: erroAtivacao } = await supabaseAdmin
        .from("suportes_regionais_imip")
        .upsert(
          {
            auth_user_id: utilizador.id,
            email_contacto: utilizador.email!,
            regiao: regiaoConvite,
            ativo: true,
          },
          { onConflict: "auth_user_id" },
        );

      if (erroAtivacao) {
        console.error("IMIP: falha na ativação do suporte antes da password.", erroAtivacao.code);
        return responder(503, "Não foi possível ativar o suporte. A palavra-passe ainda não foi alterada.");
      }
    }

    // Guardar a palavra-passe e finalizar o convite na mesma atualização.
    const { error: erroAtualizacao } =
      await supabaseAdmin.auth.admin.updateUserById(utilizador.id, {
        password: corpo.password,
        app_metadata: {
          ...appMetadataAtual,
          alterar_password_primeiro_acesso: false,
          ...(conviteSuporte
            ? {
                convite_suporte_pendente: false,
                convite_suporte_regiao: null,
              }
            : {}),
        },
      });

    if (erroAtualizacao) {
      // Não deixar uma associação nova ativa quando a password falha.
      if (conviteSuporte && suporteNovo) {
        const { error: erroReversao } = await supabaseAdmin
          .from("suportes_regionais_imip")
          .delete()
          .eq("auth_user_id", utilizador.id);
        if (erroReversao) {
          console.error("IMIP: falha a reverter ativação incompleta.", erroReversao.code);
        }
      }
      console.error("IMIP: erro ao definir palavra-passe.", erroAtualizacao.code);
      return responder(
        400,
        "Não foi possível guardar a palavra-passe. Confirma os requisitos e tenta novamente.",
      );
    }

    return NextResponse.json(
      { sucesso: true, suporteAtivado: conviteSuporte },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    console.error("Erro ao alterar palavra-passe do MC:", erro);
    return responder(500, "Ocorreu um erro. Tenta novamente.");
  }
}