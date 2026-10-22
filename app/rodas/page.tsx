
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { boldIMIP, veneerIMIP } from "../fonts/identidade";
import { supabase } from "../../lib/supabase";

type Roda = {
  id: string;
  nome: string;
  cidade: string | null;
  distrito: string | null;
};

type ZonaId =
  | "norte"
  | "centro"
  | "lisboa-sul"
  | "algarve"
  | "outras";

type Zona = {
  id: ZonaId;
  nome: string;
  subtitulo: string;
  cor: string;
};

/*
  NACIONAL DE RUA — IMIP

  Página pública das rodas.

  Organização geográfica:
  1. Norte
  2. Centro
  3. Lisboa e Margem Sul
  4. Algarve

  "Outras localizações" é uma secção
  de segurança para não esconder rodas
  cuja localização ainda não permite
  identificar uma destas quatro zonas.

  Nenhuma roda recebe destaque especial.
  Todas são carregadas do Supabase.
*/

const zonas: Zona[] = [
  {
    id: "norte",
    nome: "NORTE",
    subtitulo:
      "As rodas e organizações do Norte de Portugal",
    cor: "#087a43",
  },
  {
    id: "centro",
    nome: "CENTRO",
    subtitulo:
      "As rodas e organizações da região Centro",
    cor: "#d6b56d",
  },
  {
    id: "lisboa-sul",
    nome: "LISBOA E MARGEM SUL",
    subtitulo:
      "Lisboa, Vale do Tejo e distrito de Setúbal",
    cor: "#b82535",
  },
  {
    id: "algarve",
    nome: "ALGARVE",
    subtitulo:
      "As rodas e organizações do Algarve",
    cor: "#087a43",
  },
  {
    id: "outras",
    nome: "OUTRAS LOCALIZAÇÕES",
    subtitulo:
      "Rodas de outras regiões ou com localização por completar",
    cor: "#d6b56d",
  },
];

/*
  Distritos associados às quatro regiões.

  As regiões aqui são agrupamentos
  de apresentação do IMIP. Não
  alteram os dados do Supabase.
*/

const distritosNorte = [
  "Porto",
  "Braga",
  "Viana do Castelo",
  "Vila Real",
  "Bragança",
];

const distritosCentro = [
  "Aveiro",
  "Coimbra",
  "Viseu",
  "Guarda",
  "Castelo Branco",
  "Leiria",
];

const distritosLisboaSul = [
  "Lisboa",
  "Santarém",
  "Setúbal",
  "Lisboa e Vale do Tejo",
  "Margem Sul",
  "Grande Lisboa",
  "Península de Setúbal",
];

const distritosAlgarve = [
  "Faro",
  "Algarve",
];

/*
  Localidades auxiliares.

  São utilizadas apenas quando
  o distrito não está preenchido
  ou não permite identificar a zona.
*/

const cidadesNorte = [
  "Porto",
  "Vila Nova de Gaia",
  "Gaia",
  "Matosinhos",
  "Maia",
  "Gondomar",
  "Valongo",
  "Ermesinde",
  "Vila do Conde",
  "Póvoa de Varzim",
  "Braga",
  "Guimarães",
  "Famalicão",
  "Vila Real",
  "Bragança",
  "Viana do Castelo",
];

const cidadesCentro = [
  "Aveiro",
  "Coimbra",
  "Viseu",
  "Leiria",
  "Caldas da Rainha",
  "Figueira da Foz",
  "Guarda",
  "Castelo Branco",
  "Covilhã",
  "Torres Novas",
];

const cidadesLisboaSul = [
  "Lisboa",
  "Sintra",
  "Cacém",
  "Amadora",
  "Queluz",
  "Odivelas",
  "Loures",
  "Pontinha",
  "Cascais",
  "Oeiras",
  "Alverca",
  "Vila Franca de Xira",
  "Almada",
  "Cacilhas",
  "Caparica",
  "Costa da Caparica",
  "Monte da Caparica",
  "Sobreda",
  "Seixal",
  "Corroios",
  "Amora",
  "Fernão Ferro",
  "Barreiro",
  "Moita",
  "Montijo",
  "Alcochete",
  "Palmela",
  "Setúbal",
  "Sesimbra",
  "Quinta do Conde",
  "Santarém",
  "Cartaxo",
  "Benavente",
];

const cidadesAlgarve = [
  "Faro",
  "Loulé",
  "Portimão",
  "Lagos",
  "Albufeira",
  "Silves",
  "Tavira",
  "Olhão",
  "Quarteira",
  "Vila Real de Santo António",
];

