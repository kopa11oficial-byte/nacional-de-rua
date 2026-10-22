
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { boldIMIP, veneerIMIP } from "../fonts/identidade";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  PÁGINA PÚBLICA DOS MCs

  IDENTIDADE TIPOGRÁFICA

  Bold.ttf:
  - Títulos principais
  - Títulos de secções

  Veneer W01 Two:
  - Frases de impacto
  - Assinatura visual

  Geist:
  - Nomes dos MCs
  - Localidades
  - Pesquisa e informações

  PRESERVADO:
  - Fotografias reais
  - Campo foto_url
  - Enquadramento original das fotografias
  - Pesquisa por nome, cidade e distrito
  - Ordem alfabética
  - Estado por confirmar
  - Links dos perfis individuais
  - Carregamento completo do Supabase
  ==================================================
*/

type MC = {
  id: string;
  nome_artistico: string;
  cidade: string | null;
  distrito: string | null;
  por_confirmar: boolean;
  foto_url: string | null;
};

/*
  NORMALIZAÇÃO PARA A PESQUISA
*/

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

/*
  LOCALIDADE DO MC
*/

function localidade(mc: MC): string {
  return (
    [mc.cidade, mc.distrito]
      .filter(Boolean)
      .join(" · ") ||
    "LOCALIDADE POR INDICAR"
  );
}

/*
  VALIDAÇÃO DO ENDEREÇO DA FOTOGRAFIA
*/

