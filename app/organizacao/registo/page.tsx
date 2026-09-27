"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function RegistoOrganizacaoPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [erro, setErro] = useState("");
  const [emailPendente, setEmailPendente] = useState(false);
  const [loading, setLoading] = useState(false);

  async function registar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (!nome.trim()) {
      setErro("Escreve o nome da organização.");
      return;
    }

    if (password.length < 6) {
      setErro("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmarPassword) {
      setErro("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome_organizacao: nome.trim(),
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Não foi possível criar a conta.");
      }

      if (!data.session) {
        setEmailPendente(true);
        return;
      }

      router.replace("/organizacao");
    } catch (falha) {
      console.error("Erro ao registar organização:", falha);
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível criar a conta. Tenta novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen bg-black bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
    >
      <div
        className="absolute inset-0 bg-black/75"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </Link>

        <p className="mt-12 text-xs font-black tracking-[0.35em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-4 break-words text-4xl font-black leading-none sm:text-5xl">
          REGISTAR
          <br />
          <span className="text-yellow-500">ORGANIZAÇÃO</span>
        </h1>

        <p className="mt-4 text-zinc-300">
          Cria a conta oficial da tua organização.
        </p>

        {emailPendente ? (
          <div
            role="status"
            className="mt-10 rounded-xl border border-yellow-500/50 bg-black/85 p-6"
          >
            <h2 className="text-xl font-black text-yellow-500">
              CONFIRMA O TEU EMAIL
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Enviámos uma mensagem para {email.trim()}. Abre o link
              recebido para confirmar a conta e depois entra na área
              da organização.
            </p>

            <Link
              href="/organizacao/login"
              className="mt-6 inline-block font-black text-yellow-500 hover:text-yellow-400"
            >
              IR PARA O LOGIN →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={registar}
            className="mt-10 space-y-6 rounded-xl border border-zinc-700 bg-black/85 p-5 sm:p-7"
          >
            <div>
              <label
                htmlFor="nome-organizacao"
                className="mb-2 block text-sm font-bold"
              >
                NOME DA ORGANIZAÇÃO
              </label>

              <input
                id="nome-organizacao"
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                required
                placeholder="Ex.: Klandestina MS"
                autoComplete="organization"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="email-organizacao"
                className="mb-2 block text-sm font-bold"
              >
                EMAIL
              </label>

              <input
                id="email-organizacao"
                type="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                required
                placeholder="email@organizacao.pt"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="password-organizacao"
                className="mb-2 block text-sm font-bold"
              >
                PALAVRA-PASSE
              </label>

              <input
                id="password-organizacao"
                type="password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="confirmar-password-organizacao"
                className="mb-2 block text-sm font-bold"
              >
                CONFIRMAR PALAVRA-PASSE
              </label>

              <input
                id="confirmar-password-organizacao"
                type="password"
                value={confirmarPassword}
                onChange={(evento) =>
                  setConfirmarPassword(evento.target.value)
                }
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-white outline-none focus:border-yellow-500 disabled:opacity-50"
              />
            </div>

            {erro && (
              <p role="alert" className="text-sm font-bold text-red-400">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-500 px-5 py-4 font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "A REGISTAR..." : "CRIAR CONTA"}
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