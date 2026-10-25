import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const URL_ALTERAR_PASSWORD =
  "https://nacional-de-rua.rodasdeimproviso.workers.dev/mcs/alterar-password";

const headersPrivados = {
  "Cache-Control": "no-store, no-cache, private, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function falhar(status: number, mensagem: string) {
  return NextResponse.json(
    { erro: mensagem },
    { status, headers: headersPrivados },
  );
}

export async function POST(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return falhar(401, "Inicia sessão como Suporte Geral.");
  }

  const corpo: unknown = await request.json().catch(() => null);
  if (
    !corpo ||
    typeof corpo !== "object" ||
    Array.isArray(corpo) ||
    !("pedidoId" in corpo) ||
    typeof corpo.pedidoId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(corpo.pedidoId)
  ) {
    return falhar(400, "Pedido de acesso inválido.");
  }

  try {
    const { env } = getCloudflareContext();
    const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: chave } =
      env as unknown as Bindings;

    if (!url || !chave) {
      return falhar(503, "Configuração de autenticação indisponível.");
    }

    const opcoes = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    };
    const admin = createClient(url, chave, opcoes);

    const { data: utilizador, error: erroUtilizador } =
      await admin.auth.getUser(token);

    if (erroUtilizador || !utilizador.user) {
      return falhar(401, "A sessão expirou. Inicia sessão novamente.");
    }

    // Uma conta de MC, mesmo aprovada, nunca pode emitir ligações.
    const clienteComSessao = createClient(url, chave, {
      ...opcoes,
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: eAdministrador, error: erroAdmin } =
      await clienteComSessao.rpc("e_administrador");

    if (erroAdmin || eAdministrador !== true) {
      return falhar(403, "Só o Suporte Geral pode emitir esta ligação.");
    }

    const { data: pedido, error: erroPedido } = await admin
      .from("pedidos_acesso_mcs")
      .select("id,mc_id,email,estado")
      .eq("id", corpo.pedidoId)
      .eq("estado", "aprovado")
      .maybeSingle();

    if (erroPedido || !pedido) {
      return falhar(404, "Este pedido não está aprovado.");
    }

    const { data: mc, error: erroMC } = await admin
      .from("mcs")
      .select("id,nome_artistico,ativo,auth_user_id")
      .eq("id", pedido.mc_id)
      .maybeSingle();

    if (
      erroMC ||
      !mc ||
      mc.ativo !== true ||
      !mc.auth_user_id
    ) {
      return falhar(409, "O perfil ainda não tem uma conta ativa associada.");
    }

    const { data: auth, error: erroAuth } =
      await admin.auth.admin.getUserById(mc.auth_user_id);

    const conta = auth.user;
    if (
      erroAuth ||
      !conta ||
      !conta.email_confirmed_at ||
      conta.email?.trim().toLowerCase() !==
        pedido.email.trim().toLowerCase() ||
      conta.app_metadata?.tipo_acesso !== "mc"
    ) {
      return falhar(
        409,
        "A conta não corresponde ao pedido aprovado ou ainda não está validada.",
      );
    }

    // Não enviar emails pela Supabase: a entrega SMTP está adiada.
    // A ligação é entregue apenas ao suporte autenticado, que a envia
    // diretamente para o email que já foi validado para este MC.
    const { data: ligacao, error: erroLigacao } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: pedido.email,
        options: { redirectTo: URL_ALTERAR_PASSWORD },
      });

    if (erroLigacao || !ligacao.properties?.action_link) {
      return falhar(
        503,
        "Não foi possível gerar a ligação de recuperação. Não foi alterada a conta.",
      );
    }

    return NextResponse.json(
      {
        sucesso: true,
        nome: mc.nome_artistico,
        email: pedido.email,
        ligacao: ligacao.properties.action_link,
      },
      { headers: headersPrivados },
    );
  } catch {
    return falhar(
      500,
      "Não foi possível preparar a recuperação. Tenta novamente pelo Suporte Geral.",
    );
  }
}
