import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { urlRecuperacaoMC } from "../../../../lib/site-publico";

export const runtime = "nodejs";

type CloudflareBindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SITE_PUBLICO_URL?: string;
};
const REGIOES = ["norte", "centro", "lisboa_margem_sul", "algarve"] as const;
const headersPrivados = {
  "Cache-Control": "no-store, private, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function responder(status: number, dados: Record<string, unknown>) {
  return NextResponse.json(dados, { status, headers: headersPrivados });
}

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) return responder(401, { erro: "Inicia sessão como Suporte Geral." });

  try {
    const corpo = (await request.json().catch(() => null)) as
      | { email?: unknown; regiao?: unknown }
      | null;

    const email =
      typeof corpo?.email === "string"
        ? corpo.email.trim().toLowerCase()
        : "";
    const regiao = corpo?.regiao;

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof regiao !== "string" ||
      !REGIOES.includes(regiao as (typeof REGIOES)[number])
    ) {
      return responder(400, { erro: "Confirma o email e a região." });
    }

    const { env } = getCloudflareContext();
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_PUBLICO_URL } =
      env as unknown as CloudflareBindings;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return responder(503, { erro: "Configuração do serviço incompleta." });
    }

    const config = { auth: { autoRefreshToken: false, persistSession: false } };
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, config);

    const { data: respostaUtilizador, error: erroSessao } =
      await admin.auth.getUser(token);
    if (erroSessao || !respostaUtilizador.user) {
      return responder(401, { erro: "A sessão expirou. Inicia sessão novamente." });
    }

    // Validar a permissão pelo JWT real do operador, nunca por metadados do formulário.
    const comoOperador = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      ...config,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: eAdministrador, error: erroAdmin } =
      await comoOperador.rpc("e_administrador");
    if (erroAdmin || eAdministrador !== true) {
      return responder(403, { erro: "Só o Suporte Geral pode gerar convites." });
    }

    // Links de convite são gerados localmente; o SMTP do projeto não está ativo.
    // Reutilizamos o callback de recuperação já permitido pela configuração Auth.
    const redirectTo = urlRecuperacaoMC(SITE_PUBLICO_URL);

    // Antes da aceitação não existe qualquer linha em suportes_regionais_imip.
    const { data: convite, error: erroConvite } =
      await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo },
      });

    if (erroConvite || !convite.user || !convite.properties?.action_link) {
      console.error("IMIP: erro na geração de convite para suporte.", erroConvite?.code);
      return responder(409, {
        erro: "Não foi possível gerar o convite. Se já existir uma conta com este email, confirma-a e utiliza ATRIBUIR SUPORTE. Se houver convite anterior pendente, pede ajuda ao Suporte Geral.",
      });
    }

    // A marcação de convite pendente habilita APENAS a criação de password
    // após email confirmado, e não concede acessos a nenhuma região.
    const conta = convite.user;
    const { error: erroMarcacao } =
      await admin.auth.admin.updateUserById(conta.id, {
        app_metadata: {
          ...(conta.app_metadata ?? {}),
          convite_suporte_pendente: true,
          convite_suporte_regiao: regiao,
        },
      });

    if (erroMarcacao) {
      console.error("IMIP: convite criado mas falhou a marcação.", erroMarcacao.code);
      return responder(503, {
        erro: "O convite foi gerado mas não foi possível prepará-lo. Não partilhes a ligação; contacta o suporte técnico.",
      });
    }

    return responder(200, {
      sucesso: true,
      email,
      regiao,
      ligacao: convite.properties.action_link,
      mensagem: "Convite gerado. Envia esta ligação em privado ao email indicado. Depois de confirmar o email e definir a palavra-passe, volta aqui para ATRIBUIR SUPORTE.",
    });
  } catch (erro) {
    console.error("IMIP: erro ao preparar convite regional.", erro);
    return responder(500, { erro: "Não foi possível gerar o convite." });
  }
}
