
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { boldIMIP, veneerIMIP } from "../../../../fonts/identidade";

/* eslint-disable @next/next/no-img-element */

// ===================================================
// IMIP — PERSONALIZAÇÃO DO PERFIL DAS RODAS
//
// - Imagens carregadas do computador
// - Pré-visualização de logótipo e capa
// - Substituição ou remoção de imagens
// - Identidade, lema, cores e redes sociais
// - Verificação da organização proprietária
// - Dados guardados em roda_personalizacao
//
// Bucket previsto: imagens-rodas
// O bucket e as respetivas políticas de Storage
// serão configurados antes do primeiro upload.
//
// Não altera rodas, edições, rankings ou pontuações.
// ===================================================

type Roda = {
  id: string;
  organizacao_id: string;
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

type Personalizacao = {
  roda_id: string;
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

type Formulario = {
  nome_publico: string;
  cidade_publica: string;
  distrito_publico: string;
  descricao: string;
  logo_url: string;
  capa_url: string;
  lema: string;
  cor_destaque: string;
  cor_fundo: string;
  cor_lema: string;
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  spotify_url: string;
  x_url: string;
};

type CampoFormulario = keyof Formulario;

type TipoImagem = "logo" | "capa";

const BUCKET = "imagens-rodas";

const LIMITE_IMAGEM = 5 * 1024 * 1024;

const FORMATOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CORES = {
  destaque: "#d6b56d",
  fundo: "#091b13",
  lema: "#ffffff",
};

const formularioInicial: Formulario = {
  nome_publico: "",
  cidade_publica: "",
  distrito_publico: "",
  descricao: "",
  logo_url: "",
  capa_url: "",
  lema: "A RUA TEM VOZ.",
  cor_destaque: CORES.destaque,
  cor_fundo: CORES.fundo,
  cor_lema: CORES.lema,
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  spotify_url: "",
  x_url: "",
};

const redes = [
  {
    campo: "instagram_url",
    nome: "Instagram",
    exemplo: "https://www.instagram.com/...",
    dominios: ["instagram.com", "www.instagram.com"],
  },
  {
    campo: "youtube_url",
    nome: "YouTube",
    exemplo: "https://www.youtube.com/@...",
    dominios: [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ],
  },
  {
    campo: "tiktok_url",
    nome: "TikTok",
    exemplo: "https://www.tiktok.com/@...",
    dominios: [
      "tiktok.com",
      "www.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ],
  },
  {
    campo: "spotify_url",
    nome: "Spotify",
    exemplo: "https://open.spotify.com/...",
    dominios: ["open.spotify.com"],
  },
  {
    campo: "x_url",
    nome: "X",
    exemplo: "https://x.com/...",
    dominios: [
      "x.com",
      "www.x.com",
      "twitter.com",
      "www.twitter.com",
    ],
  },
] as const;

const classeCampo =
  "mt-2 block min-h-12 w-full min-w-0 border border-[#d6b56d]/35 bg-[#080e0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#d6b56d] focus:ring-2 focus:ring-[#d6b56d]/15 disabled:opacity-50";

const classeEtiqueta =
  "block text-[11px] font-black uppercase tracking-[0.12em] text-[#e7c56f]";

const classeBotao =
  "inline-flex min-h-11 items-center justify-center px-4 py-3 text-center text-xs font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-50";

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function corValida(valor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(valor);
}

function corSegura(
  valor: string,
  alternativa: string,
): string {
  return corValida(valor) ? valor : alternativa;
}

function verificarLigacao(
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
        dominios.includes(url.hostname.toLowerCase()))
    );
  } catch {
    return false;
  }
}

function imagemSegura(
  valor: string | null,
): string | null {
  if (!valor?.trim()) return null;

  return verificarLigacao(valor)
    ? valor.trim()
    : null;
}

function validarFicheiro(
  ficheiro: File,
): string | null {
  if (!FORMATOS[ficheiro.type]) {
    return "Escolhe uma imagem JPG, PNG ou WebP.";
  }

  if (ficheiro.size > LIMITE_IMAGEM) {
    return "A imagem não pode ultrapassar 5 MB.";
  }

  if (ficheiro.size === 0) {
    return "O ficheiro selecionado está vazio.";
  }

  return null;
}

function FaixaPortugal() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[6px] w-full overflow-hidden"
    >
      <span className="w-[43%] bg-[#087a43]" />
      <span className="w-[14%] bg-[#d6b56d]" />
      <span className="flex-1 bg-[#b82535]" />
    </div>
  );
}

// ===================================================
// CAMPO DE PERSONALIZAÇÃO DA COR
// ===================================================

