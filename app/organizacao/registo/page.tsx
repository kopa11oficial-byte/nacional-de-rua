"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function RegistoOrganizacaoPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function registar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    if (password !== confirmarPassword) {
      setErro("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      nome_organizacao: nome.trim(),
    },
  },
});

    if (error) {
      setErro(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErro("Não foi possível criar a conta.");
      setLoading(false);
      return;
    }

    

    router.replace("/organizacao");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-xl px-6 py-16">

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-12 text-sm font-bold text-yellow-500"
        >
          ← VOLTAR
        </button>

        <p className="mb-3 text-sm tracking-[0.35em] text-zinc-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mb-3 text-5xl font-black leading-[0.95]">
          REGISTAR
          <br />
          <span className="text-yellow-500">ORGANIZAÇÃO</span>
        </h1>

        <p className="mb-10 text-zinc-400">
          Cria a conta oficial da tua organização.
        </p>

        <form onSubmit={registar} className="space-y-6">

          <div>
            <label className="mb-2 block text-sm font-bold">
              NOME DA ORGANIZAÇÃO
            </label>

            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex: Klandestina MS"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              EMAIL
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@organizacao.pt"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500"
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
              minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              CONFIRMAR PALAVRA-PASSE
            </label>

            <input
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500"
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
            className="w-full rounded-xl bg-yellow-500 px-6 py-4 font-black text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {loading ? "A REGISTAR..." : "CRIAR CONTA"}
          </button>

        </form>

        <p className="mt-10 text-center text-xs tracking-[0.2em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>

      </div>
    </main>
  );
}