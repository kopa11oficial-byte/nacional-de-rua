
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { boldIMIP, veneerIMIP } from "./fonts/identidade";
import { supabase } from "../lib/supabase";
import { consultarTodas } from "../lib/consultar-todas";

/*
  NACIONAL DE RUA — IMIP

  HOMEPAGE

  IDENTIDADE:
  Bold — grandes títulos
  Veneer — frases de impacto
  Geist — textos, menus e informações

  CORREÇÃO:
  Fotografias dos dois cartões junto ao Top 5
  apresentadas por inteiro, sem cortes.

  PRESERVADO:
  - Logótipo oficial completo
  - Fotografias do cabeçalho
  - Fotografias da comunidade
  - Todas as ligações
  - Top 5 e cálculos do Supabase
  - Pontos, vitórias 2–0 e desempates
  - Separação de épocas
*/

type LinhaRanking = {
  id: string;
  nome: string;
  pontos: number;
  vitorias20: number;
  participacoes: number;
};

type Pontuacao = {
  mc_id: string;
  pontos: number;
  edicao_id: string;
  batalha_id: string | null;
  motivo: string | null;
};

type Batalha = {
  id: string;
  edicao_id: string;
  vitoria_2_0: boolean;
};

type Participacao = {
  mc_id: string;
  batalha_id: string;
  lado: string;
  venceu: boolean;
};

const fotos = {
  publico: "/imagens-home/foto_1.jpg",
  grupoRua: "/imagens-home/foto_2.jpg",
  grupoBatalha: "/imagens-home/foto_3.jpg",
  mcPretoBranco: "/imagens-home/foto_4.jpg",
  mcMicrofone: "/imagens-home/foto_5.jpg",
  batalha: "/imagens-home/foto_6.jpg",
  palco: "/imagens-home/foto_7.jpg",
};

function chaveConfronto(
  vencedor: string,
  derrotado: string,
) {
  return `${vencedor}::${derrotado}`;
}

/*
  ============================================
  TOP 5 — LÓGICA ORIGINAL DO RANKING
  ============================================
*/

