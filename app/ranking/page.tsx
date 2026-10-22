
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { boldIMIP, veneerIMIP } from "../fonts/identidade";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  RANKING NACIONAL

  Identidade tipográfica:
  BOLD   — Títulos principais e secções
  VENEER — Frases de impacto
  GEIST  — Dados, filtros e informações

  Preservados:
  - Pontos
  - Vitórias por 2–0
  - Participações
  - Desempates
  - Temporadas
  - Ranking anual
  - Finalistas nacionais
  - Confirmação administrativa
  - Dados do Supabase
  ==================================================
*/

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
    titulo: "4.ª TEMPORADA · OUTUBRO A NOVEMBRO",
    inicio: 10,
    fim: 11,
  },
};

const anosDisponiveis = Array.from(
  {
    length:
      Math.max(2027, new Date().getFullYear()) - 2025,
  },
  (_, index) => 2026 + index,
).reverse();

function chaveConfronto(
  vencedorId: string,
  derrotadoId: string,
) {
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

  return (
    anoAtual > ano ||
    (anoAtual === ano && mesAtual >= 12)
  );
}

export default function RankingPage() {
  const [ano, setAno] = useState(() =>
    Math.max(2026, new Date().getFullYear()),
  );

  const [periodo, setPeriodo] =
    useState<Periodo>("anual");

  const [ranking, setRanking] =
    useState<RankingItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [finalistas, setFinalistas] =
    useState<string[]>([]);

  const [administrador, setAdministrador] =
    useState(false);

  const [aConfirmar, setAConfirmar] =
    useState(false);

  const [
    mensagemConfirmacao,
    setMensagemConfirmacao,
  ] = useState("");

  const [
    confirmacaoDisponivel,
    setConfirmacaoDisponivel,
  ] = useState(false);

  /*
    ==================================================
    VERIFICAÇÃO DO PERÍODO DE CONFIRMAÇÃO
    ==================================================
  */

  useEffect(() => {
    const atualizar = () =>
      setConfirmacaoDisponivel(
        podeConfirmarFinalistas(ano),
      );

    atualizar();

    const intervalo = window.setInterval(
      atualizar,
      60_000,
    );

    return () => {
      window.clearInterval(intervalo);
    };
  }, [ano]);

  /*
    ==================================================
    CARREGAR RANKING DO SUPABASE
    ==================================================
  */

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
          const [confirmados, acesso] =
            await Promise.all([
              supabase
                .from("finalistas_nacionais")
                .select("mc_id,posicao")
                .eq("ano", ano)
                .order("posicao"),

              supabase.rpc("e_administrador"),
            ]);

          if (confirmados.error) {
            throw new Error(
              confirmados.error.message,
            );
          }

          if (ativo) {
            setFinalistas(
              (confirmados.data ?? []).map(
                (item) => item.mc_id,
              ),
            );

            setAdministrador(
              !acesso.error &&
                acesso.data === true,
            );
          }
        }

        const {
          data: epoca,
          error: epocaError,
        } = await supabase
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
            const mes = Number(
              edicao.data_edicao.slice(5, 7),
            );

            const anoEdicao = Number(
              edicao.data_edicao.slice(0, 4),
            );

            if (
              anoEdicao !== ano ||
              mes < 1 ||
              mes > 12
            ) {
              return false;
            }

            if (periodo === "anual") {
              return ano === 2026 || mes <= 11;
            }

            const temporada = temporadas[periodo];

            return (
              mes >= temporada.inicio &&
              mes <= temporada.fim
            );
          })
          .map((edicao) => edicao.id);

        const edicoesSelecionadas =
          new Set(edicaoIds);

        if (edicaoIds.length === 0) {
          if (ativo) setRanking([]);
          return;
        }

        const [
          todasPontuacoes,
          batalhas,
        ] = await Promise.all([
          consultarTodas<PontuacaoDb>(
            (inicio, fim) =>
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

            for (
              let i = 0;
              i < edicaoIds.length;
              i += 100
            ) {
              lista.push(
                ...(await consultarTodas<BatalhaDb>(
                  (inicio, fim) =>
                    supabase
                      .from("batalhas")
                      .select(
                        "id,edicao_id,vitoria_2_0",
                      )
                      .in(
                        "edicao_id",
                        edicaoIds.slice(
                          i,
                          i + 100,
                        ),
                      )
                      .order("id")
                      .range(inicio, fim),
                )),
              );
            }

            return lista;
          })(),
        ]);

        const pontuacoes =
          todasPontuacoes.filter((item) =>
            edicoesSelecionadas.has(
              item.edicao_id,
            ),
          );

        const batalhaIds = batalhas.map(
          (batalha) => batalha.id,
        );

        const participacoesBatalhas:
          ParticipacaoDb[] = [];

        for (
          let i = 0;
          i < batalhaIds.length;
          i += 100
        ) {
          participacoesBatalhas.push(
            ...(await consultarTodas<ParticipacaoDb>(
              (inicio, fim) =>
                supabase
                  .from("participacoes")
                  .select(
                    "batalha_id,mc_id,lado,venceu",
                  )
                  .in(
                    "batalha_id",
                    batalhaIds.slice(
                      i,
                      i + 100,
                    ),
                  )
                  .order("batalha_id")
                  .order("mc_id")
                  .range(inicio, fim),
            )),
          );
        }

        /*
          ========================================
          TOTAIS, VITÓRIAS E PARTICIPAÇÕES
          ========================================
        */

        const totais =
          new Map<string, number>();

        const vitorias20 =
          new Map<string, number>();

        const edicoesPorMc =
          new Map<string, Set<string>>();

        const confrontos =
          new Map<string, number>();

        const batalhaPorId = new Map(
          batalhas.map(
            (batalha) =>
              [batalha.id, batalha] as const,
          ),
        );

        function adicionarEdicao(
          mcId: string,
          edicaoId: string,
        ) {
          if (!edicoesPorMc.has(mcId)) {
            edicoesPorMc.set(
              mcId,
              new Set<string>(),
            );
          }

          edicoesPorMc
            .get(mcId)
            ?.add(edicaoId);
        }

        for (const item of pontuacoes) {
          totais.set(
            item.mc_id,
            (totais.get(item.mc_id) ?? 0) +
              item.pontos,
          );

          adicionarEdicao(
            item.mc_id,
            item.edicao_id,
          );

          if (
            !item.batalha_id &&
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(
              item.motivo ?? "",
            )
          ) {
            vitorias20.set(
              item.mc_id,
              (vitorias20.get(item.mc_id) ??
                0) + 1,
            );
          }
        }

        const participantesPorBatalha =
          new Map<
            string,
            ParticipacaoDb[]
          >();

        for (
          const participacao of
          participacoesBatalhas
        ) {
          const batalha =
            batalhaPorId.get(
              participacao.batalha_id,
            );

          if (!batalha) continue;

          adicionarEdicao(
            participacao.mc_id,
            batalha.edicao_id,
          );

          if (
            !totais.has(
              participacao.mc_id,
            )
          ) {
            totais.set(
              participacao.mc_id,
              0,
            );
          }

          if (
            participacao.venceu &&
            batalha.vitoria_2_0
          ) {
            vitorias20.set(
              participacao.mc_id,
              (vitorias20.get(
                participacao.mc_id,
              ) ?? 0) + 1,
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

        /*
          ========================================
          CONFRONTOS DIRETOS
          ========================================
        */

        for (
          const participantes of
          participantesPorBatalha.values()
        ) {
          const vencedores =
            participantes.filter(
              (item) => item.venceu,
            );

          const derrotados =
            participantes.filter(
              (item) => !item.venceu,
            );

          for (
            const vencedor of
            vencedores
          ) {
            for (
              const derrotado of
              derrotados
            ) {
              if (
                vencedor.lado ===
                derrotado.lado
              ) {
                continue;
              }

              const chave =
                chaveConfronto(
                  vencedor.mc_id,
                  derrotado.mc_id,
                );

              confrontos.set(
                chave,
                (confrontos.get(
                  chave,
                ) ?? 0) + 1,
              );
            }
          }
        }

        /*
          ========================================
          CARREGAR MCs
          ========================================
        */

        const mcIds =
          Array.from(totais.keys());

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

        for (
          let i = 0;
          i < mcIds.length;
          i += 100
        ) {
          mcsData.push(
            ...(await consultarTodas<McDb>(
              (inicio, fim) =>
                supabase
                  .from("mcs")
                  .select(
                    "id,nome_artistico,cidade,distrito,por_confirmar",
                  )
                  .in(
                    "id",
                    mcIds.slice(
                      i,
                      i + 100,
                    ),
                  )
                  .order("id")
                  .range(inicio, fim),
            )),
          );
        }

        /*
          ========================================
          RANKING E DESEMPATES
          ========================================
        */

        const rankingFinal:
          RankingItem[] = mcsData
          .map((mc) => ({
            mc_id: mc.id,

            nome: `${
              mc.nome_artistico
            }${
              mc.por_confirmar
                ? " (sem registo)"
                : ""
            }`,

            cidade: mc.cidade,
            distrito: mc.distrito,

            pontos:
              totais.get(mc.id) ?? 0,

            vitorias20:
              vitorias20.get(mc.id) ?? 0,

            participacoes:
              edicoesPorMc.get(
                mc.id,
              )?.size ?? 0,
          }))
          .sort((a, b) => {
            const diferencaPontos =
              b.pontos - a.pontos;

            if (
              diferencaPontos !== 0
            ) {
              return diferencaPontos;
            }

            const diferencaVitorias20 =
              b.vitorias20 -
              a.vitorias20;

            if (
              diferencaVitorias20 !== 0
            ) {
              return diferencaVitorias20;
            }

            const vitoriasA =
              confrontos.get(
                chaveConfronto(
                  a.mc_id,
                  b.mc_id,
                ),
              ) ?? 0;

            const vitoriasB =
              confrontos.get(
                chaveConfronto(
                  b.mc_id,
                  a.mc_id,
                ),
              ) ?? 0;

            if (
              vitoriasA !== vitoriasB
            ) {
              return (
                vitoriasB -
                vitoriasA
              );
            }

            return a.nome.localeCompare(
              b.nome,
              "pt",
            );
          });

        if (ativo) {
          setRanking(rankingFinal);
        }
      } catch (
        erroCarregamento
      ) {
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

  /*
    ==================================================
    CONFIRMAÇÃO DOS 16 FINALISTAS
    ==================================================
  */

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

    const confirmado =
      window.confirm(
        `Confirmar os 16 primeiros MCs de ${ano} para a Final Nacional? Esta ação não pode ser repetida.`,
      );

    if (!confirmado) return;

    setAConfirmar(true);
    setMensagemConfirmacao("");

    const ids = ranking
      .slice(0, 16)
      .map((mc) => mc.mc_id);

    const { error } =
      await supabase.rpc(
        "confirmar_finalistas_nacionais",
        {
          p_ano: ano,
          p_mcs: ids,
        },
      );

    setAConfirmar(false);

    if (error) {
      setMensagemConfirmacao(
        error.message,
      );
      return;
    }

    setFinalistas(ids);

    setMensagemConfirmacao(
      "Finalistas confirmados. A lista oficial está publicada.",
    );
  }

  /*
    ==================================================
    APRESENTAÇÃO DO RANKING
    ==================================================
  */

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* VOLTAR E IDENTIFICAÇÃO */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d] focus-visible:outline-2 focus-visible:outline-[#f0d58e]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · IMPROVISO MADE IN PORTUGAL
          </span>
        </div>

        {/* =====================================
            MURAL DE ENTRADA
            ===================================== */}

        <header className="relative isolate mt-5 overflow-hidden border border-[#d6b56d]/35 bg-[#06160e] sm:mt-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-90"
            style={{
              background:
                "linear-gradient(105deg, rgba(0,55,35,.88) 0%, rgba(0,26,17,.9) 47%, rgba(113,20,34,.8) 100%)",
            }}
          />

          <div className="relative px-5 py-9 sm:px-8 sm:py-12 lg:px-12 lg:py-14">

            <p className="imip-etiqueta">
              A CLASSIFICAÇÃO DE QUEM BATALHA
            </p>

            {/* TÍTULO PRINCIPAL — BOLD */}

            <h1
              className={`${boldIMIP.className} mt-5 max-w-[1000px] font-bold uppercase leading-[1.07] tracking-[0.015em] text-[#f0e6d1] [overflow-wrap:break-word] text-[clamp(2.8rem,6vw,6.7rem)]`}
            >
              RANKING

              <span className="block text-[#d6b56d]">
                NACIONAL
                <span className="text-[#b82535]">
                  .
                </span>
              </span>
            </h1>

            <div
              className="mt-6 flex h-[5px] w-48 max-w-full"
              aria-hidden="true"
            >
              <span className="w-[43%] bg-[#087a43]" />
              <span className="w-[14%] bg-[#d6b56d]" />
              <span className="flex-1 bg-[#b82535]" />
            </div>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#f0e6d1] sm:text-lg">
              Cada roda conta. Cada ponto tem história.
              O mérito conquista-se em batalha.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d5d9d0]">
              {ano === 2026
                ? "Época de testes 2026. Estes resultados não contam para a classificação oficial de 2027."
                : `Classificação oficial de ${ano}. Os resultados dos testes de 2026 estão separados.`}
            </p>

            {/* FRASE DE IMPACTO — VENEER */}

            <div
              className={`${veneerIMIP.className} mt-7 inline-flex items-center gap-3 border-t border-[#d6b56d]/40 pt-4 text-xl font-normal uppercase tracking-[0.04em] text-[#f0d58e] sm:text-2xl`}
            >
              <span className="h-2.5 w-2.5 rotate-45 bg-[#b82535]" />
              MERITOCRACIA É LEI.
            </div>
          </div>
        </header>

        {/* =====================================
            FILTROS
            ===================================== */}

        <section
          aria-label="Selecionar classificação"
          className="mt-5 border border-[#d6b56d]/35 bg-[#0a100c]/95 p-4 shadow-xl sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* TÍTULO DOS FILTROS — BOLD */}

            <h2
              className={`${boldIMIP.className} text-[clamp(1.5rem,2.2vw,2.2rem)] font-bold uppercase leading-tight tracking-[0.02em] text-[#f0e6d1]`}
            >
              ESCOLHE O TEU CAMPO DE BATALHA
            </h2>

            <span className="text-xs font-black uppercase tracking-wide text-[#d6b56d]">
              {ano === 2026
                ? "TEMPORADA DE TESTES"
                : `ÉPOCA ${ano}`}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">

            <div className="min-w-0">
              <label
                htmlFor="ano-ranking"
                className="block border-l-4 border-[#087a43] pl-3 text-xs font-black uppercase tracking-wide text-[#f0d58e]"
              >
                ANO
              </label>

              <select
                id="ano-ranking"
                value={ano}
                onChange={(event) =>
                  setAno(
                    Number(event.target.value),
                  )
                }
                className="mt-2 min-h-12 w-full min-w-0 border border-[#d6b56d]/45 bg-[#111c15] px-3 py-3 text-sm font-bold text-white focus:border-[#f0d58e] focus:outline-none focus:ring-2 focus:ring-[#d6b56d]/30"
              >
                {anosDisponiveis.map((opcao) => (
                  <option
                    key={opcao}
                    value={opcao}
                  >
                    {opcao === 2026
                      ? "2026 · Testes"
                      : `${opcao} · Época oficial`}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="periodo-ranking"
                className="block border-l-4 border-[#b82535] pl-3 text-xs font-black uppercase tracking-wide text-[#f0d58e]"
              >
                CLASSIFICAÇÃO / TEMPORADA
              </label>

              <select
                id="periodo-ranking"
                value={periodo}
                onChange={(event) =>
                  setPeriodo(
                    event.target.value as Periodo,
                  )
                }
                className="mt-2 min-h-12 w-full min-w-0 border border-[#d6b56d]/45 bg-[#111c15] px-3 py-3 text-sm font-bold text-white focus:border-[#f0d58e] focus:outline-none focus:ring-2 focus:ring-[#d6b56d]/30"
              >
                <option value="anual">
                  {ano === 2026
                    ? "RANKING ANUAL · TESTES"
                    : "RANKING ANUAL · JANEIRO A NOVEMBRO"}
                </option>

                {Object.entries(
                  temporadas,
                ).map(
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

          <p className="mt-4 border-l-2 border-[#d6b56d] bg-[#d6b56d]/[0.08] px-4 py-3 text-xs leading-relaxed text-[#e4e1d8] sm:text-sm">
            {ano === 2026
              ? "Os resultados de 2026 são testes. Não dão acesso à Final Nacional de 2027."
              : periodo === "anual"
                ? finalistas.length === 16
                  ? "Os 16 finalistas desta época já foram confirmados pelo administrador geral."
                  : "De janeiro a novembro, os pontos somam-se no ranking anual. Os 16 primeiros ficam provisoriamente no apuramento, sujeito à validação de dezembro."
                : "Esta é a classificação da temporada selecionada. Os pontos também contribuem para o ranking anual."}
          </p>
        </section>

        {/* =====================================
            CONFIRMAÇÃO OFICIAL
            ===================================== */}

        {administrador &&
          ano >= 2027 &&
          periodo === "anual" &&
          finalistas.length === 0 &&
          confirmacaoDisponivel && (
            <section
              className="mt-5 border-2 border-[#d6b56d] bg-[#12130d] p-5 sm:p-6"
              aria-label="Confirmação dos finalistas"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d6b56d]">
                ÁREA DE RESPONSABILIDADE ·
                ADMINISTRADOR GERAL
              </p>

              <p className="mt-2 text-sm leading-relaxed text-[#e8e3d6]">
                Confere os resultados de todas as
                rodas antes de fechar os 16
                apurados. Esta confirmação é
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
                className="imip-botao imip-botao-principal mt-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aConfirmar
                  ? "A CONFIRMAR..."
                  : "CONFIRMAR OS 16 FINALISTAS"}
              </button>

              {ranking.length < 16 &&
                !loading && (
                  <p className="mt-3 text-sm text-[#e9d7bd]">
                    São necessários pelo menos
                    16 MCs classificados.
                  </p>
                )}
            </section>
          )}

        {mensagemConfirmacao && (
          <p
            role="status"
            className="mt-4 border-l-4 border-[#d6b56d] bg-black/80 px-4 py-3 text-sm text-[#f0d58e]"
          >
            {mensagemConfirmacao}
          </p>
        )}

        {/* =====================================
            PÓDIO
            ===================================== */}

        <section
          aria-labelledby="podio-imip"
          className="mt-10 sm:mt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">

            <div>
              <p className="imip-etiqueta">
                OS NOMES NO TOPO
              </p>

              {/* TÍTULO DO PÓDIO — BOLD */}

              <h2
                id="podio-imip"
                className={`${boldIMIP.className} mt-2 text-[clamp(2.4rem,4.2vw,4.4rem)] font-bold uppercase leading-[1.1] tracking-[0.02em] text-[#f0e6d1]`}
              >
                O PÓDIO
                <span className="text-[#d6b56d]">
                  .
                </span>
              </h2>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#e1d7be]">
              {periodo === "anual"
                ? "CLASSIFICAÇÃO ANUAL"
                : `TEMPORADA ${periodo}`}{" "}
              · {ano}
            </p>
          </div>

          {loading ? (
            <div
              className="mt-5 border border-[#d6b56d]/35 bg-black/80 px-5 py-8 text-sm font-bold text-[#f0d58e]"
              role="status"
            >
              A CARREGAR RESULTADOS...
            </div>
          ) : erro ? (
            <div
              className="mt-5 border border-[#b82535]/60 bg-black/80 px-5 py-7 text-sm text-red-200"
              role="alert"
            >
              {erro}
            </div>
          ) : ranking.length === 0 ? (
            <div className="mt-5 border border-[#d6b56d]/35 bg-black/80 px-5 py-8 text-sm leading-relaxed text-[#e8e3d6]">
              {ano === 2026
                ? "Ainda não existem pontuações nos testes de 2026."
                : `Ainda não existem pontuações na época oficial de ${ano}.`}
            </div>
          ) : (
            <div className="mt-5 grid items-end gap-3 md:grid-cols-3 md:gap-4">

              {[
                {
                  mc: ranking[1],
                  lugar: 2,
                  destaque: false,
                },
                {
                  mc: ranking[0],
                  lugar: 1,
                  destaque: true,
                },
                {
                  mc: ranking[2],
                  lugar: 3,
                  destaque: false,
                },
              ].map(
                ({
                  mc,
                  lugar,
                  destaque,
                }) =>
                  mc ? (
                    <Link
                      key={mc.mc_id}
                      href={`/mcs/${mc.mc_id}`}
                      className={`group relative flex min-w-0 flex-col overflow-hidden border p-5 transition hover:-translate-y-1 hover:border-[#f0d58e] sm:p-6 ${
                        destaque
                          ? "order-first border-[#d6b56d] bg-[#d6b56d] text-[#101713] shadow-[0_14px_35px_rgba(0,0,0,.35)] md:order-none md:min-h-[295px]"
                          : "border-[#d6b56d]/55 bg-[#101713]/95 text-[#f0e6d1] md:min-h-[268px]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">

                        <span
                          className={`text-6xl font-black leading-none tabular-nums sm:text-7xl ${
                            destaque
                              ? "text-[#2d3c2d]"
                              : lugar === 2
                                ? "text-[#c8c9c4]"
                                : "text-[#c59065]"
                          }`}
                        >
                          {String(lugar).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                            destaque
                              ? "text-[#273627]"
                              : "text-[#d6b56d]"
                          }`}
                        >
                          {lugar === 1
                            ? "1.º LUGAR"
                            : lugar === 2
                              ? "2.º LUGAR"
                              : "3.º LUGAR"}
                        </span>
                      </div>

                      <div className="mt-auto pt-5">

                        <h3 className="break-words text-[clamp(1.45rem,2.3vw,2rem)] font-black uppercase leading-tight tracking-[0.01em]">
                          {mc.nome}
                        </h3>

                        <p
                          className={`mt-2 text-xs ${
                            destaque
                              ? "text-[#30412e]"
                              : "text-[#c9cdc6]"
                          }`}
                        >
                          {[
                            mc.cidade,
                            mc.distrito,
                          ]
                            .filter(Boolean)
                            .join(" · ") ||
                            "LOCALIDADE POR INDICAR"}
                        </p>

                        <div
                          className={`mt-5 flex items-end justify-between gap-3 border-t pt-3 ${
                            destaque
                              ? "border-black/25"
                              : "border-white/20"
                          }`}
                        >
                          <span className="text-4xl font-black tabular-nums">
                            {mc.pontos}
                            <span className="ml-1 text-xs font-black">
                              PTS
                            </span>
                          </span>

                          <span className="text-right text-xs font-bold tabular-nums">
                            {mc.vitorias20} × 2–0
                            <br />
                            {mc.participacoes} PART.
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : null,
              )}
            </div>
          )}
        </section>

        {/* =====================================
            CLASSIFICAÇÃO INTEGRAL
            ===================================== */}

        <section
          aria-labelledby="classificacao-imip"
          className="mt-11 sm:mt-16"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">

            <div>
              <p className="imip-etiqueta">
                PONTOS · VITÓRIAS · PARTICIPAÇÕES
              </p>

              {/* TÍTULO DA TABELA — BOLD */}

              <h2
                id="classificacao-imip"
                className={`${boldIMIP.className} mt-2 text-[clamp(2rem,3.8vw,4rem)] font-bold uppercase leading-[1.1] tracking-[0.02em] text-[#f0e6d1]`}
              >
                CLASSIFICAÇÃO COMPLETA
              </h2>
            </div>

            <span className="border border-[#d6b56d]/50 bg-black/65 px-3 py-2 text-xs font-bold text-[#f0d58e]">
              {!loading && !erro
                ? `${ranking.length} MCs`
                : "IMIP"}
            </span>
          </div>

          <div className="min-w-0 overflow-hidden border border-[#d6b56d]/50 bg-[#070b08]/95 shadow-[0_20px_55px_rgba(0,0,0,.35)]">

            <div
              aria-hidden="true"
              className="flex h-[5px]"
            >
              <span className="w-[43%] bg-[#087a43]" />
              <span className="w-[14%] bg-[#d6b56d]" />
              <span className="flex-1 bg-[#b82535]" />
            </div>

            {/* CABEÇALHO DA TABELA */}

            <div className="grid grid-cols-[2.1rem_minmax(0,1fr)_3rem_2.4rem_2.6rem] items-center gap-1 bg-[#0d321f] px-2 py-4 text-[10px] font-black uppercase tracking-wide text-[#f0d58e] sm:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_4rem_3.5rem_4.2rem] sm:gap-3 sm:px-5 lg:grid-cols-[4rem_minmax(0,1fr)_11rem_5rem_4.5rem_5rem]">

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

            {/* CARREGAMENTO */}

            {loading && (
              <div
                className="px-4 py-8 text-sm font-bold text-[#f0d58e]"
                role="status"
              >
                A CARREGAR...
              </div>
            )}

            {/* ERRO */}

            {!loading && erro && (
              <div
                className="border-l-4 border-[#b82535] bg-[#b82535]/10 px-4 py-6 text-sm text-red-200"
                role="alert"
              >
                {erro}
              </div>
            )}

            {/* TODOS OS MCs CLASSIFICADOS */}

            {!loading &&
              !erro &&
              ranking.map((mc, index) => (
                <div
                  key={mc.mc_id}
                  className={`grid grid-cols-[2.1rem_minmax(0,1fr)_3rem_2.4rem_2.6rem] items-center gap-1 border-t border-[#d6b56d]/15 px-2 py-3.5 text-xs transition-colors hover:bg-[#087a43]/20 sm:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_4rem_3.5rem_4.2rem] sm:gap-3 sm:px-5 sm:py-4 sm:text-sm lg:grid-cols-[4rem_minmax(0,1fr)_11rem_5rem_4.5rem_5rem] ${
                    index === 0
                      ? "bg-[#d6b56d]/10"
                      : index % 2 === 0
                        ? "bg-white/[0.025]"
                        : "bg-transparent"
                  }`}
                >
                  <span
                    className={`font-black tabular-nums ${
                      index === 0
                        ? "text-[#f0d58e]"
                        : index === 1
                          ? "text-[#c6c7c3]"
                          : index === 2
                            ? "text-[#c59065]"
                            : "text-[#e2d9c6]"
                    }`}
                  >
                    {index + 1}º
                  </span>

                  <div className="min-w-0">
                    <Link
                      href={`/mcs/${mc.mc_id}`}
                      className="block min-w-0 break-words font-black leading-snug text-[#f0e6d1] transition-colors hover:text-[#f0d58e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d58e]"
                    >
                      {mc.nome}
                    </Link>

                    {periodo === "anual" &&
                      ano >= 2027 &&
                      (finalistas.length === 16
                        ? finalistas.includes(
                            mc.mc_id,
                          ) && (
                            <span className="mt-1 block border-l-2 border-[#087a43] pl-2 text-[10px] font-black uppercase leading-snug text-[#f0d58e]">
                              FINALISTA CONFIRMADO
                            </span>
                          )
                        : index < 16 && (
                            <span className="mt-1 block border-l-2 border-[#b82535] pl-2 text-[10px] font-black uppercase leading-snug text-[#f0d58e]">
                              TOP 16 PROVISÓRIO
                            </span>
                          ))}

                    <span className="mt-1 block break-words text-[10px] leading-snug text-[#bdc6bb] sm:hidden">
                      {[
                        mc.cidade,
                        mc.distrito,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </div>

                  <span className="hidden break-words text-xs leading-snug text-[#ccd1c7] sm:block">
                    {[
                      mc.cidade,
                      mc.distrito,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>

                  <span className="text-right font-black tabular-nums text-[#f0d58e]">
                    {mc.pontos}
                  </span>

                  <span className="text-right font-black tabular-nums text-[#f0e6d1]">
                    {mc.vitorias20}
                  </span>

                  <span className="text-right font-black tabular-nums text-[#f0e6d1]">
                    {mc.participacoes}
                  </span>
                </div>
              ))}

            {!loading &&
              !erro &&
              ranking.length === 0 && (
                <div className="px-4 py-8 text-sm leading-relaxed text-[#cdd2c9]">
                  {ano === 2026
                    ? "Ainda não existem pontuações nos testes de 2026."
                    : `Ainda não existem pontuações na época oficial de ${ano}.`}
                </div>
              )}
          </div>
        </section>

        {/* =====================================
            RODAPÉ
            ===================================== */}

        <footer className="mt-14 border-t border-[#d6b56d]/35 pt-8 text-center">

          <p
            className={`${veneerIMIP.className} text-xl font-normal uppercase tracking-[0.04em] text-[#d6b56d] sm:text-2xl`}
          >
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[11px] leading-relaxed text-[#e6dfcf]">
            NACIONAL DE RUA · IMIP ·
            IMPROVISO MADE IN PORTUGAL
          </p>
        </footer>
      </div>
    </main>
  );
}
