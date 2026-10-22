
"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  boldIMIP,
  veneerIMIP,
} from "../../fonts/identidade";
import { supabase } from "../../../lib/supabase";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  RECUPERAÇÃO DE PALAVRA-PASSE

  IDENTIDADE VISUAL

  Bold:
  - Títulos principais
  - Títulos das secções

  Veneer:
  - Frases de impacto
  - Assinatura visual

  Geist:
  - Formulários
  - Informação
  - Mensagens de erro

  FUNCIONALIDADES PRESERVADAS

  - Evento PASSWORD_RECOVERY
  - Recuperação com tokens no URL
  - Recuperação com token_hash
  - Recuperação PKCE
  - Verificação da sessão
  - Limpeza dos tokens do endereço
  - Confirmação da nova palavra-passe
  - Mostrar e esconder palavra-passe
  - Validação de comprimento mínimo
  - Atualização através do Supabase
  - Terminar sessão após atualização
  - Redirecionamento para o login

  Não modifica dados ou políticas do Supabase.
  ==================================================
*/

function FaixaPortugal({
  altura = "h-[5px]",
}: {
  altura?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex w-full overflow-hidden ${altura}`}
    >
      <span className="w-[43%] bg-[#087a43]" />
      <span className="w-[14%] bg-[#d6b56d]" />
      <span className="flex-1 bg-[#b82535]" />
    </div>
  );
}

export default function ReporPasswordPage() {
  const router = useRouter();

  const recuperacaoConfirmada = useRef(false);

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");

  const [loading, setLoading] = useState(false);

  const [aVerificar, setAVerificar] =
    useState(true);

  const [sessaoPronta, setSessaoPronta] =
    useState(false);

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  /*
    ============================================
    PREPARAR SESSÃO DE RECUPERAÇÃO

    Mantemos os formatos aceites pelo
    Supabase e os controlos do ficheiro
    original.
    ============================================
  */

  useEffect(() => {
    let ativo = true;

    function limparUrl() {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname,
      );
    }

    function confirmarSessao() {
      recuperacaoConfirmada.current = true;

      if (!ativo) return;

      setSessaoPronta(true);
      setErro("");
      setAVerificar(false);
    }

    /*
      O Supabase pode processar o link
      automaticamente.

      PASSWORD_RECOVERY identifica
      a recuperação da palavra-passe.
    */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evento, sessao) => {
        if (!ativo) return;

        if (
          evento === "PASSWORD_RECOVERY" &&
          sessao
        ) {
          confirmarSessao();
        }
      },
    );

    async function prepararSessao() {
      try {
        const query = new URLSearchParams(
          window.location.search,
        );

        const hash = new URLSearchParams(
          window.location.hash.substring(1),
        );

        const erroLink =
          query.get("error_description") ??
          hash.get("error_description");

        if (erroLink) {
          throw new Error(
            "O link de recuperação expirou ou não é válido. Pede um novo email de acesso.",
          );
        }

        const tipo =
          query.get("type") ??
          hash.get("type");

        const accessToken =
          hash.get("access_token");

        const refreshToken =
          hash.get("refresh_token");

        const codigo = query.get("code");

        const tokenHash =
          query.get("token_hash") ??
          hash.get("token_hash");

        /*
          ======================================
          FORMATO COM TOKENS NO URL
          ======================================
        */

        if (accessToken && refreshToken) {
          if (tipo && tipo !== "recovery") {
            throw new Error(
              "Este link não é de recuperação de palavra-passe.",
            );
          }

          const { error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (error) {
            throw new Error(
              "O link de recuperação expirou ou não é válido.",
            );
          }

          if (!ativo) return;

          limparUrl();
          confirmarSessao();
          return;
        }

        /*
          ======================================
          FORMATO OTP COM TOKEN_HASH
          ======================================
        */

        if (tokenHash) {
          if (tipo !== "recovery") {
            throw new Error(
              "O link recebido não corresponde a uma recuperação de palavra-passe.",
            );
          }

          const { error } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });

          if (error) {
            throw new Error(
              "Não foi possível validar o link de recuperação. Pede um novo email.",
            );
          }

          if (!ativo) return;

          limparUrl();
          confirmarSessao();
          return;
        }

        /*
          ======================================
          FORMATO PKCE
          ======================================
        */

        if (codigo) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              codigo,
            );

          if (error) {
            if (
              recuperacaoConfirmada.current
            ) {
              limparUrl();
              return;
            }

            throw new Error(
              "Não foi possível validar o código de recuperação. Pede um novo link.",
            );
          }

          if (!ativo) return;

          limparUrl();
          confirmarSessao();
          return;
        }

        /*
          ======================================
          SESSÃO PROCESSADA PELO SUPABASE
          ======================================
        */

        const {
          data: { session },
          error: erroSessao,
        } = await supabase.auth.getSession();

        if (erroSessao) {
          throw new Error(
            "Não foi possível verificar a sessão de recuperação.",
          );
        }

        if (!ativo) return;

        if (
          session ||
          recuperacaoConfirmada.current
        ) {
          confirmarSessao();
          return;
        }

        setErro(
          "Abre esta página através do link de recuperação recebido por email.",
        );
      } catch (falha) {
        console.error(
          "Erro ao preparar recuperação de palavra-passe:",
          falha,
        );

        if (!ativo) return;

        setSessaoPronta(false);

        setErro(
          falha instanceof Error
            ? falha.message
            : "O link de recuperação não é válido ou expirou.",
        );
      } finally {
        if (ativo) {
          setAVerificar(false);
        }
      }
    }

    void prepararSessao();

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
    ============================================
    ALTERAR PALAVRA-PASSE

    Validações e sequência original
    de atualização preservadas.
    ============================================
  */

  async function alterarPassword(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (loading) return;

    setErro("");

    if (!sessaoPronta) {
      setErro(
        "A sessão de recuperação ainda não está válida.",
      );
      return;
    }

    if (password.length < 6) {
      setErro(
        "A palavra-passe deve ter pelo menos 6 caracteres.",
      );
      return;
    }

    if (password !== confirmar) {
      setErro(
        "As palavras-passe não são iguais.",
      );
      return;
    }

    setLoading(true);

    try {
      /*
        Confirmar identidade antes
        de alterar a palavra-passe.
      */

      const {
        data: { user },
        error: erroUtilizador,
      } = await supabase.auth.getUser();

      if (erroUtilizador || !user) {
        throw new Error(
          "A sessão expirou. Pede um novo link de recuperação.",
        );
      }

      const { error: erroPassword } =
        await supabase.auth.updateUser({
          password,
        });

      if (erroPassword) {
        throw new Error(
          erroPassword.message ||
            "Não foi possível alterar a palavra-passe.",
        );
      }

      /*
        Depois da alteração, terminar
        a sessão e obrigar a entrar
        com a nova palavra-passe.
      */

      await supabase.auth.signOut();

      router.replace(
        "/organizacao/login?password=alterada",
      );
    } catch (falha) {
      console.error(
        "Erro ao definir palavra-passe:",
        falha,
      );

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível alterar a palavra-passe. Tenta novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ============================================
    APRESENTAÇÃO
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
            href="/organizacao/login"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← VOLTAR AO LOGIN
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · RECUPERAÇÃO DE ACESSO
          </span>
        </nav>

        {/* =====================================
            CABEÇALHO COM DOIS QUADROS
            ===================================== */}

        <section className="relative mt-5 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95 sm:mt-7">
          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">

            {/* =====================================
                QUADRO ESQUERDO
                ===================================== */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">
                <p className="imip-etiqueta">
                  SEGURANÇA · ACESSO · ORGANIZAÇÃO
                </p>

                {/* TÍTULO — BOLD */}

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(3.1rem,5vw,5.6rem)] text-[#f0e6d1]">
                    NOVA
                  </span>

                  <span className="mt-2 block text-[clamp(2.05rem,3.5vw,3.9rem)] text-[#d6b56d]">
                    PALAVRA-PASSE
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-7 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-lg font-bold leading-relaxed text-[#f0e6d1] sm:text-xl">
                  O acesso à organização deve
                  estar sempre protegido.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Define uma nova palavra-passe para
                  a tua conta do Nacional de Rua.
                  O link recebido por email permite
                  confirmar o acesso antes de
                  guardares a alteração.
                </p>
              </div>

              {/* FRASE DE IMPACTO — VENEER */}

              <div className="relative mt-12 border-l-4 border-[#d6b56d] bg-black/20 px-5 py-4">
                <p
                  className={`${veneerIMIP.className} text-[clamp(1.8rem,2.5vw,2.8rem)] font-normal uppercase leading-[1.14] tracking-[0.02em] text-[#f0e6d1]`}
                >
                  A RUA TEM VOZ.

                  <span className="block text-[#d6b56d]">
                    O ACESSO TEM RESPONSABILIDADE.
                  </span>
                </p>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.09em] text-[#e3d0a1]">
                  NACIONAL DE RUA · IMIP
                </p>
              </div>
            </div>

            {/* =====================================
                QUADRO DIREITO — MARFIM

                RECUPERAÇÃO DA PALAVRA-PASSE
                ===================================== */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">

              {/* ELEMENTOS GRÁFICOS AFASTADOS */}

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
                  SEGURANÇA DA CONTA
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                {/* TÍTULO DO FORMULÁRIO */}

                <h2
                  className={`${boldIMIP.className} mt-7 min-w-0 text-[clamp(2rem,2.8vw,3.1rem)] font-bold uppercase leading-[1.1] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  DEFINIR NOVA

                  <span className="block text-[#b82535]">
                    PALAVRA-PASSE.
                  </span>
                </h2>

                <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#394239]">
                  Confirma o teu acesso e introduz
                  a nova palavra-passe duas vezes.
                </p>

                {/* =====================================
                    ESTADO DE VERIFICAÇÃO
                    ===================================== */}

                {aVerificar ? (
                  <div
                    role="status"
                    className="mt-7 border border-[#101713]/25 bg-[#f8f2e5] p-5 sm:p-6"
                  >
                    <p className="border-l-4 border-[#d6b56d] pl-3 text-xs font-black uppercase tracking-[0.08em] text-[#101713]">
                      A VERIFICAR O LINK...
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-[#394239]">
                      Aguarda enquanto confirmamos
                      o acesso à tua conta.
                    </p>

                    <div className="mt-6 w-28">
                      <FaixaPortugal />
                    </div>
                  </div>
                ) : (

                  /* =====================================
                      FORMULÁRIO DE RECUPERAÇÃO
                      ===================================== */

                  <form
                    onSubmit={alterarPassword}
                    className="mt-7 border border-[#101713]/25 bg-[#f8f2e5] p-4 sm:p-6"
                  >

                    {/* SESSÃO CONFIRMADA */}

                    {sessaoPronta && (
                      <p
                        role="status"
                        className="mb-6 border-l-4 border-[#087a43] bg-[#087a43]/10 px-4 py-3 text-sm font-bold leading-relaxed text-[#14542f]"
                      >
                        Acesso confirmado. Podes
                        definir a tua nova
                        palavra-passe.
                      </p>
                    )}

                    {/* NOVA PALAVRA-PASSE */}

                    <div>
                      <label
                        htmlFor="nova-password"
                        className="mb-2 block border-l-4 border-[#087a43] pl-3 text-xs font-black uppercase tracking-[0.07em]"
                      >
                        NOVA PALAVRA-PASSE
                      </label>

                      <div className="relative">
                        <input
                          id="nova-password"
                          type={
                            mostrarPassword
                              ? "text"
                              : "password"
                          }
                          value={password}
                          onChange={(evento) =>
                            setPassword(
                              evento.target.value,
                            )
                          }
                          disabled={
                            !sessaoPronta ||
                            loading
                          }
                          autoComplete="new-password"
                          minLength={6}
                          required
                          className="min-h-12 w-full min-w-0 border border-[#101713]/40 bg-white px-4 py-3 pr-24 text-sm text-[#101713] outline-none focus:border-[#087a43] focus:ring-2 focus:ring-[#087a43]/20 disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        {/* MOSTRAR / ESCONDER */}

                        <button
                          type="button"
                          onClick={() =>
                            setMostrarPassword(
                              (valor) => !valor,
                            )
                          }
                          disabled={
                            !sessaoPronta ||
                            loading
                          }
                          className="absolute inset-y-0 right-3 px-1 text-[11px] font-black uppercase text-[#8e2935] transition hover:text-[#101713] disabled:opacity-40"
                        >
                          {mostrarPassword
                            ? "ESCONDER"
                            : "MOSTRAR"}
                        </button>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[#596258]">
                        Mínimo de 6 caracteres.
                      </p>
                    </div>

                    {/* CONFIRMAR PALAVRA-PASSE */}

                    <div className="mt-6">
                      <label
                        htmlFor="confirmar-password"
                        className="mb-2 block border-l-4 border-[#b82535] pl-3 text-xs font-black uppercase tracking-[0.07em]"
                      >
                        CONFIRMAR PALAVRA-PASSE
                      </label>

                      <input
                        id="confirmar-password"
                        type="password"
                        value={confirmar}
                        onChange={(evento) =>
                          setConfirmar(
                            evento.target.value,
                          )
                        }
                        disabled={
                          !sessaoPronta ||
                          loading
                        }
                        autoComplete="new-password"
                        minLength={6}
                        required
                        className="min-h-12 w-full min-w-0 border border-[#101713]/40 bg-white px-4 py-3 text-sm text-[#101713] outline-none focus:border-[#087a43] focus:ring-2 focus:ring-[#087a43]/20 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    {/* ERROS */}

                    {erro && (
                      <p
                        role="alert"
                        className="mt-5 border-l-4 border-[#b82535] bg-[#b82535]/10 px-4 py-3 text-sm font-bold leading-relaxed text-[#842333]"
                      >
                        {erro}
                      </p>
                    )}

                    {/* GUARDAR PALAVRA-PASSE */}

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !sessaoPronta
                      }
                      className="mt-6 flex min-h-12 w-full items-center justify-center bg-[#101713] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.06em] text-[#f0e6d1] transition hover:bg-[#087a43] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading
                        ? "A ALTERAR..."
                        : "DEFINIR PALAVRA-PASSE ↗"}
                    </button>

                    {/* AVISO SEM SESSÃO */}

                    {!sessaoPronta && (
                      <p className="mt-5 text-center text-xs leading-relaxed text-[#596258]">
                        Precisas de um link válido
                        de recuperação para definir
                        a palavra-passe.
                      </p>
                    )}
                  </form>
                )}

                {/* =====================================
                    ASSINATURA DO QUADRO
                    ===================================== */}

                <div className="mt-9 border-t-4 border-[#101713] pt-4">
                  <p className="text-xs font-black uppercase leading-relaxed tracking-[0.08em]">
                    PROTEÇÃO DA CONTA.

                    <span className="block">
                      RESPONSABILIDADE NO ACESSO.
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
          </div>
        </section>

        {/* =====================================
            INFORMAÇÃO SOBRE A RECUPERAÇÃO
            ===================================== */}

        <section className="mt-8 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
          <FaixaPortugal />

          <div className="p-5 sm:p-7">

            <p className="imip-etiqueta">
              RECUPERAÇÃO DE ACESSO
            </p>

            <h2
              className={`${boldIMIP.className} mt-3 text-[clamp(1.7rem,2.8vw,3rem)] font-bold uppercase leading-[1.1] tracking-[0.02em]`}
            >
              A TUA CONTA.

              <span className="block text-[#d6b56d]">
                O TEU ACESSO.
              </span>
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
              Quando terminares a alteração,
              voltarás à página de login.
              A partir daí, utiliza a nova
              palavra-passe para entrares
              na Área da Organização.
            </p>

            <Link
              href="/organizacao/login"
              className="mt-6 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
            >
              VOLTAR AO LOGIN ↗
            </Link>
          </div>
        </section>

        {/* =====================================
            RODAPÉ
            ===================================== */}

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
