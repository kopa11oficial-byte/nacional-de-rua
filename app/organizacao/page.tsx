
"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { boldIMIP, veneerIMIP } from "../fonts/identidade";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

/* eslint-disable @next/next/no-img-element */

// ====================================================
// IMIP — PAINEL DA ORGANIZAÇÃO
//
// Correções:
// 1. Tempo máximo para consultas essenciais.
// 2. Carregamento da organização separado
//    da gestão administrativa dos MCs.
// 3. Identificação da conta quando falha o acesso.
// 4. Opção de tentar novamente sem perder a página.
// 5. Consulta das rodas da própria organização.
//
// Não altera dados nem políticas do Supabase.
// ====================================================

type Organizacao = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
  email: string;
  telefone: string | null;
};

type RodaDaOrganizacao = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
  logo_url: string | null;
};

type MC = {
  id: string;
  nome_artistico: string;
  cidade: string | null;
  distrito: string | null;
  foto_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  spotify_url: string | null;
};

type FormularioMC = {
  nome_artistico: string;
  cidade: string;
  distrito: string;
  foto_url: string;
  bio: string;
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  spotify_url: string;
};

const formularioVazio: FormularioMC = {
  nome_artistico: "",
  cidade: "",
  distrito: "",
  foto_url: "",
  bio: "",
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  spotify_url: "",
};

const redes = [
  {
    campo: "instagram_url",
    titulo: "Instagram",
    exemplo: "https://www.instagram.com/nome",
    dominios: [
      "instagram.com",
      "www.instagram.com",
    ],
  },
  {
    campo: "youtube_url",
    titulo: "YouTube",
    exemplo: "https://www.youtube.com/@nome",
    dominios: [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ],
  },
  {
    campo: "tiktok_url",
    titulo: "TikTok",
    exemplo: "https://www.tiktok.com/@nome",
    dominios: [
      "tiktok.com",
      "www.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ],
  },
  {
    campo: "spotify_url",
    titulo: "Spotify",
    exemplo: "https://open.spotify.com/artist/...",
    dominios: [
      "open.spotify.com",
    ],
  },
] as const;

const classeCampo =
  "mt-2 w-full min-w-0 border border-[#d6b56d]/40 bg-[#101713] px-4 py-3 text-sm text-[#f0e6d1] outline-none transition placeholder:text-[#8e988d] focus:border-[#d6b56d] focus:ring-2 focus:ring-[#d6b56d]/20 disabled:opacity-60";

const classeEtiqueta =
  "block text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e]";

const classeLigacao =
  "group flex min-h-[84px] min-w-0 items-center justify-between gap-4 border border-[#d6b56d]/35 bg-[#0a110d]/95 px-5 py-4 text-sm font-black uppercase tracking-[0.025em] text-[#f0e6d1] transition hover:border-[#d6b56d] hover:bg-[#14251a]";

const classeBotaoPrincipal =
  "inline-flex min-h-12 items-center justify-center bg-[#d6b56d] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.06em] text-[#101713] transition hover:bg-[#f0d58e] disabled:cursor-not-allowed disabled:opacity-50";

// ====================================================
// CONTROLO DE TEMPO DAS CONSULTAS
// ====================================================

const TEMPO_CONSULTA = 15000;
const TEMPO_ADMINISTRACAO = 20000;

async function comTempoLimite<T>(
  operacao: PromiseLike<T>,
  descricao: string,
  milissegundos = TEMPO_CONSULTA,
): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operacao),
      new Promise<never>((_resolve, reject) => {
        temporizador = setTimeout(() => {
          reject(
            new Error(
              `A consulta "${descricao}" demorou demasiado tempo a responder. Tenta novamente.`,
            ),
          );
        }, milissegundos);
      }),
    ]);
  } finally {
    if (temporizador !== undefined) {
      clearTimeout(temporizador);
    }
  }
}

// ====================================================
// AUXILIARES
// ====================================================

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

function urlValida(
  valor: string,
  dominios?: readonly string[],
): boolean {
  if (!valor.trim()) return true;

  try {
    const url = new URL(valor.trim());

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !/\s/.test(valor.trim()) &&
      (!dominios ||
        dominios.includes(
          url.hostname.toLowerCase(),
        ))
    );
  } catch {
    return false;
  }
}

