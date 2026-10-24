import { NextResponse } from "next/server";

export const runtime = "nodejs";

// A ativação automática foi suspensa: a confirmação de um email
// não constitui prova de titularidade de um perfil MC.
//
// A única via autorizada de atribuição de acesso é a validação
// pelo Suporte Geral em /organizacao/pedidos-mcs.
//
// Mantemos a rota antiga para que ligações anteriormente enviadas
// falhem de forma segura, sem alterar perfis ou utilizadores.
export async function POST() {
  return NextResponse.json(
    {
      sucesso: false,
      erro:
        "Para proteger os perfis, o acesso só pode ser atribuído após aprovação pelo Suporte Geral do IMIP. Se já pediste acesso, aguarda a validação. Contacto: imip.nacional@gmail.com.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
