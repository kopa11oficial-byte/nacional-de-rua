
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { boldIMIP, veneerIMIP } from "../fonts/identidade";
import { supabase } from "../../lib/supabase";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  FINAL NACIONAL

  IDENTIDADE TIPOGRÁFICA

  Bold.ttf:
  - Título FINAL NACIONAL
  - Títulos das secções

  Veneer W01 Two:
  - Cartaz direito
  - Frases de impacto

  Geist:
  - Nomes dos MCs
  - Informações e filtros

  FUNCIONALIDADES PRESERVADAS

  - Consulta dos finalistas ao Supabase
  - 16 finalistas obrigatórios
  - Ordem oficial por posição
  - Identificação dos MCs
  - Escolha do ano
  - Ligações aos perfis individuais
  - Apuramento a partir de 2027

  Nenhuma alteração aos dados.
  Nenhuma confirmação administrativa.
  ==================================================
*/

type Finalista = {
  posicao: number;
  mc_id: string;
  nome: string;
};

type Registo = {
  posicao: number;
  mc_id: string;
};

type MC = {
  id: string;
  nome_artistico: string;
};

const anos = Array.from(
  {
    length: Math.max(
      1,
      new Date().getFullYear() - 2026,
    ),
  },
  (_, indice) => 2027 + indice,
).reverse();

/*
  FAIXA COM AS CORES DE PORTUGAL
*/

function FaixaPortugal() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[5px] w-full overflow-hidden"
    >
      <span className="w-[43%] bg-[#087a43]" />
      <span className="w-[14%] bg-[#d6b56d]" />
      <span className="flex-1 bg-[#b82535]" />
    </div>
  );
}

