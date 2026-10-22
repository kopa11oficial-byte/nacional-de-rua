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

    if (utilizador.app_metadata?.tipo_acesso !== "mc") {
      return responder(
        403,
        "Esta página destina-se apenas a contas de MC.",
      );
    }

    const appMetadataAtual = utilizador.app_metadata ?? {};

    const { error: erroAtualizacao } =
      await supabaseAdmin.auth.admin.updateUserById(utilizador.id, {
        password: corpo.password,
        app_metadata: {
          ...appMetadataAtual,
          tipo_acesso: "mc",
          alterar_password_primeiro_acesso: false,
        },
      });

    if (erroAtualizacao) {
      console.error(
        "Erro ao guardar a nova palavra-passe do MC:",
        erroAtualizacao,
      );

      return responder(
        400,
        "Não foi possível guardar a palavra-passe. Confirma os requisitos e tenta novamente.",
      );
    }

    return NextResponse.json(
      { sucesso: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    console.error("Erro ao alterar palavra-passe do MC:", erro);
    return responder(500, "Ocorreu um erro. Tenta novamente.");
  }
}