/*
  Normalização de texto.

  Permite reconhecer nomes independentemente
  de maiúsculas, acentos e pontuação.
*/

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pertenceA(
  valor: string,
  lista: string[],
): boolean {
  const texto = normalizar(valor);

  return lista.some(
    (item) => normalizar(item) === texto,
  );
}

/*
  EXCEÇÕES CONFIRMADAS PARA O IMIP

  Batalha 45:
    Norte

  Batalha Clandestina:
    Centro

  Roda Cultural da Rainha:
    Centro

  Batalha da Visa:
    Centro

  Estas regras corrigem o agrupamento
  visual mesmo que o distrito guardado
  esteja incompleto.

  Não criam novas rodas na base de dados.
*/

function zonaDaRoda(roda: Roda): ZonaId {
  const nome = normalizar(roda.nome);

  // NORTE — Batalha 45

  if (
    /\bbatalha\s*45\b/.test(nome)
  ) {
    return "norte";
  }

  // CENTRO — Batalha Clandestina

  if (
    nome.includes("batalha clandestina") ||
    nome.includes("clandestina zona centro")
  ) {
    return "centro";
  }

  // CENTRO — Roda Cultural da Rainha

  if (
    nome.includes("roda cultural da rainha") ||
    nome.includes("cultural da rainha")
  ) {
    return "centro";
  }

  // CENTRO — Batalha da Visa

  if (
    nome.includes("batalha da visa")
  ) {
    return "centro";
  }

  const distrito = roda.distrito ?? "";
  const cidade = roda.cidade ?? "";

  // Primeiro: identificação pelo distrito.

  if (pertenceA(distrito, distritosNorte)) {
    return "norte";
  }

  if (pertenceA(distrito, distritosCentro)) {
    return "centro";
  }

  if (
    pertenceA(distrito, distritosLisboaSul)
  ) {
    return "lisboa-sul";
  }

  if (
    pertenceA(distrito, distritosAlgarve)
  ) {
    return "algarve";
  }

  // Segundo: identificação pela cidade.

  if (pertenceA(cidade, cidadesNorte)) {
    return "norte";
  }

  if (pertenceA(cidade, cidadesCentro)) {
    return "centro";
  }

  if (
    pertenceA(cidade, cidadesLisboaSul)
  ) {
    return "lisboa-sul";
  }

  if (pertenceA(cidade, cidadesAlgarve)) {
    return "algarve";
  }

  // Nunca escondemos uma roda por
  // não reconhecer a localização.

  return "outras";
}

