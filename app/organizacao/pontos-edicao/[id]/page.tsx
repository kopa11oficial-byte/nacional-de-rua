"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PontosMC = {
  id: string;
  nome: string;
  pontos: number;
  porConfirmar: boolean;
};

export default function PontosEdicaoPage() {
  const { id } = useParams<{ id: string }>();

  const [nomeEdicao, setNomeEdicao] = useState("");
  const [nomeRoda, setNomeRoda] = useState("");
  const [rodaId, setRodaId] = useState("");
  const [pontos, setPontos] = useState<PontosMC[]>([]);
  const [temPontuacoes, setTemPontuacoes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      if (!id) {
        setErro("Edição não encontrada.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErro("");

      try {
        const { data: edicao, error: erroEdicao } = await supabase
          .from("edicoes")
          .select("id,nome,roda_id")
          .eq("id", id)
          .single();

        if (!ativo) return;

        if (erroEdicao || !edicao) {
          throw new Error("Edição não encontrada.");
        }

        setNomeEdicao(edicao.nome);
        setRodaId(edicao.roda_id);

        const [rodaResposta, pontosResposta, batalhasResposta] =
          await Promise.all([
            supabase
              .from("rodas")
              .select("nome")
              .eq("id", edicao.roda_id)
              .single(),
            supabase
              .from("pontuacoes")
              .select("mc_id,pontos")
              .eq("edicao_id", id),
            supabase
              .from("batalhas")
              .select("id")
              .eq("edicao_id", id),
          ]);

        if (!ativo) return;

        if (
          rodaResposta.error ||
          pontosResposta.error ||
          batalhasResposta.error
        ) {
          throw new Error(
            "Não foi possível carregar os pontos desta edição.",
          );
        }

        setNomeRoda(rodaResposta.data?.nome ?? "Roda");

        const registos = pontosResposta.data ?? [];
        setTemPontuacoes(registos.length > 0);

        const idsBatalhas = (batalhasResposta.data ?? []).map(
          (batalha) => batalha.id,
        );

        let idsParticipantes: string[] = [];

        if (idsBatalhas.length > 0) {
          const { data: participacoes, error: erroParticipacoes } =
            await supabase
              .from("participacoes")
              .select("mc_id")
              .in("batalha_id", idsBatalhas);

          if (!ativo) return;

          if (erroParticipacoes) {
            throw new Error(
              "Não foi possível carregar os MCs desta edição.",
            );
          }

          idsParticipantes = (participacoes ?? []).map(
            (item) => item.mc_id,
          );
        }

        const ids = [
          ...new Set([
            ...idsParticipantes,
            ...registos.map((item) => item.mc_id),
          ]),
        ];

        if (ids.length === 0) {
          setPontos([]);
          return;
        }

        const { data: mcs, error: erroMcs } = await supabase
          .from("mcs")
          .select("id,nome_artistico,por_confirmar")
          .in("id", ids);

        if (!ativo) return;

        if (erroMcs) {
          throw new Error(
            "Não foi possível carregar os nomes dos MCs.",
          );
        }

        const totais = new Map<string, number>();

        for (const registo of registos) {
          totais.set(
            registo.mc_id,
            (totais.get(registo.mc_id) ?? 0) + registo.pontos,
          );
        }

        setPontos(
          (mcs ?? [])
            .map((mc) => ({
              id: mc.id,
              nome: mc.nome_artistico,
              pontos: totais.get(mc.id) ?? 0,
              porConfirmar: mc.por_confirmar === true,
            }))
            .sort(
              (a, b) =>
                b.pontos - a.pontos ||
                a.nome.localeCompare(b.nome, "pt-PT"),
            ),
        );
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Erro ao carregar a edição.",
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [id]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/40"
      />

      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/organizacao/gerir-edicao"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← GERIR EDIÇÕES
        </Link>

        <p className="mt-12 text-xs font-black tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-4xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl md:text-6xl">
          PONTOS DA <span className="text-yellow-500">EDIÇÃO</span>
        </h1>

        <p className="mt-3 break-words text-sm text-zinc-200 sm:text-base">
          {nomeEdicao}
          {nomeRoda ? ` · ${nomeRoda}` : ""}
        </p>

        {loading ? (
          <p className="mt-10 rounded-xl border border-zinc-700 bg-black/90 p-5 font-bold text-yellow-500">
            A CARREGAR...
          </p>
        ) : erro ? (
          <p
            role="alert"
            className="mt-10 rounded-xl border border-red-800 bg-black/90 p-5 text-red-300"
          >
            {erro}
          </p>
        ) : !temPontuacoes ? (
          <p className="mt-10 rounded-xl border border-zinc-700 bg-black/90 p-5 text-zinc-200">
            Esta edição ainda não tem pontuações confirmadas.
          </p>
        ) : (
          <>
            <p className="mt-10 font-bold text-yellow-500">
              {pontos.length} MCs · pontos desta edição
            </p>

            <div className="mt-4 divide-y divide-zinc-700 overflow-hidden rounded-2xl border border-zinc-700 bg-black/90">
              {pontos.map((mc, indice) => (
                <div
                  key={mc.id}
                  className="flex items-center justify-between gap-3 px-4 py-5 sm:gap-4 sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="w-8 shrink-0 font-black text-yellow-500">
                      {indice + 1}º
                    </span>

                    <span className="min-w-0 break-words font-bold">
                      {mc.nome}
                      {mc.porConfirmar ? " (sem registo)" : ""}
                    </span>
                  </div>

                  <span className="shrink-0 text-right font-black">
                    {mc.pontos}{" "}
                    <span className="hidden sm:inline">
                      {mc.pontos === 1 ? "ponto" : "pontos"}
                    </span>
                    <span className="sr-only sm:hidden">
                      {mc.pontos === 1 ? " ponto" : " pontos"}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href={`/rodas/${rodaId}`}
                className="rounded-xl bg-yellow-500 px-5 py-4 text-center text-sm font-black text-black transition hover:bg-yellow-400 sm:text-base"
              >
                VER RANKING DA RODA
              </Link>

              <Link
                href="/ranking"
                className="rounded-xl border border-yellow-500 bg-black/90 px-5 py-4 text-center text-sm font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black sm:text-base"
              >
                VER RANKING NACIONAL
              </Link>
            </div>
          </>
        )}

        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}