export default function FinalNacionalPage() {
  const [ano, setAno] = useState(() =>
    Math.max(2027, new Date().getFullYear()),
  );

  const [finalistas, setFinalistas] =
    useState<Finalista[]>([]);

  const [aCarregar, setACarregar] =
    useState(true);

  const [erro, setErro] = useState("");

  /*
    ==================================================
    CARREGAR LISTA OFICIAL DE FINALISTAS

    Só apresentamos os finalistas quando
    existirem exatamente 16 registos e
    for possível identificar os 16 MCs.
    ==================================================
  */

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setACarregar(true);
      setErro("");
      setFinalistas([]);

      try {
        const resposta = await supabase
          .from("finalistas_nacionais")
          .select("posicao,mc_id")
          .eq("ano", ano)
          .order("posicao");

        if (resposta.error) {
          throw resposta.error;
        }

        const registos =
          (resposta.data ?? []) as Registo[];

        if (registos.length === 0) {
          return;
        }

        if (registos.length !== 16) {
          throw new Error(
            "A lista de finalistas está incompleta.",
          );
        }

        const mcsResposta = await supabase
          .from("mcs")
          .select("id,nome_artistico")
          .in(
            "id",
            registos.map(
              (registo) => registo.mc_id,
            ),
          );

        if (mcsResposta.error) {
          throw mcsResposta.error;
        }

        const nomes = new Map(
          ((mcsResposta.data ?? []) as MC[]).map(
            (mc) => [
              mc.id,
              mc.nome_artistico,
            ],
          ),
        );

        if (nomes.size !== 16) {
          throw new Error(
            "Não foi possível carregar todos os MCs.",
          );
        }

        if (ativo) {
          setFinalistas(
            registos.map((registo) => ({
              ...registo,
              nome:
                nomes.get(registo.mc_id) ?? "",
            })),
          );
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar os finalistas.",
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
  }, [ano]);

  /*
    ==================================================
    RENDERIZAÇÃO
    ==================================================
  */

  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* =====================================
            NAVEGAÇÃO
            ===================================== */}

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

        {/* =====================================
            ABERTURA COM DOIS QUADROS
            MESMA ESTRUTURA DAS RODAS E MCs
            ===================================== */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95 sm:mt-7">

          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">

            {/* ================================
                LADO ESQUERDO — FINAL NACIONAL
                ================================ */}

            <div className="relative min-w-0 overflow-hidden px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">

              <p className="imip-etiqueta">
                O APURAMENTO DO IMPROVISO PORTUGUÊS
              </p>

              {/* TÍTULO PRINCIPAL — BOLD */}

              <h1
                className={`${boldIMIP.className} relative mt-5 max-w-full font-bold uppercase leading-[1.06] tracking-[0.01em] [overflow-wrap:break-word]`}
              >
                <span className="block text-[clamp(3.2rem,6.2vw,6.7rem)] text-[#f0e6d1]">
                  FINAL
                </span>

                <span className="block text-[clamp(2.5rem,5.1vw,5.7rem)] text-[#d6b56d]">
                  NACIONAL
                  <span className="text-[#b82535]">
                    .
                  </span>
                </span>
              </h1>

              <div className="mt-6 w-48 max-w-full">
                <FaixaPortugal />
              </div>

              <p className="mt-6 max-w-xl text-lg font-bold leading-relaxed text-[#f0e6d1] sm:text-xl">
                Os 16 apurados pelo Ranking Nacional.
              </p>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                O percurso começa nas rodas.
                Os resultados constroem a classificação.
                A Final Nacional reúne os 16 MCs
                oficialmente apurados no final
                de cada época.
              </p>
            </div>

            {/* ================================
                LADO DIREITO — CARTAZ CLARO
                ================================ */}

            <div className="relative flex min-h-[300px] min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:border-l lg:border-t-0">

              {/* ELEMENTOS GRÁFICOS */}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rotate-12 border-[24px] border-[#b82535]/90"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rotate-12 border-[26px] border-[#087a43]/90"
              />

              {/* IDENTIFICAÇÃO */}

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.17em] text-[#a82636]">
                  O DESTINO DO RANKING NACIONAL
                </p>
              </div>

              {/* FRASE PRINCIPAL — VENEER */}

              <div className="relative my-7 min-w-0">
                <p
                  className={`${veneerIMIP.className} text-[clamp(3.4rem,4.6vw,5.1rem)] font-normal uppercase leading-[1.05] tracking-[0.01em]`}
                >
                  <span className="block">
                    16 MCs
                  </span>

                  <span className="block text-[#b82535]">
                    UMA FINAL.
                  </span>
                </p>

                <div
                  aria-hidden="true"
                  className="mt-5 flex h-[5px] w-32 max-w-full"
                >
                  <span className="w-[43%] bg-[#087a43]" />
                  <span className="w-[14%] bg-[#d6b56d]" />
                  <span className="flex-1 bg-[#b82535]" />
                </div>
              </div>

              {/* ASSINATURA DO CARTAZ */}

              <div className="relative border-t-4 border-[#101713] pt-4">
                <p className="text-xs font-black uppercase leading-relaxed tracking-[0.08em]">
                  16 CAMINHOS.
                  <span className="block">
                    UM OBJETIVO NACIONAL.
                  </span>
                </p>

                <p
                  className={`${veneerIMIP.className} mt-3 text-lg font-normal uppercase tracking-[0.02em] text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* =====================================
            ESCOLHA DO ANO
            ===================================== */}

        <section
          aria-label="Selecionar ano da Final Nacional"
          className="mt-8 border border-[#d6b56d]/40 bg-[#0a110d]/95 p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>
              <p className="imip-etiqueta">
                APURAMENTO OFICIAL
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-[clamp(1.7rem,3vw,3rem)] font-bold uppercase leading-tight tracking-[0.02em]`}
              >
                ANO DA FINAL
              </h2>
            </div>

            <Link
              href="/ranking"
              className="text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d] underline underline-offset-4 transition hover:text-[#f0d58e]"
            >
              CONSULTAR RANKING ↗
            </Link>
          </div>

          <label
            htmlFor="ano-final"
            className="mt-6 block border-l-4 border-[#087a43] pl-3 text-xs font-black uppercase tracking-[0.06em] text-[#f0d58e]"
          >
            SELECIONAR ÉPOCA
          </label>

          <select
            id="ano-final"
            value={ano}
            onChange={(evento) =>
              setAno(
                Number(evento.target.value),
              )
            }
            className="mt-3 min-h-12 w-full max-w-sm border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm font-bold text-white focus:border-[#f0d58e] focus:outline-none focus:ring-2 focus:ring-[#d6b56d]/25"
          >
            {anos.map((opcao) => (
              <option
                key={opcao}
                value={opcao}
              >
                {opcao} · FINAL NACIONAL
              </option>
            ))}
          </select>

          <p className="mt-4 text-xs leading-relaxed text-[#cbd2c9] sm:text-sm">
            A época oficial começa em 2027.
            Os resultados dos testes de 2026 não
            contam para o apuramento nacional.
          </p>
        </section>

        {/* =====================================
            CARREGAMENTO
            ===================================== */}

        {aCarregar && (
          <div
            role="status"
            className="mt-8 border border-[#d6b56d]/40 bg-black/85 px-5 py-8 text-sm font-black uppercase text-[#f0d58e]"
          >
            A CARREGAR FINALISTAS...
          </div>
        )}

        {/* =====================================
            ERRO
            ===================================== */}

        {!aCarregar && erro && (
          <div
            role="alert"
            className="mt-8 border-l-4 border-[#b82535] bg-black/90 px-5 py-7 text-sm text-red-200"
          >
            {erro}
          </div>
        )}

        {/* =====================================
            APURAMENTO AINDA NÃO PUBLICADO
            ===================================== */}

        {!aCarregar &&
          !erro &&
          finalistas.length === 0 && (
            <section className="mt-8 overflow-hidden border border-[#d6b56d]/45 bg-[#0a110d]/95">

              <FaixaPortugal />

              <div className="p-6 sm:p-9">

                <p className="imip-etiqueta">
                  LISTA OFICIAL · {ano}
                </p>

                <h2
                  className={`${boldIMIP.className} mt-4 text-[clamp(2rem,3.6vw,4rem)] font-bold uppercase leading-[1.1] tracking-[0.02em]`}
                >
                  APURAMENTO

                  <span className="block text-[#d6b56d]">
                    EM CURSO.
                  </span>
                </h2>

                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#d3d8d0] sm:text-base">
                  A lista oficial de {ano} será
                  publicada depois de o administrador
                  geral validar os 16 primeiros
                  classificados do Ranking Nacional.
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d3d8d0]">
                  Até essa confirmação, as posições
                  apresentadas no ranking são
                  provisórias.
                </p>

                <Link
                  href="/ranking"
                  className="mt-7 inline-flex min-h-12 items-center justify-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.04em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
                >
                  CONSULTAR CLASSIFICAÇÃO PROVISÓRIA ↗
                </Link>
              </div>
            </section>
          )}

        {/* =====================================
            LISTA OFICIAL DOS 16 FINALISTAS
            ===================================== */}

        {!aCarregar &&
          !erro &&
          finalistas.length === 16 && (
            <section className="mt-9">

              <div className="flex flex-wrap items-end justify-between gap-4">

                <div>
                  <p className="imip-etiqueta">
                    OS APURADOS DA ÉPOCA
                  </p>

                  <h2
                    className={`${boldIMIP.className} mt-3 text-[clamp(2rem,3.7vw,4.1rem)] font-bold uppercase leading-[1.08] tracking-[0.02em]`}
                  >
                    16 FINALISTAS
                    <span className="text-[#d6b56d]">
                      .
                    </span>
                  </h2>
                </div>

                <span className="border border-[#d6b56d]/50 bg-black/75 px-4 py-2 text-sm font-black text-[#f0d58e]">
                  {ano}
                </span>
              </div>

              <div className="mt-6 overflow-hidden border border-[#d6b56d]/45 bg-[#070b08]/95">

                <FaixaPortugal />

                {finalistas.map(
                  (mc, index) => (
                    <Link
                      key={mc.mc_id}
                      href={`/mcs/${mc.mc_id}`}
                      className={`group flex min-w-0 items-center gap-4 px-4 py-4 transition-colors hover:bg-[#087a43]/20 sm:gap-6 sm:px-6 ${
                        index > 0
                          ? "border-t border-[#d6b56d]/20"
                          : ""
                      }`}
                    >
                      <span
                        className={`w-12 shrink-0 text-2xl font-black tabular-nums sm:w-16 sm:text-3xl ${
                          mc.posicao === 1
                            ? "text-[#d6b56d]"
                            : mc.posicao === 2
                              ? "text-[#c8c9c4]"
                              : mc.posicao === 3
                                ? "text-[#c59065]"
                                : "text-[#f0e6d1]"
                        }`}
                      >
                        {String(mc.posicao).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <div className="min-w-0 flex-1">

                        <p className="break-words text-sm font-black uppercase leading-snug tracking-[0.01em] text-[#f0e6d1] group-hover:text-[#d6b56d] sm:text-lg">
                          {mc.nome}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#bfc9bd]">
                          FINALISTA NACIONAL
                        </p>
                      </div>

                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xl font-black text-[#d6b56d] transition-transform group-hover:translate-x-1"
                      >
                        ↗
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </section>
          )}

        {/* =====================================
            LIGAÇÃO AO RANKING
            ===================================== */}

        <aside className="mt-12 border-l-4 border-[#087a43] bg-[#0a110d]/95 px-5 py-6 sm:px-8">

          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d6b56d]">
            O MÉRITO DEFINE O CAMINHO
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#e1e5dd] sm:text-base">
            O apuramento para a Final Nacional
            resulta da classificação do circuito.
            Cada roda contribui para o percurso
            dos MCs, de acordo com as regras
            de pontuação do IMIP.
          </p>

          <Link
            href="/ranking"
            className="mt-5 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
          >
            VER RANKING NACIONAL ↗
          </Link>
        </aside>

        {/* =====================================
            RODAPÉ
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
