"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type RankingItem = {
  mc_id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
  pontos: number;
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarRanking() {
      setLoading(true);
      setErro("");

      const { data: pontuacoesData, error: pontuacoesError } =
        await supabase
          .from("pontuacoes")
          .select("mc_id,pontos");

      if (pontuacoesError) {
        setErro("Não foi possível carregar o ranking nacional.");
        setLoading(false);
        return;
      }

      const totais: Record<string, number> = {};

      for (const item of pontuacoesData ?? []) {
        totais[item.mc_id] =
          (totais[item.mc_id] ?? 0) + item.pontos;
      }

      const mcIds = Object.keys(totais);

      if (mcIds.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      const { data: mcsData, error: mcsError } = await supabase
        .from("mcs")
        .select("id,nome_artistico,cidade,distrito")
        .in("id", mcIds);

      if (mcsError) {
        setErro("Não foi possível carregar os MCs.");
        setLoading(false);
        return;
      }

      const rankingFinal: RankingItem[] = (mcsData ?? [])
        .map(
          (mc: {
            id: string;
            nome_artistico: string;
            cidade: string | null;
            distrito: string | null;
          }) => ({
            mc_id: mc.id,
            nome: mc.nome_artistico,
            cidade: mc.cidade,
            distrito: mc.distrito,
            pontos: totais[mc.id] ?? 0,
          })
        )
        .sort((a, b) => b.pontos - a.pontos);

      setRanking(rankingFinal);
      setLoading(false);
    }

    carregarRanking();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">

        <a
          href="/"
          className="text-sm font-black text-yellow-500"
        >
          ← VOLTAR
        </a>

        <div className="mt-12">
          <p className="text-sm font-bold tracking-[0.3em] text-zinc-400">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 text-5xl font-black md:text-7xl">
            <span className="text-white">RANKING </span>
            <span className="text-yellow-500">NACIONAL</span>
          </h1>

          <p className="mt-4 text-zinc-500">
            Classificação geral dos MCs participantes.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-zinc-800">

          <div className="grid grid-cols-[70px_1fr_140px_100px] bg-zinc-950 px-5 py-4 text-xs font-black text-zinc-500">
            <span>POS.</span>
            <span>MC</span>
            <span>LOCAL</span>
            <span className="text-right">PONTOS</span>
          </div>

          {loading && (
            <div className="px-5 py-6 text-yellow-500">
              A CARREGAR...
            </div>
          )}

          {erro && (
            <div className="px-5 py-6 font-bold text-red-500">
              {erro}
            </div>
          )}

          {!loading &&
            !erro &&
            ranking.map((mc, index) => (
              <div
                key={mc.mc_id}
                className="grid grid-cols-[70px_1fr_140px_100px] items-center border-t border-zinc-900 px-5 py-5"
              >
                <span className="font-black text-yellow-500">
                  {index + 1}º
                </span>

                <span className="font-bold">
                  {mc.nome}
                </span>

                <span className="text-sm text-zinc-400">
                  {[mc.cidade, mc.distrito]
                    .filter(Boolean)
                    .join(" • ")}
                </span>

                <span className="text-right font-black">
                  {mc.pontos}
                </span>
              </div>
            ))}

          {!loading && !erro && ranking.length === 0 && (
            <div className="px-5 py-8 text-zinc-500">
              Ainda não existem pontuações no ranking nacional.
            </div>
          )}

        </div>

        <p className="mt-10 text-center text-xs tracking-[0.25em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>

      </div>
    </main>
  );
}2