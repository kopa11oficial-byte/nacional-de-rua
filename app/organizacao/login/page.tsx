"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function LoginOrganizacaoPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErro("Email ou palavra-passe incorretos.");
      return;
    }

    router.push("/organizacao");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">

        <a
          href="/"
          className="mb-10 text-sm font-bold text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </a>

        <p className="text-sm font-bold tracking-[0.35em] text-zinc-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-5xl font-black tracking-tight">
          ÁREA DA
          <span className="block text-yellow-500">ORGANIZAÇÃO</span>
        </h1>

        <p className="mt-4 text-zinc-400">
          Entra com os dados da tua organização.
        </p>

        <form onSubmit={entrar} className="mt-10 flex flex-col gap-5">

          <div>
            <label className="mb-2 block text-sm font-bold">
              EMAIL
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500"
              placeholder="email@organizacao.pt"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              PALAVRA-PASSE
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="text-sm font-bold text-red-500">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-yellow-500 px-6 py-4 font-black text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {loading ? "A ENTRAR..." : "ENTRAR"}
          </button>

        </form>

        <p className="mt-10 text-center text-xs tracking-[0.2em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>

      </div>
    </main>
  );
}
