
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Props = {
  mcId: string;
};

type RedeSocial = {
  nome: string;
  valor: string;
  dominios: string[];
};

type RespostaAcesso = {
  sucesso?: boolean;
  mensagem?: string;
  erro?: string;
};

function validarUrlHttps(
  valor: string,
  dominios?: string[],
): string | null {
  const valorLimpo = valor.trim();

  if (!valorLimpo) return "";

  try {
    const url = new URL(valorLimpo);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      /\s/.test(valorLimpo) ||
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

export function PedirAcessoMC({ mcId }: Props) {
  const [aVerificar, setAVerificar] = useState(true);
  const [podeEditar, setPodeEditar] = useState(false);
  const [temConta, setTemConta] = useState(false);
  const [erroVerificacao, setErroVerificacao] = useState("");

  const [nomeArtistico, setNomeArtistico] = useState("");
  const [cidade, setCidade] = useState("");
  const [distrito, setDistrito] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [biografia, setBiografia] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [ficheiroFoto, setFicheiroFoto] = useState<File | null>(
    null,
  );

  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    let componenteActivo = true;

    async function verificarAcesso() {
      setAVerificar(true);
      setErroVerificacao("");

      try {
        const {
          data: { user },
          error: erroUtilizador,
        } = await supabase.auth.getUser();

        if (!componenteActivo) return;

        if (
          erroUtilizador &&
          erroUtilizador.name !== "AuthSessionMissingError"
        ) {
          setErroVerificacao(
            "Não foi possível validar a sessão. Atualiza a página e tenta novamente.",
          );
          return;
        }

        if (!user) {
          setPodeEditar(false);

          const { data: contaExiste, error: erroConta } =
            await supabase.rpc("perfil_mc_tem_conta", {
              p_mc_id: mcId,
            });

          if (!componenteActivo) return;

          if (erroConta) {
            setErroVerificacao(
              "Não foi possível confirmar o estado deste perfil. Atualiza a página e tenta novamente.",
            );
            return;
          }

          setTemConta(contaExiste === true);
          return;
        }

        const {
          data: autorizado,
          error: erroAutorizacao,
        } = await supabase.rpc("pode_editar_perfil_mc", {
          p_mc_id: mcId,
        });

        if (!componenteActivo) return;

        if (erroAutorizacao) {
          setErroVerificacao(
            "Não foi possível confirmar o acesso de edição. Atualiza a página e tenta novamente.",
          );
          return;
        }

        setPodeEditar(autorizado === true);

        if (autorizado !== true) {
          const { data: contaExiste, error: erroConta } =
            await supabase.rpc("perfil_mc_tem_conta", {
              p_mc_id: mcId,
            });

          if (!componenteActivo) return;

          if (erroConta) {
            setErroVerificacao(
              "Não foi possível confirmar o estado deste perfil. Atualiza a página e tenta novamente.",
            );
            return;
          }

          setTemConta(contaExiste === true);
          return;
        }

        const { data: perfil, error: erroPerfil } =
          await supabase
            .from("mcs")
            .select(
              "nome_artistico,cidade,distrito,foto_url,bio,instagram_url,youtube_url,tiktok_url,spotify_url,x_url",
            )
            .eq("id", mcId)
            .single();

        if (!componenteActivo) return;

        if (erroPerfil || !perfil) {
          setErroVerificacao(
            "A conta tem acesso, mas não foi possível carregar os dados editáveis do perfil.",
          );
          return;
        }

        setNomeArtistico(perfil.nome_artistico ?? "");
        setCidade(perfil.cidade ?? "");
        setDistrito(perfil.distrito ?? "");
        setFotoUrl(perfil.foto_url ?? "");
        setBiografia(perfil.bio ?? "");
        setInstagramUrl(perfil.instagram_url ?? "");
        setYoutubeUrl(perfil.youtube_url ?? "");
        setTiktokUrl(perfil.tiktok_url ?? "");
        setSpotifyUrl(perfil.spotify_url ?? "");
        setXUrl(perfil.x_url ?? "");
      } catch {
        if (componenteActivo) {
          setErroVerificacao(
            "Ocorreu um erro ao verificar o acesso ao perfil.",
          );
        }
      } finally {
        if (componenteActivo) {
          setAVerificar(false);
        }
      }
    }

    if (mcId) {
      void verificarAcesso();
    } else {
      setAVerificar(false);
    }

    return () => {
      componenteActivo = false;
    };
  }, [mcId]);

  async function guardarAlteracoes(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    setMensagem("");

    if (!podeEditar) {
      setMensagem("Esta conta não pode editar este perfil.");
      return;
    }

    if (!nomeArtistico.trim()) {
      setMensagem("Indica o nome artístico do MC.");
      return;
    }

    const fotoValidada = validarUrlHttps(fotoUrl);

    if (!ficheiroFoto && fotoValidada === null) {
      setMensagem(
        "O endereço da fotografia tem de ser um link válido começado por https://.",
      );
      return;
    }

    const redes: RedeSocial[] = [
      {
        nome: "Instagram",
        valor: instagramUrl,
        dominios: ["instagram.com", "www.instagram.com"],
      },
      {
        nome: "YouTube",
        valor: youtubeUrl,
        dominios: [
          "youtube.com",
          "www.youtube.com",
          "m.youtube.com",
          "youtu.be",
        ],
      },
      {
        nome: "TikTok",
        valor: tiktokUrl,
        dominios: [
          "tiktok.com",
          "www.tiktok.com",
          "vm.tiktok.com",
          "vt.tiktok.com",
        ],
      },
      {
        nome: "Spotify",
        valor: spotifyUrl,
        dominios: ["open.spotify.com"],
      },
      {
        nome: "X",
        valor: xUrl,
        dominios: [
          "x.com",
          "www.x.com",
          "twitter.com",
          "www.twitter.com",
        ],
      },
    ];

    for (const rede of redes) {
      if (
        rede.valor.trim() &&
        validarUrlHttps(rede.valor, rede.dominios) === null
      ) {
        setMensagem(
          `Indica um endereço válido do ${rede.nome}.`,
        );
        return;
      }
    }

    if (biografia.length > 1200) {
      setMensagem(
        "A biografia não pode exceder 1200 caracteres.",
      );
      return;
    }

    if (
      [fotoUrl, ...redes.map((rede) => rede.valor)].some(
        (valor) => valor.trim().length > 2000,
      )
    ) {
      setMensagem(
        "Cada ligação pode ter até 2000 caracteres.",
      );
      return;
    }

    setAGuardar(true);

    try {
      const {
        data: { user },
        error: erroUtilizador,
      } = await supabase.auth.getUser();

      if (erroUtilizador || !user) {
        throw new Error(
          "A sessão expirou. Inicia novamente a sessão do MC.",
        );
      }

      const {
        data: autorizado,
        error: erroAutorizacao,
      } = await supabase.rpc("pode_editar_perfil_mc", {
        p_mc_id: mcId,
      });

      if (erroAutorizacao) {
        throw new Error(
          "Não foi possível confirmar o acesso de edição.",
        );
      }

      if (autorizado !== true) {
        throw new Error(
          "Só podes editar o perfil associado à tua conta.",
        );
      }

      let fotoFinal = fotoValidada || "";

      if (ficheiroFoto) {
        const extensoesPermitidas: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };

        const extensao =
          extensoesPermitidas[ficheiroFoto.type];

        if (!extensao) {
          throw new Error(
            "A fotografia tem de estar em formato JPG, PNG ou WebP.",
          );
        }

        if (ficheiroFoto.size > 5 * 1024 * 1024) {
          throw new Error(
            "A fotografia não pode exceder 5 MB.",
          );
        }

        const caminho =
          `${user.id}/perfil-${Date.now()}.${extensao}`;

        const { error: erroUpload } =
          await supabase.storage
            .from("fotos-mcs")
            .upload(caminho, ficheiroFoto, {
              cacheControl: "3600",
              contentType: ficheiroFoto.type,
              upsert: false,
            });

        if (erroUpload) {
          throw new Error(
            `Não foi possível carregar a fotografia: ${erroUpload.message}`,
          );
        }

        const { data: urlPublica } =
          supabase.storage
            .from("fotos-mcs")
            .getPublicUrl(caminho);

        fotoFinal = urlPublica.publicUrl;
      }

      const { error } = await supabase.rpc(
        "editar_perfil_mc_proprio",
        {
          p_mc_id: mcId,
          p_nome_artistico: nomeArtistico.trim(),
          p_cidade: cidade.trim(),
          p_distrito: distrito.trim(),
          p_foto_url: fotoFinal || null,
          p_bio: biografia.trim() || null,
          p_instagram_url:
            validarUrlHttps(instagramUrl, [
              "instagram.com",
              "www.instagram.com",
            ]) || null,
          p_youtube_url:
            validarUrlHttps(youtubeUrl, [
              "youtube.com",
              "www.youtube.com",
              "m.youtube.com",
              "youtu.be",
            ]) || null,
          p_tiktok_url:
            validarUrlHttps(tiktokUrl, [
              "tiktok.com",
              "www.tiktok.com",
              "vm.tiktok.com",
              "vt.tiktok.com",
            ]) || null,
          p_spotify_url:
            validarUrlHttps(spotifyUrl, [
              "open.spotify.com",
            ]) || null,
          p_x_url:
            validarUrlHttps(xUrl, [
              "x.com",
              "www.x.com",
              "twitter.com",
              "www.twitter.com",
            ]) || null,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      window.location.reload();
    } catch (falha) {
      setMensagem(
        falha instanceof Error
          ? falha.message
          : "Ocorreu um erro ao guardar as alterações.",
      );
    } finally {
      setAGuardar(false);
    }
  }

  async function enviarPedido(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (aEnviar) return;

    setMensagem("");
    setPedidoEnviado(false);

    const emailNormalizado = email.trim().toLowerCase();

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);

    if (!emailValido || emailNormalizado.length > 254) {
      setMensagem("Indica um endereço de email válido.");
      return;
    }

    setAEnviar(true);

    try {
      const resposta = await fetch(
        "/api/mcs/solicitar-acesso",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mcId,
            email: emailNormalizado,
          }),
        },
      );

      const dados: unknown = await resposta
        .json()
        .catch(() => null);

      const resultado: RespostaAcesso | null =
        dados &&
        typeof dados === "object" &&
        !Array.isArray(dados)
          ? (dados as RespostaAcesso)
          : null;

      if (
        !resposta.ok ||
        resultado?.sucesso !== true
      ) {
        throw new Error(
          resultado?.erro ??
            "Não foi possível enviar a ligação de acesso. Tenta novamente.",
        );
      }

      setPedidoEnviado(true);

      setMensagem(
        resultado.mensagem ??
          "Se o pedido puder ser processado, receberás um email com a ligação de acesso. Verifica também a pasta de spam.",
      );
    } catch (falha) {
      setMensagem(
        falha instanceof Error
          ? falha.message
          : "Ocorreu um erro ao enviar o email. Tenta novamente.",
      );
    } finally {
      setAEnviar(false);
    }
  }

  const classeInput =
    "min-h-11 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 text-white outline-none placeholder:text-zinc-500 focus:border-[#e8c76c]";

  const classeLabel =
    "mb-2 block text-sm font-bold text-zinc-200";

  if (!mcId) {
    return (
      <p
        role="alert"
        className="mt-5 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200"
      >
        Não foi possível identificar este perfil.
      </p>
    );
  }

  if (aVerificar) {
    return (
      <p className="mt-5 text-sm text-zinc-300">
        A verificar o acesso ao perfil...
      </p>
    );
  }

  if (erroVerificacao) {
    return (
      <p
        role="alert"
        className="mt-5 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200"
      >
        {erroVerificacao}
      </p>
    );
  }

  if (podeEditar) {
    return (
      <form
        onSubmit={(evento) =>
          void guardarAlteracoes(evento)
        }
        className="mt-5 space-y-4 rounded-xl border border-[#e8c76c]/40 bg-black/60 p-4 text-left sm:p-5"
      >
        <div>
          <h2 className="font-black text-[#e8c76c]">
            EDITAR O MEU PERFIL
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            Atualiza os teus dados, fotografia, biografia
            e redes sociais.
          </p>
        </div>

        <div>
          <label
            htmlFor="nome-artistico-mc"
            className={classeLabel}
          >
            Nome artístico
          </label>

          <input
            id="nome-artistico-mc"
            type="text"
            required
            maxLength={100}
            value={nomeArtistico}
            onChange={(evento) =>
              setNomeArtistico(evento.target.value)
            }
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="cidade-mc"
            className={classeLabel}
          >
            Cidade
          </label>

          <input
            id="cidade-mc"
            type="text"
            maxLength={100}
            value={cidade}
            onChange={(evento) =>
              setCidade(evento.target.value)
            }
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="distrito-mc"
            className={classeLabel}
          >
            Distrito
          </label>

          <input
            id="distrito-mc"
            type="text"
            maxLength={100}
            value={distrito}
            onChange={(evento) =>
              setDistrito(evento.target.value)
            }
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="foto-ficheiro-mc"
            className={classeLabel}
          >
            Fotografia do perfil
          </label>

          <input
            id="foto-ficheiro-mc"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(evento) => {
              setFicheiroFoto(
                evento.currentTarget.files?.[0] ??
                  null,
              );
              setMensagem("");
            }}
            className="min-h-11 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-[#e8c76c] file:px-3 file:py-2 file:text-xs file:font-black file:text-black"
          />

          <p className="mt-2 text-xs text-zinc-400">
            JPG, PNG ou WebP. Tamanho máximo: 5 MB.
          </p>

          {ficheiroFoto && (
            <p className="mt-2 break-all text-xs text-[#e8c76c]">
              Nova fotografia: {ficheiroFoto.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="foto-url-mc"
            className={classeLabel}
          >
            Ou endereço https da fotografia
          </label>

          <input
            id="foto-url-mc"
            type="url"
            maxLength={2000}
            value={fotoUrl}
            onChange={(evento) =>
              setFotoUrl(evento.target.value)
            }
            placeholder="https://..."
            className={classeInput}
          />

          <p className="mt-2 text-xs text-zinc-400">
            Se escolheres uma fotografia do computador,
            ela substitui este endereço.
          </p>
        </div>

        <div>
          <label
            htmlFor="bio-mc"
            className={classeLabel}
          >
            Biografia
          </label>

          <textarea
            id="bio-mc"
            rows={5}
            maxLength={1200}
            value={biografia}
            onChange={(evento) =>
              setBiografia(evento.target.value)
            }
            placeholder="Escreve uma apresentação sobre ti..."
            className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-[#e8c76c]"
          />

          <p className="mt-1 text-right text-xs text-zinc-400">
            {biografia.length}/1200
          </p>
        </div>

        <div>
          <label
            htmlFor="instagram-mc"
            className={classeLabel}
          >
            Instagram
          </label>

          <input
            id="instagram-mc"
            type="url"
            maxLength={2000}
            value={instagramUrl}
            onChange={(evento) =>
              setInstagramUrl(evento.target.value)
            }
            placeholder="https://www.instagram.com/..."
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="youtube-mc"
            className={classeLabel}
          >
            YouTube
          </label>

          <input
            id="youtube-mc"
            type="url"
            maxLength={2000}
            value={youtubeUrl}
            onChange={(evento) =>
              setYoutubeUrl(evento.target.value)
            }
            placeholder="https://www.youtube.com/..."
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="tiktok-mc"
            className={classeLabel}
          >
            TikTok
          </label>

          <input
            id="tiktok-mc"
            type="url"
            maxLength={2000}
            value={tiktokUrl}
            onChange={(evento) =>
              setTiktokUrl(evento.target.value)
            }
            placeholder="https://www.tiktok.com/@..."
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="spotify-mc"
            className={classeLabel}
          >
            Spotify
          </label>

          <input
            id="spotify-mc"
            type="url"
            maxLength={2000}
            value={spotifyUrl}
            onChange={(evento) =>
              setSpotifyUrl(evento.target.value)
            }
            placeholder="https://open.spotify.com/..."
            className={classeInput}
          />
        </div>

        <div>
          <label
            htmlFor="x-mc"
            className={classeLabel}
          >
            X
          </label>

          <input
            id="x-mc"
            type="url"
            maxLength={2000}
            value={xUrl}
            onChange={(evento) =>
              setXUrl(evento.target.value)
            }
            placeholder="https://x.com/..."
            className={classeInput}
          />
        </div>

        {mensagem && (
          <p
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {mensagem}
          </p>
        )}

        <button
          type="submit"
          disabled={aGuardar}
          className="inline-flex min-h-11 items-center rounded-lg bg-[#e8c76c] px-4 py-2 text-xs font-black text-black transition hover:bg-[#f3d987] disabled:cursor-wait disabled:opacity-60"
        >
          {aGuardar
            ? "A GUARDAR..."
            : "GUARDAR ALTERAÇÕES"}
        </button>
      </form>
    );
  }

  if (temConta) {
    return (
      <Link
        href={`/mcs/${mcId}/editar`}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#e8c76c]/50 bg-[#e8c76c] px-4 py-2 text-xs font-black text-black transition hover:bg-[#f3d987]"
      >
        ENTRAR
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAberto(true);
          setMensagem("");
          setPedidoEnviado(false);
        }}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#e8c76c]/50 bg-[#e8c76c] px-4 py-2 text-xs font-black text-black transition hover:bg-[#f3d987]"
      >
        ESTE PERFIL É MEU
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="presentation"
          onMouseDown={(evento) => {
            if (
              evento.target === evento.currentTarget
            ) {
              setAberto(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-pedido-acesso"
            className="w-full max-w-md rounded-xl border border-[#e8c76c]/40 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-[#e8c76c]">
                  PERFIL DE MC
                </p>

                <h2
                  id="titulo-pedido-acesso"
                  className="mt-2 text-xl font-black text-white"
                >
                  ACEDER AO MEU PERFIL
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="rounded px-2 text-2xl leading-none text-zinc-300 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Indica o teu email. Receberás uma ligação
              para confirmar o endereço e aceder ao perfil,
              sem aprovação manual.
            </p>

            <form
              onSubmit={(evento) =>
                void enviarPedido(evento)
              }
            >
              <label
                htmlFor="email-pedido-acesso"
                className="mt-5 block text-sm font-bold text-white"
              >
                O teu email
              </label>

              <input
                id="email-pedido-acesso"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value);
                  setMensagem("");
                  setPedidoEnviado(false);
                }}
                placeholder="nome@email.com"
                className="mt-2 min-h-12 w-full rounded-lg border border-zinc-600 bg-black px-4 text-white outline-none placeholder:text-zinc-500 focus:border-[#e8c76c]"
              />

              {mensagem && (
                <p
                  role="status"
                  className={`mt-4 rounded-lg border p-3 text-sm leading-relaxed ${
                    pedidoEnviado
                      ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                      : "border-red-800 bg-red-950/40 text-red-200"
                  }`}
                >
                  {mensagem}
                </p>
              )}

              <button
                type="submit"
                disabled={aEnviar}
                className="mt-5 min-h-12 w-full rounded-lg bg-[#e8c76c] px-4 py-3 text-sm font-black text-black disabled:cursor-wait disabled:opacity-60"
              >
                {aEnviar
                  ? "A ENVIAR..."
                  : pedidoEnviado
                    ? "REENVIAR LIGAÇÃO"
                    : "RECEBER LIGAÇÃO DE ACESSO"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
