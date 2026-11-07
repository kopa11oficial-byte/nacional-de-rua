
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type CloudflareBindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type Pedido = {
  id: string;
  organizacao_id: string;
  roda_id: string;
  email: string;
  nome_solicitante: string;
  telefone: string | null;
  estado: "pendente" | "aprovado" | "recusado";
};

type Organizacao = {
  id: string;
  nome: string;
  email: string | null;
  ativa: boolean;
  auth_user_id: string | null;
};

type SituacaoTransacao =
  | "concluida"
  | "nao_iniciada"
  | "incerta";

const URL_RECUPERACAO =
  "https://nacional-de-rua.rodasdeimproviso.workers.dev/organizacao/repor-password";

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

function respostaSucesso(
  nome: string,
  email: string,
) {
  return NextResponse.json(
    {
      sucesso: true,
      organizacao: nome,
      email,
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
    (valor) =>
      caracteres.charAt(valor % caracteres.length),
  ).join("");
}

function eObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

export async function POST(
  request: NextRequest,
) {
  const autorizacao =
    request.headers.get("authorization");

  const token = autorizacao
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return responder(
      401,
      "A sessão expirou. Inicia sessão novamente.",
    );
  }

  try {
    // ==========================================
    // CONFIGURAÇÃO DO SERVIDOR
    // ==========================================

    const contexto = getCloudflareContext();

    const env =
      contexto.env as unknown as CloudflareBindings;

    if (
      !env.SUPABASE_URL ||
      !env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return responder(
        500,
        "Configuração do servidor incompleta.",
      );
    }

    // ==========================================
    // VALIDAR O PEDIDO RECEBIDO
    // ==========================================

    const corpo: unknown = await request
      .json()
      .catch(() => null);

    if (
      !eObjeto(corpo) ||
      typeof corpo.pedidoId !== "string"
    ) {
      return responder(
        400,
        "Pedido inválido.",
      );
    }

    if (
      corpo.acao !== undefined &&
      corpo.acao !== "aprovar" &&
      corpo.acao !== "reenviar-email"
    ) {
      return responder(
        400,
        "Ação inválida.",
      );
    }

    const acao =
      corpo.acao === "reenviar-email"
        ? "reenviar-email"
        : "aprovar";

    // ==========================================
    // CLIENTE COM PERMISSÕES DO SERVIDOR
    // ==========================================

    const admin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Cliente que verifica as permissões
    // através da sessão do utilizador.

    const clienteComSessao = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
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

    // ==========================================
    // 1. VALIDAR A SESSÃO
    // ==========================================

    const {
      data: utilizadorData,
      error: erroUtilizador,
    } = await admin.auth.getUser(token);

    const utilizador = utilizadorData.user;

    if (
      erroUtilizador ||
      !utilizador
    ) {
      return responder(
        401,
        "A sessão expirou. Inicia sessão novamente.",
      );
    }

    // ==========================================
    // 2. VERIFICAR PERMISSÕES DE SUPORTE
    // ==========================================

    // A função tem_permissao_suporte permite:
    //
    // - Suporte Geral IMIP
    // - Suporte de Rodas e Organizações
    //
    // As restantes áreas não ficam autorizadas.

    const {
      data: autorizado,
      error: erroPermissao,
    } = await clienteComSessao.rpc(
      "tem_permissao_suporte",
      {
        p_area: "rodas_organizacoes",
      },
    );

    if (
      erroPermissao ||
      autorizado !== true
    ) {
      return responder(
        403,
        "Esta operação está reservada ao Suporte Geral IMIP e ao Suporte de Rodas e Organizações.",
      );
    }

    // ==========================================
    // 3. CONSULTAR O PEDIDO
    // ==========================================

    const {
      data: pedidoData,
      error: erroPedido,
    } = await admin
      .from("pedidos_acesso_organizacoes")
      .select(
        "id,organizacao_id,roda_id,email,nome_solicitante,telefone,estado",
      )
      .eq("id", corpo.pedidoId)
      .maybeSingle();

    if (erroPedido) {
      console.error(
        "Erro ao consultar pedido:",
        erroPedido,
      );

      return responder(
        500,
        "Não foi possível consultar este pedido.",
      );
    }

    if (!pedidoData) {
      return responder(
        404,
        "Pedido não encontrado.",
      );
    }

    const pedido = pedidoData as Pedido;

    const email = pedido.email
      .trim()
      .toLowerCase();

    if (!email) {
      return responder(
        409,
        "O pedido não tem um email válido.",
      );
    }

    // Utilizar sempre o endereço público,
    // mesmo quando estamos em localhost.

    const redirectTo = URL_RECUPERACAO;

    // ==========================================
    // REENVIAR EMAIL DE ACESSO
    // ==========================================

    if (acao === "reenviar-email") {
      if (pedido.estado !== "aprovado") {
        return responder(
          409,
          "Só é possível reenviar emails de pedidos aprovados.",
        );
      }

      const {
        data: organizacaoData,
        error: erroOrganizacao,
      } = await admin
        .from("organizacoes")
        .select(
          "id,nome,email,ativa,auth_user_id",
        )
        .eq("id", pedido.organizacao_id)
        .maybeSingle();

      if (
        erroOrganizacao ||
        !organizacaoData
      ) {
        return responder(
          409,
          "Organização não encontrada.",
        );
      }

      const organizacao =
        organizacaoData as Organizacao;

      const {
        data: rodaData,
        error: erroRoda,
      } = await admin
        .from("rodas")
        .select("organizacao_id")
        .eq("id", pedido.roda_id)
        .maybeSingle();

      if (
        erroRoda ||
        !rodaData ||
        rodaData.organizacao_id !== organizacao.id ||
        !organizacao.ativa ||
        !organizacao.auth_user_id
      ) {
        return responder(
          409,
          "O acesso desta organização não está ativo ou a roda já foi transferida.",
        );
      }

      const {
        data: conta,
        error: erroConta,
      } = await admin.auth.admin.getUserById(
        organizacao.auth_user_id,
      );

      if (
        erroConta ||
        !conta.user ||
        conta.user.email
          ?.trim()
          .toLowerCase() !== email ||
        conta.user.app_metadata
          ?.tipo_acesso !== "organizacao" ||
        conta.user.user_metadata
          ?.organizacao_id !== organizacao.id
      ) {
        return responder(
          409,
          "A conta ligada não corresponde a este pedido.",
        );
      }

      const {
        error: erroEnvio,
      } = await admin.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );

      if (erroEnvio) {
        console.error(
          "Erro ao reenviar email:",
          erroEnvio,
        );

        return responder(
          502,
          "Não foi possível reenviar o email de acesso.",
        );
      }

      return respostaSucesso(
        organizacao.nome,
        email,
      );
    }

    // ==========================================
    // APROVAR PEDIDO PENDENTE
    // ==========================================

    if (pedido.estado !== "pendente") {
      return responder(
        409,
        "Este pedido já foi tratado. Atualiza a lista.",
      );
    }

    // ==========================================
    // 4. CONFIRMAR A RODA
    // ==========================================

    const {
      data: roda,
      error: erroRoda,
    } = await admin
      .from("rodas")
      .select(
        "id,nome,organizacao_id,ativa",
      )
      .eq("id", pedido.roda_id)
      .maybeSingle();

    if (
      erroRoda ||
      !roda
    ) {
      return responder(
        404,
        "Não foi possível encontrar a roda.",
      );
    }

    if (roda.ativa !== true) {
      return responder(
        409,
        "A roda encontra-se inativa.",
      );
    }

    if (
      roda.organizacao_id !==
      pedido.organizacao_id
    ) {
      return responder(
        409,
        "A organização da roda não corresponde ao pedido.",
      );
    }

    // ==========================================
    // 5. CONFIRMAR RODAS EM ESPERA
    // ==========================================

    const {
      data: origem,
      error: erroOrigem,
    } = await admin
      .from("organizacoes")
      .select(
        "id,nome,email,ativa,auth_user_id",
      )
      .eq("id", roda.organizacao_id)
      .maybeSingle();

    // ==========================================
    // TROCA DE RESPONSÁVEL DE ORGANIZAÇÃO JÁ ATIVA
    // ==========================================
    // Não transferir ou apagar a roda, edições, pontos ou resultados.
    // A mesma organização conserva o ID; é apenas a conta que muda.
    if (
      !erroOrigem && origem &&
      origem.nome !== "RODAS EM ESPERA" &&
      origem.id === pedido.organizacao_id &&
      origem.ativa === true &&
      origem.email?.trim().toLowerCase() === email
    ) {
      const orgId = origem.id;
      const contaAntigaId = origem.auth_user_id;

      if (contaAntigaId) {
        const [
          contaAntigaResposta, organizacoesResposta, mcsResposta,
          administradoresResposta, suportesResposta, regionaisResposta,
        ] = await Promise.all([
          admin.auth.admin.getUserById(contaAntigaId),
          admin.from("organizacoes").select("id").eq("auth_user_id", contaAntigaId),
          admin.from("mcs").select("id").eq("auth_user_id", contaAntigaId).limit(1),
          admin.from("administradores").select("auth_user_id").eq("auth_user_id", contaAntigaId).limit(1),
          admin.from("suportes_imip").select("auth_user_id").eq("auth_user_id", contaAntigaId).limit(1),
          admin.from("suportes_regionais_imip").select("auth_user_id").eq("auth_user_id", contaAntigaId).limit(1),
        ]);

        const contaAntiga = contaAntigaResposta.data.user;
        if (
          contaAntigaResposta.error || !contaAntiga ||
          contaAntiga.email?.trim().toLowerCase() !== email ||
          contaAntiga.app_metadata?.tipo_acesso !== "organizacao" ||
          contaAntiga.user_metadata?.organizacao_id !== orgId ||
          organizacoesResposta.error ||
          organizacoesResposta.data?.length !== 1 ||
          organizacoesResposta.data[0].id !== orgId ||
          mcsResposta.error || (mcsResposta.data?.length ?? 0) > 0 ||
          administradoresResposta.error || (administradoresResposta.data?.length ?? 0) > 0 ||
          suportesResposta.error || (suportesResposta.data?.length ?? 0) > 0 ||
          regionaisResposta.error || (regionaisResposta.data?.length ?? 0) > 0
        ) {
          return responder(
            409,
            "A conta antiga tem associações inconsistentes. O Suporte Geral deve rever o acesso antes de o substituir.",
          );
        }

        // Retirar primeiro as permissões da conta anterior, mesmo que
        // um token de sessão ainda não tenha expirado.
        const { data: desligada, error: erroDesligar } = await admin
          .from("organizacoes")
          .update({ auth_user_id: null })
          .eq("id", orgId)
          .eq("auth_user_id", contaAntigaId)
          .select("id")
          .maybeSingle();

        if (erroDesligar || desligada?.id !== orgId) {
          return responder(409, "Não foi possível desligar o acesso antigo. Nada foi alterado.");
        }

        // Apaga a identidade antiga através da API administrativa do
        // Supabase Auth, não através de DELETE nas tabelas internas.
        const { error: erroEliminarConta } = await admin.auth.admin.deleteUser(contaAntigaId);

        if (erroEliminarConta) {
          console.error("Erro ao remover antiga conta da organização:", erroEliminarConta);
          const { error: erroReposicao } = await admin
            .from("organizacoes")
            .update({ auth_user_id: contaAntigaId })
            .eq("id", orgId)
            .is("auth_user_id", null);

          return responder(
            500,
            erroReposicao
              ? "A antiga conta ficou desligada, mas não pôde ser eliminada. Pede revisão ao Suporte Geral."
              : "Não foi possível eliminar a antiga conta. A associação anterior foi restaurada.",
          );
        }
      }

      // Nas novas tentativas de um processo interrompido, a organização
      // pode já estar sem responsável. O email do pedido mantém-se igual.
      const { data: novaConta, error: erroCriacao } =
        await admin.auth.admin.createUser({
          email,
          password: criarPasswordInterna(),
          email_confirm: true,
          app_metadata: { tipo_acesso: "organizacao" },
          user_metadata: {
            organizacao_id: orgId,
            nome_organizacao: origem.nome,
            nome_responsavel: pedido.nome_solicitante,
          },
        });

      if (erroCriacao || !novaConta.user) {
        console.error("Erro ao criar conta da nova responsável:", erroCriacao);
        return responder(
          409,
          "O acesso anterior foi desligado. Não foi possível criar a conta nova; verifica se o email ainda existe no Auth e volta a aprovar.",
        );
      }

      const { data: confirmada, error: erroTroca } = await admin.rpc(
        "aprovar_substituicao_responsavel_organizacao",
        {
          p_pedido_id: pedido.id,
          p_organizacao_id: orgId,
          p_novo_auth_user_id: novaConta.user.id,
          p_administrador_id: utilizador.id,
        },
      );

      if (erroTroca || confirmada !== orgId) {
        console.error("Erro na substituição da organização:", erroTroca);

        const [estadoOrg, estadoPedido] = await Promise.all([
          admin.from("organizacoes").select("auth_user_id").eq("id", orgId).maybeSingle(),
          admin.from("pedidos_acesso_organizacoes").select("estado").eq("id", pedido.id).maybeSingle(),
        ]);

        if (
          !estadoOrg.error && !estadoPedido.error &&
          estadoOrg.data?.auth_user_id === null &&
          estadoPedido.data?.estado === "pendente"
        ) {
          await admin.auth.admin.deleteUser(novaConta.user.id);
          return responder(
            409,
            "A substituição não foi concluída. A conta temporária foi limpa; podes voltar a aprovar.",
          );
        }

        if (
          estadoOrg.data?.auth_user_id !== novaConta.user.id ||
          estadoPedido.data?.estado !== "aprovado"
        ) {
          return responder(500, "Estado da troca incerto. Não repitas a operação sem verificar o pedido.");
        }
      }

      const { error: erroEnvio } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      if (erroEnvio) {
        console.error("Nova responsável aprovada, mas email falhou:", erroEnvio);
        return responder(
          502,
          "A Ana foi aprovada e o acesso anterior removido, mas o email falhou. Atualiza a lista e usa REENVIAR EMAIL DE ACESSO.",
        );
      }

      return respostaSucesso(origem.nome, email);
    }

    // ==========================================
    // 5. CONFIRMAR RODAS EM ESPERA
    // ==========================================

    if (
      erroOrigem ||
      !origem ||
      origem.nome !== "RODAS EM ESPERA" ||
      origem.ativa !== true ||
      origem.auth_user_id !== null
    ) {
      return responder(
        409,
        "A roda não está corretamente associada a RODAS EM ESPERA.",
      );
    }

    // ==========================================
    // 6. PROCURAR ORGANIZAÇÃO EXISTENTE
    // ==========================================

    const {
      data: organizacoesEncontradas,
      error: erroPesquisa,
    } = await admin
      .from("organizacoes")
      .select(
        "id,nome,email,ativa,auth_user_id",
      )
      .ilike("email", email)
      .not("auth_user_id", "is", null);

    if (erroPesquisa) {
      console.error(
        "Erro ao procurar organização:",
        erroPesquisa,
      );

      return responder(
        500,
        "Não foi possível verificar as contas existentes.",
      );
    }

    const candidatas = (
      (organizacoesEncontradas ?? []) as Organizacao[]
    ).filter(
      (organizacao) =>
        organizacao.email
          ?.trim()
          .toLowerCase() === email,
    );

    if (candidatas.length > 1) {
      return responder(
        409,
        "Este email está associado a várias organizações. É necessária revisão pelo Suporte Geral.",
      );
    }

    const organizacaoExistente =
      candidatas[0] ?? null;

    let organizacaoDestinoId: string;
    let utilizadorDestinoId: string;

    let contaCriadaAgora = false;

    // ==========================================
    // CAMINHO A — CONTA EXISTENTE
    // ==========================================

    if (organizacaoExistente) {
      if (
        !organizacaoExistente.auth_user_id
      ) {
        return responder(
          409,
          "A organização existente não tem uma conta válida.",
        );
      }

      const {
        data: conta,
        error: erroConta,
      } = await admin.auth.admin.getUserById(
        organizacaoExistente.auth_user_id,
      );

      if (
        erroConta ||
        !conta.user ||
        conta.user.email
          ?.trim()
          .toLowerCase() !== email ||
        conta.user.app_metadata
          ?.tipo_acesso !== "organizacao" ||
        conta.user.user_metadata
          ?.organizacao_id !== organizacaoExistente.id
      ) {
        return responder(
          409,
          "A conta existente tem dados inconsistentes e precisa de revisão antes da aprovação.",
        );
      }

      organizacaoDestinoId =
        organizacaoExistente.id;

      utilizadorDestinoId =
        conta.user.id;
    } else {
      // ========================================
      // CAMINHO B — CONTA NOVA
      // ========================================

      organizacaoDestinoId =
        crypto.randomUUID();

      const {
        data: novaConta,
        error: erroCriacao,
      } = await admin.auth.admin.createUser({
        email,
        password: criarPasswordInterna(),
        email_confirm: true,

        app_metadata: {
          tipo_acesso: "organizacao",
        },

        user_metadata: {
          organizacao_id:
            organizacaoDestinoId,

          nome_organizacao:
            roda.nome,
        },
      });

      if (
        erroCriacao ||
        !novaConta.user
      ) {
        console.error(
          "Erro ao criar conta:",
          erroCriacao,
        );

        return responder(
          409,
          "Não foi possível criar a conta. Este email poderá já existir no Supabase e exigir revisão pelo suporte.",
        );
      }

      utilizadorDestinoId =
        novaConta.user.id;

      contaCriadaAgora = true;
    }

    // ==========================================
    // 7. EXECUTAR A APROVAÇÃO
    // ==========================================

    let erroTransacao: string | null = null;

    try {
      if (contaCriadaAgora) {
        const {
          data,
          error,
        } = await admin.rpc(
          "aprovar_pedido_roda_organizador",
          {
            p_pedido_id: pedido.id,

            p_nova_organizacao_id:
              organizacaoDestinoId,

            p_novo_auth_user_id:
              utilizadorDestinoId,

            p_administrador_id:
              utilizador.id,
          },
        );

        if (
          error ||
          data !== organizacaoDestinoId
        ) {
          erroTransacao =
            error?.message ??
            "Resposta inesperada da aprovação.";
        }
      } else {
        const {
          data,
          error,
        } = await admin.rpc(
          "aprovar_pedido_roda_organizador_existente",
          {
            p_pedido_id: pedido.id,

            p_organizacao_existente_id:
              organizacaoDestinoId,

            p_auth_user_id:
              utilizadorDestinoId,

            p_administrador_id:
              utilizador.id,
          },
        );

        if (
          error ||
          data !== organizacaoDestinoId
        ) {
          erroTransacao =
            error?.message ??
            "Resposta inesperada da aprovação.";
        }
      }
    } catch (falha) {
      console.error(
        "Falha de comunicação na aprovação:",
        falha,
      );

      erroTransacao =
        "A comunicação com o Supabase falhou.";
    }

    // ==========================================
    // 8. VERIFICAR O ESTADO DA TRANSAÇÃO
    // ==========================================

    async function verificarTransacao():
      Promise<SituacaoTransacao> {

      const [
        respostaPedido,
        respostaRoda,
        respostaOrganizacao,
      ] = await Promise.all([
        admin
          .from("pedidos_acesso_organizacoes")
          .select("estado,organizacao_id")
          .eq("id", pedido.id)
          .maybeSingle(),

        admin
          .from("rodas")
          .select("organizacao_id")
          .eq("id", pedido.roda_id)
          .maybeSingle(),

        admin
          .from("organizacoes")
          .select(
            "id,ativa,auth_user_id",
          )
          .eq("id", organizacaoDestinoId)
          .maybeSingle(),
      ]);

      if (
        respostaPedido.error ||
        respostaRoda.error ||
        respostaOrganizacao.error ||
        !respostaPedido.data ||
        !respostaRoda.data
      ) {
        return "incerta";
      }

      const p = respostaPedido.data;
      const r = respostaRoda.data;
      const o = respostaOrganizacao.data;

      if (
        p.estado === "aprovado" &&
        p.organizacao_id ===
          organizacaoDestinoId &&
        r.organizacao_id ===
          organizacaoDestinoId &&
        o?.auth_user_id ===
          utilizadorDestinoId &&
        o.ativa === true
      ) {
        return "concluida";
      }

      if (
        p.estado === "pendente" &&
        p.organizacao_id ===
          pedido.organizacao_id &&
        r.organizacao_id ===
          pedido.organizacao_id &&
        (
          !contaCriadaAgora ||
          !o
        )
      ) {
        return "nao_iniciada";
      }

      return "incerta";
    }

    // ==========================================
    // 9. TRATAR FALHAS
    // ==========================================

    if (erroTransacao) {
      console.error(
        "Falha na aprovação:",
        erroTransacao,
      );

      const situacao =
        await verificarTransacao();

      if (
        situacao === "nao_iniciada"
      ) {
        // Não eliminar contas já existentes.

        if (contaCriadaAgora) {
          const {
            error: erroLimpeza,
          } = await admin.auth.admin.deleteUser(
            utilizadorDestinoId,
          );

          if (erroLimpeza) {
            console.error(
              "Erro ao limpar conta temporária:",
              erroLimpeza,
            );

            return responder(
              500,
              "A aprovação falhou e a conta temporária exige revisão. Não repitas a operação.",
            );
          }
        }

        return responder(
          409,
          `Não foi possível aprovar o pedido: ${erroTransacao}`,
        );
      }

      if (
        situacao === "incerta"
      ) {
        return responder(
          500,
          "Não foi possível confirmar o estado da aprovação. Atualiza os pedidos antes de repetir.",
        );
      }

      // Se a transação ficou concluída,
      // avançar para o envio do email.
    }

    // ==========================================
    // 10. ENVIAR EMAIL DE ACESSO
    // ==========================================

    const {
      error: erroEnvio,
    } = await admin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo,
      },
    );

    if (erroEnvio) {
      console.error(
        "Conta aprovada, mas email falhou:",
        erroEnvio,
      );

      return responder(
        502,
        "O pedido foi aprovado, mas o email falhou. Atualiza a lista e utiliza REENVIAR EMAIL DE ACESSO.",
      );
    }

    // ==========================================
    // 11. CONSULTAR ORGANIZAÇÃO FINAL
    // ==========================================

    const {
      data: organizacaoFinal,
      error: erroConsultaFinal,
    } = await admin
      .from("organizacoes")
      .select("nome")
      .eq("id", organizacaoDestinoId)
      .maybeSingle();

    if (erroConsultaFinal) {
      console.error(
        "Erro ao consultar organização aprovada:",
        erroConsultaFinal,
      );
    }

    return respostaSucesso(
      organizacaoFinal?.nome ?? roda.nome,
      email,
    );
  } catch (falha) {
    console.error(
      "Erro inesperado na aprovação:",
      falha,
    );

    return responder(
      500,
      "Erro inesperado ao processar o pedido.",
    );
  }
}
