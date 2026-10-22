
"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { boldIMIP, veneerIMIP } from "../../../fonts/identidade";

/* eslint-disable @next/next/no-img-element */

type PerfilMC = {
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
  x_url: string | null;
};

type CamposPerfil = {
  nome_artistico: string;
  cidade: string;
  distrito: string;
  foto_url: string;
  bio: string;
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  spotify_url: string;
  x_url: string;
};

type PersonalizacaoEditavel = {
  lema: string;
  cor_destaque: string;
  cor_fundo: string;
  cor_lema: string;
};

const personalizacaoInicial: PersonalizacaoEditavel = {
  lema: "",
  cor_destaque: "#d6b56d",
  cor_fundo: "#091b13",
  cor_lema: "#ffffff",
};

const camposVazios: CamposPerfil = {
  nome_artistico: "",
  cidade: "",
  distrito: "",
  foto_url: "",
  bio: "",
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  spotify_url: "",
  x_url: "",
};

function corHexValida(cor: string) {
  return /^#[0-9a-fA-F]{6}$/.test(cor);
}

export default function EditarPerfilMCPage() {
  const params = useParams();

  const id =
    typeof params.id === "string" ? params.id : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [novaPassword, setNovaPassword] = useState("");

  const [campos, setCampos] =
    useState<CamposPerfil>(camposVazios);

  // Fotografia do perfil.
  const [ficheiroFoto, setFicheiroFoto] =
    useState<File | null>(null);

  const [fotoLocal, setFotoLocal] = useState("");
  const [fotoRemovida, setFotoRemovida] =
    useState(false);

  const [erroFotoPreview, setErroFotoPreview] =
    useState(false);

  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  // Personalização visual.
  const [personalizacao, setPersonalizacao] =
    useState<PersonalizacaoEditavel>(
      personalizacaoInicial,
    );

  const [
    personalizacaoExiste,
    setPersonalizacaoExiste,
  ] = useState(false);

  const [
    aCarregarPersonalizacao,
    setACarregarPersonalizacao,
  ] = useState(true);

  const [
    personalizacaoDisponivel,
    setPersonalizacaoDisponivel,
  ] = useState(false);

  const [
    aGuardarPersonalizacao,
    setAGuardarPersonalizacao,
  ] = useState(false);

  const [
    erroPersonalizacao,
    setErroPersonalizacao,
  ] = useState("");

  const [
    mensagemPersonalizacao,
    setMensagemPersonalizacao,
  ] = useState("");

  // ==========================================
  // CARREGAR PERFIL DO MC
  // ==========================================

  async function carregarPerfil(
    idUtilizador: string,
  ) {
    setErro("");
    setMensagem("");

    const { data, error } = await supabase
      .from("mcs")
      .select(
        "id,nome_artistico,cidade,distrito,foto_url,bio,instagram_url,youtube_url,tiktok_url,spotify_url,x_url,auth_user_id",
      )
      .eq("id", id)
      .eq("auth_user_id", idUtilizador)
      .maybeSingle();

    if (error) {
      setErro(
        `Não foi possível carregar o perfil: ${error.message}`,
      );
      return;
    }

    if (!data) {
      setUserId("");
      setErro(
        "Esta conta não está associada a este perfil. Entra com o email e a palavra-passe da conta autorizada.",
      );
      return;
    }

    const perfil = data as PerfilMC;

    setFicheiroFoto(null);
    setFotoRemovida(false);
    setErroFotoPreview(false);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }

    setCampos({
      nome_artistico: perfil.nome_artistico ?? "",
      cidade: perfil.cidade ?? "",
      distrito: perfil.distrito ?? "",
      foto_url: perfil.foto_url ?? "",
      bio: perfil.bio ?? "",
      instagram_url: perfil.instagram_url ?? "",
      youtube_url: perfil.youtube_url ?? "",
      tiktok_url: perfil.tiktok_url ?? "",
      spotify_url: perfil.spotify_url ?? "",
      x_url: perfil.x_url ?? "",
    });

    // Personalização visual existente.
    // Não alterar capa, fundo fotográfico
    // nem ordem das secções.

    setACarregarPersonalizacao(true);
    setPersonalizacaoDisponivel(false);
    setErroPersonalizacao("");
    setMensagemPersonalizacao("");

    const {
      data: aparencia,
      error: erroAparencia,
    } = await supabase
      .from("mc_personalizacao")
      .select(
        "mc_id,lema,cor_destaque,cor_fundo,cor_lema",
      )
      .eq("mc_id", id)
      .maybeSingle();

    if (erroAparencia) {
      setErroPersonalizacao(
        `Não foi possível carregar a personalização: ${erroAparencia.message}`,
      );
    } else {
      setPersonalizacaoDisponivel(true);
      setPersonalizacaoExiste(Boolean(aparencia));

      setPersonalizacao({
        lema: aparencia?.lema ?? "",
        cor_destaque:
          aparencia?.cor_destaque ?? "#d6b56d",
        cor_fundo:
          aparencia?.cor_fundo ?? "#091b13",
        cor_lema:
          aparencia?.cor_lema ?? "#ffffff",
      });
    }

    setACarregarPersonalizacao(false);
  }

  // ==========================================
  // VERIFICAR SESSÃO
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      const {
        data,
        error,
      } = await supabase.auth.getUser();

      if (!ativo) return;

      if (error || !data.user) {
        setUserId("");
        setACarregar(false);
        return;
      }

      setUserId(data.user.id);

      await carregarPerfil(data.user.id);

      if (ativo) {
        setACarregar(false);
      }
    }

    if (id) {
      void verificarSessao();
    } else {
      setErro(
        "Não foi possível identificar o perfil.",
      );
      setACarregar(false);
    }

    return () => {
      ativo = false;
    };
  }, [id]);

  // ==========================================
  // PRÉ-VISUALIZAÇÃO DA FOTOGRAFIA
  // ==========================================

  useEffect(() => {
    if (!ficheiroFoto) {
      setFotoLocal("");
      return;
    }

    const urlLocal =
      URL.createObjectURL(ficheiroFoto);

    setFotoLocal(urlLocal);

    return () => {
      URL.revokeObjectURL(urlLocal);
    };
  }, [ficheiroFoto]);

  function atualizarCampo(
    campo: keyof CamposPerfil,
    valor: string,
  ) {
    setCampos((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  // ==========================================
  // ESCOLHER FOTOGRAFIA
  // ==========================================

  function selecionarFoto(
    evento: ChangeEvent<HTMLInputElement>,
  ) {
    const ficheiro =
      evento.currentTarget.files?.[0];

    if (!ficheiro) return;

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !formatosPermitidos.includes(ficheiro.type)
    ) {
      setErro(
        "Escolhe uma fotografia JPG, PNG ou WebP.",
      );

      evento.currentTarget.value = "";
      return;
    }

    if (ficheiro.size > 5 * 1024 * 1024) {
      setErro(
        "A fotografia não pode ultrapassar 5 MB.",
      );

      evento.currentTarget.value = "";
      return;
    }

    setErro("");
    setMensagem("");
    setErroFotoPreview(false);
    setFotoRemovida(false);
    setFicheiroFoto(ficheiro);
  }

  // ==========================================
  // REMOVER FOTOGRAFIA DO PERFIL
  // ==========================================

  function removerFoto() {
    setFicheiroFoto(null);
    setFotoRemovida(true);
    setErroFotoPreview(false);
    setMensagem("");
    setErro("");

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  }

  // ==========================================
  // ENTRAR
  // ==========================================

  async function entrar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error || !data.user) {
      setErro(
        "Email ou palavra-passe incorretos.",
      );
      return;
    }

    setUserId(data.user.id);
    setACarregar(true);

    await carregarPerfil(data.user.id);

    setACarregar(false);
  }

  // ==========================================
  // GUARDAR PERFIL E FOTOGRAFIA
  // ==========================================

  async function guardarPerfil(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (aGuardar) return;

    setErro("");
    setMensagem("");

    if (!campos.nome_artistico.trim()) {
      setErro(
        "O nome artístico é obrigatório.",
      );
      return;
    }

    setAGuardar(true);

    try {
      // Confirmar sessão.

      const {
        data: autenticacao,
        error: erroSessao,
      } = await supabase.auth.getUser();

      if (
        erroSessao ||
        !autenticacao.user
      ) {
        throw new Error(
          "A sessão expirou. Entra novamente no teu perfil.",
        );
      }

      // Confirmar que a conta pode
      // editar este perfil.

      const {
        data: autorizado,
        error: erroAcesso,
      } = await supabase.rpc(
        "pode_editar_perfil_mc",
        { p_mc_id: id },
      );

      if (
        erroAcesso ||
        autorizado !== true
      ) {
        throw new Error(
          "Esta conta não pode editar este perfil.",
        );
      }

      // Manter a fotografia atual,
      // a menos que tenha sido removida.

      let urlFotoFinal = fotoRemovida
        ? ""
        : campos.foto_url.trim();

      // ======================================
      // CARREGAR NOVA FOTOGRAFIA
      // ======================================

      if (ficheiroFoto) {
        const extensoes: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };

        const extensao =
          extensoes[ficheiroFoto.type];

        if (
          !extensao ||
          ficheiroFoto.size > 5 * 1024 * 1024
        ) {
          throw new Error(
            "A fotografia tem de ser JPG, PNG ou WebP, até 5 MB.",
          );
        }

        // Cada fotografia fica na pasta
        // da conta autenticada.

        const caminho =
          `${autenticacao.user.id}/perfil-${Date.now()}-${crypto.randomUUID()}.${extensao}`;

        const {
          error: erroUpload,
        } = await supabase.storage
          .from("fotos-mcs")
          .upload(
            caminho,
            ficheiroFoto,
            {
              cacheControl: "3600",
              contentType: ficheiroFoto.type,
              upsert: false,
            },
          );

        if (erroUpload) {
          throw new Error(
            `Não foi possível carregar a fotografia: ${erroUpload.message}`,
          );
        }

        // O bucket fotos-mcs
        // é usado para fotografias públicas.

        const { data: fotoPublica } =
          supabase.storage
            .from("fotos-mcs")
            .getPublicUrl(caminho);

        if (!fotoPublica.publicUrl) {
          throw new Error(
            "Não foi possível obter o endereço da fotografia carregada.",
          );
        }

        urlFotoFinal =
          fotoPublica.publicUrl;
      }

      // ======================================
      // GUARDAR DADOS NA BASE DE DADOS
      // ======================================

      const { error } = await supabase.rpc(
        "editar_perfil_mc_proprio",
        {
          p_mc_id: id,
          p_nome_artistico:
            campos.nome_artistico.trim(),
          p_cidade: campos.cidade.trim(),
          p_distrito: campos.distrito.trim(),
          p_foto_url: urlFotoFinal || null,
          p_bio: campos.bio.trim(),
          p_instagram_url:
            campos.instagram_url.trim(),
          p_youtube_url:
            campos.youtube_url.trim(),
          p_tiktok_url:
            campos.tiktok_url.trim(),
          p_spotify_url:
            campos.spotify_url.trim(),
          p_x_url: campos.x_url.trim(),
        },
      );

      if (error) {
        throw new Error(
          `Não foi possível guardar as alterações: ${error.message}`,
        );
      }

      // Atualizar a pré-visualização
      // depois de guardar.

      setCampos((anterior) => ({
        ...anterior,
        foto_url: urlFotoFinal,
      }));

      setFicheiroFoto(null);
      setFotoRemovida(false);
      setErroFotoPreview(false);

      if (inputFotoRef.current) {
        inputFotoRef.current.value = "";
      }

      setMensagem(
        "Perfil atualizado com sucesso.",
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível guardar as alterações.",
      );
    } finally {
      setAGuardar(false);
    }
  }

  // ==========================================
  // GUARDAR PERSONALIZAÇÃO
  // ==========================================

  async function guardarPersonalizacao(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    setErroPersonalizacao("");
    setMensagemPersonalizacao("");

    if (
      aCarregarPersonalizacao ||
      !personalizacaoDisponivel
    ) {
      return;
    }

    if (
      personalizacao.lema.trim().length > 180
    ) {
      setErroPersonalizacao(
        "O lema pode ter, no máximo, 180 caracteres.",
      );
      return;
    }

    if (
      !corHexValida(
        personalizacao.cor_destaque,
      ) ||
      !corHexValida(
        personalizacao.cor_fundo,
      ) ||
      !corHexValida(
        personalizacao.cor_lema,
      )
    ) {
      setErroPersonalizacao(
        "Indica cores válidas no formato #RRGGBB.",
      );
      return;
    }

    setAGuardarPersonalizacao(true);

    try {
      const {
        data: autenticacao,
        error: erroSessao,
      } = await supabase.auth.getUser();

      if (
        erroSessao ||
        !autenticacao.user
      ) {
        throw new Error(
          "A sessão expirou. Entra novamente no teu perfil.",
        );
      }

      const {
        data: autorizado,
        error: erroAcesso,
      } = await supabase.rpc(
        "pode_editar_perfil_mc",
        { p_mc_id: id },
      );

      if (
        erroAcesso ||
        autorizado !== true
      ) {
        throw new Error(
          "Esta conta não tem autorização para editar este perfil.",
        );
      }

      const valores = {
        lema:
          personalizacao.lema.trim() || null,
        cor_destaque:
          personalizacao.cor_destaque.toLowerCase(),
        cor_fundo:
          personalizacao.cor_fundo.toLowerCase(),
        cor_lema:
          personalizacao.cor_lema.toLowerCase(),
      };

      const resultado = personalizacaoExiste
        ? await supabase
            .from("mc_personalizacao")
            .update(valores)
            .eq("mc_id", id)
            .select("mc_id")
            .single()
        : await supabase
            .from("mc_personalizacao")
            .insert({
              mc_id: id,
              ...valores,
            })
            .select("mc_id")
            .single();

      if (
        resultado.error ||
        !resultado.data
      ) {
        throw new Error(
          resultado.error?.message ??
            "Não foi possível guardar a personalização.",
        );
      }

      setPersonalizacaoExiste(true);

      setMensagemPersonalizacao(
        "Personalização guardada! Já podes consultar as cores e o lema no perfil público.",
      );
    } catch (falha) {
      setErroPersonalizacao(
        falha instanceof Error
          ? falha.message
          : "Não foi possível guardar a personalização.",
      );
    } finally {
      setAGuardarPersonalizacao(false);
    }
  }

  // ==========================================
  // ALTERAR PALAVRA-PASSE
  // ==========================================

  async function alterarPassword(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (novaPassword.length < 8) {
      setErro(
        "A nova palavra-passe deve ter pelo menos 8 caracteres.",
      );
      return;
    }

    const { error } =
      await supabase.auth.updateUser({
        password: novaPassword,
      });

    if (error) {
      setErro(
        `Não foi possível alterar a palavra-passe: ${error.message}`,
      );
      return;
    }

    setNovaPassword("");

    setMensagem(
      "Palavra-passe alterada com sucesso.",
    );
  }

  // ==========================================
  // TERMINAR SESSÃO
  // ==========================================

  async function sair() {
    await supabase.auth.signOut();

    setUserId("");
    setCampos(camposVazios);
    setFicheiroFoto(null);
    setFotoRemovida(false);
    setErroFotoPreview(false);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }

    setPersonalizacao(
      personalizacaoInicial,
    );

    setPersonalizacaoExiste(false);
    setACarregarPersonalizacao(true);
    setPersonalizacaoDisponivel(false);

    setErroPersonalizacao("");
    setMensagemPersonalizacao("");
    setErro("");
    setMensagem("");
  }

  // ==========================================
  // COMPONENTE DOS CAMPOS DE TEXTO
  // ==========================================

  function campoTexto(
    titulo: string,
    campo: keyof CamposPerfil,
    tipo: "text" | "url" = "text",
    exemplo?: string,
  ) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-zinc-200">
          {titulo}
        </span>

        <input
          type={tipo}
          value={campos[campo]}
          onChange={(evento) =>
            atualizarCampo(
              campo,
              evento.target.value,
            )
          }
          placeholder={exemplo}
          className="w-full rounded-md border border-zinc-700 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
        />
      </label>
    );
  }

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('/fundo-tijolos.png')",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/50"
      />

      <div className="relative mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <a
          href={`/mcs/${id}`}
          className="inline-block text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AO PERFIL
        </a>

        <header className="mt-10">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="mb-3 text-xs font-black tracking-[0.3em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            EDITAR PERFIL
          </h1>

          <p className="mt-4 text-sm text-zinc-300">
            Podes alterar os dados e as redes
            sociais do teu perfil. Os resultados
            e os rankings não podem ser alterados
            nesta página.
          </p>
        </header>

        {erro && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-red-500/50 bg-red-950/80 px-4 py-3 text-sm text-red-200"
          >
            {erro}
          </p>
        )}

        {mensagem && (
          <p
            role="status"
            className="mt-6 rounded-md border border-green-500/50 bg-green-950/80 px-4 py-3 text-sm text-green-200"
          >
            {mensagem}
          </p>
        )}

        {aCarregar ? (
          <p className="mt-8 text-zinc-300">
            A carregar...
          </p>
        ) : !userId ? (
          // ======================================
          // ENTRAR
          // ======================================

          <form
            onSubmit={entrar}
            className="mt-8 space-y-5 rounded-md border border-zinc-700 bg-black/90 p-5 sm:p-7"
          >
            <h2 className="text-xl font-black">
              Entrar para editar
            </h2>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-zinc-200">
                Email
              </span>

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(evento) =>
                  setEmail(evento.target.value)
                }
                className="w-full rounded-md border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-zinc-200">
                Palavra-passe
              </span>

              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(evento) =>
                  setPassword(evento.target.value)
                }
                className="w-full rounded-md border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-500"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-md bg-yellow-500 px-5 py-3 font-black text-black transition hover:bg-yellow-400"
            >
              ENTRAR
            </button>
          </form>
        ) : (
          <>
            {/* ===================================
                DADOS DO PERFIL
               =================================== */}

            <form
              onSubmit={guardarPerfil}
              className="mt-8 space-y-5 rounded-md border border-zinc-700 bg-black/90 p-5 sm:p-7"
            >
              <h2 className="text-xl font-black">
                Dados do perfil
              </h2>

              {/* FOTOGRAFIA */}

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
                <p className="mb-4 text-sm font-bold text-zinc-200">
                  Fotografia do perfil
                </p>

                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#d6b56d] bg-black text-center text-xs font-black text-zinc-500">
                    {(fotoLocal ||
                      (!fotoRemovida
                        ? campos.foto_url.trim()
                        : "")) &&
                    !erroFotoPreview ? (
                      <img
                        src={
                          fotoLocal ||
                          campos.foto_url.trim()
                        }
                        alt={`Fotografia de ${
                          campos.nome_artistico ||
                          "MC"
                        }`}
                        onError={() =>
                          setErroFotoPreview(true)
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="px-3">
                        {erroFotoPreview
                          ? "FOTO INDISPONÍVEL"
                          : "SEM FOTO"}
                      </span>
                    )}
                  </div>

                  <div className="w-full flex-1 space-y-3 text-center sm:text-left">
                    <input
                      ref={inputFotoRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={selecionarFoto}
                      className="sr-only"
                      aria-label="Escolher fotografia do perfil"
                    />

                    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={() =>
                          inputFotoRef.current?.click()
                        }
                        disabled={aGuardar}
                        className="min-h-11 rounded-lg bg-[#d6b56d] px-4 py-3 text-xs font-black text-black transition hover:bg-[#f0d58e] disabled:opacity-50"
                      >
                        {campos.foto_url ||
                        ficheiroFoto
                          ? "ALTERAR FOTOGRAFIA"
                          : "ESCOLHER FOTOGRAFIA"}
                      </button>

                      {(ficheiroFoto ||
                        (!fotoRemovida &&
                          campos.foto_url)) && (
                        <button
                          type="button"
                          onClick={removerFoto}
                          disabled={aGuardar}
                          className="min-h-11 rounded-lg border border-red-700 px-4 py-3 text-xs font-bold text-red-200 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          REMOVER FOTO
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400">
                      JPG, PNG ou WebP · Máximo 5 MB.
                    </p>

                    {ficheiroFoto && (
                      <p className="break-all text-xs font-semibold text-[#d6b56d]">
                        Selecionada:{" "}
                        {ficheiroFoto.name}
                      </p>
                    )}

                    {fotoRemovida && (
                      <p className="text-xs text-amber-300">
                        A fotografia será removida
                        do perfil quando guardares.
                      </p>
                    )}

                    <p className="text-xs text-zinc-400">
                      A imagem acima é uma
                      pré-visualização. Para
                      confirmar, clica em
                      GUARDAR PERFIL.
                    </p>
                  </div>
                </div>
              </div>

              {campoTexto(
                "Nome artístico",
                "nome_artistico",
              )}

              {campoTexto(
                "Cidade",
                "cidade",
              )}

              {campoTexto(
                "Distrito",
                "distrito",
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Biografia
                </span>

                <textarea
                  rows={5}
                  value={campos.bio}
                  onChange={(evento) =>
                    atualizarCampo(
                      "bio",
                      evento.target.value,
                    )
                  }
                  className="w-full rounded-md border border-zinc-700 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                />
              </label>

              {/* REDES SOCIAIS */}

              <div className="border-t border-zinc-800 pt-5">
                <h2 className="mb-5 text-xl font-black">
                  Redes sociais
                </h2>

                <div className="space-y-5">
                  {campoTexto(
                    "Instagram",
                    "instagram_url",
                    "url",
                    "https://...",
                  )}

                  {campoTexto(
                    "YouTube",
                    "youtube_url",
                    "url",
                    "https://...",
                  )}

                  {campoTexto(
                    "TikTok",
                    "tiktok_url",
                    "url",
                    "https://...",
                  )}

                  {campoTexto(
                    "Spotify",
                    "spotify_url",
                    "url",
                    "https://...",
                  )}

                  {campoTexto(
                    "X",
                    "x_url",
                    "url",
                    "https://...",
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={aGuardar}
                className="w-full rounded-md bg-yellow-500 px-5 py-3 font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aGuardar
                  ? "A GUARDAR..."
                  : "GUARDAR PERFIL"}
              </button>
            </form>

            {/* ===================================
                PERSONALIZAÇÃO VISUAL
               =================================== */}

            <section className="mt-7 overflow-hidden border border-[#d6b56d]/50 bg-[#091b13]/95">
              <div
                aria-hidden="true"
                className="flex h-[5px]"
              >
                <span className="w-[43%] bg-[#087a43]" />
                <span className="w-[14%] bg-[#d6b56d]" />
                <span className="flex-1 bg-[#b82535]" />
              </div>

              <div className="grid lg:grid-cols-[1fr_0.85fr]">
                <form
                  onSubmit={(evento) =>
                    void guardarPersonalizacao(
                      evento,
                    )
                  }
                  className="space-y-5 p-5 sm:p-7"
                >
                  <p className="text-xs font-black uppercase tracking-[0.13em] text-[#d6b56d]">
                    IDENTIDADE ARTÍSTICA · IMIP
                  </p>

                  <h2
                    className={`${boldIMIP.className} text-2xl font-bold uppercase leading-tight text-[#f0e6d1] sm:text-3xl`}
                  >
                    PERSONALIZAR{" "}
                    <span className="text-[#d6b56d]">
                      PERFIL.
                    </span>
                  </h2>

                  <p className="text-sm leading-relaxed text-[#d2d9d0]">
                    Escolhe uma frase que te
                    represente e as cores do teu
                    perfil. Estas opções não
                    alteram os teus resultados
                    nem as estatísticas oficiais.
                  </p>

                  {/* LEMA */}

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-[#f0e6d1]">
                      O teu lema ou frase de
                      destaque
                    </span>

                    <textarea
                      rows={3}
                      maxLength={180}
                      value={
                        personalizacao.lema
                      }
                      onChange={(evento) =>
                        setPersonalizacao(
                          (anterior) => ({
                            ...anterior,
                            lema:
                              evento.target.value,
                          }),
                        )
                      }
                      placeholder="A minha voz. A minha história."
                      disabled={
                        aCarregarPersonalizacao
                      }
                      className="w-full resize-y border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e] disabled:opacity-60"
                    />

                    <span className="mt-1 block text-right text-xs text-[#d2d9d0]">
                      {
                        personalizacao.lema.length
                      }
                      /180
                    </span>
                  </label>

                  {/* COR DE DESTAQUE E FUNDO */}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#f0e6d1]">
                        Cor de destaque
                      </span>

                      <span className="flex items-stretch gap-2">
                        <input
                          type="color"
                          aria-label="Escolher cor de destaque"
                          value={
                            corHexValida(
                              personalizacao.cor_destaque,
                            )
                              ? personalizacao.cor_destaque
                              : "#d6b56d"
                          }
                          onChange={(evento) =>
                            setPersonalizacao(
                              (anterior) => ({
                                ...anterior,
                                cor_destaque:
                                  evento.target.value,
                              }),
                            )
                          }
                          disabled={
                            aCarregarPersonalizacao
                          }
                          className="h-12 w-14 shrink-0 cursor-pointer border border-[#d6b56d]/45 bg-[#152119] p-1 disabled:opacity-60"
                        />

                        <input
                          type="text"
                          aria-label="Código da cor de destaque"
                          maxLength={7}
                          value={
                            personalizacao.cor_destaque
                          }
                          onChange={(evento) =>
                            setPersonalizacao(
                              (anterior) => ({
                                ...anterior,
                                cor_destaque:
                                  evento.target.value,
                              }),
                            )
                          }
                          disabled={
                            aCarregarPersonalizacao
                          }
                          className="min-w-0 flex-1 border border-[#d6b56d]/45 bg-[#152119] px-3 text-sm text-white outline-none focus:border-[#f0d58e] disabled:opacity-60"
                        />
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#f0e6d1]">
                        Cor de fundo
                      </span>

                      <span className="flex items-stretch gap-2">
                        <input
                          type="color"
                          aria-label="Escolher cor de fundo"
                          value={
                            corHexValida(
                              personalizacao.cor_fundo,
                            )
                              ? personalizacao.cor_fundo
                              : "#091b13"
                          }
                          onChange={(evento) =>
                            setPersonalizacao(
                              (anterior) => ({
                                ...anterior,
                                cor_fundo:
                                  evento.target.value,
                              }),
                            )
                          }
                          disabled={
                            aCarregarPersonalizacao
                          }
                          className="h-12 w-14 shrink-0 cursor-pointer border border-[#d6b56d]/45 bg-[#152119] p-1 disabled:opacity-60"
                        />

                        <input
                          type="text"
                          aria-label="Código da cor de fundo"
                          maxLength={7}
                          value={
                            personalizacao.cor_fundo
                          }
                          onChange={(evento) =>
                            setPersonalizacao(
                              (anterior) => ({
                                ...anterior,
                                cor_fundo:
                                  evento.target.value,
                              }),
                            )
                          }
                          disabled={
                            aCarregarPersonalizacao
                          }
                          className="min-w-0 flex-1 border border-[#d6b56d]/45 bg-[#152119] px-3 text-sm text-white outline-none focus:border-[#f0d58e] disabled:opacity-60"
                        />
                      </span>
                    </label>
                  </div>

                  {/* NOVA OPÇÃO: COR DO LEMA */}

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-[#f0e6d1]">
                      Cor do lema
                    </span>

                    <span className="flex items-stretch gap-2">
                      <input
                        type="color"
                        aria-label="Escolher cor do lema"
                        value={
                          corHexValida(
                            personalizacao.cor_lema,
                          )
                            ? personalizacao.cor_lema
                            : "#ffffff"
                        }
                        onChange={(evento) =>
                          setPersonalizacao(
                            (anterior) => ({
                              ...anterior,
                              cor_lema:
                                evento.target.value,
                            }),
                          )
                        }
                        disabled={
                          aCarregarPersonalizacao
                        }
                        className="h-12 w-14 shrink-0 cursor-pointer border border-[#d6b56d]/45 bg-[#152119] p-1 disabled:opacity-60"
                      />

                      <input
                        type="text"
                        aria-label="Código da cor do lema"
                        maxLength={7}
                        value={
                          personalizacao.cor_lema
                        }
                        onChange={(evento) =>
                          setPersonalizacao(
                            (anterior) => ({
                              ...anterior,
                              cor_lema:
                                evento.target.value,
                            }),
                          )
                        }
                        disabled={
                          aCarregarPersonalizacao
                        }
                        className="min-w-0 flex-1 border border-[#d6b56d]/45 bg-[#152119] px-3 text-sm text-white outline-none focus:border-[#f0d58e] disabled:opacity-60"
                      />
                    </span>

                    <p className="mt-2 text-xs text-[#d2d9d0]">
                      Esta cor aplica-se à frase
                      na capa do perfil.
                    </p>
                  </label>

                  {/* MENSAGENS */}

                  {erroPersonalizacao && (
                    <p
                      role="alert"
                      className="border-l-4 border-[#b82535] bg-[#2b1117] px-4 py-3 text-sm text-red-200"
                    >
                      {erroPersonalizacao}
                    </p>
                  )}

                  {mensagemPersonalizacao && (
                    <p
                      role="status"
                      className="border-l-4 border-[#087a43] bg-[#10271b] px-4 py-3 text-sm text-[#d6b56d]"
                    >
                      {mensagemPersonalizacao}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      aCarregarPersonalizacao ||
                      aGuardarPersonalizacao ||
                      !personalizacaoDisponivel
                    }
                    className="min-h-12 w-full bg-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.06em] text-[#101713] transition hover:bg-[#f0d58e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aCarregarPersonalizacao
                      ? "A CARREGAR PERSONALIZAÇÃO..."
                      : aGuardarPersonalizacao
                        ? "A GUARDAR..."
                        : "GUARDAR PERSONALIZAÇÃO"}
                  </button>
                </form>

                {/* PRÉ-VISUALIZAÇÃO DAS CORES */}

                <div className="relative flex min-h-72 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/40 p-6 lg:border-l lg:border-t-0">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${
                        corHexValida(
                          personalizacao.cor_fundo,
                        )
                          ? personalizacao.cor_fundo
                          : "#091b13"
                      }, ${
                        corHexValida(
                          personalizacao.cor_destaque,
                        )
                          ? personalizacao.cor_destaque
                          : "#d6b56d"
                      })`,
                    }}
                  />

                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black/50"
                  />

                  <div className="relative">
                    <p className="text-xs font-black uppercase tracking-widest text-white/90">
                      PRÉ-VISUALIZAÇÃO DAS CORES
                    </p>

                    <div
                      className="mt-5 h-[5px] w-32"
                      style={{
                        backgroundColor:
                          corHexValida(
                            personalizacao.cor_destaque,
                          )
                            ? personalizacao.cor_destaque
                            : "#d6b56d",
                      }}
                    />

                    <p
                      className={`${boldIMIP.className} mt-5 break-words text-3xl font-bold uppercase leading-tight text-white sm:text-4xl`}
                    >
                      {campos.nome_artistico ||
                        "O TEU NOME"}
                    </p>

                    {personalizacao.lema.trim() && (
                      <p
                        className={`${veneerIMIP.className} mt-4 break-words text-xl font-normal uppercase sm:text-2xl`}
                        style={{
                          color: corHexValida(
                            personalizacao.cor_lema,
                          )
                            ? personalizacao.cor_lema
                            : "#ffffff",
                        }}
                      >
                        “{personalizacao.lema.trim()}”
                      </p>
                    )}
                  </div>

                  <p className="relative mt-8 text-xs font-bold uppercase tracking-[0.08em] text-white/90">
                    O TEU PERFIL. A TUA IDENTIDADE.
                  </p>
                </div>
              </div>
            </section>

            {/* ===================================
                ALTERAR PALAVRA-PASSE
               =================================== */}

            <form
              onSubmit={alterarPassword}
              className="mt-6 space-y-5 rounded-md border border-zinc-700 bg-black/90 p-5 sm:p-7"
            >
              <h2 className="text-xl font-black">
                Alterar palavra-passe
              </h2>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Nova palavra-passe
                </span>

                <input
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={novaPassword}
                  onChange={(evento) =>
                    setNovaPassword(
                      evento.target.value,
                    )
                  }
                  className="w-full rounded-md border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-500"
                />
              </label>

              <button
                type="submit"
                className="rounded-md border border-yellow-500 px-5 py-3 font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
              >
                ALTERAR PALAVRA-PASSE
              </button>
            </form>

            <button
              type="button"
              onClick={() => void sair()}
              className="mt-6 text-sm font-bold text-zinc-300 underline hover:text-white"
            >
              TERMINAR SESSÃO
            </button>
          </>
        )}
      </div>
    </main>
  );
}
