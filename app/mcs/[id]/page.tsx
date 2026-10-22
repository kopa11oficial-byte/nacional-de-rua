
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { consultarTodas } from "../../../lib/consultar-todas";
import { PedirAcessoMC } from "./pedir-acesso";
import { boldIMIP, veneerIMIP } from "../../fonts/identidade";

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

type PersonalizacaoMC = {
  mc_id: string;
  lema: string | null;
  cor_destaque: string;
  cor_fundo: string;
  cor_lema: string | null;
  capa_fotografia_id: string | null;
  fundo_fotografia_id: string | null;
  ordem_seccoes: string[];
};

type VideoMC = {
  id: string;
  titulo: string | null;
  tipo: string;
  url: string | null;
  storage_path: string | null;
  estado_publicacao: string;
  criado_em: string;
};

type FotoGaleria = {
  id: string;
  legenda: string | null;
  storage_path: string;
  ordem: number | null;
  estado_publicacao: string;
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

type Rede =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "spotify";

const statsIniciais: Estatisticas = {
  posicao: 0,
  pontos: 0,
  vitorias20: 0,
  participacoes: 0,
  batalhas: 0,
  vitorias: 0,
  derrotas: 0,
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function chaveConfronto(
  vencedorId: string,
  derrotadoId: string,
) {
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
        !dominios.includes(
          url.hostname.toLowerCase(),
        ))
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function corHexValida(
  cor: string | null | undefined,
): cor is string {
  return (
    typeof cor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(cor)
  );
}

// ==========================================
// TEXTO LEGÍVEL SOBRE A COR DE DESTAQUE
// ==========================================

function corTextoContraste(
  cor: string,
): string {
  if (!corHexValida(cor)) {
    return "#101713";
  }

  const vermelho = parseInt(
    cor.slice(1, 3),
    16,
  );

  const verde = parseInt(
    cor.slice(3, 5),
    16,
  );

  const azul = parseInt(
    cor.slice(5, 7),
    16,
  );

  const luminancia =
    0.299 * vermelho +
    0.587 * verde +
    0.114 * azul;

  return luminancia >= 150
    ? "#101713"
    : "#ffffff";
}

function urlVideo(
  video: VideoMC,
): string | null {
  if (video.tipo === "youtube") {
    return obterUrl(video.url, [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ]);
  }

  if (video.tipo === "instagram") {
    return obterUrl(video.url, [
      "instagram.com",
      "www.instagram.com",
    ]);
  }

  if (video.tipo === "tiktok") {
    return obterUrl(video.url, [
      "tiktok.com",
      "www.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ]);
  }

  // Não expor ficheiros de buckets privados.
  return null;
}

function miniaturaYoutube(
  valor: string | null,
): string | null {
  const href = obterUrl(valor, [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
  ]);

  if (!href) return null;

  const url = new URL(href);

  let id = "";

  if (url.hostname === "youtu.be") {
    id =
      url.pathname.split("/")[1] || "";
  } else if (url.pathname === "/watch") {
    id =
      url.searchParams.get("v") || "";
  } else if (
    /^\/(shorts|embed|live)\//.test(
      url.pathname,
    )
  ) {
    id =
      url.pathname.split("/")[2] || "";
  }

  return /^[A-Za-z0-9_-]{11}$/.test(id)
    ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    : null;
}

function publicado(estado: string) {
  return (
    estado === "publicado" ||
    estado === "published"
  );
}

// ==========================================
// ÍCONES DAS REDES SOCIAIS
// ==========================================

function IconeRede({
  rede,
}: {
  rede: Rede;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {rede === "instagram" && (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
          />
          <circle
            cx="17.5"
            cy="6.5"
            r=".8"
            fill="currentColor"
          />
        </>
      )}

      {rede === "youtube" && (
        <>
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="4"
          />
          <path
            d="m10 9 5 3-5 3Z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}

      {rede === "tiktok" && (
        <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47M14 3c0 4 2.5 6 6V6c-2.5 0-3-1.5-3-3Z" />
      )}

      {rede === "spotify" && (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M6.5 9c4-1.2 8-.7 11 1M7.5 12c3.3-.9 6.4-.5 9 1M8.5 15c2.5-.6 4.8-.3 7 1" />
        </>
      )}
    </svg>
  );
}

// ==========================================
// FOTOGRAFIA PRINCIPAL DO MC
// ==========================================

function FotografiaMC({
  url,
  nome,
}: {
  url: string | null;
  nome: string;
}) {
  const [
    falhou,
    setFalhou,
  ] = useState(false);

  useEffect(() => {
    setFalhou(false);
  }, [url]);

  const iniciais =
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase() || "MC";

  return (
    <div className="relative aspect-square w-44 shrink-0 overflow-hidden rounded-2xl border-2 border-[#d6b56d] bg-black shadow-2xl sm:w-52 lg:w-60">
      {url && !falhou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Fotografia de ${nome}`}
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#087a43]/40 via-black to-[#b82535]/30 text-5xl font-black text-[#d6b56d]"
          role="img"
          aria-label="Sem fotografia"
        >
          {iniciais}
        </div>
      )}
    </div>
  );
}

// ==========================================
// TÍTULOS DAS SECÇÕES
// ==========================================

function TituloSecao({
  numero,
  pequeno,
  titulo,
  subtitulo,
}: {
  numero: string;
  pequeno: string;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div className="mb-6 flex items-end gap-4 border-b border-[#d6b56d]/25 pb-5 sm:gap-6">
      <span className="text-5xl font-black leading-none text-[#d6b56d]/35 sm:text-6xl">
        {numero}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d6b56d]">
          {pequeno}
        </p>

        <h2
          className={`${boldIMIP.className} mt-1 text-2xl font-bold uppercase leading-none text-white sm:text-4xl`}
        >
          {titulo}
        </h2>

        {subtitulo && (
          <p className="mt-2 text-sm text-zinc-300">
            {subtitulo}
          </p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA PÚBLICA DO MC
// ==========================================

export default function PerfilMCPage() {
  const params = useParams();

  const mcId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [
    mc,
    setMc,
  ] = useState<MC | null>(null);

  const [
    personalizacao,
    setPersonalizacao,
  ] = useState<PersonalizacaoMC | null>(
    null,
  );

  const [
    videos,
    setVideos,
  ] = useState<VideoMC[]>([]);

  const [
    fotografias,
    setFotografias,
  ] = useState<FotoGaleria[]>([]);

  const [
    proprietario,
    setProprietario,
  ] = useState(false);

  const [
    aVerificarProprietario,
    setAVerificarProprietario,
  ] = useState(true);

  const [
    mensagemPartilha,
    setMensagemPartilha,
  ] = useState("");

  const [
    estatisticas,
    setEstatisticas,
  ] = useState<Estatisticas>(
    statsIniciais,
  );

  const [
    historico,
    setHistorico,
  ] = useState<HistoricoItem[]>([]);

  const [
    epocas,
    setEpocas,
  ] = useState<Epoca[]>([]);

  const [
    epocaId,
    setEpocaId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState("");

  // ==========================================
  // VERIFICAR PROPRIETÁRIO DO PERFIL
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function verificarProprietario() {
      setAVerificarProprietario(true);

      try {
        const {
          data,
        } = await supabase.auth.getUser();

        if (!data.user) {
          if (ativo) {
            setProprietario(false);
          }
          return;
        }

        const {
          data: podeEditar,
          error,
        } = await supabase.rpc(
          "pode_editar_perfil_mc",
          {
            p_mc_id: mcId,
          },
        );

        if (ativo) {
          setProprietario(
            !error &&
            podeEditar === true,
          );
        }
      } catch {
        if (ativo) {
          setProprietario(false);
        }
      } finally {
        if (ativo) {
          setAVerificarProprietario(false);
        }
      }
    }

    if (mcId) {
      void verificarProprietario();
    }

    return () => {
      ativo = false;
    };
  }, [mcId]);

  // ==========================================
  // CARREGAR PERFIL E ESTATÍSTICAS OFICIAIS
  // ==========================================

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
          personalizacaoResposta,
          videosResposta,
          fotosResposta,
        ] = await Promise.all([
          supabase
            .from("mcs")
            .select(
              "id,nome_artistico,cidade,distrito,por_confirmar,foto_url,bio,instagram_url,youtube_url,tiktok_url,spotify_url",
            )
            .eq("id", mcId)
            .single(),

          consultarTodas<Pontuacao>(
            (inicio, fim) =>
              supabase
                .from("pontuacoes")
                .select(
                  "id,mc_id,pontos,motivo,edicao_id,batalha_id",
                )
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
                .order("id")
                .range(inicio, fim),
          ),

          consultarTodas<{
            id: string;
            nome_artistico: string;
          }>((inicio, fim) =>
            supabase
              .from("mcs")
              .select(
                "id,nome_artistico",
              )
              .order("id")
              .range(inicio, fim),
          ),

          supabase
            .from("epocas")
            .select(
              "id,ano,nome,estado",
            )
            .order("ano", {
              ascending: false,
            }),

          // INCLUI A NOVA COR DO LEMA.

          supabase
            .from("mc_personalizacao")
            .select(
              "mc_id,lema,cor_destaque,cor_fundo,cor_lema,capa_fotografia_id,fundo_fotografia_id,ordem_seccoes",
            )
            .eq("mc_id", mcId)
            .maybeSingle(),

          supabase
            .from("mc_videos")
            .select(
              "id,titulo,tipo,url,storage_path,estado_publicacao,criado_em",
            )
            .eq("mc_id", mcId)
            .order("criado_em", {
              ascending: false,
            })
            .limit(50),

          supabase
            .from("mc_fotografias")
            .select(
              "id,legenda,storage_path,ordem,estado_publicacao",
            )
            .eq("mc_id", mcId)
            .order("ordem", {
              ascending: true,
            })
            .limit(60),
        ]);

        if (!ativo) return;

        if (
          mcResposta.error ||
          !mcResposta.data
        ) {
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

        setMc(
          mcResposta.data as MC,
        );

        // A personalização é opcional.

        if (
          personalizacaoResposta.error
        ) {
          setPersonalizacao(null);
        } else {
          setPersonalizacao(
            (personalizacaoResposta.data as
              | PersonalizacaoMC
              | null) ?? null,
          );
        }

        // Mostrar apenas conteúdos publicados.

        setVideos(
          videosResposta.error
            ? []
            : (
                (videosResposta.data ??
                  []) as VideoMC[]
              ).filter((video) =>
                publicado(
                  video.estado_publicacao,
                ),
              ),
        );

        setFotografias(
          fotosResposta.error
            ? []
            : (
                (fotosResposta.data ??
                  []) as FotoGaleria[]
              ).filter((fotografia) =>
                publicado(
                  fotografia.estado_publicacao,
                ),
              ),
        );

        // ======================================
        // ÉPOCA SELECIONADA
        // ======================================

        const epocasDisponiveis =
          (epocasResposta.data ??
            []) as Epoca[];

        setEpocas(
          epocasDisponiveis,
        );

        const anoAtual =
          new Date().getFullYear();

        const elegiveis =
          epocasDisponiveis.filter(
            (item) =>
              item.ano >= 2027 &&
              item.ano <= anoAtual,
          );

        const selecionada =
          epocasDisponiveis.find(
            (item) =>
              item.id === epocaId,
          ) ??
          elegiveis.find(
            (item) =>
              item.estado === "ativa",
          ) ??
          elegiveis[0] ??
          epocasDisponiveis.find(
            (item) =>
              item.ano === 2026,
          ) ??
          epocasDisponiveis[0];

        if (
          selecionada &&
          selecionada.id !== epocaId
        ) {
          setEpocaId(
            selecionada.id,
          );
          return;
        }

        // ======================================
        // HISTÓRICO COMPLETO
        // ======================================

        const pontosMcHistorico =
          todasPontuacoes.filter(
            (item) =>
              item.mc_id === mcId,
          );

        const idsHistorico = [
          ...new Set(
            pontosMcHistorico.map(
              (item) =>
                item.edicao_id,
            ),
          ),
        ];

        const edicoesHistorico:
          Edicao[] = [];

        for (
          let i = 0;
          i < idsHistorico.length;
          i += 100
        ) {
          const resposta =
            await consultarTodas<Edicao>(
              (inicio, fim) =>
                supabase
                  .from("edicoes")
                  .select(
                    "id,epoca_id,roda_id,nome,data_edicao",
                  )
                  .in(
                    "id",
                    idsHistorico.slice(
                      i,
                      i + 100,
                    ),
                  )
                  .order("id")
                  .range(
                    inicio,
                    fim,
                  ),
            );

          if (!ativo) return;

          edicoesHistorico.push(
            ...resposta,
          );
        }

        // ======================================
        // EDIÇÕES DA ÉPOCA
        // ======================================

        const outrasEdicoes =
          selecionada
            ? await consultarTodas<{
                id: string;
                data_edicao: string;
              }>((inicio, fim) =>
                supabase
                  .from("edicoes")
                  .select(
                    "id,data_edicao",
                  )
                  .eq(
                    "epoca_id",
                    selecionada.id,
                  )
                  .order("id")
                  .range(
                    inicio,
                    fim,
                  ),
              )
            : [];

        if (!ativo) return;

        const idsEpoca = new Set(
          outrasEdicoes
            .filter((item) => {
              if (
                !selecionada ||
                !item.data_edicao
              ) {
                return false;
              }

              const anoEdicao =
                Number(
                  item.data_edicao.slice(
                    0,
                    4,
                  ),
                );

              const mesEdicao =
                Number(
                  item.data_edicao.slice(
                    5,
                    7,
                  ),
                );

              return (
                anoEdicao ===
                  selecionada.ano &&
                mesEdicao >= 1 &&
                mesEdicao <=
                  (selecionada.ano ===
                  2026
                    ? 12
                    : 10)
              );
            })
            .map(
              (item) =>
                item.id,
            ),
        );

        const pontos =
          todasPontuacoes.filter(
            (item) =>
              idsEpoca.has(
                item.edicao_id,
              ),
          );

        const edicoesConfirmadas =
          new Set(
            pontos.map(
              (item) =>
                item.edicao_id,
            ),
          );

        const batalhas =
          todasBatalhas.filter(
            (item) =>
              edicoesConfirmadas.has(
                item.edicao_id,
              ),
          );

        const batalhaIds =
          batalhas.map(
            (item) =>
              item.id,
          );

        const participacoes:
          Participacao[] = [];

        for (
          let i = 0;
          i < batalhaIds.length;
          i += 100
        ) {
          participacoes.push(
            ...(
              await consultarTodas<Participacao>(
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
                    .order(
                      "batalha_id",
                    )
                    .order(
                      "mc_id",
                    )
                    .range(
                      inicio,
                      fim,
                    ),
              )
            ),
          );

          if (!ativo) return;
        }

        // ======================================
        // ESTATÍSTICAS OFICIAIS
        // ======================================

        const batalhaPorId =
          new Map(
            batalhas.map(
              (item) =>
                [
                  item.id,
                  item,
                ] as const,
            ),
          );

        const totais =
          new Map<
            string,
            number
          >();

        const vitorias20 =
          new Map<
            string,
            number
          >();

        const edicoesPorMc =
          new Map<
            string,
            Set<string>
          >();

        const confrontos =
          new Map<
            string,
            number
          >();

        function adicionarEdicao(
          id: string,
          edicaoId: string,
        ) {
          if (
            !edicoesPorMc.has(
              id,
            )
          ) {
            edicoesPorMc.set(
              id,
              new Set<string>(),
            );
          }

          edicoesPorMc
            .get(id)
            ?.add(edicaoId);
        }

        for (
          const ponto of pontos
        ) {
          totais.set(
            ponto.mc_id,
            (totais.get(
              ponto.mc_id,
            ) ?? 0) +
              ponto.pontos,
          );

          adicionarEdicao(
            ponto.mc_id,
            ponto.edicao_id,
          );

          if (
            !ponto.batalha_id &&
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(
              ponto.motivo ?? "",
            )
          ) {
            vitorias20.set(
              ponto.mc_id,
              (vitorias20.get(
                ponto.mc_id,
              ) ?? 0) + 1,
            );
          }
        }

        const porBatalha =
          new Map<
            string,
            Participacao[]
          >();

        for (
          const participacao
          of participacoes
        ) {
          const batalha =
            batalhaPorId.get(
              participacao.batalha_id,
            );

          if (!batalha) {
            continue;
          }

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
            porBatalha.get(
              participacao.batalha_id,
            ) ?? [];

          lista.push(
            participacao,
          );

          porBatalha.set(
            participacao.batalha_id,
            lista,
          );
        }

        // ======================================
        // CONFRONTOS DIRETOS
        // ======================================

        for (
          const lista of
          porBatalha.values()
        ) {
          const vencedores =
            lista.filter(
              (item) =>
                item.venceu,
            );

          const derrotados =
            lista.filter(
              (item) =>
                !item.venceu,
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

        // ======================================
        // RANKING NACIONAL
        // ======================================

        const ranking =
          todosMcs
            .filter(
              (item) =>
                totais.has(
                  item.id,
                ),
            )
            .map((item) => ({
              id:
                item.id,
              nome:
                item.nome_artistico,
              pontos:
                totais.get(
                  item.id,
                ) ?? 0,
              vitorias20:
                vitorias20.get(
                  item.id,
                ) ?? 0,
            }))
            .sort((a, b) => {
              if (
                b.pontos !==
                a.pontos
              ) {
                return (
                  b.pontos -
                  a.pontos
                );
              }

              if (
                b.vitorias20 !==
                a.vitorias20
              ) {
                return (
                  b.vitorias20 -
                  a.vitorias20
                );
              }

              const aVenceu =
                confrontos.get(
                  chaveConfronto(
                    a.id,
                    b.id,
                  ),
                ) ?? 0;

              const bVenceu =
                confrontos.get(
                  chaveConfronto(
                    b.id,
                    a.id,
                  ),
                ) ?? 0;

              if (
                aVenceu !==
                bVenceu
              ) {
                return (
                  bVenceu -
                  aVenceu
                );
              }

              return a.nome.localeCompare(
                b.nome,
                "pt",
              );
            });

        const participacoesMc =
          participacoes.filter(
            (item) =>
              item.mc_id === mcId,
          );

        const vitorias =
          participacoesMc.filter(
            (item) =>
              item.venceu,
          ).length;

        if (!ativo) return;

        setEstatisticas({
          posicao:
            ranking.findIndex(
              (item) =>
                item.id === mcId,
            ) + 1,

          pontos:
            totais.get(
              mcId,
            ) ?? 0,

          vitorias20:
            vitorias20.get(
              mcId,
            ) ?? 0,

          participacoes:
            edicoesPorMc.get(
              mcId,
            )?.size ?? 0,

          batalhas:
            participacoesMc.length,

          vitorias,

          derrotas:
            participacoesMc.length -
            vitorias,
        });

        // ======================================
        // HISTÓRICO POR EDIÇÃO
        // ======================================

        if (
          idsHistorico.length ===
          0
        ) {
          setHistorico([]);
          return;
        }

        const rodaIds = [
          ...new Set(
            edicoesHistorico.map(
              (item) =>
                item.roda_id,
            ),
          ),
        ];

        let rodas:
          Roda[] = [];

        if (
          rodaIds.length > 0
        ) {
          const rodasResposta =
            await supabase
              .from("rodas")
              .select(
                "id,nome",
              )
              .in(
                "id",
                rodaIds,
              );

          if (!ativo) return;

          if (
            rodasResposta.error
          ) {
            throw new Error(
              "Não foi possível carregar as rodas.",
            );
          }

          rodas =
            (rodasResposta.data ??
              []) as Roda[];
        }

        const rodaPorId =
          new Map(
            rodas.map(
              (item) =>
                [
                  item.id,
                  item.nome,
                ] as const,
            ),
          );

        const pontosPorEdicao =
          new Map<
            string,
            number
          >();

        for (
          const ponto of
          pontosMcHistorico
        ) {
          pontosPorEdicao.set(
            ponto.edicao_id,
            (pontosPorEdicao.get(
              ponto.edicao_id,
            ) ?? 0) +
              ponto.pontos,
          );
        }

        if (!ativo) return;

        setHistorico(
          edicoesHistorico
            .map((item) => ({
              edicaoId:
                item.id,

              edicao:
                item.nome ||
                "Edição",

              roda:
                rodaPorId.get(
                  item.roda_id,
                ) ?? "Roda",

              data:
                item.data_edicao,

              pontos:
                pontosPorEdicao.get(
                  item.id,
                ) ?? 0,
            }))
            .sort((a, b) =>
              b.data.localeCompare(
                a.data,
              ),
            ),
        );
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar o perfil.",
          );
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    if (mcId) {
      void carregarPerfil();
    }

    return () => {
      ativo = false;
    };
  }, [mcId, epocaId]);

  // ==========================================
  // PARTILHAR PERFIL
  // ==========================================

  async function partilharPerfil() {
    if (!mc) return;

    const url =
      window.location.href;

    const titulo =
      `${mc.nome_artistico} | IMIP`;

    setMensagemPartilha("");

    if (
      typeof navigator.share ===
      "function"
    ) {
      try {
        await navigator.share({
          title: titulo,
          text:
            `Conhece a história e o percurso de ${mc.nome_artistico} no IMIP.`,
          url,
        });

        return;
      } catch (falha) {
        if (
          falha instanceof Error &&
          falha.name ===
            "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(
        url,
      );

      setMensagemPartilha(
        "Ligação copiada. Já podes partilhar o perfil!",
      );
    } catch {
      setMensagemPartilha(
        "Copia a ligação da barra de endereços para partilhar.",
      );
    }
  }

  // ==========================================
  // CARREGAMENTO E ERROS
  // ==========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-white">
        <p className="border border-[#d6b56d]/40 bg-black/85 px-6 py-5 text-sm font-bold text-[#d6b56d]">
          A CARREGAR PERFIL...
        </p>
      </main>
    );
  }

  if (!mc || erro) {
    return (
      <main className="min-h-screen px-5 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/mcs"
            className="text-sm font-black text-[#d6b56d]"
          >
            ← VOLTAR AOS MCs
          </Link>

          <p className="mt-10 border border-red-800 bg-black/90 p-5 text-red-300">
            {erro ||
              "MC não encontrado."}
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // DADOS DA APRESENTAÇÃO
  // ==========================================

  const foto =
    obterUrl(
      mc.foto_url,
    );

  const corDestaque =
    corHexValida(
      personalizacao?.cor_destaque,
    )
      ? personalizacao!.cor_destaque
      : "#d6b56d";

  const corFundo =
    corHexValida(
      personalizacao?.cor_fundo,
    )
      ? personalizacao!.cor_fundo
      : "#091b13";

  // ==========================================
  // COR DO LEMA - NOVA FUNCIONALIDADE
  // ==========================================

  const corLema =
    corHexValida(
      personalizacao?.cor_lema,
    )
      ? personalizacao!.cor_lema!
      : "#ffffff";

  // Texto do botão legível em fundo claro
  // ou escuro, incluindo preto absoluto.

  const corTextoBotao =
    corTextoContraste(
      corDestaque,
    );

  const lema =
    personalizacao?.lema?.trim() ??
    "";

  const localizacao = [
    mc.cidade,
    mc.distrito,
  ]
    .filter(Boolean)
    .join(" · ");

  const epocaSelecionada =
    epocas.find(
      (item) =>
        item.id === epocaId,
    );

  const aproveitamento =
    estatisticas.batalhas
      ? Math.round(
          (estatisticas.vitorias /
            estatisticas.batalhas) *
            100,
        )
      : 0;

  const cartoes = [
    [
      "POSIÇÃO NACIONAL",
      estatisticas.posicao
        ? `${estatisticas.posicao}º`
        : "—",
    ],
    [
      "PONTOS",
      estatisticas.pontos,
    ],
    [
      "VITÓRIAS 2–0",
      estatisticas.vitorias20,
    ],
    [
      "PARTICIPAÇÕES",
      estatisticas.participacoes,
    ],
    [
      "BATALHAS",
      estatisticas.batalhas,
    ],
    [
      "VITÓRIAS",
      estatisticas.vitorias,
    ],
    [
      "DERROTAS",
      estatisticas.derrotas,
    ],
    [
      "APROVEITAMENTO",
      `${aproveitamento}%`,
    ],
  ];

  const redes: {
    tipo: Rede;
    nome: string;
    url: string | null;
  }[] = [
    {
      tipo: "instagram",
      nome: "Instagram",
      url: obterUrl(
        mc.instagram_url,
        [
          "instagram.com",
          "www.instagram.com",
        ],
      ),
    },
    {
      tipo: "youtube",
      nome: "YouTube",
      url: obterUrl(
        mc.youtube_url,
        [
          "youtube.com",
          "www.youtube.com",
          "m.youtube.com",
          "youtu.be",
        ],
      ),
    },
    {
      tipo: "tiktok",
      nome: "TikTok",
      url: obterUrl(
        mc.tiktok_url,
        [
          "tiktok.com",
          "www.tiktok.com",
          "vm.tiktok.com",
          "vt.tiktok.com",
        ],
      ),
    },
    {
      tipo: "spotify",
      nome: "Spotify",
      url: obterUrl(
        mc.spotify_url,
        [
          "open.spotify.com",
        ],
      ),
    },
  ];

  const redesVisiveis =
    redes.filter(
      (item) =>
        item.url,
    );

  const videosExternos =
    videos.filter(
      (item) =>
        urlVideo(item) !== null,
    );

  const videosPrivados =
    videos.filter(
      (item) =>
        item.tipo === "upload",
    );

  // ==========================================
  // PÁGINA PÚBLICA DO ARTISTA
  // ==========================================

  return (
    <main className="relative min-h-screen text-[#f6f2e9]">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-10">

        {/* NAVEGAÇÃO */}

        <nav
          aria-label="Navegação do perfil"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/mcs"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-black/80 px-4 py-2 text-xs font-black text-[#f0d58e] hover:bg-[#14251a]"
          >
            ← VOLTAR AOS MCs
          </Link>

          <Link
            href="/ranking"
            className="inline-flex min-h-11 items-center border border-white/25 bg-black/80 px-4 py-2 text-xs font-black text-white hover:border-[#d6b56d]"
          >
            RANKING NACIONAL ↗
          </Link>
        </nav>

        {/* ===================================
            IDENTIDADE DO ARTISTA
           =================================== */}

        <header
          className="mt-6 overflow-hidden border border-[#d6b56d]/40 shadow-2xl"
          style={{
            backgroundColor:
              corFundo,
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

          {/* CAPA PERSONALIZADA */}

          <div
            className="relative min-h-48 overflow-hidden sm:min-h-64 lg:min-h-72"
            style={{
              background:
                `linear-gradient(120deg, ${corFundo} 8%, ${corDestaque} 190%)`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-18deg,transparent 0px,transparent 32px,#fff 33px,#fff 34px)",
              }}
            />

            <div
              aria-hidden="true"
              className="absolute -right-16 -top-36 h-80 w-80 rotate-12 border-[24px] opacity-25 sm:right-16"
              style={{
                borderColor:
                  corDestaque,
              }}
            />

            <div className="relative flex min-h-48 flex-col justify-between gap-5 px-5 py-6 sm:min-h-64 sm:px-9 lg:min-h-72">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/80">
                  IMIP / ARTISTAS
                </p>

                <span className="border border-white/40 bg-black/30 px-3 py-1 text-[10px] font-black tracking-widest text-white">
                  PERFIL OFICIAL
                </span>
              </div>

              <div>
                {/* A FRASE UTILIZA AGORA
                    A COR ESCOLHIDA PELO MC */}

                <p
                  className={`${veneerIMIP.className} max-w-3xl break-words text-2xl font-normal uppercase leading-none drop-shadow-lg sm:text-4xl`}
                  style={{
                    color: corLema,
                  }}
                >
                  {lema ||
                    "O MEU PERCURSO. A MINHA VOZ."}
                </p>

                <div
                  className="mt-4 h-1 w-24"
                  style={{
                    backgroundColor:
                      corDestaque,
                  }}
                />
              </div>
            </div>
          </div>

          {/* DADOS DO ARTISTA */}

          <div className="grid gap-7 px-5 py-8 sm:px-9 lg:grid-cols-[auto_1fr] lg:gap-10 lg:py-10">
            <div className="mx-auto lg:mx-0">
              <FotografiaMC
                url={foto}
                nome={
                  mc.nome_artistico
                }
              />
            </div>

            <div className="min-w-0 text-center lg:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d6b56d]">
                IMPROVISO MADE IN PORTUGAL · ARTISTA
              </p>

              <h1
                className={`${boldIMIP.className} mt-3 break-words text-[clamp(2.6rem,6vw,5.6rem)] font-bold uppercase leading-none tracking-tight text-white`}
              >
                {mc.nome_artistico}
              </h1>

              <p className="mt-4 text-sm text-white/85 sm:text-base">
                {localizacao ||
                  "Localização não indicada"}
              </p>

              {mc.por_confirmar && (
                <p className="mt-3 text-xs font-bold text-[#f0d58e]">
                  MC SEM REGISTO
                </p>
              )}

              {/* REDES SOCIAIS */}

              <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
                {redesVisiveis.map(
                  (rede) => (
                    <a
                      key={
                        rede.tipo
                      }
                      href={
                        rede.url!
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${rede.nome} de ${mc.nome_artistico} — abre num novo separador`}
                      className="inline-flex min-h-11 items-center gap-2 border border-white/30 bg-black/30 px-3 py-2 text-xs font-bold text-white hover:border-[#d6b56d]"
                    >
                      <IconeRede
                        rede={
                          rede.tipo
                        }
                      />

                      {rede.nome} ↗
                    </a>
                  ),
                )}
              </div>

              {/* PARTILHA */}

              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <button
                  type="button"
                  onClick={() =>
                    void partilharPerfil()
                  }
                  className="min-h-11 px-5 py-3 text-xs font-black transition hover:brightness-110"
                  style={{
                    backgroundColor:
                      corDestaque,
                    color:
                      corTextoBotao,
                    border:
                      "1px solid #d6b56d",
                  }}
                >
                  ↗ PARTILHAR PERFIL
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const texto =
                      `Conhece o perfil de ${mc.nome_artistico} no IMIP: ${window.location.href}`;

                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(texto)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  className="min-h-11 border border-white/35 bg-black/30 px-5 py-3 text-xs font-black text-white hover:bg-white/10"
                >
                  WHATSAPP ↗
                </button>
              </div>

              {mensagemPartilha && (
                <p
                  role="status"
                  className="mt-3 text-sm text-white"
                >
                  {mensagemPartilha}
                </p>
              )}

              {/* ACESSO À EDIÇÃO */}

              <div className="mt-5">
                {aVerificarProprietario ? (
                  <p className="text-xs text-white/70">
                    A verificar acesso...
                  </p>
                ) : proprietario ? (
                  <Link
                    href={`/mcs/${mc.id}/editar`}
                    className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-black/30 px-4 py-3 text-xs font-black text-[#d6b56d] hover:bg-black/50"
                  >
                    EDITAR O MEU PERFIL ↗
                  </Link>
                ) : (
                  <PedirAcessoMC
                    mcId={mc.id}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ===================================
            NAVEGAÇÃO DAS SECÇÕES
           =================================== */}

        <nav
          aria-label="Secções do artista"
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {[
            {
              href: "#historia",
              nome: "HISTÓRIA",
            },
            {
              href: "#videos",
              nome: "VÍDEOS",
            },
            {
              href: "#fotografias",
              nome: "FOTOGRAFIAS",
            },
            {
              href: "#percurso",
              nome: "PERCURSO",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="border border-[#d6b56d]/25 bg-black/80 px-3 py-4 text-center text-xs font-black tracking-wider text-white hover:border-[#d6b56d] hover:text-[#d6b56d]"
            >
              {item.nome} ↓
            </a>
          ))}
        </nav>

        {/* ===================================
            HISTÓRIA DO MC
           =================================== */}

        <section
          id="historia"
          className="mt-10 scroll-mt-8 bg-[#091b13]/95 p-5 sm:p-8"
        >
          <TituloSecao
            numero="01"
            pequeno="QUEM SOU"
            titulo="A MINHA HISTÓRIA"
          />

          {mc.bio?.trim() ? (
            <p className="max-w-5xl whitespace-pre-line break-words text-base leading-8 text-white/85 sm:text-lg">
              {mc.bio}
            </p>
          ) : (
            <p className="max-w-3xl border-l-4 border-[#d6b56d] pl-5 text-sm leading-7 text-zinc-300">
              Este artista ainda não publicou
              a sua história. Em breve,
              este espaço poderá contar
              o seu percurso dentro e
              fora das batalhas.
            </p>
          )}
        </section>

        {/* ===================================
            VÍDEOS E CORTES
           =================================== */}

        <section
          id="videos"
          className="mt-10 scroll-mt-8 border border-white/10 bg-black/90 p-5 sm:p-8"
        >
          <TituloSecao
            numero="02"
            pequeno="NA RODA · EM PALCO · NA RUA"
            titulo="VÍDEOS & CORTES"
            subtitulo="Batalhas, momentos, atuações e vídeos escolhidos pelo artista."
          />

          {videosExternos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videosExternos.map(
                (video) => {
                  const url =
                    urlVideo(
                      video,
                    );

                  const miniatura =
                    video.tipo ===
                    "youtube"
                      ? miniaturaYoutube(
                          video.url,
                        )
                      : null;

                  if (!url) {
                    return null;
                  }

                  return (
                    <a
                      key={video.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden border border-white/20 bg-[#111a15] transition hover:border-[#d6b56d]"
                    >
                      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-[#123f2e] via-[#090d0a] to-[#55202a]">
                        {miniatura && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              miniatura
                            }
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:scale-105"
                          />
                        )}

                        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-black/70 text-xl text-white shadow-lg">
                          ▶
                        </span>

                        <span className="absolute bottom-3 left-3 bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#d6b56d]">
                          {video.tipo}
                        </span>
                      </div>

                      <div className="p-4">
                        <p className="line-clamp-2 min-h-12 text-sm font-black leading-relaxed text-white">
                          {video.titulo?.trim() ||
                            "Vídeo do artista"}
                        </p>

                        <p className="mt-3 text-xs font-bold text-[#d6b56d]">
                          VER VÍDEO ↗
                        </p>
                      </div>
                    </a>
                  );
                },
              )}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-[#d6b56d]/40 bg-[#111a15] p-6 text-center">
              <span className="mb-4 text-4xl text-[#d6b56d]">
                ▶
              </span>

              <p className="text-lg font-black uppercase">
                OS MELHORES MOMENTOS AINDA
                ESTÃO POR CHEGAR
              </p>

              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-300">
                Aqui vão surgir vídeos de
                batalhas, cortes e atuações
                publicados pelo artista.
              </p>
            </div>
          )}

          {videosPrivados.length > 0 && (
            <p className="mt-4 text-xs text-zinc-400">
              Existem{" "}
              {videosPrivados.length}{" "}
              vídeo(s) carregado(s) diretamente
              a aguardar a ligação de
              reprodução segura.
            </p>
          )}
        </section>

        {/* ===================================
            GALERIA FOTOGRÁFICA
           =================================== */}

        <section
          id="fotografias"
          className="mt-10 scroll-mt-8 border border-[#d6b56d]/20 bg-[#091b13]/95 p-5 sm:p-8"
        >
          <TituloSecao
            numero="03"
            pequeno="MEMÓRIAS DE UM ARTISTA"
            titulo="GALERIA FOTOGRÁFICA"
            subtitulo="A rua, os palcos, os bastidores e os momentos que ficam."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {foto ? (
              <div className="group relative aspect-[4/3] overflow-hidden border border-[#d6b56d]/40 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto}
                  alt={`Retrato de ${mc.nome_artistico}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10">
                  <p className="text-xs font-black tracking-wide text-white">
                    RETRATO DO ARTISTA
                  </p>
                </div>
              </div>
            ) : null}

            {fotografias.map(
              (
                fotografia,
                index,
              ) => (
                <div
                  key={fotografia.id}
                  className="flex aspect-[4/3] flex-col items-center justify-center border border-dashed border-[#d6b56d]/25 bg-black/35 px-4 text-center"
                >
                  <span
                    className="text-3xl text-[#d6b56d]/60"
                    aria-hidden="true"
                  >
                    ▣
                  </span>

                  <p className="mt-3 text-xs font-black text-white">
                    {fotografia.legenda?.trim() ||
                      `FOTOGRAFIA ${index + 1}`}
                  </p>

                  <p className="mt-2 text-[11px] text-zinc-400">
                    Imagem a aguardar
                    visualização segura
                  </p>
                </div>
              ),
            )}

            {fotografias.length === 0 && (
              <div className="flex aspect-[4/3] flex-col items-center justify-center border border-dashed border-[#d6b56d]/25 bg-black/35 p-5 text-center">
                <span
                  className="text-3xl text-[#d6b56d]/60"
                  aria-hidden="true"
                >
                  ▣
                </span>

                <p className="mt-3 text-sm font-black uppercase text-white">
                  MAIS FOTOGRAFIAS EM BREVE
                </p>

                <p className="mt-2 text-xs text-zinc-400">
                  A galeria ainda não tem
                  imagens publicadas.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ===================================
            PERCURSO COMPETITIVO
           =================================== */}

        <section
          id="percurso"
          className="mt-10 scroll-mt-8 border border-white/10 bg-black/85 p-5 sm:p-8"
        >
          <TituloSecao
            numero="04"
            pequeno="REGISTO OFICIAL · IMIP"
            titulo="PERCURSO COMPETITIVO"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-2xl text-sm text-zinc-300">
              Resultados registados nas
              rodas. O artista não pode
              alterar estes valores.
            </p>

            <div>
              <label
                htmlFor="epoca-perfil"
                className="block text-[10px] font-black tracking-wider text-zinc-300"
              >
                ÉPOCA DAS ESTATÍSTICAS
              </label>

              <select
                id="epoca-perfil"
                value={epocaId}
                onChange={(evento) =>
                  setEpocaId(
                    evento.target.value,
                  )
                }
                className="mt-2 min-h-11 min-w-48 border border-[#087a43] bg-[#101713] px-3 py-2 text-sm text-white outline-none focus:border-[#d6b56d]"
              >
                {epocas.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.ano === 2026
                        ? "2026 · Testes"
                        : `${item.ano} · ${
                            item.nome ||
                            "Época Nacional"
                          }`}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {epocaSelecionada?.ano === 2026 && (
            <p className="mt-5 border-l-4 border-[#d6b56d] bg-[#161d17] px-4 py-3 text-xs leading-relaxed text-zinc-300">
              Resultados de teste de
              2026. Não contam para a
              época oficial nem para o
              apuramento nacional.
            </p>
          )}

          {/* ESTATÍSTICAS */}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cartoes.map(
              (
                [titulo, valor],
                index,
              ) => (
                <div
                  key={titulo}
                  className={`min-w-0 border border-white/15 border-t-4 bg-[#0e1712] p-4 sm:p-5 ${
                    index < 4
                      ? "border-t-[#087a43]"
                      : "border-t-[#b82535]"
                  }`}
                >
                  <p className="text-[10px] font-black tracking-wider text-zinc-300">
                    {titulo}
                  </p>

                  <p className="mt-3 text-3xl font-black tabular-nums text-[#d6b56d] sm:text-4xl">
                    {valor}
                  </p>
                </div>
              ),
            )}
          </div>

          {/* HISTÓRICO */}

          <div className="mt-9 border-l-4 border-[#b82535] pl-4">
            <h3 className="text-xl font-black uppercase text-white sm:text-2xl">
              HISTÓRICO POR EDIÇÃO
            </h3>

            <p className="mt-1 text-xs font-black tracking-wider text-[#d6b56d]">
              TODAS AS ÉPOCAS
            </p>
          </div>

          <div className="mt-5 overflow-hidden border border-white/20 bg-black/60">
            {historico.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-300">
                Ainda não existem
                participações registadas.
              </p>
            ) : (
              historico.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={item.edicaoId}
                    className={`flex items-center justify-between gap-4 px-4 py-5 sm:px-6 ${
                      index
                        ? "border-t border-white/10"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="break-words font-black text-white">
                        {item.roda}
                      </p>

                      <p className="mt-1 break-words text-xs text-zinc-300 sm:text-sm">
                        {item.edicao} ·{" "}
                        {formatarData(
                          item.data,
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-xl font-black tabular-nums text-[#d6b56d]">
                        {item.pontos >= 0
                          ? "+"
                          : ""}
                        {item.pontos}
                      </span>

                      <span className="text-[9px] font-black tracking-wider text-zinc-400">
                        PONTOS
                      </span>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </section>

        {/* RODAPÉ */}

        <footer className="mt-12 border-t border-[#d6b56d]/40 pt-6 text-center text-xs font-black tracking-[0.2em] text-[#d6b56d]">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
