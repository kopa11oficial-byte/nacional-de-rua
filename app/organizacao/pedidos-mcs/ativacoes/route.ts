import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CloudflareBindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type PerfilMC = {
  id: string;
  nome_artistico: string;
  auth_user_id: string | null;
};

type AtivacaoAcesso = {
  id: string;
  mc_id: string;
  email: string;
  estado: string;
  criado_em: string;
  expira_em: string | null;
};

const POR_PAGINA = 100;

function obterAmbiente(): CloudflareBindings {
  try {
    return getCloudflareContext().env as unknown as CloudflareBindings;
  } catch {
    // Permite também desenvolvimento local com variáveis process.env.
    return {};
  }
}

function responder(
  dados: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(dados, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

// Apenas o Suporte Geral autorizado pode consultar esta rota.
// Nunca devolver token_hash, chaves de acesso ou dados de autenticação.
export async function GET(request: NextRequest) {
  try {
    const header = request.headers.get("authorization") ?? "";
    const token = header.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return responder({ erro: "Sessão em falta." }, 401);
    }

    const ambiente = obterAmbiente();
    const url = ambiente.SUPABASE_URL ?? process.env.SUPABASE_URL;
    const chave = ambiente.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !chave) {
      console.error("IMIP: serviço de consulta de ativações sem configuração.");
      return responder({ erro: "Serviço temporariamente indisponível." }, 503);
    }

    const admin = createClient(url, chave, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: autenticacao, error: erroAutenticacao } =
      await admin.auth.getUser(token);

    if (erroAutenticacao || !autenticacao.user) {
      return responder({ erro: "Sessão inválida ou expirada." }, 401);
    }

    // A função e_administrador é avaliada com o JWT do utilizador,
    // nunca com os privilégios do service role.
    const clienteComSessao = createClient(url, chave, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: autorizado, error: erroPermissao } =
      await clienteComSessao.rpc("e_administrador");

    if (erroPermissao) {
      console.error("IMIP: falha ao verificar o Suporte Geral.", erroPermissao);
      return responder({ erro: "Não foi possível verificar permissões." }, 503);
    }

    if (autorizado !== true) {
      return responder({ erro: "Acesso reservado ao Suporte Geral." }, 403);
    }

    const paginaTexto = request.nextUrl.searchParams.get("pagina") ?? "0";
    const pagina = Number(paginaTexto);
    if (
      !/^\d+$/.test(paginaTexto) ||
      !Number.isSafeInteger(pagina) ||
      pagina > 1000
    ) {
      return responder({ erro: "Página inválida." }, 400);
    }

    const inicio = pagina * POR_PAGINA;
    const { data: registos, count, error: erroAtivacoes } = await admin
      .from("mc_ativacoes_acesso")
      .select("id,mc_id,email,estado,criado_em,expira_em", {
        count: "exact",
      })
      .order("criado_em", { ascending: false })
      .range(inicio, inicio + POR_PAGINA - 1);

    if (erroAtivacoes) {
      console.error("IMIP: falha ao consultar ativações MC.", erroAtivacoes);
      return responder({ erro: "Não foi possível carregar as ativações." }, 503);
    }

    const ativacoes = (registos ?? []) as AtivacaoAcesso[];
    const mcIds = [...new Set(ativacoes.map((ativacao) => ativacao.mc_id))];

    const nomes = new Map<string, PerfilMC>();
    if (mcIds.length > 0) {
      const { data: perfis, error: erroPerfis } = await admin
        .from("mcs")
        .select("id,nome_artistico,auth_user_id")
        .in("id", mcIds);

      if (erroPerfis) {
        console.error("IMIP: falha ao identificar MCs nas ativações.", erroPerfis);
        return responder({ erro: "Não foi possível identificar os MCs." }, 503);
      }

      for (const perfil of (perfis ?? []) as PerfilMC[]) {
        nomes.set(perfil.id, perfil);
      }
    }

    return responder(
      {
        pagina,
        porPagina: POR_PAGINA,
        total: count ?? 0,
        ativacoes: ativacoes.map((ativacao) => ({
          id: ativacao.id,
          mc_id: ativacao.mc_id,
          nome_artistico: nomes.get(ativacao.mc_id)?.nome_artistico ?? "MC não encontrado",
          email: ativacao.email,
          estado: ativacao.estado,
          criado_em: ativacao.criado_em,
          expira_em: ativacao.expira_em,
          perfil_associado: Boolean(nomes.get(ativacao.mc_id)?.auth_user_id),
        })),
      },
      200,
    );
  } catch (erro) {
    console.error("IMIP: falha inesperada na consulta de ativações.", erro);
    return responder({ erro: "Não foi possível consultar as ativações." }, 500);
  }
}