function imagemSegura(
  valor: string | null,
): string | null {
  if (!valor) return null;

  try {
    const url = new URL(valor);

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

// ====================================================
// LOGÓTIPO DAS RODAS
// ====================================================

function LogotipoPequeno({
  roda,
}: {
  roda: RodaDaOrganizacao;
}) {
  const [
    imagemFalhou,
    setImagemFalhou,
  ] = useState(false);

  const imagem = imagemSegura(
    roda.logo_url,
  );

  useEffect(() => {
    setImagemFalhou(false);
  }, [roda.logo_url]);

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border-2 border-[#d6b56d]/50 bg-[#091b13] p-3 sm:h-28 sm:w-28">
      {imagem && !imagemFalhou ? (
        <img
          src={imagem}
          alt={`Logótipo de ${roda.nome}`}
          className="h-full w-full object-contain"
          onError={() =>
            setImagemFalhou(true)
          }
        />
      ) : (
        <span
          className={`${boldIMIP.className} text-5xl font-bold uppercase text-[#d6b56d]`}
        >
          {roda.nome
            .charAt(0)
            .toUpperCase() || "R"}
        </span>
      )}
    </div>
  );
}

// ====================================================
// PÁGINA
// ====================================================

export default function OrganizacaoPage() {
  const router = useRouter();

  const [
    organizacao,
    setOrganizacao,
  ] = useState<Organizacao | null>(null);

  const [rodas, setRodas] =
    useState<RodaDaOrganizacao[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [erroRodas, setErroRodas] =
    useState("");

  const [
    emailAutenticado,
    setEmailAutenticado,
  ] = useState("");

  const [
    tentativa,
    setTentativa,
  ] = useState(0);

  const [
    administrador,
    setAdministrador,
  ] = useState(false);

  const [
    aVerificarAdministrador,
    setAVerificarAdministrador,
  ] = useState(false);

  const [
    erroAdministrador,
    setErroAdministrador,
  ] = useState("");

  const [
    aTerminarSessao,
    setATerminarSessao,
  ] = useState(false);

  const [
    erroSaida,
    setErroSaida,
  ] = useState("");

  // Gestão administrativa de MCs.

  const [mcs, setMcs] =
    useState<MC[]>([]);

  const [
    aCarregarMcs,
    setACarregarMcs,
  ] = useState(false);

  const [
    erroListaMcs,
    setErroListaMcs,
  ] = useState("");

  const [pesquisa, setPesquisa] =
    useState("");

  const [mcId, setMcId] =
    useState("");

  const [
    formulario,
    setFormulario,
  ] = useState<FormularioMC>(
    formularioVazio,
  );

  const [
    aGuardarMC,
    setAGuardarMC,
  ] = useState(false);

  const [
    mensagemMC,
    setMensagemMC,
  ] = useState("");

  const [
    erroMC,
    setErroMC,
  ] = useState("");

  // ==================================================
  // CARREGAR A CONTA E A ORGANIZAÇÃO
  // ==================================================

  useEffect(() => {
    let ativo = true;

    async function carregarPainel() {
      setLoading(true);

      setErro("");
      setErroRodas("");
      setErroAdministrador("");
      setErroListaMcs("");

      setEmailAutenticado("");

      setOrganizacao(null);
      setRodas([]);

      setAdministrador(false);
      setAVerificarAdministrador(false);

      setMcs([]);
      setMcId("");

      try {
        // PRIMEIRO:
        // Identificar o utilizador autenticado.
        //
        // Não carregar MCs nem rankings aqui.

        const {
          data: autenticacao,
          error: erroAuth,
        } = await comTempoLimite(
          supabase.auth.getUser(),
          "autenticação",
        );

        if (!ativo) return;

        if (
          erroAuth ||
          !autenticacao.user
        ) {
          throw new Error(
            "Não foi possível confirmar a sessão. Entra novamente com a conta da organização.",
          );
        }

        const user = autenticacao.user;

        setEmailAutenticado(
          user.email ?? "",
        );

        // SEGUNDO:
        // Encontrar a organização
        // desta conta específica.

        const {
          data: dadosOrganizacao,
          error: erroOrganizacao,
        } = await comTempoLimite(
          supabase
            .from("organizacoes")
            .select(
              "id,nome,cidade,distrito,email,telefone",
            )
            .eq(
              "auth_user_id",
              user.id,
            )
            .eq("ativa", true)
            .maybeSingle(),
          "organização da conta",
        );

        if (!ativo) return;

        if (erroOrganizacao) {
          throw new Error(
            `Não foi possível consultar a organização: ${erroOrganizacao.message}`,
          );
        }

        if (!dadosOrganizacao) {
          throw new Error(
            "A sessão foi reconhecida, mas não foi encontrada uma organização ativa associada a esta conta. Confirma que entraste com o email de organizador correto.",
          );
        }

        const dados =
          dadosOrganizacao as Organizacao;

        // O painel fica disponível
        // assim que a organização é encontrada.
        //
        // Consultas de rodas e MCs
        // deixam de bloquear o painel.

        setOrganizacao(dados);
        setLoading(false);

        // TERCEIRO:
        // Carregar as rodas desta organização.

        void carregarRodas(
          dados.id,
        );

        // QUARTO:
        // Verificar o acesso administrativo
        // de forma independente.

        void carregarAdministracao();
      } catch (falha) {
        if (!ativo) return;

        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar o painel da organização.",
        );

        setLoading(false);
      }
    }

    // ========================================
    // RODAS DA ORGANIZAÇÃO
    // ========================================

    async function carregarRodas(
      organizacaoId: string,
    ) {
      try {
        const {
          data,
          error,
        } = await comTempoLimite(
          supabase
            .from("rodas")
            .select(
              "id,nome,cidade,distrito,logo_url",
            )
            .eq(
              "organizacao_id",
              organizacaoId,
            )
            .order("nome", {
              ascending: true,
            }),
          "rodas da organização",
        );

        if (!ativo) return;

        if (error) {
          throw new Error(error.message);
        }

        setRodas(
          (data ?? []) as RodaDaOrganizacao[],
        );
      } catch (falha) {
        if (!ativo) return;

        setErroRodas(
          falha instanceof Error
            ? `Não foi possível consultar as rodas: ${falha.message}`
            : "Não foi possível consultar as rodas.",
        );
      }
    }

    // ========================================
    // ADMINISTRAÇÃO GERAL
    // ========================================

    async function carregarAdministracao() {
      setAVerificarAdministrador(true);

      try {
        const {
          data: acesso,
          error: erroAcesso,
        } = await comTempoLimite(
          supabase.rpc(
            "e_administrador",
          ),
          "permissões de administração",
        );

        if (!ativo) return;

        if (erroAcesso) {
          throw new Error(
            erroAcesso.message,
          );
        }

        const acessoGeral =
          acesso === true;

        setAdministrador(acessoGeral);

        setAVerificarAdministrador(false);

        if (acessoGeral) {
          void carregarMcs();
        }
      } catch (falha) {
        if (!ativo) return;

        setAdministrador(false);
        setAVerificarAdministrador(false);

        setErroAdministrador(
          falha instanceof Error
            ? `Não foi possível verificar o acesso administrativo: ${falha.message}`
            : "Não foi possível verificar o acesso administrativo.",
        );
      }
    }

    // ========================================
    // MCs — SÓ ADMINISTRADOR
    // ========================================

    async function carregarMcs() {
      setACarregarMcs(true);

      try {
        const lista =
          await comTempoLimite(
            consultarTodas<MC>(
              (inicio, fim) =>
                supabase
                  .from("mcs")
                  .select(
                    "id,nome_artistico,cidade,distrito,foto_url,bio,instagram_url,youtube_url,tiktok_url,spotify_url",
                  )
                  .order("id")
                  .range(inicio, fim),
            ),
            "lista de MCs",
            TEMPO_ADMINISTRACAO,
          );

        if (!ativo) return;

        setMcs(
          lista.sort((a, b) =>
            a.nome_artistico.localeCompare(
              b.nome_artistico,
              "pt-PT",
            ),
          ),
        );
      } catch (falha) {
        if (!ativo) return;

        setErroListaMcs(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar a lista de MCs.",
        );
      } finally {
        if (ativo) {
          setACarregarMcs(false);
        }
      }
    }

    void carregarPainel();

    return () => {
      ativo = false;
    };
  }, [router, tentativa]);

  // ==================================================
  // TENTAR NOVAMENTE
  // ==================================================

  function tentarNovamente() {
    setTentativa(
      (anterior) => anterior + 1,
    );
  }

  // ==================================================
  // TERMINAR SESSÃO
  // ==================================================

  async function terminarSessao() {
    if (aTerminarSessao) return;

    setErroSaida("");
    setATerminarSessao(true);

    try {
      const { error } =
        await comTempoLimite(
          supabase.auth.signOut(),
          "terminar sessão",
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      router.replace(
        "/organizacao/login",
      );

      router.refresh();
    } catch (falha) {
      setErroSaida(
        falha instanceof Error
          ? falha.message
          : "Não foi possível terminar a sessão.",
      );

      setATerminarSessao(false);
    }
  }

  // ==================================================
  // SELECIONAR MC
  // ==================================================

  function escolherMC(id: string) {
    setMcId(id);

    setMensagemMC("");
    setErroMC("");

    const mc = mcs.find(
      (item) => item.id === id,
    );

    setFormulario({
      nome_artistico:
        mc?.nome_artistico ?? "",
      cidade:
        mc?.cidade ?? "",
      distrito:
        mc?.distrito ?? "",
      foto_url:
        mc?.foto_url ?? "",
      bio:
        mc?.bio ?? "",
      instagram_url:
        mc?.instagram_url ?? "",
      youtube_url:
        mc?.youtube_url ?? "",
      tiktok_url:
        mc?.tiktok_url ?? "",
      spotify_url:
        mc?.spotify_url ?? "",
    });
  }

  // ==================================================
  // ALTERAR CAMPO DO MC
  // ==================================================

  function alterarCampo(
    campo: keyof FormularioMC,
    valor: string,
  ) {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      }),
    );

    setMensagemMC("");
    setErroMC("");
  }

  // ==================================================
  // GUARDAR PERFIL DO MC
  // ==================================================

  async function guardarMC(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (aGuardarMC) return;

    setErroMC("");
    setMensagemMC("");

    if (
      !administrador ||
      !mcId ||
      !formulario.nome_artistico.trim()
    ) {
      setErroMC(
        "Seleciona um MC e indica o nome artístico.",
      );

      return;
    }

    if (
      !urlValida(
        formulario.foto_url,
      )
    ) {
      setErroMC(
        "A fotografia deve ter uma ligação HTTPS válida.",
      );

      return;
    }

    for (const rede of redes) {
      if (
        !urlValida(
          formulario[rede.campo],
          rede.dominios,
        )
      ) {
        setErroMC(
          `Indica uma ligação HTTPS válida do ${rede.titulo}.`,
        );

        return;
      }
    }

    if (
      formulario.bio.trim().length >
      1200
    ) {
      setErroMC(
        "A bio pode ter até 1200 caracteres.",
      );

      return;
    }

    const idGuardado = mcId;

    const dados: FormularioMC = {
      nome_artistico:
        formulario.nome_artistico.trim(),
      cidade:
        formulario.cidade.trim(),
      distrito:
        formulario.distrito.trim(),
      foto_url:
        formulario.foto_url.trim(),
      bio:
        formulario.bio.trim(),
      instagram_url:
        formulario.instagram_url.trim(),
      youtube_url:
        formulario.youtube_url.trim(),
      tiktok_url:
        formulario.tiktok_url.trim(),
      spotify_url:
        formulario.spotify_url.trim(),
    };

    setAGuardarMC(true);

    try {
      // A autorização da operação
      // continua a ser validada no Supabase,
      // através da função existente.

      const {
        error,
      } = await comTempoLimite(
        supabase.rpc(
          "editar_perfil_mc_completo",
          {
            p_mc_id:
              idGuardado,
            p_nome_artistico:
              dados.nome_artistico,
            p_cidade:
              dados.cidade,
            p_distrito:
              dados.distrito,
            p_foto_url:
              dados.foto_url,
            p_bio:
              dados.bio,
            p_instagram_url:
              dados.instagram_url,
            p_youtube_url:
              dados.youtube_url,
            p_tiktok_url:
              dados.tiktok_url,
            p_spotify_url:
              dados.spotify_url,
          },
        ),
        "guardar MC",
      );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      setMcs((lista) =>
        lista
          .map((mc) =>
            mc.id === idGuardado
              ? {
                  ...mc,
                  nome_artistico:
                    dados.nome_artistico,
                  cidade:
                    dados.cidade || null,
                  distrito:
                    dados.distrito || null,
                  foto_url:
                    dados.foto_url || null,
                  bio:
                    dados.bio || null,
                  instagram_url:
                    dados.instagram_url || null,
                  youtube_url:
                    dados.youtube_url || null,
                  tiktok_url:
                    dados.tiktok_url || null,
                  spotify_url:
                    dados.spotify_url || null,
                }
              : mc,
          )
          .sort((a, b) =>
            a.nome_artistico.localeCompare(
              b.nome_artistico,
              "pt-PT",
            ),
          ),
      );

      setFormulario(dados);

      setMensagemMC(
        "Perfil atualizado com sucesso.",
      );
    } catch (falha) {
      setErroMC(
        falha instanceof Error
          ? falha.message
          : "Não foi possível guardar o perfil.",
      );
    } finally {
      setAGuardarMC(false);
    }
  }

  // ==================================================
  // PESQUISA DE MCs
  // ==================================================

  const mcsVisiveis = mcs.filter(
    (mc) =>
      mc.nome_artistico
        .toLocaleLowerCase("pt-PT")
        .includes(
          pesquisa
            .trim()
            .toLocaleLowerCase("pt-PT"),
        ),
  );

  // ==================================================
  // ECRÃ DE CARREGAMENTO
  // ==================================================

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 text-[#f0e6d1]">
        <div className="w-full max-w-md overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95">
          <FaixaPortugal />

          <div className="p-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d6b56d]">
              NACIONAL DE RUA · IMIP
            </p>

            <p
              role="status"
              className={`${boldIMIP.className} mt-4 text-2xl font-bold uppercase`}
            >
              A CARREGAR...
            </p>

            <p className="mt-4 text-xs leading-6 text-zinc-300">
              A confirmar a conta e a organização.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==================================================
  // ECRÃ DE ERRO / CONTA NÃO ASSOCIADA
  // ==================================================

  if (!organizacao) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 text-[#f0e6d1]">
        <div className="w-full max-w-xl overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95">
          <FaixaPortugal />

          <div className="p-6 sm:p-9">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
              IMIP · ACESSO À ORGANIZAÇÃO
            </p>

            <h1
              className={`${boldIMIP.className} mt-4 text-3xl font-bold uppercase leading-tight text-white`}
            >
              NÃO FOI POSSÍVEL ABRIR O PAINEL.
            </h1>

            <p
              role="alert"
              className="mt-6 border-l-4 border-[#b82535] bg-black/45 p-4 text-sm leading-7 text-red-200"
            >
              {erro ||
                "Não foi encontrada uma organização para esta conta."}
            </p>

            {emailAutenticado && (
              <div className="mt-5 border border-[#d6b56d]/30 bg-black/35 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
                  CONTA AUTENTICADA
                </p>

                <p className="mt-2 break-all text-sm font-bold text-white">
                  {emailAutenticado}
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={tentarNovamente}
                className={`${classeBotaoPrincipal}`}
              >
                TENTAR NOVAMENTE ↻
              </button>

              <button
                type="button"
                onClick={() =>
                  void terminarSessao()
                }
                disabled={aTerminarSessao}
                className="inline-flex min-h-12 items-center justify-center border border-[#d6b56d]/50 px-5 py-3 text-xs font-black uppercase text-[#d6b56d] transition hover:bg-white/5 disabled:opacity-50"
              >
                {aTerminarSessao
                  ? "A SAIR..."
                  : "TROCAR DE CONTA ↗"}
              </button>
            </div>

            {erroSaida && (
              <p
                role="alert"
                className="mt-4 text-sm text-red-200"
              >
                {erroSaida}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ==================================================
  // PAINEL PRINCIPAL
  // ==================================================

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        {/* NAVEGAÇÃO */}

        <nav
          aria-label="Navegação da organização"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · ÁREA DE ORGANIZAÇÃO
          </span>
        </nav>

        {/* CABEÇALHO */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95 sm:mt-7">
          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative">
                <p className="imip-etiqueta">
                  IMPROVISO MADE IN PORTUGAL
                </p>

                <h1
                  className={`${boldIMIP.className} mt-6 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(2.6rem,4.7vw,5.4rem)] text-[#f0e6d1]">
                    PAINEL DA
                  </span>

                  <span className="mt-1 block text-[clamp(2.15rem,3.7vw,4.3rem)] text-[#d6b56d]">
                    ORGANIZAÇÃO
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-6 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-base font-bold leading-relaxed text-[#f0e6d1] sm:text-lg">
                  A gestão do circuito começa nas
                  organizações que fazem a rua acontecer.
                </p>

                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#cdd5cb]">
                  Consulta os dados da tua organização,
                  personaliza a identidade das tuas
                  rodas e gere as edições do circuito.
                </p>
              </div>

              <p
                className={`${veneerIMIP.className} relative mt-9 border-l-4 border-[#d6b56d] pl-4 text-xl font-normal uppercase leading-[1.12] tracking-[0.025em] text-[#f0d58e] sm:text-2xl`}
              >
                A RUA TEM VOZ.
                <span className="block text-[#f0e6d1]">
                  A ORGANIZAÇÃO DÁ-LHE ESTRUTURA.
                </span>
              </p>
            </div>

            {/* DADOS DA CONTA */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/35 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  ORGANIZAÇÃO IDENTIFICADA
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <h2
                  className={`${boldIMIP.className} mt-7 break-words text-[clamp(1.8rem,2.8vw,3rem)] font-bold uppercase leading-[1.1]`}
                >
                  {organizacao.nome}
                </h2>

                <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[#8e2935]">
                  {administrador
                    ? "ACESSO DE ORGANIZADOR GERAL"
                    : "ACESSO DE ORGANIZAÇÃO"}
                </p>

                <dl className="mt-7 grid gap-4 border-t border-[#101713]/25 pt-5 sm:grid-cols-2">
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8e2935]">
                      EMAIL
                    </dt>

                    <dd className="mt-1 break-all text-sm font-bold">
                      {organizacao.email}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8e2935]">
                      TELEFONE
                    </dt>

                    <dd className="mt-1 text-sm font-bold">
                      {organizacao.telefone || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8e2935]">
                      CIDADE
                    </dt>

                    <dd className="mt-1 text-sm font-bold">
                      {organizacao.cidade || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8e2935]">
                      DISTRITO
                    </dt>

                    <dd className="mt-1 text-sm font-bold">
                      {organizacao.distrito || "—"}
                    </dd>
                  </div>
                </dl>

                {emailAutenticado &&
                  emailAutenticado.toLowerCase() !==
                    organizacao.email.toLowerCase() && (
                    <p className="mt-5 border-l-4 border-[#b82535] bg-white/60 px-3 py-3 text-xs font-bold leading-6">
                      Atenção: o email autenticado
                      é {emailAutenticado}, diferente
                      do email de contacto desta
                      organização.
                    </p>
                  )}
              </div>

              <div className="relative z-10 mt-8 border-t-4 border-[#101713] pt-5">
                <button
                  type="button"
                  onClick={() =>
                    void terminarSessao()
                  }
                  disabled={aTerminarSessao}
                  className="inline-flex min-h-11 w-full items-center justify-center border border-[#101713] bg-[#101713] px-5 py-3 text-xs font-black uppercase tracking-[0.06em] text-[#f0e6d1] transition hover:bg-[#b82535] disabled:opacity-50 sm:w-auto"
                >
                  {aTerminarSessao
                    ? "A TERMINAR SESSÃO..."
                    : "TERMINAR SESSÃO ↗"}
                </button>

                {erroSaida && (
                  <p
                    role="alert"
                    className="mt-4 text-sm font-bold text-[#8e2935]"
                  >
                    {erroSaida}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* =======================================
            AS MINHAS RODAS
            ======================================= */}

        <section
          id="minhas-rodas"
          className="mt-10"
        >
          <p className="imip-etiqueta">
            IDENTIDADE · PERFIS · PERSONALIZAÇÃO
          </p>

          <h2
            className={`${boldIMIP.className} mt-3 text-[clamp(2rem,3.7vw,4rem)] font-bold uppercase leading-[1.05]`}
          >
            AS MINHAS
            <span className="text-[#d6b56d]">
              {" "}RODAS.
            </span>
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d3d9d0]">
            Cada roda tem a sua identidade.
            Acede ao perfil público e personaliza
            as rodas associadas à tua organização.
          </p>

          {erroRodas && (
            <div className="mt-5 border-l-4 border-[#b82535] bg-[#220f13] p-5">
              <p
                role="alert"
                className="text-sm font-bold text-red-200"
              >
                {erroRodas}
              </p>

              <button
                type="button"
                onClick={tentarNovamente}
                className="mt-4 text-xs font-black uppercase text-[#d6b56d] underline"
              >
                TENTAR NOVAMENTE ↻
              </button>
            </div>
          )}

          {!erroRodas && rodas.length === 0 && (
            <div className="mt-6 border border-[#d6b56d]/30 bg-[#091b13]/95 p-6">
              <p className="text-sm text-zinc-300">
                Ainda não existem rodas apresentadas
                para esta organização.
              </p>
            </div>
          )}

          {rodas.length > 0 && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {rodas.map((roda) => (
                <article
                  key={roda.id}
                  className="overflow-hidden border border-[#d6b56d]/35 bg-[#091b13]/95"
                >
                  <FaixaPortugal />

                  <div className="p-5 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row">
                      <LogotipoPequeno
                        roda={roda}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
                          PERFIL DA RODA
                        </p>

                        <h3
                          className={`${boldIMIP.className} mt-3 break-words text-2xl font-bold uppercase text-white sm:text-3xl`}
                        >
                          {roda.nome}
                        </h3>

                        <p className="mt-3 text-sm text-[#cdd5cb]">
                          {[
                            roda.cidade,
                            roda.distrito,
                          ]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Localização não indicada"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 grid gap-3 border-t border-[#d6b56d]/25 pt-5 sm:grid-cols-2">
                      <Link
                        href={`/rodas/${roda.id}`}
                        className="inline-flex min-h-12 items-center justify-center border border-[#d6b56d]/55 bg-black/30 px-4 py-3 text-center text-xs font-black uppercase text-white transition hover:bg-[#14251a]"
                      >
                        VER PERFIL PÚBLICO ↗
                      </Link>

                      <Link
                        href={`/organizacao/rodas/${roda.id}/editar`}
                        className="inline-flex min-h-12 items-center justify-center bg-[#d6b56d] px-4 py-3 text-center text-xs font-black uppercase text-[#101713] transition hover:bg-[#f0d58e]"
                      >
                        PERSONALIZAR A RODA ↗
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* =======================================
            GESTÃO DAS EDIÇÕES
            ======================================= */}

        <section className="mt-11">
          <p className="imip-etiqueta">
            FERRAMENTAS DE GESTÃO
          </p>

          <h2
            className={`${boldIMIP.className} mt-3 text-[clamp(2rem,3.7vw,4rem)] font-bold uppercase leading-[1.1]`}
          >
            GERIR O
            <span className="text-[#d6b56d]">
              {" "}MOVIMENTO.
            </span>
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/organizacao/nova-edicao"
              className="group relative flex min-h-[155px] flex-col justify-between overflow-hidden border border-[#d6b56d]/45 bg-[#d6b56d] p-5 text-[#101713] transition hover:bg-[#f0d58e] sm:p-6"
            >
              <span className="absolute left-0 top-0 h-[5px] w-full bg-[#087a43]" />

              <div className="flex justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  EDIÇÕES
                </span>

                <span className="text-2xl font-black">
                  ↗
                </span>
              </div>

              <div>
                <h3
                  className={`${boldIMIP.className} text-[clamp(1.6rem,2.3vw,2.5rem)] font-bold uppercase leading-tight`}
                >
                  REGISTAR NOVA EDIÇÃO
                </h3>

                <p className="mt-2 text-xs font-bold">
                  Criar o registo de uma edição do circuito.
                </p>
              </div>
            </Link>

            <Link
              href="/organizacao/gerir-edicao"
              className="group relative flex min-h-[155px] flex-col justify-between overflow-hidden border border-[#d6b56d]/45 bg-[#0a110d]/95 p-5 transition hover:border-[#f0d58e] hover:bg-[#14251a] sm:p-6"
            >
              <span className="absolute left-0 top-0 h-[5px] w-full bg-[#b82535]" />

              <div className="flex justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
                  GESTÃO
                </span>

                <span className="text-2xl font-black text-[#d6b56d]">
                  ↗
                </span>
              </div>

              <div>
                <h3
                  className={`${boldIMIP.className} text-[clamp(1.6rem,2.3vw,2.5rem)] font-bold uppercase leading-tight`}
                >
                  GERIR EDIÇÃO
                </h3>

                <p className="mt-2 text-xs text-[#cbd2c9]">
                  Consultar e gerir edições existentes.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* =======================================
            ADMINISTRAÇÃO GERAL
            ======================================= */}

        {aVerificarAdministrador && (
          <p
            role="status"
            className="mt-8 text-xs font-bold text-[#d6b56d]"
          >
            A verificar as ferramentas de administração...
          </p>
        )}

        {erroAdministrador && (
          <div className="mt-8 border-l-4 border-[#b82535] bg-black/80 p-5">
            <p
              role="alert"
              className="text-sm text-red-200"
            >
              {erroAdministrador}
            </p>

            <button
              type="button"
              onClick={tentarNovamente}
              className="mt-3 text-xs font-black uppercase text-[#d6b56d] underline"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        )}

        {administrador && (
          <section className="mt-11">
            <div className="border-l-4 border-[#d6b56d] bg-[#0a110d]/95 p-6">
              <p className="imip-etiqueta">
                ACESSO DE ORGANIZADOR GERAL
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white sm:text-4xl`}
              >
                ADMINISTRAÇÃO
                <span className="text-[#d6b56d]">
                  {" "}GERAL.
                </span>
              </h2>

              <p className="mt-4 text-sm leading-7 text-zinc-300">
                Ferramentas disponíveis apenas
                para contas com autorização administrativa.
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Link
                href="/organizacao/suporte"
                className={classeLigacao}
              >
                <span>PAINEL DE SUPORTE</span>
                <span className="text-xl text-[#d6b56d]">
                  ↗
                </span>
              </Link>

              <Link
                href="/organizacao/mcs-pendentes"
                className={classeLigacao}
              >
                <span>MCs SEM REGISTO</span>
                <span className="text-xl text-[#d6b56d]">
                  ↗
                </span>
              </Link>
            </div>

            {/* ADMINISTRAÇÃO DOS MCs */}

            <section
              id="editar-mc"
              className="mt-8 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95"
            >
              <FaixaPortugal />

              <div className="p-5 sm:p-8">
                <p className="imip-etiqueta">
                  ADMINISTRAÇÃO DE PERFIS
                </p>

                <h2
                  className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white`}
                >
                  EDITAR PERFIL
                  <span className="text-[#d6b56d]">
                    {" "}DE MC.
                  </span>
                </h2>

                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Atualiza os dados e as redes
                  sociais dos artistas. As pontuações
                  e os resultados não são alterados.
                </p>

                {aCarregarMcs && (
                  <p
                    role="status"
                    className="mt-5 text-sm text-[#d6b56d]"
                  >
                    A carregar os MCs...
                  </p>
                )}

                {erroListaMcs && (
                  <p
                    role="alert"
                    className="mt-5 border-l-4 border-[#b82535] bg-black/50 p-4 text-sm text-red-200"
                  >
                    {erroListaMcs}
                  </p>
                )}

                <div className="mt-7 grid gap-5 border border-[#d6b56d]/20 bg-black/35 p-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label
                      htmlFor="pesquisa-mc"
                      className={classeEtiqueta}
                    >
                      PROCURAR MC
                    </label>

                    <input
                      id="pesquisa-mc"
                      type="search"
                      value={pesquisa}
                      disabled={
                        aGuardarMC ||
                        aCarregarMcs
                      }
                      onChange={(evento) =>
                        setPesquisa(
                          evento.target.value,
                        )
                      }
                      placeholder="Nome artístico"
                      className={classeCampo}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="escolher-mc"
                      className={classeEtiqueta}
                    >
                      SELECIONAR MC
                    </label>

                    <select
                      id="escolher-mc"
                      value={mcId}
                      disabled={
                        aGuardarMC ||
                        aCarregarMcs
                      }
                      onChange={(evento) =>
                        escolherMC(
                          evento.target.value,
                        )
                      }
                      className={classeCampo}
                    >
                      <option value="">
                        Seleciona um MC
                      </option>

                      {mcsVisiveis.map((mc) => (
                        <option
                          key={mc.id}
                          value={mc.id}
                        >
                          {mc.nome_artistico}
                        </option>
                      ))}

                      {mcId &&
                        !mcsVisiveis.some(
                          (mc) => mc.id === mcId,
                        ) && (
                          <option value={mcId}>
                            {mcs.find(
                              (mc) => mc.id === mcId,
                            )?.nome_artistico}
                          </option>
                        )}
                    </select>
                  </div>
                </div>

                {mcId && (
                  <form
                    onSubmit={guardarMC}
                    className="mt-8 space-y-6"
                  >
                    <fieldset
                      disabled={aGuardarMC}
                      className="min-w-0 space-y-6 disabled:opacity-70"
                    >
                      <legend
                        className={`${boldIMIP.className} mb-6 text-xl font-bold uppercase text-[#d6b56d]`}
                      >
                        APRESENTAÇÃO DO ARTISTA
                      </legend>

                      <div>
                        <label
                          htmlFor="nome-mc"
                          className={classeEtiqueta}
                        >
                          NOME ARTÍSTICO
                        </label>

                        <input
                          id="nome-mc"
                          required
                          value={
                            formulario.nome_artistico
                          }
                          onChange={(evento) =>
                            alterarCampo(
                              "nome_artistico",
                              evento.target.value,
                            )
                          }
                          className={classeCampo}
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="cidade-mc"
                            className={classeEtiqueta}
                          >
                            CIDADE
                          </label>

                          <input
                            id="cidade-mc"
                            value={formulario.cidade}
                            onChange={(evento) =>
                              alterarCampo(
                                "cidade",
                                evento.target.value,
                              )
                            }
                            className={classeCampo}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="distrito-mc"
                            className={classeEtiqueta}
                          >
                            DISTRITO
                          </label>

                          <input
                            id="distrito-mc"
                            value={formulario.distrito}
                            onChange={(evento) =>
                              alterarCampo(
                                "distrito",
                                evento.target.value,
                              )
                            }
                            className={classeCampo}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="foto-mc"
                          className={classeEtiqueta}
                        >
                          FOTOGRAFIA · LIGAÇÃO DIRETA
                        </label>

                        <input
                          id="foto-mc"
                          type="url"
                          maxLength={2000}
                          value={formulario.foto_url}
                          onChange={(evento) =>
                            alterarCampo(
                              "foto_url",
                              evento.target.value,
                            )
                          }
                          placeholder="https://exemplo.pt/foto.jpg"
                          className={classeCampo}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="bio-mc"
                          className={classeEtiqueta}
                        >
                          BIO
                        </label>

                        <textarea
                          id="bio-mc"
                          rows={5}
                          maxLength={1200}
                          value={formulario.bio}
                          onChange={(evento) =>
                            alterarCampo(
                              "bio",
                              evento.target.value,
                            )
                          }
                          className={`${classeCampo} resize-y`}
                        />

                        <p className="mt-2 text-right text-xs text-zinc-400">
                          {formulario.bio.length}/1200
                        </p>
                      </div>

                      <div className="border-t border-[#d6b56d]/25 pt-6">
                        <h3
                          className={`${boldIMIP.className} text-xl font-bold uppercase text-[#d6b56d]`}
                        >
                          REDES SOCIAIS E MÚSICA
                        </h3>

                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          {redes.map((rede) => (
                            <div key={rede.campo}>
                              <label
                                htmlFor={rede.campo}
                                className={classeEtiqueta}
                              >
                                {rede.titulo}
                              </label>

                              <input
                                id={rede.campo}
                                type="url"
                                maxLength={2000}
                                value={
                                  formulario[rede.campo]
                                }
                                onChange={(evento) =>
                                  alterarCampo(
                                    rede.campo,
                                    evento.target.value,
                                  )
                                }
                                placeholder={rede.exemplo}
                                className={classeCampo}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={`${classeBotaoPrincipal} w-full sm:w-auto`}
                      >
                        {aGuardarMC
                          ? "A GUARDAR..."
                          : "GUARDAR PERFIL ↗"}
                      </button>
                    </fieldset>

                    {erroMC && (
                      <p
                        role="alert"
                        className="border-l-4 border-[#b82535] bg-black/50 p-4 text-sm text-red-200"
                      >
                        {erroMC}
                      </p>
                    )}

                    {mensagemMC && (
                      <p
                        role="status"
                        className="border-l-4 border-[#087a43] bg-black/50 p-4 text-sm text-green-200"
                      >
                        {mensagemMC}
                      </p>
                    )}

                    <Link
                      href={`/mcs/${mcId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center border border-[#d6b56d]/50 px-5 py-3 text-xs font-black uppercase text-[#f0d58e] hover:bg-[#14251a]"
                    >
                      VER PERFIL PÚBLICO ↗
                    </Link>
                  </form>
                )}
              </div>
            </section>
          </section>
        )}

        {/* =======================================
            CONSULTAR O IMIP
            ======================================= */}

        <section className="mt-12">
          <p className="imip-etiqueta">
            INFORMAÇÃO DO CIRCUITO
          </p>

          <h2
            className={`${boldIMIP.className} mt-3 text-[clamp(1.8rem,3.1vw,3.3rem)] font-bold uppercase leading-[1.1]`}
          >
            CONSULTAR
            <span className="text-[#d6b56d]">
              {" "}O IMIP.
            </span>
          </h2>

          <nav
            className="mt-6 grid gap-4 sm:grid-cols-2"
            aria-label="Opções da organização"
          >
            <Link
              href="/ranking"
              className={classeLigacao}
            >
              <span>
                CONSULTAR RANKING NACIONAL
              </span>

              <span className="text-xl text-[#d6b56d]">
                ↗
              </span>
            </Link>

            <Link
              href="/mcs"
              className={classeLigacao}
            >
              <span>CONSULTAR MCs</span>

              <span className="text-xl text-[#d6b56d]">
                ↗
              </span>
            </Link>

            <Link
              href="/rodas"
              className={classeLigacao}
            >
              <span>
                CONSULTAR RANKINGS DAS RODAS
              </span>

              <span className="text-xl text-[#d6b56d]">
                ↗
              </span>
            </Link>

            <Link
              href="/organizacao/gerir-edicao"
              className={classeLigacao}
            >
              <span>GERIR EDIÇÃO</span>

              <span className="text-xl text-[#d6b56d]">
                ↗
              </span>
            </Link>
          </nav>
        </section>

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