function CampoCor({
  titulo,
  descricao,
  valor,
  alternativa,
  alterar,
  desativado,
}: {
  titulo: string;
  descricao: string;
  valor: string;
  alternativa: string;
  alterar: (valor: string) => void;
  desativado: boolean;
}) {
  return (
    <div className="border border-white/15 bg-black/30 p-4">
      <label className={classeEtiqueta}>
        {titulo}
      </label>

      <p className="mt-2 text-xs leading-6 text-zinc-400">
        {descricao}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="color"
          value={corSegura(valor, alternativa)}
          onChange={(evento) =>
            alterar(evento.target.value)
          }
          disabled={desativado}
          aria-label={`Escolher ${titulo.toLowerCase()}`}
          className="h-12 w-16 shrink-0 cursor-pointer border border-white/25 bg-transparent p-1"
        />

        <input
          type="text"
          maxLength={7}
          value={valor}
          onChange={(evento) =>
            alterar(evento.target.value)
          }
          disabled={desativado}
          aria-label={`Código hexadecimal de ${titulo.toLowerCase()}`}
          placeholder={alternativa}
          className="min-h-12 min-w-0 flex-1 border border-white/20 bg-[#080e0b] px-3 py-2 font-mono text-sm uppercase text-white outline-none focus:border-[#d6b56d]"
        />
      </div>

      {!corValida(valor) && (
        <p className="mt-2 text-xs font-bold text-red-300">
          Usa uma cor no formato #RRGGBB.
        </p>
      )}
    </div>
  );
}

// ===================================================
// PRÉ-VISUALIZAÇÃO DE UMA IMAGEM
// ===================================================

