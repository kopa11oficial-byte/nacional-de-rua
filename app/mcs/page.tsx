"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

type MC = {
  id: string;
  nome_artistico: string;
  cidade: string | null;
  distrito: string | null;
  por_confirmar: boolean;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

export default function MCsPage() {
  const [mcs, setMcs] = useState<MC[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarMCs() {
      try {
        const lista = await consultarTodas<MC>((inicio, fim) =>
          supabase
            .from("mcs")
            .select("id,nome_artistico,cidade,distrito,por_confirmar")
            .eq("ativo", true)
            .order("id")
            .range(inicio, fim),
        );

        if (ativo) {
          setMcs(
            lista.sort((a, b) =>
              a.nome_artistico.localeCompare(b.nome_artistico, "pt-PT"),
            ),
          );
        }
      } catch {
        if (ativo) setErro("Não foi possível carregar os MCs.");
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregarMCs();

    return () => {
      ativo = false;
    };
  }, []);

  const encontrados = useMemo(() => {
    const termo = normalizar(pesquisa);
    if (!termo) return mcs;

    return mcs.filter((mc) =>
      normalizar(
        [mc.nome_artistico, mc.cidade, mc.distrito]
          .filter(Boolean)
          .join(" "),
      ).includes(termo),
    );
  }, [mcs, pesquisa]);

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
          className="inline-block text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="mb-3 text-xs font-black tracking-[0.3em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] drop-shadow-[3px_4px_0_#000] sm:text-6xl md:text-7xl">
            <span className="text-white">PERFIL DOS </span>
            <span className="text-yellow-500">MCs</span>
          </h1>

          <p className="mt-5 text-sm text-zinc-200 sm:text-base">
            MCs registados no Ranking Nacional de Improviso.
          </p>
        </header>

        <label
          htmlFor="pesquisar-mc"
          className="mt-10 block text-sm font-black text-white"
        >
          PROCURAR MC
        </label>

        <input
          id="pesquisar-mc"
          type="search"
          value={pesquisa}
          onChange={(evento) => setPesquisa(evento.target.value)}
          placeholder="Nome, cidade ou distrito"
          className="mt-3 w-full rounded-md border border-zinc-600 bg-black/90 px-5 py-4 text-white outline-none placeholder:text-zinc-400 focus:border-yellow-500"
        />

        {!loading && !erro && (
          <p className="mt-3 text-sm text-zinc-200">
            {encontrados.length}{" "}
            {encontrados.length === 1
              ? "MC encontrado"
              : "MCs encontrados"}
          </p>
        )}

        <section
          className="mt-8 overflow-hidden rounded-md border border-zinc-700 bg-black/90"
          aria-label="Lista de MCs"
        >
          {loading ? (
            <p className="px-5 py-8 text-zinc-300">
              A carregar MCs...
            </p>
          ) : erro ? (
            <p className="px-5 py-8 font-bold text-red-300">
              {erro}
            </p>
          ) : encontrados.length === 0 ? (
            <p className="px-5 py-8 text-zinc-300">
              {pesquisa.trim()
                ? "Não foram encontrados MCs com esta pesquisa."
                : "Ainda não existem MCs registados."}
            </p>
          ) : (
            encontrados.map((mc, index) => (
              <Link
                key={mc.id}
                href={`/mcs/${mc.id}`}
                className={`flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-zinc-900/90 sm:px-6 ${
                  index > 0 ? "border-t border-zinc-800" : ""
                }`}
              >
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-black text-white sm:text-xl">
                    {mc.nome_artistico}
                    {mc.por_confirmar ? " (sem registo)" : ""}
                  </h2>

                  {(mc.cidade || mc.distrito) && (
                    <p className="mt-1 text-sm text-zinc-300">
                      {[mc.cidade, mc.distrito]
                        .filter(Boolean)
                        .join(" · ")}
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
            ))
          )}
        </section>

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}