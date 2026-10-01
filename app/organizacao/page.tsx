"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

type Organizacao = {
  nome: string;
  cidade: string | null;
  distrito: string | null;
  email: string;
  telefone: string | null;
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
    dominios: ["instagram.com", "www.instagram.com"],
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
    dominios: ["open.spotify.com"],
  },
] as const;

const classeCampo =
  "mt-2 w-full min-w-0 rounded-xl border border-white/20 bg-[#101312] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#e8c76c] focus:ring-2 focus:ring-[#e8c76c]/20";

const classeLigacao =
  "block rounded-xl border border-white/20 bg-black/80 px-5 py-4 text-center text-sm font-black text-white transition hover:border-[#e8c76c] hover:text-[#e8c76c]";

function urlValida(valor: string, dominios?: readonly string[]) {
  if (!valor.trim()) return true;

  try {
    const url = new URL(valor.trim());

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !/\s/.test(valor.trim()) &&
      (!dominios || dominios.includes(url.hostname.toLowerCase()))
    );
  } catch {
    return false;
  }
}

export default function OrganizacaoPage() {
  const router = useRouter();

  const [organizacao, setOrganizacao] =
    useState<Organizacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [administrador, setAdministrador] = useState(false);
  const [aTerminarSessao, setATerminarSessao] = useState(false);
  const [erroSaida, setErroSaida] = useState("");

  const [mcs, setMcs] = useState<MC[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [mcId, setMcId] = useState("");
  const [formulario, setFormulario] =
    useState<FormularioMC>(formularioVazio);
  const [aGuardarMC, setAGuardarMC] = useState(false);
  const [mensagemMC, setMensagemMC] = useState("");
  const [erroMC, setErroMC] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarOrganizacao() {
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

        const { data: acesso, error: erroAcesso } =
          await supabase.rpc("e_administrador");

        if (!ativo) return;

        if (erroAcesso) {
          setErro(
            "Não foi possível verificar as permissões desta conta.",
          );
          return;
        }

        const acessoGeral = acesso === true;
        setAdministrador(acessoGeral);

        if (acessoGeral) {
          const lista = await consultarTodas<MC>((inicio, fim) =>
            supabase
              .from("mcs")
              .select(
                "id,nome_artistico,cidade,distrito,foto_url,bio,instagram_url,youtube_url,tiktok_url,spotify_url",
              )
              .order("id")
              .range(inicio, fim),
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
        }

        const { data, error } = await supabase
          .from("organizacoes")
          .select("nome,cidade,distrito,email,telefone")
          .eq("auth_user_id", user.id)
          .eq("ativa", true)
          .single();

        if (!ativo) return;

        if (error || !data) {
          setErro(
            "Não foi encontrada uma organização ativa associada a esta conta.",
          );
          return;
        }

        setOrganizacao(data);
      } catch (error) {
        if (ativo) {
          console.error("Erro ao carregar organização:", error);
          setErro(
            "Não foi possível carregar a organização. Confirma que executaste o SQL dos novos campos e tenta novamente.",
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregarOrganizacao();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function terminarSessao() {
    if (aTerminarSessao) return;

    setErroSaida("");
    setATerminarSessao(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      router.replace("/organizacao/login");
      router.refresh();
    } catch {
      setErroSaida(
        "Não foi possível terminar a sessão. Tenta novamente.",
      );
      setATerminarSessao(false);
    }
  }

  function escolherMC(id: string) {
    setMcId(id);
    setMensagemMC("");
    setErroMC("");

    const mc = mcs.find((item) => item.id === id);

    setFormulario({
      nome_artistico: mc?.nome_artistico ?? "",
      cidade: mc?.cidade ?? "",
      distrito: mc?.distrito ?? "",
      foto_url: mc?.foto_url ?? "",
      bio: mc?.bio ?? "",
      instagram_url: mc?.instagram_url ?? "",
      youtube_url: mc?.youtube_url ?? "",
      tiktok_url: mc?.tiktok_url ?? "",
      spotify_url: mc?.spotify_url ?? "",
    });
  }

  function alterarCampo(campo: keyof FormularioMC, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    setMensagemMC("");
    setErroMC("");
  }

  async function guardarMC(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (aGuardarMC) return;

    setErroMC("");
    setMensagemMC("");

    if (
      !administrador ||
      !mcId ||
      !formulario.nome_artistico.trim()
    ) {
      setErroMC("Seleciona um MC e indica o nome artístico.");
      return;
    }

    if (!urlValida(formulario.foto_url)) {
      setErroMC(
        "A fotografia deve ter uma ligação completa começada por https://.",
      );
      return;
    }

    for (const rede of redes) {
      if (!urlValida(formulario[rede.campo], rede.dominios)) {
        setErroMC(
          `Indica uma ligação HTTPS válida do ${rede.titulo}.`,
        );
        return;
      }
    }

    if (formulario.bio.trim().length > 1200) {
      setErroMC("A bio pode ter até 1200 caracteres.");
      return;
    }

    const idGuardado = mcId;
    const dados: FormularioMC = {
      nome_artistico: formulario.nome_artistico.trim(),
      cidade: formulario.cidade.trim(),
      distrito: formulario.distrito.trim(),
      foto_url: formulario.foto_url.trim(),
      bio: formulario.bio.trim(),
      instagram_url: formulario.instagram_url.trim(),
      youtube_url: formulario.youtube_url.trim(),
      tiktok_url: formulario.tiktok_url.trim(),
      spotify_url: formulario.spotify_url.trim(),
    };

    setAGuardarMC(true);

    try {
      const { error } = await supabase.rpc(
        "editar_perfil_mc_completo",
        {
          p_mc_id: idGuardado,
          p_nome_artistico: dados.nome_artistico,
          p_cidade: dados.cidade,
          p_distrito: dados.distrito,
          p_foto_url: dados.foto_url,
          p_bio: dados.bio,
          p_instagram_url: dados.instagram_url,
          p_youtube_url: dados.youtube_url,
          p_tiktok_url: dados.tiktok_url,
          p_spotify_url: dados.spotify_url,
        },
      );

      if (error) {
        setErroMC(error.message);
        return;
      }

      setMcs((lista) =>
        lista
          .map((mc) =>
            mc.id === idGuardado
              ? {
                  ...mc,
                  nome_artistico: dados.nome_artistico,
                  cidade: dados.cidade || null,
                  distrito: dados.distrito || null,
                  foto_url: dados.foto_url || null,
                  bio: dados.bio || null,
                  instagram_url: dados.instagram_url || null,
                  youtube_url: dados.youtube_url || null,
                  tiktok_url: dados.tiktok_url || null,
                  spotify_url: dados.spotify_url || null,
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
      setMensagemMC("Perfil atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao guardar MC:", error);
      setErroMC(
        "Não foi possível guardar o perfil. Tenta novamente.",
      );
    } finally {
      setAGuardarMC(false);
    }
  }

  const mcsVisiveis = mcs.filter((mc) =>
    mc.nome_artistico
      .toLocaleLowerCase("pt-PT")
      .includes(pesquisa.trim().toLocaleLowerCase("pt-PT")),
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <p className="font-bold text-[#e8c76c]">A CARREGAR...</p>
      </main>
    );
  }

  if (!organizacao) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-white">
        <p className="rounded-xl bg-black/90 p-5 font-bold text-red-300">
          {erro || "ORGANIZAÇÃO NÃO ENCONTRADA."}
        </p>

        <Link
          href="/organizacao/login"
          className="font-bold text-[#e8c76c]"
        >
          ← VOLTAR AO LOGIN
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-16">
        <header className="border-b border-white/20 pb-8">
          <Link
            href="/"
            className="text-xs font-black tracking-wider text-[#e8c76c]"
          >
            ← PÁGINA INICIAL
          </Link>

          <p className="mt-8 text-xs font-black tracking-[0.2em] text-[#e8c76c]">
            IMPROVISO MADE IN PORTUGAL
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            PAINEL DA{" "}
            <span className="text-[#e8c76c]">ORGANIZAÇÃO</span>
          </h1>

          <button
            type="button"
            onClick={terminarSessao}
            disabled={aTerminarSessao}
            className="mt-6 rounded-xl border border-white/20 bg-black/80 px-5 py-3 text-sm font-bold transition hover:border-[#e8c76c] disabled:opacity-50"
          >
            {aTerminarSessao
              ? "A TERMINAR SESSÃO..."
              : "TERMINAR SESSÃO"}
          </button>

          {erroSaida && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {erroSaida}
            </p>
          )}
        </header>

        <section className="mt-8 rounded-2xl border border-white/20 border-l-4 border-l-[#087a43] bg-black/85 p-6 sm:p-8">
          <h2 className="break-words text-2xl font-black text-[#e8c76c] sm:text-3xl">
            {organizacao.nome}
          </h2>

          <div className="mt-5 grid gap-3 break-words text-sm text-zinc-200 sm:grid-cols-2">
            <p>
              <strong>Email:</strong> {organizacao.email}
            </p>
            <p>
              <strong>Telefone:</strong>{" "}
              {organizacao.telefone || "—"}
            </p>
            <p>
              <strong>Cidade:</strong> {organizacao.cidade || "—"}
            </p>
            <p>
              <strong>Distrito:</strong>{" "}
              {organizacao.distrito || "—"}
            </p>
          </div>
        </section>

        <Link
          href="/organizacao/nova-edicao"
          className="mt-6 block rounded-xl bg-[#e8c76c] px-5 py-4 text-center text-sm font-black text-black transition hover:bg-[#f2d992]"
        >
          REGISTAR NOVA EDIÇÃO
        </Link>

        {administrador && (
          <>
            <p className="mt-6 rounded-xl border border-[#e8c76c]/40 bg-black/85 p-4 text-sm leading-relaxed text-[#e8c76c]">
              Acesso de organizador geral ativo. Em «Registar
              nova edição» podes escolher qualquer roda; em
              «Gerir edição» vês as edições de todas as
              organizações.
            </p>

            <Link
              href="/organizacao/mcs-pendentes"
              className="mt-4 block rounded-xl border border-[#e8c76c]/60 bg-black/85 px-5 py-4 text-center text-sm font-black text-[#e8c76c] transition hover:bg-[#e8c76c] hover:text-black"
            >
              MCs SEM REGISTO · MANUTENÇÃO
            </Link>

            <section
              id="editar-mc"
              className="mt-8 overflow-hidden rounded-2xl border border-[#e8c76c]/35 bg-black/90"
            >
              <div aria-hidden="true" className="flex h-1">
                <span className="w-2/5 bg-[#087a43]" />
                <span className="w-3/5 bg-[#b3202b]" />
              </div>

              <div className="p-5 sm:p-8">
                <h2 className="text-2xl font-black text-[#e8c76c]">
                  EDITAR PERFIL DE MC
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  Atualiza a apresentação do artista e as suas
                  redes sociais. Os pontos e as batalhas
                  mantêm-se ligados ao mesmo MC.
                </p>

                <label
                  htmlFor="pesquisa-mc"
                  className="mt-6 block text-xs font-bold tracking-wider"
                >
                  PROCURAR MC
                </label>

                <input
                  id="pesquisa-mc"
                  type="search"
                  value={pesquisa}
                  disabled={aGuardarMC}
                  onChange={(evento) =>
                    setPesquisa(evento.target.value)
                  }
                  placeholder="Escreve o nome artístico"
                  className={classeCampo}
                />

                <label
                  htmlFor="escolher-mc"
                  className="mt-5 block text-xs font-bold tracking-wider"
                >
                  SELECIONAR MC
                </label>

                <select
                  id="escolher-mc"
                  value={mcId}
                  disabled={aGuardarMC}
                  onChange={(evento) =>
                    escolherMC(evento.target.value)
                  }
                  className={classeCampo}
                >
                  <option value="">Seleciona um MC</option>

                  {mcsVisiveis.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.nome_artistico}
                    </option>
                  ))}

                  {mcId &&
                    !mcsVisiveis.some((mc) => mc.id === mcId) && (
                      <option value={mcId}>
                        {
                          mcs.find((mc) => mc.id === mcId)
                            ?.nome_artistico
                        }
                      </option>
                    )}
                </select>

                {mcId && (
                  <form onSubmit={guardarMC} className="mt-8">
                    <fieldset
                      disabled={aGuardarMC}
                      className="min-w-0 space-y-5 disabled:opacity-70"
                    >
                      <legend className="mb-5 text-sm font-black text-[#e8c76c]">
                        APRESENTAÇÃO DO ARTISTA
                      </legend>

                      <div>
                        <label
                          htmlFor="nome-mc"
                          className="block text-xs font-bold"
                        >
                          NOME ARTÍSTICO
                        </label>
                        <input
                          id="nome-mc"
                          required
                          value={formulario.nome_artistico}
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
                            className="block text-xs font-bold"
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
                            className="block text-xs font-bold"
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
                          className="block text-xs font-bold"
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
                          aria-describedby="ajuda-foto"
                          className={classeCampo}
                        />
                        <p
                          id="ajuda-foto"
                          className="mt-2 text-xs leading-relaxed text-zinc-400"
                        >
                          Usa uma ligação pública que abra a
                          própria imagem, não uma publicação do
                          Instagram. Recomenda-se uma fotografia
                          quadrada.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="bio-mc"
                          className="block text-xs font-bold"
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
                          placeholder="Apresentação, percurso e influências do MC."
                          className={`${classeCampo} resize-y`}
                        />
                        <p className="mt-2 text-right text-xs text-zinc-400">
                          {formulario.bio.length}/1200
                        </p>
                      </div>

                      <div className="border-t border-white/15 pt-6">
                        <h3 className="text-sm font-black text-[#e8c76c]">
                          REDES SOCIAIS E MÚSICA
                        </h3>
                        <p className="mt-2 text-xs text-zinc-400">
                          Campos opcionais. As ligações vazias
                          não aparecem no perfil público.
                        </p>

                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          {redes.map((rede) => (
                            <div key={rede.campo} className="min-w-0">
                              <label
                                htmlFor={rede.campo}
                                className="block text-xs font-bold uppercase"
                              >
                                {rede.titulo}
                              </label>
                              <input
                                id={rede.campo}
                                type="url"
                                maxLength={2000}
                                value={formulario[rede.campo]}
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
                        className="w-full rounded-xl bg-[#e8c76c] px-6 py-3 text-sm font-black text-black transition hover:bg-[#f2d992] sm:w-auto"
                      >
                        {aGuardarMC
                          ? "A GUARDAR..."
                          : "GUARDAR PERFIL"}
                      </button>
                    </fieldset>

                    {erroMC && (
                      <p
                        role="alert"
                        className="mt-4 text-sm font-bold text-red-300"
                      >
                        {erroMC}
                      </p>
                    )}

                    {mensagemMC && (
                      <p
                        role="status"
                        className="mt-4 text-sm font-bold text-green-300"
                      >
                        {mensagemMC}
                      </p>
                    )}

                    <Link
                      href={`/mcs/${mcId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-[#e8c76c] hover:underline"
                    >
                      VER PERFIL PÚBLICO ↗
                    </Link>
                  </form>
                )}
              </div>
            </section>
          </>
        )}

        <nav
          className="mt-6 grid gap-4 sm:grid-cols-2"
          aria-label="Opções da organização"
        >
          <Link href="/ranking" className={classeLigacao}>
            CONSULTAR RANKING NACIONAL
          </Link>
          <Link href="/mcs" className={classeLigacao}>
            CONSULTAR MCs
          </Link>
          <Link href="/rodas" className={classeLigacao}>
            CONSULTAR RANKINGS DAS RODAS
          </Link>
          <Link
            href="/organizacao/gerir-edicao"
            className={classeLigacao}
          >
            GERIR EDIÇÃO
          </Link>
        </nav>

        <p className="mt-12 text-center text-xs font-bold tracking-[0.2em] text-[#e8c76c]">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}