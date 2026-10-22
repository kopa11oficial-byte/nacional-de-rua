
import Link from "next/link";
import {
  boldIMIP,
  veneerIMIP,
} from "../fonts/identidade";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  APOIOS E PATROCÍNIOS

  BOLD:
  Títulos principais e secções.

  VENEER:
  Frases de impacto e assinatura.

  GEIST:
  Textos, informações e botões.

  Não altera o Supabase.
  Não apresenta patrocinadores fictícios.
  Preserva o contacto e as modalidades de apoio.
  ==================================================
*/

const whatsappParcerias =
  "https://wa.me/351961901107?text=" +
  encodeURIComponent(
    "Olá! Gostaria de apresentar uma proposta de apoio ou patrocínio ao IMIP — Nacional de Rua.",
  );

const modalidades = [
  {
    numero: "01",
    categoria: "PATROCÍNIO",
    titulo: "INVESTIR NA CULTURA.",
    descricao:
      "Contribuições financeiras para apoiar a realização e o desenvolvimento das iniciativas do circuito nacional.",
    detalhes: [
      "Apoio à produção de eventos",
      "Recursos para iniciativas do circuito",
      "Colaboração com objetivos definidos",
    ],
    cor: "#b82535",
  },
  {
    numero: "02",
    categoria: "APOIO MATERIAL E TÉCNICO",
    titulo: "DAR MEIOS À RUA.",
    descricao:
      "Equipamentos, materiais, serviços e recursos que ajudem as organizações a criar melhores condições para os participantes.",
    detalhes: [
      "Som, luz e equipamentos",
      "Produção gráfica e audiovisual",
      "Materiais, espaços e logística",
    ],
    cor: "#087a43",
  },
  {
    numero: "03",
    categoria: "PARCERIAS CULTURAIS",
    titulo: "FAZER ACONTECER.",
    descricao:
      "Colaborações com associações, coletivos, projetos culturais e entidades que valorizam a expressão artística e a cultura urbana.",
    detalhes: [
      "Divulgação e comunicação",
      "Iniciativas culturais conjuntas",
      "Projetos comunitários e educativos",
    ],
    cor: "#d6b56d",
  },
];

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

