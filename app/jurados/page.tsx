
import Link from "next/link";
import {
  boldIMIP,
  veneerIMIP,
} from "../fonts/identidade";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  MANUAL DE ARBITRAGEM

  IDENTIDADE TIPOGRÁFICA

  BOLD
  - Título principal
  - Títulos das secções

  VENEER
  - Frases de impacto
  - Assinatura visual

  GEIST
  - Textos informativos
  - Botões
  - Indicações para consulta

  FUNCIONALIDADES PRESERVADAS

  - Manual PDF original
  - Abrir o documento
  - Descarregar PDF
  - Visualizador integrado para computador
  - Consulta adaptada ao telemóvel
  - Metadados da página

  Nenhuma alteração ao conteúdo do PDF.
  Nenhuma alteração ao Supabase.
  ==================================================
*/

const pdf = "/documentos/manual-de-arbitragem.pdf";

export const metadata = {
  title: "Manual de Arbitragem | Nacional de Rua",
  description:
    "Consulta pública do Manual de Arbitragem para Batalhas de Improviso em Portugal.",
};

/*
  CORES DE PORTUGAL
*/

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

export default function JuradosPage() {
  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* =====================================
            NAVEGAÇÃO
            ===================================== */}

        <nav
          aria-label="Navegação da página"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d] focus-visible:outline-2 focus-visible:outline-[#f0d58e]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · IMPROVISO MADE IN PORTUGAL
          </span>
        </nav>

        {/* =====================================
            CABEÇALHO PRINCIPAL

            DOIS QUADROS:
            ESQUERDA — VERDE-ESCURO
            DIREITA  — MARFIM
            ===================================== */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95 sm:mt-7">

          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">

            {/* =====================================
                QUADRO ESQUERDO
                ===================================== */}

            <div className="relative min-w-0 overflow-hidden px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">

              {/* ELEMENTO GRÁFICO */}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">

                <p className="imip-etiqueta">
                  CRITÉRIO · RESPEITO · RESPONSABILIDADE
                </p>

                {/* TÍTULO — BOLD */}

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(2.65rem,4.5vw,5rem)] text-[#f0e6d1]">
                    MANUAL DE
                  </span>

                  <span className="mt-1 block text-[clamp(2.05rem,3.8vw,4.3rem)] text-[#d6b56d]">
                    ARBITRAGEM
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-7 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-lg font-bold leading-relaxed text-[#f0e6d1] sm:text-xl">
                  A palavra tem peso. A decisão também.
                </p>

                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Consulta pública do Manual de
                  Arbitragem para Batalhas de Improviso
                  em Portugal. Um documento de referência
                  para jurados e organizações.
                </p>

                <p className="mt-5 inline-flex items-center gap-3 border-l-4 border-[#d6b56d] bg-black/30 px-4 py-3 text-xs font-black uppercase tracking-[0.07em] text-[#f0d58e]">
                  DOCUMENTO PDF · 12 PÁGINAS
                </p>

                {/* ACESSO DIRETO */}

                <div className="mt-7 flex flex-wrap gap-3">

                  <a
                    href={pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center bg-[#d6b56d] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.05em] text-[#101713] transition hover:bg-[#f0d58e]"
                  >
                    ABRIR MANUAL ↗
                  </a>

                  <a
                    href={pdf}
                    download="Manual-de-Arbitragem.pdf"
                    className="inline-flex min-h-12 items-center justify-center border border-[#d6b56d] bg-black/35 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
                  >
                    DESCARREGAR PDF ↓
                  </a>
                </div>
              </div>
            </div>

            {/* =====================================
                QUADRO DIREITO — CARTAZ MARFIM
                ===================================== */}

            <div className="relative flex min-h-[330px] min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:border-l lg:border-t-0">

              {/* ELEMENTOS GRÁFICOS */}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rotate-12 border-[24px] border-[#b82535]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 -rotate-12 border-[26px] border-[#087a43]"
              />

              {/* IDENTIFICAÇÃO */}

              <div className="relative min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  NACIONAL DE RUA · IMIP
                </p>

                <div className="mt-6 h-1 w-16 bg-[#101713]" />
              </div>

              {/* FRASE DE IMPACTO — VENEER */}

              <div className="relative my-9 min-w-0">

                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#a82636] sm:text-xs">
                  ARBITRAGEM NO IMPROVISO
                </p>

                <p
                  className={`${veneerIMIP.className} mt-5 min-w-0 text-[clamp(2.7rem,5.8vw,4.5rem)] font-normal uppercase leading-[1.05] tracking-[0.01em] lg:text-[clamp(2.5rem,3.3vw,3.8rem)]`}
                >
                  <span className="block">
                    A RUA
                  </span>

                  <span className="block">
                    TEM VOZ.
                  </span>

                  <span className="mt-5 block border-t-4 border-[#101713] pt-5 text-[#b82535]">
                    A DECISÃO
                  </span>

                  <span className="block text-[#b82535]">
                    TEM
                  </span>

                  <span className="block text-[#087a43]">
                    CRITÉRIO.
                  </span>
                </p>
              </div>

              {/* ASSINATURA */}

              <div className="relative min-w-0 border-t-4 border-[#101713] pt-4">

                <p className="text-xs font-black uppercase leading-relaxed tracking-[0.07em]">
                  RESPEITO PELA CULTURA.
                  <span className="block">
                    RESPONSABILIDADE NA DECISÃO.
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
            CONSULTA DO MANUAL
            ===================================== */}

        <section
          aria-labelledby="titulo-consulta"
          className="mt-9 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95"
        >

          <FaixaPortugal />

          <div className="p-5 sm:p-7 lg:p-9">

            <div className="flex flex-wrap items-end justify-between gap-4">

              <div>

                <p className="imip-etiqueta">
                  DOCUMENTAÇÃO · ARBITRAGEM
                </p>

                {/* TÍTULO — BOLD */}

                <h2
                  id="titulo-consulta"
                  className={`${boldIMIP.className} mt-3 text-[clamp(2rem,3.8vw,4rem)] font-bold uppercase leading-[1.08] tracking-[0.02em]`}
                >
                  CONSULTAR O

                  <span className="block text-[#d6b56d]">
                    MANUAL.
                  </span>
                </h2>
              </div>

              <span className="border border-[#d6b56d]/50 bg-black/70 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e]">
                FORMATO PDF
              </span>
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[#cdd4ca] sm:text-base">
              O manual está disponível para leitura
              diretamente nesta página, em computador,
              ou num separador do navegador. Também
              pode ser descarregado para consulta
              posterior.
            </p>

            {/* =====================================
                VISUALIZAÇÃO NO TELEMÓVEL
                ===================================== */}

            <div className="mt-7 border-l-4 border-[#087a43] bg-[#e7ddc7] p-5 text-[#101713] sm:hidden">

              <h3
                className={`${boldIMIP.className} text-xl font-bold uppercase leading-tight`}
              >
                CONSULTAR NO TELEMÓVEL
              </h3>

              <p className="mt-3 text-sm leading-relaxed">
                Abre o manual no navegador para
                ampliares o texto e ajustares
                o tamanho das páginas.
              </p>

              <a
                href={pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center bg-[#b82535] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.05em] text-white transition hover:bg-[#8d1c2b]"
              >
                LER O MANUAL ↗
              </a>
            </div>

            {/* =====================================
                VISUALIZADOR PARA COMPUTADOR
                ===================================== */}

            <div className="mt-8 hidden overflow-hidden border border-[#d6b56d]/45 bg-[#101713] sm:block">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d6b56d]/35 bg-[#121c15] px-4 py-3 sm:px-5">

                <p className="text-[11px] font-black uppercase tracking-[0.09em] text-[#f0d58e]">
                  MANUAL DE ARBITRAGEM
                </p>

                <a
                  href={pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black uppercase text-[#d6b56d] underline underline-offset-4 hover:text-[#f0d58e]"
                >
                  ABRIR EM NOVO SEPARADOR ↗
                </a>
              </div>

              <iframe
                title="Manual de Arbitragem para Batalhas de Improviso em Portugal"
                src={pdf}
                loading="lazy"
                className="h-[75vh] min-h-[480px] w-full bg-white"
              />
            </div>

            <p className="mt-5 text-xs leading-relaxed text-[#cdd4ca] sm:hidden">
              Também podes guardar o documento
              através do botão «Descarregar PDF».
            </p>

            <p className="mt-5 hidden text-xs leading-relaxed text-[#cdd4ca] sm:block">
              Se o documento não aparecer no
              visualizador, utiliza a opção
              «Abrir em novo separador».
            </p>
          </div>
        </section>

        {/* =====================================
            DOCUMENTO E COMUNIDADE
            ===================================== */}

        <aside className="mt-9 border-l-4 border-[#087a43] bg-[#0a110d]/95 px-5 py-6 sm:px-8">

          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d6b56d]">
            UMA CULTURA. MUITAS VOZES.
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#e1e5dd] sm:text-base">
            O manual está disponível para consulta
            de jurados, organizações e participantes.
            A classificação das batalhas e o percurso
            dos MCs podem ser acompanhados no
            Ranking Nacional.
          </p>

          <Link
            href="/ranking"
            className="mt-5 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
          >
            CONSULTAR RANKING NACIONAL ↗
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