function obterFoto(
  valor: string | null | undefined,
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

/*
  ==================================================
  FOTOGRAFIA REAL DO MC

  O endereço vem diretamente de foto_url.

  Não alteramos nem cortamos a imagem.
  object-contain mantém o enquadramento.
  ==================================================
*/

function FotoMC({
  url,
  nome,
}: {
  url: string;
  nome: string;
}) {
  const [erroImagem, setErroImagem] =
    useState(false);

  return (
    <div className="relative h-[250px] w-full shrink-0 overflow-hidden border-b border-[#d6b56d]/30 bg-[#070907] sm:h-auto sm:w-[180px] sm:border-b-0 sm:border-r">
      {erroImagem ? (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-3 text-center">
          <p className="text-xs font-black uppercase leading-relaxed text-[#d6b56d]">
            Fotografia
            <span className="block">
              indisponível
            </span>
          </p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Fotografia do perfil de ${nome}`}
          width={600}
          height={800}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setErroImagem(true)}
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1 bg-[#087a43]"
      />
    </div>
  );
}

/*
  ==================================================
  CARTÃO DO MC

  Se existir foto_url:
  - Fotografia real à esquerda
  - Nome e localidade à direita

  Sem fotografia:
  - Cartão de texto, sem imagens inventadas

  Os nomes mantêm a fonte Geist,
  para máxima legibilidade.
  ==================================================
*/

function CartaoMC({ mc }: { mc: MC }) {
  const foto = obterFoto(mc.foto_url);

  return (
    <Link
      href={`/mcs/${mc.id}`}
      aria-label={`Ver perfil de ${mc.nome_artistico}`}
      className="group relative flex min-w-0 flex-col overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95 transition-colors hover:border-[#f0d58e] hover:bg-[#142119] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d58e] sm:min-h-[220px] sm:flex-row"
    >
      {/* FAIXA DAS CORES DE PORTUGAL */}

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 flex h-1"
      >
        <span className="w-[43%] bg-[#087a43]" />
        <span className="w-[14%] bg-[#d6b56d]" />
        <span className="flex-1 bg-[#b82535]" />
      </div>

      {/* FOTOGRAFIA REAL */}

      {foto && (
        <FotoMC
          key={`${mc.id}:${foto}`}
          url={foto}
          nome={mc.nome_artistico}
        />
      )}

      {/* CONTEÚDO DO CARTÃO */}

      <div className="flex min-w-0 flex-1 flex-col px-5 pb-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d]">
            NACIONAL DE RUA
          </span>

          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#adb8ac]">
            MC · IMIP
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center py-5">

          {/* NOME DO MC — GEIST */}

          <h3 className="min-w-0 break-words text-[clamp(1.5rem,2.6vw,2.5rem)] font-black uppercase leading-[1.1] tracking-[0.015em] text-[#f0e6d1] group-hover:text-[#f0d58e]">
            {mc.nome_artistico}
          </h3>

          <span
            aria-hidden="true"
            className="mt-3 h-[3px] w-12 bg-[#b82535]"
          />

          <p className="mt-3 break-words text-xs leading-relaxed text-[#cbd2c9] sm:text-sm">
            {localidade(mc)}
          </p>

          {mc.por_confirmar && (
            <p className="mt-3 self-start border-l-2 border-[#d6b56d] pl-2 text-[10px] font-bold uppercase tracking-wide text-[#d6b56d]">
              PERFIL POR CONFIRMAR
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#d6b56d]/25 pt-3">
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[#d6b56d]">
            CONHECER O MC
          </span>

          <span
            aria-hidden="true"
            className="text-xl font-black text-[#d6b56d] transition-transform group-hover:translate-x-1"
          >
            ↗
          </span>
        </div>
      </div>
    </Link>
  );
}

/*
  ==================================================
  PÁGINA PRINCIPAL DOS MCs
  ==================================================
*/

export default function MCsPage() {
  const [mcs, setMcs] = useState<MC[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  /*
    ==================================================
    SUPABASE

    IMPORTANTE:
    A consulta inclui foto_url.

    Preservamos o mesmo campo utilizado
    nos perfis individuais do Cody,
    Concept e restantes MCs.
    ==================================================
  */

  useEffect(() => {
    let ativo = true;

    async function carregarMCs() {
      setLoading(true);
      setErro("");

      try {
        const lista = await consultarTodas<MC>(
          (inicio, fim) =>
            supabase
              .from("mcs")
              .select(
                "id,nome_artistico,cidade,distrito,por_confirmar,foto_url",
              )
              .eq("ativo", true)
              .order("id")
              .range(inicio, fim),
        );

        if (!ativo) return;

        setMcs(
          [...lista].sort((a, b) =>
            a.nome_artistico.localeCompare(
              b.nome_artistico,
              "pt-PT",
            ),
          ),
        );
      } catch (falha) {
        if (!ativo) return;

        console.error(
          "Erro ao carregar MCs:",
          falha,
        );

        setErro(
          "Não foi possível carregar os MCs.",
        );
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregarMCs();

    return () => {
      ativo = false;
    };
  }, []);

  /*
    ==================================================
    PESQUISA POR NOME, CIDADE E DISTRITO
    ==================================================
  */

  const encontrados = useMemo(() => {
    const termo = normalizar(pesquisa);

    if (!termo) return mcs;

    return mcs.filter((mc) =>
      normalizar(
        [
          mc.nome_artistico,
          mc.cidade,
          mc.distrito,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(termo),
    );
  }, [mcs, pesquisa]);

  /*
    ==================================================
    APRESENTAÇÃO
    ==================================================
  */

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* NAVEGAÇÃO */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] hover:border-[#f0d58e]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · IMPROVISO MADE IN PORTUGAL
          </span>
        </div>

        {/* =====================================
            ABERTURA — IDENTIDADE IMIP
            ===================================== */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/40 bg-[#081b12]/95 sm:mt-7">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">

            {/* LADO ESQUERDO */}

            <div className="min-w-0 px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">

              <p className="imip-etiqueta">
                AS VOZES DO IMPROVISO PORTUGUÊS
              </p>

              {/* TÍTULO PRINCIPAL — BOLD */}

              <h1
                className={`${boldIMIP.className} mt-5 font-bold uppercase leading-[1.06] tracking-[0.01em] [overflow-wrap:break-word]`}
              >
                <span className="block text-[clamp(3.5rem,7.3vw,7.5rem)] text-[#f0e6d1]">
                  MCs
                </span>

                <span className="block text-[clamp(2.8rem,5.4vw,5.8rem)] text-[#d6b56d]">
                  DA RUA
                  <span className="text-[#b82535]">
                    .
                  </span>
                </span>
              </h1>

              <div
                aria-hidden="true"
                className="mt-6 flex h-[5px] w-48 max-w-full"
              >
                <span className="w-[43%] bg-[#087a43]" />
                <span className="w-[14%] bg-[#d6b56d]" />
                <span className="flex-1 bg-[#b82535]" />
              </div>

              <p className="mt-6 max-w-xl text-lg font-bold leading-relaxed sm:text-xl">
                Não há uma só voz. Há uma cultura inteira.
              </p>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                Do Norte ao Algarve, cada nome tem um percurso.
                Conhece os MCs do Nacional de Rua e descobre
                as suas histórias e perfis.
              </p>
            </div>

            {/* =====================================
                CARTAZ DIREITO — VENEER
                ===================================== */}

            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:border-l lg:border-t-0">

              <div
                aria-hidden="true"
                className="absolute -right-14 top-10 h-28 w-64 rotate-[-13deg] bg-[#b82535]"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-14 -left-20 h-32 w-64 rotate-[12deg] bg-[#087a43]"
              />

              <p className="relative text-xs font-black uppercase tracking-[0.16em] text-[#a82636]">
                ARTISTAS · IDENTIDADE · PERCURSO
              </p>

              {/* FRASE DE IMPACTO — VENEER */}

              <div className="relative my-7">
                <p
                  className={`${veneerIMIP.className} text-[clamp(3rem,5vw,5.5rem)] font-normal uppercase leading-[1.06] tracking-[0.015em]`}
                >
                  A RUA

                  <span className="block text-[#b82535]">
                    TEM NOME.
                  </span>
                </p>
              </div>

              <div className="relative flex flex-wrap items-end justify-between gap-3 border-t-4 border-[#101713] pt-4">
                <span className="text-xs font-black uppercase tracking-[0.1em]">
                  PESSOAS ANTES DOS NÚMEROS
                </span>

                <span
                  className={`${veneerIMIP.className} text-base font-normal uppercase tracking-[0.02em] text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* =====================================
            PESQUISA
            ===================================== */}

        <section
          aria-label="Pesquisar MCs"
          className="mt-8 border border-[#d6b56d]/40 bg-[#080d0a]/95 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="imip-etiqueta">
                ENCONTRA O TEU MC
              </p>

              {/* TÍTULO DA PESQUISA — BOLD */}

              <h2
                className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase tracking-[0.02em] sm:text-3xl`}
              >
                OS NOMES DO MOVIMENTO
              </h2>
            </div>

            {!loading && !erro && (
              <span className="border border-[#d6b56d]/55 px-3 py-2 text-xs font-black uppercase text-[#d6b56d]">
                {mcs.length}{" "}
                {mcs.length === 1
                  ? "MC"
                  : "MCs"}{" "}
                NA LISTA
              </span>
            )}
          </div>

          <label
            htmlFor="pesquisar-mc"
            className="mt-6 block text-xs font-black uppercase tracking-[0.08em] text-[#d6b56d]"
          >
            PESQUISAR POR NOME, CIDADE OU DISTRITO
          </label>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="pesquisar-mc"
              type="search"
              value={pesquisa}
              onChange={(evento) =>
                setPesquisa(evento.target.value)
              }
              placeholder="Ex.: Cody, Gash, Coimbra, Porto..."
              className="min-h-12 w-full min-w-0 flex-1 border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white placeholder:text-[#a7ada6] focus:border-[#f0d58e] focus:outline-none focus:ring-2 focus:ring-[#d6b56d]/25"
            />

            {pesquisa.trim() && (
              <button
                type="button"
                onClick={() => setPesquisa("")}
                className="min-h-12 shrink-0 border border-[#d6b56d]/60 px-5 py-3 text-xs font-black uppercase text-[#f0d58e] hover:bg-[#d6b56d] hover:text-black"
              >
                LIMPAR PESQUISA ×
              </button>
            )}
          </div>

          {!loading && !erro && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p
                role="status"
                className="text-xs font-bold uppercase text-[#cbd2c9]"
              >
                {encontrados.length}{" "}
                {encontrados.length === 1
                  ? "MC ENCONTRADO"
                  : "MCs ENCONTRADOS"}
              </p>

              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#d6b56d]">
                ORDEM ALFABÉTICA · NÃO É UM RANKING
              </span>
            </div>
          )}
        </section>

        {/* =====================================
            CATÁLOGO DE ARTISTAS
            ===================================== */}

        <section
          aria-label="Perfis dos MCs"
          className="mt-10"
        >
          {loading ? (
            <div
              role="status"
              className="border border-[#d6b56d]/40 bg-black/85 p-6 text-sm font-black uppercase text-[#f0d58e]"
            >
              A CARREGAR MCs...
            </div>
          ) : erro ? (
            <div
              role="alert"
              className="border-l-4 border-[#b82535] bg-black/90 p-6 text-sm font-bold text-red-200"
            >
              {erro}
            </div>
          ) : encontrados.length === 0 ? (
            <div className="border border-[#d6b56d]/40 bg-black/85 p-6">
              <p className="text-lg font-black uppercase text-[#f0d58e]">
                {pesquisa.trim()
                  ? "NENHUM MC ENCONTRADO"
                  : "AINDA NÃO EXISTEM MCs REGISTADOS"}
              </p>

              {pesquisa.trim() && (
                <p className="mt-2 text-sm text-[#d1d5cd]">
                  Experimenta outro nome, cidade ou distrito.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {encontrados.map((mc) => (
                <CartaoMC
                  key={mc.id}
                  mc={mc}
                />
              ))}
            </div>
          )}
        </section>

        {/* =====================================
            LIGAÇÃO AO RANKING
            ===================================== */}

        <aside className="mt-12 border-l-4 border-[#087a43] bg-[#0a110d]/95 px-5 py-6 sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d6b56d]">
            O MÉRITO TEM UM NOME
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#e1e5dd] sm:text-base">
            Cada MC tem a sua identidade e o seu caminho.
            Aqui encontras os perfis; os pontos e as
            classificações pertencem ao Ranking Nacional.
          </p>

          <Link
            href="/ranking"
            className="mt-5 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#f0d58e] hover:bg-[#d6b56d] hover:text-black"
          >
            CONSULTAR O RANKING ↗
          </Link>
        </aside>

        {/* =====================================
            RODAPÉ — VENEER
            ===================================== */}

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
