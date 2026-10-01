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
  foto_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  spotify_url: string | null;
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

type Rede = "instagram" | "youtube" | "tiktok" | "spotify";

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

function obterUrl(
  valor: string | null | undefined,
  dominios?: string[],
): string | null {
  if (!valor?.trim()) return null;

  try {
    const url = new URL(valor.trim());

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      /\s/.test(valor.trim()) ||
      (dominios &&
        !dominios.includes(url.hostname.toLowerCase()))
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function IconeRede({ rede }: { rede: Rede }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {rede === "instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
        </>
      )}

      {rede === "youtube" && (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" />
        </>
      )}

      {rede === "tiktok" && (
        <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47M14 3c0 4 2.5 6 6 6V6c-2.5 0-3-1.5-3-3Z" />
      )}

      {rede === "spotify" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M6.5 9c4-1.2 8-.7 11 1M7.5 12c3.3-.9 6.4-.5 9 1M8.5 15c2.5-.6 4.8-.3 7 1" />
        </>
      )}
    </svg>
  );
}

function FotografiaMC({
  url,
  nome,
}: {
  url: string | null;
  nome: string;
}) {
  const [falhou, setFalhou] = useState(false);

  const iniciais =
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase() || "MC";

  return (
    <div className="relative mx-auto aspect-square w-40 shrink-0 overflow-hidden rounded-2xl border border-[#e8c76c]/50 bg-[#101713] shadow-xl sm:mx-0 sm:w-48 lg:w-56">
      {url && !falhou ? (
        // URL pública configurável; não exige domínios no next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Fotografia de ${nome}`}
          width={400}
          height={400}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={`Perfil de ${nome}, sem fotografia disponível`}
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#087a43]/30 via-black to-[#b3202b]/25 text-5xl font-black text-[#e8c76c]"
        >
          {iniciais}
        </div>
      )}
    </div>
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
    let ativo = true;

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
            .select(
              "id,nome_artistico,cidade,distrito,por_confirmar,foto_url,bio,instagram_url,youtube_url,tiktok_url,spotify_url",
            )
            .eq("id", mcId)
            .single(),

          consultarTodas<Pontuacao>((inicio, fim) =>
            supabase
              .from("pontuacoes")
              .select(
                "id,mc_id,pontos,motivo,edicao_id,batalha_id",
              )
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

        if (!ativo) return;

        if (mcResposta.error || !mcResposta.data) {
          throw new Error(
            mcResposta.error
              ? "Não foi possível carregar o perfil do MC."
              : "MC não encontrado.",
          );
        }

        if (epocasResposta.error) {
          throw new Error(
            "Não foi possível carregar as estatísticas do MC.",
          );
        }

        setMc(mcResposta.data as MC);

        const epocasDisponiveis =
          (epocasResposta.data ?? []) as Epoca[];
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
          return;
        }

        const pontosMcHistorico = todasPontuacoes.filter(
          (item) => item.mc_id === mcId,
        );

        const idsHistorico = [
          ...new Set(
            pontosMcHistorico.map((item) => item.edicao_id),
          ),
        ];

        const edicoesHistorico: Edicao[] = [];

        for (let i = 0; i < idsHistorico.length; i += 100) {
          const resposta = await consultarTodas<Edicao>(
            (inicio, fim) =>
              supabase
                .from("edicoes")
                .select("id,epoca_id,roda_id,nome,data_edicao")
                .in("id", idsHistorico.slice(i, i + 100))
                .order("id")
                .range(inicio, fim),
          );

          if (!ativo) return;
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

        if (!ativo) return;

        const idsEpoca = new Set(
          outrasEdicoes
            .filter((item) => {
              if (!selecionada || !item.data_edicao) {
                return false;
              }

              const anoEdicao = Number(
                item.data_edicao.slice(0, 4),
              );
              const mesEdicao = Number(
                item.data_edicao.slice(5, 7),
              );

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
            ...(await consultarTodas<Participacao>(
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

          if (!ativo) return;
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
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(
              ponto.motivo ?? "",
            )
          ) {
            vitorias20.set(
              ponto.mc_id,
              (vitorias20.get(ponto.mc_id) ?? 0) + 1,
            );
          }
        }

        const porBatalha = new Map<string, Participacao[]>();

        for (const participacao of participacoes) {
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

          if (participacao.venceu && batalha.vitoria_2_0) {
            vitorias20.set(
              participacao.mc_id,
              (vitorias20.get(participacao.mc_id) ?? 0) + 1,
            );
          }

          const lista =
            porBatalha.get(participacao.batalha_id) ?? [];
          lista.push(participacao);
          porBatalha.set(participacao.batalha_id, lista);
        }

        for (const lista of porBatalha.values()) {
          const vencedores = lista.filter(
            (item) => item.venceu,
          );
          const derrotados = lista.filter(
            (item) => !item.venceu,
          );

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

        if (!ativo) return;

        setEstatisticas({
          posicao:
            ranking.findIndex((item) => item.id === mcId) + 1,
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

          if (!ativo) return;

          if (rodasResposta.error) {
            throw new Error(
              "Não foi possível carregar as rodas.",
            );
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
            (pontosPorEdicao.get(ponto.edicao_id) ?? 0) +
              ponto.pontos,
          );
        }

        if (!ativo) return;

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
        if (ativo) {
          setErro(
            erroCarregamento instanceof Error
              ? erroCarregamento.message
              : "Não foi possível carregar o perfil.",
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    if (mcId) {
      void carregarPerfil();
    }

    return () => {
      ativo = false;
    };
  }, [mcId, epocaId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-white">
        <p className="rounded-xl border border-[#e8c76c]/30 bg-black/85 px-6 py-5 text-sm font-bold tracking-wider text-[#e8c76c]">
          A CARREGAR PERFIL...
        </p>
      </main>
    );
  }

  if (!mc || erro) {
    return (
      <main className="min-h-screen text-white">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
          <Link
            href="/mcs"
            className="text-sm font-black text-[#e8c76c]"
          >
            ← VOLTAR AOS MCs
          </Link>

          <p className="mt-10 rounded-xl border border-red-800 bg-black/90 p-5 font-bold text-red-300">
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

  const redes: {
    tipo: Rede;
    nome: string;
    url: string | null;
  }[] = [
    {
      tipo: "instagram",
      nome: "Instagram",
      url: obterUrl(mc.instagram_url, [
        "instagram.com",
        "www.instagram.com",
      ]),
    },
    {
      tipo: "youtube",
      nome: "YouTube",
      url: obterUrl(mc.youtube_url, [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
      ]),
    },
    {
      tipo: "tiktok",
      nome: "TikTok",
      url: obterUrl(mc.tiktok_url, [
        "tiktok.com",
        "www.tiktok.com",
        "vm.tiktok.com",
        "vt.tiktok.com",
      ]),
    },
    {
      tipo: "spotify",
      nome: "Spotify",
      url: obterUrl(mc.spotify_url, ["open.spotify.com"]),
    },
  ];

  const redesVisiveis = redes.filter((rede) => rede.url);
  const foto = obterUrl(mc.foto_url);
  const epocaSelecionada = epocas.find(
    (item) => item.id === epocaId,
  );

  return (
    <main className="relative min-h-screen text-[#f6f2e9]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <nav
          aria-label="Navegação do perfil"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/mcs"
            className="inline-flex min-h-11 items-center rounded-lg border border-white/20 bg-black/75 px-4 py-2 text-xs font-black text-[#e8c76c] transition hover:border-[#e8c76c]"
          >
            ← VOLTAR AOS MCs
          </Link>

          <Link
            href="/ranking"
            className="inline-flex min-h-11 items-center text-xs font-black text-[#e8c76c] hover:underline"
          >
            RANKING NACIONAL ↗
          </Link>
        </nav>

        <header className="mt-8 overflow-hidden rounded-2xl border border-[#e8c76c]/35 bg-black/85 shadow-2xl">
          <div aria-hidden="true" className="flex h-1.5">
            <span className="w-2/5 bg-[#087a43]" />
            <span className="w-3/5 bg-[#b3202b]" />
          </div>

          <div className="flex flex-col gap-7 p-5 sm:flex-row sm:items-center sm:p-8">
            <FotografiaMC
              key={`${mc.id}:${foto ?? ""}`}
              url={foto}
              nome={mc.nome_artistico}
            />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black tracking-[0.2em] text-[#e8c76c] sm:text-xs">
                IMPROVISO MADE IN PORTUGAL
              </p>

              <h1 className="mt-3 break-words text-4xl font-black uppercase leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {mc.nome_artistico}
              </h1>

              {mc.por_confirmar && (
                <p className="mt-3 text-xs font-bold text-[#e8c76c]">
                  MC SEM REGISTO
                </p>
              )}

              <p className="mt-3 break-words text-sm text-zinc-300 sm:text-base">
                {[mc.cidade, mc.distrito]
                  .filter(Boolean)
                  .join(" · ") || "Localização não indicada"}
              </p>

              {redesVisiveis.length > 0 && (
                <nav
                  aria-label={`Redes sociais de ${mc.nome_artistico}`}
                  className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start"
                >
                  {redesVisiveis.map((rede) => (
                    <a
                      key={rede.tipo}
                      href={rede.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${rede.nome} de ${mc.nome_artistico} — abre num novo separador`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#e8c76c]/40 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#e8c76c] transition hover:border-[#e8c76c] hover:bg-[#e8c76c] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c76c]"
                    >
                      <IconeRede rede={rede.tipo} />
                      {rede.nome}
                      <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </nav>
              )}
            </div>
          </div>

          {mc.bio?.trim() && (
            <section
              aria-labelledby="sobre-mc"
              className="border-t border-white/15 px-5 py-6 sm:px-8"
            >
              <h2
                id="sobre-mc"
                className="text-xs font-black tracking-[0.15em] text-[#e8c76c]"
              >
                SOBRE O ARTISTA
              </h2>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-zinc-200 sm:text-base">
                {mc.bio}
              </p>
            </section>
          )}
        </header>

        <section
          aria-labelledby="titulo-estatisticas"
          className="mt-10"
        >
          <div className="flex flex-col gap-5 rounded-xl border border-white/15 bg-black/80 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#e8c76c]">
                PERCURSO COMPETITIVO
              </p>
              <h2
                id="titulo-estatisticas"
                className="mt-2 text-2xl font-black"
              >
                ESTATÍSTICAS
              </h2>
            </div>

            <div className="min-w-0 sm:max-w-xs">
              <label
                htmlFor="epoca-perfil"
                className="block text-[10px] font-bold tracking-wider text-zinc-300"
              >
                ÉPOCA DAS ESTATÍSTICAS
              </label>
              <select
                id="epoca-perfil"
                value={epocaId}
                onChange={(event) =>
                  setEpocaId(event.target.value)
                }
                className="mt-2 w-full min-w-0 rounded-lg border border-[#087a43] bg-[#101713] px-3 py-3 text-sm text-white outline-none focus:border-[#e8c76c]"
              >
                {epocas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.ano === 2026
                      ? "2026 · Testes"
                      : `${item.ano} · ${
                          item.nome || "Época Nacional"
                        }`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {epocaSelecionada?.ano === 2026 && (
            <p className="mt-3 rounded-lg bg-black/75 px-4 py-3 text-xs leading-relaxed text-zinc-300">
              Resultados de teste de 2026. Não contam para a
              época oficial nem para o apuramento nacional.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {cartoes.map(([titulo, valor], index) => (
              <div
                key={titulo}
                className={`min-w-0 rounded-xl border border-white/15 border-t-2 bg-black/85 p-4 sm:p-5 ${
                  index < 4
                    ? "border-t-[#087a43]"
                    : "border-t-[#b3202b]"
                }`}
              >
                <p className="break-words text-[10px] font-bold tracking-[0.08em] text-zinc-300 sm:text-xs">
                  {titulo}
                </p>

                <p className="mt-3 text-3xl font-black tabular-nums text-[#e8c76c] sm:text-4xl">
                  {valor}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="titulo-historico"
          className="mt-10"
        >
          <div className="border-l-4 border-[#b3202b] pl-4">
            <h2
              id="titulo-historico"
              className="text-xl font-black sm:text-2xl"
            >
              HISTÓRICO POR EDIÇÃO
            </h2>
            <p className="mt-1 text-xs font-bold tracking-wider text-[#e8c76c]">
              TODAS AS ÉPOCAS
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/20 bg-black/85">
            {historico.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-300">
                Ainda não existem participações registadas.
              </p>
            ) : (
              historico.map((item, index) => (
                <div
                  key={item.edicaoId}
                  className={`flex items-center justify-between gap-4 px-4 py-5 sm:px-6 ${
                    index > 0 ? "border-t border-white/10" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="break-words font-black text-white">
                      {item.roda}
                    </p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-zinc-300 sm:text-sm">
                      {item.edicao} · {formatarData(item.data)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="block text-xl font-black tabular-nums text-[#e8c76c]">
                      {item.pontos >= 0 ? "+" : ""}
                      {item.pontos}
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-zinc-400">
                      PONTOS
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="mt-12 border-t border-[#e8c76c]/40 pt-6 text-center text-xs font-bold tracking-[0.2em] text-[#e8c76c]">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}