"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { consultarTodas } from "@/lib/consultar-todas";

type Edicao = {
  id: string;
  nome: string;
  roda_id: string;
  data_edicao: string;
  numero_temporada: number | null;
  numero_edicao: number | null;
};

type Batalha = {
  id: string;
  fase: string;
  numero: number;
  pontos_lado_a: number;
  pontos_lado_b: number;
  vitoria_2_0: boolean;
};

type Participacao = {
  batalha_id: string;
  mc_id: string;
  lado: string;
};

type Pontuacao = {
  mc_id: string;
  pontos: number;
};

type Mc = {
  id: string;
  nome_artistico: string;
  por_confirmar: boolean;
};

type Linha = {
  mcId: string;
  pontos: number;
  vitorias20: number;
};

export default function ResultadosEdicaoPage() {
  const { id: rodaId, edicaoId } = useParams<{
    id: string;
    edicaoId: string;
  }>();

  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [nomeRoda, setNomeRoda] = useState("");
  const [batalhas, setBatalhas] = useState<Batalha[]>([]);
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [pontuacoes, setPontuacoes] = useState<Pontuacao[]>([]);
  const [mcs, setMcs] = useState<Map<string, Mc>>(new Map());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!rodaId || !edicaoId) return;

    async function carregar() {
      setLoading(true);
      setErro("");

      try {
        const { data: dadosEdicao, error: erroEdicao } = await supabase
          .from("edicoes")
          .select(
            "id,nome,roda_id,data_edicao,numero_temporada,numero_edicao",
          )
          .eq("id", edicaoId)
          .eq("roda_id", rodaId)
          .single();

        if (erroEdicao || !dadosEdicao) {
          throw new Error("Edição não encontrada nesta roda.");
        }

        setEdicao(dadosEdicao as Edicao);

        const [{ data: roda, error: erroRoda }, pontos, lutas] =
          await Promise.all([
            supabase
              .from("rodas")
              .select("nome")
              .eq("id", rodaId)
              .single(),

            consultarTodas<Pontuacao>((inicio, fim) =>
              supabase
                .from("pontuacoes")
                .select("id,mc_id,pontos")
                .eq("edicao_id", edicaoId)
                .order("id")
                .range(inicio, fim),
            ),

            consultarTodas<Batalha>((inicio, fim) =>
              supabase
                .from("batalhas")
                .select(
                  "id,fase,numero,pontos_lado_a,pontos_lado_b,vitoria_2_0",
                )
                .eq("edicao_id", edicaoId)
                .order("numero")
                .range(inicio, fim),
            ),
          ]);

        if (erroRoda) {
          throw new Error("Não foi possível carregar a roda.");
        }

        if (pontos.length === 0) {
          throw new Error(
            "Os resultados desta edição ainda não foram confirmados.",
          );
        }

        setNomeRoda(roda?.nome ?? "Roda");
        setPontuacoes(pontos);
        setBatalhas(lutas);

        const idsBatalhas = lutas.map((batalha) => batalha.id);

        const presencas =
          idsBatalhas.length > 0
            ? await consultarTodas<Participacao>((inicio, fim) =>
                supabase
                  .from("participacoes")
                  .select("batalha_id,mc_id,lado")
                  .in("batalha_id", idsBatalhas)
                  .order("batalha_id")
                  .order("mc_id")
                  .range(inicio, fim),
              )
            : [];

        setParticipacoes(presencas);

        const idsMcs = [
          ...new Set([
            ...presencas.map((item) => item.mc_id),
            ...pontos.map((item) => item.mc_id),
          ]),
        ];

        if (idsMcs.length > 0) {
          const { data: nomes, error: erroMcs } = await supabase
            .from("mcs")
            .select("id,nome_artistico,por_confirmar")
            .in("id", idsMcs);

          if (erroMcs) {
            throw new Error("Não foi possível carregar os MCs da edição.");
          }

          setMcs(
            new Map(((nomes ?? []) as Mc[]).map((mc) => [mc.id, mc])),
          );
        }
      } catch (falha) {
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar esta edição.",
        );
      } finally {
        setLoading(false);
      }
    }

    void carregar();
  }, [rodaId, edicaoId]);

  const totais = new Map<string, number>();
  const vitorias20 = new Map<string, number>();

  for (const item of pontuacoes) {
    totais.set(
      item.mc_id,
      (totais.get(item.mc_id) ?? 0) + item.pontos,
    );
  }

  for (const item of participacoes) {
    if (!totais.has(item.mc_id)) {
      totais.set(item.mc_id, 0);
    }
  }

  for (const batalha of batalhas) {
    const ladoVencedor =
      batalha.pontos_lado_a === 2 && batalha.pontos_lado_b === 0
        ? "A"
        : batalha.pontos_lado_b === 2 && batalha.pontos_lado_a === 0
          ? "B"
          : null;

    if (!batalha.vitoria_2_0 || !ladoVencedor) {
      continue;
    }

    for (const item of participacoes) {
      if (
        item.batalha_id === batalha.id &&
        item.lado === ladoVencedor
      ) {
        vitorias20.set(
          item.mc_id,
          (vitorias20.get(item.mc_id) ?? 0) + 1,
        );
      }
    }
  }

  const classificacao: Linha[] = [...totais.entries()]
    .map(([mcId, pontos]) => ({
      mcId,
      pontos,
      vitorias20: vitorias20.get(mcId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.vitorias20 - a.vitorias20 ||
        (mcs.get(a.mcId)?.nome_artistico ?? "").localeCompare(
          mcs.get(b.mcId)?.nome_artistico ?? "",
          "pt",
        ),
    );

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

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-14">
        <Link
          href={`/rodas/${rodaId}`}
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR À RODA
        </Link>

        <header className="mt-10">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 break-words text-4xl font-black leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[3px_4px_0_#000] sm:text-5xl md:text-6xl">
            {edicao?.nome ?? "RESULTADOS DA EDIÇÃO"}
          </h1>

          {edicao && (
            <p className="mt-4 text-sm text-zinc-200">
              {nomeRoda}
              {" · "}
              {new Date(
                `${edicao.data_edicao}T12:00:00`,
              ).toLocaleDateString("pt-PT")}

              {edicao.numero_temporada != null
                ? ` · ${edicao.numero_temporada}.ª temporada`
                : ""}

              {edicao.numero_edicao != null
                ? ` · ${edicao.numero_edicao}.ª edição`
                : ""}
            </p>
          )}
        </header>

        {loading ? (
          <p className="mt-10 font-bold text-yellow-500">
            A CARREGAR...
          </p>
        ) : erro ? (
          <p className="mt-10 rounded-md border border-red-800 bg-black/85 p-5 text-red-300">
            {erro}
          </p>
        ) : (
          <>
            <section className="mt-12">
              <h2 className="text-2xl font-black drop-shadow-[2px_2px_0_#000]">
                PONTOS DESTA EDIÇÃO
              </h2>

              <div className="mt-4 overflow-hidden rounded-md border border-zinc-700 bg-black/90">
                <div className="grid grid-cols-[38px_minmax(0,1fr)_44px_36px] gap-1 bg-zinc-950 px-2 py-4 text-[10px] font-black text-zinc-300 sm:grid-cols-[55px_minmax(0,1fr)_100px_65px] sm:gap-2 sm:px-4 sm:text-xs">
                  <span>POS.</span>
                  <span>MC</span>
                  <span className="text-right sm:hidden">PTS</span>
                  <span className="hidden text-right sm:block">
                    PONTOS
                  </span>
                  <span className="text-right">2–0</span>
                </div>

                {classificacao.map((linha, indice) => (
                  <div
                    key={linha.mcId}
                    className="grid grid-cols-[38px_minmax(0,1fr)_44px_36px] items-center gap-1 border-t border-zinc-800 px-2 py-4 text-xs sm:grid-cols-[55px_minmax(0,1fr)_100px_65px] sm:gap-2 sm:px-4 sm:text-sm"
                  >
                    <span className="font-black text-yellow-500">
                      {indice + 1}º
                    </span>

                    <Link
                      href={`/mcs/${linha.mcId}`}
                      className="min-w-0 break-words font-bold text-white hover:text-yellow-500"
                    >
                      {mcs.get(linha.mcId)?.nome_artistico ?? "MC"}
                      {mcs.get(linha.mcId)?.por_confirmar
                        ? " (sem registo)"
                        : ""}
                    </Link>

                    <span className="text-right font-black">
                      {linha.pontos}
                    </span>

                    <span className="text-right font-black">
                      {linha.vitorias20}
                    </span>
                  </div>
                ))}

                {classificacao.length === 0 && (
                  <p className="border-t border-zinc-800 px-4 py-8 text-sm text-zinc-300">
                    Ainda não existem pontuações nesta edição.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-14">
              <h2 className="text-2xl font-black drop-shadow-[2px_2px_0_#000]">
                BATALHAS
              </h2>

              {batalhas.length === 0 ? (
                <p className="mt-4 rounded-md border border-zinc-700 bg-black/85 p-5 text-zinc-300">
                  Sem batalhas registadas.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {batalhas.map((batalha) => {
                    const nomesLado = (lado: string) =>
                      participacoes
                        .filter(
                          (item) =>
                            item.batalha_id === batalha.id &&
                            item.lado === lado,
                        )
                        .map(
                          (item) =>
                            mcs.get(item.mc_id)?.nome_artistico ?? "MC",
                        )
                        .join(" e ");

                    return (
                      <div
                        key={batalha.id}
                        className="rounded-md border border-zinc-700 bg-black/90 p-5"
                      >
                        <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                          {batalha.fase} · BATALHA {batalha.numero}
                        </p>

                        <p className="mt-3 break-words font-bold text-white">
                          {nomesLado("A") || "Lado A"}{" "}
                          {batalha.pontos_lado_a} –{" "}
                          {batalha.pontos_lado_b}{" "}
                          {nomesLado("B") || "Lado B"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-black tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}