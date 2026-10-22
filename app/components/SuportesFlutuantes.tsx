
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type AreaId =
  | "geral"
  | "jurados"
  | "rodas"
  | "mcs"
  | "ranking";

type Area = {
  id: AreaId;
  nome: string;
  descricao: string;
  imagem: string;
  telefone: string | null;
};

const areas: Area[] = [
  {
    id: "geral",
    nome: "Suporte Geral",
    descricao: "Coordenação nacional",
    imagem: "/suportes/SUPORTE_GERAL.png",
    telefone: "351961901107",
  },
  {
    id: "jurados",
    nome: "Jurados e Arbitragem",
    descricao: "Regras e decisões",
    imagem: "/suportes/JURADOS_E_ARBITRAGEM.png",
    telefone: null,
  },
  {
    id: "rodas",
    nome: "Rodas e Organizações",
    descricao: "Gestão das rodas",
    imagem: "/suportes/RODAS_E_ORGANIZACOES.png",
    telefone: null,
  },
  {
    id: "mcs",
    nome: "MCs e Participação",
    descricao: "Perfis e inscrições",
    imagem: "/suportes/MCS_E_PARTICIPACAO.png",
    telefone: null,
  },
  {
    id: "ranking",
    nome: "Ranking e Resultados",
    descricao: "Pontos e classificações",
    imagem: "/suportes/RANKING_E_RESULTADOS.png",
    telefone: null,
  },
];

function obterWhatsApp(area: Area): string | null {
  if (!area.telefone) {
    return null;
  }

  const mensagem =
    area.id === "geral"
      ? "Olá! Preciso de ajuda com o Nacional de Rua."
      : `Olá! Preciso de ajuda com ${area.nome} no Nacional de Rua.`;

  return (
    `https://wa.me/${area.telefone}?text=` +
    encodeURIComponent(mensagem)
  );
}

