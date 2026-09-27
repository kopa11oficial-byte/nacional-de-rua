"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Roda = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
};

export default function RodasPage() {
  const [rodas, setRodas] = useState<Roda[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarRodas() {
      const { data, error } = await supabase
        .from("rodas")
        .select("id,nome,cidade,distrito")
        .eq("ativa", true)
        .order("nome");

      if (error) {
        console.error(error);
        setErro("Não foi possível carregar as rodas.");
      } else {
        setRodas(data ?? []);
      }

      setLoading(false);
    }

    void carregarRodas();
  }, []);

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

      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] drop-shadow-[3px_4px_0_#000] sm:text-6xl md:text-7xl">
            <span className="block text-white">RANKING DAS</span>
            <span className="block text-yellow-500">RODAS</span>
          </h1>

          <p className="mt-5 text-xs font-bold tracking-[0.3em] text-zinc-300 sm:text-sm">
            NACIONAL DE RUA
          </p>

          <p className="mt-5 text-sm text-zinc-300 sm:text-base">
            Escolhe uma roda para consultar a sua classificação.
          </p>
        </header>

        <section className="mt-12 grid gap-4" aria-label="Rodas disponíveis">
          {loading && (
            <p className="font-bold text-yellow-500">A CARREGAR...</p>
          )}

          {erro && (
            <p className="rounded-xl border border-red-700 bg-black/85 p-5 font-bold text-red-300">
              {erro}
            </p>
          )}

          {!loading && !erro && rodas.length === 0 && (
            <p className="rounded-xl border border-zinc-700 bg-black/85 p-5 text-zinc-300">
              Ainda não existem rodas disponíveis.
            </p>
          )}

          {!loading &&
            !erro &&
            rodas.map((roda) => (
              <Link
                key={roda.id}
                href={`/rodas/${roda.id}`}
                className="group flex min-h-20 items-center justify-between gap-4 rounded-md border border-zinc-600 bg-black/85 px-5 py-5 shadow-[4px_4px_0_#111] transition hover:-translate-y-0.5 hover:border-yellow-500 sm:px-6"
              >
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-black text-yellow-500 sm:text-xl">
                    {roda.nome}
                  </h2>

                  {(roda.cidade || roda.distrito) && (
                    <p className="mt-1 text-sm text-zinc-300">
                      {[roda.cidade, roda.distrito]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>

                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl font-black text-yellow-500"
                >
                  ↗
                </span>
              </Link>
            ))}
        </section>

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}