export default function ApoiosPatrociniosPage() {
  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">

        {/* NAVEGAÇÃO */}

        <nav
          aria-label="Navegação da página"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← PÁGINA INICIAL
          </Link>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · IMPROVISO MADE IN PORTUGAL
          </span>
        </nav>

        {/* =====================================
            CARTAZ PRINCIPAL
            ===================================== */}

        <header className="relative mt-5 overflow-hidden border border-[#d6b56d]/45 bg-[#07180f]/95 sm:mt-7">

          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1.13fr)_minmax(0,0.87fr)]">

            {/* LADO ESQUERDO */}

            <div className="relative min-w-0 overflow-hidden px-5 py-11 sm:px-8 sm:py-14 lg:px-12 lg:py-16">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rotate-12 border-[30px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">

                <p className="imip-etiqueta">
                  APOIOS E PATROCÍNIOS
                </p>

                {/* TÍTULO PRINCIPAL — BOLD */}

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.08] tracking-[0.005em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(2.25rem,3.9vw,4.8rem)] text-[#f0e6d1]">
                    QUEM APOIA
                  </span>

                  <span className="mt-1 block text-[clamp(2.8rem,5vw,5.6rem)] text-[#d6b56d]">
                    A RUA,
                  </span>

                  <span className="mt-2 block text-[clamp(2.25rem,3.9vw,4.8rem)] text-[#f0e6d1]">
                    FAZ PARTE
                  </span>

                  <span className="mt-2 block text-[clamp(2.15rem,3.75vw,4.3rem)] text-[#d6b56d]">
                    DA HISTÓRIA
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-7 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-lg font-black leading-relaxed sm:text-xl">
                  A cultura não se constrói sozinha.
                </p>

                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  O Nacional de Rua nasce do trabalho
                  das organizações, dos MCs e das pessoas
                  que acreditam no improviso português.
                  Os apoios ajudam a criar condições
                  para que este movimento continue
                  a crescer.
                </p>

                <a
                  href={whatsappParcerias}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#d6b56d] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.06em] text-[#101713] transition hover:bg-[#f0d58e]"
                >
                  APRESENTAR PROPOSTA ↗
                </a>
              </div>
            </div>

            {/* =====================================
                CARTAZ DIREITO — VENEER

                FRASE APROVADA:
                NÃO É SÓ UM LOGÓTIPO NUM CARTAZ.
                É UMA MARCA NA CULTURA.
                ===================================== */}

            <div className="relative flex min-h-[390px] min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:border-l lg:border-t-0">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-16 h-64 w-64 rotate-12 border-[27px] border-[#b82535]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-64 -rotate-12 bg-[#087a43]"
              />

              <div className="relative min-w-0">

                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9e2734]">
                  NACIONAL DE RUA · IMIP
                </p>

                <div className="mt-6 h-1 w-16 bg-[#101713]" />
              </div>

              {/* FRASE PRINCIPAL — VENEER */}

              <div className="relative my-10 min-w-0">

                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9e2734] sm:text-xs">
                  MAIS DO QUE VISIBILIDADE
                </p>

                <p
                  className={`${veneerIMIP.className} mt-5 min-w-0 font-normal uppercase leading-[1.06] tracking-[0.012em] text-[clamp(2.15rem,6vw,4.2rem)] lg:text-[clamp(2.15rem,2.8vw,3.2rem)]`}
                >
                  <span className="block">
                    NÃO É SÓ UM
                  </span>

                  <span className="block text-[#b82535]">
                    LOGÓTIPO
                  </span>

                  <span className="block">
                    NUM CARTAZ.
                  </span>

                  <span className="mt-5 block border-t-4 border-[#101713] pt-5">
                    É UMA
                  </span>

                  <span className="block text-[#087a43]">
                    MARCA NA
                  </span>

                  <span className="block text-[#087a43]">
                    CULTURA.
                  </span>
                </p>
              </div>

              {/* ASSINATURA DO CARTAZ */}

              <div className="relative min-w-0 border-t-4 border-[#101713] pt-4">

                <p className="text-sm font-black uppercase tracking-[0.06em]">
                  UM MOVIMENTO. MUITAS PESSOAS.
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
            INTRODUÇÃO AOS APOIOS
            ===================================== */}

        <section
          aria-labelledby="titulo-importancia"
          className="mt-12 sm:mt-16"
        >
          <div className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end lg:gap-12">

            <div className="min-w-0">

              <p className="imip-etiqueta">
                MAIS DO QUE PATROCINAR
              </p>

              <h2
                id="titulo-importancia"
                className={`${boldIMIP.className} mt-4 font-bold uppercase leading-[1.05] tracking-[0.02em] text-[clamp(2.2rem,4vw,4.4rem)]`}
              >
                APOIAR É

                <span className="block text-[#d6b56d]">
                  FAZER
                </span>

                ACONTECER.
              </h2>
            </div>

            <div className="border-l-4 border-[#087a43] bg-[#0b130e]/90 px-5 py-6 sm:px-7">

              <p className="text-base font-bold leading-relaxed text-[#f0e6d1]">
                Uma batalha não acontece apenas
                quando dois MCs se enfrentam.
              </p>

              <p className="mt-4 text-sm leading-relaxed text-[#cdd4ca] sm:text-base">
                Há pessoas a organizar, equipas a
                montar equipamentos, artistas a
                criar, fotógrafos a registar e
                comunidades a ocupar os espaços
                com cultura. Cada contributo
                pode fazer a diferença.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================
            MODALIDADES DE COLABORAÇÃO
            ===================================== */}

        <section
          aria-labelledby="titulo-modalidades"
          className="mt-14 sm:mt-18"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d6b56d]/40 pb-5">

            <div>

              <p className="imip-etiqueta">
                HÁ VÁRIAS FORMAS DE CONTRIBUIR
              </p>

              <h2
                id="titulo-modalidades"
                className={`${boldIMIP.className} mt-3 font-bold uppercase leading-tight tracking-[0.02em] text-[clamp(2.1rem,3.8vw,4rem)]`}
              >
                FORMAS DE APOIAR
                <span className="text-[#d6b56d]">
                  .
                </span>
              </h2>
            </div>

            <p className="max-w-sm text-xs leading-relaxed text-[#cdd4ca]">
              As condições de cada colaboração
              são analisadas e acordadas
              individualmente.
            </p>
          </div>

          {/* TRÊS MODALIDADES */}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {modalidades.map((modalidade) => (
              <article
                key={modalidade.numero}
                className="relative flex min-w-0 flex-col overflow-hidden border border-[#d6b56d]/35 bg-[#0a110d]/95"
              >
                <div
                  aria-hidden="true"
                  className="h-[5px] w-full"
                  style={{
                    backgroundColor: modalidade.cor,
                  }}
                />

                <div className="flex flex-1 flex-col p-5 sm:p-6">

                  <div className="flex items-start justify-between gap-3">

                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d]">
                      {modalidade.categoria}
                    </p>

                    <span
                      aria-hidden="true"
                      className={`${boldIMIP.className} text-5xl leading-none text-[#d6b56d]/60`}
                    >
                      {modalidade.numero}
                    </span>
                  </div>

                  <h3
                    className={`${boldIMIP.className} mt-8 font-bold uppercase leading-[1.05] tracking-[0.02em] text-[clamp(1.8rem,2.5vw,2.5rem)]`}
                  >
                    {modalidade.titulo}
                  </h3>

                  <p className="mt-4 text-sm leading-relaxed text-[#cdd4ca]">
                    {modalidade.descricao}
                  </p>

                  <div className="mt-7 border-t border-white/15 pt-5">

                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d]">
                      EXEMPLOS DE COLABORAÇÃO
                    </p>

                    <ul className="mt-4 space-y-3">
                      {modalidade.detalhes.map((detalhe) => (
                        <li
                          key={detalhe}
                          className="flex items-start gap-3 text-xs leading-relaxed text-[#e2e5de] sm:text-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2 h-[5px] w-[5px] shrink-0 rotate-45"
                            style={{
                              backgroundColor: modalidade.cor,
                            }}
                          />

                          <span>
                            {detalhe}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* =====================================
            APOIO NACIONAL E APOIO LOCAL
            ===================================== */}

        <section
          aria-labelledby="titulo-abrangencia"
          className="mt-14 sm:mt-18"
        >
          <div className="mb-6">

            <p className="imip-etiqueta">
              CADA RODA MANTÉM A SUA IDENTIDADE
            </p>

            <h2
              id="titulo-abrangencia"
              className={`${boldIMIP.className} mt-3 font-bold uppercase leading-[1.05] tracking-[0.02em] text-[clamp(2.15rem,3.8vw,4.1rem)]`}
            >
              UM CIRCUITO.

              <span className="block text-[#d6b56d]">
                MUITAS RODAS.
              </span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

            {/* APOIO NACIONAL */}

            <article className="relative overflow-hidden border border-[#d6b56d]/40 bg-[#e7ddc7] text-[#101713]">

              <div className="h-[5px] bg-[#087a43]" />

              <div className="p-6 sm:p-8">

                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8e2632]">
                  ABRANGÊNCIA NACIONAL
                </p>

                <h3
                  className={`${boldIMIP.className} mt-4 font-bold uppercase leading-tight text-[clamp(2rem,3vw,3rem)]`}
                >
                  APOIAR O IMIP
                </h3>

                <p className="mt-4 text-sm leading-relaxed sm:text-base">
                  Parcerias dirigidas ao desenvolvimento
                  do circuito nacional, à sua estrutura
                  e às iniciativas de âmbito nacional.
                </p>

                <p className="mt-4 border-l-4 border-[#087a43] pl-4 text-sm font-bold leading-relaxed">
                  A colaboração é definida em função
                  do objetivo e do alcance da proposta.
                </p>
              </div>
            </article>

            {/* APOIO LOCAL */}

            <article className="relative overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">

              <div className="h-[5px] bg-[#b82535]" />

              <div className="p-6 sm:p-8">

                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#d6b56d]">
                  ABRANGÊNCIA LOCAL
                </p>

                <h3
                  className={`${boldIMIP.className} mt-4 font-bold uppercase leading-tight text-[clamp(2rem,3vw,3rem)]`}
                >
                  APOIAR UMA RODA
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-[#cdd4ca] sm:text-base">
                  Uma marca ou entidade pode querer
                  apoiar diretamente uma organização,
                  uma edição ou uma iniciativa local.
                </p>

                <p className="mt-4 border-l-4 border-[#b82535] pl-4 text-sm font-bold leading-relaxed text-[#f0e6d1]">
                  As rodas mantêm a sua autonomia.
                  Um apoio local não é automaticamente
                  um patrocínio nacional.
                </p>
              </div>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-l-4 border-[#d6b56d] bg-[#0b130e]/90 px-5 py-4">

            <p className="text-sm font-bold text-[#f0e6d1]">
              Conhece as organizações que fazem parte do movimento.
            </p>

            <Link
              href="/rodas"
              className="text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d] underline underline-offset-4 hover:text-[#f0d58e]"
            >
              CONHECER AS RODAS ↗
            </Link>
          </div>
        </section>

        {/* =====================================
            ESPAÇO PARA PARCEIROS REAIS
            ===================================== */}

        <section
          aria-labelledby="titulo-parceiros"
          className="mt-14 sm:mt-18"
        >
          <div className="overflow-hidden border border-[#d6b56d]/45 bg-[#0a110d]/95">

            <FaixaPortugal />

            <div className="p-5 sm:p-8 lg:p-10">

              <div className="flex flex-wrap items-end justify-between gap-4">

                <div>

                  <p className="imip-etiqueta">
                    RECONHECER QUEM CONTRIBUI
                  </p>

                  <h2
                    id="titulo-parceiros"
                    className={`${boldIMIP.className} mt-4 font-bold uppercase leading-[1.05] tracking-[0.02em] text-[clamp(2.15rem,3.8vw,4.3rem)]`}
                  >
                    QUEM CAMINHA

                    <span className="block text-[#d6b56d]">
                      CONNOSCO.
                    </span>
                  </h2>
                </div>

                <span className="border border-[#d6b56d]/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d]">
                  PARCEIROS E APOIANTES
                </span>
              </div>

              {/*
                Logótipos apenas após confirmação
                e autorização dos parceiros.
              */}

              <div className="mt-8 grid gap-6 border-y border-[#d6b56d]/20 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)] md:items-center">

                <div>

                  <p className="text-lg font-black uppercase leading-snug text-[#f0e6d1] sm:text-xl">
                    O NOSSO RECONHECIMENTO TEM DE SER REAL.
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#cdd4ca]">
                    Este espaço está preparado para
                    apresentar entidades que venham
                    a ter uma colaboração confirmada
                    com o IMIP, com a identificação
                    e visibilidade previamente acordadas.
                  </p>
                </div>

                <div className="flex min-h-[130px] items-center justify-center border border-dashed border-[#d6b56d]/45 bg-[#d6b56d]/[0.04] p-5 text-center">

                  <p className="text-xs font-black uppercase leading-relaxed tracking-[0.12em] text-[#d6b56d]">
                    ESPAÇO RESERVADO

                    <span className="mt-2 block text-[#c7c9bd]">
                      A PARCEIROS CONFIRMADOS
                    </span>
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-[#bfc9bd]">
                Nenhum logótipo, nome ou entidade será
                apresentado como patrocinador oficial
                sem confirmação da colaboração.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================
            CONTACTO E PROPOSTAS
            ===================================== */}

        <section
          aria-labelledby="titulo-contacto"
          className="mt-14 overflow-hidden border border-[#d6b56d]/45 bg-[#e7ddc7] text-[#101713] sm:mt-18"
        >

          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">

            {/* LADO ESQUERDO */}

            <div className="min-w-0 p-6 sm:p-8 lg:p-10">

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#a82636]">
                FALA CONNOSCO
              </p>

              <h2
                id="titulo-contacto"
                className={`${boldIMIP.className} mt-4 font-bold uppercase leading-[1.05] tracking-[0.02em] text-[clamp(2.45rem,4.4vw,4.8rem)]`}
              >
                TENS UMA

                <span className="block text-[#b82535]">
                  PROPOSTA?
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-relaxed sm:text-base">
                Se representas uma marca, associação,
                empresa, entidade cultural ou simplesmente
                queres contribuir para o movimento,
                queremos conhecer a tua ideia.
              </p>

              <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed">
                Conta-nos quem és, de que forma
                gostarias de apoiar e qual o alcance
                da colaboração que propões.
              </p>

              <a
                href={whatsappParcerias}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#101713] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.06em] text-[#f0e6d1] transition hover:bg-[#087a43] sm:w-auto"
              >
                CONTACTAR SUPORTE GERAL

                <span aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>

            {/* LADO DIREITO — COMO COMEÇAR */}

            <div className="flex flex-col justify-between border-t border-black/15 bg-[#101713] p-6 text-[#f0e6d1] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d6b56d]">
                  COMO COMEÇAR
                </p>

                <div className="mt-6 space-y-6">

                  {/* PASSO 1 */}

                  <div className="flex gap-4">

                    <span
                      className={`${boldIMIP.className} text-4xl font-bold leading-none text-[#d6b56d]`}
                    >
                      01
                    </span>

                    <div>

                      <p className="text-sm font-black uppercase">
                        APRESENTA A TUA IDEIA
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-[#cdd4ca]">
                        Explica o tipo de apoio ou
                        parceria que tens em mente.
                      </p>
                    </div>
                  </div>

                  {/* PASSO 2 */}

                  <div className="flex gap-4">

                    <span
                      className={`${boldIMIP.className} text-4xl font-bold leading-none text-[#d6b56d]`}
                    >
                      02
                    </span>

                    <div>

                      <p className="text-sm font-black uppercase">
                        ANALISAMOS A PROPOSTA
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-[#cdd4ca]">
                        Avaliamos os objetivos e
                        a compatibilidade com a
                        missão do IMIP.
                      </p>
                    </div>
                  </div>

                  {/* PASSO 3 */}

                  <div className="flex gap-4">

                    <span
                      className={`${boldIMIP.className} text-4xl font-bold leading-none text-[#d6b56d]`}
                    >
                      03
                    </span>

                    <div>

                      <p className="text-sm font-black uppercase">
                        DEFINIMOS A COLABORAÇÃO
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-[#cdd4ca]">
                        Se existir acordo, ficam
                        estabelecidos os contributos,
                        as responsabilidades e a
                        visibilidade correspondente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-8 border-t border-[#d6b56d]/30 pt-4 text-xs font-black uppercase tracking-[0.08em] text-[#d6b56d]">
                PARCERIAS COM RESPEITO PELA CULTURA.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================
            ASSINATURA
            ===================================== */}

        <div className="mt-12 text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d6b56d]">
            A CULTURA CONSTRÓI-SE EM CONJUNTO.
          </p>
        </div>

        {/* =====================================
            RODAPÉ
            ===================================== */}

        <footer className="mt-8 border-t border-[#d6b56d]/35 pt-8 text-center">

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
