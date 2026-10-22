
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type EstadoAtivacao =
  | "a-verificar"
  | "a-associar"
  | "concluido"
  | "erro";

type RespostaAtivacao = {
  sucesso?: boolean;
  erro?: string;
  mensagem?: string;
};

function uuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{1,8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obterMensagemErro(erro: unknown): string {
  if (erro instanceof Error) {
    return erro.message;
  }

  return "Não foi possível concluir a ativação do perfil.";
}

export default function AtivarPerfilMCPage() {
  const parametros = useParams<{ id: string }>();
  const router = useRouter();

  const mcId = parametros.id;

  const [estado, setEstado] =
    useState<EstadoAtivacao>("a-verificar");

  const [mensagem, setMensagem] = useState(
    "Estamos a confirmar o teu acesso.",
  );

  const [emailConfirmado, setEmailConfirmado] =
    useState("");

  useEffect(() => {
    let ativo = true;

    async function ativarPerfil() {
      try {
        if (!uuidValido(mcId)) {
          throw new Error(
            "O identificador deste perfil é inválido.",
          );
        }

        const url = new URL(window.location.href);

        const erroAutenticacao =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");

        if (erroAutenticacao) {
          throw new Error(
            "A ligação de confirmação é inválida ou expirou. Pede uma nova ligação no perfil do MC.",
          );
        }

        // A chave identifica o pedido específico
        // de ativação do perfil.
        //
        // A autenticação por email, por si só,
        // não pode autorizar a associação a
        // qualquer MC escolhido pelo utilizador.

        const chaveAcesso =
          url.searchParams.get("acesso") || "";

        // Suportar ligações de autenticação
        // com sessão no fragmento da URL.

        const fragmento = new URLSearchParams(
          url.hash.replace(/^#/, ""),
        );

        const accessToken =
          fragmento.get("access_token");

        const refreshToken =
          fragmento.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: erroSessao } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (erroSessao) {
            throw new Error(
              "Não foi possível confirmar a sessão através da ligação recebida por email.",
            );
          }
        }

        // Suportar o fluxo de autenticação
        // que utiliza um código PKCE.

        const codigo = url.searchParams.get("code");

        if (codigo && !accessToken) {
          const {
            error: erroTroca,
          } = await supabase.auth.exchangeCodeForSession(
            codigo,
          );

          if (erroTroca) {
            // A biblioteca Supabase pode ter
            // processado o código automaticamente.
            // A sessão será verificada a seguir.
            console.warn(
              "Verificação do código de autenticação:",
              erroTroca.message,
            );
          }
        }

        // Retirar os tokens e o código de
        // autenticação do endereço apresentado.

        url.searchParams.delete("code");
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");

        url.hash = "";

        window.history.replaceState(
          null,
          "",
          url.pathname + url.search,
        );

        // Confirmar a identidade diretamente
        // junto do Supabase Auth.

        const {
          data: dadosUtilizador,
          error: erroUtilizador,
        } = await supabase.auth.getUser();

        if (
          erroUtilizador ||
          !dadosUtilizador.user
        ) {
          throw new Error(
            "Ainda não foi possível confirmar o email. Abre novamente a ligação recebida ou pede uma nova.",
          );
        }

        const utilizador = dadosUtilizador.user;

        if (!utilizador.email_confirmed_at) {
          throw new Error(
            "O endereço de email ainda não está confirmado.",
          );
        }

        if (!ativo) return;

        setEmailConfirmado(utilizador.email ?? "");

        // Se esta conta já for proprietária
        // do perfil, não é necessária outra
        // associação.

        const {
          data: podeEditar,
          error: erroPermissao,
        } = await supabase.rpc(
          "pode_editar_perfil_mc",
          {
            p_mc_id: mcId,
          },
        );

        if (erroPermissao) {
          throw new Error(
            "Não foi possível verificar as permissões deste perfil.",
          );
        }

        if (podeEditar === true) {
          if (!ativo) return;

          setEstado("concluido");
          setMensagem(
            "A conta já está associada a este perfil. A abrir a área de edição...",
          );

          router.replace(`/mcs/${mcId}/editar`);
          return;
        }

        // É obrigatório possuir uma chave
        // específica deste pedido de acesso.
        //
        // Um utilizador autenticado não pode
        // reclamar um perfil simplesmente
        // por abrir esta página.

        if (!chaveAcesso) {
          throw new Error(
            "Esta ligação não contém uma autorização de ativação válida. Será necessário pedir uma nova ligação quando o serviço estiver configurado.",
          );
        }

        const {
          data: dadosSessao,
          error: erroSessao,
        } = await supabase.auth.getSession();

        const token =
          dadosSessao.session?.access_token;

        if (erroSessao || !token) {
          throw new Error(
            "A sessão expirou. Pede uma nova ligação de acesso.",
          );
        }

        if (!ativo) return;

        setEstado("a-associar");
        setMensagem(
          "Email confirmado. Estamos a associar a tua conta ao perfil.",
        );

        // A associação será executada pelo
        // servidor, que terá de validar:
        //
        // 1. A sessão Supabase.
        // 2. O email confirmado.
        // 3. A chave única do pedido.
        // 4. A correspondência entre pedido,
        //    email e perfil.
        // 5. A ausência de outro proprietário.
        //
        // O navegador não altera diretamente
        // o auth_user_id do MC.

        const resposta = await fetch(
          "/api/mcs/ativar-acesso",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              mcId,
              chaveAcesso,
            }),
          },
        );

        const dados: unknown = await resposta
          .json()
          .catch(() => null);

        const resultado: RespostaAtivacao | null =
          dados &&
          typeof dados === "object" &&
          !Array.isArray(dados)
            ? (dados as RespostaAtivacao)
            : null;

        if (
          !resposta.ok ||
          resultado?.sucesso !== true
        ) {
          throw new Error(
            resultado?.erro ??
              "Não foi possível associar a conta ao perfil.",
          );
        }

        if (!ativo) return;

        setEstado("concluido");
        setMensagem(
          "Perfil ativado. A abrir a área de edição...",
        );

        router.replace(`/mcs/${mcId}/editar`);
      } catch (erro) {
        if (!ativo) return;

        setEstado("erro");
        setMensagem(obterMensagemErro(erro));
      }
    }

    void ativarPerfil();

    return () => {
      ativo = false;
    };
  }, [mcId, router]);

  const aProcessar =
    estado === "a-verificar" ||
    estado === "a-associar";

  return (
    <main className="relative min-h-screen px-5 py-12 text-white">
      <div className="mx-auto max-w-xl">
        <Link
          href={`/mcs/${mcId}`}
          className="inline-flex items-center gap-2 text-xs font-black tracking-wider text-[#d6b56d] transition hover:text-white"
        >
          ← VOLTAR AO PERFIL
        </Link>

        <div className="mt-10 overflow-hidden rounded-2xl border border-[#d6b56d]/40 bg-[#091b13]/95 shadow-2xl">
          <div className="h-2 bg-gradient-to-r from-[#087a43] via-[#d6b56d] to-[#b82535]" />

          <div className="px-6 py-9 sm:px-9">
            <p className="text-xs font-black tracking-[0.25em] text-[#d6b56d]">
              IMPROVISO MADE IN PORTUGAL
            </p>

            <h1 className="mt-4 text-3xl font-black uppercase leading-tight sm:text-4xl">
              ATIVAÇÃO DO
              <span className="block text-[#d6b56d]">
                PERFIL MC
              </span>
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#e7ddc7]">
              Confirmação da conta e acesso à área
              pessoal do artista.
            </p>

            <div
              className={`mt-8 rounded-xl border p-5 ${
                estado === "erro"
                  ? "border-[#b82535] bg-red-950/40"
                  : estado === "concluido"
                    ? "border-[#087a43] bg-emerald-950/40"
                    : "border-[#d6b56d]/40 bg-black/40"
              }`}
              role={
                estado === "erro"
                  ? "alert"
                  : "status"
              }
              aria-live="polite"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d6b56d]/40 bg-black/40 text-xl text-[#d6b56d]">
                  {estado === "erro"
                    ? "!"
                    : estado === "concluido"
                      ? "✓"
                      : "●"}
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-black uppercase tracking-wider">
                    {estado === "erro"
                      ? "ATIVAÇÃO NÃO CONCLUÍDA"
                      : estado === "concluido"
                        ? "ACESSO CONFIRMADO"
                        : estado === "a-associar"
                          ? "A ATIVAR PERFIL"
                          : "A VERIFICAR ACESSO"}
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                    {mensagem}
                  </p>
                </div>
              </div>
            </div>

            {emailConfirmado && (
              <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Email autenticado
                </p>

                <p className="mt-2 break-all text-sm font-semibold text-white">
                  {emailConfirmado}
                </p>
              </div>
            )}

            {aProcessar && (
              <p className="mt-6 text-center text-xs font-bold text-zinc-400">
                Aguarda enquanto verificamos o acesso.
              </p>
            )}

            {estado === "erro" && (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/mcs/${mcId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#d6b56d] px-5 py-3 text-xs font-black text-black transition hover:bg-[#e7ddc7]"
                >
                  VOLTAR AO PERFIL
                </Link>

                <Link
                  href={`/mcs/${mcId}/editar`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-xs font-black text-white transition hover:border-[#d6b56d]"
                >
                  JÁ TENHO ACESSO
                </Link>
              </div>
            )}

            {estado === "concluido" && (
              <Link
                href={`/mcs/${mcId}/editar`}
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#d6b56d] px-5 py-3 text-xs font-black text-black transition hover:bg-[#e7ddc7]"
              >
                EDITAR O MEU PERFIL
              </Link>
            )}
          </div>

          <div className="border-t border-[#d6b56d]/20 bg-black/30 px-6 py-4 text-center text-xs font-black tracking-[0.2em] text-[#d6b56d]">
            MERITOCRACIA É LEI.
          </div>
        </div>
      </div>
    </main>
  );
}
