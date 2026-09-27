"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ReporPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [aVerificar, setAVerificar] = useState(true);
  const [sessaoPronta, setSessaoPronta] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function prepararSessao() {
      try {
        const params = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          window.history.replaceState(
            {},
            document.title,
            "/organizacao/repor-password"
          );

          if (ativo) setSessaoPronta(true);
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (ativo) {
          if (session) {
            setSessaoPronta(true);
          } else {
            setErro(
              "Abre esta página através do link de recuperação recebido por email."
            );
          }
        }
      } catch (falha) {
        console.error("Erro ao preparar a recuperação:", falha);
        if (ativo) {
          setErro(
            "O link de recuperação não é válido ou expirou. Pede um novo link."
          );
        }
      } finally {
        if (ativo) setAVerificar(false);
      }
    }

    void prepararSessao();

    return () => {
      ativo = false;
    };
  }, []);

  async function alterarPassword(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (!sessaoPronta) {
      setErro("A sessão de recuperação ainda não está válida.");
      return;
    }

    if (password.length < 6) {
      setErro("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmar) {
      setErro("As palavras-passe não são iguais.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      await supabase.auth.signOut();
      router.replace("/organizacao/login");
    } catch (falha) {
      console.error("Erro ao alterar a palavra-passe:", falha);
      setErro("Não foi possível alterar a palavra-passe. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen bg-black bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
    >
      <div className="absolute inset-0 bg-black/75" aria-hidden="true" />

      <div className="relative mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/organizacao/login"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AO LOGIN
        </Link>

        <p className="mt-12 text-xs font-black tracking-[0.35em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-4 break-words text-4xl font-black leading-none sm:text-5xl">
          NOVA
          <br />
          <span className="text-yellow-500">PALAVRA-PASSE</span>
        </h1>

        <p className="mt-4 text-zinc-300">
          Define a nova palavra-passe da tua organização.
        </p>

        {aVerificar ? (
          <p className="mt-10 font-bold text-yellow-500">
            A VERIFICAR O LINK...
          </p>
        ) : (
          <form
            onSubmit={alterarPassword}
            className="mt-10 space-y-6 rounded-xl border border-zinc-700 bg-black/80 p-5 sm:p-7"
          >
            <div>
              <label
                htmlFor="nova-password"
                className="block text-sm font-bold"
              >
                NOVA PALAVRA-PASSE
              </label>

              <input
                id="nova-password"
                type="password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                disabled={!sessaoPronta || loading}
                autoComplete="new-password"
                minLength={6}
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500 disabled:opacity-40"
              />
            </div>

            <div>
              <label
                htmlFor="confirmar-password"
                className="block text-sm font-bold"
              >
                CONFIRMAR PALAVRA-PASSE
              </label>

              <input
                id="confirmar-password"
                type="password"
                value={confirmar}
                onChange={(evento) => setConfirmar(evento.target.value)}
                disabled={!sessaoPronta || loading}
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500 disabled:opacity-40"
              />
            </div>

            {erro && (
              <p role="alert" className="text-sm font-bold text-red-400">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !sessaoPronta}
              className="w-full rounded-xl bg-yellow-500 px-5 py-4 font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "A ALTERAR..." : "ALTERAR PALAVRA-PASSE"}
            </button>
          </form>
        )}

        <p className="mt-12 text-center text-xs tracking-[0.25em] text-zinc-400">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}