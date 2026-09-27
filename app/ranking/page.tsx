"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

type RankingItem = {
  mc_id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
  pontos: number;
  vitorias20: number;
  participacoes: number;
};

type PontuacaoDb = {
  mc_id: string;
  pontos: number;
  motivo: string | null;
  edicao_id: string;
  batalha_id: string | null;
};

type BatalhaDb = {
  id: string;
  edicao_id: string;
  vitoria_2_0: boolean;
};

type ParticipacaoDb = {
  batalha_id: string;
  mc_id: string;
  lado: string;
  venceu: boolean;
};

type Periodo = "anual" | "1" | "2" | "3" | "4";

const temporadas: Record<
  Exclude<Periodo, "anual">,
  { titulo: string; inicio: number; fim: number }
> = {
  "1": {
    titulo: "1.ª TEMPORADA · JANEIRO A MARÇO",
    inicio: 1,
    fim: 3,
  },
  "2": {
    titulo: "2.ª TEMPORADA · ABRIL A JUNHO",
    inicio: 4,
    fim: 6,
  },
  "3": {
    titulo: "3.ª TEMPORADA · JULHO A SETEMBRO",
    inicio: 7,
    fim: 9,
  },
  "4": {
    titulo: "4.ª TEMPORADA · OUTUBRO",
    inicio: 10,
    fim: 10,
  },
};

const anosDisponiveis = Array.from(
  { length: Math.max(1, new Date().getFullYear() - 2025) },
  (_, index) => 2026 + index,
).reverse();

function chaveConfronto(vencedorId: string, derrotadoId: string) {
  return `${vencedorId}::${derrotadoId}`;
}

function podeConfirmarFinalistas(ano: number) {
  if (ano < 2027) return false;

  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());

  const anoAtual = Number(
    partes.find((parte) => parte.type === "year")?.value,
  );
  const mesAtual = Number(
    partes.find((parte) => parte.type === "month")?.value,
  );

  return anoAtual > ano || (anoAtual === ano && mesAtual >= 11);
}