function PrevisualizarImagem({
  url,
  tipo,
  nome,
  cor,
}: {
  url: string | null;
  tipo: TipoImagem;
  nome: string;
  cor: string;
}) {
  const [erroImagem, setErroImagem] =
    useState(false);

  useEffect(() => {
    setErroImagem(false);
  }, [url]);

  const imagem =
    url && !erroImagem ? url : null;

  if (tipo === "logo") {
    return (
      <div
        className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden border-2 bg-black/50 p-3"
        style={{ borderColor: cor }}
      >
        {imagem ? (
          <img
            src={imagem}
            alt={`Logótipo de ${nome}`}
            className="h-full w-full object-contain"
            onError={() => setErroImagem(true)}
          />
        ) : (
          <span
            className={`${boldIMIP.className} text-6xl font-bold`}
            style={{ color: cor }}
          >
            {nome.charAt(0).toUpperCase() || "R"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video w-full overflow-hidden border border-white/20 bg-gradient-to-br from-[#123b29] via-[#0b1711] to-[#48121f]"
      style={{ borderColor: cor }}
    >
      {imagem ? (
        <img
          src={imagem}
          alt={`Capa de ${nome}`}
          className="h-full w-full object-cover"
          onError={() => setErroImagem(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center">
          <span className="text-4xl text-[#d6b56d]">
            ▧
          </span>

          <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
            SEM IMAGEM DE CAPA
          </span>
        </div>
      )}
    </div>
  );
}

// ===================================================
// ESCOLHER, SUBSTITUIR E REMOVER IMAGENS
// ===================================================

function EditorImagem({
  tipo,
  nomeRoda,
  urlGuardada,
  ficheiro,
  removida,
  desativado,
  cor,
  selecionar,
  remover,
}: {
  tipo: TipoImagem;
  nomeRoda: string;
  urlGuardada: string;
  ficheiro: File | null;
  removida: boolean;
  desativado: boolean;
  cor: string;
  selecionar: (ficheiro: File) => void;
  remover: () => void;
}) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [urlLocal, setUrlLocal] =
    useState("");

  useEffect(() => {
    if (!ficheiro) {
      setUrlLocal("");
      return;
    }

    const url = URL.createObjectURL(ficheiro);

    setUrlLocal(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ficheiro]);

  const imagemAtual = removida
    ? null
    : urlLocal ||
      imagemSegura(urlGuardada);

  const temImagem =
    Boolean(ficheiro) ||
    (!removida && Boolean(urlGuardada));

  const titulo =
    tipo === "logo"
      ? "LOGÓTIPO DA RODA"
      : "IMAGEM DE CAPA";

  function escolher(
    evento: ChangeEvent<HTMLInputElement>,
  ) {
    const selecionado =
      evento.currentTarget.files?.[0];

    if (!selecionado) return;

    selecionar(selecionado);

    evento.currentTarget.value = "";
  }

  return (
    <div className="border border-[#d6b56d]/25 bg-black/35 p-4 sm:p-5">
      <p className={classeEtiqueta}>
        {titulo}
      </p>

      <div
        className={`mt-5 ${
          tipo === "logo"
            ? "flex flex-col items-center gap-5 sm:flex-row sm:items-start"
            : "space-y-4"
        }`}
      >
        <PrevisualizarImagem
          url={imagemAtual}
          tipo={tipo}
          nome={nomeRoda}
          cor={cor}
        />

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={escolher}
            disabled={desativado}
            className="sr-only"
            aria-label={`Escolher ${titulo.toLowerCase()}`}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={desativado}
              onClick={() =>
                inputRef.current?.click()
              }
              className={`${classeBotao} bg-[#d6b56d] text-[#101713] hover:bg-[#f0d58e]`}
            >
              {temImagem
                ? `ALTERAR ${tipo === "logo" ? "LOGÓTIPO" : "CAPA"}`
                : `ESCOLHER ${tipo === "logo" ? "LOGÓTIPO" : "CAPA"}`}
            </button>

            {temImagem && (
              <button
                type="button"
                disabled={desativado}
                onClick={remover}
                className={`${classeBotao} border border-red-700 text-red-200 hover:bg-red-950/40`}
              >
                REMOVER IMAGEM
              </button>
            )}
          </div>

          <p className="mt-4 text-xs leading-6 text-zinc-400">
            JPG, PNG ou WebP · Máximo 5 MB.
          </p>

          {tipo === "capa" && (
            <p className="mt-1 text-xs leading-6 text-zinc-400">
              Recomenda-se uma imagem horizontal.
            </p>
          )}

          {ficheiro && (
            <p className="mt-3 break-all text-xs font-bold text-[#d6b56d]">
              Selecionado: {ficheiro.name}
            </p>
          )}

          {removida && (
            <p className="mt-3 text-xs font-bold text-amber-300">
              A imagem será retirada do perfil
              quando guardares.
            </p>
          )}

          <p className="mt-3 text-xs leading-6 text-zinc-400">
            Podes experimentar imagens antes
            de guardar as alterações.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===================================================
// PRÉ-VISUALIZAÇÃO GERAL DO PERFIL
// ===================================================

function Previsualizacao({
  formulario,
  nomeOriginal,
  logo,
  capa,
}: {
  formulario: Formulario;
  nomeOriginal: string;
  logo: string | null;
  capa: string | null;
}) {
  const [erroCapa, setErroCapa] =
    useState(false);

  useEffect(() => {
    setErroCapa(false);
  }, [capa]);

  const destaque = corSegura(
    formulario.cor_destaque,
    CORES.destaque,
  );

  const fundo = corSegura(
    formulario.cor_fundo,
    CORES.fundo,
  );

  const corLema = corSegura(
    formulario.cor_lema,
    CORES.lema,
  );

  const nome =
    formulario.nome_publico.trim() ||
    nomeOriginal;

  const local = [
    formulario.cidade_publica,
    formulario.distrito_publico,
  ]
    .filter((valor) => valor.trim())
    .join(" · ");

  const lema =
    formulario.lema.trim() ||
    "A RUA TEM VOZ.";

  return (
    <div className="overflow-hidden border border-white/20 bg-black shadow-2xl">
      <FaixaPortugal />

      {/* CAPA */}

      <div className="relative flex min-h-56 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0c3624] via-[#0a1510] to-[#46121d] p-5 sm:min-h-64 sm:p-7">
        {capa && !erroCapa && (
          <img
            src={capa}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setErroCapa(true)}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-24 h-56 w-56 rotate-12 border-[22px] opacity-20"
          style={{ borderColor: destaque }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/85">
            IMIP · RODAS DE IMPROVISO
          </span>

          <span className="border border-white/35 bg-black/40 px-2 py-1 text-[9px] font-black uppercase text-white">
            NACIONAL DE RUA
          </span>
        </div>

        <div className="relative mt-14">
          <p
            className={`${veneerIMIP.className} break-words text-3xl font-normal uppercase leading-tight sm:text-4xl`}
            style={{ color: corLema }}
          >
            {lema}
          </p>

          <div
            className="mt-4 h-1 w-28"
            style={{ backgroundColor: destaque }}
          />
        </div>
      </div>

      {/* IDENTIDADE */}

      <div
        className="p-5 sm:p-7"
        style={{ backgroundColor: fundo }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PrevisualizarImagem
            url={logo}
            tipo="logo"
            nome={nome}
            cor={destaque}
          />

          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: destaque }}
            >
              IDENTIDADE DA RODA
            </p>

            <h3
              className={`${boldIMIP.className} mt-3 break-words text-2xl font-bold uppercase leading-tight text-white sm:text-3xl`}
            >
              {nome}
            </h3>

            <p className="mt-3 text-sm text-zinc-200">
              {local || "Localização não indicada"}
            </p>
          </div>
        </div>

        <div className="mt-7 border-t border-white/15 pt-5">
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: destaque }}
          >
            A NOSSA HISTÓRIA
          </p>

          <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-zinc-200">
            {formulario.descricao.trim() ||
              "A história desta roda aparecerá aqui quando for preenchida."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {redes
            .filter(
              (rede) =>
                verificarLigacao(
                  formulario[rede.campo],
                  rede.dominios,
                ) &&
                formulario[rede.campo].trim(),
            )
            .map((rede) => (
              <span
                key={rede.campo}
                className="border border-white/30 bg-black/30 px-3 py-2 text-[10px] font-black uppercase text-white"
              >
                {rede.nome} ↗
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

// ===================================================
// PÁGINA DE PERSONALIZAÇÃO
// ===================================================

export default function EditarRodaPage() {
  const params = useParams();
  const router = useRouter();

  const rodaId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [roda, setRoda] =
    useState<Roda | null>(null);

  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);

  const [ficheiroLogo, setFicheiroLogo] =
    useState<File | null>(null);

  const [ficheiroCapa, setFicheiroCapa] =
    useState<File | null>(null);

  const [logoRemovido, setLogoRemovido] =
    useState(false);

  const [capaRemovida, setCapaRemovida] =
    useState(false);

  const [previewLogo, setPreviewLogo] =
    useState("");

  const [previewCapa, setPreviewCapa] =
    useState("");

  const [aCarregar, setACarregar] =
    useState(true);

  const [aGuardar, setAGuardar] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [erroGuardar, setErroGuardar] =
    useState("");

  const [mensagem, setMensagem] =
    useState("");

  // ==========================================
  // URL LOCAL DO LOGÓTIPO
  // ==========================================

  useEffect(() => {
    if (!ficheiroLogo) {
      setPreviewLogo("");
      return;
    }

    const url = URL.createObjectURL(ficheiroLogo);

    setPreviewLogo(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ficheiroLogo]);

  // ==========================================
  // URL LOCAL DA CAPA
  // ==========================================

  useEffect(() => {
    if (!ficheiroCapa) {
      setPreviewCapa("");
      return;
    }

    const url = URL.createObjectURL(ficheiroCapa);

    setPreviewCapa(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ficheiroCapa]);

  // ==========================================
  // AUTENTICAÇÃO E CARREGAMENTO
  // ==========================================

  useEffect(() => {
    if (!rodaId) {
      setErro("Não foi possível identificar a roda.");
      setACarregar(false);
      return;
    }

    let ativo = true;

    async function carregar() {
      setACarregar(true);
      setErro("");

      try {
        const {
          data: { user },
          error: erroAuth,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (erroAuth || !user) {
          router.replace("/organizacao/login");
          return;
        }

        const {
          data: organizacao,
          error: erroOrganizacao,
        } = await supabase
          .from("organizacoes")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("ativa", true)
          .maybeSingle();

        if (erroOrganizacao) {
          throw new Error(
            "Não foi possível verificar a organização.",
          );
        }

        if (!organizacao) {
          throw new Error(
            "Esta conta não tem uma organização ativa associada.",
          );
        }

        const {
          data: rodaData,
          error: erroRoda,
        } = await supabase
          .from("rodas")
          .select(
            "id,organizacao_id,nome,cidade,distrito,descricao,logo_url,instagram_url,youtube_url,tiktok_url,spotify_url,x_url",
          )
          .eq("id", rodaId)
          .eq("organizacao_id", organizacao.id)
          .maybeSingle();

        if (erroRoda) {
          throw new Error(
            "Não foi possível consultar esta roda.",
          );
        }

        if (!rodaData) {
          throw new Error(
            "Não tens autorização para editar esta roda.",
          );
        }

        const {
          data: personalizacao,
          error: erroPersonalizacao,
        } = await supabase
          .from("roda_personalizacao")
          .select(
            "roda_id,nome_publico,cidade_publica,distrito_publico,descricao,logo_url,capa_url,lema,cor_destaque,cor_fundo,cor_lema,instagram_url,youtube_url,tiktok_url,spotify_url,x_url",
          )
          .eq("roda_id", rodaId)
          .maybeSingle();

        if (erroPersonalizacao) {
          throw new Error(
            "Não foi possível carregar a personalização da roda.",
          );
        }

        if (!ativo) return;

        const dadosRoda = rodaData as Roda;
        const p =
          personalizacao as Personalizacao | null;

        setRoda(dadosRoda);

        setFormulario({
          nome_publico:
            p?.nome_publico ??
            dadosRoda.nome,

          cidade_publica:
            p?.cidade_publica ??
            dadosRoda.cidade ??
            "",

          distrito_publico:
            p?.distrito_publico ??
            dadosRoda.distrito ??
            "",

          descricao:
            p?.descricao ??
            dadosRoda.descricao ??
            "",

          logo_url:
            p?.logo_url ??
            dadosRoda.logo_url ??
            "",

          capa_url:
            p?.capa_url ?? "",

          lema:
            p?.lema ??
            "A RUA TEM VOZ.",

          cor_destaque:
            p?.cor_destaque ??
            CORES.destaque,

          cor_fundo:
            p?.cor_fundo ??
            CORES.fundo,

          cor_lema:
            p?.cor_lema ??
            CORES.lema,

          instagram_url:
            p?.instagram_url ??
            dadosRoda.instagram_url ??
            "",

          youtube_url:
            p?.youtube_url ??
            dadosRoda.youtube_url ??
            "",

          tiktok_url:
            p?.tiktok_url ??
            dadosRoda.tiktok_url ??
            "",

          spotify_url:
            p?.spotify_url ??
            dadosRoda.spotify_url ??
            "",

          x_url:
            p?.x_url ??
            dadosRoda.x_url ??
            "",
        });

        setFicheiroLogo(null);
        setFicheiroCapa(null);
        setLogoRemovido(false);
        setCapaRemovida(false);
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar esta roda.",
          );
        }
      } finally {
        if (ativo) {
          setACarregar(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [rodaId, router]);

  // ==========================================
  // ALTERAR CAMPOS
  // ==========================================

  function atualizarCampo(
    campo: CampoFormulario,
    valor: string,
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagem("");
    setErroGuardar("");
  }

  // ==========================================
  // SELECIONAR IMAGEM
  // ==========================================

  function selecionarImagem(
    tipo: TipoImagem,
    ficheiro: File,
  ) {
    const erroFicheiro =
      validarFicheiro(ficheiro);

    if (erroFicheiro) {
      setErroGuardar(erroFicheiro);
      setMensagem("");
      return;
    }

    setErroGuardar("");
    setMensagem("");

    if (tipo === "logo") {
      setFicheiroLogo(ficheiro);
      setLogoRemovido(false);
    } else {
      setFicheiroCapa(ficheiro);
      setCapaRemovida(false);
    }
  }

  // ==========================================
  // REMOVER IMAGEM
  // ==========================================

  function removerImagem(tipo: TipoImagem) {
    setErroGuardar("");
    setMensagem("");

    if (tipo === "logo") {
      setFicheiroLogo(null);
      setLogoRemovido(true);
    } else {
      setFicheiroCapa(null);
      setCapaRemovida(true);
    }
  }

  // ==========================================
  // UPLOAD PARA O SUPABASE STORAGE
  // ==========================================

  async function carregarImagem(
    ficheiro: File,
    tipo: TipoImagem,
    utilizadorId: string,
    identificadorRoda: string,
  ): Promise<string> {
    const erroFicheiro =
      validarFicheiro(ficheiro);

    if (erroFicheiro) {
      throw new Error(erroFicheiro);
    }

    const extensao =
      FORMATOS[ficheiro.type];

    const caminho =
      `${identificadorRoda}/${utilizadorId}/${tipo}-${Date.now()}-${crypto.randomUUID()}.${extensao}`;

    const { error: erroUpload } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          caminho,
          ficheiro,
          {
            cacheControl: "3600",
            contentType: ficheiro.type,
            upsert: false,
          },
        );

    if (erroUpload) {
      throw new Error(
        `Não foi possível carregar ${
          tipo === "logo"
            ? "o logótipo"
            : "a capa"
        }: ${erroUpload.message}`,
      );
    }

    const { data } =
      supabase.storage
        .from(BUCKET)
        .getPublicUrl(caminho);

    if (!data.publicUrl) {
      throw new Error(
        "Não foi possível obter o endereço da imagem carregada.",
      );
    }

    return data.publicUrl;
  }

  // ==========================================
  // GUARDAR PERSONALIZAÇÃO
  // ==========================================

  async function guardar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!roda || aGuardar) return;

    setMensagem("");
    setErroGuardar("");

    if (!formulario.nome_publico.trim()) {
      setErroGuardar(
        "Indica o nome público da roda.",
      );
      return;
    }

    if (
      formulario.nome_publico.trim().length > 100
    ) {
      setErroGuardar(
        "O nome público pode ter até 100 caracteres.",
      );
      return;
    }

    if (
      formulario.descricao.trim().length > 2500
    ) {
      setErroGuardar(
        "A história da roda pode ter até 2500 caracteres.",
      );
      return;
    }

    if (formulario.lema.trim().length > 140) {
      setErroGuardar(
        "O lema pode ter até 140 caracteres.",
      );
      return;
    }

    if (
      !corValida(formulario.cor_destaque) ||
      !corValida(formulario.cor_fundo) ||
      !corValida(formulario.cor_lema)
    ) {
      setErroGuardar(
        "Confirma as três cores. Usa o formato #RRGGBB.",
      );
      return;
    }

    for (const rede of redes) {
      if (
        !verificarLigacao(
          formulario[rede.campo],
          rede.dominios,
        )
      ) {
        setErroGuardar(
          `Indica uma ligação HTTPS válida do ${rede.nome}.`,
        );
        return;
      }
    }

    setAGuardar(true);

    try {
      // Verificar a sessão.

      const {
        data: { user },
        error: erroAuth,
      } = await supabase.auth.getUser();

      if (erroAuth || !user) {
        throw new Error(
          "A sessão terminou. Inicia sessão novamente.",
        );
      }

      // Confirmar a organização.

      const {
        data: organizacao,
        error: erroOrganizacao,
      } = await supabase
        .from("organizacoes")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("ativa", true)
        .maybeSingle();

      if (erroOrganizacao || !organizacao) {
        throw new Error(
          "Não foi possível confirmar a organização.",
        );
      }

      // Confirmar que a roda pertence
      // à organização autenticada.

      const {
        data: rodaAutorizada,
        error: erroPermissao,
      } = await supabase
        .from("rodas")
        .select("id")
        .eq("id", roda.id)
        .eq("organizacao_id", organizacao.id)
        .maybeSingle();

      if (erroPermissao || !rodaAutorizada) {
        throw new Error(
          "Não tens autorização para alterar esta roda.",
        );
      }

      // Manter as imagens existentes,
      // exceto quando são removidas
      // ou substituídas.

      let urlLogoFinal =
        logoRemovido
          ? null
          : formulario.logo_url.trim() || null;

      let urlCapaFinal =
        capaRemovida
          ? null
          : formulario.capa_url.trim() || null;

      // Carregar o novo logótipo.

      if (ficheiroLogo) {
        urlLogoFinal = await carregarImagem(
          ficheiroLogo,
          "logo",
          user.id,
          roda.id,
        );
      }

      // Carregar a nova capa.

      if (ficheiroCapa) {
        urlCapaFinal = await carregarImagem(
          ficheiroCapa,
          "capa",
          user.id,
          roda.id,
        );
      }

      // Guardar apenas os dados
      // de personalização da roda.

      const {
        data: guardado,
        error: erroEscrita,
      } = await supabase
        .from("roda_personalizacao")
        .upsert(
          {
            roda_id: roda.id,

            nome_publico:
              formulario.nome_publico.trim(),

            cidade_publica:
              formulario.cidade_publica.trim(),

            distrito_publico:
              formulario.distrito_publico.trim(),

            descricao:
              formulario.descricao.trim(),

            logo_url: urlLogoFinal,

            capa_url: urlCapaFinal,

            lema:
              formulario.lema.trim(),

            cor_destaque:
              formulario.cor_destaque.toLowerCase(),

            cor_fundo:
              formulario.cor_fundo.toLowerCase(),

            cor_lema:
              formulario.cor_lema.toLowerCase(),

            instagram_url:
              formulario.instagram_url.trim() || null,

            youtube_url:
              formulario.youtube_url.trim() || null,

            tiktok_url:
              formulario.tiktok_url.trim() || null,

            spotify_url:
              formulario.spotify_url.trim() || null,

            x_url:
              formulario.x_url.trim() || null,

            atualizado_em:
              new Date().toISOString(),
          },
          {
            onConflict: "roda_id",
          },
        )
        .select("roda_id")
        .single();

      if (erroEscrita || !guardado) {
        throw new Error(
          erroEscrita?.message ??
          "Não foi possível confirmar a gravação.",
        );
      }

      // Atualizar o formulário com os
      // endereços das imagens carregadas.

      setFormulario((atual) => ({
        ...atual,
        logo_url: urlLogoFinal ?? "",
        capa_url: urlCapaFinal ?? "",
      }));

      setFicheiroLogo(null);
      setFicheiroCapa(null);

      setLogoRemovido(false);
      setCapaRemovida(false);

      setMensagem(
        "Personalização guardada com sucesso.",
      );
    } catch (falha) {
      setErroGuardar(
        falha instanceof Error
          ? falha.message
          : "Não foi possível guardar a personalização.",
      );
    } finally {
      setAGuardar(false);
    }
  }

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (aCarregar) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07100b] px-5 text-white">
        <div className="w-full max-w-lg overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]">
          <FaixaPortugal />

          <p
            role="status"
            className={`${boldIMIP.className} p-10 text-center text-2xl font-bold uppercase text-[#d6b56d]`}
          >
            A CARREGAR O PERFIL DA RODA...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERRO DE ACESSO
  // ==========================================

  if (erro || !roda) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07100b] px-5 text-white">
        <div className="w-full max-w-xl overflow-hidden border border-red-900 bg-[#091b13]">
          <FaixaPortugal />

          <div className="p-8">
            <h1
              className={`${boldIMIP.className} text-3xl font-bold uppercase text-white`}
            >
              NÃO FOI POSSÍVEL ABRIR A RODA.
            </h1>

            <p
              role="alert"
              className="mt-5 border-l-4 border-[#b82535] bg-black/40 p-4 text-sm text-red-200"
            >
              {erro || "Roda não encontrada."}
            </p>

            <Link
              href="/organizacao"
              className="mt-7 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#d6b56d]"
            >
              ← VOLTAR À ORGANIZAÇÃO
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // IMAGENS PARA A PRÉ-VISUALIZAÇÃO
  // ==========================================

  const imagemLogo =
    logoRemovido
      ? null
      : previewLogo ||
        imagemSegura(formulario.logo_url);

  const imagemCapa =
    capaRemovida
      ? null
      : previewCapa ||
        imagemSegura(formulario.capa_url);

  const nomePrevisualizacao =
    formulario.nome_publico.trim() ||
    roda.nome;

  const corAtual = corSegura(
    formulario.cor_destaque,
    CORES.destaque,
  );

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <main className="relative min-h-screen bg-[#050907] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-35"
        style={{
          backgroundImage:
            "url('/fundo-tijolos.png')",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 pb-20 pt-6 sm:px-6 sm:pt-10">
        {/* NAVEGAÇÃO */}

        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/organizacao#minhas-rodas"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/50 bg-black/85 px-4 py-3 text-xs font-black uppercase text-[#d6b56d] hover:bg-[#14251a]"
          >
            ← AS MINHAS RODAS
          </Link>

          <Link
            href={`/rodas/${roda.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center border border-white/25 bg-black/85 px-4 py-3 text-xs font-black uppercase text-white hover:border-[#d6b56d]"
          >
            VER PERFIL PÚBLICO ↗
          </Link>
        </nav>

        {/* CABEÇALHO */}

        <header className="mt-6 overflow-hidden border border-[#d6b56d]/35 bg-[#07160f]">
          <FaixaPortugal />

          <div className="relative overflow-hidden bg-gradient-to-br from-[#103a28] via-[#0a1510] to-[#45141c] p-6 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rotate-12 border-[28px] border-[#d6b56d]/15"
            />

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e7c56f]">
                IMIP · IDENTIDADE DAS RODAS
              </p>

              <h1
                className={`${boldIMIP.className} mt-5 text-[clamp(2.4rem,5vw,5rem)] font-bold uppercase leading-[0.98] text-white`}
              >
                PERSONALIZAR
                <span className="block text-[#d6b56d]">
                  A MINHA RODA.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-200">
                Cada roda tem uma história, uma voz
                e uma identidade. Cria a apresentação
                que melhor representa a tua comunidade.
              </p>

              <p className="mt-5 inline-block border-l-4 border-[#d6b56d] bg-black/35 px-4 py-3 text-sm font-black uppercase text-white">
                {roda.nome}
              </p>
            </div>
          </div>
        </header>

        {/* FORMULÁRIO E PRÉ-VISUALIZAÇÃO */}

        <div className="mt-8 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <form
            onSubmit={guardar}
            className="min-w-0 space-y-6"
          >
            {/* IDENTIDADE */}

            <section className="overflow-hidden border border-[#d6b56d]/30 bg-[#091b13]/95">
              <FaixaPortugal />

              <div className="p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                  01 · IDENTIDADE
                </p>

                <h2
                  className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white`}
                >
                  A TUA RODA.
                </h2>

                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  Personaliza a apresentação pública.
                  O nome oficial e os registos da roda
                  permanecem inalterados.
                </p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="nome-publico"
                      className={classeEtiqueta}
                    >
                      NOME PÚBLICO
                    </label>

                    <input
                      id="nome-publico"
                      required
                      maxLength={100}
                      disabled={aGuardar}
                      value={formulario.nome_publico}
                      onChange={(evento) =>
                        atualizarCampo(
                          "nome_publico",
                          evento.target.value,
                        )
                      }
                      className={classeCampo}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="cidade-publica"
                        className={classeEtiqueta}
                      >
                        CIDADE
                      </label>

                      <input
                        id="cidade-publica"
                        maxLength={100}
                        disabled={aGuardar}
                        value={formulario.cidade_publica}
                        onChange={(evento) =>
                          atualizarCampo(
                            "cidade_publica",
                            evento.target.value,
                          )
                        }
                        className={classeCampo}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="distrito-publico"
                        className={classeEtiqueta}
                      >
                        DISTRITO
                      </label>

                      <input
                        id="distrito-publico"
                        maxLength={100}
                        disabled={aGuardar}
                        value={formulario.distrito_publico}
                        onChange={(evento) =>
                          atualizarCampo(
                            "distrito_publico",
                            evento.target.value,
                          )
                        }
                        className={classeCampo}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="historia"
                      className={classeEtiqueta}
                    >
                      HISTÓRIA DA RODA
                    </label>

                    <textarea
                      id="historia"
                      rows={7}
                      maxLength={2500}
                      disabled={aGuardar}
                      value={formulario.descricao}
                      onChange={(evento) =>
                        atualizarCampo(
                          "descricao",
                          evento.target.value,
                        )
                      }
                      placeholder="Como nasceu a roda? Quem faz parte da sua história? Qual é a sua missão?"
                      className={`${classeCampo} resize-y`}
                    />

                    <p className="mt-2 text-right text-xs text-zinc-400">
                      {formulario.descricao.length}/2500
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* IMAGENS */}

            <section className="border border-[#d6b56d]/30 bg-[#091b13]/95 p-5 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                02 · IMAGENS
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white`}
              >
                A TUA MARCA.
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Escolhe o logótipo e a capa diretamente
                do teu computador, tal como no perfil
                dos MCs.
              </p>

              <div className="mt-6 space-y-5">
                <EditorImagem
                  tipo="logo"
                  nomeRoda={nomePrevisualizacao}
                  urlGuardada={formulario.logo_url}
                  ficheiro={ficheiroLogo}
                  removida={logoRemovido}
                  desativado={aGuardar}
                  cor={corAtual}
                  selecionar={(ficheiro) =>
                    selecionarImagem("logo", ficheiro)
                  }
                  remover={() =>
                    removerImagem("logo")
                  }
                />

                <EditorImagem
                  tipo="capa"
                  nomeRoda={nomePrevisualizacao}
                  urlGuardada={formulario.capa_url}
                  ficheiro={ficheiroCapa}
                  removida={capaRemovida}
                  desativado={aGuardar}
                  cor={corAtual}
                  selecionar={(ficheiro) =>
                    selecionarImagem("capa", ficheiro)
                  }
                  remover={() =>
                    removerImagem("capa")
                  }
                />
              </div>
            </section>

            {/* LEMA */}

            <section className="border border-[#d6b56d]/30 bg-[#091b13]/95 p-5 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                03 · VOZ DA RODA
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white`}
              >
                O TEU LEMA.
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Uma frase que represente
                a identidade e o espírito da roda.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="lema"
                  className={classeEtiqueta}
                >
                  LEMA DA RODA
                </label>

                <textarea
                  id="lema"
                  rows={3}
                  maxLength={140}
                  disabled={aGuardar}
                  value={formulario.lema}
                  onChange={(evento) =>
                    atualizarCampo(
                      "lema",
                      evento.target.value,
                    )
                  }
                  placeholder="A rua tem voz."
                  className={`${classeCampo} resize-y`}
                />

                <p className="mt-2 text-right text-xs text-zinc-400">
                  {formulario.lema.length}/140
                </p>
              </div>
            </section>

            {/* CORES */}

            <section className="border border-[#d6b56d]/30 bg-[#091b13]/95 p-5 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                04 · PERSONALIZAÇÃO
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white`}
              >
                AS TUAS CORES.
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Escolhe as cores da tua roda.
                A pré-visualização atualiza-se
                imediatamente.
              </p>

              <div className="mt-6 grid gap-3">
                <CampoCor
                  titulo="COR DE DESTAQUE"
                  descricao="Contornos, etiquetas e pormenores."
                  valor={formulario.cor_destaque}
                  alternativa={CORES.destaque}
                  desativado={aGuardar}
                  alterar={(valor) =>
                    atualizarCampo("cor_destaque", valor)
                  }
                />

                <CampoCor
                  titulo="COR DE FUNDO"
                  descricao="Fundo principal da identidade."
                  valor={formulario.cor_fundo}
                  alternativa={CORES.fundo}
                  desativado={aGuardar}
                  alterar={(valor) =>
                    atualizarCampo("cor_fundo", valor)
                  }
                />

                <CampoCor
                  titulo="COR DO LEMA"
                  descricao="Texto do lema sobre a capa."
                  valor={formulario.cor_lema}
                  alternativa={CORES.lema}
                  desativado={aGuardar}
                  alterar={(valor) =>
                    atualizarCampo("cor_lema", valor)
                  }
                />
              </div>
            </section>

            {/* REDES SOCIAIS */}

            <section className="border border-[#d6b56d]/30 bg-[#091b13]/95 p-5 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                05 · COMUNIDADE
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase text-white`}
              >
                REDES SOCIAIS.
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Liga a roda à sua comunidade.
                Os campos vazios não aparecem
                no perfil público.
              </p>

              <div className="mt-6 grid gap-5">
                {redes.map((rede) => (
                  <div key={rede.campo}>
                    <label
                      htmlFor={rede.campo}
                      className={classeEtiqueta}
                    >
                      {rede.nome}
                    </label>

                    <input
                      id={rede.campo}
                      type="url"
                      maxLength={2000}
                      disabled={aGuardar}
                      value={formulario[rede.campo]}
                      onChange={(evento) =>
                        atualizarCampo(
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
            </section>

            {/* GUARDAR */}

            <section className="border border-[#d6b56d]/45 bg-[#091b13]/95 p-5 sm:p-7">
              <h2
                className={`${boldIMIP.className} text-2xl font-bold uppercase text-white`}
              >
                GUARDAR PERSONALIZAÇÃO.
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                As alterações pertencem apenas
                ao perfil desta roda.
                Não modificam classificações
                nem resultados das batalhas.
              </p>

              {erroGuardar && (
                <p
                  role="alert"
                  className="mt-5 border-l-4 border-[#b82535] bg-red-950/30 px-4 py-3 text-sm font-bold text-red-200"
                >
                  {erroGuardar}
                </p>
              )}

              {mensagem && (
                <p
                  role="status"
                  className="mt-5 border-l-4 border-[#087a43] bg-green-950/30 px-4 py-3 text-sm font-bold text-green-200"
                >
                  {mensagem}
                </p>
              )}

              <button
                type="submit"
                disabled={aGuardar}
                className="mt-6 inline-flex min-h-14 w-full items-center justify-center bg-[#d6b56d] px-5 py-4 text-sm font-black uppercase text-[#101713] transition hover:bg-[#f0d58e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aGuardar
                  ? "A GUARDAR..."
                  : "GUARDAR O MEU PERFIL ↗"}
              </button>
            </section>
          </form>

          {/* PRÉ-VISUALIZAÇÃO */}

          <aside className="min-w-0 xl:sticky xl:top-5">
            <div className="mb-5 border-l-4 border-[#d6b56d] bg-black/75 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d6b56d]">
                PRÉ-VISUALIZAÇÃO
              </p>

              <h2
                className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase text-white`}
              >
                ASSIM VAI FICAR A TUA RODA.
              </h2>

              <p className="mt-2 text-xs leading-6 text-zinc-300">
                Experimenta as imagens, as cores
                e o lema antes de guardar.
              </p>
            </div>

            <Previsualizacao
              formulario={formulario}
              nomeOriginal={roda.nome}
              logo={imagemLogo}
              capa={imagemCapa}
            />

            <div className="mt-4 border border-white/15 bg-black/75 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-[#d6b56d]">
                PERFIL OFICIAL
              </p>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                O ranking, os vencedores,
                o histórico de edições e
                os Frees de Campeão
                continuarão associados
                ao identificador original
                desta roda.
              </p>

              <Link
                href={`/rodas/${roda.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center border border-[#d6b56d]/60 px-4 py-3 text-xs font-black uppercase text-[#d6b56d] hover:bg-white/5"
              >
                ABRIR PERFIL PÚBLICO ↗
              </Link>
            </div>
          </aside>
        </div>

        {/* RODAPÉ */}

        <footer className="mt-14 border-t border-[#d6b56d]/35 pt-7 text-center">
          <p
            className={`${veneerIMIP.className} text-xl font-normal uppercase text-[#d6b56d]`}
          >
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            NACIONAL DE RUA · IMIP
          </p>
        </footer>
      </div>
    </main>
  );
}
