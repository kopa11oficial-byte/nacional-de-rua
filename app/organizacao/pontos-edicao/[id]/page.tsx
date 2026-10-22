
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { boldIMIP, veneerIMIP } from "../../../fonts/identidade";
import { supabase } from "@/lib/supabase";

type PontosMC = {
  id: string;
  nome: string;
  pontos: number;
  porConfirmar: boolean;
};

function FaixaPortugal() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[5px] w-full overflow-hidden"
    >
      <span className="w-[43%] bg-[#087a43]" />
      <span className="w-[14%] bg-[#d6b56d]" />
      <span className="flex-1 bg-[#b82535]" />
    </div>
  );
}

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
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        <nav
          aria-label="Navegação da página"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/organizacao/gerir-edicao"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← GERIR EDIÇÕES
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · CLASSIFICAÇÃO DA EDIÇÃO
          </span>
        </nav>

        <header className="mt-5 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95 sm:mt-7">
          <FaixaPortugal />

          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">
                <p className="imip-etiqueta">
                  ORGANIZAÇÃO · RESULTADOS · PONTUAÇÃO
                </p>

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(2.6rem,4.5vw,5.1rem)] text-[#f0e6d1]">
                    PONTOS DA
                  </span>
                  <span className="mt-2 block text-[clamp(2.9rem,5vw,5.6rem)] text-[#d6b56d]">
                    EDIÇÃO<span className="text-[#b82535]">.</span>
                  </span>
                </h1>

                <div className="mt-7 w-44 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 text-lg font-bold leading-relaxed text-[#f0e6d1]">
                  Cada batalha deixa a sua marca na classificação.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Consulta os pontos obtidos pelos MCs nesta edição.
                  Os valores apresentados são os registos existentes
                  no sistema, sem alterações aos cálculos.
                </p>
              </div>

              <div className="relative mt-10 border-l-4 border-[#d6b56d] bg-black/25 px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#d6b56d]">
                  EDIÇÃO SELECIONADA
                </p>

                <p
                  className={`${boldIMIP.className} mt-3 break-words text-[clamp(1.6rem,2.5vw,2.7rem)] font-bold uppercase leading-tight text-[#f0e6d1]`}
                >
                  {nomeEdicao || (loading ? "A CARREGAR..." : "EDIÇÃO")}
                </p>

                {nomeRoda && (
                  <p className="mt-3 break-words text-xs font-black uppercase tracking-[0.07em] text-[#f0d58e]">
                    RODA · {nomeRoda}
                  </p>
                )}
              </div>
            </div>

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div className="relative z-10 min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  CLASSIFICAÇÃO · IMIP
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <h2
                  className={`${boldIMIP.className} mt-7 text-[clamp(2rem,2.8vw,3.1rem)] font-bold uppercase leading-[1.1]`}
                >
                  O MÉRITO
                  <span className="block text-[#b82535]">
                    EM NÚMEROS.
                  </span>
                </h2>

                <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#394239]">
                  Pontos individuais apurados a partir dos registos
                  desta edição, ordenados do maior para o menor.
                </p>

                <div className="mt-8 border-l-4 border-[#087a43] bg-[#f8f2e5] px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a82636]">
                    MCs IDENTIFICADOS
                  </p>

                  <p
                    className={`${boldIMIP.className} mt-2 text-6xl font-bold leading-none text-[#101713]`}
                  >
                    {loading || erro ? "—" : pontos.length}
                  </p>

                  <p className="mt-3 text-xs font-bold leading-relaxed text-[#394239]">
                    {loading
                      ? "A consultar a edição..."
                      : erro
                        ? "Consulta indisponível."
                        : temPontuacoes
                          ? "Existem pontuações registadas para esta edição."
                          : "Ainda não existem pontuações confirmadas."}
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-10 border-t-4 border-[#101713] pt-4">
                <p className="text-xs font-black uppercase leading-relaxed tracking-[0.08em]">
                  CADA PONTO TEM ORIGEM.
                  <span className="block">CADA MC TEM O SEU PERCURSO.</span>
                </p>

                <p
                  className={`${veneerIMIP.className} mt-3 text-xl font-normal uppercase text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10" aria-labelledby="titulo-pontuacoes">
          <p className="imip-etiqueta">RESULTADOS DA EDIÇÃO</p>

          <h2
            id="titulo-pontuacoes"
            className={`${boldIMIP.className} mt-3 text-[clamp(1.9rem,3.5vw,3.8rem)] font-bold uppercase leading-[1.1]`}
          >
            PONTUAÇÃO <span className="text-[#d6b56d]">DOS MCs.</span>
          </h2>

          {loading ? (
            <div role="status" className="mt-7 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
              <FaixaPortugal />
              <p className="p-6 text-sm font-bold uppercase text-[#f0d58e] sm:p-8">
                A CARREGAR OS PONTOS DA EDIÇÃO...
              </p>
            </div>
          ) : erro ? (
            <div role="alert" className="mt-7 border-l-4 border-[#b82535] bg-[#0a110d]/95 px-5 py-6 text-sm font-bold text-red-200 sm:px-8">
              {erro}
            </div>
          ) : !temPontuacoes ? (
            <div className="mt-7 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
              <FaixaPortugal />
              <p className="p-6 text-sm leading-relaxed text-[#d2d9d0] sm:p-8">
                Esta edição ainda não tem pontuações confirmadas.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm font-bold text-[#d2d9d0]">
                {pontos.length} MCs · pontos desta edição
              </p>

              <div className="mt-6 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
                <FaixaPortugal />

                <div className="flex items-center justify-between gap-3 border-b border-[#d6b56d]/25 bg-[#101713] px-4 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d] sm:px-6">
                  <span>POSIÇÃO · MC</span>
                  <span>PONTOS</span>
                </div>

                {pontos.map((mc, indice) => (
                  <div
                    key={mc.id}
                    className="flex min-w-0 items-center justify-between gap-3 border-b border-[#d6b56d]/20 px-4 py-4 last:border-b-0 sm:gap-5 sm:px-6 sm:py-5"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                      <span
                        className={`${boldIMIP.className} w-10 shrink-0 text-xl font-bold text-[#d6b56d] sm:w-14 sm:text-2xl`}
                      >
                        {indice + 1}º
                      </span>

                      <div className="min-w-0">
                        <p className="break-words text-sm font-black uppercase leading-relaxed text-[#f0e6d1] sm:text-lg">
                          {mc.nome}
                        </p>

                        {mc.porConfirmar && (
                          <p className="mt-1 text-xs font-bold text-[#f0d58e]">
                            SEM REGISTO
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`${boldIMIP.className} text-2xl font-bold tabular-nums text-[#d6b56d] sm:text-3xl`}
                      >
                        {mc.pontos}
                      </span>
                      <span className="ml-2 text-[10px] font-black uppercase tracking-[0.05em] text-[#d2d9d0] sm:text-xs">
                        {mc.pontos === 1 ? "PONTO" : "PONTOS"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Link
                  href={`/rodas/${rodaId}`}
                  className="flex min-h-12 items-center justify-center bg-[#d6b56d] px-5 py-4 text-center text-xs font-black uppercase tracking-[0.05em] text-[#101713] transition hover:bg-[#f0d58e]"
                >
                  VER RANKING DA RODA ↗
                </Link>

                <Link
                  href="/ranking"
                  className="flex min-h-12 items-center justify-center border border-[#d6b56d] bg-[#0a110d]/95 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#14251a]"
                >
                  VER RANKING NACIONAL ↗
                </Link>
              </div>
            </>
          )}
        </section>

        <footer className="mt-14 border-t border-[#d6b56d]/35 pt-8 text-center">
          <p
            className={`${veneerIMIP.className} text-xl font-normal uppercase text-[#d6b56d] sm:text-2xl`}
          >
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ded8ca]">
            NACIONAL DE RUA · IMIP · IMPROVISO MADE IN PORTUGAL
          </p>
        </footer>
      </div>
    </main>
  );
}
