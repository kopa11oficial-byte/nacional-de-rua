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
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responder(401, { erro: "Inicia sessão com uma conta de suporte autorizada." });

  try {
    const corpo = (await request.json().catch(() => null)) as
      | { email?: unknown; regiao?: unknown }
      | null;
    const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
    const regiao = corpo?.regiao;

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof regiao !== "string" ||
      !REGIOES.includes(regiao as (typeof REGIOES)[number])
    ) {
      return responder(400, { erro: "Confirma o email e a região do novo suporte." });
    }

    const { env } = getCloudflareContext();
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_PUBLICO_URL } =
      env as unknown as CloudflareBindings;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return responder(503, { erro: "Falta configurar o serviço de autenticação." });
    }

    const config = { auth: { autoRefreshToken: false, persistSession: false } };
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, config);
    const { data: operador, error: erroSessao } = await admin.auth.getUser(token);
    if (erroSessao || !operador.user) {
      return responder(401, { erro: "A sessão expirou. Inicia sessão novamente." });
    }

    // As permissões são validadas pelo JWT do operador no servidor.
    // O Suporte Geral e todos os suportes regionais ativos podem criar suportes.
    const comoOperador = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      ...config,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: autorizado, error: erroAcesso } =
      await comoOperador.rpc("tem_acesso_central_imip");
    if (erroAcesso || autorizado !== true) {
      return responder(403, { erro: "Apenas os suportes IMIP autorizados podem gerir a equipa." });
    }

    // Não criar duplicados: um MC, organizador ou suporte pode partilhar a mesma
    // conta Auth e mantém a palavra-passe e os restantes papéis que já tinha.
    let contaExistente: Awaited<ReturnType<typeof admin.auth.admin.listUsers>>["data"]["users"][number] | undefined;
    let listaCompleta = false;
    for (let pagina = 1; pagina <= 10; pagina++) {
      const { data: utilizadores, error: erroLista } =
        await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
      if (erroLista || !utilizadores) {
        return responder(503, { erro: "Não foi possível verificar as contas existentes." });
      }
      contaExistente = utilizadores.users.find(
        (conta) => conta.email?.trim().toLowerCase() === email,
      );
      if (contaExistente) break;
      if (utilizadores.users.length < 200) {
        listaCompleta = true;
        break;
      }
    }
    if (!contaExistente && !listaCompleta) {
      return responder(503, { erro: "A verificação de contas excedeu o limite. Não foi criado nenhum convite." });
    }

    if (contaExistente) {
      if (!contaExistente.email_confirmed_at) {
        return responder(409, {
          erro: "Esta conta já existe, mas o email não está confirmado. Conclui a ativação do convite pendente antes de atribuir o suporte.",
        });
      }

      const { error: erroAtribuicao } = await comoOperador.rpc(
        "atribuir_suporte_regional_imip",
        { p_email: email, p_regiao: regiao },
      );
      if (erroAtribuicao) {
        console.error("IMIP: não foi possível atribuir suporte existente.", erroAtribuicao.code);
        return responder(503, { erro: "Não foi possível atribuir a função de suporte a esta conta." });
      }

      return responder(200, {
        sucesso: true,
        tipo: "ativo",
        mensagem: "Suporte ativado. A pessoa mantém a palavra-passe e todos os acessos anteriores, incluindo o perfil de MC.",
      });
    }

    // O convite é enviado automaticamente pelo Auth. Um servidor SMTP próprio
    // é indispensável para endereços fora da equipa do projeto Supabase.
    const redirectTo = urlRecuperacaoMC(SITE_PUBLICO_URL);
    const { data: convite, error: erroConvite } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (erroConvite || !convite?.user) {
      console.error("IMIP: falha no envio automático do convite.", erroConvite?.code);
      if (
        erroConvite?.code === "email_address_not_authorized" ||
        erroConvite?.code === "over_email_send_rate_limit"
      ) {
        return responder(503, {
          erro: "O Supabase bloqueou o envio do email. É necessário configurar SMTP próprio em Authentication > SMTP (ou rever o limite de envio). Nenhuma permissão de suporte foi ativada.",
        });
      }
      return responder(503, {
        erro: "Não foi possível enviar o convite automaticamente. Confirma a configuração SMTP e tenta novamente. Nenhuma permissão de suporte foi ativada.",
      });
    }

    // A região fica guardada apenas em app_metadata, que não é editável pelo
    // utilizador. O acesso regional só será ativado depois da confirmação do
    // email e da definição da palavra-passe na ligação recebida.
    const { error: erroMarcacao } = await admin.auth.admin.updateUserById(
      convite.user.id,
      {
        app_metadata: {
          ...(convite.user.app_metadata ?? {}),
          convite_suporte_pendente: true,
          convite_suporte_regiao: regiao,
        },
      },
    );

    if (erroMarcacao) {
      console.error("IMIP: convite enviado, mas falhou a preparação.", erroMarcacao.code);
      return responder(503, {
        erro: "O email pode já ter sido enviado, mas a ativação da função de suporte não ficou preparada. Contacta o suporte técnico antes de gerar outro convite.",
      });
    }

    return responder(200, {
      sucesso: true,
      tipo: "convidado",
      mensagem: "Conta criada e convite enviado por email. O suporte será ativado automaticamente depois de a pessoa confirmar o email e definir a palavra-passe.",
    });
  } catch (erro) {
    console.error("IMIP: erro ao criar ou atribuir suporte.", erro);
    return responder(500, { erro: "Não foi possível concluir a criação do suporte." });
  }
}
