"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ResultadoAlteracao = {
  sucesso?: boolean;
  erro?: string;
};

function limparCredenciaisDoEndereco() {
  const endereco = new URL(window.location.href);

  const parametrosDeAutenticacao = [
    "code",
    "token_hash",
    "type",
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
  ];

  for (const parametro of parametrosDeAutenticacao) {
    endereco.searchParams.delete(parametro);
  }

  endereco.hash = "";

  window.history.replaceState(
    {},
    document.title,
    `${endereco.pathname}${endereco.search}`,
  );
}

export default function AlterarPasswordMCPage() {
  const [aVerificarSessao, setAVerificarSessao] = useState(true);
  const [sessaoValida, setSessaoValida] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let componenteActivo = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!componenteActivo) return;

      if (sessao?.access_token) {
        setSessaoValida(true);
        setAVerificarSessao(false);
        setErro("");
      }
    });

    async function prepararSessaoDeRecuperacao() {
      setAVerificarSessao(true);
      setErro("");

      try {
        // Primeiro aproveita uma sessão que o Supabase já tenha criado.
        const { data: sessaoInicial, error: erroSessaoInicial } =
          await supabase.auth.getSession();

        if (erroSessaoInicial) {
          throw erroSessaoInicial;
        }

        if (sessaoInicial.session?.access_token) {
          if (componenteActivo) {
            setSessaoValida(true);
            setAVerificarSessao(false);
            limparCredenciaisDoEndereco();
          }

          return;
        }

        const endereco = new URL(window.location.href);
        const codigo = endereco.searchParams.get("code");
        const tokenHash = endereco.searchParams.get("token_hash");
        const tipoLink = endereco.searchParams.get("type");

        // Alguns links usam o fluxo PKCE e chegam com ?code=...
        if (codigo) {
          const { error: erroTrocaCodigo } =
            await supabase.auth.exchangeCodeForSession(codigo);

          if (erroTrocaCodigo) {
            throw erroTrocaCodigo;
          }
        } else if (tokenHash && tipoLink === "recovery") {
          // Outros links chegam com token_hash e type=recovery.
          const { error: erroVerificacao } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (erroVerificacao) {
            throw erroVerificacao;
          }
        } else {
          // O fluxo de recuperação do Supabase também pode enviar tokens no fragmento.
          const fragmento = new URLSearchParams(
            endereco.hash.startsWith("#")
              ? endereco.hash.slice(1)
              : endereco.hash,
          );

          const accessToken = fragmento.get("access_token");
          const refreshToken = fragmento.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: erroDefinirSessao } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (erroDefinirSessao) {
              throw erroDefinirSessao;
            }
          }
        }

        const { data: sessaoFinal, error: erroSessaoFinal } =
          await supabase.auth.getSession();

        if (erroSessaoFinal) {
          throw erroSessaoFinal;
        }

        const existeSessao = Boolean(sessaoFinal.session?.access_token);

        if (componenteActivo) {
          setSessaoValida(existeSessao);
          setAVerificarSessao(false);

          if (existeSessao) {
            setErro("");
            limparCredenciaisDoEndereco();
          } else {
            setErro(
              "O link não criou uma sessão válida. Pede um novo email de acesso.",
            );
          }
        }
      } catch (falha) {
        // Confirma novamente: o listener pode ter recebido a sessão entretanto.
        const { data: sessaoDepoisDaFalha } =
          await supabase.auth.getSession();

        const existeSessao = Boolean(
          sessaoDepoisDaFalha.session?.access_token,
        );

        if (componenteActivo) {
          setSessaoValida(existeSessao);
          setAVerificarSessao(false);

          if (existeSessao) {
            setErro("");
            limparCredenciaisDoEndereco();
          } else {
            console.error("Erro ao validar link de recuperação:", falha);
            setErro(
              "Não foi possível validar este link. Pede um novo email de acesso.",
            );
          }
        }
      }
    }

    void prepararSessaoDeRecuperacao();

    return () => {
      componenteActivo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function guardarNovaPassword(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (password.length < 8) {
      setErro("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmacao) {
      setErro("As palavras-passe não coincidem.");
      return;
    }

    setAGuardar(true);

    try {
      const { data: sessaoResposta, error: erroSessao } =
        await supabase.auth.getSession();

      const token = sessaoResposta.session?.access_token;

      if (erroSessao || !token) {
        throw new Error(
          "O link expirou ou já foi utilizado. Pede um novo email de acesso.",
        );
      }

      const resposta = await fetch("/api/mcs/alterar-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      let resultado: ResultadoAlteracao = {};

      try {
        resultado = (await resposta.json()) as ResultadoAlteracao;
      } catch {
        resultado = {};
      }

      if (!resposta.ok || resultado.sucesso !== true) {
        throw new Error(
          resultado.erro ??
            "Não foi possível alterar a palavra-passe. Tenta novamente.",
        );
      }

      setConcluido(true);
      setPassword("");
      setConfirmacao("");
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Ocorreu um erro ao alterar a palavra-passe.",
      );
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/55"
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl items-center px-5 py-12 sm:px-6">
        <section className="w-full rounded-2xl border border-yellow-500/50 bg-black/90 p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            PERFIL DE MC
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            ALTERAR <span className="text-yellow-500">PALAVRA-PASSE</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
            Define uma palavra-passe para proteger o acesso ao teu perfil.
          </p>

          {aVerificarSessao ? (
            <p className="mt-8 rounded-xl border border-zinc-700 bg-black p-4 text-sm text-zinc-300">
              A validar o link de acesso...
            </p>
          ) : concluido ? (
            <div
              role="status"
              className="mt-8 rounded-xl border border-emerald-800 bg-emerald-950/40 p-5"
            >
              <h2 className="font-black text-emerald-300">
                PALAVRA-PASSE ALTERADA
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                A tua nova palavra-passe está guardada. Já podes aceder ao teu
                perfil de MC.
              </p>
            </div>
          ) : !sessaoValida ? (
            <div
              role="alert"
              className="mt-8 rounded-xl border border-red-800 bg-black p-5"
            >
              <h2 className="font-black text-red-300">
                LINK INVÁLIDO OU EXPIRADO
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {erro ||
                  "Este link já foi utilizado ou expirou. Contacta o suporte para receberes um novo email de acesso."}
              </p>
            </div>
          ) : (
            <form onSubmit={guardarNovaPassword} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="nova-password"
                  className="mb-2 block text-sm font-bold text-zinc-200"
                >
                  Nova palavra-passe
                </label>
                <input
                  id="nova-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(evento) => setPassword(evento.target.value)}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-500"
                  placeholder="Mínimo de 8 caracteres"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmar-password"
                  className="mb-2 block text-sm font-bold text-zinc-200"
                >
                  Confirmar palavra-passe
                </label>
                <input
                  id="confirmar-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmacao}
                  onChange={(evento) => setConfirmacao(evento.target.value)}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-500"
                  placeholder="Repete a nova palavra-passe"
                />
              </div>

              {erro && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm font-bold text-red-300"
                >
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={aGuardar}
                className="w-full rounded-lg bg-yellow-500 px-5 py-3 font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aGuardar ? "A GUARDAR..." : "GUARDAR NOVA PALAVRA-PASSE"}
              </button>
            </form>
          )}

          <footer className="mt-10 border-t border-yellow-500/40 pt-5 text-center text-xs font-bold tracking-[0.25em] text-zinc-400">
            MERITOCRACIA É LEI.
          </footer>
        </section>
      </div>
    </main>
  );
}