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

    // Guardar primeiro a password. Se a operação falhar, o novo suporte
    // permanece sem privilégios. Não remover ainda o convite pendente:
    // assim a ativação pode ser repetida caso o passo seguinte falhe.
    const { error: erroAtualizacao } =
      await supabaseAdmin.auth.admin.updateUserById(utilizador.id, {
        password: corpo.password,
        app_metadata: {
          ...appMetadataAtual,
          alterar_password_primeiro_acesso: false,
        },
      });

    if (erroAtualizacao) {
      console.error("IMIP: erro ao definir palavra-passe.", erroAtualizacao.code);
      return responder(
        400,
        "Não foi possível guardar a palavra-passe. Confirma os requisitos e tenta novamente.",
      );
    }

    if (conviteSuporte) {
      // Só uma pessoa que recebeu o convite da equipa e confirmou o
      // próprio email consegue chegar a este passo com a sua sessão.
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
        console.error("IMIP: palavra-passe definida, mas falhou a ativação do suporte.", erroAtivacao.code);
        return responder(
          503,
          "A palavra-passe foi guardada, mas o acesso de suporte não pôde ser ativado. Repete o processo com esta sessão ou contacta o suporte IMIP.",
        );
      }

      // Só depois de ativar limpar o convite. Não alterar nem remover o
      // perfil MC ou outras funções já existentes na mesma conta.
      const { error: erroLimpeza } =
        await supabaseAdmin.auth.admin.updateUserById(utilizador.id, {
          app_metadata: {
            ...appMetadataAtual,
            alterar_password_primeiro_acesso: false,
            convite_suporte_pendente: false,
            convite_suporte_regiao: null,
          },
        });
      if (erroLimpeza) {
        // A função já foi ativada; reportar apenas no log para não
        // induzir o utilizador a repetir a ativação com um novo convite.
        console.error("IMIP: suporte ativo, mas não foi possível limpar o convite.", erroLimpeza.code);
      }
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