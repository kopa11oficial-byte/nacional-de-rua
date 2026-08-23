"use client";

import { useEffect, useState } from "react";
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
        setLoading(false);
        return;
      }

      setRodas(data ?? []);
      setLoading(false);
    }

    carregarRodas();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">

        <a
          href="/"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </a>

        <div className="mt-12">
          <h1 className="text-5xl font-black leading-none md:text-7xl">
            <span className="text-white">RANKING DAS </span>
            <span className="text-yellow-500">RODAS</span>
          </h1>

          <p className="mt-4 text-sm font-bold tracking-[0.3em] text-zinc-400">
            NACIONAL DE RUA
          </p>

          <p className="mt-5 text-zinc-500">
            Escolhe uma roda para consultar a sua classificação.
          </p>
        </div>

        <div className="mt-12 grid gap-4">

          {loading && (
            <p className="font-bold text-yellow-500">
              A CARREGAR...
            </p>
          )}

          {erro && (
            <p className="font-bold text-red-500">
              {erro}
            </p>
          )}

          {!loading &&
            !erro &&
            rodas.map((roda) => (
              <a
                key={roda.id}
                href={`/rodas/${roda.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-6 py-5 transition hover:border-yellow-500"
              >
                <p className="text-xl font-black text-yellow-500">
                  {roda.nome}
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  {[roda.cidade, roda.distrito]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </a>
            ))}

        </div>

        <p className="mt-12 text-center text-xs tracking-[0.25em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>

      </div>
    </main>
  );
}