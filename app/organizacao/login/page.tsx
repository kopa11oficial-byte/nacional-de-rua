"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function LoginOrganizacaoPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [aVerificar, setAVerificar] = useState(true);

  useEffect(() => {
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
      } finally {
        setAVerificar(false);
      }
    }

    void verificarSessao();
  }, [router]);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErro("Email ou palavra-passe incorretos.");
      setLoading(false);
      return;
    }

    router.replace("/organizacao");
  }

  async function recuperarPassword() {
    setErro("");

    if (!email.trim()) {
      setErro("Escreve primeiro o email da organização.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/organizacao/repor-password`,
      },
    );

    if (error) {
      console.error("Erro na recuperação:", error);
      setErro(error.message);
      return;
    }

    alert("Email de recuperação enviado. Verifica a tua caixa de entrada.");
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
        className="pointer-events-none fixed inset-0 bg-black/25"
      />

      {aVerificar ? (
        <div className="relative flex min-h-screen items-center justify-center px-5">
          <p className="font-bold tracking-[0.2em] text-yellow-500">
            A VERIFICAR ACESSO...
          </p>
        </div>
      ) : (
        <div className="relative mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
          <Link
            href="/"
            className="text-sm font-black text-yellow-500 hover:text-yellow-400"
          >
            ← VOLTAR
          </Link>

          <header className="mt-12">
            <div className="mb-5 h-1 w-16 bg-yellow-500" />

            <p className="mb-3 text-xs font-black tracking-[0.3em] text-yellow-500">
              NACIONAL DE RUA
            </p>

            <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] drop-shadow-[3px_4px_0_#000] sm:text-6xl">
              <span className="block text-white">ÁREA DA</span>
              <span className="block break-words text-yellow-500">
                ORGANIZAÇÃO
              </span>
            </h1>

            <p className="mt-5 text-sm text-zinc-200 sm:text-base">
              Entra com os dados da tua organização.
            </p>
          </header>

          <form
            onSubmit={entrar}
            className="mt-10 space-y-6 rounded-md border border-zinc-700 bg-black/90 p-5 sm:p-6"
          >
            <div>
              <label
                htmlFor="email-organizacao"
                className="mb-2 block text-sm font-black"
              >
                EMAIL
              </label>

              <input
                id="email-organizacao"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@organizacao.pt"
                className="w-full rounded-md border border-zinc-600 bg-zinc-950 px-5 py-4 text-white outline-none placeholder:text-zinc-400 focus:border-yellow-500"
              />
            </div>

            <div>
              <label
                htmlFor="password-organizacao"
                className="mb-2 block text-sm font-black"
              >
                PALAVRA-PASSE
              </label>

              <input
                id="password-organizacao"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-zinc-600 bg-zinc-950 px-5 py-4 text-white outline-none placeholder:text-zinc-400 focus:border-yellow-500"
              />
            </div>

            {erro && (
              <p role="alert" className="text-sm font-bold text-red-300">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md border border-yellow-400 bg-yellow-500 px-6 py-4 font-black text-black transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {loading ? "A ENTRAR..." : "ENTRAR"}
            </button>
          </form>

          <button
            type="button"
            onClick={recuperarPassword}
            className="mt-5 w-full text-center text-sm font-bold text-yellow-500 hover:text-yellow-400"
          >
            ESQUECI-ME DA PALAVRA-PASSE
          </button>

          <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
            MERITOCRACIA É LEI.
          </footer>
        </div>
      )}
    </main>
  );
}