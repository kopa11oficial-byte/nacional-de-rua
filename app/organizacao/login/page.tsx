
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  boldIMIP,
  veneerIMIP,
} from "../../fonts/identidade";
import { supabase } from "../../../lib/supabase";

function FaixaPortugal() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[6px] w-full overflow-hidden"
    >
      <span className="w-[43%] bg-[#087a43]" />
      <span className="w-[14%] bg-[#d6b56d]" />
      <span className="flex-1 bg-[#b82535]" />
    </div>
  );
}

export default function LoginOrganizacaoPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [aVerificar, setAVerificar] = useState(true);

  /*
    ============================================
    VERIFICAR SESSÃO
    ============================================
  */

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        if (window.location.hash) {
          const hash = new URLSearchParams(
            window.location.hash.substring(1),
          );

          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              window.history.replaceState(
                {},
                document.title,
                "/organizacao/login",
              );

              router.replace("/organizacao");
              return;
            }
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace("/organizacao");
          return;
        }
      } catch (error) {
        console.error(
          "Erro ao verificar sessão:",
          error,
        );

        if (ativo) {
          setErro(
            "Não foi possível verificar a sessão. Tenta novamente.",
          );
        }
      } finally {
        if (ativo) {
          setAVerificar(false);
        }
      }
    }

    void verificarSessao();

    return () => {
      ativo = false;
    };
  }, [router]);

  /*
    ============================================
    INICIAR SESSÃO
    ============================================
  */

  async function entrar(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (loading) return;

    setErro("");
    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setErro(
          "Email ou palavra-passe incorretos.",
        );
        setLoading(false);
        return;
      }

      router.replace("/organizacao");
    } catch (error) {
      console.error(
        "Erro ao iniciar sessão:",
        error,
      );

      setErro(
        "Não foi possível iniciar sessão. Tenta novamente.",
      );

      setLoading(false);
    }
  }

  /*
    ============================================
    RECUPERAR PALAVRA-PASSE
    ============================================
  */

  async function recuperarPassword() {
    setErro("");

    if (!email.trim()) {
      setErro(
        "Escreve primeiro o email da organização.",
      );
      return;
    }

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/organizacao/repor-password`,
          },
        );

      if (error) {
        console.error(
          "Erro na recuperação:",
          error,
        );

        setErro(error.message);
        return;
      }

      alert(
        "Email de recuperação enviado. Verifica a tua caixa de entrada.",
      );
    } catch (error) {
      console.error(
        "Erro ao recuperar palavra-passe:",
        error,
      );

      setErro(
        "Não foi possível enviar o email de recuperação. Tenta novamente.",
      );
    }
  }

  /*
    ============================================
    CARREGAMENTO INICIAL
    ============================================
  */

  if (aVerificar) {
    return (
      <main className="relative flex min-h-screen min-w-0 items-center justify-center px-5 text-[#f0e6d1]">
        <div className="w-full max-w-md overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95">
          <FaixaPortugal />

          <div className="px-6 py-12 text-center">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#d6b56d]">
              NACIONAL DE RUA · IMIP
            </p>

            <h1
              className={`${boldIMIP.className} mt-6 text-[clamp(1.8rem,4vw,2.8rem)] font-bold uppercase leading-[1.1]`}
            >
              A VERIFICAR
              <span className="block text-[#d6b56d]">
                ACESSO...
              </span>
            </h1>

            <div className="mx-auto mt-7 w-28">
              <FaixaPortugal />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
    ============================================
    PÁGINA DE LOGIN
    ============================================
  */

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* NAVEGAÇÃO */}

        <nav
          aria-label="Navegação da página"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · ÁREA DE ORGANIZAÇÃO
          </span>
        </nav>

        {/* CABEÇALHO COM DOIS QUADROS */}

        <section className="relative mt-5 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95 sm:mt-7">
          <FaixaPortugal />

          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">

            {/* QUADRO ESQUERDO */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">
                <p className="imip-etiqueta">
                  QUEM ORGANIZA TAMBÉM FAZ HISTÓRIA
                </p>

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(2.65rem,4.8vw,5.4rem)] text-[#f0e6d1]">
                    ÁREA DA
                  </span>

                  <span className="mt-2 block text-[clamp(2.1rem,3.65vw,4.15rem)] text-[#d6b56d]">
                    ORGANIZAÇÃO
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-7 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-lg font-bold leading-relaxed text-[#f0e6d1] sm:text-xl">
                  Cada roda tem a sua identidade.
                  Cada organização tem o seu papel.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Esta é a área reservada às organizações
                  do Nacional de Rua. Entra com os dados
                  da tua conta para gerir as edições e
                  acompanhar o trabalho da tua organização.
                </p>
              </div>

              {/* ASSINATURA EM VENEER */}

              <div className="relative mt-12 border-l-4 border-[#d6b56d] bg-black/20 px-5 py-4">
                <p
                  className={`${veneerIMIP.className} text-[clamp(1.8rem,2.4vw,2.6rem)] font-normal uppercase leading-[1.14] tracking-[0.02em] text-[#f0e6d1]`}
                >
                  A RUA TEM VOZ.

                  <span className="block text-[#d6b56d]">
                    A ORGANIZAÇÃO DÁ-LHE ESTRUTURA.
                  </span>
                </p>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.09em] text-[#e3d0a1]">
                  NACIONAL DE RUA · IMIP
                </p>
              </div>
            </div>

            {/* QUADRO DIREITO — LOGIN */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">

              {/* ELEMENTOS GRÁFICOS AFASTADOS DO TEXTO */}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 z-0 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-36 -left-32 z-0 h-52 w-52 -rotate-12 border-[24px] border-[#087a43]"
              />

              <div className="relative z-10 min-w-0">

                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  ACESSO RESERVADO
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <h2
                  className={`${boldIMIP.className} mt-7 min-w-0 text-[clamp(2rem,2.8vw,3.1rem)] font-bold uppercase leading-[1.1] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  ENTRAR NA

                  <span className="block text-[#b82535]">
                    ORGANIZAÇÃO.
                  </span>
                </h2>

                <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#394239]">
                  Introduz o email e a palavra-passe
                  associados à tua conta.
                </p>

                {/* FORMULÁRIO */}

                <form
                  onSubmit={entrar}
                  className="mt-7 border border-[#101713]/25 bg-[#f8f2e5] p-4 sm:p-6"
                >

                  {/* EMAIL */}

                  <div>
                    <label
                      htmlFor="email-organizacao"
                      className="mb-2 block border-l-4 border-[#087a43] pl-3 text-xs font-black uppercase tracking-[0.07em]"
                    >
                      EMAIL
                    </label>

                    <input
                      id="email-organizacao"
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                      autoComplete="email"
                      placeholder="email@organizacao.pt"
                      className="min-h-12 w-full min-w-0 border border-[#101713]/40 bg-white px-4 py-3 text-sm text-[#101713] outline-none placeholder:text-[#687167] focus:border-[#087a43] focus:ring-2 focus:ring-[#087a43]/20"
                    />
                  </div>

                  {/* PALAVRA-PASSE */}

                  <div className="mt-5">
                    <label
                      htmlFor="password-organizacao"
                      className="mb-2 block border-l-4 border-[#b82535] pl-3 text-xs font-black uppercase tracking-[0.07em]"
                    >
                      PALAVRA-PASSE
                    </label>

                    <input
                      id="password-organizacao"
                      type="password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="min-h-12 w-full min-w-0 border border-[#101713]/40 bg-white px-4 py-3 text-sm text-[#101713] outline-none placeholder:text-[#687167] focus:border-[#087a43] focus:ring-2 focus:ring-[#087a43]/20"
                    />
                  </div>

                  {/* ERRO */}

                  {erro && (
                    <p
                      role="alert"
                      className="mt-5 border-l-4 border-[#b82535] bg-[#b82535]/10 px-4 py-3 text-sm font-bold leading-relaxed text-[#842333]"
                    >
                      {erro}
                    </p>
                  )}

                  {/* ENTRAR */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 flex min-h-12 w-full items-center justify-center bg-[#101713] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.06em] text-[#f0e6d1] transition hover:bg-[#087a43] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "A ENTRAR..."
                      : "ENTRAR NA ORGANIZAÇÃO ↗"}
                  </button>
                </form>

                {/* RECUPERAR PALAVRA-PASSE */}

                <button
                  type="button"
                  onClick={recuperarPassword}
                  disabled={loading}
                  className="mt-5 flex min-h-11 w-full items-center justify-center border border-[#101713]/35 bg-[#e7ddc7] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.04em] text-[#8f2634] transition hover:border-[#b82535] hover:bg-[#f8f2e5] disabled:opacity-50"
                >
                  ESQUECI-ME DA PALAVRA-PASSE ↗
                </button>
              </div>

              {/* ASSINATURA DO QUADRO */}

              <div className="relative z-10 mt-10 border-t-4 border-[#101713] pt-4">
                <p className="text-xs font-black uppercase leading-relaxed tracking-[0.08em]">
                  ACESSO À GESTÃO.

                  <span className="block">
                    RESPEITO PELA IDENTIDADE DE CADA RODA.
                  </span>
                </p>

                <p
                  className={`${veneerIMIP.className} mt-3 text-xl font-normal uppercase tracking-[0.03em] text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INFORMAÇÃO SOBRE O ACESSO */}

        <section className="mt-8 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
          <FaixaPortugal />

          <div className="p-5 sm:p-7">
            <p className="imip-etiqueta">
              A GESTÃO COMEÇA AQUI
            </p>

            <h2
              className={`${boldIMIP.className} mt-3 text-[clamp(1.7rem,2.8vw,3rem)] font-bold uppercase leading-[1.1] tracking-[0.02em]`}
            >
              CADA RODA.

              <span className="block text-[#d6b56d]">
                A SUA IDENTIDADE.
              </span>
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
              O acesso à gestão depende das permissões
              atribuídas à conta. Os dados de cada
              organização e as respetivas funcionalidades
              continuam sujeitos às regras de acesso
              do Nacional de Rua.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/rodas"
                className="inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
              >
                CONHECER AS RODAS ↗
              </Link>

              <Link
                href="/"
                className="inline-flex min-h-11 items-center border border-[#d6b56d]/40 px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0e6d1] transition hover:bg-[#14251a]"
              >
                PÁGINA INICIAL ↗
              </Link>
            </div>
          </div>
        </section>

        {/* RODAPÉ */}

        <footer className="mt-14 border-t border-[#d6b56d]/35 pt-8 text-center">
          <p
            className={`${veneerIMIP.className} text-xl font-normal uppercase tracking-[0.04em] text-[#d6b56d] sm:text-2xl`}
          >
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ded8ca]">
            NACIONAL DE RUA · IMIP ·
            IMPROVISO MADE IN PORTUGAL
          </p>
        </footer>
      </div>
    </main>
  );
}
