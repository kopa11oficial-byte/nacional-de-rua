"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { consultarTodas } from "@/lib/consultar-todas";

type Roda = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
};

type Epoca = {
  id: string;
  ano: number;
  nome: string | null;
  estado: string;
};

type Edicao = {
  id: string;
  epoca_id: string;
  nome: string;
  data_edicao: string;
  numero_temporada: number | null;
  numero_edicao: number | null;
};

type Pontuacao = {
  mc_id: string;
  pontos: number;
  motivo: string | null;
  edicao_id: string;
  batalha_id: string | null;
};

type Batalha = {
  id: string;
  edicao_id: string;
  vitoria_2_0: boolean;
};

type Participacao = {
  batalha_id: string;
  mc_id: string;
  lado: string;
  venceu: boolean;
};

type Mc = {
  id: string;
  nome_artistico: string;
  por_confirmar: boolean;
};

type LinhaRanking = {
  id: string;
  nome: string;
  pontos: number;
  vitorias20: number;
  participacoes: number;
};

function semanaDoAno(data: string): number {
  const atual = new Date(`${data}T12:00:00`);
  const dia = atual.getUTCDay() || 7;
  atual.setUTCDate(atual.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(atual.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((atual.getTime() - inicio.getTime()) / 86400000 + 1) / 7,
  );
}

function confronto(vencedor: string, derrotado: string): string {
  return `${vencedor}::${derrotado}`;
}

export default function RankingRodaPage() {
  const params = useParams();
  const rodaId = params.id as string;

  const [roda, setRoda] = useState<Roda | null>(null);
  const [epocas, setEpocas] = useState<Epoca[]>([]);
  const [epocaId, setEpocaId] = useState("");
  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [confirmadas, setConfirmadas] = useState<Set<string>>(new Set());
  const [temporada, setTemporada] = useState<number | null>(null);
  const [ranking, setRanking] = useState<LinhaRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!rodaId) return;

    async function carregarRoda() {
      setLoading(true);
      setErro("");

      try {
        const { data: rodaData, error: rodaError } = await supabase
          .from("rodas")
          .select("id,nome,cidade,distrito")
          .eq("id", rodaId)
          .single();

        if (rodaError || !rodaData) {
          throw new Error("Roda não encontrada.");
        }

        setRoda(rodaData as Roda);

        const todasEdicoes = await consultarTodas<Edicao>((inicio, fim) =>
          supabase
            .from("edicoes")
            .select(
              "id,epoca_id,nome,data_edicao,numero_temporada,numero_edicao",
            )
            .eq("roda_id", rodaId)
            .order("data_edicao", { ascending: false })
            .order("id")
            .range(inicio, fim),
        );

        const idsEpocas = [
          ...new Set(todasEdicoes.map((item) => item.epoca_id)),
        ];

        if (idsEpocas.length === 0) {
          setEpocas([]);
          setEpocaId("");
          setEdicoes([]);
          setRanking([]);
          return;
        }

        const { data: epocasData, error: epocasError } = await supabase
          .from("epocas")
          .select("id,ano,nome,estado")
          .in("id", idsEpocas)
          .order("ano", { ascending: false });

        if (epocasError) {
          throw new Error("Não foi possível carregar as épocas.");
        }

        const lista = (epocasData ?? []) as Epoca[];
        setEpocas(lista);
        setEpocaId(
          (lista.find((item) => item.estado === "ativa") ?? lista[0])?.id ?? "",
        );
      } catch (falha) {
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar a roda.",
        );
      } finally {
        setLoading(false);
      }
    }

    void carregarRoda();
  }, [rodaId]);

  useEffect(() => {
    if (!rodaId || !epocaId) return;

    async function carregarEpoca() {
      setLoading(true);
      setErro("");
      setRanking([]);

      try {
        const listaEdicoes = await consultarTodas<Edicao>((inicio, fim) =>
          supabase
            .from("edicoes")
            .select(
              "id,epoca_id,nome,data_edicao,numero_temporada,numero_edicao",
            )
            .eq("roda_id", rodaId)
            .eq("epoca_id", epocaId)
            .order("data_edicao", { ascending: false })
            .order("id")
            .range(inicio, fim),
        );

        setEdicoes(listaEdicoes);
        setTemporada(
          listaEdicoes.find((item) => item.numero_temporada != null)
            ?.numero_temporada ?? null,
        );

        const idsEdicoes = listaEdicoes.map((item) => item.id);

        if (idsEdicoes.length === 0) {
          setConfirmadas(new Set());
          return;
        }

        const [pontuacoes, batalhas] = await Promise.all([
          consultarTodas<Pontuacao>((inicio, fim) =>
            supabase
              .from("pontuacoes")
              .select("id,mc_id,pontos,motivo,edicao_id,batalha_id")
              .eq("epoca_id", epocaId)
              .in("edicao_id", idsEdicoes)
              .order("id")
              .range(inicio, fim),
          ),
          consultarTodas<Batalha>((inicio, fim) =>
            supabase
              .from("batalhas")
              .select("id,edicao_id,vitoria_2_0")
              .in("edicao_id", idsEdicoes)
              .order("id")
              .range(inicio, fim),
          ),
        ]);

        const idsConfirmadas = new Set(
          pontuacoes.map((item) => item.edicao_id),
        );
        setConfirmadas(idsConfirmadas);

        const batalhasValidas = batalhas.filter((item) =>
          idsConfirmadas.has(item.edicao_id),
        );

        const idsBatalhas = batalhasValidas.map((item) => item.id);

        const participacoes =
          idsBatalhas.length > 0
            ? await consultarTodas<Participacao>((inicio, fim) =>
                supabase
                  .from("participacoes")
                  .select("batalha_id,mc_id,lado,venceu")
                  .in("batalha_id", idsBatalhas)
                  .order("batalha_id")
                  .order("mc_id")
                  .range(inicio, fim),
              )
            : [];

        const pontos = new Map<string, number>();
        const vitorias20 = new Map<string, number>();
        const edicoesPorMc = new Map<string, Set<string>>();
        const confrontos = new Map<string, number>();

        const batalhaPorId = new Map(
          batalhasValidas.map((item) => [item.id, item]),
        );

        function adicionarPresenca(mcId: string, edicaoId: string) {
          if (!edicoesPorMc.has(mcId)) {
            edicoesPorMc.set(mcId, new Set());
          }
          edicoesPorMc.get(mcId)?.add(edicaoId);
        }

        for (const item of pontuacoes) {
          pontos.set(
            item.mc_id,
            (pontos.get(item.mc_id) ?? 0) + item.pontos,
          );

          adicionarPresenca(item.mc_id, item.edicao_id);

          if (
            !item.batalha_id &&
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(item.motivo ?? "")
          ) {
            vitorias20.set(
              item.mc_id,
              (vitorias20.get(item.mc_id) ?? 0) + 1,
            );
          }
        }

        const participantesPorBatalha = new Map<string, Participacao[]>();

        for (const item of participacoes) {
          const batalha = batalhaPorId.get(item.batalha_id);
          if (!batalha) continue;

          adicionarPresenca(item.mc_id, batalha.edicao_id);

          if (!pontos.has(item.mc_id)) {
            pontos.set(item.mc_id, 0);
          }

          if (item.venceu && batalha.vitoria_2_0) {
            vitorias20.set(
              item.mc_id,
              (vitorias20.get(item.mc_id) ?? 0) + 1,
            );
          }

          const lista =
            participantesPorBatalha.get(item.batalha_id) ?? [];
          lista.push(item);
          participantesPorBatalha.set(item.batalha_id, lista);
        }

        for (const participantes of participantesPorBatalha.values()) {
          const vencedores = participantes.filter((item) => item.venceu);
          const derrotados = participantes.filter((item) => !item.venceu);

          for (const vencedor of vencedores) {
            for (const derrotado of derrotados) {
              if (vencedor.lado === derrotado.lado) continue;

              const chave = confronto(
                vencedor.mc_id,
                derrotado.mc_id,
              );

              confrontos.set(
                chave,
                (confrontos.get(chave) ?? 0) + 1,
              );
            }
          }
        }

        const idsMcs = [...pontos.keys()];

        if (idsMcs.length === 0) {
          setRanking([]);
          return;
        }

        const { data: mcsData, error: mcsError } = await supabase
          .from("mcs")
          .select("id,nome_artistico,por_confirmar")
          .in("id", idsMcs);

        if (mcsError) {
          throw new Error("Não foi possível carregar os MCs.");
        }

        const linhas: LinhaRanking[] = ((mcsData ?? []) as Mc[])
          .map((mc) => ({
            id: mc.id,
            nome: `${mc.nome_artistico}${
              mc.por_confirmar ? " (sem registo)" : ""
            }`,
            pontos: pontos.get(mc.id) ?? 0,
            vitorias20: vitorias20.get(mc.id) ?? 0,
            participacoes: edicoesPorMc.get(mc.id)?.size ?? 0,
          }))
          .sort((a, b) => {
            if (a.pontos !== b.pontos) {
              return b.pontos - a.pontos;
            }

            if (a.vitorias20 !== b.vitorias20) {
              return b.vitorias20 - a.vitorias20;
            }

            const vitoriasA =
              confrontos.get(confronto(a.id, b.id)) ?? 0;
            const vitoriasB =
              confrontos.get(confronto(b.id, a.id)) ?? 0;

            if (vitoriasA !== vitoriasB) {
              return vitoriasB - vitoriasA;
            }

            if (a.participacoes !== b.participacoes) {
              return b.participacoes - a.participacoes;
            }

            return a.nome.localeCompare(b.nome, "pt");
          });

        setRanking(linhas);
      } catch (falha) {
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar o ranking.",
        );
      } finally {
        setLoading(false);
      }
    }

    void carregarEpoca();
  }, [rodaId, epocaId]);

  const ultimaEdicao = edicoes[0] ?? null;
  const ano = epocas.find((item) => item.id === epocaId)?.ano;

  const temporadas = [
    ...new Set(
      edicoes
        .map((item) => item.numero_temporada)
        .filter((numero): numero is number => numero != null),
    ),
  ].sort((a, b) => b - a);

  const edicoesVisiveis = edicoes.filter(
    (item) =>
      temporada == null || item.numero_temporada === temporada,
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

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/rodas"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR ÀS RODAS
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-bold tracking-[0.3em] text-zinc-300 sm:text-sm">
            NACIONAL DE RUA
          </p>

          {roda && (
            <>
              <h1 className="mt-3 break-words text-5xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-yellow-500 drop-shadow-[3px_4px_0_#000] sm:text-6xl md:text-7xl">
                {roda.nome}
              </h1>

              {(roda.cidade || roda.distrito) && (
                <p className="mt-4 text-sm text-zinc-200">
                  {[roda.cidade, roda.distrito]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}

              {epocas.length > 0 && (
                <label className="mt-8 block max-w-xs text-sm font-bold text-zinc-200">
                  ANO DO RANKING
                  <select
                    value={epocaId}
                    onChange={(evento) =>
                      setEpocaId(evento.target.value)
                    }
                    className="mt-2 w-full rounded-md border border-zinc-600 bg-zinc-950 p-3 text-white"
                  >
                    {epocas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ano === 2026
                          ? "2026 · Testes"
                          : `${item.ano}${
                              item.nome &&
                              item.nome !== String(item.ano)
                                ? ` · ${item.nome}`
                                : ""
                            }`}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {ultimaEdicao && (
                <p className="mt-6 text-sm font-black uppercase tracking-wide text-white sm:text-base">
                  SEMANA {semanaDoAno(ultimaEdicao.data_edicao)}
                  {" — "}
                  {ultimaEdicao.numero_temporada ?? "—"}.ª TEMPORADA
                  {" — "}
                  {ultimaEdicao.numero_edicao ?? "—"}.ª EDIÇÃO
                </p>
              )}
            </>
          )}
        </header>

        {loading && (
          <p className="mt-10 font-bold text-yellow-500">
            A CARREGAR...
          </p>
        )}

        {erro && (
          <p className="mt-10 rounded-md border border-red-700 bg-black/85 p-5 font-bold text-red-300">
            {erro}
          </p>
        )}

        {!loading && !erro && (
          <>
            <section className="mt-12">
              <h2 className="text-2xl font-black drop-shadow-[2px_2px_0_#000]">
                RANKING ANUAL {ano ?? ""}
                {ano === 2026 ? " · TESTES" : ""}
              </h2>

              {ano === 2026 && (
                <p className="mt-2 text-sm text-zinc-200">
                  Resultados de teste: estes pontos não contam para a
                  época oficial.
                </p>
              )}

              <div className="mt-4 overflow-hidden rounded-md border border-zinc-700 bg-black/90">
                <div className="grid grid-cols-[38px_minmax(0,1fr)_42px_35px_40px] gap-1 bg-zinc-950 px-2 py-3 text-[10px] font-black text-zinc-300 sm:grid-cols-[70px_minmax(0,1fr)_90px_70px_90px] sm:gap-2 sm:px-5 sm:py-4 sm:text-xs">
                  <span>POS.</span>
                  <span>MC</span>
                  <span className="text-right sm:hidden">PTS</span>
                  <span className="hidden text-right sm:block">PONTOS</span>
                  <span className="text-right">2–0</span>
                  <span className="text-right">PART.</span>
                </div>

                {ranking.map((mc, index) => (
                  <div
                    key={mc.id}
                    className="grid grid-cols-[38px_minmax(0,1fr)_42px_35px_40px] items-center gap-1 border-t border-zinc-800 px-2 py-4 text-xs sm:grid-cols-[70px_minmax(0,1fr)_90px_70px_90px] sm:gap-2 sm:px-5 sm:py-5 sm:text-sm"
                  >
                    <span className="font-black text-yellow-500">
                      {index + 1}º
                    </span>

                    <Link
                      href={`/mcs/${mc.id}`}
                      className="min-w-0 break-words font-bold text-white hover:text-yellow-500"
                    >
                      {mc.nome}
                    </Link>

                    <span className="text-right font-black">
                      {mc.pontos}
                    </span>

                    <span className="text-right font-black text-zinc-200">
                      {mc.vitorias20}
                    </span>

                    <span className="text-right font-black text-zinc-200">
                      {mc.participacoes}
                    </span>
                  </div>
                ))}

                {ranking.length === 0 && (
                  <p className="border-t border-zinc-800 px-4 py-8 text-sm text-zinc-300">
                    Ainda não existem pontuações nesta roda.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-14">
              <h2 className="text-2xl font-black drop-shadow-[2px_2px_0_#000]">
                EDIÇÕES DESTA TEMPORADA
              </h2>

              {temporadas.length > 1 && (
                <label className="mt-5 block max-w-xs text-sm font-bold text-zinc-200">
                  TEMPORADA
                  <select
                    value={temporada ?? ""}
                    onChange={(evento) =>
                      setTemporada(Number(evento.target.value))
                    }
                    className="mt-2 w-full rounded-md border border-zinc-600 bg-zinc-950 p-3 text-white"
                  >
                    {temporadas.map((numero) => (
                      <option key={numero} value={numero}>
                        {numero}.ª TEMPORADA
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {edicoes.length === 0 ? (
                <p className="mt-4 rounded-md border border-zinc-700 bg-black/85 p-5 text-zinc-300">
                  Ainda não existem edições neste ano.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {edicoesVisiveis.map((edicao) => {
                    const confirmada = confirmadas.has(edicao.id);

                    const conteudo = (
                      <>
                        <div className="min-w-0">
                          <p className="break-words font-black text-white">
                            {edicao.nome}
                          </p>

                          <p className="mt-1 text-sm text-zinc-300">
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
                        </div>

                        <span className="text-sm font-bold text-yellow-400">
                          {confirmada
                            ? "VER RESULTADOS →"
                            : "RESULTADOS POR CONFIRMAR"}
                        </span>
                      </>
                    );

                    return confirmada ? (
                      <Link
                        key={edicao.id}
                        href={`/rodas/${rodaId}/edicoes/${edicao.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-600 bg-black/90 p-5 transition hover:border-yellow-500"
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <div
                        key={edicao.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-700 bg-black/85 p-5 opacity-75"
                      >
                        {conteudo}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}