export default function RodasPage() {
  const [rodas, setRodas] =
    useState<Roda[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [pesquisa, setPesquisa] =
    useState("");

  const [
    zonaSelecionada,
    setZonaSelecionada,
  ] = useState<ZonaId | "todas">("todas");

  /*
    CONSULTA AO SUPABASE

    Mantemos a consulta original:
    só aparecem rodas ativas.
  */

  useEffect(() => {
    let ativo = true;

    async function carregarRodas() {
      setLoading(true);
      setErro("");

      try {
        const { data, error } =
          await supabase
            .from("rodas")
            .select(
              "id,nome,cidade,distrito",
            )
            .eq("ativa", true)
            .order("nome");

        if (!ativo) return;

        if (error) {
          console.error(
            "Erro ao carregar rodas:",
            error,
          );

          setErro(
            "Não foi possível carregar as rodas.",
          );

          return;
        }

        setRodas(data ?? []);
      } catch (falha) {
        if (!ativo) return;

        console.error(
          "Erro inesperado ao carregar rodas:",
          falha,
        );

        setErro(
          "Ocorreu um erro ao carregar as rodas. Tenta novamente.",
        );
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregarRodas();

    return () => {
      ativo = false;
    };
  }, []);

  /*
    PESQUISA E FILTRAGEM
  */

  const termo = normalizar(pesquisa);

  const zonasComRodas = zonas.map(
    (zona) => {
      const todasDaZona =
        rodas.filter(
          (roda) =>
            zonaDaRoda(roda) === zona.id,
        );

      const visiveis =
        todasDaZona.filter((roda) => {
          if (
            zonaSelecionada !== "todas" &&
            zonaSelecionada !== zona.id
          ) {
            return false;
          }

          if (!termo) {
            return true;
          }

          const textoPesquisa =
            normalizar(
              [
                roda.nome,
                roda.cidade,
                roda.distrito,
                zona.nome,
              ]
                .filter(Boolean)
                .join(" "),
            );

          return textoPesquisa.includes(
            termo,
          );
        });

      return {
        ...zona,
        total: todasDaZona.length,
        rodas: visiveis,
      };
    },
  );

  const zonasVisiveis =
    zonasComRodas.filter(
      (zona) => zona.rodas.length > 0,
    );

  const totalVisivel =
    zonasVisiveis.reduce(
      (soma, zona) =>
        soma + zona.rodas.length,
      0,
    );

  const zonasRepresentadas =
    zonasComRodas.filter(
      (zona) =>
        zona.id !== "outras" &&
        zona.total > 0,
    ).length;

  /*
    RENDERIZAÇÃO
  */

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* NAVEGAÇÃO */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d] focus-visible:outline-2 focus-visible:outline-[#f0d58e]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · IMPROVISO MADE IN PORTUGAL
          </span>
        </div>

        {/* ABERTURA — IDENTIDADE IMIP */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95 sm:mt-7">
          <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">

            {/* TEXTO PRINCIPAL */}

            <div className="min-w-0 px-5 py-10 sm:px-8 sm:py-14 lg:px-10">

              <p className="imip-etiqueta">
                UM PAÍS · MUITAS RODAS · A MESMA CULTURA
              </p>

              {/* TÍTULO PRINCIPAL — BOLD */}

              <h1
                className={`${boldIMIP.className} mt-5 font-bold uppercase leading-[1.06] tracking-[0.01em]`}
              >
                <span className="block text-[clamp(3.2rem,6.2vw,6.7rem)]">
                  RODAS
                </span>

                <span className="block text-[clamp(3.2rem,6.2vw,6.7rem)] text-[#d6b56d]">
                  DE
                </span>

                <span className="block whitespace-nowrap text-[clamp(1.85rem,3.8vw,4.1rem)] tracking-normal text-[#d6b56d]">
                  PORTUGAL
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

              <p className="mt-6 max-w-2xl text-lg font-bold leading-relaxed sm:text-xl">
                O freestyle português não pertence
                a uma cidade.
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                Vive nas praças, nos bairros e nas
                pessoas. Descobre as rodas que fazem
                parte do Nacional de Rua, consulta
                as suas edições e acompanha a
                classificação de cada uma.
              </p>
            </div>

            {/* CARTAZ — VENEER */}

            <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden border-t border-[#d6b56d]/25 bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:border-l lg:border-t-0">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 z-0 h-52 w-52 rotate-12 border-[24px] border-[#b82535]/90"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-20 -left-16 h-56 w-56 rotate-12 border-[26px] border-[#087a43]/90"
              />

              <div className="relative">

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7c252e]">
                  CULTURA SEM FRONTEIRAS
                </p>

                <p
                  className={`${veneerIMIP.className} mt-5 max-w-sm text-[clamp(2.5rem,4vw,4.3rem)] font-normal uppercase leading-[1.08] tracking-[0.015em]`}
                >
                  <span className="block">CADA</span>
                  <span className="block">RODA</span>
                  <span className="block text-[#a82636]">CONTA.</span>
                </p>
              </div>

              <p className="relative mt-8 max-w-xs border-t-4 border-[#101713] pt-4 text-sm font-bold leading-relaxed">
                Norte · Centro · Lisboa e Margem Sul
                · Algarve
              </p>
            </div>
          </div>
        </header>

        {/* PESQUISA E FILTROS */}

        <section
          aria-label="Procurar rodas"
          className="mt-8 border border-[#d6b56d]/40 bg-[#080d0a]/95 p-4 sm:p-6"
        >

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>
              <p className="imip-etiqueta">
                ENCONTRA A TUA RODA
              </p>

              <h2
                className={`${boldIMIP.className} mt-2 text-2xl font-bold uppercase tracking-[0.02em] sm:text-3xl`}
              >
                EXPLORA O MOVIMENTO
              </h2>
            </div>

            {!loading && !erro && (
              <span className="border border-[#d6b56d]/55 px-3 py-2 text-xs font-black uppercase text-[#d6b56d]">
                {rodas.length}{" "}
                {rodas.length === 1
                  ? "RODA"
                  : "RODAS"}{" "}
                · {zonasRepresentadas}{" "}
                {zonasRepresentadas === 1
                  ? "ZONA"
                  : "ZONAS"}
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(200px,0.5fr)]">

            <div>
              <label
                htmlFor="pesquisa-roda"
                className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
              >
                NOME DA RODA OU LOCALIDADE
              </label>

              <input
                id="pesquisa-roda"
                type="search"
                value={pesquisa}
                onChange={(evento) =>
                  setPesquisa(
                    evento.target.value,
                  )
                }
                placeholder="Ex.: Batalha 45, Visa, Barreiro..."
                className="min-h-12 w-full min-w-0 border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white placeholder:text-[#a7ada6] focus:border-[#f0d58e] focus:outline-none focus:ring-2 focus:ring-[#d6b56d]/25"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-zona"
                className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
              >
                REGIÃO
              </label>

              <select
                id="filtro-zona"
                value={zonaSelecionada}
                onChange={(evento) =>
                  setZonaSelecionada(
                    evento.target.value as
                      | ZonaId
                      | "todas",
                  )
                }
                className="min-h-12 w-full min-w-0 border border-[#d6b56d]/45 bg-[#152119] px-3 py-3 text-sm font-bold text-white focus:border-[#f0d58e] focus:outline-none focus:ring-2 focus:ring-[#d6b56d]/25"
              >
                <option value="todas">
                  TODAS AS REGIÕES
                </option>

                {zonasComRodas
                  .filter(
                    (zona) =>
                      zona.total > 0,
                  )
                  .map((zona) => (
                    <option
                      key={zona.id}
                      value={zona.id}
                    >
                      {zona.nome} ({zona.total})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {!loading && !erro && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">

              <p
                role="status"
                className="text-xs font-bold text-[#cbd2c9]"
              >
                A MOSTRAR {totalVisivel}{" "}
                {totalVisivel === 1
                  ? "RODA"
                  : "RODAS"}
              </p>

              {(pesquisa ||
                zonaSelecionada !== "todas") && (
                <button
                  type="button"
                  onClick={() => {
                    setPesquisa("");
                    setZonaSelecionada(
                      "todas",
                    );
                  }}
                  className="text-xs font-black uppercase text-[#f0d58e] underline decoration-[#d6b56d]/70 underline-offset-4 hover:text-white"
                >
                  LIMPAR FILTROS ×
                </button>
              )}
            </div>
          )}
        </section>

        {/* RODAS AGRUPADAS POR REGIÃO */}

        <section
          aria-label="Rodas registadas por região"
          className="mt-10"
        >

          {loading && (
            <div
              role="status"
              className="border border-[#d6b56d]/40 bg-black/85 p-6 text-sm font-black uppercase text-[#f0d58e]"
            >
              A CARREGAR RODAS...
            </div>
          )}

          {!loading && erro && (
            <div
              role="alert"
              className="border-l-4 border-[#b82535] bg-black/90 p-6 text-sm font-bold text-red-200"
            >
              {erro}
            </div>
          )}

          {!loading &&
            !erro &&
            rodas.length === 0 && (
              <div className="border border-[#d6b56d]/40 bg-black/85 p-6 text-sm text-[#d1d5cd]">
                Ainda não existem rodas disponíveis.
              </div>
            )}

          {!loading &&
            !erro &&
            rodas.length > 0 &&
            totalVisivel === 0 && (
              <div className="border border-[#d6b56d]/40 bg-black/85 p-6">

                <p className="text-lg font-black uppercase text-[#f0d58e]">
                  NENHUMA RODA ENCONTRADA
                </p>

                <p className="mt-2 text-sm text-[#d1d5cd]">
                  Experimenta outro nome,
                  localidade ou região.
                </p>
              </div>
            )}

          {!loading &&
            !erro &&
            zonasVisiveis.map(
              (zona) => (
                <div
                  key={zona.id}
                  className="mb-11 last:mb-0"
                >

                  {/* CABEÇALHO DA REGIÃO */}

                  <div className="mb-4 border-b border-[#d6b56d]/40 pb-4">

                    <div
                      aria-hidden="true"
                      className="mb-4 h-[5px] w-28"
                      style={{
                        backgroundColor:
                          zona.cor,
                      }}
                    />

                    <div className="flex flex-wrap items-end justify-between gap-4">

                      <div className="min-w-0">

                        <h2
                          className={`${boldIMIP.className} break-words text-2xl font-bold uppercase leading-tight tracking-[0.02em] sm:text-4xl`}
                        >
                          {zona.nome}
                        </h2>

                        <p className="mt-2 text-xs leading-relaxed text-[#d2d6cf] sm:text-sm">
                          {zona.subtitulo}
                        </p>
                      </div>

                      <span className="border border-[#d6b56d]/40 bg-black/65 px-3 py-2 text-[11px] font-black uppercase text-[#f0d58e]">
                        {zona.rodas.length}{" "}
                        {zona.rodas.length === 1
                          ? "RODA"
                          : "RODAS"}
                      </span>
                    </div>
                  </div>

                  {/* TODAS AS RODAS COM O MESMO DESTAQUE */}

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

                    {zona.rodas.map(
                      (roda) => (
                        <Link
                          key={roda.id}
                          href={`/rodas/${roda.id}`}
                          className="group relative flex min-h-[165px] min-w-0 flex-col justify-between overflow-hidden border border-[#d6b56d]/35 bg-[#0a110d]/95 p-5 transition-colors hover:border-[#f0d58e] hover:bg-[#15231a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d58e]"
                        >

                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-1 w-20"
                            style={{
                              backgroundColor:
                                zona.cor,
                            }}
                          />

                          <div className="flex items-start justify-between gap-4">

                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#d6b56d]">
                              NACIONAL DE RUA
                            </span>

                            <span
                              aria-hidden="true"
                              className="text-lg font-black text-[#d6b56d]"
                            >
                              ↗
                            </span>
                          </div>

                          <div className="mt-5 min-w-0">

                            <h3 className="break-words text-[clamp(1.25rem,2vw,1.6rem)] font-black uppercase leading-tight tracking-[0.02em] text-[#f0e6d1] group-hover:text-[#f0d58e]">
                              {roda.nome}
                            </h3>

                            <p className="mt-2 text-xs leading-relaxed text-[#c7cdc5]">
                              {[
                                roda.cidade,
                                roda.distrito,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                "LOCALIDADE POR INDICAR"}
                            </p>
                          </div>

                          <span className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-black uppercase tracking-[0.06em] text-[#d6b56d]">
                            VER RANKING E EDIÇÕES

                            <span
                              aria-hidden="true"
                              className="text-xl"
                            >
                              →
                            </span>
                          </span>
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              ),
            )}
        </section>

        {/* REGISTO E ACESSO DAS ORGANIZAÇÕES */}

        <section
          aria-label="Registo e acesso às rodas"
          className="mt-14 overflow-hidden border border-[#d6b56d]/50 bg-[#e7ddc7] text-[#101713]"
        >

          <div
            aria-hidden="true"
            className="flex h-[5px]"
          >
            <span className="w-[43%] bg-[#087a43]" />
            <span className="w-[14%] bg-[#d6b56d]" />
            <span className="flex-1 bg-[#b82535]" />
          </div>

          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)] lg:gap-12 lg:p-10">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#a82636]">
                FAZ PARTE DO NACIONAL DE RUA
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-3xl font-bold uppercase leading-[1.12] tracking-[0.02em] sm:text-4xl`}
              >
                A TUA RODA ESTÁ NO IMIP?
              </h2>

              <p className="mt-4 text-sm leading-relaxed sm:text-base">
                Se a tua roda já aparece nesta
                página, abre o respetivo perfil
                e utiliza o botão{" "}
                <strong>
                  PEDIR ACESSO DE ORGANIZADOR
                </strong>
                .
              </p>

              <p className="mt-3 text-sm leading-relaxed">
                Cada organização mantém a sua
                identidade, as suas edições e
                o seu ranking.
              </p>
            </div>

            <div className="border-l-4 border-[#087a43] bg-[#f8f2e5] p-5 sm:p-6">

              <h3
                className={`${boldIMIP.className} text-xl font-bold uppercase leading-snug text-[#101713] sm:text-2xl`}
              >
                AINDA NÃO ESTÁ REGISTADA?
              </h3>

              <p className="mt-3 text-sm leading-relaxed">
                Podes solicitar o registo de uma
                nova roda no IMIP. O Suporte Geral
                analisa o pedido antes de atribuir
                o acesso de gestão.
              </p>

              <Link
                href="/rodas/registar"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#b82535] px-5 py-3 text-center text-xs font-black uppercase text-white transition hover:bg-[#8d1c2b] sm:w-auto"
              >
                <span
                  aria-hidden="true"
                  className="text-xl"
                >
                  +
                </span>

                REGISTAR NOVA RODA

                <span aria-hidden="true">
                  ↗
                </span>
              </Link>
            </div>
          </div>
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