export default function SuportesFlutuantes() {
  const [aberto, setAberto] = useState(false);
  const [areaSelecionada, setAreaSelecionada] =
    useState<AreaId | null>(null);

  const areaAtiva =
    areas.find((area) => area.id === areaSelecionada) ??
    null;

  useEffect(() => {
    function verificarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAberto(false);
        setAreaSelecionada(null);
      }
    }

    window.addEventListener(
      "keydown",
      verificarTeclado,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        verificarTeclado,
      );
    };
  }, []);

  function fechar() {
    setAberto(false);
    setAreaSelecionada(null);
  }

  function alternarPainel() {
    if (aberto) {
      fechar();
    } else {
      setAberto(true);
    }
  }

  function selecionarArea(id: AreaId) {
    setAreaSelecionada((atual) =>
      atual === id ? null : id,
    );
  }

  return (
    <>
      {/*
        FUNDO DO PAINEL NO TELEMÓVEL

        Só aparece enquanto a Central
        de Apoio está aberta.
      */}

      {aberto && (
        <button
          type="button"
          aria-label="Fechar Central de Apoio"
          onClick={fechar}
          className="fixed inset-0 z-[75] bg-black/50 xl:hidden"
        />
      )}

      {/*
        BARRA LATERAL GLOBAL

        Fechada:
        apenas a aba SUPORTE fica visível.

        Aberta:
        a aba e o painel deslizam
        a partir da direita.

        O transform mantém o painel
        fora do ecrã quando fechado,
        sem ocupar espaço no layout.
      */}

      <div
        className="fixed right-0 top-1/2 z-[80] flex items-center transition-transform duration-300 ease-out"
        style={{
          transform: aberto
            ? "translateY(-50%) translateX(0)"
            : "translateY(-50%) translateX(calc(100% - 48px))",
        }}
        onPointerEnter={(evento) => {
          if (evento.pointerType === "mouse") {
            setAberto(true);
          }
        }}
        onPointerLeave={(evento) => {
          if (evento.pointerType === "mouse") {
            fechar();
          }
        }}
      >
        {/*
          ABA DOURADA

          Não tem microfone nem ícones.
          Apenas SUPORTE, como aprovado.
        */}

        <button
          type="button"
          onClick={alternarPainel}
          aria-label={
            aberto
              ? "Fechar Central de Apoio IMIP"
              : "Abrir Central de Apoio IMIP"
          }
          aria-expanded={aberto}
          aria-controls="central-apoio-imip"
          className={
            "relative flex h-44 w-12 shrink-0 " +
            "cursor-pointer flex-col items-center " +
            "justify-center gap-3 " +
            "rounded-l-xl " +
            "border border-r-0 border-[#f2d382] " +
            "bg-[#d9b45f] " +
            "text-black shadow-[-8px_4px_22px_rgba(0,0,0,0.35)] " +
            "transition-colors duration-200 " +
            "hover:bg-[#edc76c] " +
            "focus-visible:outline-2 " +
            "focus-visible:outline-offset-2 " +
            "focus-visible:outline-[#ffe5a0]"
          }
        >
          <span
            aria-hidden="true"
            className="h-1 w-5 rounded-full bg-[#087a43]"
          />

          <span
            className={
              "rotate-180 text-[17px] " +
              "font-black uppercase " +
              "tracking-[0.14em] " +
              "text-[#111410]"
            }
            style={{
              writingMode: "vertical-rl",
              fontFamily:
                "'Zuume Rough Bold', Impact, 'Arial Narrow', sans-serif",
            }}
          >
            SUPORTE
          </span>

          <span
            aria-hidden="true"
            className="h-1 w-5 rounded-full bg-[#b3202b]"
          />
        </button>

        {/*
          CENTRAL DE APOIO

          As cinco mascotes originais
          aparecem aqui dentro.
        */}

        <aside
          id="central-apoio-imip"
          aria-label="Central de Apoio IMIP"
          aria-hidden={!aberto}
          inert={!aberto}
          className={
            "relative w-[min(390px,calc(100vw-64px))] " +
            "max-h-[min(82dvh,700px)] " +
            "overflow-y-auto overscroll-contain " +
            "rounded-l-xl " +
            "border border-[#c4a052] " +
            "bg-[#090d0b] " +
            "text-white " +
            "shadow-[-12px_12px_36px_rgba(0,0,0,0.55)]"
          }
        >
          <div className="relative px-4 pb-5 pt-5 sm:px-5">
            {/*
              CABEÇALHO
            */}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#e4c46d]">
                  IMIP · NACIONAL DE RUA
                </p>

                <h2
                  className="mt-2 text-2xl font-black uppercase leading-tight tracking-wide text-white"
                  style={{
                    fontFamily:
                      "'Gagalin', Impact, 'Arial Narrow', sans-serif",
                  }}
                >
                  CENTRAL DE APOIO
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Cinco áreas de suporte à comunidade.
                </p>
              </div>

              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar painel de suporte"
                className={
                  "flex h-9 w-9 shrink-0 " +
                  "items-center justify-center " +
                  "rounded-lg border border-white/20 " +
                  "text-2xl text-zinc-300 " +
                  "transition hover:border-[#e4c46d] " +
                  "hover:text-[#e4c46d] " +
                  "focus-visible:outline-2 " +
                  "focus-visible:outline-[#e4c46d]"
                }
              >
                ×
              </button>
            </div>

            <div
              aria-hidden="true"
              className="mt-4 flex h-1 w-full overflow-hidden"
            >
              <span className="w-2/5 bg-[#087a43]" />
              <span className="w-1/5 bg-[#d9b45f]" />
              <span className="flex-1 bg-[#b3202b]" />
            </div>

            {/*
              LISTA DAS CINCO ÁREAS

              Sem molduras individuais
              em redor das mascotes.
            */}

            <nav
              aria-label="Áreas de suporte IMIP"
              className="mt-3"
            >
              {areas.map((area) => {
                const selecionada =
                  areaSelecionada === area.id;

                const whatsapp = obterWhatsApp(area);

                return (
                  <div
                    key={area.id}
                    className="border-b border-white/15 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        selecionarArea(area.id)
                      }
                      aria-expanded={selecionada}
                      className={
                        "group flex w-full items-center " +
                        "gap-3 py-3 text-left " +
                        "transition-colors " +
                        "hover:bg-white/[0.04] " +
                        "focus-visible:rounded-lg " +
                        "focus-visible:outline-2 " +
                        "focus-visible:outline-[#e4c46d]"
                      }
                    >
                      <span className="flex h-[66px] w-[66px] shrink-0 items-center justify-center">
                        <Image
                          src={area.imagem}
                          alt={`Mascote de ${area.nome}`}
                          width={160}
                          height={160}
                          className={
                            "h-[64px] w-[64px] " +
                            "object-contain " +
                            "drop-shadow-[0_4px_5px_rgba(0,0,0,0.5)] " +
                            "transition-transform duration-200 " +
                            "group-hover:scale-110"
                          }
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black leading-snug text-white sm:text-[15px]">
                          {area.nome}
                        </span>

                        <span className="mt-1 block text-xs leading-snug text-zinc-400">
                          {area.descricao}
                        </span>
                      </span>

                      <span
                        aria-hidden="true"
                        className={
                          "shrink-0 text-2xl " +
                          "text-[#e4c46d] " +
                          "transition-transform duration-200 " +
                          (selecionada
                            ? "rotate-90"
                            : "group-hover:translate-x-1")
                        }
                      >
                        ›
                      </span>
                    </button>

                    {/*
                      DETALHE DA ÁREA

                      Aparece dentro do painel,
                      sem abrir outra janela
                      por cima do site.
                    */}

                    {selecionada && (
                      <div className="mb-4 ml-2 rounded-lg border-l-2 border-[#d9b45f] bg-white/[0.04] px-4 py-3">
                        {area.id === "geral" ? (
                          <p className="text-xs leading-relaxed text-zinc-200">
                            Precisas de ajuda com o
                            Nacional de Rua? Contacta
                            diretamente o Suporte Geral
                            através do WhatsApp.
                          </p>
                        ) : (
                          <p className="text-xs leading-relaxed text-zinc-200">
                            Esta área terá um responsável
                            próprio. O contacto será
                            disponibilizado depois da
                            atribuição.
                          </p>
                        )}

                        {whatsapp ? (
                          <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={
                              "mt-3 inline-flex " +
                              "items-center justify-center " +
                              "rounded-lg bg-[#d9b45f] " +
                              "px-4 py-2.5 " +
                              "text-xs font-black " +
                              "uppercase text-black " +
                              "transition-colors " +
                              "hover:bg-[#f0cb73] " +
                              "focus-visible:outline-2 " +
                              "focus-visible:outline-offset-2 " +
                              "focus-visible:outline-[#f0cb73]"
                            }
                          >
                            ABRIR WHATSAPP ↗
                          </a>
                        ) : (
                          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#e4c46d]">
                            CONTACTO POR ATRIBUIR
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/*
              ASSINATURA
            */}

            <div className="mt-4 rounded-lg border border-[#d9b45f]/25 bg-[#d9b45f]/10 px-3 py-3 text-center">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e4c46d]">
                MERITOCRACIA É LEI.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