function useRankingPrincipal(ano: number) {
  const [linhas, setLinhas] =
    useState<LinhaRanking[]>([]);

  const [aCarregar, setACarregar] =
    useState(true);

  const [erro, setErro] =
    useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setACarregar(true);
      setErro(false);
      setLinhas([]);

      try {
        const {
          data: epoca,
          error: erroEpoca,
        } = await supabase
          .from("epocas")
          .select("id")
          .eq("ano", ano)
          .maybeSingle();

        if (erroEpoca) {
          throw erroEpoca;
        }

        if (!epoca) {
          return;
        }

        const edicoes = await consultarTodas<{
          id: string;
          data_edicao: string;
        }>((inicio, fim) =>
          supabase
            .from("edicoes")
            .select("id,data_edicao")
            .eq("epoca_id", epoca.id)
            .order("id")
            .range(inicio, fim),
        );

        const idsEdicoes = edicoes
          .filter((edicao) => {
            const anoEdicao = Number(
              edicao.data_edicao.slice(0, 4),
            );

            const mes = Number(
              edicao.data_edicao.slice(5, 7),
            );

            return (
              anoEdicao === ano &&
              (ano === 2026 || mes <= 11)
            );
          })
          .map((edicao) => edicao.id);

        if (!idsEdicoes.length) {
          return;
        }

        const conjuntoEdicoes =
          new Set(idsEdicoes);

        const pontosTodos =
          await consultarTodas<Pontuacao>(
            (inicio, fim) =>
              supabase
                .from("pontuacoes")
                .select(
                  "id,mc_id,pontos,edicao_id,batalha_id,motivo",
                )
                .eq("epoca_id", epoca.id)
                .order("id")
                .range(inicio, fim),
          );

        const batalhas: Batalha[] = [];

        for (
          let i = 0;
          i < idsEdicoes.length;
          i += 100
        ) {
          batalhas.push(
            ...(await consultarTodas<Batalha>(
              (inicio, fim) =>
                supabase
                  .from("batalhas")
                  .select(
                    "id,edicao_id,vitoria_2_0",
                  )
                  .in(
                    "edicao_id",
                    idsEdicoes.slice(i, i + 100),
                  )
                  .order("id")
                  .range(inicio, fim),
            )),
          );
        }

        const idsBatalhas =
          batalhas.map(
            (batalha) => batalha.id,
          );

        const participacoes:
          Participacao[] = [];

        for (
          let i = 0;
          i < idsBatalhas.length;
          i += 100
        ) {
          participacoes.push(
            ...(await consultarTodas<Participacao>(
              (inicio, fim) =>
                supabase
                  .from("participacoes")
                  .select(
                    "batalha_id,mc_id,lado,venceu",
                  )
                  .in(
                    "batalha_id",
                    idsBatalhas.slice(i, i + 100),
                  )
                  .order("batalha_id")
                  .order("mc_id")
                  .range(inicio, fim),
            )),
          );
        }

        const totais =
          new Map<string, number>();

        const vitorias =
          new Map<string, number>();

        const edicoesPorMc =
          new Map<string, Set<string>>();

        const confrontos =
          new Map<string, number>();

        const batalhaPorId = new Map(
          batalhas.map(
            (b) => [b.id, b] as const,
          ),
        );

        const participantesPorBatalha =
          new Map<string, Participacao[]>();

        const registarEdicao = (
          mcId: string,
          edicaoId: string,
        ) => {
          if (!edicoesPorMc.has(mcId)) {
            edicoesPorMc.set(
              mcId,
              new Set<string>(),
            );
          }

          edicoesPorMc
            .get(mcId)
            ?.add(edicaoId);
        };

        /*
          PONTUAÇÕES E BÓNUS 2–0
        */

        for (const ponto of pontosTodos) {
          if (
            !conjuntoEdicoes.has(
              ponto.edicao_id,
            )
          ) {
            continue;
          }

          totais.set(
            ponto.mc_id,
            (totais.get(ponto.mc_id) ?? 0) +
              ponto.pontos,
          );

          registarEdicao(
            ponto.mc_id,
            ponto.edicao_id,
          );

          if (
            !ponto.batalha_id &&
            /b[oó]nus\s+2\s*[-–—]\s*0/i.test(
              ponto.motivo ?? "",
            )
          ) {
            vitorias.set(
              ponto.mc_id,
              (vitorias.get(ponto.mc_id) ??
                0) + 1,
            );
          }
        }

        /*
          PARTICIPAÇÕES E VITÓRIAS
        */

        for (
          const participacao of participacoes
        ) {
          const batalha =
            batalhaPorId.get(
              participacao.batalha_id,
            );

          if (!batalha) {
            continue;
          }

          registarEdicao(
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
            vitorias.set(
              participacao.mc_id,
              (vitorias.get(
                participacao.mc_id,
              ) ?? 0) + 1,
            );
          }

          const lista =
            participantesPorBatalha.get(
              participacao.batalha_id,
            ) ?? [];

          lista.push(participacao);

          participantesPorBatalha.set(
            participacao.batalha_id,
            lista,
          );
        }

        /*
          CONFRONTOS DIRETOS
        */

        for (
          const grupo of
          participantesPorBatalha.values()
        ) {
          const vencedores =
            grupo.filter(
              (p) => p.venceu,
            );

          const derrotados =
            grupo.filter(
              (p) => !p.venceu,
            );

          for (
            const vencedor of vencedores
          ) {
            for (
              const derrotado of derrotados
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
                (confrontos.get(chave) ??
                  0) + 1,
              );
            }
          }
        }

        /*
          IDENTIFICAÇÃO DOS MCs
        */

        const mcIds =
          Array.from(totais.keys());

        const nomes: {
          id: string;
          nome_artistico: string;
        }[] = [];

        for (
          let i = 0;
          i < mcIds.length;
          i += 100
        ) {
          nomes.push(
            ...(await consultarTodas<{
              id: string;
              nome_artistico: string;
            }>((inicio, fim) =>
              supabase
                .from("mcs")
                .select("id,nome_artistico")
                .in(
                  "id",
                  mcIds.slice(i, i + 100),
                )
                .order("id")
                .range(inicio, fim),
            )),
          );
        }

        /*
          CLASSIFICAÇÃO

          1. Pontos
          2. Vitórias 2–0
          3. Confronto direto
          4. Nome
        */

        const dados = nomes
          .map((mc) => ({
            id: mc.id,
            nome: mc.nome_artistico,
            pontos:
              totais.get(mc.id) ?? 0,
            vitorias20:
              vitorias.get(mc.id) ?? 0,
            participacoes:
              edicoesPorMc.get(
                mc.id,
              )?.size ?? 0,
          }))
          .sort((a, b) => {
            if (
              a.pontos !== b.pontos
            ) {
              return (
                b.pontos - a.pontos
              );
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

            const aSobreB =
              confrontos.get(
                chaveConfronto(
                  a.id,
                  b.id,
                ),
              ) ?? 0;

            const bSobreA =
              confrontos.get(
                chaveConfronto(
                  b.id,
                  a.id,
                ),
              ) ?? 0;

            if (
              aSobreB !== bSobreA
            ) {
              return bSobreA - aSobreB;
            }

            return a.nome.localeCompare(
              b.nome,
              "pt",
            );
          })
          .slice(0, 5);

        if (ativo) {
          setLinhas(dados);
        }
      } catch {
        if (ativo) {
          setErro(true);
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
  }, [ano]);

  return {
    linhas,
    aCarregar,
    erro,
  };
}

