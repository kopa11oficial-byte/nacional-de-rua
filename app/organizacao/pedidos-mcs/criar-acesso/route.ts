
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type CloudflareBindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type PedidoAcesso = {
  id: string;
  mc_id: string;
  email: string;
  estado: "pendente" | "aprovado" | "recusado";
};

type MC = {
  id: string;
  nome_artistico: string;
  ativo: boolean;
  auth_user_id: string | null;
};

type CorpoPedido = {
  pedidoId?: string;
  acao?: string;
  password?: string;
};

const SITE_PUBLICO =
  "https://nacional-de-rua.rodasdeimproviso.workers.dev";

const URL_ALTERAR_PASSWORD =
  `${SITE_PUBLICO}/mcs/alterar-password`;

function responder(
  status: number,
  mensagem: string,
) {
  return NextResponse.json(
    { erro: mensagem },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function sucesso(
  mc: string,
  email: string,
  emailEnviado: boolean,
) {
  return NextResponse.json(
    {
      sucesso: true,
      mc,
      email,
      emailEnviado,
      mensagem: emailEnviado
        ? "Pedido aprovado e email de acesso solicitado."
        : "Pedido aprovado, mas o email não foi enviado. Utiliza REENVIAR EMAIL DE ACESSO.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function criarPasswordInterna(): string {
  const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  const valores = new Uint8Array(40);

  crypto.getRandomValues(valores);

  return Array.from(
    valores,
    (valor) => caracteres.charAt(valor % caracteres.length),
  ).join("");
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function criarAdmin(
  url: string,
  chaveSecreta: string,
): SupabaseClient {
  return createClient(url, chaveSecreta, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function enviarEmailAcesso(
  admin: SupabaseClient,
  email: string,
): Promise<boolean> {
  try {
    const { error } =
      await admin.auth.resetPasswordForEmail(email, {
        redirectTo: URL_ALTERAR_PASSWORD,
      });

    if (error) {
      console.error(
        "Erro ao enviar email de acesso MC:",
        error,
      );

      return false;
    }

    return true;
  } catch (erro) {
    console.error(
      "Falha inesperada no envio de email MC:",
      erro,
    );

    return false;
  }
}

async function obterPedido(
  admin: SupabaseClient,
  pedidoId: string,
): Promise<PedidoAcesso | null> {
  const { data, error } = await admin
    .from("pedidos_acesso_mcs")
    .select("id,mc_id,email,estado")
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao consultar pedido MC:",
      error,
    );

    throw new Error("ERRO_CONSULTA_PEDIDO");
  }

  return data as PedidoAcesso | null;
}

async function obterMC(
  admin: SupabaseClient,
  mcId: string,
): Promise<MC | null> {
  const { data, error } = await admin
    .from("mcs")
    .select("id,nome_artistico,ativo,auth_user_id")
    .eq("id", mcId)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao consultar MC:",
      error,
    );

    throw new Error("ERRO_CONSULTA_MC");
  }

  return data as MC | null;
}

async function verificarContaMC(
  admin: SupabaseClient,
  authUserId: string,
  email: string,
): Promise<boolean> {
  const { data, error } =
    await admin.auth.admin.getUserById(authUserId);

  if (error || !data.user) {
    console.error(
      "Erro ao consultar conta MC:",
      error,
    );

    return false;
  }

  return (
    data.user.app_metadata?.tipo_acesso === "mc" &&
    normalizarEmail(data.user.email ?? "") ===
      normalizarEmail(email)
  );
}

export async function POST(request: NextRequest) {
  const autorizacao =
    request.headers.get("authorization");

  const token =
    autorizacao?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return responder(
      401,
      "A sessão expirou. Inicia sessão novamente.",
    );
  }

  try {
    const contexto = getCloudflareContext();

    const env =
      contexto.env as unknown as CloudflareBindings;

    const url = env.SUPABASE_URL;
    const chaveSecreta =
      env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !chaveSecreta) {
      return responder(
        500,
        "Configuração do servidor incompleta.",
      );
    }

    const corpo: unknown = await request
      .json()
      .catch(() => null);

    if (
      !corpo ||
      typeof corpo !== "object" ||
      Array.isArray(corpo)
    ) {
      return responder(400, "Pedido inválido.");
    }

    const dados = corpo as CorpoPedido;

    const admin = criarAdmin(url, chaveSecreta);

    // ==========================================
    // 1. VALIDAR SESSÃO
    // ==========================================

    const {
      data: utilizadorResposta,
      error: erroUtilizador,
    } = await admin.auth.getUser(token);

    const utilizador = utilizadorResposta.user;

    if (erroUtilizador || !utilizador) {
      return responder(
        401,
        "A sessão expirou. Inicia sessão novamente.",
      );
    }

    // ==========================================
    // 2. DEFINIR PASSWORD DO MC
    // ==========================================

    if (dados.acao === "definir-password") {
      if (
        typeof dados.password !== "string" ||
        dados.password.length < 8
      ) {
        return responder(
          400,
          "A palavra-passe deve ter pelo menos 8 caracteres.",
        );
      }

      if (
        utilizador.app_metadata?.tipo_acesso !==
        "mc"
      ) {
        return responder(
          403,
          "Esta ação está disponível apenas para MCs.",
        );
      }

      const { data: perfil, error: erroPerfil } =
        await admin
          .from("mcs")
          .select("id,ativo")
          .eq("auth_user_id", utilizador.id)
          .maybeSingle();

      if (
        erroPerfil ||
        !perfil ||
        perfil.ativo !== true
      ) {
        return responder(
          403,
          "Não foi encontrado um perfil MC ativo associado à tua conta.",
        );
      }

      const appMetadataAtual =
        utilizador.app_metadata ?? {};

      const { error: erroPassword } =
        await admin.auth.admin.updateUserById(
          utilizador.id,
          {
            password: dados.password,
            app_metadata: {
              ...appMetadataAtual,
              tipo_acesso: "mc",
              alterar_password_primeiro_acesso:
                false,
            },
          },
        );

      if (erroPassword) {
        console.error(
          "Erro ao definir password MC:",
          erroPassword,
        );

        return responder(
          400,
          "Não foi possível guardar a palavra-passe.",
        );
      }

      return NextResponse.json(
        { sucesso: true },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // ==========================================
    // 3. VERIFICAR PERMISSÃO DO SUPORTE
    // ==========================================

    const clienteComSessao = createClient(
      url,
      chaveSecreta,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
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
      error: erroPermissao,
    } = await clienteComSessao.rpc(
      "e_administrador",
    );

    if (
      erroPermissao ||
      eAdministrador !== true
    ) {
      return responder(
        403,
        "Esta ação está disponível apenas para o suporte.",
      );
    }

    if (
      !dados.pedidoId ||
      typeof dados.pedidoId !== "string"
    ) {
      return responder(
        400,
        "Identificador do pedido inválido.",
      );
    }

    if (
      dados.acao !== undefined &&
      dados.acao !== "aprovar" &&
      dados.acao !== "reenviar-email"
    ) {
      return responder(400, "Ação inválida.");
    }

    // ==========================================
    // 4. CONSULTAR PEDIDO E PERFIL
    // ==========================================

    const pedido = await obterPedido(
      admin,
      dados.pedidoId,
    );

    if (!pedido) {
      return responder(
        404,
        "Pedido de acesso não encontrado.",
      );
    }

    const mc = await obterMC(
      admin,
      pedido.mc_id,
    );

    if (!mc) {
      return responder(
        404,
        "Perfil do MC não encontrado.",
      );
    }

    if (!mc.ativo) {
      return responder(
        409,
        "O perfil deste MC está inativo.",
      );
    }

    const email = normalizarEmail(pedido.email);

    if (!email || !email.includes("@")) {
      return responder(
        400,
        "O pedido não tem um email válido.",
      );
    }

    // ==========================================
    // 5. REENVIAR EMAIL
    // ==========================================

    if (dados.acao === "reenviar-email") {
      if (pedido.estado !== "aprovado") {
        return responder(
          409,
          "Só é possível reenviar o email de pedidos aprovados.",
        );
      }

      if (!mc.auth_user_id) {
        return responder(
          409,
          "Este perfil não tem uma conta associada.",
        );
      }

      const contaValida = await verificarContaMC(
        admin,
        mc.auth_user_id,
        email,
      );

      if (!contaValida) {
        return responder(
          409,
          "A conta associada não corresponde ao pedido.",
        );
      }

      const emailEnviado = await enviarEmailAcesso(
        admin,
        email,
      );

      if (!emailEnviado) {
        return responder(
          502,
          "Não foi possível reenviar o email. A conta continua ativa e o pedido mantém-se aprovado.",
        );
      }

      return sucesso(
        mc.nome_artistico,
        email,
        true,
      );
    }

    // ==========================================
    // 6. APROVAR PEDIDO
    // ==========================================

    if (pedido.estado !== "pendente") {
      return responder(
        409,
        "Este pedido já foi tratado. Atualiza a lista.",
      );
    }

    let authUserId = mc.auth_user_id;

    // ==========================================
    // 7. CONFIRMAR A CONTA ASSOCIADA
    // ==========================================

    if (authUserId) {
      const contaValida = await verificarContaMC(
        admin,
        authUserId,
        email,
      );

      if (!contaValida) {
        return responder(
          409,
          "Este perfil já está associado a outra conta ou contém dados inconsistentes. É necessária revisão pelo suporte.",
        );
      }
    } else {
      // ========================================
      // 8. REUTILIZAR UMA CONTA VERIFICADA
      //    OU CRIAR UMA CONTA NOVA
      // ========================================

      const { data: paginaContas, error: erroListagem } =
        await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (erroListagem) {
        console.error(
          "Erro ao verificar contas existentes:",
          erroListagem,
        );
        return responder(
          503,
          "Não foi possível verificar as contas existentes. O pedido continua pendente.",
        );
      }

      const contasCorrespondentes = (paginaContas.users ?? [])
        .filter(
          (conta) =>
            normalizarEmail(conta.email ?? "") === email,
        );

      // Nunca escolher uma conta arbitrariamente.
      if (contasCorrespondentes.length > 1) {
        return responder(
          409,
          "Existem várias contas com este email. É necessária revisão pelo suporte.",
        );
      }

      const contaExistente = contasCorrespondentes[0];

      if (contaExistente) {
        // Um registo de email, sozinho, não prova que o
        // requerente controla a respetiva caixa de correio.
        if (!contaExistente.email_confirmed_at) {
          return responder(
            409,
            "O pedido está pendente porque este email já tem uma conta por confirmar. O MC tem de confirmar o endereço de email antes de o Suporte Geral concluir a aprovação. Não elimines a conta nem repitas a aprovação.",
          );
        }

        const tipoExistente =
          contaExistente.app_metadata?.tipo_acesso;

        if (
          tipoExistente !== undefined &&
          tipoExistente !== "mc"
        ) {
          return responder(
            409,
            "O email pertence a uma conta com outro tipo de acesso. É necessária revisão pelo suporte.",
          );
        }

        const { data: outrosMCs, error: erroAssociacoes } =
          await admin
            .from("mcs")
            .select("id")
            .eq("auth_user_id", contaExistente.id)
            .neq("id", mc.id)
            .limit(1);

        if (erroAssociacoes) {
          return responder(
            503,
            "Não foi possível verificar as associações desta conta.",
          );
        }

        if ((outrosMCs ?? []).length > 0) {
          return responder(
            409,
            "Esta conta já está associada a outro MC.",
          );
        }

        const { error: erroMetadados } =
          await admin.auth.admin.updateUserById(
            contaExistente.id,
            {
              app_metadata: {
                ...contaExistente.app_metadata,
                tipo_acesso: "mc",
                alterar_password_primeiro_acesso: true,
              },
            },
          );

        if (erroMetadados) {
          console.error(
            "Erro ao preparar conta existente do MC:",
            erroMetadados,
          );
          return responder(
            503,
            "Não foi possível preparar a conta existente. O pedido continua pendente.",
          );
        }

        authUserId = contaExistente.id;
      } else {
        // O Suporte Geral só cria contas novas após aprovar.
        const {
          data: novaConta,
          error: erroCriacao,
        } = await admin.auth.admin.createUser({
          email,
          password: criarPasswordInterna(),
          email_confirm: true,
          app_metadata: {
            tipo_acesso: "mc",
            alterar_password_primeiro_acesso: true,
          },
          user_metadata: {
            nome_artistico: mc.nome_artistico,
          },
        });

        if (erroCriacao || !novaConta.user) {
          console.error(
            "Erro ao criar conta MC:",
            erroCriacao,
          );

          return responder(
            409,
            "Não foi possível criar a conta. Verifica se o email já tem uma conta Auth.",
          );
        }

        authUserId = novaConta.user.id;
      }

      // ========================================
      // 9. ASSOCIAR A CONTA AO PERFIL
      // ========================================

      const {
        data: perfilAtualizado,
        error: erroLigacao,
      } = await admin
        .from("mcs")
        .update({
          auth_user_id: authUserId,
        })
        .eq("id", mc.id)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();

      if (erroLigacao || !perfilAtualizado) {
        console.error(
          "Erro ao associar conta MC:",
          erroLigacao,
        );

        return responder(
          409,
          "A conta foi preparada, mas não foi possível associá-la ao perfil. É necessária revisão pelo suporte. Não repitas a aprovação.",
        );
      }
    }

    // ==========================================
    // 10. MARCAR PEDIDO COMO APROVADO
    // ==========================================

    const {
      data: pedidoAtualizado,
      error: erroAtualizacao,
    } = await admin
      .from("pedidos_acesso_mcs")
      .update({
        estado: "aprovado",
        tratado_em: new Date().toISOString(),
        tratado_por: utilizador.id,
      })
      .eq("id", pedido.id)
      .eq("estado", "pendente")
      .select("id")
      .maybeSingle();

    if (erroAtualizacao || !pedidoAtualizado) {
      console.error(
        "Erro ao aprovar pedido MC:",
        erroAtualizacao,
      );

      return responder(
        409,
        "A conta está associada, mas não foi possível concluir a aprovação. Atualiza a lista antes de repetir.",
      );
    }

    // ==========================================
    // 11. ENVIAR EMAIL DE ACESSO
    // ==========================================

    // A aprovação já está concluída.
    // Uma falha de email não elimina a conta
    // nem devolve o pedido ao estado pendente.

    const emailEnviado = await enviarEmailAcesso(
      admin,
      email,
    );

    return sucesso(
      mc.nome_artistico,
      email,
      emailEnviado,
    );
  } catch (erro) {
    console.error(
      "Erro inesperado no acesso MC:",
      erro,
    );

    return responder(
      500,
      "Ocorreu um erro ao processar o pedido. Atualiza a lista para verificar o estado antes de repetir.",
    );
  }
}