export default function RankingPage() {
  const [ano, setAno] = useState(() =>
    Math.max(2026, new Date().getFullYear()),
  );
  const [periodo, setPeriodo] = useState<Periodo>("anual");
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [finalistas, setFinalistas] = useState<string[]>([]);
  const [administrador, setAdministrador] = useState(false);
  const [aConfirmar, setAConfirmar] = useState(false);
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState("");
  const [confirmacaoDisponivel, setConfirmacaoDisponivel] =
    useState(false);

  useEffect(() => {
    const atualizar = () =>
      setConfirmacaoDisponivel(podeConfirmarFinalistas(ano));

    atualizar();

    const intervalo = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(intervalo);
  }, [ano]);

  useEffect(() => {
    let ativo = true;

    async function carregarRanking() {
      setLoading(true);
      setErro("");
      setRanking([]);
      setFinalistas([]);
      setMensagemConfirmacao("");

      try {
        if (ano >= 2027) {
          const [confirmados, acesso] = await Promise.all([
            supabase
              .from("finalistas_nacionais")
              .select("mc_id,posicao")
              .eq("ano", ano)
              .order("posicao"),
            supabase.rpc("e_administrador"),
          ]);

          if (confirmados.error) {
            throw new Error(confirmados.error.message);
          }

          if (ativo) {
            setFinalistas(
              (confirmados.data ?? []).map((item) => item.mc_id),
            );
            setAdministrador(
              !acesso.error && acesso.data === true,
            );
          }
        }

        const { data: epoca, error: epocaError } = await supabase
          .from("epocas")
          .select("id")
          .eq("ano", ano)
          .maybeSingle();

        if (epocaError) {
          throw new Error(
            "Não foi possível carregar a época selecionada.",
          );
        }

        if (!epoca) {
          if (ativo) setRanking([]);
          return;
        }

        const edicoes = await consultarTodas<{
          id: string;
          data_edicao: string;
        }>((inicio, fim) =>
          supabase
            .from("edicoes")
            .select("id,data_edicao")
            .eq("epoca_id", epoca.id)
            .order("id")
            .range(inicio, fim),
        );

        const edicaoIds = edicoes
          .filter((edicao) => {
            const mes = Number(edicao.data_edicao.slice(5, 7));
            const anoEdicao = Number(
              edicao.data_edicao.slice(0, 4),
            );

            if (anoEdicao !== ano || mes < 1 || mes > 12) {
              return false;
            }

            if (periodo === "anual") {
              return ano === 2026 || mes <= 10;
            }

            const temporada = temporadas[periodo];

            return (
              mes >= temporada.inicio &&
              mes <= temporada.fim
            );
          })
          .map((edicao) => edicao.id);

        const edicoesSelecionadas = new Set(edicaoIds);

        if (edicaoIds.length === 0) {
          if (ativo) setRanking([]);
          return;
        }

        const [todasPontuacoes, batalhas] = await Promise.all([
          consultarTodas<PontuacaoDb>((inicio, fim) =>
            supabase
              .from("pontuacoes")
              .select(
                "id,mc_id,pontos,motivo,edicao_id,batalha_id",
              )
              .eq("epoca_id", epoca.id)
              .order("id")
              .range(inicio, fim),
          ),

          (async () => {
            const lista: BatalhaDb[] = [];

            for (let i = 0; i < edicaoIds.length; i += 100) {
              lista.push(
                ...(await consultarTodas<BatalhaDb>(
                  (inicio, fim) =>
                    supabase
                      .from("batalhas")
                      .select("id,edicao_id,vitoria_2_0")
                      .in(
                        "edicao_id",
                        edicaoIds.slice(i, i + 100),
                      )
                      .order("id")
                      .range(inicio, fim),
                )),
              );
            }

            return lista;
          })(),
        ]);

        const pontuacoes = todasPontuacoes.filter((item) =>
          edicoesSelecionadas.has(item.edicao_id),
        );

        const batalhaIds = batalhas.map(
          (batalha) => batalha.id,
        );
        const participacoesBatalhas: ParticipacaoDb[] = [];

        for (let i = 0; i < batalhaIds.length; i += 100) {
          participacoesBatalhas.push(
            ...(await consultarTodas<ParticipacaoDb>(
              (inicio, fim) =>
                supabase
                  .from("participacoes")
                  .select("batalha_id,mc_id,lado,venceu")
                  .in(
                    "batalha_id",
                    batalhaIds.slice(i, i + 100),
                  )
                  .order("batalha_id")
                  .order("mc_id")
                  .range(inicio, fim),
            )),
          );
        }

        const totais = new Map<string, number>();
        const vitorias20 = new Map<string, number>();
        const edicoesPorMc = new Map<string, Set<string>>();
        const confrontos = new Map<string, number>();

        const batalhaPorId = new Map(
          batalhas.map(
            (batalha) => [batalha.id, batalha] as const,
          ),
        );

        function adicionarEdicao(
          mcId: string,
          edicaoId: string,
        ) {
          if (!edicoesPorMc.has(mcId)) {
            edicoesPorMc.set(mcId, new Set<string>());
          }

          edicoesPorMc.get(mcId)?.add(edicaoId);
        }

        for (const item of pontuacoes) {
          totais.set(
            item.mc_id,
            (totais.get(item.mc_id) ?? 0) + item.pontos,
          );

          adicionarEdicao(item.mc_id, item.edicao_id);

          if (
            !item.batalha_id &&
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(
              item.motivo ?? "",
            )
          ) {
            vitorias20.set(
              item.mc_id,
              (vitorias20.get(item.mc_id) ?? 0) + 1,
            );
          }
        }

        const participantesPorBatalha =
          new Map<string, ParticipacaoDb[]>();

        for (const participacao of participacoesBatalhas) {
          const batalha = batalhaPorId.get(
            participacao.batalha_id,
          );

          if (!batalha) continue;

          adicionarEdicao(
            participacao.mc_id,
            batalha.edicao_id,
          );

          if (!totais.has(participacao.mc_id)) {
            totais.set(participacao.mc_id, 0);
          }

          if (
            participacao.venceu &&
            batalha.vitoria_2_0
          ) {
            vitorias20.set(
              participacao.mc_id,
              (vitorias20.get(participacao.mc_id) ?? 0) + 1,
            );
          }

          const lista =
            participantesPorBatalha.get(
              participacao.batalha_id,
            ) ?? [];

          lista.push(participacao);

          participantesPorBatalha.set(
            participacao.batalha_id,
            lista,
          );
        }

        for (
          const participantes of participantesPorBatalha.values()
        ) {
          const vencedores = participantes.filter(
            (item) => item.venceu,
          );
          const derrotados = participantes.filter(
            (item) => !item.venceu,
          );

          for (const vencedor of vencedores) {
            for (const derrotado of derrotados) {
              if (vencedor.lado === derrotado.lado) {
                continue;
              }

              const chave = chaveConfronto(
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

        const mcIds = Array.from(totais.keys());

        if (mcIds.length === 0) {
          if (ativo) setRanking([]);
          return;
        }

        type McDb = {
          id: string;
          nome_artistico: string;
          cidade: string | null;
          distrito: string | null;
          por_confirmar: boolean;
        };

        const mcsData: McDb[] = [];

        for (let i = 0; i < mcIds.length; i += 100) {
          mcsData.push(
            ...(await consultarTodas<McDb>(
              (inicio, fim) =>
                supabase
                  .from("mcs")
                  .select(
                    "id,nome_artistico,cidade,distrito,por_confirmar",
                  )
                  .in("id", mcIds.slice(i, i + 100))
                  .order("id")
                  .range(inicio, fim),
            )),
          );
        }

        const rankingFinal: RankingItem[] = mcsData
          .map((mc) => ({
            mc_id: mc.id,
            nome: `${mc.nome_artistico}${
              mc.por_confirmar ? " (sem registo)" : ""
            }`,
            cidade: mc.cidade,
            distrito: mc.distrito,
            pontos: totais.get(mc.id) ?? 0,
            vitorias20: vitorias20.get(mc.id) ?? 0,
            participacoes:
              edicoesPorMc.get(mc.id)?.size ?? 0,
          }))
          .sort((a, b) => {
            const diferencaPontos =
              b.pontos - a.pontos;

            if (diferencaPontos !== 0) {
              return diferencaPontos;
            }

            const diferencaVitorias20 =
              b.vitorias20 - a.vitorias20;

            if (diferencaVitorias20 !== 0) {
              return diferencaVitorias20;
            }

            const vitoriasA =
              confrontos.get(
                chaveConfronto(a.mc_id, b.mc_id),
              ) ?? 0;
            const vitoriasB =
              confrontos.get(
                chaveConfronto(b.mc_id, a.mc_id),
              ) ?? 0;

            if (vitoriasA !== vitoriasB) {
              return vitoriasB - vitoriasA;
            }

            return a.nome.localeCompare(b.nome, "pt");
          });

        if (ativo) {
          setRanking(rankingFinal);
        }
      } catch (erroCarregamento) {
        if (ativo) {
          setErro(
            erroCarregamento instanceof Error
              ? erroCarregamento.message
              : "Não foi possível carregar o ranking nacional.",
          );
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregarRanking();

    return () => {
      ativo = false;
    };
  }, [ano, periodo]);

  async function confirmarFinalistas() {
    if (
      !administrador ||
      ano < 2027 ||
      periodo !== "anual" ||
      ranking.length < 16 ||
      finalistas.length > 0 ||
      aConfirmar ||
      !podeConfirmarFinalistas(ano)
    ) {
      return;
    }

    const confirmado = window.confirm(
      `Confirmar os 16 primeiros MCs de ${ano} para a Final Nacional? Esta ação não pode ser repetida.`,
    );

    if (!confirmado) return;

    setAConfirmar(true);
    setMensagemConfirmacao("");

    const ids = ranking
      .slice(0, 16)
      .map((mc) => mc.mc_id);

    const { error } = await supabase.rpc(
      "confirmar_finalistas_nacionais",
      {
        p_ano: ano,
        p_mcs: ids,
      },
    );

    setAConfirmar(false);

    if (error) {
      setMensagemConfirmacao(error.message);
      return;
    }

    setFinalistas(ids);
    setMensagemConfirmacao(
      "Finalistas confirmados. A lista oficial está publicada.",
    );
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black"
        style={{
          backgroundImage:
            "url('/fundo-tijolos.png'), url('/fundo-tijolos.jpg')",
          backgroundPosition: "center center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/15"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </Link>

        <header className="mt-10 sm:mt-12">
          <p className="text-xs font-bold tracking-[0.3em] text-zinc-200 sm:text-sm">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 text-4xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
            <span>RANKING </span>
            <span className="text-yellow-500">
              NACIONAL
            </span>
          </h1>

          <p className="mt-4 text-sm text-zinc-200 sm:text-base">
            {ano === 2026
              ? "Classificação dos testes de 2026. Estes pontos não contam para a época oficial."
              : `Classificação oficial de ${ano}. Os testes de 2026 não entram neste ranking.`}
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-6">
            <div>
              <label
                htmlFor="ano-ranking"
                className="block text-xs font-black uppercase text-zinc-100"
              >
                Ano do ranking
              </label>

              <select
                id="ano-ranking"
                value={ano}
                onChange={(event) =>
                  setAno(Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-white sm:w-auto"
              >
                {anosDisponiveis.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao === 2026
                      ? "2026 · Testes"
                      : `${opcao} · Época oficial`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="periodo-ranking"
                className="block text-xs font-black uppercase text-zinc-100"
              >
                Classificação
              </label>

              <select
                id="periodo-ranking"
                value={periodo}
                onChange={(event) =>
                  setPeriodo(
                    event.target.value as Periodo,
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-white"
              >
                <option value="anual">
                  {ano === 2026
                    ? "RANKING ANUAL · TESTES"
                    : "RANKING ANUAL · JANEIRO A OUTUBRO"}
                </option>

                {Object.entries(temporadas).map(
                  ([chave, temporada]) => (
                    <option
                      key={chave}
                      value={chave}
                    >
                      {temporada.titulo}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <p className="mt-5 text-sm text-zinc-200">
            {ano === 2026
              ? "Resultados de teste: não dão acesso à Final Nacional de 2027."
              : periodo === "anual"
                ? finalistas.length === 16
                  ? "Os 16 finalistas desta época foram confirmados pelo administrador geral."
                  : "Os pontos de janeiro a outubro acumulam-se neste ranking. Os 16 primeiros estão provisoriamente no apuramento para a Final Nacional, sujeito à validação em novembro."
                : "Classificação desta temporada. Os pontos também contam para o ranking anual."}
          </p>

          {administrador &&
            ano >= 2027 &&
            periodo === "anual" &&
            finalistas.length === 0 &&
            confirmacaoDisponivel && (
              <div className="mt-6 rounded-xl border border-yellow-500/50 bg-black/90 p-5">
                <p className="text-sm text-zinc-200">
                  ADMINISTRADOR GERAL · Confere os
                  resultados de todas as rodas antes de
                  fechar os 16 apurados. Esta confirmação é
                  definitiva.
                </p>

                <button
                  type="button"
                  onClick={confirmarFinalistas}
                  disabled={
                    loading ||
                    aConfirmar ||
                    ranking.length < 16
                  }
                  className="mt-4 rounded-lg bg-yellow-500 px-5 py-3 font-black text-black disabled:opacity-50"
                >
                  {aConfirmar
                    ? "A CONFIRMAR..."
                    : "CONFIRMAR OS 16 FINALISTAS"}
                </button>

                {ranking.length < 16 && !loading && (
                  <p className="mt-2 text-sm text-zinc-300">
                    São necessários pelo menos 16 MCs
                    classificados.
                  </p>
                )}
              </div>
            )}

          {mensagemConfirmacao && (
            <p
              role="status"
              className="mt-4 text-sm text-yellow-500"
            >
              {mensagemConfirmacao}
            </p>
          )}
        </header>

        <section
          aria-label="Tabela do ranking nacional"
          className="mt-10 overflow-hidden rounded-xl border border-zinc-700 bg-black/85"
        >
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_2.5rem_2.75rem] items-center gap-1 border-b border-zinc-700 bg-zinc-950 px-2 py-4 text-[10px] font-black text-zinc-300 sm:grid-cols-[4rem_minmax(0,1fr)_8rem_4.5rem_3.5rem_4.5rem] sm:gap-3 sm:px-5 sm:text-xs lg:grid-cols-[4rem_minmax(0,1fr)_10rem_5rem_4rem_5rem]">
            <span>POS.</span>
            <span>MC</span>
            <span className="hidden sm:block">
              LOCAL
            </span>
            <span className="text-right">
              PTS
            </span>
            <span className="text-right">
              2–0
            </span>
            <span className="text-right">
              PART.
            </span>
          </div>

          {loading && (
            <div className="px-4 py-6 text-yellow-500 sm:px-5">
              A CARREGAR...
            </div>
          )}

          {erro && (
            <div className="px-4 py-6 font-bold text-red-400 sm:px-5">
              {erro}
            </div>
          )}

          {!loading &&
            !erro &&
            ranking.map((mc, index) => (
              <div
                key={mc.mc_id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_2.5rem_2.75rem] items-center gap-1 border-t border-zinc-800 px-2 py-4 text-xs sm:grid-cols-[4rem_minmax(0,1fr)_8rem_4.5rem_3.5rem_4.5rem] sm:gap-3 sm:px-5 sm:py-5 sm:text-sm lg:grid-cols-[4rem_minmax(0,1fr)_10rem_5rem_4rem_5rem]"
              >
                <span className="font-black text-yellow-500">
                  {index + 1}º
                </span>

                <div className="min-w-0">
                  <Link
                    href={`/mcs/${mc.mc_id}`}
                    className="block min-w-0 break-words font-bold leading-tight transition-colors hover:text-yellow-500"
                  >
                    {mc.nome}
                  </Link>

                  {periodo === "anual" &&
                    ano >= 2027 &&
                    (finalistas.length === 16
                      ? finalistas.includes(
                          mc.mc_id,
                        ) && (
                          <span className="mt-1 block text-[10px] font-bold text-yellow-500">
                            FINALISTA CONFIRMADO
                          </span>
                        )
                      : index < 16 && (
                          <span className="mt-1 block text-[10px] font-bold text-yellow-500">
                            TOP 16 PROVISÓRIO
                          </span>
                        ))}

                  <span className="mt-1 block break-words text-[10px] leading-tight text-zinc-300 sm:hidden">
                    {[mc.cidade, mc.distrito]
                      .filter(Boolean)
                      .join(" • ") || "—"}
                  </span>
                </div>

                <span className="hidden break-words text-sm text-zinc-300 sm:block">
                  {[mc.cidade, mc.distrito]
                    .filter(Boolean)
                    .join(" • ") || "—"}
                </span>

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

          {!loading &&
            !erro &&
            ranking.length === 0 && (
              <div className="px-4 py-8 text-zinc-300 sm:px-5">
                {ano === 2026
                  ? "Ainda não existem pontuações nos testes de 2026."
                  : `Ainda não existem pontuações na época oficial de ${ano}.`}
              </div>
            )}
        </section>

        <p className="mt-10 text-center text-xs tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}