/*
  ============================================
  PÁGINA INICIAL
  ============================================
*/

export default function Home() {
  const ano = Math.max(
    2026,
    new Date().getFullYear(),
  );

  const {
    linhas,
    aCarregar,
    erro,
  } = useRankingPrincipal(ano);

  return (
    <main className="relative min-w-0 w-full overflow-x-clip bg-[#090d0b] text-[#f5f1e7] xl:-ml-32 xl:w-[calc(100%+16rem)]">

      {/* =====================================
          CABEÇALHO
          ===================================== */}

      <header className="relative z-10 border-b border-[#d0ae69]/40 bg-[#070a08] px-4 sm:px-8 lg:px-[5vw]">

        <div className="mx-auto flex min-h-[92px] max-w-[1700px] items-center justify-between gap-3 py-3">

          {/* LOGÓTIPO OFICIAL COMPLETO */}

          <Link
            href="/"
            aria-label="Nacional de Rua — página inicial"
            className="flex min-w-0 items-center gap-3"
          >
            <span className="relative block h-[82px] w-[70px] shrink-0">
              <Image
                src="/logo-portugal.png"
                alt="Logótipo oficial do Improviso Made in Portugal"
                width={1414}
                height={2000}
                priority
                className="block h-full w-full object-contain object-center"
              />
            </span>

            <span className="min-w-0">

              <span
                className={`${boldIMIP.className} block text-base font-bold uppercase leading-tight tracking-[0.035em] sm:text-xl`}
              >
                NACIONAL{" "}
                <span className="text-[#e0bf71]">
                  DE RUA
                </span>
              </span>

              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-[#ccb77f] sm:text-[10px]">
                IMIP · IMPROVISO MADE IN PORTUGAL
              </span>
            </span>
          </Link>

          {/* MENU DESKTOP */}

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-4 xl:flex"
          >
            <Link
              href="/ranking"
              className="text-xs font-extrabold uppercase hover:text-[#e0bf71]"
            >
              Ranking
            </Link>

            <Link
              href="/rodas"
              className="text-xs font-extrabold uppercase hover:text-[#e0bf71]"
            >
              Rodas
            </Link>

            <Link
              href="/mcs"
              className="text-xs font-extrabold uppercase hover:text-[#e0bf71]"
            >
              MCs
            </Link>

            <Link
              href="/final-nacional"
              className="text-xs font-extrabold uppercase hover:text-[#e0bf71]"
            >
              Final Nacional
            </Link>

            <Link
              href="/jurados"
              className="text-xs font-extrabold uppercase hover:text-[#e0bf71]"
            >
              Arbitragem
            </Link>

            <Link
              href="/apoios-e-patrocinios"
              aria-label="Apoios e Patrocínios"
              className="text-xs font-extrabold uppercase hover:text-[#e0bf71]"
            >
              Apoios
            </Link>

            <Link
              href="/organizacao/login"
              className="border border-[#d4ad61]/65 px-4 py-3 text-xs font-black uppercase text-[#e0bf71] hover:bg-[#d4ad61] hover:text-black"
            >
              Organização ↗
            </Link>
          </nav>

          {/* NAVEGAÇÃO COMPACTA */}

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <Link
              href="/apoios-e-patrocinios"
              aria-label="Apoios e Patrocínios"
              className="border border-[#d4ad61]/40 px-2 py-2 text-[10px] font-black uppercase text-[#e0bf71] hover:bg-[#1e2c23] sm:px-3"
            >
              Apoios
            </Link>

            <Link
              href="/organizacao/login"
              className="border border-[#d4ad61]/65 px-2 py-2 text-[10px] font-black uppercase text-[#e0bf71] sm:px-3"
            >
              Entrar ↗
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================
          ABERTURA PRINCIPAL
          ===================================== */}

      <section className="relative isolate overflow-hidden border-b-4 border-[#c5a45b]">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/fundo-tijolos.png')",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(103deg,rgba(0,58,36,.93),rgba(0,29,21,.83) 47%,rgba(106,17,31,.85) 100%)",
          }}
        />

        <div className="mx-auto grid max-w-[1700px] gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,.94fr)] lg:items-center lg:gap-12 lg:px-[5vw] lg:pb-24 lg:pt-20">

          {/* TEXTO PRINCIPAL */}

          <div className="min-w-0">

            <div className="mb-7 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.19em] text-[#e8c778] sm:text-xs">
              <span className="h-1 w-12 bg-[#c82338]" />
              A VOZ DAS RODAS PORTUGUESAS
            </div>

            {/* GRANDE TÍTULO — BOLD */}

            <h1
              className={`${boldIMIP.className} max-w-full text-[clamp(2.6rem,5.8vw,6.7rem)] font-bold uppercase leading-[1.06] tracking-[0.01em] [overflow-wrap:break-word]`}
            >
              <span className="block text-[#fffaf0]">
                NACIONAL
              </span>

              <span className="mt-1 block text-[#e8c778]">
                DE RUA
                <span className="text-[#d5373c]">
                  .
                </span>
              </span>
            </h1>

            <div
              aria-hidden="true"
              className="mt-6 flex h-[5px] w-[180px] overflow-hidden"
            >
              <span className="w-2/5 bg-[#079354]" />
              <span className="w-[10%] bg-[#e8c778]" />
              <span className="flex-1 bg-[#c61e35]" />
            </div>

            <p className="mt-8 max-w-[650px] text-xl font-extrabold leading-snug sm:text-2xl">
              Uma cultura que não nasceu numa tabela.
            </p>

            <p className="mt-3 max-w-[590px] text-base leading-relaxed text-[#e4e0d6] sm:text-lg">
              Nasceu nas rodas, nas praças e nas pessoas.
              Aqui, cada batalha conta e cada MC tem
              um percurso.
            </p>

            {/* FRASE DE IMPACTO — VENEER */}

            <p
              className={`${veneerIMIP.className} mt-7 rotate-[-2deg] text-2xl font-normal uppercase tracking-[0.04em] text-[#e8c778] sm:text-3xl`}
            >
              MERITOCRACIA É LEI.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">

              <Link
                href="/rodas"
                className="inline-flex min-h-12 items-center bg-[#dfb95e] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#10110d] transition hover:bg-[#ffe194]"
              >
                CONHECER AS RODAS ↗
              </Link>

              <Link
                href="/ranking"
                className="inline-flex min-h-12 items-center border-2 border-[#dfb95e] bg-black/65 px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#1e2c23]"
              >
                VER O RANKING ↗
              </Link>
            </div>
          </div>

          {/* =====================================
              FOTOGRAFIAS REAIS — IMAGEM 1
              SEM ALTERAÇÕES
              ===================================== */}

          <div className="relative grid min-h-[360px] grid-cols-[1.15fr_.85fr] grid-rows-[1fr_.8fr] gap-3 lg:min-h-[590px]">

            <div className="relative row-span-2 -rotate-2 overflow-hidden border-[5px] border-[#f2e8d0] shadow-[12px_12px_0_rgba(0,0,0,.42)]">

              <Image
                src={fotos.publico}
                alt="Fotografia real de público numa batalha de rima"
                fill
                sizes="(max-width: 1024px) 60vw, 34vw"
                className="object-cover object-[55%_center]"
                priority
              />
            </div>

            <div className="relative rotate-2 overflow-hidden border-[5px] border-[#f2e8d0] shadow-[8px_8px_0_rgba(0,0,0,.35)]">

              <Image
                src={fotos.mcPretoBranco}
                alt="MC português durante uma atuação"
                fill
                sizes="(max-width: 1024px) 40vw, 24vw"
                className="object-cover object-center"
              />
            </div>

            <div className="relative -rotate-2 overflow-hidden border-[5px] border-[#f2e8d0] shadow-[8px_8px_0_rgba(0,0,0,.35)]">

              <Image
                src={fotos.grupoRua}
                alt="Participantes de uma roda portuguesa"
                fill
                sizes="(max-width: 1024px) 40vw, 24vw"
                className="object-cover object-center"
              />
            </div>

            <div className="pointer-events-none absolute -bottom-6 right-0 max-w-[75%] -rotate-3 bg-[#dfb95e] px-4 py-3 text-right text-sm font-black uppercase leading-tight text-[#13120e] shadow-lg sm:text-lg">
              DE NORTE A SUL,
              <br />
              A RUA TEM VOZ.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          LIGAÇÕES PRINCIPAIS
          ===================================== */}

      <nav
        aria-label="Explorar o Nacional de Rua"
        className="border-b border-[#d2b067]/40 bg-[#e6ddc9] text-[#171813]"
      >
        <div className="mx-auto grid max-w-[1700px] grid-cols-2 lg:grid-cols-4">

          {[
            {
              titulo: "RODAS",
              descricao: "Organizações e regiões",
              href: "/rodas",
              numero: "01",
            },
            {
              titulo: "MCs",
              descricao: "Perfis e percursos",
              href: "/mcs",
              numero: "02",
            },
            {
              titulo: "RANKING",
              descricao: "Pontos e classificações",
              href: "/ranking",
              numero: "03",
            },
            {
              titulo: "FINAL NACIONAL",
              descricao: "Os 16 apurados",
              href: "/final-nacional",
              numero: "04",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex min-h-[110px] items-center gap-3 border-b border-r border-black/15 px-4 py-5 transition hover:bg-[#d0bea0] sm:px-7"
            >
              <span
                className={`${boldIMIP.className} text-2xl font-bold tabular-nums text-[#a12632] sm:text-3xl`}
              >
                {link.numero}
              </span>

              <span className="min-w-0">

                <span
                  className={`${boldIMIP.className} block text-sm font-bold uppercase tracking-[0.025em] sm:text-base`}
                >
                  {link.titulo}
                </span>

                <span className="mt-1 block text-xs text-[#3f453e]">
                  {link.descricao}
                </span>
              </span>

              <span
                aria-hidden="true"
                className="ml-auto text-xl text-[#a12632] group-hover:translate-x-1"
              >
                ↗
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* =====================================
          COMPETIÇÃO E RANKING
          ===================================== */}

      <section className="relative overflow-hidden bg-[#0d1711] px-5 py-16 sm:px-8 sm:py-20 lg:px-[5vw]">

        <div className="mx-auto max-w-[1700px]">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1bd6d]">
            O MÉRITO VÊ-SE NOS RESULTADOS
          </p>

          <h2
            className={`${boldIMIP.className} mt-3 text-[clamp(2.2rem,4.1vw,4.9rem)] font-bold uppercase leading-[1.12] tracking-[0.015em]`}
          >
            A RUA TEM{" "}
            <span className="text-[#e4bd6a]">
              CLASSIFICAÇÃO.
            </span>
          </h2>

          <p className="mt-4 max-w-[680px] text-sm leading-relaxed text-[#d4dacf] sm:text-base">
            Pontos, vitórias e participações apurados
            a partir das batalhas registadas. Cada
            roda mantém a sua identidade.
          </p>

          <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] lg:items-stretch">

            {/* TOP 5 — SEM ALTERAÇÕES */}

            <div className="border-l-4 border-[#e1bd6d] bg-black/60 p-5 sm:p-7">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h3
                  className={`${boldIMIP.className} text-xl font-bold uppercase tracking-[0.025em]`}
                >
                  TOP 5 NACIONAL
                </h3>

                <span className="text-xs font-extrabold text-[#e1bd6d]">
                  {ano === 2026
                    ? "2026 · TESTES"
                    : `${ano} · ÉPOCA OFICIAL`}
                </span>
              </div>

              {aCarregar ? (
                <p className="py-8 text-sm text-zinc-300">
                  A carregar ranking...
                </p>
              ) : erro ? (
                <p className="py-8 text-sm text-amber-200">
                  Não foi possível carregar o ranking.
                </p>
              ) : linhas.length === 0 ? (
                <p className="py-8 text-sm text-zinc-300">
                  Ainda não existem resultados para esta época.
                </p>
              ) : (
                <div className="mt-5">

                  {linhas.map((mc, indice) => (
                    <Link
                      href={`/mcs/${mc.id}`}
                      key={mc.id}
                      className="group grid grid-cols-[2.7rem_minmax(0,1fr)_4.5rem] items-center gap-3 border-t border-[#b2a884]/25 py-3.5 sm:grid-cols-[3.2rem_minmax(0,1fr)_5.5rem_4.5rem]"
                    >
                      <span className="text-2xl font-black text-[#e1bd6d] tabular-nums">
                        {String(indice + 1).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <span className="min-w-0 break-words text-base font-black uppercase tracking-[0.02em] group-hover:text-[#e1bd6d] sm:text-xl">
                        {mc.nome}
                      </span>

                      <span className="text-right text-xl font-black text-[#e1bd6d] tabular-nums">
                        {mc.pontos}
                        <span className="ml-1 text-[9px]">
                          PTS
                        </span>
                      </span>

                      <span className="hidden text-right text-xs text-zinc-400 sm:block">
                        {mc.vitorias20} × 2–0
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-5 border-l-2 border-[#c52a39] bg-[#1a231b] p-3 text-xs text-[#ded8c5]">
                {ano === 2026
                  ? "Os resultados dos testes de 2026 não contam para a Final Nacional de 2027."
                  : "Classificação da época oficial, separada dos testes de 2026."}
              </div>

              <Link
                href="/ranking"
                className="mt-6 inline-flex min-h-11 items-center border border-[#e1bd6d] px-5 py-3 text-xs font-black uppercase text-[#e1bd6d] hover:bg-[#e1bd6d] hover:text-black"
              >
                CONSULTAR O RANKING ↗
              </Link>
            </div>

            {/* =====================================
                CARTÕES FOTOGRÁFICOS

                CORREÇÃO:
                As fotografias aparecem inteiras.
                Não usamos object-cover nem zoom.
                ===================================== */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">

              {/* CARTÃO 1 — RODAS */}

              <Link
                href="/rodas"
                className="group relative flex min-h-[215px] items-end overflow-hidden border border-[#e1bd6d]/50 bg-[#080b09]"
              >
                <Image
                  src={fotos.grupoBatalha}
                  alt="MCs reunidos numa roda de improviso"
                  fill
                  sizes="(max-width: 1024px) 100vw, 38vw"
                  className="object-contain object-center"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="relative p-5">

                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#e1bd6d]">
                    COMUNIDADE
                  </p>

                  <h3
                    className={`${boldIMIP.className} mt-1 text-2xl font-bold uppercase tracking-[0.02em]`}
                  >
                    AS RODAS SÃO A BASE.
                  </h3>

                  <p className="mt-2 text-xs font-extrabold text-white">
                    EXPLORAR RODAS ↗
                  </p>
                </div>
              </Link>

              {/* CARTÃO 2 — MCs */}

              <Link
                href="/mcs"
                className="group relative flex min-h-[215px] items-end overflow-hidden border border-[#e1bd6d]/50 bg-[#080b09]"
              >
                <Image
                  src={fotos.mcMicrofone}
                  alt="MC em atuação com microfone"
                  fill
                  sizes="(max-width: 1024px) 100vw, 38vw"
                  className="object-contain object-center"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="relative p-5">

                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#e1bd6d]">
                    PERCURSOS
                  </p>

                  <h3
                    className={`${boldIMIP.className} mt-1 text-2xl font-bold uppercase tracking-[0.02em]`}
                  >
                    CADA MC TEM HISTÓRIA.
                  </h3>

                  <p className="mt-2 text-xs font-extrabold text-white">
                    VER PERFIS ↗
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          COMUNIDADE E MANIFESTO
          IMAGEM 3 — SEM ALTERAÇÕES
          ===================================== */}

      <section className="relative overflow-hidden bg-[#e6ddc9] px-5 py-16 text-[#151915] sm:px-8 sm:py-20 lg:px-[5vw]">

        <div className="mx-auto grid max-w-[1700px] items-center gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">

          <div className="min-w-0">

            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#8a2630]">
              NÃO NASCEMOS NUMA TABELA
            </p>

            <h2
              className={`${boldIMIP.className} mt-5 text-[clamp(2.7rem,5.1vw,6.2rem)] font-bold uppercase leading-[1.1] tracking-[0.015em] [overflow-wrap:break-word]`}
            >
              A RUA É FEITA{" "}
              <span className="text-[#ae2935]">
                DE PESSOAS.
              </span>
            </h2>

            <div
              aria-hidden="true"
              className="mt-5 flex h-[5px] w-[200px]"
            >
              <span className="w-2/5 bg-[#087a43]" />
              <span className="w-[12%] bg-[#c99b4c]" />
              <span className="flex-1 bg-[#ae2935]" />
            </div>

            <p className="mt-7 max-w-xl text-base font-bold leading-relaxed sm:text-lg">
              Antes dos números vêm as pessoas.
              Antes das classificações vêm as rodas.
              De norte a sul, cada encontro acrescenta
              uma página à nossa história.
            </p>

            <Link
              href="/rodas"
              className="mt-7 inline-flex min-h-12 items-center border-2 border-[#1c241e] px-5 py-3 text-xs font-black uppercase hover:bg-[#1c241e] hover:text-white"
            >
              CONHECER O MOVIMENTO ↗
            </Link>
          </div>

          {/* FOTOGRAFIAS DA COMUNIDADE */}

          <div className="grid min-h-[350px] grid-cols-[1.15fr_.85fr] grid-rows-2 gap-3 sm:min-h-[470px]">

            <div className="relative row-span-2 -rotate-2 overflow-hidden border-[5px] border-[#fffaf0] shadow-[7px_9px_0_#b5ae98]">
              <Image
                src={fotos.grupoRua}
                alt="Fotografia real da comunidade reunida"
                fill
                sizes="(max-width: 1024px) 60vw, 30vw"
                className="object-cover object-center"
              />
            </div>

            <div className="relative rotate-2 overflow-hidden border-[5px] border-[#fffaf0] shadow-[7px_9px_0_#b5ae98]">
              <Image
                src={fotos.grupoBatalha}
                alt="Fotografia real de uma roda de batalha"
                fill
                sizes="(max-width: 1024px) 40vw, 20vw"
                className="object-cover object-center"
              />
            </div>

            <div className="relative -rotate-2 overflow-hidden border-[5px] border-[#fffaf0] shadow-[7px_9px_0_#b5ae98]">
              <Image
                src={fotos.palco}
                alt="Fotografia real de participantes numa batalha"
                fill
                sizes="(max-width: 1024px) 40vw, 20vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          RODAPÉ
          ===================================== */}

      <footer className="border-t-4 border-[#c6a45c] bg-[#0b100d] px-5 pb-16 pt-10 sm:px-8 lg:px-[5vw]">

        <div className="mx-auto flex max-w-[1700px] flex-wrap items-end justify-between gap-8">

          <div>
            <p
              className={`${boldIMIP.className} text-2xl font-bold uppercase tracking-[0.025em]`}
            >
              NACIONAL{" "}
              <span className="text-[#e1bd6d]">
                DE RUA
              </span>
            </p>

            <p className="mt-2 text-xs font-bold tracking-wide text-[#d5d1c7]">
              IMIP · Improviso Made in Portugal
            </p>

            <a
              href="mailto:imip.nacional@gmail.com"
              className="mt-3 inline-block text-xs font-bold text-[#e1bd6d] hover:underline"
            >
              CONTACTO OFICIAL · imip.nacional@gmail.com
            </a>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-black uppercase text-[#e1bd6d]">

            <Link
              href="/jurados"
              className="hover:underline"
            >
              MANUAL DE ARBITRAGEM
            </Link>

            <Link
              href="/final-nacional"
              className="hover:underline"
            >
              FINAL NACIONAL
            </Link>

            <Link
              href="/apoios-e-patrocinios"
              className="hover:underline"
            >
              APOIOS E PATROCÍNIOS
            </Link>

            <Link
              href="/organizacao/login"
              className="hover:underline"
            >
              ORGANIZAÇÃO
            </Link>
          </div>

          <div
            className={`${veneerIMIP.className} text-xl font-normal uppercase tracking-[0.04em] text-[#e1bd6d]`}
          >
            MERITOCRACIA É LEI.
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            2026 · TESTES / 2027 · ÉPOCA OFICIAL
          </div>
        </div>
      </footer>
    </main>
  );
}
