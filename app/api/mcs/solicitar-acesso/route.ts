
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CloudflareBindings = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
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

const SITE_PUBLICO =
  "https://nacional-de-rua.rodasdeimproviso.workers.dev";

const MENSAGEM_EMAIL =
  "Se o perfil estiver disponível, receberás uma ligação de acesso por email. Verifica também a pasta de spam.";

const VALIDADE_HORAS = 6;

function responder(
  status: number,
  dados: Record<string, unknown>,
) {
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
    mensagem: MENSAGEM_EMAIL,
  });
}

function obterAmbiente(): CloudflareBindings {
  try {
    const contexto = getCloudflareContext();

    return contexto.env as unknown as CloudflareBindings;
  } catch {
    return {};
  }
}

function obterConfiguracao() {
  const ambiente = obterAmbiente();

  return {
    url:
      ambiente.SUPABASE_URL ||
      ambiente.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "",

    chavePublica:
      ambiente.SUPABASE_ANON_KEY ||
      ambiente.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",

    chaveSecreta:
      ambiente.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "",
  };
}

function criarCliente(
  url: string,
  chave: string,
): SupabaseClient {
  return createClient(url, chave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailValido(email: string) {
  return (
    email.length > 0 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function bytesParaHex(
  bytes: Uint8Array,
): string {
  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

function criarChaveAcesso(): string {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return bytesParaHex(bytes);
}

async function calcularHash(
  valor: string,
): Promise<string> {
  const dados = new TextEncoder().encode(valor);

  const resultado = await crypto.subtle.digest(
    "SHA-256",
    dados,
  );

  return bytesParaHex(
    new Uint8Array(resultado),
  );
}

function obterOrigem(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return SITE_PUBLICO;
}

function registarErroSupabase(
  contexto: string,
  erro: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  },
) {
  console.error(contexto, {
    codigo: erro.code ?? "sem código",
    mensagem: erro.message ?? "sem mensagem",
    detalhes: erro.details ?? null,
    sugestao: erro.hint ?? null,
  });
}

async function limiteAtingido(
  admin: SupabaseClient,
  mcId: string,
  email: string,
): Promise<boolean> {
  const inicio = new Date(
    Date.now() - 60 * 60 * 1000,
  ).toISOString();

  // Limite por email:
  // máximo de 3 pedidos numa hora.

  const {
    count: totalEmail,
    error: erroEmail,
  } = await admin
    .from("mc_ativacoes_acesso")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("email", email)
    .gte("criado_em", inicio);

  if (erroEmail) {
    registarErroSupabase(
      "IMIP: erro Supabase ao verificar limite por email:",
      erroEmail,
    );

    throw new Error(
      "Não foi possível verificar o limite de pedidos deste email.",
    );
  }

  // Limite por perfil:
  // máximo de 5 pedidos numa hora.

  const {
    count: totalPerfil,
    error: erroPerfil,
  } = await admin
    .from("mc_ativacoes_acesso")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("mc_id", mcId)
    .gte("criado_em", inicio);

  if (erroPerfil) {
    registarErroSupabase(
      "IMIP: erro Supabase ao verificar limite por perfil:",
      erroPerfil,
    );

    throw new Error(
      "Não foi possível verificar o limite de pedidos deste perfil.",
    );
  }

  return (
    (totalEmail ?? 0) >= 3 ||
    (totalPerfil ?? 0) >= 5
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const corpo: unknown = await request
      .json()
      .catch(() => null);

    if (
      !corpo ||
      typeof corpo !== "object" ||
      Array.isArray(corpo)
    ) {
      return responder(400, {
        erro: "Pedido inválido.",
      });
    }

    const dados = corpo as CorpoPedido;

    if (
      typeof dados.mcId !== "string" ||
      !uuidValido(dados.mcId)
    ) {
      return responder(400, {
        erro: "Identificador do MC inválido.",
      });
    }

    if (typeof dados.email !== "string") {
      return responder(400, {
        erro: "Indica um endereço de email válido.",
      });
    }

    const mcId = dados.mcId;

    const email = normalizarEmail(
      dados.email,
    );

    if (!emailValido(email)) {
      return responder(400, {
        erro: "Indica um endereço de email válido.",
      });
    }

    const {
      url,
      chavePublica,
      chaveSecreta,
    } = obterConfiguracao();

    if (
      !url ||
      !chavePublica ||
      !chaveSecreta
    ) {
      console.error(
        "IMIP: configuração Supabase incompleta.",
        {
          existeURL: Boolean(url),
          existeChavePublica: Boolean(chavePublica),
          existeChaveSecreta: Boolean(chaveSecreta),
        },
      );

      return responder(500, {
        erro: "O serviço de acesso está temporariamente indisponível.",
      });
    }

    // Cliente administrativo:
    // utilizado apenas no servidor.

    const admin = criarCliente(
      url,
      chaveSecreta,
    );

    // Cliente público:
    // utilizado para solicitar o email.

    const clientePublico = criarCliente(
      url,
      chavePublica,
    );

    // 1. Confirmar que o MC existe,
    // está ativo e não tem proprietário.

    const {
      data: perfil,
      error: erroPerfil,
    } = await admin
      .from("mcs")
      .select("id,ativo,auth_user_id")
      .eq("id", mcId)
      .maybeSingle();

    if (erroPerfil) {
      registarErroSupabase(
        "IMIP: erro ao consultar perfil MC:",
        erroPerfil,
      );

      return responder(500, {
        erro: "Não foi possível verificar o perfil.",
      });
    }

    const mc = perfil as PerfilMC | null;

    if (
      !mc ||
      mc.ativo !== true ||
      mc.auth_user_id !== null
    ) {
      return respostaGenerica();
    }

    // 2. Verificar limites de pedidos.
    // Se o Supabase devolver um erro,
    // o terminal apresenta os detalhes.

    const bloqueado = await limiteAtingido(
      admin,
      mcId,
      email,
    );

    if (bloqueado) {
      return respostaGenerica();
    }

    // 3. Criar uma chave aleatória.
    // Apenas o hash é guardado
    // na base de dados.

    const chaveAcesso = criarChaveAcesso();

    const tokenHash = await calcularHash(
      chaveAcesso,
    );

    // 4. Validade interna de 6 horas.

    const expiraEm = new Date(
      Date.now() +
        VALIDADE_HORAS * 60 * 60 * 1000,
    ).toISOString();

    // 5. Registar a tentativa.
    // O perfil ainda não fica associado.

    const {
      data: ativacao,
      error: erroRegisto,
    } = await admin
      .from("mc_ativacoes_acesso")
      .insert({
        mc_id: mcId,
        email,
        token_hash: tokenHash,
        estado: "pendente",
        expira_em: expiraEm,
      })
      .select("id")
      .single();

    if (erroRegisto || !ativacao) {
      if (erroRegisto) {
        registarErroSupabase(
          "IMIP: erro ao registar ativação:",
          erroRegisto,
        );
      } else {
        console.error(
          "IMIP: o registo de ativação não devolveu dados.",
        );
      }

      return responder(500, {
        erro: "Não foi possível preparar o acesso. Tenta novamente.",
      });
    }

    // 6. Criar a ligação de ativação.

    const destino = new URL(
      `/mcs/${mcId}/ativar`,
      obterOrigem(),
    );

    destino.searchParams.set(
      "acesso",
      chaveAcesso,
    );

    // 7. Solicitar o envio do email.
    //
    // O prazo do email de autenticação
    // continua definido no Supabase:
    // 1 hora.
    //
    // A chave interna permanece válida
    // durante 6 horas.

    const {
      error: erroEnvio,
    } = await clientePublico.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: destino.toString(),
        shouldCreateUser: true,
      },
    });

    if (erroEnvio) {
      registarErroSupabase(
        "IMIP: erro ao solicitar email de acesso:",
        erroEnvio,
      );

      // Cancelar o registo quando
      // a tentativa de envio falha.

      const {
        error: erroCancelamento,
      } = await admin
        .from("mc_ativacoes_acesso")
        .update({
          estado: "cancelado",
        })
        .eq("id", ativacao.id)
        .eq("estado", "pendente");

      if (erroCancelamento) {
        registarErroSupabase(
          "IMIP: erro ao cancelar ativação:",
          erroCancelamento,
        );
      }

      if (erroEnvio.status === 429) {
        return responder(429, {
          erro: "O serviço de envio de emails atingiu o limite temporário. A tentativa ficou registada no histórico de acesso. Podes contactar o Suporte Geral através de imip.nacional@gmail.com ou tentar novamente mais tarde.",
        });
      }

      return responder(502, {
        erro: "Não foi possível enviar o email de acesso. Podes contactar o Suporte Geral através de imip.nacional@gmail.com para obter ajuda.",
      });
    }

    // O email foi solicitado.
    // A conta só poderá ser associada
    // depois de confirmar a autenticação
    // e validar a chave no servidor.

    return respostaGenerica();
  } catch (erro) {
    console.error(
      "IMIP: erro no pedido de acesso MC:",
      erro,
    );

    return responder(500, {
      erro: "Ocorreu um erro ao processar o pedido. Tenta novamente.",
    });
  }
}
