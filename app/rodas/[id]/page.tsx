"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { consultarTodas } from "@/lib/consultar-todas";
import { PedirAcessoOrganizacao } from "./pedir-acesso-organizacao";
import { boldIMIP, veneerIMIP } from "../../fonts/identidade";

/* eslint-disable @next/next/no-img-element */

// ===================================================
// IMIP — PERFIL PÚBLICO DA RODA
//
// A personalização é lida da tabela:
// public.roda_personalizacao
//
// Os dados oficiais da roda mantêm-se na
// tabela public.rodas.
//
// Os rankings, edições, resultados e Frees
// de Campeão continuam ligados ao ID oficial.
//
// Esta página não escreve na base de dados.
// ===================================================

// ===================================================
// TIPOS
// ===================================================

type Roda = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
  descricao: string | null;
  logo_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  spotify_url: string | null;
  x_url: string | null;
};

type RodaPersonalizacao = {
  nome_publico: string | null;
  cidade_publica: string | null;
  distrito_publico: string | null;
  descricao: string | null;
  logo_url: string | null;
  capa_url: string | null;
  lema: string | null;
  cor_destaque: string;
  cor_fundo: string;
  cor_lema: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  spotify_url: string | null;
  x_url: string | null;
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

type Rede = {
  nome: string;
  url: string;
};

type FreeRegisto = {
  id: string;
  edicao_id: string;
  mc_id: string;
  titulo: string | null;
  video_url: string;
  criado_em: string;
};

type FreePublicado = {
  id: string;
  titulo: string;
  url: string;
  plataforma: "YouTube" | "Instagram" | "TikTok";
  youtubeId: string | null;
  edicaoId: string;
  edicaoNome: string;
  dataEdicao: string;
  mcId: string;
  mcNome: string;
  criadoEm: string;
};

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function corPublica(
  valor: string | null | undefined,
  alternativa: string,
): string {
  return valor && /^#[0-9a-fA-F]{6}$/.test(valor)
    ? valor
    : alternativa;
}

function semanaDoAno(data: string): number {
  const atual = new Date(`${data}T12:00:00`);
  const dia = atual.getUTCDay() || 7;

  atual.setUTCDate(
    atual.getUTCDate() + 4 - dia,
  );

  const inicio = new Date(
    Date.UTC(atual.getUTCFullYear(), 0, 1),
  );

  return Math.ceil(
    ((atual.getTime() - inicio.getTime()) / 86400000 + 1) / 7,
  );
}

function confronto(
  vencedor: string,
  derrotado: string,
): string {
  return `${vencedor}::${derrotado}`;
}

function formatarData(data: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${data}T12:00:00`));
}

function ligacaoSegura(
  valor: string | null,
): string | null {
  if (!valor?.trim()) return null;

  try {
    const url = new URL(valor.trim());

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

// ===================================================
// IDENTIFICAR PLATAFORMA DO VÍDEO
// ===================================================

function identificarVideo(
  valor: string,
): {
  url: string;
  plataforma: "YouTube" | "Instagram" | "TikTok";
  youtubeId: string | null;
} | null {
  const href = ligacaoSegura(valor);

  if (!href) return null;

  const url = new URL(href);
  const dominio = url.hostname.toLowerCase();
  const caminho = url.pathname;

  const youtube = [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
  ];

  if (youtube.includes(dominio)) {
    let id = "";

    if (dominio === "youtu.be") {
      id = caminho.split("/")[1] ?? "";
    } else if (caminho === "/watch") {
      id = url.searchParams.get("v") ?? "";
    } else if (/^\/(shorts|embed|live)\//.test(caminho)) {
      id = caminho.split("/")[2] ?? "";
    }

    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
      return null;
    }

    return {
      url: href,
      plataforma: "YouTube",
      youtubeId: id,
    };
  }

  if (
    ["instagram.com", "www.instagram.com"].includes(
      dominio,
    )
  ) {
    return {
      url: href,
      plataforma: "Instagram",
      youtubeId: null,
    };
  }

  if (
    [
      "tiktok.com",
      "www.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ].includes(dominio)
  ) {
    return {
      url: href,
      plataforma: "TikTok",
      youtubeId: null,
    };
  }

  return null;
}

// ===================================================
// TÍTULO DAS SECÇÕES
// ===================================================

function TituloSecao({
  numero,
  etiqueta,
  titulo,
  descricao,
}: {
  numero: string;
  etiqueta: string;
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="mb-7 flex items-end gap-4 border-b border-[#d6b56d]/25 pb-5 sm:gap-6">
      <span
        aria-hidden="true"
        className="text-5xl font-black leading-none text-[#d6b56d]/30 sm:text-6xl"
      >
        {numero}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d6b56d]">
          {etiqueta}
        </p>

        <h2
          className={`${boldIMIP.className} mt-2 break-words text-2xl font-bold uppercase leading-none text-white sm:text-4xl`}
        >
          {titulo}
        </h2>

        {descricao && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {descricao}
          </p>
        )}
      </div>
    </div>
  );
}

// ===================================================
// LOGÓTIPO DA RODA
// ===================================================

function LogotipoRoda({
  roda,
  corDestaque,
}: {
  roda: Roda;
  corDestaque: string;
}) {
  const [erroImagem, setErroImagem] = useState(false);

  useEffect(() => {
    setErroImagem(false);
  }, [roda.logo_url]);

  const url = ligacaoSegura(roda.logo_url);

  const inicial =
    roda.nome.trim().charAt(0).toUpperCase() || "R";

  return (
    <div
      className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-2xl border-2 bg-[#080d0a] p-4 shadow-2xl sm:w-48 lg:w-56"
      style={{ borderColor: corDestaque }}
    >
      {url && !erroImagem ? (
        <img
          src={url}
          alt={`Logótipo de ${roda.nome}`}
          className="h-full w-full object-contain"
          onError={() => setErroImagem(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#083c29] via-black to-[#4a101d] text-7xl font-black"
          style={{ color: corDestaque }}
          role="img"
          aria-label={`Identidade de ${roda.nome}`}
        >
          {inicial}
        </div>
      )}
    </div>
  );
}

// ===================================================
// CARTÃO DO PÓDIO
// ===================================================

function CartaoPodio({
  mc,
  posicao,
}: {
  mc: LinhaRanking;
  posicao: number;
}) {
  const cor =
    posicao === 1
      ? "#e7c56f"
      : posicao === 2
        ? "#c6cbd0"
        : "#cb8b63";

  const etiqueta =
    posicao === 1
      ? "1.º CLASSIFICADO"
      : posicao === 2
        ? "2.º CLASSIFICADO"
        : "3.º CLASSIFICADO";

  return (
    <Link
      href={`/mcs/${mc.id}`}
      className="group relative flex min-h-56 flex-col justify-between overflow-hidden border border-white/15 bg-[#0b1510] p-5 transition hover:-translate-y-1 hover:border-[#d6b56d] sm:p-6"
      style={{ borderTop: `5px solid ${cor}` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -top-9 text-[115px] font-black leading-none opacity-[0.08]"
        style={{ color: cor }}
      >
        {posicao}
      </div>

      <div className="relative">
        <span
          className="inline-flex h-11 w-11 items-center justify-center border text-xl font-black"
          style={{
            borderColor: cor,
            color: cor,
          }}
        >
          {posicao}º
        </span>

        <p
          className="mt-5 text-[10px] font-black uppercase tracking-[0.17em]"
          style={{ color: cor }}
        >
          {etiqueta}
        </p>

        <h3
          className={`${boldIMIP.className} mt-2 break-words text-2xl font-bold uppercase leading-tight text-white sm:text-3xl`}
        >
          {mc.nome}
        </h3>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3 border-t border-white/15 pt-4">
        <div>
          <p
            className="text-4xl font-black tabular-nums"
            style={{ color: cor }}
          >
            {mc.pontos}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Pontos
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-black text-white">
            {mc.vitorias20} × 2–0
          </p>

          <p className="mt-1 text-xs text-zinc-400">
            {mc.participacoes} participações
          </p>
        </div>
      </div>

      <p className="relative mt-4 text-xs font-black text-[#d6b56d]">
        VER PERFIL DO MC ↗
      </p>
    </Link>
  );
}

// ===================================================
// VÍDEO DO ÚLTIMO CAMPEÃO
// ===================================================

function FreeEmDestaque({
  free,
}: {
  free: FreePublicado;
}) {
  const [reproduzir, setReproduzir] =
    useState(false);

  useEffect(() => {
    setReproduzir(false);
  }, [free.id]);

  return (
    <div className="overflow-hidden border border-[#d6b56d]/50 bg-[#091b13]">
      <div className="flex h-[5px]">
        <span className="w-[43%] bg-[#087a43]" />
        <span className="w-[14%] bg-[#d6b56d]" />
        <span className="flex-1 bg-[#b82535]" />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-[#123b29] via-[#050907] to-[#44101a]">
          {free.youtubeId && reproduzir ? (
            <iframe
              title={`Free de Campeão — ${free.mcNome}`}
              src={`https://www.youtube-nocookie.com/embed/${free.youtubeId}?autoplay=1`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : free.youtubeId ? (
            <button
              type="button"
              onClick={() => setReproduzir(true)}
              className="group relative h-full w-full overflow-hidden"
              aria-label={`Reproduzir Free de Campeão de ${free.mcNome}`}
            >
              <img
                src={`https://i.ytimg.com/vi/${free.youtubeId}/hqdefault.jpg`}
                alt={`Vídeo do Free de Campeão de ${free.mcNome}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition group-hover:scale-105 group-hover:opacity-90"
              />

              <span className="absolute inset-0 bg-black/25" />

              <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/70 text-3xl text-white transition group-hover:scale-110">
                ▶
              </span>

              <span className="absolute bottom-4 left-4 bg-black/85 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#e7c56f]">
                REPRODUZIR FREE ↗
              </span>
            </button>
          ) : (
            <a
              href={free.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full w-full flex-col items-center justify-center gap-4 text-center transition hover:bg-white/5"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#d6b56d] bg-black/70 text-3xl text-white">
                ▶
              </span>

              <span className="px-4 text-xs font-black uppercase tracking-wider text-[#d6b56d]">
                VER NO {free.plataforma} ↗
              </span>
            </a>
          )}
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e7c56f]">
            ÚLTIMO FREE DE CAMPEÃO PUBLICADO
          </p>

          <h3
            className={`${boldIMIP.className} mt-4 break-words text-3xl font-bold uppercase leading-tight text-white sm:text-4xl`}
          >
            {free.mcNome}
          </h3>

          <p className="mt-4 text-base font-black text-[#d6b56d]">
            {free.titulo}
          </p>

          <p className="mt-3 break-words text-sm text-zinc-300">
            {free.edicaoNome}
          </p>

          <p className="mt-1 text-xs text-zinc-400">
            {formatarData(free.dataEdicao)}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/mcs/${free.mcId}`}
              className="inline-flex min-h-11 items-center border border-[#d6b56d] px-4 py-3 text-xs font-black text-[#d6b56d] hover:bg-white/5"
            >
              PERFIL DO CAMPEÃO ↗
            </Link>

            <a
              href={free.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center border border-white/30 px-4 py-3 text-xs font-black text-white hover:bg-white/5"
            >
              ABRIR NO {free.plataforma.toUpperCase()} ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================
// PÁGINA PÚBLICA DA RODA
// ===================================================

export default function RankingRodaPage() {
  const params = useParams();

  const rodaId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [roda, setRoda] =
    useState<Roda | null>(null);

  const [personalizacao, setPersonalizacao] =
    useState<RodaPersonalizacao | null>(null);

  const [erroPersonalizacao, setErroPersonalizacao] =
    useState("");

  const [epocas, setEpocas] =
    useState<Epoca[]>([]);

  const [epocaId, setEpocaId] =
    useState("");

  const [edicoes, setEdicoes] =
    useState<Edicao[]>([]);

  const [confirmadas, setConfirmadas] =
    useState<Set<string>>(new Set());

  const [temporada, setTemporada] =
    useState<number | null>(null);

  const [ranking, setRanking] =
    useState<LinhaRanking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [
    mensagemPartilha,
    setMensagemPartilha,
  ] = useState("");

  const [freesCampeao, setFreesCampeao] =
    useState<FreePublicado[]>([]);

  const [aCarregarFrees, setACarregarFrees] =
    useState(true);

  const [erroFrees, setErroFrees] =
    useState("");

  // =================================================
  // CARREGAR A RODA E A PERSONALIZAÇÃO
  // =================================================

  useEffect(() => {
    if (!rodaId) return;

    async function carregarRoda() {
      setLoading(true);
      setErro("");
      setErroPersonalizacao("");
      setPersonalizacao(null);

      try {
        const {
          data: rodaData,
          error: rodaError,
        } = await supabase
          .from("rodas")
          .select(
            "id,nome,cidade,distrito,descricao,logo_url,instagram_url,youtube_url,tiktok_url,spotify_url,x_url",
          )
          .eq("id", rodaId)
          .single();

        if (rodaError || !rodaData) {
          throw new Error(
            "Roda não encontrada.",
          );
        }

        setRoda(rodaData as Roda);

        // Ler os dados visuais separadamente.
        // Uma falha de personalização não
        // deve apagar os resultados da roda.

        const {
          data: visual,
          error: erroVisual,
        } = await supabase
          .from("roda_personalizacao")
          .select(
            "nome_publico,cidade_publica,distrito_publico,descricao,logo_url,capa_url,lema,cor_destaque,cor_fundo,cor_lema,instagram_url,youtube_url,tiktok_url,spotify_url,x_url",
          )
          .eq("roda_id", rodaId)
          .maybeSingle();

        if (erroVisual) {
          console.error(
            "Personalização da roda:",
            erroVisual,
          );

          setErroPersonalizacao(
            "Não foi possível carregar a personalização. A identidade oficial continua disponível.",
          );
        } else {
          setPersonalizacao(
            (visual ?? null) as RodaPersonalizacao | null,
          );
        }

        // O carregamento original das
        // edições continua independente
        // dos campos de personalização.

        const todasEdicoes =
          await consultarTodas<Edicao>(
            (inicio, fim) =>
              supabase
                .from("edicoes")
                .select(
                  "id,epoca_id,nome,data_edicao,numero_temporada,numero_edicao",
                )
                .eq("roda_id", rodaId)
                .order("data_edicao", {
                  ascending: false,
                })
                .order("id")
                .range(inicio, fim),
          );

        const idsEpocas = [
          ...new Set(
            todasEdicoes.map(
              (item) => item.epoca_id,
            ),
          ),
        ];

        if (idsEpocas.length === 0) {
          setEpocas([]);
          setEpocaId("");
          setEdicoes([]);
          setRanking([]);
          setConfirmadas(new Set());
          setTemporada(null);
          return;
        }

        const {
          data: epocasData,
          error: epocasError,
        } = await supabase
          .from("epocas")
          .select("id,ano,nome,estado")
          .in("id", idsEpocas)
          .order("ano", {
            ascending: false,
          });

        if (epocasError) {
          throw new Error(
            "Não foi possível carregar as épocas.",
          );
        }

        const lista =
          (epocasData ?? []) as Epoca[];

        setEpocas(lista);

        setEpocaId(
          (
            lista.find(
              (item) => item.estado === "ativa",
            ) ?? lista[0]
          )?.id ?? "",
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

  // =================================================
  // CARREGAR OS FREES DE CAMPEÃO
  // =================================================

  useEffect(() => {
    if (!rodaId) return;

    let ativo = true;

    async function carregarFrees() {
      setACarregarFrees(true);
      setErroFrees("");
      setFreesCampeao([]);

      try {
        const {
          data: registos,
          error: erroConsulta,
        } = await supabase
          .from("frees_campeao")
          .select(
            "id,edicao_id,mc_id,titulo,video_url,criado_em",
          )
          .eq("roda_id", rodaId)
          .eq("estado", "publicado")
          .order("criado_em", {
            ascending: false,
          })
          .limit(250);

        if (erroConsulta) {
          throw new Error(
            erroConsulta.message,
          );
        }

        if (!ativo || !registos?.length) {
          return;
        }

        const frees =
          registos as FreeRegisto[];

        const idsEdicoes = [
          ...new Set(
            frees.map(
              (free) => free.edicao_id,
            ),
          ),
        ];

        const idsMcs = [
          ...new Set(
            frees.map(
              (free) => free.mc_id,
            ),
          ),
        ];

        const [
          respostaEdicoes,
          respostaMcs,
        ] = await Promise.all([
          supabase
            .from("edicoes")
            .select(
              "id,roda_id,nome,data_edicao",
            )
            .in("id", idsEdicoes),

          supabase
            .from("mcs")
            .select(
              "id,nome_artistico",
            )
            .in("id", idsMcs),
        ]);

        if (respostaEdicoes.error) {
          throw new Error(
            respostaEdicoes.error.message,
          );
        }

        if (respostaMcs.error) {
          throw new Error(
            respostaMcs.error.message,
          );
        }

        if (!ativo) return;

        const edicaoPorId = new Map(
          (respostaEdicoes.data ?? []).map(
            (edicao) => [
              edicao.id,
              edicao,
            ],
          ),
        );

        const mcPorId = new Map(
          (respostaMcs.data ?? []).map(
            (mc) => [
              mc.id,
              mc.nome_artistico,
            ],
          ),
        );

        const publicados: FreePublicado[] =
          frees.flatMap((free) => {
            const edicao =
              edicaoPorId.get(
                free.edicao_id,
              );

            const mcNome =
              mcPorId.get(
                free.mc_id,
              );

            const video =
              identificarVideo(
                free.video_url,
              );

            if (
              !edicao ||
              edicao.roda_id !== rodaId ||
              !mcNome ||
              !video
            ) {
              return [];
            }

            return [
              {
                id: free.id,

                titulo:
                  free.titulo?.trim() ||
                  `Free de Campeão — ${mcNome}`,

                url: video.url,

                plataforma:
                  video.plataforma,

                youtubeId:
                  video.youtubeId,

                edicaoId:
                  free.edicao_id,

                edicaoNome:
                  edicao.nome,

                dataEdicao:
                  edicao.data_edicao,

                mcId:
                  free.mc_id,

                mcNome,

                criadoEm:
                  free.criado_em,
              },
            ];
          });

        // Ordenar pela data da edição,
        // não pela data do carregamento.

        publicados.sort(
          (a, b) =>
            b.dataEdicao.localeCompare(
              a.dataEdicao,
            ) ||
            b.criadoEm.localeCompare(
              a.criadoEm,
            ),
        );

        setFreesCampeao(publicados);
      } catch (falha) {
        if (ativo) {
          setErroFrees(
            "Não foi possível carregar os Frees de Campeão publicados.",
          );

          console.error(
            "Frees de Campeão:",
            falha,
          );
        }
      } finally {
        if (ativo) {
          setACarregarFrees(false);
        }
      }
    }

    void carregarFrees();

    return () => {
      ativo = false;
    };
  }, [rodaId]);

  // =================================================
  // CARREGAR O RANKING DA ÉPOCA
  // =================================================

  useEffect(() => {
    if (!rodaId || !epocaId) return;

    async function carregarEpoca() {
      setLoading(true);
      setErro("");
      setRanking([]);

      try {
        const listaEdicoes =
          await consultarTodas<Edicao>(
            (inicio, fim) =>
              supabase
                .from("edicoes")
                .select(
                  "id,epoca_id,nome,data_edicao,numero_temporada,numero_edicao",
                )
                .eq("roda_id", rodaId)
                .eq("epoca_id", epocaId)
                .order("data_edicao", {
                  ascending: false,
                })
                .order("id")
                .range(inicio, fim),
          );

        setEdicoes(listaEdicoes);

        setTemporada(
          listaEdicoes.find(
            (item) =>
              item.numero_temporada != null,
          )?.numero_temporada ?? null,
        );

        const idsEdicoes =
          listaEdicoes.map(
            (item) => item.id,
          );

        if (idsEdicoes.length === 0) {
          setConfirmadas(new Set());
          return;
        }

        const [
          pontuacoes,
          batalhas,
        ] = await Promise.all([
          consultarTodas<Pontuacao>(
            (inicio, fim) =>
              supabase
                .from("pontuacoes")
                .select(
                  "id,mc_id,pontos,motivo,edicao_id,batalha_id",
                )
                .eq("epoca_id", epocaId)
                .in("edicao_id", idsEdicoes)
                .order("id")
                .range(inicio, fim),
          ),

          consultarTodas<Batalha>(
            (inicio, fim) =>
              supabase
                .from("batalhas")
                .select(
                  "id,edicao_id,vitoria_2_0",
                )
                .in("edicao_id", idsEdicoes)
                .order("id")
                .range(inicio, fim),
          ),
        ]);

        const idsConfirmadas =
          new Set(
            pontuacoes.map(
              (item) => item.edicao_id,
            ),
          );

        setConfirmadas(idsConfirmadas);

        const batalhasValidas =
          batalhas.filter(
            (item) =>
              idsConfirmadas.has(
                item.edicao_id,
              ),
          );

        const idsBatalhas =
          batalhasValidas.map(
            (item) => item.id,
          );

        const participacoes =
          idsBatalhas.length > 0
            ? await consultarTodas<Participacao>(
                (inicio, fim) =>
                  supabase
                    .from("participacoes")
                    .select(
                      "batalha_id,mc_id,lado,venceu",
                    )
                    .in("batalha_id", idsBatalhas)
                    .order("batalha_id")
                    .order("mc_id")
                    .range(inicio, fim),
              )
            : [];

        // ======================================
        // PONTUAÇÃO E DESEMPATES
        // LÓGICA ORIGINAL PRESERVADA
        // ======================================

        const pontos =
          new Map<string, number>();

        const vitorias20 =
          new Map<string, number>();

        const edicoesPorMc =
          new Map<
            string,
            Set<string>
          >();

        const confrontos =
          new Map<string, number>();

        const batalhaPorId = new Map(
          batalhasValidas.map(
            (item) => [
              item.id,
              item,
            ],
          ),
        );

        function adicionarPresenca(
          mcId: string,
          edicaoId: string,
        ) {
          if (!edicoesPorMc.has(mcId)) {
            edicoesPorMc.set(
              mcId,
              new Set(),
            );
          }

          edicoesPorMc
            .get(mcId)
            ?.add(edicaoId);
        }

        for (const item of pontuacoes) {
          pontos.set(
            item.mc_id,
            (pontos.get(item.mc_id) ?? 0) +
              item.pontos,
          );

          adicionarPresenca(
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
              (vitorias20.get(item.mc_id) ?? 0) +
                1,
            );
          }
        }

        const participantesPorBatalha =
          new Map<
            string,
            Participacao[]
          >();

        for (const item of participacoes) {
          const batalha =
            batalhaPorId.get(
              item.batalha_id,
            );

          if (!batalha) continue;

          adicionarPresenca(
            item.mc_id,
            batalha.edicao_id,
          );

          if (!pontos.has(item.mc_id)) {
            pontos.set(
              item.mc_id,
              0,
            );
          }

          if (
            item.venceu &&
            batalha.vitoria_2_0
          ) {
            vitorias20.set(
              item.mc_id,
              (vitorias20.get(item.mc_id) ?? 0) +
                1,
            );
          }

          const lista =
            participantesPorBatalha.get(
              item.batalha_id,
            ) ?? [];

          lista.push(item);

          participantesPorBatalha.set(
            item.batalha_id,
            lista,
          );
        }

        for (
          const participantes
          of participantesPorBatalha.values()
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
            const vencedor
            of vencedores
          ) {
            for (
              const derrotado
              of derrotados
            ) {
              if (
                vencedor.lado ===
                derrotado.lado
              ) {
                continue;
              }

              const chave = confronto(
                vencedor.mc_id,
                derrotado.mc_id,
              );

              confrontos.set(
                chave,
                (confrontos.get(chave) ?? 0) +
                  1,
              );
            }
          }
        }

        const idsMcs = [
          ...pontos.keys(),
        ];

        if (idsMcs.length === 0) {
          setRanking([]);
          return;
        }

        const {
          data: mcsData,
          error: mcsError,
        } = await supabase
          .from("mcs")
          .select(
            "id,nome_artistico,por_confirmar",
          )
          .in("id", idsMcs);

        if (mcsError) {
          throw new Error(
            "Não foi possível carregar os MCs.",
          );
        }

        const linhas: LinhaRanking[] = (
          (mcsData ?? []) as Mc[]
        )
          .map((mc) => ({
            id: mc.id,

            nome: `${mc.nome_artistico}${
              mc.por_confirmar
                ? " (sem registo)"
                : ""
            }`,

            pontos:
              pontos.get(mc.id) ?? 0,

            vitorias20:
              vitorias20.get(mc.id) ?? 0,

            participacoes:
              edicoesPorMc.get(mc.id)
                ?.size ?? 0,
          }))
          .sort((a, b) => {
            if (a.pontos !== b.pontos) {
              return b.pontos - a.pontos;
            }

            if (
              a.vitorias20 !==
              b.vitorias20
            ) {
              return (
                b.vitorias20 -
                a.vitorias20
              );
            }

            const vitoriasA =
              confrontos.get(
                confronto(
                  a.id,
                  b.id,
                ),
              ) ?? 0;

            const vitoriasB =
              confrontos.get(
                confronto(
                  b.id,
                  a.id,
                ),
              ) ?? 0;

            if (vitoriasA !== vitoriasB) {
              return (
                vitoriasB -
                vitoriasA
              );
            }

            if (
              a.participacoes !==
              b.participacoes
            ) {
              return (
                b.participacoes -
                a.participacoes
              );
            }

            return a.nome.localeCompare(
              b.nome,
              "pt",
            );
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

  // =================================================
  // PARTILHAR A PÁGINA DA RODA
  // =================================================

  async function partilharRoda() {
    if (!roda) return;

    const origem =
      window.location.hostname === "localhost"
        ? "https://nacional-de-rua.rodasdeimproviso.workers.dev"
        : window.location.origin;

    const url =
      `${origem}/rodas/${encodeURIComponent(roda.id)}`;

    setMensagemPartilha("");

    if (
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: `${nomeApresentacao} | IMIP`,
          text:
            `Conhece a roda ${nomeApresentacao} no IMIP.`,
          url,
        });

        return;
      } catch (falha) {
        if (
          falha instanceof Error &&
          falha.name === "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);

      setMensagemPartilha(
        "Ligação pública copiada.",
      );
    } catch {
      setMensagemPartilha(
        "Não foi possível copiar. Usa o endereço público do IMIP.",
      );
    }
  }

  // =================================================
  // IDENTIDADE VISUAL — SEM ALTERAR A RODA
  // =================================================

  const nomeApresentacao =
    personalizacao?.nome_publico?.trim() ||
    roda?.nome ||
    "";

  const rodaVisual: Roda | null = roda
    ? {
        ...roda,

        nome:
          nomeApresentacao,

        cidade:
          personalizacao
            ? personalizacao.cidade_publica
            : roda.cidade,

        distrito:
          personalizacao
            ? personalizacao.distrito_publico
            : roda.distrito,

        descricao:
          personalizacao
            ? personalizacao.descricao
            : roda.descricao,

        logo_url:
          personalizacao
            ? personalizacao.logo_url
            : roda.logo_url,

        instagram_url:
          personalizacao
            ? personalizacao.instagram_url
            : roda.instagram_url,

        youtube_url:
          personalizacao
            ? personalizacao.youtube_url
            : roda.youtube_url,

        tiktok_url:
          personalizacao
            ? personalizacao.tiktok_url
            : roda.tiktok_url,

        spotify_url:
          personalizacao
            ? personalizacao.spotify_url
            : roda.spotify_url,

        x_url:
          personalizacao
            ? personalizacao.x_url
            : roda.x_url,
      }
    : null;

  const corDestaque = corPublica(
    personalizacao?.cor_destaque,
    "#d6b56d",
  );

  const corFundo = corPublica(
    personalizacao?.cor_fundo,
    "#07160f",
  );

  const corLema = corPublica(
    personalizacao?.cor_lema,
    "#ffffff",
  );

  const lemaPublico =
    personalizacao?.lema?.trim() ||
    "A RUA TEM VOZ.";

  const imagemCapa = ligacaoSegura(
    personalizacao?.capa_url ?? null,
  );

  // =================================================
  // DADOS PARA APRESENTAÇÃO
  // =================================================

  const ultimaEdicao =
    edicoes[0] ?? null;

  const ano =
    epocas.find(
      (item) => item.id === epocaId,
    )?.ano;

  const temporadas = [
    ...new Set(
      edicoes
        .map(
          (item) =>
            item.numero_temporada,
        )
        .filter(
          (
            numero,
          ): numero is number =>
            numero != null,
        ),
    ),
  ].sort((a, b) => b - a);

  const edicoesVisiveis =
    edicoes.filter(
      (item) =>
        temporada == null ||
        item.numero_temporada ===
          temporada,
    );

  const nomeLocal =
    [
      rodaVisual?.cidade,
      rodaVisual?.distrito,
    ]
      .filter(Boolean)
      .join(" · ");

  const redes: Rede[] = rodaVisual
    ? [
        {
          nome: "Instagram",
          url: rodaVisual.instagram_url,
        },
        {
          nome: "YouTube",
          url: rodaVisual.youtube_url,
        },
        {
          nome: "TikTok",
          url: rodaVisual.tiktok_url,
        },
        {
          nome: "Spotify",
          url: rodaVisual.spotify_url,
        },
        {
          nome: "X",
          url: rodaVisual.x_url,
        },
      ]
        .map((item) => ({
          nome: item.nome,
          url:
            ligacaoSegura(item.url) ?? "",
        }))
        .filter(
          (item) => Boolean(item.url),
        )
    : [];

  const totalConfirmadas =
    edicoes.filter(
      (item) =>
        confirmadas.has(
          item.id,
        ),
    ).length;

  const numeroTemporadas =
    temporadas.length;

  const emTestes =
    ano === 2026;

  // =================================================
  // INTERFACE
  // =================================================

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* FUNDO DO IMIP */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/fundo-tijolos.png')",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/50"
      />

      <div className="relative mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        {/* NAVEGAÇÃO PRINCIPAL */}

        <nav
          aria-label="Navegação da roda"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/rodas"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-black/85 px-4 py-3 text-xs font-black uppercase tracking-wide text-[#f0d58e] transition hover:bg-[#14251a]"
          >
            ← VOLTAR ÀS RODAS
          </Link>

          <Link
            href="/ranking"
            className="inline-flex min-h-11 items-center border border-white/25 bg-black/85 px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:border-[#d6b56d]"
          >
            RANKING NACIONAL ↗
          </Link>
        </nav>

        {rodaVisual && (
          <>
            {/* =====================================
                CAPA DA RODA
                ===================================== */}

            <header
              className="mt-6 overflow-hidden border shadow-2xl"
              style={{
                borderColor: `${corDestaque}60`,
                backgroundColor: corFundo,
              }}
            >
              <div
                aria-hidden="true"
                className="flex h-[6px]"
              >
                <span className="w-[43%] bg-[#087a43]" />
                <span className="w-[14%] bg-[#d6b56d]" />
                <span className="flex-1 bg-[#b82535]" />
              </div>

              <div className="relative min-h-52 overflow-hidden bg-gradient-to-br from-[#092d1e] via-[#0a1711] to-[#511420] px-5 py-7 sm:min-h-64 sm:px-9 sm:py-8">
                {imagemCapa && (
                  <>
                    <img
                      src={imagemCapa}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/15" />
                  </>
                )}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.09]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-17deg,transparent 0px,transparent 31px,#ffffff 32px,#ffffff 33px)",
                  }}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-32 h-80 w-80 rotate-12 border-[30px] opacity-20"
                  style={{
                    borderColor: corDestaque,
                  }}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-28 right-1/4 h-52 w-52 -rotate-12 border-[22px] border-[#b82535]/40"
                />

                <div className="relative flex min-h-40 flex-col justify-between gap-10 sm:min-h-48">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/80">
                      IMIP / RODAS DE IMPROVISO
                    </span>

                    <span className="border border-white/30 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      NACIONAL DE RUA
                    </span>
                  </div>

                  <div>
                    <p
                      className={`${veneerIMIP.className} max-w-2xl break-words text-3xl font-normal uppercase leading-none sm:text-5xl`}
                      style={{
                        color: corLema,
                      }}
                    >
                      {lemaPublico}
                    </p>

                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#e7c56f]">
                      A CULTURA FAZ-SE NAS RODAS.
                    </p>

                    <div
                      className="mt-5 h-1 w-28"
                      style={{
                        backgroundColor:
                          corDestaque,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* IDENTIDADE DA RODA */}

              <div
                className="grid gap-8 px-5 py-8 sm:px-9 lg:grid-cols-[1fr_260px] lg:gap-10 lg:py-10"
                style={{
                  backgroundColor:
                    corFundo,
                }}
              >
                <div className="flex min-w-0 flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                  <LogotipoRoda
                    roda={rodaVisual}
                    corDestaque={corDestaque}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{
                        color: corDestaque,
                      }}
                    >
                      IDENTIDADE DA RODA
                    </p>

                    <h1
                      className={`${boldIMIP.className} mt-3 break-words text-[clamp(2.6rem,5.5vw,4.8rem)] font-bold uppercase leading-[0.95] tracking-tight text-white`}
                    >
                      {rodaVisual.nome}
                    </h1>

                    <p className="mt-5 text-sm font-medium text-zinc-200 sm:text-base">
                      {nomeLocal ||
                        "Localização não indicada"}
                    </p>

                    {/* REDES SOCIAIS */}

                    {redes.length > 0 && (
                      <nav
                        aria-label={`Redes sociais de ${rodaVisual.nome}`}
                        className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start"
                      >
                        {redes.map((rede) => (
                          <a
                            key={rede.nome}
                            href={rede.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center border border-white/30 bg-black/30 px-3 py-2 text-xs font-black text-white transition hover:border-[#d6b56d] hover:text-[#d6b56d]"
                          >
                            {rede.nome} ↗
                          </a>
                        ))}
                      </nav>
                    )}

                    {/* PARTILHA */}

                    <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
                      <button
                        type="button"
                        onClick={() =>
                          void partilharRoda()
                        }
                        className="min-h-11 border border-[#d6b56d] bg-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#101713] transition hover:bg-[#f0d58e]"
                      >
                        ↗ PARTILHAR RODA
                      </button>

                      <a
                        href="#classificacao"
                        className="inline-flex min-h-11 items-center border border-white/35 bg-black/30 px-5 py-3 text-xs font-black uppercase text-white transition hover:bg-white/10"
                      >
                        VER RANKING ↓
                      </a>
                    </div>

                    {mensagemPartilha && (
                      <p
                        role="status"
                        className="mt-3 text-xs font-bold text-[#d6b56d]"
                      >
                        {mensagemPartilha}
                      </p>
                    )}
                  </div>
                </div>

                {/* INFORMAÇÃO EM DESTAQUE */}

                <aside className="border border-[#d6b56d]/25 bg-black/50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#d6b56d]">
                    ACOMPANHA ESTA RODA
                  </p>

                  <div className="mt-5 border-b border-white/15 pb-5">
                    <p className="text-xs uppercase tracking-wider text-zinc-400">
                      Época selecionada
                    </p>

                    <p
                      className={`${boldIMIP.className} mt-2 text-3xl font-bold text-white`}
                    >
                      {ano ?? "—"}
                    </p>

                    {emTestes && (
                      <p className="mt-2 text-xs font-bold text-[#e7c56f]">
                        ÉPOCA DE TESTES
                      </p>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wider text-zinc-400">
                      Última edição registada
                    </p>

                    {ultimaEdicao ? (
                      <>
                        <p className="mt-2 break-words text-base font-black text-white">
                          {ultimaEdicao.nome}
                        </p>

                        <p className="mt-2 text-xs text-zinc-300">
                          {formatarData(
                            ultimaEdicao.data_edicao,
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-300">
                        Sem edições nesta época.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </header>

            {/* NAVEGAÇÃO DAS SECÇÕES */}

            <nav
              aria-label="Secções da roda"
              className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
            >
              {[
                ["#identidade", "A RODA"],
                ["#frees-campeao", "FREE DE CAMPEÃO"],
                ["#classificacao", "RANKING"],
                ["#edicoes", "EDIÇÕES"],
                ["#galeria", "GALERIA"],
              ].map(([href, nome]) => (
                <a
                  key={href}
                  href={href}
                  className="border border-[#d6b56d]/25 bg-black/85 px-3 py-4 text-center text-xs font-black uppercase tracking-wide text-white transition hover:border-[#d6b56d] hover:text-[#d6b56d]"
                >
                  {nome} ↓
                </a>
              ))}
            </nav>

            {/* =====================================
                A HISTÓRIA DA RODA
                ===================================== */}

            <section
              id="identidade"
              className="mt-10 scroll-mt-8 border border-white/10 bg-[#091b13]/95 p-5 sm:p-8"
            >
              <TituloSecao
                numero="01"
                etiqueta="A NOSSA IDENTIDADE"
                titulo="A NOSSA RODA"
                descricao="Cada batalha tem um lugar. Cada roda tem uma história."
              />

              {rodaVisual.descricao?.trim() ? (
                <p className="max-w-4xl whitespace-pre-line break-words text-base leading-8 text-white/90 sm:text-lg">
                  {rodaVisual.descricao}
                </p>
              ) : (
                <div className="border-l-4 border-[#d6b56d] pl-5">
                  <p className="max-w-3xl text-sm leading-7 text-zinc-300">
                    Esta roda ainda não publicou
                    a sua apresentação.
                    Este espaço está reservado
                    para a sua história,
                    identidade e contributo
                    para a cultura de improviso.
                  </p>
                </div>
              )}

              <div className="mt-7 border-t border-white/15 pt-6">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.17em] text-[#d6b56d]">
                  ORGANIZAÇÃO E ACESSO
                </p>

                {roda && (
                  <PedirAcessoOrganizacao
                    rodaId={roda.id}
                    rodaNome={roda.nome}
                  />
                )}
              </div>
            </section>
          </>
        )}

        {/* A PERSONALIZAÇÃO É INDEPENDENTE
            DOS RESULTADOS OFICIAIS */}

        {erroPersonalizacao && (
          <p
            role="status"
            className="mt-5 border-l-4 border-[#d6b56d] bg-black/80 px-5 py-3 text-xs text-zinc-300"
          >
            {erroPersonalizacao}
          </p>
        )}

        {/* CARREGAMENTO E ERROS */}

        {loading && (
          <div
            role="status"
            className="mt-10 border border-[#d6b56d]/30 bg-black/90 px-5 py-6 text-sm font-black uppercase text-[#d6b56d]"
          >
            A CARREGAR DADOS DA RODA...
          </div>
        )}

        {erro && (
          <div
            role="alert"
            className="mt-10 border border-red-700 bg-black/90 px-5 py-6 text-sm font-bold text-red-300"
          >
            {erro}
          </div>
        )}

        {!loading && !erro && roda && (
          <>
            {/* =====================================
                FREES DE CAMPEÃO
                ===================================== */}

            <section
              id="frees-campeao"
              className="mt-10 scroll-mt-8 border border-[#d6b56d]/30 bg-black/90 p-5 sm:p-8"
            >
              <TituloSecao
                numero="02"
                etiqueta="A ÚLTIMA PALAVRA É DO VENCEDOR"
                titulo="FREE DE CAMPEÃO"
                descricao="Os vídeos gravados pelos campeões desta roda, edição após edição."
              />

              {aCarregarFrees ? (
                <p
                  role="status"
                  className="border border-white/15 bg-[#091b13] p-6 text-sm font-bold text-[#d6b56d]"
                >
                  A CARREGAR OS FREES DE CAMPEÃO...
                </p>
              ) : erroFrees ? (
                <p
                  role="alert"
                  className="border-l-4 border-[#b82535] bg-[#271016] p-5 text-sm text-red-200"
                >
                  {erroFrees}
                </p>
              ) : freesCampeao.length === 0 ? (
                <div className="flex min-h-60 flex-col items-center justify-center border border-dashed border-[#d6b56d]/35 bg-[#091b13]/85 p-6 text-center">
                  <span
                    aria-hidden="true"
                    className="text-5xl text-[#d6b56d]"
                  >
                    ▶
                  </span>

                  <p
                    className={`${boldIMIP.className} mt-5 text-2xl font-bold uppercase text-white sm:text-3xl`}
                  >
                    AQUI O CAMPEÃO TEM A ÚLTIMA PALAVRA.
                  </p>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
                    Ainda não existem Frees de Campeão
                    publicados nesta roda. Quando os
                    organizadores adicionarem os vídeos,
                    o mais recente ficará em destaque
                    e os restantes integrarão o arquivo.
                  </p>
                </div>
              ) : (
                <>
                  <FreeEmDestaque
                    free={freesCampeao[0]}
                  />

                  {freesCampeao.length > 1 && (
                    <div className="mt-9">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d6b56d]">
                        MEMÓRIAS DA RODA
                      </p>

                      <h3
                        className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase text-white sm:text-3xl`}
                      >
                        ARQUIVO DE CAMPEÕES
                      </h3>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {freesCampeao
                          .slice(1)
                          .map((free) => (
                            <article
                              key={free.id}
                              className="overflow-hidden border border-white/15 bg-[#0a1710] transition hover:border-[#d6b56d]"
                            >
                              <a
                                href={free.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-[#153a28] via-[#0a0f0c] to-[#48121e]"
                                aria-label={`Ver Free de Campeão de ${free.mcNome}`}
                              >
                                {free.youtubeId && (
                                  <img
                                    src={`https://i.ytimg.com/vi/${free.youtubeId}/hqdefault.jpg`}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                                  />
                                )}

                                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-black/70 text-xl text-white">
                                  ▶
                                </span>

                                <span className="absolute bottom-3 left-3 bg-black/85 px-2 py-1 text-[10px] font-black uppercase text-[#d6b56d]">
                                  {free.plataforma}
                                </span>
                              </a>

                              <div className="p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
                                  FREE DE CAMPEÃO
                                </p>

                                <h4 className="mt-2 break-words text-lg font-black uppercase text-white">
                                  {free.mcNome}
                                </h4>

                                <p className="mt-2 break-words text-sm text-zinc-300">
                                  {free.edicaoNome}
                                </p>

                                <p className="mt-1 text-xs text-zinc-400">
                                  {formatarData(
                                    free.dataEdicao,
                                  )}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-4 border-t border-white/15 pt-4 text-xs font-black">
                                  <a
                                    href={free.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#d6b56d] hover:text-[#f0d58e]"
                                  >
                                    VER FREE ↗
                                  </a>

                                  <Link
                                    href={`/mcs/${free.mcId}`}
                                    className="text-white hover:text-[#d6b56d]"
                                  >
                                    VER MC ↗
                                  </Link>
                                </div>
                              </div>
                            </article>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* =====================================
                RANKING DA RODA
                ===================================== */}

            <section
              id="classificacao"
              className="mt-10 scroll-mt-8 border border-white/10 bg-black/90 p-5 sm:p-8"
            >
              <TituloSecao
                numero="03"
                etiqueta="MERITOCRACIA EM AÇÃO"
                titulo="RANKING DA RODA"
                descricao="Classificação calculada a partir dos resultados registados nesta roda."
              />

              {/* SELEÇÃO DA ÉPOCA */}

              <div className="flex flex-col gap-5 border border-white/15 bg-[#0c1811] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d6b56d]">
                    CLASSIFICAÇÃO ANUAL
                  </p>

                  <h3
                    className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase text-white sm:text-3xl`}
                  >
                    {ano ?? "SEM ÉPOCA"}
                    {emTestes
                      ? " · TESTES"
                      : ""}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-300">
                    {ranking.length} MCs classificados
                  </p>
                </div>

                {epocas.length > 0 && (
                  <label className="block min-w-0 sm:w-64">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-zinc-300">
                      ANO DO RANKING
                    </span>

                    <select
                      value={epocaId}
                      onChange={(evento) =>
                        setEpocaId(
                          evento.target.value,
                        )
                      }
                      className="min-h-11 w-full border border-[#087a43] bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d6b56d]"
                    >
                      {epocas.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.ano === 2026
                            ? "2026 · Testes"
                            : `${item.ano}${
                                item.nome &&
                                item.nome !==
                                  String(item.ano)
                                  ? ` · ${item.nome}`
                                  : ""
                              }`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {emTestes && (
                <p className="mt-4 border-l-4 border-[#d6b56d] bg-[#171a13] px-4 py-4 text-xs leading-relaxed text-zinc-200">
                  <strong className="text-[#e7c56f]">
                    ÉPOCA DE TESTES — 2026.
                  </strong>
                  {" "}
                  Os resultados apresentados
                  servem para testar o sistema.
                  Não contam para a época
                  oficial nem para o apuramento
                  nacional.
                </p>
              )}

              {/* INDICADORES REAIS */}

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    etiqueta:
                      "MCs CLASSIFICADOS",
                    valor: ranking.length,
                  },
                  {
                    etiqueta:
                      "EDIÇÕES REGISTADAS",
                    valor: edicoes.length,
                  },
                  {
                    etiqueta:
                      "EDIÇÕES COM RESULTADOS",
                    valor: totalConfirmadas,
                  },
                  {
                    etiqueta:
                      "TEMPORADAS",
                    valor: numeroTemporadas,
                  },
                ].map((item, indice) => (
                  <div
                    key={item.etiqueta}
                    className={`border border-white/15 border-t-4 bg-[#0c1711] p-4 sm:p-5 ${
                      indice < 2
                        ? "border-t-[#087a43]"
                        : "border-t-[#b82535]"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-300">
                      {item.etiqueta}
                    </p>

                    <p className="mt-3 text-3xl font-black tabular-nums text-[#d6b56d] sm:text-4xl">
                      {item.valor}
                    </p>
                  </div>
                ))}
              </div>

              {/* PÓDIO DOS TRÊS PRIMEIROS */}

              {ranking.length > 0 && (
                <div className="mt-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                    OS PRIMEIROS CLASSIFICADOS
                  </p>

                  <h3
                    className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase text-white sm:text-3xl`}
                  >
                    DESTAQUES DA CLASSIFICAÇÃO
                  </h3>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {ranking
                      .slice(0, 3)
                      .map((mc, index) => (
                        <CartaoPodio
                          key={mc.id}
                          mc={mc}
                          posicao={index + 1}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* CLASSIFICAÇÃO COMPLETA */}

              <div className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d6b56d]">
                      TODOS OS PARTICIPANTES
                    </p>

                    <h3
                      className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase text-white sm:text-3xl`}
                    >
                      CLASSIFICAÇÃO COMPLETA
                    </h3>
                  </div>

                  <p className="text-xs font-bold text-zinc-400">
                    PONTOS · 2–0 · PARTICIPAÇÕES
                  </p>
                </div>

                <div className="mt-5 overflow-x-auto border border-white/20 bg-[#07100c]">
                  <div className="min-w-[530px]">
                    <div className="grid grid-cols-[48px_minmax(150px,1fr)_70px_52px_55px] items-center gap-2 bg-[#101b14] px-3 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-300 sm:grid-cols-[75px_minmax(170px,1fr)_100px_75px_90px] sm:px-6">
                      <span>POS.</span>
                      <span>MC</span>

                      <span className="text-right">
                        PONTOS
                      </span>

                      <span className="text-right">
                        2–0
                      </span>

                      <span className="text-right">
                        PART.
                      </span>
                    </div>

                    {ranking.map((mc, index) => {
                      const destaque =
                        index === 0
                          ? "#e7c56f"
                          : index === 1
                            ? "#c6cbd0"
                            : index === 2
                              ? "#cb8b63"
                              : "#d6b56d";

                      return (
                        <div
                          key={mc.id}
                          className={`grid grid-cols-[48px_minmax(150px,1fr)_70px_52px_55px] items-center gap-2 border-t border-white/10 px-3 py-4 text-xs transition hover:bg-white/5 sm:grid-cols-[75px_minmax(170px,1fr)_100px_75px_90px] sm:px-6 sm:py-5 sm:text-sm ${
                            index < 3
                              ? "bg-[#132016]/60"
                              : ""
                          }`}
                        >
                          <span
                            className="text-xl font-black tabular-nums sm:text-2xl"
                            style={{
                              color: destaque,
                            }}
                          >
                            {index + 1}º
                          </span>

                          <Link
                            href={`/mcs/${mc.id}`}
                            className="min-w-0 break-words font-black text-white transition hover:text-[#d6b56d]"
                          >
                            {mc.nome}
                            <span className="ml-1 text-[#d6b56d]">
                              ↗
                            </span>
                          </Link>

                          <span className="text-right text-lg font-black tabular-nums text-[#e7c56f] sm:text-xl">
                            {mc.pontos}
                          </span>

                          <span className="text-right font-black tabular-nums text-zinc-200">
                            {mc.vitorias20}
                          </span>

                          <span className="text-right font-black tabular-nums text-zinc-200">
                            {mc.participacoes}
                          </span>
                        </div>
                      );
                    })}

                    {ranking.length === 0 && (
                      <p className="border-t border-white/10 px-5 py-9 text-sm text-zinc-300">
                        Ainda não existem
                        pontuações registadas
                        nesta roda para a época
                        selecionada.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* =====================================
                HISTÓRICO DAS EDIÇÕES
                ===================================== */}

            <section
              id="edicoes"
              className="mt-10 scroll-mt-8 border border-white/10 bg-[#091b13]/95 p-5 sm:p-8"
            >
              <TituloSecao
                numero="04"
                etiqueta="A HISTÓRIA FAZ-SE EM CADA EDIÇÃO"
                titulo="HISTÓRICO DA RODA"
                descricao="Consulta as edições registadas e os resultados disponíveis."
              />

              <div className="flex flex-col gap-4 border border-white/15 bg-black/35 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#d6b56d]">
                    ÉPOCA SELECIONADA
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    {ano ?? "—"}
                    {emTestes
                      ? " · TESTES"
                      : ""}
                  </p>
                </div>

                {temporadas.length > 1 && (
                  <label className="block sm:w-60">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-zinc-300">
                      TEMPORADA
                    </span>

                    <select
                      value={temporada ?? ""}
                      onChange={(evento) =>
                        setTemporada(
                          Number(
                            evento.target.value,
                          ),
                        )
                      }
                      className="min-h-11 w-full border border-[#087a43] bg-[#080e0a] px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d6b56d]"
                    >
                      {temporadas.map((numero) => (
                        <option
                          key={numero}
                          value={numero}
                        >
                          {numero}.ª TEMPORADA
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {/* ÚLTIMA EDIÇÃO */}

              {ultimaEdicao && (
                <div className="mt-5 border-l-4 border-[#d6b56d] bg-black/50 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#d6b56d]">
                    ÚLTIMA EDIÇÃO REGISTADA NA ÉPOCA
                  </p>

                  <p className="mt-2 break-words text-base font-black text-white">
                    {ultimaEdicao.nome}
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                    {formatarData(
                      ultimaEdicao.data_edicao,
                    )}

                    {" · "}
                    Semana{" "}
                    {semanaDoAno(
                      ultimaEdicao.data_edicao,
                    )}

                    {ultimaEdicao.numero_temporada != null && (
                      <>
                        {" · "}
                        {ultimaEdicao.numero_temporada}.ª
                        temporada
                      </>
                    )}

                    {ultimaEdicao.numero_edicao != null && (
                      <>
                        {" · "}
                        {ultimaEdicao.numero_edicao}.ª
                        edição
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* LISTA DAS EDIÇÕES */}

              {edicoesVisiveis.length === 0 ? (
                <div className="mt-5 border border-white/15 bg-black/50 p-6">
                  <p className="text-sm text-zinc-300">
                    Ainda não existem
                    edições nesta temporada.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {edicoesVisiveis.map(
                    (edicao, index) => {
                      const confirmada =
                        confirmadas.has(
                          edicao.id,
                        );

                      const conteudo = (
                        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <span
                              aria-hidden="true"
                              className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#d6b56d]/40 bg-black/40 text-lg font-black tabular-nums text-[#d6b56d]"
                            >
                              {String(
                                edicao.numero_edicao ??
                                  edicoesVisiveis.length -
                                    index,
                              ).padStart(2, "0")}
                            </span>

                            <div className="min-w-0">
                              <p className="break-words text-base font-black text-white sm:text-lg">
                                {edicao.nome}
                              </p>

                              <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                                {formatarData(
                                  edicao.data_edicao,
                                )}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {edicao.numero_temporada !=
                                  null && (
                                  <span className="border border-white/15 px-2 py-1 text-[10px] font-bold text-zinc-300">
                                    {
                                      edicao.numero_temporada
                                    }
                                    .ª TEMPORADA
                                  </span>
                                )}

                                {edicao.numero_edicao !=
                                  null && (
                                  <span className="border border-white/15 px-2 py-1 text-[10px] font-bold text-zinc-300">
                                    {
                                      edicao.numero_edicao
                                    }
                                    .ª EDIÇÃO
                                  </span>
                                )}

                                <span className="border border-white/15 px-2 py-1 text-[10px] font-bold text-zinc-300">
                                  SEMANA{" "}
                                  {semanaDoAno(
                                    edicao.data_edicao,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 text-xs font-black uppercase tracking-wide ${
                              confirmada
                                ? "text-[#d6b56d]"
                                : "text-zinc-400"
                            }`}
                          >
                            {confirmada
                              ? "VER RESULTADOS ↗"
                              : "RESULTADOS POR CONFIRMAR"}
                          </span>
                        </div>
                      );

                      return confirmada ? (
                        <Link
                          key={edicao.id}
                          href={`/rodas/${rodaId}/edicoes/${edicao.id}`}
                          className="block border border-white/20 border-l-4 border-l-[#087a43] bg-black/65 p-5 transition hover:border-[#d6b56d] hover:bg-black/85"
                        >
                          {conteudo}
                        </Link>
                      ) : (
                        <div
                          key={edicao.id}
                          className="border border-white/10 border-l-4 border-l-zinc-600 bg-black/40 p-5"
                        >
                          {conteudo}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {/* =====================================
                GALERIA E VÍDEOS
                ===================================== */}

            <section
              id="galeria"
              className="mt-10 scroll-mt-8 border border-white/10 bg-black/90 p-5 sm:p-8"
            >
              <TituloSecao
                numero="05"
                etiqueta="OS MOMENTOS DA RUA"
                titulo="GALERIA & VÍDEOS"
                descricao="Um espaço dedicado aos acontecimentos, protagonistas e memórias desta roda."
              />

              <div className="grid gap-4 md:grid-cols-2">
                {/* FOTOGRAFIAS */}

                <div className="relative flex min-h-60 flex-col justify-between overflow-hidden border border-[#d6b56d]/30 bg-gradient-to-br from-[#143727] via-[#0b1711] to-[#08100b] p-6 sm:p-8">
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-12 -right-10 h-44 w-44 rotate-12 border-[18px] border-[#d6b56d]/15"
                  />

                  <div className="relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                      REGISTO FOTOGRÁFICO
                    </p>

                    <h3
                      className={`${boldIMIP.className} mt-4 text-3xl font-bold uppercase text-white sm:text-4xl`}
                    >
                      FOTOGRAFIAS
                    </h3>
                  </div>

                  <p className="relative mt-8 max-w-sm text-sm leading-7 text-zinc-300">
                    A galeria fotográfica da
                    roda está em preparação.
                    Ainda não existem imagens
                    disponibilizadas nesta secção.
                  </p>
                </div>

                {/* VÍDEOS */}

                <div className="relative flex min-h-60 flex-col justify-between overflow-hidden border border-[#b82535]/35 bg-gradient-to-br from-[#32101b] via-[#150c10] to-[#090c0a] p-6 sm:p-8">
                  <div
                    aria-hidden="true"
                    className="absolute -right-8 -top-12 h-44 w-44 rotate-12 border-[18px] border-[#b82535]/20"
                  />

                  <div className="relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e7c56f]">
                      BATALHAS E MELHORES MOMENTOS
                    </p>

                    <h3
                      className={`${boldIMIP.className} mt-4 text-3xl font-bold uppercase text-white sm:text-4xl`}
                    >
                      VÍDEOS & CORTES
                    </h3>
                  </div>

                  <p className="relative mt-8 max-w-sm text-sm leading-7 text-zinc-300">
                    Este espaço receberá
                    os vídeos e cortes
                    das batalhas quando
                    estiver disponível
                    a gestão de conteúdos
                    multimédia das rodas.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* RODAPÉ */}

        <footer className="mt-12 border-t border-[#d6b56d]/40 pt-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6b56d]">
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            IMIP · IMPROVISO MADE IN PORTUGAL
          </p>
        </footer>
      </div>
    </main>
  );
}