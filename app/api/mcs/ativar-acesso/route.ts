
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Ambiente = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

type CorpoPedido = {
  mcId?: unknown;
  chaveAcesso?: unknown;
};

type RegistoAtivacao = {
  id: string;
  mc_id: string;
  email: string;
  estado: string;
  expira_em: string;
  auth_user_id: string | null;
};

type PerfilMC = {
  id: string;
  ativo: boolean;
  auth_user_id: string | null;
};

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

function obterAmbiente(): Ambiente {
  try {
    const contexto = getCloudflareContext();

    return contexto.env as unknown as Ambiente;
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

    chaveSecreta:
      ambiente.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "",

    chavePublica:
      ambiente.SUPABASE_ANON_KEY ||
      ambiente.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
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

function uuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

function bytesParaHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function calcularHash(
  valor: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(valor);

  const resultado = await crypto.subtle.digest(
    "SHA-256",
    bytes,
  );

  return bytesParaHex(
    new Uint8Array(resultado),
  );
}

async function consultarAtivacao(
  admin: SupabaseClient,
  tokenHash: string,
): Promise<RegistoAtivacao | null> {
  const { data, error } = await admin
    .from("mc_ativacoes_acesso")
    .select(
      "id,mc_id,email,estado,expira_em,auth_user_id",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error(
      "IMIP: erro ao consultar ativação:",
      error,
    );

    throw new Error(
      "Não foi possível consultar a ativação.",
    );
  }

  return data as RegistoAtivacao | null;
}

async function consultarPerfil(
  admin: SupabaseClient,
  mcId: string,
): Promise<PerfilMC | null> {
  const { data, error } = await admin
    .from("mcs")
    .select("id,ativo,auth_user_id")
    .eq("id", mcId)
    .maybeSingle();

  if (error) {
    console.error(
      "IMIP: erro ao consultar perfil:",
      error,
    );

    throw new Error(
      "Não foi possível consultar o perfil.",
    );
  }

  return data as PerfilMC | null;
}

export async function POST(
  request: NextRequest,
) {
  try {
    // 1. Validar os dados recebidos.

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

    if (
      typeof dados.chaveAcesso !== "string" ||
      !/^[0-9a-f]{64}$/i.test(dados.chaveAcesso)
    ) {
      return responder(400, {
        erro: "A ligação de ativação é inválida.",
      });
    }

    const mcId = dados.mcId;
    const chaveAcesso = dados.chaveAcesso;

    // 2. Exigir uma sessão autenticada.

    const autorizacao = request.headers.get(
      "authorization",
    );

    const token = autorizacao
      ?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return responder(401, {
        erro: "Inicia sessão através da ligação recebida por email.",
      });
    }

    const {
      url,
      chaveSecreta,
      chavePublica,
    } = obterConfiguracao();

    if (
      !url ||
      !chaveSecreta ||
      !chavePublica
    ) {
      console.error(
        "IMIP: configuração Supabase incompleta.",
      );

      return responder(500, {
        erro: "O serviço de ativação está temporariamente indisponível.",
      });
    }

    const admin = criarCliente(
      url,
      chaveSecreta,
    );

    const {
      data: respostaUtilizador,
      error: erroUtilizador,
    } = await admin.auth.getUser(token);

    const utilizador = respostaUtilizador.user;

    if (erroUtilizador || !utilizador) {
      return responder(401, {
        erro: "A sessão expirou. Pede uma nova ligação de acesso.",
      });
    }

    if (
      !utilizador.email ||
      !utilizador.email_confirmed_at
    ) {
      return responder(403, {
        erro: "É necessário confirmar o email antes de ativar o perfil.",
      });
    }

    const emailAutenticado = normalizarEmail(
      utilizador.email,
    );

    // 3. Proteger contas que já tenham
    // outro tipo de acesso atribuído.

    const metadata = utilizador.app_metadata ?? {};

    const tipoAcesso = metadata.tipo_acesso;

    if (
      tipoAcesso !== undefined &&
      tipoAcesso !== "mc"
    ) {
      return responder(403, {
        erro: "Esta conta já possui outro tipo de acesso. Utiliza uma conta própria para o perfil MC.",
      });
    }

    // Impedir a utilização de uma conta
    // do Suporte Geral para reclamar
    // um perfil de MC.

    const clienteAutenticado = createClient(
      url,
      chavePublica,
      {
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
      },
    );

    const {
      data: eAdministrador,
      error: erroAdministrador,
    } = await clienteAutenticado.rpc(
      "e_administrador",
    );

    if (erroAdministrador) {
      console.error(
        "IMIP: erro ao verificar suporte:",
        erroAdministrador,
      );

      return responder(500, {
        erro: "Não foi possível confirmar as permissões desta conta.",
      });
    }

    if (eAdministrador === true) {
      return responder(403, {
        erro: "As contas do Suporte Geral não podem ser associadas automaticamente a perfis MC.",
      });
    }

    // 4. Verificar a chave individual
    // guardada na base de dados.

    const tokenHash = await calcularHash(
      chaveAcesso,
    );

    const ativacao = await consultarAtivacao(
      admin,
      tokenHash,
    );

    if (
      !ativacao ||
      ativacao.mc_id !== mcId
    ) {
      return responder(403, {
        erro: "A ligação de ativação é inválida. Pede uma nova ligação no perfil do MC.",
      });
    }

    // O email autenticado tem de ser
    // o mesmo do pedido de acesso.

    if (
      normalizarEmail(ativacao.email) !==
      emailAutenticado
    ) {
      return responder(403, {
        erro: "O email autenticado não corresponde ao email utilizado neste pedido de acesso.",
      });
    }

    // Permitir o acesso quando esta
    // ativação já pertence ao utilizador.

    if (ativacao.estado === "ativado") {
      if (
        ativacao.auth_user_id ===
        utilizador.id
      ) {
        const perfilExistente =
          await consultarPerfil(admin, mcId);

        if (
          perfilExistente?.ativo === true &&
          perfilExistente.auth_user_id ===
            utilizador.id
        ) {
          return responder(200, {
            sucesso: true,
            mensagem: "O perfil já está associado à tua conta.",
          });
        }
      }

      return responder(409, {
        erro: "Esta ligação de ativação já foi utilizada.",
      });
    }

    if (ativacao.estado !== "pendente") {
      return responder(409, {
        erro: "Esta ligação já não está disponível. Pede uma nova.",
      });
    }

    // 5. Verificar a validade da ligação.

    const expiraEm = new Date(
      ativacao.expira_em,
    ).getTime();

    if (
      !Number.isFinite(expiraEm) ||
      expiraEm <= Date.now()
    ) {
      return responder(410, {
        erro: "A ligação de ativação expirou. Pede uma nova no perfil do MC.",
      });
    }

    // 6. Confirmar que esta conta não
    // pertence já a outro perfil MC.

    const {
      data: outroPerfil,
      error: erroOutroPerfil,
    } = await admin
      .from("mcs")
      .select("id")
      .eq("auth_user_id", utilizador.id)
      .neq("id", mcId)
      .limit(1);

    if (erroOutroPerfil) {
      console.error(
        "IMIP: erro ao verificar associações:",
        erroOutroPerfil,
      );

      return responder(500, {
        erro: "Não foi possível verificar as associações da conta.",
      });
    }

    if (
      outroPerfil &&
      outroPerfil.length > 0
    ) {
      return responder(409, {
        erro: "Esta conta já está associada a outro perfil MC.",
      });
    }

    // 7. Confirmar a disponibilidade
    // do perfil pretendido.

    const mc = await consultarPerfil(
      admin,
      mcId,
    );

    if (!mc || mc.ativo !== true) {
      return responder(409, {
        erro: "Este perfil MC não está disponível para ativação.",
      });
    }

    if (
      mc.auth_user_id !== null &&
      mc.auth_user_id !== utilizador.id
    ) {
      return responder(409, {
        erro: "Este perfil já está associado a outra conta.",
      });
    }

    // 8. Associar a conta ao perfil
    // apenas se não existir proprietário.
    //
    // A condição IS NULL impede
    // substituir uma conta existente.

    if (mc.auth_user_id === null) {
      const {
        data: perfilAssociado,
        error: erroAssociacao,
      } = await admin
        .from("mcs")
        .update({
          auth_user_id: utilizador.id,
        })
        .eq("id", mcId)
        .eq("ativo", true)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();

      if (
        erroAssociacao ||
        !perfilAssociado
      ) {
        console.error(
          "IMIP: erro ao associar perfil:",
          erroAssociacao,
        );

        return responder(409, {
          erro: "Não foi possível concluir a associação. O perfil pode já ter sido ativado noutra sessão.",
        });
      }
    }

    // 9. Registar a ativação para
    // acompanhamento pelo suporte.

    const {
      data: ativacaoConcluida,
      error: erroConclusao,
    } = await admin
      .from("mc_ativacoes_acesso")
      .update({
        estado: "ativado",
        ativado_em: new Date().toISOString(),
        auth_user_id: utilizador.id,
      })
      .eq("id", ativacao.id)
      .eq("estado", "pendente")
      .select("id")
      .maybeSingle();

    if (
      erroConclusao ||
      !ativacaoConcluida
    ) {
      console.error(
        "IMIP: erro ao concluir ativação:",
        erroConclusao,
      );

      return responder(500, {
        erro: "A conta foi associada, mas o registo de ativação não ficou concluído. Tenta abrir novamente a ligação.",
      });
    }

    // 10. Identificar a conta como MC
    // preservando os metadados existentes.

    if (tipoAcesso !== "mc") {
      const {
        error: erroMetadata,
      } = await admin.auth.admin.updateUserById(
        utilizador.id,
        {
          app_metadata: {
            ...metadata,
            tipo_acesso: "mc",
          },
        },
      );

      if (erroMetadata) {
        console.error(
          "IMIP: erro ao atualizar metadados:",
          erroMetadata,
        );
      }
    }

    // 11. Cancelar outras ligações
    // pendentes para este mesmo MC.

    const {
      error: erroCancelamento,
    } = await admin
      .from("mc_ativacoes_acesso")
      .update({
        estado: "cancelado",
      })
      .eq("mc_id", mcId)
      .eq("estado", "pendente")
      .neq("id", ativacao.id);

    if (erroCancelamento) {
      console.error(
        "IMIP: erro ao cancelar pedidos anteriores:",
        erroCancelamento,
      );
    }

    return responder(200, {
      sucesso: true,
      mensagem: "Perfil ativado com sucesso.",
    });
  } catch (erro) {
    console.error(
      "IMIP: erro inesperado na ativação MC:",
      erro,
    );

    return responder(500, {
      erro: "Não foi possível concluir a ativação. Tenta novamente.",
    });
  }
}
