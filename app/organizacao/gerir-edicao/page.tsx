
"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  boldIMIP,
  veneerIMIP,
} from "../../fonts/identidade";
import { supabase } from "../../../lib/supabase";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  GERIR EDIÇÃO

  FUNCIONALIDADES PRESERVADAS

  - Verificação da sessão
  - RPC e_administrador
  - Verificação da organização ativa
  - Consulta das organizações
  - Consulta das edições
  - Restrições de acesso por organização
  - Limite de tempo nas consultas
  - Indicação da etapa de carregamento
  - Botão para repetir consultas
  - Aviso administrativo das 48 horas
  - Seleção de edição
  - localStorage: edicaoId
  - Encaminhamento para apontamentos

  NOVA FUNCIONALIDADE

  - Registar Frees de Campeão
  - Identificar vencedores da FINAL
  - Associar vídeos à edição e à roda
  - Guardar rascunhos e publicar
  - Atualizar vídeos existentes

  Não altera pontuações nem resultados.
  ==================================================
*/

type Edicao = {
  id: string;
  nome: string;
  data_edicao: string | null;
  formato: string | null;
  organizacao_id: string;
  roda_id: string;
  data_submissao: string | null;
};

type Organizacao = {
  id: string;
  nome: string;
};

type VencedorFinal = {
  id: string;
  nome: string;
};

type FreeCampeao = {
  id: string;
  mc_id: string;
  titulo: string | null;
  video_url: string;
  estado: "rascunho" | "publicado";
};

// ==========================================
// LIMITE DE TEMPO DAS CONSULTAS
// ==========================================

async function comLimite<T>(
  operacao: PromiseLike<T>,
  etapa: string,
  segundos = 12,
): Promise<T> {
  let temporizador:
    | ReturnType<typeof setTimeout>
    | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operacao),

      new Promise<never>((_, rejeitar) => {
        temporizador = setTimeout(
          () =>
            rejeitar(
              new Error(
                `Tempo esgotado ao ${etapa}.`,
              ),
            ),
          segundos * 1000,
        );
      }),
    ]);
  } finally {
    if (temporizador) {
      clearTimeout(temporizador);
    }
  }
}

// ==========================================
// FORMATAÇÃO DA DATA
// ==========================================

function formatarData(
  data: string | null,
) {
  if (!data) {
    return "Data não definida";
  }

  const [ano, mes, dia] =
    data.split("-");

  return `${dia}/${mes}/${ano}`;
}

// ==========================================
// FAIXA COM AS CORES DE PORTUGAL
// ==========================================

