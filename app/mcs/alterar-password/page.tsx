"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ResultadoAlteracao = {
  sucesso?: boolean;
  suporteAtivado?: boolean;
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
  const [conviteSuporte, setConviteSuporte] = useState(false);
  const [suporteAtivado, setSuporteAtivado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let componenteActivo = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento) => {
      if (!componenteActivo) return;

      // Não aceitar qualquer sessão como acesso MC: a validação
      // de titularidade é feita depois de processar o link.
      if (evento === "SIGNED_OUT") {
        setSessaoValida(false);
      }
    });

    async function prepararSessaoDeRecuperacao() {
      setAVerificarSessao(true);
      setErro("");

      const endereco = new URL(window.location.href);
      const codigo = endereco.searchParams.get("code");
      const tokenHash = endereco.searchParams.get("token_hash");
      const tipoLink = endereco.searchParams.get("type");
      const fragmento = new URLSearchParams(
        endereco.hash.startsWith("#")
          ? endereco.hash.slice(1)
          : endereco.hash,
      );
      const accessToken = fragmento.get("access_token");
      const refreshToken = fragmento.get("refresh_token");

      const linkRecuperacao =
        Boolean(codigo) ||
        Boolean(tokenHash && (tipoLink === "recovery" || tipoLink === "invite")) ||
        Boolean(accessToken && refreshToken);

      try {
        // O link recebido tem prioridade sobre uma sessão de
        // Suporte Regional ou de outra conta já aberta no navegador.
        if (codigo) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(codigo);
          if (error) throw error;
        } else if (tokenHash && (tipoLink === "recovery" || tipoLink === "invite")) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tipoLink === "invite" ? "invite" : "recovery",
          });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: sessao, error: erroSessao } =
          await supabase.auth.getSession();
        if (erroSessao || !sessao.session?.access_token) {
          throw new Error("O link não criou uma sessão válida.");
        }

        const { data: utilizador, error: erroUtilizador } =
          await supabase.auth.getUser();
        if (erroUtilizador || !utilizador.user) {
          throw new Error("Não foi possível validar o utilizador.");
        }

        // A mesma página valida links de MC e novos convites do Suporte.
        // O convite não concede poderes regionais: só permite escolher password.
        const eConviteSuporte =
          utilizador.user.app_metadata?.convite_suporte_pendente === true &&
          Boolean(utilizador.user.email_confirmed_at);

        if (!eConviteSuporte) {
          // Uma conta pode acumular perfil MC e suporte regional.
          const { data: perfisMC, error: erroPerfil } = await supabase
            .from("mcs")
            .select("id")
            .eq("auth_user_id", utilizador.user.id)
            .eq("ativo", true)
            .limit(1);

          if (erroPerfil) {
            throw new Error("Não foi possível verificar o acesso ao perfil.");
          }
          if (!perfisMC || perfisMC.length === 0) {
            throw new Error(
              "A sessão aberta não está associada ao teu perfil de MC nem a um convite de suporte válido.",
            );
          }
        }

        if (componenteActivo) {
          setConviteSuporte(eConviteSuporte);
          setSessaoValida(true);
          setAVerificarSessao(false);
          setErro("");
          if (linkRecuperacao) limparCredenciaisDoEndereco();
        }
      } catch (falha) {
        if (componenteActivo) {
          setSessaoValida(false);
          setAVerificarSessao(false);
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível validar este link. Pede um novo email de acesso.",
          );
          if (linkRecuperacao) limparCredenciaisDoEndereco();
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

      setSuporteAtivado(resultado.suporteAtivado === true);
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
    <main className="relative isolate min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/55"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-5 py-12 sm:px-6">
        <section className="relative z-10 w-full rounded-2xl border border-yellow-500/50 bg-black/90 p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            {conviteSuporte ? "CONVITE · EQUIPA IMIP" : "PERFIL DE MC"}
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {conviteSuporte ? (
              <>ATIVAR <span className="text-yellow-500">CONTA IMIP</span></>
            ) : (
              <>ALTERAR <span className="text-yellow-500">PALAVRA-PASSE</span></>
            )}
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
            {conviteSuporte
              ? "Confirma o convite e define a tua palavra-passe. A função de suporte da tua região será ativada automaticamente nesta etapa."
              : "Define uma palavra-passe para proteger o acesso ao teu perfil."}
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
                {conviteSuporte
                  ? (suporteAtivado
                       ? "A tua conta de suporte está ativa. Já podes entrar na Central de Suporte IMIP."
                       : "A palavra-passe foi guardada. Confirma o teu acesso com a equipa IMIP.")
                  : "A tua nova palavra-passe está guardada. Já podes aceder ao teu perfil de MC."}
              </p>
              {conviteSuporte && suporteAtivado && (
                <a
                  href="/organizacao/suporte"
                  className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-emerald-400 px-5 py-3 text-sm font-black text-black"
                >
                  ENTRAR NA CENTRAL DE SUPORTE
                </a>
              )}
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
            <form onSubmit={guardarNovaPassword} className="relative z-10 mt-8 space-y-5">
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
                  onTouchEnd={(evento) => evento.currentTarget.focus()}
                  className="relative z-10 block min-h-12 w-full touch-manipulation rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-base text-white outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/35"
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
                  onTouchEnd={(evento) => evento.currentTarget.focus()}
                  className="relative z-10 block min-h-12 w-full touch-manipulation rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-base text-white outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/35"
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
                className="relative z-10 min-h-12 w-full touch-manipulation rounded-lg bg-yellow-500 px-5 py-3 text-base font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
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