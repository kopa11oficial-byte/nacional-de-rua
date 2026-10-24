import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Ambiente = {
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type CorpoPedido = {
  mcId?: unknown;
  email?: unknown;
};

type PerfilMC = {
  id: string;
  ativo: boolean;
  auth_user_id: string | null;
};

const MENSAGEM_RECECAO =
  "Se o perfil estiver disponível, o pedido será encaminhado para aprovação do Suporte Geral do IMIP. O acesso não é automático. Contacto: imip.nacional@gmail.com.";

function responder(status: number, dados: Record<string, unknown>) {
  return NextResponse.json(dados, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function respostaGenerica() {
  return responder(200, {
    sucesso: true,
    mensagem: MENSAGEM_RECECAO,
  });
}

function obterAmbiente(): Ambiente {
  try {
    return getCloudflareContext().env as unknown as Ambiente;
  } catch {
    return {};
  }
}

function criarAdmin(url: string, chave: string): SupabaseClient {
  return createClient(url, chave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function uuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function emailValido(valor: string): boolean {
  return (
    valor.length > 0 &&
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
  );
}

async function verificarLimite(
  admin: SupabaseClient,
  mcId: string,
  email: string,
): Promise<boolean> {
  const inicio = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [porEmail, porMC] = await Promise.all([
    admin
      .from("pedidos_acesso_mcs")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("criado_em", inicio),
    admin
      .from("pedidos_acesso_mcs")
      .select("id", { count: "exact", head: true })
      .eq("mc_id", mcId)
      .gte("criado_em", inicio),
  ]);

  if (porEmail.error || porMC.error) {
    console.error("IMIP: falha a verificar limites de pedidos MC.", {
      email: porEmail.error?.code ?? null,
      mc: porMC.error?.code ?? null,
    });
    throw new Error("Não foi possível verificar os limites de pedidos.");
  }

  return (porEmail.count ?? 0) >= 3 || (porMC.count ?? 0) >= 5;
}

// PEDIDO PÚBLICO: regista para aprovação; nunca cria contas,
// nunca envia OTP e nunca associa auth_user_id ao perfil.
export async function POST(request: NextRequest) {
  try {
    const corpo: unknown = await request.json().catch(() => null);
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
      return responder(400, { erro: "Pedido inválido." });
    }

    const dados = corpo as CorpoPedido;
    if (typeof dados.mcId !== "string" || !uuidValido(dados.mcId)) {
      return responder(400, { erro: "Identificador do MC inválido." });
    }

    if (typeof dados.email !== "string") {
      return responder(400, { erro: "Indica um email válido." });
    }

    const email = dados.email.trim().toLowerCase();
    if (!emailValido(email)) {
      return responder(400, { erro: "Indica um email válido." });
    }

    const ambiente = obterAmbiente();
    const url =
      ambiente.SUPABASE_URL ??
      ambiente.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave =
      ambiente.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !chave) {
      console.error("IMIP: configuração Supabase incompleta nos pedidos MC.");
      return responder(503, {
        erro: "O serviço de pedidos está temporariamente indisponível.",
      });
    }

    const admin = criarAdmin(url, chave);

    const { data: perfil, error: erroPerfil } = await admin
      .from("mcs")
      .select("id,ativo,auth_user_id")
      .eq("id", dados.mcId)
      .maybeSingle();

    if (erroPerfil) {
      console.error("IMIP: erro ao consultar o MC num pedido.", erroPerfil.code);
      return responder(503, {
        erro: "Não foi possível verificar o perfil.",
      });
    }

    const mc = perfil as PerfilMC | null;
    if (!mc || !mc.ativo || mc.auth_user_id !== null) {
      // A resposta não revela se o MC existe ou já tem proprietário.
      return respostaGenerica();
    }

    const { data: existente, error: erroExistente } = await admin
      .from("pedidos_acesso_mcs")
      .select("id")
      .eq("mc_id", dados.mcId)
      .eq("email", email)
      .eq("estado", "pendente")
      .limit(1);

    if (erroExistente) {
      console.error("IMIP: falha ao verificar pedidos pendentes.", erroExistente.code);
      return responder(503, {
        erro: "Não foi possível verificar os pedidos anteriores.",
      });
    }

    if (existente && existente.length > 0) {
      // Evita criar duplicados após vários cliques no mesmo formulário.
      return respostaGenerica();
    }

    if (await verificarLimite(admin, dados.mcId, email)) {
      return respostaGenerica();
    }

    const { error: erroCriacao } = await admin
      .from("pedidos_acesso_mcs")
      .insert({
        id: crypto.randomUUID(),
        mc_id: dados.mcId,
        email,
        estado: "pendente",
        criado_em: new Date().toISOString(),
      });

    if (erroCriacao) {
      // Um pedido concorrente com o mesmo perfil e email pode já existir.
      if (erroCriacao.code === "23505") {
        return respostaGenerica();
      }
      console.error("IMIP: falha ao criar pedido MC.", erroCriacao.code);
      return responder(503, {
        erro: "Não foi possível registar o pedido. Contacta imip.nacional@gmail.com.",
      });
    }

    return respostaGenerica();
  } catch (erro) {
    console.error("IMIP: falha inesperada no pedido MC.", erro);
    return responder(500, {
      erro: "Não foi possível registar o pedido. Tenta novamente mais tarde.",
    });
  }
}