function FaixaPortugal({
  altura = "h-[5px]",
}: {
  altura?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex w-full overflow-hidden ${altura}`}
    >
      <span className="w-[43%] bg-[#087a43]" />
      <span className="w-[14%] bg-[#d6b56d]" />
      <span className="flex-1 bg-[#b82535]" />
    </div>
  );
}

// ==========================================
// VALIDAR LIGAÇÕES DOS VÍDEOS
// ==========================================

function validarUrlFree(
  valor: string,
): string | null {
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

    const dominio =
      url.hostname.toLowerCase();

    const permitidos = [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "instagram.com",
      "www.instagram.com",
      "tiktok.com",
      "www.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ];

    return permitidos.includes(dominio)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

// ==========================================
// GESTÃO DOS FREES DE CAMPEÃO
// ==========================================

function GestaoFreesCampeao({
  edicoes,
}: {
  edicoes: Edicao[];
}) {
  const [
    edicaoId,
    setEdicaoId,
  ] = useState("");

  const [
    vencedores,
    setVencedores,
  ] = useState<VencedorFinal[]>([]);

  const [
    mcId,
    setMcId,
  ] = useState("");

  const [
    frees,
    setFrees,
  ] = useState<FreeCampeao[]>([]);

  const [
    titulo,
    setTitulo,
  ] = useState("");

  const [
    videoUrl,
    setVideoUrl,
  ] = useState("");

  const [
    estado,
    setEstado,
  ] = useState<"rascunho" | "publicado">(
    "rascunho",
  );

  const [
    carregar,
    setCarregar,
  ] = useState(false);

  const [
    guardar,
    setGuardar,
  ] = useState(false);

  const [
    aviso,
    setAviso,
  ] = useState("");

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    finalUnica,
    setFinalUnica,
  ] = useState(false);

  // Selecionar automaticamente uma edição.

  useEffect(() => {
    if (!edicoes.length) {
      setEdicaoId("");
      return;
    }

    if (
      !edicoes.some(
        (edicao) => edicao.id === edicaoId,
      )
    ) {
      setEdicaoId(edicoes[0].id);
    }
  }, [edicoes, edicaoId]);

  // ======================================
  // IDENTIFICAR VENCEDORES DA FINAL
  // ======================================

  useEffect(() => {
    let ativo = true;

    async function carregarFrees() {
      setCarregar(true);
      setErro("");
      setMensagem("");
      setAviso("");
      setVencedores([]);
      setFrees([]);
      setFinalUnica(false);
      setMcId("");
      setTitulo("");
      setVideoUrl("");
      setEstado("rascunho");

      try {
        const [
          batalhasResposta,
          freesResposta,
        ] = await Promise.all([
          supabase
            .from("batalhas")
            .select("id,fase")
            .eq("edicao_id", edicaoId),

          supabase
            .from("frees_campeao")
            .select(
              "id,mc_id,titulo,video_url,estado",
            )
            .eq("edicao_id", edicaoId),
        ]);

        if (!ativo) return;

        if (batalhasResposta.error) {
          throw new Error(
            `Não foi possível consultar as batalhas: ${batalhasResposta.error.message}`,
          );
        }

        if (freesResposta.error) {
          throw new Error(
            `Não foi possível consultar os frees: ${freesResposta.error.message}`,
          );
        }

        setFrees(
          (freesResposta.data ??
            []) as FreeCampeao[],
        );

        // Considerar apenas a fase FINAL.
        // Não confundir com SEMI-FINAL.

        const finais = (
          batalhasResposta.data ?? []
        ).filter((batalha) => {
          const fase = String(
            batalha.fase ?? "",
          )
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              "",
            )
            .trim()
            .toUpperCase();

          return (
            fase === "FINAL" ||
            fase === "GRANDE FINAL"
          );
        });

        // Evitar uma identificação errada
        // se houver várias batalhas finais.

        if (finais.length !== 1) {
          setAviso(
            finais.length === 0
              ? "Esta edição ainda não tem uma batalha FINAL registada. Não é possível identificar o campeão."
              : "Foram encontradas várias batalhas na fase FINAL. É preciso confirmar o vencedor oficial antes de registar o Free de Campeão.",
          );

          return;
        }

        // Obter os participantes vencedores
        // da batalha final.

        const participacoesResposta =
          await supabase
            .from("participacoes")
            .select("mc_id,venceu")
            .eq(
              "batalha_id",
              finais[0].id,
            )
            .eq("venceu", true);

        if (!ativo) return;

        if (
          participacoesResposta.error
        ) {
          throw new Error(
            `Não foi possível identificar os vencedores: ${participacoesResposta.error.message}`,
          );
        }

        const ids = [
          ...new Set(
            (
              participacoesResposta.data ??
              []
            ).map(
              (item) =>
                item.mc_id as string,
            ),
          ),
        ];

        if (ids.length === 0) {
          setAviso(
            "Ainda não existem vencedores confirmados na batalha FINAL.",
          );
          return;
        }

        // Carregar os nomes artísticos.

        const mcsResposta =
          await supabase
            .from("mcs")
            .select(
              "id,nome_artistico",
            )
            .in("id", ids);

        if (!ativo) return;

        if (mcsResposta.error) {
          throw new Error(
            `Não foi possível carregar os MCs vencedores: ${mcsResposta.error.message}`,
          );
        }

        const lista = (
          mcsResposta.data ?? []
        )
          .map((mc) => ({
            id: mc.id as string,
            nome:
              mc.nome_artistico as string,
          }))
          .sort((a, b) =>
            a.nome.localeCompare(
              b.nome,
              "pt",
            ),
          );

        if (
          lista.length !== ids.length
        ) {
          setAviso(
            "Há vencedores sem perfil acessível. Confirma os participantes desta final.",
          );
          return;
        }

        setVencedores(lista);
        setMcId(lista[0].id);
        setFinalUnica(true);

        // Carregar o vídeo existente
        // para o MC selecionado.

        const existente = (
          freesResposta.data ?? []
        ).find(
          (free) =>
            free.mc_id === lista[0].id,
        ) as FreeCampeao | undefined;

        if (existente) {
          setTitulo(
            existente.titulo ?? "",
          );

          setVideoUrl(
            existente.video_url,
          );

          setEstado(
            existente.estado,
          );
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar os Frees de Campeão.",
          );
        }
      } finally {
        if (ativo) {
          setCarregar(false);
        }
      }
    }

    if (edicaoId) {
      void carregarFrees();
    }

    return () => {
      ativo = false;
    };
  }, [edicaoId]);

  // ======================================
  // SELECIONAR MC VENCEDOR
  // ======================================

  function selecionarMC(
    novoMcId: string,
  ) {
    setMcId(novoMcId);
    setErro("");
    setMensagem("");

    const existente = frees.find(
      (free) =>
        free.mc_id === novoMcId,
    );

    setTitulo(
      existente?.titulo ?? "",
    );

    setVideoUrl(
      existente?.video_url ?? "",
    );

    setEstado(
      existente?.estado ?? "rascunho",
    );
  }

  // ======================================
  // GUARDAR FREE DE CAMPEÃO
  // ======================================

  async function guardarFree(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (
      guardar ||
      !finalUnica ||
      !mcId
    ) {
      return;
    }

    setErro("");
    setMensagem("");

    const url =
      validarUrlFree(videoUrl);

    if (!url) {
      setErro(
        "Utiliza uma ligação HTTPS válida do YouTube, Instagram ou TikTok.",
      );
      return;
    }

    if (
      !vencedores.some(
        (vencedor) =>
          vencedor.id === mcId,
      )
    ) {
      setErro(
        "O MC selecionado não consta dos vencedores da FINAL.",
      );
      return;
    }

    const edicao = edicoes.find(
      (item) =>
        item.id === edicaoId,
    );

    if (!edicao?.roda_id) {
      setErro(
        "Não foi possível identificar a roda desta edição.",
      );
      return;
    }

    setGuardar(true);

    try {
      const existente = frees.find(
        (free) =>
          free.mc_id === mcId,
      );

      const valores = {
        titulo:
          titulo.trim() || null,
        video_url: url,
        estado,
      };

      const resposta = existente
        ? await supabase
            .from("frees_campeao")
            .update(valores)
            .eq("id", existente.id)
            .eq(
              "edicao_id",
              edicaoId,
            )
            .eq("mc_id", mcId)
            .select("id")
            .single()
        : await supabase
            .from("frees_campeao")
            .insert({
              ...valores,
              roda_id:
                edicao.roda_id,
              edicao_id:
                edicaoId,
              mc_id:
                mcId,
            })
            .select("id")
            .single();

      if (
        resposta.error ||
        !resposta.data
      ) {
        throw new Error(
          resposta.error?.message ??
            "Não foi possível guardar o vídeo.",
        );
      }

      const atualizado: FreeCampeao = {
        id: resposta.data.id,
        mc_id: mcId,
        titulo: valores.titulo,
        video_url:
          valores.video_url,
        estado:
          valores.estado,
      };

      setFrees(
        (anteriores) => [
          ...anteriores.filter(
            (free) =>
              free.mc_id !== mcId,
          ),
          atualizado,
        ],
      );

      setVideoUrl(url);

      setMensagem(
        estado === "publicado"
          ? "Free de Campeão publicado com sucesso."
          : "Free de Campeão guardado como rascunho.",
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível guardar o vídeo.",
      );
    } finally {
      setGuardar(false);
    }
  }

  const selecionada =
    edicoes.find(
      (edicao) =>
        edicao.id === edicaoId,
    );

  const existente =
    frees.find(
      (free) =>
        free.mc_id === mcId,
    );

  // ======================================
  // INTERFACE DOS FREES
  // ======================================

  return (
    <section
      id="frees-campeao"
      className="mt-10 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95"
    >
      <FaixaPortugal />

      <div className="p-5 sm:p-8">
        <p className="imip-etiqueta">
          CONTEÚDO DA RODA · CAMPEÕES
        </p>

        <h2
          className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-[#f0e6d1] sm:text-4xl`}
        >
          FREE DE{" "}
          <span className="text-[#d6b56d]">
            CAMPEÃO.
          </span>
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#d2d9d0]">
          Associa o vídeo do campeão à sua
          edição. São aceites ligações do
          YouTube, Instagram e TikTok.
          Este registo não altera os
          resultados nem os pontos.
        </p>

        {edicoes.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-300">
            Não existem edições
            disponíveis para registar frees.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase text-[#d6b56d]">
                EDIÇÃO
              </span>

              <select
                value={edicaoId}
                onChange={(evento) =>
                  setEdicaoId(
                    evento.target.value,
                  )
                }
                className="min-h-12 w-full border border-[#d6b56d]/50 bg-[#0a110d] p-3 text-sm text-white"
              >
                {edicoes.map((edicao) => (
                  <option
                    key={edicao.id}
                    value={edicao.id}
                  >
                    {edicao.nome} ·{" "}
                    {formatarData(
                      edicao.data_edicao,
                    )}
                  </option>
                ))}
              </select>
            </label>

            {carregar && (
              <p
                role="status"
                className="text-sm text-[#d6b56d]"
              >
                A consultar a FINAL...
              </p>
            )}

            {aviso && (
              <p className="border-l-4 border-[#d6b56d] bg-black/60 p-4 text-sm text-zinc-200">
                {aviso}
              </p>
            )}

            {erro && (
              <p
                role="alert"
                className="border-l-4 border-[#b82535] bg-[#2b1117] p-4 text-sm text-red-200"
              >
                {erro}
              </p>
            )}

            {mensagem && (
              <p
                role="status"
                className="border-l-4 border-[#087a43] bg-[#10271b] p-4 text-sm text-[#d6b56d]"
              >
                {mensagem}
              </p>
            )}

            {!carregar && finalUnica && (
              <form
                onSubmit={guardarFree}
                className="space-y-5 border border-[#d6b56d]/25 bg-black/40 p-4 sm:p-6"
              >
                <p className="text-xs font-black uppercase tracking-wide text-[#d6b56d]">
                  FINAL CONFIRMADA ·{" "}
                  {selecionada?.nome}
                </p>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#f0e6d1]">
                    MC VENCEDOR
                  </span>

                  <select
                    value={mcId}
                    onChange={(evento) =>
                      selecionarMC(
                        evento.target.value,
                      )
                    }
                    className="min-h-12 w-full border border-[#d6b56d]/50 bg-[#0a110d] p-3 text-sm text-white"
                  >
                    {vencedores.map(
                      (vencedor) => (
                        <option
                          key={vencedor.id}
                          value={vencedor.id}
                        >
                          {vencedor.nome}
                        </option>
                      ),
                    )}
                  </select>

                  {vencedores.length > 1 && (
                    <span className="mt-2 block text-xs text-zinc-300">
                      A FINAL tem vários
                      vencedores registados,
                      por exemplo uma equipa.
                      Podes registar um free
                      para cada MC.
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#f0e6d1]">
                    TÍTULO DO VÍDEO
                    (OPCIONAL)
                  </span>

                  <input
                    type="text"
                    maxLength={150}
                    value={titulo}
                    onChange={(evento) =>
                      setTitulo(
                        evento.target.value,
                      )
                    }
                    placeholder="Free de Campeão — nome do MC"
                    className="min-h-12 w-full border border-[#d6b56d]/50 bg-[#0a110d] p-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#f0e6d1]">
                    LIGAÇÃO DO VÍDEO
                  </span>

                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(evento) =>
                      setVideoUrl(
                        evento.target.value,
                      )
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="min-h-12 w-full border border-[#d6b56d]/50 bg-[#0a110d] p-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#f0e6d1]">
                    PUBLICAÇÃO
                  </span>

                  <select
                    value={estado}
                    onChange={(evento) =>
                      setEstado(
                        evento.target.value as
                          | "rascunho"
                          | "publicado",
                      )
                    }
                    className="min-h-12 w-full border border-[#d6b56d]/50 bg-[#0a110d] p-3 text-sm text-white"
                  >
                    <option value="rascunho">
                      Guardar como rascunho
                    </option>

                    <option value="publicado">
                      Publicar no perfil
                      da roda
                    </option>
                  </select>
                </label>

                {existente && (
                  <p className="text-xs font-bold text-[#d6b56d]">
                    Já existe um registo
                    para este MC nesta edição.
                    Ao guardar, será atualizado.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={guardar}
                  className="min-h-12 w-full bg-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#101713] transition hover:bg-[#f0d58e] disabled:opacity-50"
                >
                  {guardar
                    ? "A GUARDAR..."
                    : "GUARDAR FREE DE CAMPEÃO"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function GerirEdicaoPage() {
  const router = useRouter();

  const [edicoes, setEdicoes] =
    useState<Edicao[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [etapa, setEtapa] =
    useState("verificar a sessão");

  const [erro, setErro] =
    useState("");

  const [administrador, setAdministrador] =
    useState(false);

  const [organizacoes, setOrganizacoes] =
    useState<Organizacao[]>([]);

  const [tentativa, setTentativa] =
    useState(0);

  // ==========================================
  // REPETIR CARREGAMENTO
  // ==========================================

  const repetir = useCallback(() => {
    setTentativa(
      (anterior) => anterior + 1,
    );
  }, []);

  // ==========================================
  // CARREGAR EDIÇÕES
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function carregarEdicoes() {
      setLoading(true);
      setErro("");
      setEtapa("verificar a sessão");

      try {
        // VERIFICAR SESSÃO

        const {
          data: { user },
          error: erroAuth,
        } = await comLimite(
          supabase.auth.getUser(),
          "verificar a sessão",
        );

        if (!ativo) return;

        if (erroAuth) {
          throw new Error(
            `Sessão: ${erroAuth.message}`,
          );
        }

        if (!user) {
          router.replace(
            "/organizacao/login",
          );

          return;
        }

        // VERIFICAR PERMISSÕES

        setEtapa(
          "verificar as permissões",
        );

        const {
          data: acesso,
          error: erroAcesso,
        } = await comLimite(
          supabase.rpc(
            "e_administrador",
          ),
          "verificar as permissões",
        );

        if (!ativo) return;

        if (erroAcesso) {
          throw new Error(
            `Permissões: ${erroAcesso.message}`,
          );
        }

        const acessoGeral =
          acesso === true;

        setAdministrador(
          acessoGeral,
        );

        // PROCURAR ORGANIZAÇÃO ATIVA

        setEtapa(
          "procurar a organização",
        );

        const {
          data: organizacao,
          error: erroOrganizacao,
        } = await comLimite(
          supabase
            .from("organizacoes")
            .select("id")
            .eq(
              "auth_user_id",
              user.id,
            )
            .eq("ativa", true)
            .single(),
          "procurar a organização",
        );

        if (!ativo) return;

        if (
          erroOrganizacao ||
          !organizacao
        ) {
          throw new Error(
            erroOrganizacao
              ? `Organização: ${erroOrganizacao.message}`
              : "Não foi encontrada uma organização ativa associada a esta conta.",
          );
        }

        // ORGANIZADOR GERAL:
        // CARREGAR ORGANIZAÇÕES

        if (acessoGeral) {
          setEtapa(
            "carregar as organizações",
          );

          const {
            data: todas,
            error: erroTodas,
          } = await comLimite(
            supabase
              .from("organizacoes")
              .select("id,nome")
              .eq("ativa", true),
            "carregar as organizações",
          );

          if (!ativo) return;

          if (erroTodas) {
            throw new Error(
              `Organizações: ${erroTodas.message}`,
            );
          }

          setOrganizacoes(
            todas ?? [],
          );
        }

        // CARREGAR EDIÇÕES
        // Organização: só as suas.
        // Administrador: todas as permitidas.

        setEtapa(
          "carregar as edições",
        );

        let consulta = supabase
          .from("edicoes")
          .select(
            "id,nome,data_edicao,formato,organizacao_id,roda_id,data_submissao",
          );

        if (!acessoGeral) {
          consulta = consulta.eq(
            "organizacao_id",
            organizacao.id,
          );
        }

        const {
          data,
          error,
        } = await comLimite(
          consulta.order(
            "data_edicao",
            {
              ascending: false,
            },
          ),
          "carregar as edições",
        );

        if (!ativo) return;

        if (error) {
          throw new Error(
            `Edições: ${error.message}`,
          );
        }

        setEdicoes(
          data ?? [],
        );
      } catch (falha) {
        if (!ativo) return;

        console.error(
          "Erro ao carregar edições:",
          falha,
        );

        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar as edições.",
        );
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregarEdicoes();

    return () => {
      ativo = false;
    };
  }, [router, tentativa]);

  // ==========================================
  // ABRIR EDIÇÃO
  // ==========================================

  function abrirEdicao(
    id: string,
  ) {
    localStorage.setItem(
      "edicaoId",
      id,
    );

    router.push(
      "/organizacao/apontamentos",
    );
  }

  // ==========================================
  // APRESENTAÇÃO
  // ==========================================

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* NAVEGAÇÃO */}

        <nav
          aria-label="Navegação da página"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/organizacao"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← VOLTAR AO PAINEL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · GESTÃO DE EDIÇÕES
          </span>
        </nav>

        {/* CABEÇALHO COM DOIS QUADROS */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95 sm:mt-7">
          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">

            {/* QUADRO ESQUERDO */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">
                <p className="imip-etiqueta">
                  ORGANIZAÇÃO · EDIÇÕES · APONTAMENTOS
                </p>

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(3rem,5vw,5.6rem)] text-[#f0e6d1]">
                    GERIR
                  </span>

                  <span className="mt-2 block text-[clamp(3rem,5vw,5.6rem)] text-[#d6b56d]">
                    EDIÇÃO
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-7 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-lg font-bold leading-relaxed text-[#f0e6d1] sm:text-xl">
                  Cada edição tem um percurso.
                  Cada resultado faz parte da história.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Consulta as edições registadas,
                  seleciona a que pretendes gerir
                  e continua para os apontamentos
                  dos participantes e das batalhas.
                </p>
              </div>

              {/* FRASE DE IMPACTO */}

              <div className="relative mt-10 border-l-4 border-[#d6b56d] bg-black/20 px-5 py-4">
                <p
                  className={`${veneerIMIP.className} text-[clamp(1.8rem,2.4vw,2.8rem)] font-normal uppercase leading-[1.15] tracking-[0.02em] text-[#f0e6d1]`}
                >
                  CADA PONTO CONTA.

                  <span className="block text-[#d6b56d]">
                    CADA EDIÇÃO TEM HISTÓRIA.
                  </span>
                </p>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.09em] text-[#e3d0a1]">
                  NACIONAL DE RUA · IMIP
                </p>
              </div>
            </div>

            {/* QUADRO DIREITO — CARTAZ MARFIM */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 z-0 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-36 -left-32 z-0 h-52 w-52 -rotate-12 border-[24px] border-[#087a43]"
              />

              <div className="relative z-10 min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  PAINEL DE GESTÃO · IMIP
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <h2
                  className={`${boldIMIP.className} mt-7 min-w-0 text-[clamp(2.15rem,3vw,3.5rem)] font-bold uppercase leading-[1.09] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  ESCOLHE A

                  <span className="block text-[#b82535]">
                    EDIÇÃO.
                  </span>
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#394239]">
                  A lista das edições disponíveis
                  está organizada por data,
                  da mais recente para a mais antiga.
                </p>

                {/* INFORMAÇÃO DA CONSULTA */}

                <div className="mt-8 border-t border-[#101713]/25 pt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a82636]">
                    ACESSO AO CIRCUITO
                  </p>

                  <p className="mt-3 text-sm font-black uppercase leading-relaxed">
                    {administrador
                      ? "ORGANIZADOR GERAL"
                      : "ORGANIZAÇÃO"}
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-[#475046]">
                    {administrador
                      ? "Consulta das edições disponíveis de todas as organizações."
                      : "Consulta das edições associadas à tua organização."}
                  </p>
                </div>

                {/* TOTAL DE EDIÇÕES */}

                {!loading && !erro && (
                  <div className="mt-7 flex items-end justify-between gap-4 border-l-4 border-[#087a43] bg-[#f8f2e5] px-5 py-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#394239]">
                        EDIÇÕES DISPONÍVEIS
                      </p>

                      <p
                        className={`${boldIMIP.className} mt-2 text-5xl font-bold leading-none text-[#101713]`}
                      >
                        {edicoes.length}
                      </p>
                    </div>

                    <span className="text-2xl font-black text-[#b82535]">
                      ↘
                    </span>
                  </div>
                )}
              </div>

              {/* ASSINATURA */}

              <div className="relative z-10 mt-10 border-t-4 border-[#101713] pt-4">
                <p className="text-xs font-black uppercase leading-relaxed tracking-[0.08em]">
                  OS REGISTOS FAZEM O CIRCUITO.

                  <span className="block">
                    O MÉRITO FAZ A CLASSIFICAÇÃO.
                  </span>
                </p>

                <p
                  className={`${veneerIMIP.className} mt-3 text-xl font-normal uppercase tracking-[0.03em] text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* SECÇÃO DE EDIÇÕES */}

        <section
          aria-labelledby="titulo-lista-edicoes"
          className="mt-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="imip-etiqueta">
                HISTÓRICO E GESTÃO
              </p>

              <h2
                id="titulo-lista-edicoes"
                className={`${boldIMIP.className} mt-3 text-[clamp(2rem,3.7vw,4rem)] font-bold uppercase leading-[1.1] tracking-[0.02em]`}
              >
                EDIÇÕES

                <span className="text-[#d6b56d]">
                  {" "}REGISTADAS.
                </span>
              </h2>
            </div>

            <Link
              href="/organizacao/nova-edicao"
              className="inline-flex min-h-11 items-center justify-center border border-[#d6b56d] bg-[#0a110d]/95 px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
            >
              REGISTAR NOVA EDIÇÃO ↗
            </Link>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#cdd5cb] sm:text-base">
            Seleciona uma edição para abrir
            os respetivos apontamentos.
          </p>

          {/* CARREGAMENTO */}

          {loading ? (
            <div
              role="status"
              className="mt-7 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95"
            >
              <FaixaPortugal />

              <div className="p-6 sm:p-8">
                <p
                  className={`${boldIMIP.className} text-2xl font-bold uppercase text-[#d6b56d] sm:text-3xl`}
                >
                  A CARREGAR...
                </p>

                <p className="mt-3 text-sm leading-relaxed text-[#d2d9d0]">
                  {etapa}
                </p>
              </div>
            </div>
          ) : erro ? (
            /* ERRO E TENTAR NOVAMENTE */

            <div
              role="alert"
              className="mt-7 overflow-hidden border border-[#b82535]/55 bg-[#0a110d]/95"
            >
              <div className="h-[5px] bg-[#b82535]" />

              <div className="p-6 sm:p-8">
                <p
                  className={`${boldIMIP.className} text-xl font-bold uppercase text-[#f0e6d1] sm:text-2xl`}
                >
                  NÃO FOI POSSÍVEL

                  <span className="block text-[#d6b56d]">
                    CARREGAR AS EDIÇÕES.
                  </span>
                </p>

                <p className="mt-4 text-sm leading-relaxed text-red-200">
                  {erro}
                </p>

                <button
                  type="button"
                  onClick={repetir}
                  className="mt-6 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
                >
                  TENTAR NOVAMENTE ↻
                </button>
              </div>
            </div>
          ) : edicoes.length === 0 ? (
            /* SEM EDIÇÕES REGISTADAS */

            <div className="mt-7 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
              <FaixaPortugal />

              <div className="p-6 sm:p-8">
                <p
                  className={`${boldIMIP.className} text-xl font-bold uppercase text-[#d6b56d] sm:text-2xl`}
                >
                  SEM EDIÇÕES REGISTADAS.
                </p>

                <p className="mt-4 text-sm leading-relaxed text-[#d2d9d0]">
                  Ainda não existem edições
                  registadas nesta organização.
                </p>
              </div>
            </div>
          ) : (
            /* LISTA DE EDIÇÕES */

            <div className="mt-7 space-y-4">
              {edicoes.map((edicao) => (
                <button
                  key={edicao.id}
                  type="button"
                  onClick={() =>
                    abrirEdicao(edicao.id)
                  }
                  className="group relative flex w-full min-w-0 items-center justify-between gap-4 overflow-hidden border border-[#d6b56d]/35 bg-[#0a110d]/95 px-5 py-5 text-left transition-colors hover:border-[#d6b56d] hover:bg-[#14251a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d58e] sm:px-7 sm:py-6"
                >
                  {/* ELEMENTO GRÁFICO SUPERIOR */}

                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 flex h-[4px]"
                  >
                    <span className="w-[43%] bg-[#087a43]" />
                    <span className="w-[14%] bg-[#d6b56d]" />
                    <span className="flex-1 bg-[#b82535]" />
                  </span>

                  {/* INFORMAÇÃO DA EDIÇÃO */}

                  <span className="block min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d]">
                      EDIÇÃO REGISTADA
                    </span>

                    <span
                      className={`${boldIMIP.className} mt-3 block break-words text-[clamp(1.5rem,2.4vw,2.5rem)] font-bold uppercase leading-[1.14] text-[#f0e6d1] group-hover:text-[#f0d58e]`}
                    >
                      {edicao.nome}
                    </span>

                    {/* ORGANIZAÇÃO DO REGISTO */}

                    {administrador && (
                      <span className="mt-3 block break-words border-l-2 border-[#087a43] pl-3 text-xs font-bold leading-relaxed text-[#d6b56d] sm:text-sm">
                        {organizacoes.find(
                          (org) =>
                            org.id ===
                            edicao.organizacao_id,
                        )?.nome ?? "Organização"}
                      </span>
                    )}

                    {/* AVISO DO PRAZO DE 48 HORAS */}

                    {administrador &&
                      edicao.data_edicao &&
                      !edicao.data_submissao &&
                      Date.now() >
                        new Date(
                          `${edicao.data_edicao}T00:00:00`,
                        ).getTime() +
                          48 * 60 * 60 * 1000 && (
                        <span className="mt-4 block border-l-4 border-[#b82535] bg-[#b82535]/15 px-3 py-3 text-xs font-bold leading-relaxed text-red-200">
                          REGISTO POR SUBMETER ·
                          PRAZO DE 48 HORAS TERMINADO
                        </span>
                      )}

                    {/* DATA E FORMATO */}

                    <span className="mt-4 block border-t border-[#d6b56d]/20 pt-3 text-xs font-bold uppercase leading-relaxed tracking-[0.04em] text-[#bfc9bd] sm:text-sm">
                      {formatarData(
                        edicao.data_edicao,
                      )}

                      {edicao.formato
                        ? ` · ${edicao.formato}`
                        : ""}
                    </span>
                  </span>

                  {/* SETA */}

                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#d6b56d]/35 text-2xl font-black text-[#d6b56d] transition-transform group-hover:translate-x-1 group-hover:border-[#d6b56d] sm:h-14 sm:w-14"
                  >
                    ↗
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* NOVA SECÇÃO:
            FREES DE CAMPEÃO */}

        {!loading && !erro && (
          <GestaoFreesCampeao
            edicoes={edicoes}
          />
        )}

        {/* INFORMAÇÃO COMPLEMENTAR */}

        <aside className="mt-10 border-l-4 border-[#087a43] bg-[#0a110d]/95 px-5 py-6 sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d6b56d]">
            CONTINUAR A GESTÃO
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#e1e5dd] sm:text-base">
            A seleção de uma edição abre
            a respetiva área de apontamentos.
            Os participantes, os resultados
            das batalhas e os restantes registos
            continuam associados à edição
            selecionada.
          </p>

          <Link
            href="/organizacao"
            className="mt-5 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
          >
            VOLTAR AO PAINEL ↗
          </Link>
        </aside>

        {/* RODAPÉ */}

        <footer className="mt-14 border-t border-[#d6b56d]/35 pt-8 text-center">
          <p
            className={`${veneerIMIP.className} text-xl font-normal uppercase tracking-[0.04em] text-[#d6b56d] sm:text-2xl`}
          >
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ded8ca]">
            NACIONAL DE RUA · IMIP ·
            IMPROVISO MADE IN PORTUGAL
          </p>
        </footer>
      </div>
    </main>
  );
}
