"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Roda = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
};

type RankingItem = {
  mc_id: string;
  nome: string;
  pontos: number;
};

export default function RankingRodaPage() {
  const params = useParams();
  const rodaId = params.id as string;

  const [roda, setRoda] = useState<Roda | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarRanking() {
      setLoading(true);
      setErro("");

      const { data: rodaData, error: rodaError } = await supabase
        .from("rodas")
        .select("id,nome,cidade,distrito")
        .eq("id", rodaId)
        .single();

      if (rodaError || !rodaData) {
        setErro("Roda não encontrada.");
        setLoading(false);
        return;
      }

      setRoda(rodaData);

      const { data: edicoesData, error: edicoesError } = await supabase
        .from("edicoes")
        .select("id")
        .eq("roda_id", rodaId);

      if (edicoesError) {
        setErro("Não foi possível carregar as edições desta roda.");
        setLoading(false);
        return;
      }

      const edicaoIds = (edicoesData ?? []).map(
        (edicao: { id: string }) => edicao.id
      );

      if (edicaoIds.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      const { data: pontuacoesData, error: pontuacoesError } = await supabase
        .from("pontuacoes")
        .select("mc_id,pontos")
        .in("edicao_id", edicaoIds);

      if (pontuacoesError) {
        setErro("Não foi possível carregar as pontuações desta roda.");
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
        .select("id,nome_artistico")
        .in("id", mcIds);

      if (mcsError) {
        setErro("Não foi possível carregar os MCs.");
        setLoading(false);
        return;
      }

      const rankingFinal: RankingItem[] = (mcsData ?? [])
        .map((mc: { id: string; nome_artistico: string }) => ({
          mc_id: mc.id,
          nome: mc.nome_artistico,
          pontos: totais[mc.id] ?? 0,
        }))
        .sort((a, b) => b.pontos - a.pontos);

      setRanking(rankingFinal);
      setLoading(false);
    }

    if (rodaId) {
      carregarRanking();
    }
  }, [rodaId]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <a
          href="/rodas"
          className="text-sm font-black text-yellow-500"
        >
          ← VOLTAR ÀS RODAS
        </a>

        <div className="mt-12">
          <p className="text-sm font-bold tracking-[0.3em] text-zinc-400">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 text-5xl font-black md:text-7xl">
            <span className="text-white">RANKING DA </span>
            <span className="text-yellow-500">RODA</span>
          </h1>

          {roda && (
            <>
              <h2 className="mt-8 text-3xl font-black text-yellow-500">
                {roda.nome}
              </h2>

              <p className="mt-2 text-zinc-400">
                {[roda.cidade, roda.distrito]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </>
          )}

          {loading && (
            <p className="mt-10 text-yellow-500">
              A CARREGAR...
            </p>
          )}

          {erro && (
            <p className="mt-10 font-bold text-red-500">
              {erro}
            </p>
          )}

          {!loading && !erro && (
            <div className="mt-10 overflow-hidden rounded-xl border border-zinc-800">
              <div className="grid grid-cols-[70px_1fr_100px] bg-zinc-950 px-5 py-4 text-xs font-black text-zinc-500">
                <span>POS.</span>
                <span>MC</span>
                <span className="text-right">PONTOS</span>
              </div>

              {ranking.map((mc, index) => (
                <div
                  key={mc.mc_id}
                  className="grid grid-cols-[70px_1fr_100px] border-t border-zinc-900 px-5 py-5"
                >
                  <span className="font-black text-yellow-500">
                    {index + 1}º
                  </span>

                  <span className="font-bold">
                    {mc.nome}
                  </span>

                  <span className="text-right font-black">
                    {mc.pontos}
                  </span>
                </div>
              ))}

              {ranking.length === 0 && (
                <div className="px-5 py-8 text-zinc-500">
                  Ainda não existem pontuações nesta roda.
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-xs tracking-[0.25em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}