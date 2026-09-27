"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { consultarTodas } from "../../../lib/consultar-todas";

type MC = {
  id: string;
  nome_artistico: string;
  por_confirmar?: boolean;
  cidade: string | null;
  distrito: string | null;
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

type Edicao = {
  id: string;
  epoca_id: string;
  roda_id: string;
  nome: string | null;
  data_edicao: string;
};

type Roda = {
  id: string;
  nome: string;
};

type Epoca = {
  id: string;
  ano: number;
  nome: string | null;
  estado: string;
};

type HistoricoItem = {
  edicaoId: string;
  edicao: string;
  roda: string;
  data: string;
  pontos: number;
};

type Estatisticas = {
  posicao: number;
  pontos: number;
  vitorias20: number;
  participacoes: number;
  batalhas: number;
  vitorias: number;
  derrotas: number;
};

function chaveConfronto(vencedorId: string, derrotadoId: string) {
  return `${vencedorId}::${derrotadoId}`;
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${data}T12:00:00`));
}

function FundoTijolos() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/25"
      />
    </>
  );
}

export default function PerfilMCPage() {
  const params = useParams();
  const mcId = params.id as string;

  const [mc, setMc] = useState<MC | null>(null);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    posicao: 0,
    pontos: 0,
    vitorias20: 0,
    participacoes: 0,
    batalhas: 0,
    vitorias: 0,
    derrotas: 0,
  });
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [epocas, setEpocas] = useState<Epoca[]>([]);
  const [epocaId, setEpocaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarPerfil() {
      setLoading(true);
      setErro("");

      try {
        const [
          mcResposta,
          todasPontuacoes,
          todasBatalhas,
          todosMcs,
          epocasResposta,
        ] = await Promise.all([
          supabase
            .from("mcs")
            .select("id,nome_artistico,cidade,distrito,por_confirmar")
            .eq("id", mcId)
            .single(),

          consultarTodas<Pontuacao>((inicio, fim) =>
            supabase
              .from("pontuacoes")
              .select("id,mc_id,pontos,motivo,edicao_id,batalha_id")
              .order("id")
              .range(inicio, fim),
          ),

          consultarTodas<Batalha>((inicio, fim) =>
            supabase
              .from("batalhas")
              .select("id,edicao_id,vitoria_2_0")
              .order("id")
              .range(inicio, fim),
          ),

          consultarTodas<{
            id: string;
            nome_artistico: string;
          }>((inicio, fim) =>
            supabase
              .from("mcs")
              .select("id,nome_artistico")
              .order("id")
              .range(inicio, fim),
          ),

          supabase
            .from("epocas")
            .select("id,ano,nome,estado")
            .order("ano", { ascending: false }),
        ]);

        if (mcResposta.error || !mcResposta.data) {
          throw new Error("MC não encontrado.");
        }

        if (epocasResposta.error) {
          throw new Error(
            "Não foi possível carregar as estatísticas do MC.",
          );
        }

        setMc(mcResposta.data as MC);

        const epocasDisponiveis = (epocasResposta.data ?? []) as Epoca[];
        setEpocas(epocasDisponiveis);

        const anoAtual = new Date().getFullYear();

        const elegiveis = epocasDisponiveis.filter(
          (item) => item.ano >= 2027 && item.ano <= anoAtual,
        );

        const selecionada =
          epocasDisponiveis.find((item) => item.id === epocaId) ??
          elegiveis.find((item) => item.estado === "ativa") ??
          elegiveis[0] ??
          epocasDisponiveis.find((item) => item.ano === 2026) ??
          epocasDisponiveis[0];

        if (selecionada && selecionada.id !== epocaId) {
          setEpocaId(selecionada.id);
        }

        const pontosMcHistorico = todasPontuacoes.filter(
          (item) => item.mc_id === mcId,
        );

        const idsHistorico = [
          ...new Set(pontosMcHistorico.map((item) => item.edicao_id)),
        ];

        const edicoesHistorico: Edicao[] = [];

        for (let i = 0; i < idsHistorico.length; i += 100) {
          const resposta = await consultarTodas<Edicao>((inicio, fim) =>
            supabase
              .from("edicoes")
              .select("id,epoca_id,roda_id,nome,data_edicao")
              .in("id", idsHistorico.slice(i, i + 100))
              .order("id")
              .range(inicio, fim),
          );

          edicoesHistorico.push(...resposta);
        }

        const outrasEdicoes = selecionada
          ? await consultarTodas<{
              id: string;
              data_edicao: string;
            }>((inicio, fim) =>
              supabase
                .from("edicoes")
                .select("id,data_edicao")
                .eq("epoca_id", selecionada.id)
                .order("id")
                .range(inicio, fim),
            )
          : [];

        const idsEpoca = new Set(
          outrasEdicoes
            .filter((item) => {
              if (!selecionada || !item.data_edicao) {
                return false;
              }

              const anoEdicao = Number(item.data_edicao.slice(0, 4));
              const mesEdicao = Number(item.data_edicao.slice(5, 7));

              return (
                anoEdicao === selecionada.ano &&
                mesEdicao >= 1 &&
                mesEdicao <= (selecionada.ano === 2026 ? 12 : 10)
              );
            })
            .map((item) => item.id),
        );

        const pontos = todasPontuacoes.filter((item) =>
          idsEpoca.has(item.edicao_id),
        );

        const edicoesConfirmadas = new Set(
          pontos.map((item) => item.edicao_id),
        );

        const batalhas = todasBatalhas.filter((item) =>
          edicoesConfirmadas.has(item.edicao_id),
        );

        const batalhaIds = batalhas.map((item) => item.id);
        const participacoes: Participacao[] = [];

        for (let i = 0; i < batalhaIds.length; i += 100) {
          participacoes.push(
            ...(await consultarTodas<Participacao>((inicio, fim) =>
              supabase
                .from("participacoes")
                .select("batalha_id,mc_id,lado,venceu")
                .in("batalha_id", batalhaIds.slice(i, i + 100))
                .order("batalha_id")
                .order("mc_id")
                .range(inicio, fim),
            )),
          );
        }

        const batalhaPorId = new Map(
          batalhas.map((item) => [item.id, item] as const),
        );

        const totais = new Map<string, number>();
        const vitorias20 = new Map<string, number>();
        const edicoesPorMc = new Map<string, Set<string>>();
        const confrontos = new Map<string, number>();

        function adicionarEdicao(id: string, edicaoId: string) {
          if (!edicoesPorMc.has(id)) {
            edicoesPorMc.set(id, new Set<string>());
          }

          edicoesPorMc.get(id)?.add(edicaoId);
        }

        for (const ponto of pontos) {
          totais.set(
            ponto.mc_id,
            (totais.get(ponto.mc_id) ?? 0) + ponto.pontos,
          );

          adicionarEdicao(ponto.mc_id, ponto.edicao_id);

          if (
            !ponto.batalha_id &&
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(ponto.motivo ?? "")
          ) {
            vitorias20.set(
              ponto.mc_id,
              (vitorias20.get(ponto.mc_id) ?? 0) + 1,
            );
          }
        }

        const porBatalha = new Map<string, Participacao[]>();

        for (const participacao of participacoes) {
          const batalha = batalhaPorId.get(participacao.batalha_id);
          if (!batalha) continue;

          adicionarEdicao(participacao.mc_id, batalha.edicao_id);

          if (!totais.has(participacao.mc_id)) {
            totais.set(participacao.mc_id, 0);
          }

          if (participacao.venceu && batalha.vitoria_2_0) {
            vitorias20.set(
              participacao.mc_id,
              (vitorias20.get(participacao.mc_id) ?? 0) + 1,
            );
          }

          const lista = porBatalha.get(participacao.batalha_id) ?? [];
          lista.push(participacao);
          porBatalha.set(participacao.batalha_id, lista);
        }

        for (const lista of porBatalha.values()) {
          const vencedores = lista.filter((item) => item.venceu);
          const derrotados = lista.filter((item) => !item.venceu);

          for (const vencedor of vencedores) {
            for (const derrotado of derrotados) {
              if (vencedor.lado === derrotado.lado) continue;

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

        const ranking = todosMcs
          .filter((item) => totais.has(item.id))
          .map((item) => ({
            id: item.id,
            nome: item.nome_artistico,
            pontos: totais.get(item.id) ?? 0,
            vitorias20: vitorias20.get(item.id) ?? 0,
          }))
          .sort((a, b) => {
            if (b.pontos !== a.pontos) {
              return b.pontos - a.pontos;
            }

            if (b.vitorias20 !== a.vitorias20) {
              return b.vitorias20 - a.vitorias20;
            }

            const aVenceu =
              confrontos.get(chaveConfronto(a.id, b.id)) ?? 0;
            const bVenceu =
              confrontos.get(chaveConfronto(b.id, a.id)) ?? 0;

            if (aVenceu !== bVenceu) {
              return bVenceu - aVenceu;
            }

            return a.nome.localeCompare(b.nome, "pt");
          });

        const participacoesMc = participacoes.filter(
          (item) => item.mc_id === mcId,
        );

        const vitorias = participacoesMc.filter(
          (item) => item.venceu,
        ).length;

        setEstatisticas({
          posicao: ranking.findIndex((item) => item.id === mcId) + 1,
          pontos: totais.get(mcId) ?? 0,
          vitorias20: vitorias20.get(mcId) ?? 0,
          participacoes: edicoesPorMc.get(mcId)?.size ?? 0,
          batalhas: participacoesMc.length,
          vitorias,
          derrotas: participacoesMc.length - vitorias,
        });

        if (idsHistorico.length === 0) {
          setHistorico([]);
          return;
        }

        const rodaIds = Array.from(
          new Set(edicoesHistorico.map((item) => item.roda_id)),
        );

        let rodas: Roda[] = [];

        if (rodaIds.length > 0) {
          const rodasResposta = await supabase
            .from("rodas")
            .select("id,nome")
            .in("id", rodaIds);

          if (rodasResposta.error) {
            throw new Error("Não foi possível carregar as rodas.");
          }

          rodas = (rodasResposta.data ?? []) as Roda[];
        }

        const rodaPorId = new Map(
          rodas.map((item) => [item.id, item.nome] as const),
        );

        const pontosPorEdicao = new Map<string, number>();

        for (const ponto of pontosMcHistorico) {
          pontosPorEdicao.set(
            ponto.edicao_id,
            (pontosPorEdicao.get(ponto.edicao_id) ?? 0) + ponto.pontos,
          );
        }

        setHistorico(
          edicoesHistorico
            .map((item) => ({
              edicaoId: item.id,
              edicao: item.nome || "Edição",
              roda: rodaPorId.get(item.roda_id) ?? "Roda",
              data: item.data_edicao,
              pontos: pontosPorEdicao.get(item.id) ?? 0,
            }))
            .sort((a, b) => b.data.localeCompare(a.data)),
        );
      } catch (erroCarregamento) {
        setErro(
          erroCarregamento instanceof Error
            ? erroCarregamento.message
            : "Não foi possível carregar o perfil.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (mcId) {
      void carregarPerfil();
    }
  }, [mcId, epocaId]);

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-black text-white">
        <FundoTijolos />
        <p className="relative font-bold text-yellow-500">
          A CARREGAR PERFIL...
        </p>
      </main>
    );
  }

  if (!mc || erro) {
    return (
      <main className="relative min-h-screen bg-black text-white">
        <FundoTijolos />

        <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
          <Link
            href="/mcs"
            className="text-sm font-black text-yellow-500"
          >
            ← VOLTAR AOS MCs
          </Link>

          <p className="mt-12 rounded-md border border-red-800 bg-black/90 p-5 font-bold text-red-300">
            {erro || "MC não encontrado."}
          </p>
        </div>
      </main>
    );
  }

  const aproveitamento = estatisticas.batalhas
    ? Math.round(
        (estatisticas.vitorias / estatisticas.batalhas) * 100,
      )
    : 0;

  const cartoes = [
    [
      "POSIÇÃO NACIONAL",
      estatisticas.posicao ? `${estatisticas.posicao}º` : "—",
    ],
    ["PONTOS", estatisticas.pontos],
    ["VITÓRIAS 2–0", estatisticas.vitorias20],
    ["PARTICIPAÇÕES", estatisticas.participacoes],
    ["BATALHAS", estatisticas.batalhas],
    ["VITÓRIAS", estatisticas.vitorias],
    ["DERROTAS", estatisticas.derrotas],
    ["APROVEITAMENTO", `${aproveitamento}%`],
  ];

  return (
    <main className="relative min-h-screen bg-black text-white">
      <FundoTijolos />

      <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/mcs"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AOS MCs
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 break-words text-5xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[3px_4px_0_#000] sm:text-6xl md:text-7xl">
            {mc.nome_artistico}
          </h1>

          {mc.por_confirmar && (
            <p className="mt-3 text-sm font-bold text-yellow-500">
              MC sem registo
            </p>
          )}

          <p className="mt-3 text-sm text-zinc-200 sm:text-base">
            {[mc.cidade, mc.distrito].filter(Boolean).join(" · ") ||
              "Localização não indicada"}
          </p>
        </header>

        <label
          className="mt-8 block text-xs font-bold uppercase text-zinc-200"
          htmlFor="epoca-perfil"
        >
          ÉPOCA DAS ESTATÍSTICAS
        </label>

        <select
          id="epoca-perfil"
          value={epocaId}
          onChange={(event) => setEpocaId(event.target.value)}
          className="mt-2 max-w-full rounded-md border border-zinc-600 bg-zinc-950 px-4 py-3 text-white"
        >
          {epocas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.ano === 2026
                ? "2026 · Testes"
                : `${item.ano} · ${item.nome || "Época Nacional"}`}
            </option>
          ))}
        </select>

        <section
          className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
          aria-label="Estatísticas do MC"
        >
          {cartoes.map(([titulo, valor]) => (
            <div
              key={titulo}
              className="min-w-0 rounded-md border border-zinc-700 bg-black/90 p-4 sm:p-5"
            >
              <p className="break-words text-[10px] font-bold tracking-[0.12em] text-zinc-300 sm:text-xs sm:tracking-[0.16em]">
                {titulo}
              </p>

              <p className="mt-2 text-3xl font-black text-yellow-500">
                {valor}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black drop-shadow-[2px_2px_0_#000]">
            HISTÓRICO POR EDIÇÃO · TODAS AS ÉPOCAS
          </h2>

          <div className="mt-6 overflow-hidden rounded-md border border-zinc-700 bg-black/90">
            {historico.length === 0 ? (
              <p className="px-5 py-8 text-zinc-300">
                Ainda não existem participações registadas.
              </p>
            ) : (
              historico.map((item, index) => (
                <div
                  key={item.edicaoId}
                  className={`flex items-center justify-between gap-4 px-5 py-5 ${
                    index > 0 ? "border-t border-zinc-800" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="break-words font-black text-white">
                      {item.roda}
                    </p>

                    <p className="mt-1 break-words text-sm text-zinc-300">
                      {item.edicao} · {formatarData(item.data)}
                    </p>
                  </div>

                  <span className="shrink-0 text-xl font-black text-yellow-500">
                    +{item.pontos}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}