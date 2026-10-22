
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { boldIMIP, veneerIMIP } from "../../fonts/identidade";
import { processarApontamentos } from "../../../lib/apontamentos/processador";
import type { ResultadoFormato } from "../../../lib/apontamentos/tipos";
import { supabase } from "../../../lib/supabase";

type Edicao = {
  id: string;
  epoca_id: string;
  roda_id: string;
  nome: string;
  formato: string;
};

type McRegistado = {
  id: string;
  nome: string;
};

type Previsualizacao = {
  resultado: ResultadoFormato;
  mcsPorNome: Map<string, McRegistado>;
  mcsEmFalta: string[];
};

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ªº.:()\[\]]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nomeFormato(formato: string): string {
  const valor = normalizarTexto(formato);

  if (valor === "wildcard" || valor === "wildcards") {
    return "WILDCARDS";
  }

  if (valor.includes("lado a") && valor.includes("lado b")) {
    return "LADO A VS LADO B";
  }

  if (valor === "megatron") return "MEGATRON";
  if (valor === "megazord") return "MEGAZORD";

  return "NORMAL";
}

function nomesUnicos(nomes: string[]): string[] {
  const vistos = new Set<string>();

  return nomes.filter((nome) => {
    const chave = normalizarTexto(nome);

    if (!chave || vistos.has(chave)) return false;

    vistos.add(chave);
    return true;
  });
}

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

function PaginaIMIP({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        {children}
      </div>
    </main>
  );
}

function Navegacao() {
  return (
    <nav
      aria-label="Navegação da página"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Link
        href="/organizacao"
        className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase text-[#f0d58e] hover:bg-[#122b1d]"
      >
        ← VOLTAR À ORGANIZAÇÃO
      </Link>

      <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em]">
        IMIP · APONTAMENTOS
      </span>
    </nav>
  );
}

function RodapeIMIP() {
  return (
    <footer className="mt-14 border-t border-[#d6b56d]/35 pt-8 text-center">
      <p
        className={`${veneerIMIP.className} text-xl uppercase text-[#d6b56d] sm:text-2xl`}
      >
        MERITOCRACIA É LEI.
      </p>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ded8ca]">
        NACIONAL DE RUA · IMIP · IMPROVISO MADE IN PORTUGAL
      </p>
    </footer>
  );
}

function Aviso({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: string[];
  cor: "verde" | "amarelo" | "vermelho";
}) {
  const estilo =
    cor === "verde"
      ? "border-[#087a43] bg-[#087a43]/10 text-green-200"
      : cor === "amarelo"
        ? "border-[#d6b56d] bg-[#d6b56d]/10 text-[#f0d58e]"
        : "border-[#b82535] bg-[#b82535]/10 text-red-200";

  return (
    <section
      className={`mt-6 border-l-4 px-5 py-5 sm:px-7 ${estilo}`}
    >
      <h3
        className={`${boldIMIP.className} text-xl font-bold uppercase`}
      >
        {titulo}
      </h3>

      <div className="mt-4 space-y-2">
        {itens.map((item, indice) => (
          <p
            key={`${item}-${indice}`}
            className="break-words text-sm"
          >
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function ApontamentosPage() {
  const router = useRouter();

  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [apontamentos, setApontamentos] = useState("");

  const [previsualizacao, setPrevisualizacao] =
    useState<Previsualizacao | null>(null);

  const [loading, setLoading] = useState(true);
  const [aProcessar, setAProcessar] = useState(false);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    void carregarEdicao();
  }, []);

  async function carregarEdicao() {
    setLoading(true);
    setErro("");

    try {
      const edicaoId = localStorage.getItem("edicaoId");

      if (!edicaoId) {
        throw new Error(
          "Não foi encontrada uma edição selecionada. Regista ou seleciona uma edição primeiro.",
        );
      }

      const { data, error } = await supabase
        .from("edicoes")
        .select("id,epoca_id,roda_id,nome,formato")
        .eq("id", edicaoId)
        .single();

      if (error || !data) {
        throw new Error(
          "Não foi possível carregar a edição selecionada.",
        );
      }

      const {
        data: guardado,
        error: erroApontamentos,
      } = await supabase
        .from("apontamentos_edicoes")
        .select("texto")
        .eq("edicao_id", edicaoId)
        .maybeSingle();

      if (erroApontamentos) {
        throw new Error(
          `Não foi possível carregar os apontamentos: ${erroApontamentos.message}`,
        );
      }

      setEdicao(data);
      setApontamentos(guardado?.texto ?? "");
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar a edição.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function carregarMcs() {
    const [mcsResposta, aliasesResposta] = await Promise.all([
      supabase.from("mcs").select("id,nome_artistico"),

      supabase
        .from("mc_nomes_alternativos")
        .select("mc_id,nome_alternativo"),
    ]);

    if (mcsResposta.error) {
      throw new Error(
        `Não foi possível carregar os MCs: ${mcsResposta.error.message}`,
      );
    }

    if (aliasesResposta.error) {
      throw new Error(
        `Não foi possível carregar os nomes alternativos: ${aliasesResposta.error.message}`,
      );
    }

    const mcsPorId = new Map<string, McRegistado>();
    const mcsPorNome = new Map<string, McRegistado>();

    for (const mc of mcsResposta.data ?? []) {
      const registado = {
        id: mc.id,
        nome: mc.nome_artistico,
      };

      mcsPorId.set(mc.id, registado);

      mcsPorNome.set(
        normalizarTexto(mc.nome_artistico),
        registado,
      );
    }

    for (const alias of aliasesResposta.data ?? []) {
      const registado = mcsPorId.get(alias.mc_id);

      if (registado) {
        mcsPorNome.set(
          normalizarTexto(alias.nome_alternativo),
          registado,
        );
      }
    }

    // Associa variantes apenas se identificarem um único MC.

    for (const variantes of [
      ["KD", "Kd one seven", "kd one se7en", "kd one se7ene"],
      ["toyaro", "toiaro"],
    ]) {
      const encontrados = new Map<string, McRegistado>();

      for (const variante of variantes) {
        const mc = mcsPorNome.get(normalizarTexto(variante));

        if (mc) {
          encontrados.set(mc.id, mc);
        }
      }

      if (encontrados.size === 1) {
        const mc = [...encontrados.values()][0];

        for (const variante of variantes) {
          mcsPorNome.set(normalizarTexto(variante), mc);
        }
      }
    }

    return mcsPorNome;
  }

  async function processar() {
    if (!edicao || !apontamentos.trim() || aProcessar) return;

    setAProcessar(true);
    setErro("");

    try {
      const mcsPorNome = await carregarMcs();

      const normalizarNome = (nome: string) => {
        const chave = normalizarTexto(nome);

        return normalizarTexto(
          mcsPorNome.get(chave)?.nome ?? nome,
        );
      };

      const obterNomeOficial = (nome: string) => {
        const chave = normalizarTexto(nome);

        return mcsPorNome.get(chave)?.nome ?? nome.trim();
      };

      const resultado = processarApontamentos(edicao.formato, {
        linhas: apontamentos.split(/\r?\n/),
        normalizarNome,
        obterNomeOficial,
      });

      if (resultado.batalhas.length === 0) {
        throw new Error(
          "Não foi encontrada nenhuma batalha. Confirma o formato dos apontamentos.",
        );
      }

      const nomesParticipantes = nomesUnicos([
        ...resultado.batalhas.flatMap((batalha) => [
          ...batalha.equipa1,
          ...batalha.equipa2,
        ]),
        ...resultado.classificacao.map((item) => item.nome),
      ]);

      const mcsEmFalta = nomesParticipantes.filter(
        (nome) => !mcsPorNome.has(normalizarTexto(nome)),
      );

      setPrevisualizacao({
        resultado,
        mcsPorNome,
        mcsEmFalta,
      });

      setConfirmado(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (erroProcessamento) {
      setErro(
        erroProcessamento instanceof Error
          ? erroProcessamento.message
          : "Não foi possível processar os apontamentos.",
      );
    } finally {
      setAProcessar(false);
    }
  }

  function voltarParaCorrigir() {
    setPrevisualizacao(null);
    setConfirmado(false);
    setErro("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function confirmarAtualizacao() {
    if (
      !edicao ||
      !previsualizacao ||
      aAtualizar ||
      confirmado
    ) {
      return;
    }

    setAAtualizar(true);
    setErro("");

    try {
      const { resultado, mcsPorNome, mcsEmFalta } =
        previsualizacao;

      if (resultado.linhasIgnoradas.length > 0) {
        throw new Error(
          "Existem linhas não reconhecidas nos apontamentos.",
        );
      }

      if (resultado.permanencias.ignoradas.length > 0) {
        throw new Error("Existem permanências não aceites.");
      }

      const mcsPorNomeAtualizado = new Map(mcsPorNome);

      if (mcsEmFalta.length > 0) {
        // Recarrega os MCs para aproveitar registos criados entretanto.

        const mcsAtuais = await carregarMcs();

        for (const [chave, mc] of mcsAtuais) {
          mcsPorNomeAtualizado.set(chave, mc);
        }

        const nomesParaCriar = nomesUnicos(mcsEmFalta).filter(
          (nome) =>
            !mcsPorNomeAtualizado.has(normalizarTexto(nome)),
        );

        if (nomesParaCriar.length > 0) {
          const {
            data: novosMcs,
            error: erroNovosMcs,
          } = await supabase
            .from("mcs")
            .insert(
              nomesParaCriar.map((nome) => ({
                nome_artistico: nome.trim(),
                cidade: null,
                distrito: null,
                ativo: true,
                por_confirmar: true,
              })),
            )
            .select("id,nome_artistico");

          if (erroNovosMcs) {
            throw new Error(
              `Não foi possível registar automaticamente os MCs sem registo: ${erroNovosMcs.message}`,
            );
          }

          for (const mc of novosMcs ?? []) {
            const registado = {
              id: mc.id,
              nome: mc.nome_artistico,
            };

            mcsPorNomeAtualizado.set(
              normalizarTexto(mc.nome_artistico),
              registado,
            );
          }
        }

        const nomesAindaEmFalta = mcsEmFalta.filter(
          (nome) =>
            !mcsPorNomeAtualizado.has(normalizarTexto(nome)),
        );

        if (nomesAindaEmFalta.length > 0) {
          throw new Error(
            `Não foi possível confirmar o registo destes MCs: ${nomesAindaEmFalta.join(", ")}.`,
          );
        }
      }

      const batalhas = resultado.batalhas.map((batalha) => {
        const vencedores = new Set(
          batalha.vencedores.map((nome) =>
            normalizarTexto(nome),
          ),
        );

        const participacoes = [
          ...batalha.equipa1.map((nome) => ({
            nome,
            lado: "A",
          })),
          ...batalha.equipa2.map((nome) => ({
            nome,
            lado: "B",
          })),
        ].map(({ nome, lado }) => {
          const mc = mcsPorNomeAtualizado.get(
            normalizarTexto(nome),
          );

          if (!mc) {
            throw new Error(
              `O MC ${nome} não está registado.`,
            );
          }

          return {
            mc_id: mc.id,
            lado,
            venceu: vencedores.has(normalizarTexto(nome)),
          };
        });

        const pontuacoes = batalha.pontuacoes
          .filter((pontuacao) => pontuacao.pontos > 0)
          .map((pontuacao) => {
            const mc = mcsPorNomeAtualizado.get(
              normalizarTexto(pontuacao.nome),
            );

            if (!mc) {
              throw new Error(
                `O MC ${pontuacao.nome} não está registado.`,
              );
            }

            return {
              mc_id: mc.id,
              motivo: `${batalha.fase} — ${pontuacao.motivo} — resultado ${batalha.resultado}`,
              pontos: pontuacao.pontos,
            };
          });

        return {
          fase: batalha.fase,
          pontos_lado_a: batalha.pontosEquipa1,
          pontos_lado_b: batalha.pontosEquipa2,
          vitoria_2_0: batalha.bonusDoisZero,
          participacoes,
          pontuacoes,
        };
      });

      const permanencias = resultado.permanencias.validas.map(
        (nome) => {
          const mc = mcsPorNomeAtualizado.get(
            normalizarTexto(nome),
          );

          if (!mc) {
            throw new Error(
              `O MC ${nome} não está registado.`,
            );
          }

          return {
            mc_id: mc.id,
            motivo: "Permanência até ao final da edição",
            pontos: 1,
          };
        },
      );

      const total = batalhas.reduce(
        (quantidade, batalha) =>
          quantidade + batalha.pontuacoes.length,
        permanencias.length,
      );

      if (total === 0) {
        throw new Error(
          "Não existem pontuações válidas para guardar.",
        );
      }

      const { error: inserirError } = await supabase.rpc(
        "guardar_resultados_e_apontamentos",
        {
          p_edicao_id: edicao.id,
          p_batalhas: batalhas,
          p_permanencias: permanencias,
          p_texto: apontamentos,
        },
      );

      if (inserirError) {
        throw new Error(
          `Não foi possível confirmar a edição: ${inserirError.message}`,
        );
      }

      setConfirmado(true);

      alert(
        `RANKINGS ATUALIZADOS COM SUCESSO.\n\n${total} registos de pontuação foram guardados.`,
      );

      router.replace(
        `/organizacao/pontos-edicao/${edicao.id}`,
      );
    } catch (erroAtualizacao) {
      setErro(
        erroAtualizacao instanceof Error
          ? erroAtualizacao.message
          : "Ocorreu um erro ao atualizar os rankings.",
      );
    } finally {
      setAAtualizar(false);
    }
  }

  // CARREGAMENTO

  if (loading) {
    return (
      <PaginaIMIP>
        <div className="mx-auto mt-20 max-w-lg overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95">
          <FaixaPortugal />

          <div role="status" className="p-10 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[#d6b56d]">
              NACIONAL DE RUA · IMIP
            </p>

            <h1
              className={`${boldIMIP.className} mt-5 text-3xl uppercase`}
            >
              A CARREGAR...
            </h1>

            <p className="mt-3 text-sm text-[#d2d9d0]">
              A preparar os apontamentos da edição.
            </p>
          </div>
        </div>
      </PaginaIMIP>
    );
  }

  // EDIÇÃO NÃO ENCONTRADA

  if (!edicao) {
    return (
      <PaginaIMIP>
        <Navegacao />

        <section className="mt-6 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95">
          <FaixaPortugal />

          <div className="p-6 sm:p-10">
            <h1
              className={`${boldIMIP.className} text-3xl uppercase text-[#d6b56d]`}
            >
              EDIÇÃO NÃO ENCONTRADA.
            </h1>

            <p
              role="alert"
              className="mt-6 border-l-4 border-[#b82535] bg-[#b82535]/10 p-4 text-sm font-bold text-red-200"
            >
              {erro || "Edição não encontrada."}
            </p>

            <Link
              href="/organizacao/gerir-edicao"
              className="mt-6 inline-flex border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#f0d58e]"
            >
              ESCOLHER OUTRA EDIÇÃO ↗
            </Link>
          </div>
        </section>

        <RodapeIMIP />
      </PaginaIMIP>
    );
  }

  // PRÉ-VISUALIZAÇÃO: todos os resultados são mostrados antes de guardar.

  if (previsualizacao) {
    const { resultado, mcsEmFalta } = previsualizacao;

    const existemAvisos =
      resultado.linhasIgnoradas.length > 0 ||
      resultado.permanencias.ignoradas.length > 0;

    return (
      <PaginaIMIP>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={voltarParaCorrigir}
            disabled={aAtualizar}
            className="min-h-11 border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase text-[#f0d58e] disabled:opacity-50"
          >
            ← VOLTAR E CORRIGIR
          </button>

          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-wider">
            IMIP · REVISÃO DOS RESULTADOS
          </span>
        </div>

        <header className="mt-6 overflow-hidden border border-[#d6b56d]/45">
          <FaixaPortugal />

          <div className="grid lg:grid-cols-2">
            <div className="min-w-0 bg-[#091b13]/95 px-5 py-10 sm:px-8 lg:px-10">
              <p className="imip-etiqueta">
                REVISÃO · VALIDAÇÃO · CLASSIFICAÇÃO
              </p>

              <h1
                className={`${boldIMIP.className} mt-6 text-[clamp(2rem,4vw,4.5rem)] uppercase leading-[1.09] [overflow-wrap:anywhere]`}
              >
                <span className="block">
                  CONFIRMAR
                </span>

                <span className="block text-[#d6b56d]">
                  RESULTADOS
                  <span className="text-[#b82535]">.</span>
                </span>
              </h1>

              <div className="mt-6 w-44">
                <FaixaPortugal />
              </div>

              <p className="mt-7 break-words text-lg font-bold">
                {edicao.nome}
              </p>

              <p className="mt-2 text-sm font-black uppercase text-[#d6b56d]">
                {nomeFormato(edicao.formato)}
              </p>

              <p className="mt-6 text-sm leading-relaxed text-[#d2d9d0]">
                Confere as batalhas, vencedores, pontuações e
                permanências antes de atualizar os rankings.
              </p>
            </div>

            <div className="relative min-w-0 overflow-hidden bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#a82636]">
                  RESULTADOS INTERPRETADOS
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <p
                  className={`${boldIMIP.className} mt-7 text-6xl font-bold leading-none`}
                >
                  {resultado.batalhas.length}
                </p>

                <p className="mt-2 text-xs font-black uppercase tracking-wider">
                  BATALHAS IDENTIFICADAS
                </p>

                {resultado.vencedorEdicao && (
                  <div className="mt-7 border-l-4 border-[#087a43] bg-[#f8f2e5] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#a82636]">
                      VENCEDOR DA EDIÇÃO
                    </p>

                    <p
                      className={`${boldIMIP.className} mt-2 break-words text-2xl uppercase`}
                    >
                      {resultado.vencedorEdicao}
                    </p>
                  </div>
                )}

                <p
                  className={`${veneerIMIP.className} mt-9 border-t-4 border-[#101713] pt-4 text-xl uppercase text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section aria-labelledby="titulo-batalhas" className="mt-10">
          <p className="imip-etiqueta">
            BATALHAS INTERPRETADAS
          </p>

          <h2
            id="titulo-batalhas"
            className={`${boldIMIP.className} mt-3 text-[clamp(2rem,3.7vw,4rem)] uppercase`}
          >
            {resultado.batalhas.length}{" "}
            <span className="text-[#d6b56d]">
              BATALHAS.
            </span>
          </h2>

          <div className="mt-7 space-y-4">
            {resultado.batalhas.map((batalha, indice) => (
              <article
                key={`${batalha.fase}-${indice}`}
                className="overflow-hidden border border-[#d6b56d]/35 bg-[#0a110d]/95"
              >
                <FaixaPortugal />

                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-[#d6b56d]">
                      {batalha.fase}
                    </span>

                    <span className="border border-[#d6b56d]/40 px-3 py-2 text-[10px] font-black uppercase">
                      BATALHA {indice + 1}
                    </span>
                  </div>

                  <div className="mt-6 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                    <div className="min-w-0 text-center sm:text-right">
                      <p className="break-words text-lg font-black uppercase">
                        {batalha.equipa1.join(", ")}
                      </p>

                      <span
                        className={`${boldIMIP.className} mt-3 inline-flex min-w-16 justify-center bg-[#d6b56d] px-4 py-2 text-3xl font-bold text-[#101713]`}
                      >
                        {batalha.pontosEquipa1}
                      </span>
                    </div>

                    <span className="text-center text-xs font-black text-[#d6b56d]">
                      VS
                    </span>

                    <div className="min-w-0 text-center sm:text-left">
                      <p className="break-words text-lg font-black uppercase">
                        {batalha.equipa2.join(", ")}
                      </p>

                      <span
                        className={`${boldIMIP.className} mt-3 inline-flex min-w-16 justify-center bg-[#d6b56d] px-4 py-2 text-3xl font-bold text-[#101713]`}
                      >
                        {batalha.pontosEquipa2}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#d6b56d]/25 pt-5">
                    <p className="text-sm text-[#d2d9d0]">
                      VENCEDOR:{" "}
                      <strong className="text-white">
                        {batalha.vencedores.length > 0
                          ? batalha.vencedores.join(", ")
                          : "EMPATE"}
                      </strong>
                    </p>

                    {batalha.detalhes.map(
                      (detalhe, detalheIndice) => (
                        <p
                          key={`${detalhe}-${detalheIndice}`}
                          className="mt-3 border-l-2 border-[#087a43] pl-3 text-xs font-bold text-green-200"
                        >
                          {detalhe}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="titulo-pontos" className="mt-12">
          <p className="imip-etiqueta">
            PONTUAÇÃO DESTA EDIÇÃO
          </p>

          <h2
            id="titulo-pontos"
            className={`${boldIMIP.className} mt-3 text-[clamp(1.7rem,3.5vw,3.6rem)] uppercase leading-tight`}
          >
            CLASSIFICAÇÃO{" "}
            <span className="text-[#d6b56d]">
              DA EDIÇÃO.
            </span>
          </h2>

          <div className="mt-7 overflow-hidden border border-[#d6b56d]/35 bg-[#0a110d]/95">
            <FaixaPortugal />

            {resultado.classificacao.map((mc, indice) => (
              <div
                key={`${normalizarTexto(mc.nome)}-${indice}`}
                className="flex items-center justify-between gap-3 border-b border-[#d6b56d]/20 px-4 py-4 last:border-b-0 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={`${boldIMIP.className} w-12 shrink-0 text-2xl text-[#d6b56d]`}
                  >
                    {indice + 1}º
                  </span>

                  <span className="min-w-0 break-words text-sm font-black uppercase sm:text-lg">
                    {mc.nome}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-black tabular-nums text-[#d6b56d]">
                    {mc.pontos}{" "}
                    {mc.pontos === 1 ? "ponto" : "pontos"}
                  </p>

                  {mc.vitoriasDoisZero > 0 && (
                    <p className="mt-1 text-xs">
                      {mc.vitoriasDoisZero} vitória(s) 2–0
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {resultado.permanencias.validas.length > 0 && (
          <Aviso
            titulo="BÓNUS DE PERMANÊNCIA"
            itens={resultado.permanencias.validas}
            cor="verde"
          />
        )}

        {resultado.linhasIgnoradas.length > 0 && (
          <Aviso
            titulo="LINHAS NÃO RECONHECIDAS"
            itens={resultado.linhasIgnoradas}
            cor="vermelho"
          />
        )}

        {resultado.permanencias.ignoradas.length > 0 && (
          <Aviso
            titulo="PERMANÊNCIAS NÃO ACEITES"
            itens={resultado.permanencias.ignoradas}
            cor="vermelho"
          />
        )}

        {mcsEmFalta.length > 0 && (
          <Aviso
            titulo="MCs A REGISTAR COMO SEM REGISTO"
            itens={mcsEmFalta}
            cor="amarelo"
          />
        )}

        {erro && (
          <div
            role="alert"
            className="mt-8 whitespace-pre-line border-l-4 border-[#b82535] bg-[#b82535]/15 p-5 text-sm font-bold text-red-200"
          >
            {erro}
          </div>
        )}

        <section className="mt-10 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
          <FaixaPortugal />

          <div className="p-5 sm:p-7">
            <p className="imip-etiqueta">
              CONFERÊNCIA FINAL DOS RESULTADOS
            </p>

            <h2
              className={`${boldIMIP.className} mt-3 text-[clamp(1.8rem,3vw,3rem)] uppercase`}
            >
              TUDO{" "}
              <span className="text-[#d6b56d]">
                CONFIRMADO?
              </span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-[#d2d9d0]">
              A confirmação guarda os resultados desta edição e
              atualiza os rankings. Confere todas as batalhas
              antes de continuar.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={voltarParaCorrigir}
                disabled={aAtualizar}
                className="min-h-12 border border-[#d6b56d] bg-black/40 px-6 py-4 text-xs font-black uppercase text-[#f0d58e] disabled:opacity-50"
              >
                ← VOLTAR E CORRIGIR
              </button>

              <button
                type="button"
                onClick={confirmarAtualizacao}
                disabled={existemAvisos || confirmado || aAtualizar}
                className={`min-h-12 px-6 py-4 text-xs font-black uppercase ${
                  existemAvisos || confirmado || aAtualizar
                    ? "cursor-not-allowed bg-[#465049] text-[#c5c8c0]"
                    : "bg-[#d6b56d] text-[#101713] hover:bg-[#f0d58e]"
                }`}
              >
                {aAtualizar
                  ? "A ATUALIZAR..."
                  : confirmado
                    ? "RANKINGS ATUALIZADOS"
                    : "CONFIRMAR E ATUALIZAR RANKINGS"}
              </button>
            </div>

            {existemAvisos && (
              <p className="mt-5 border-l-4 border-[#b82535] bg-[#b82535]/10 px-4 py-3 text-sm font-bold text-red-200">
                Corrige os avisos antes de atualizar os rankings.
              </p>
            )}
          </div>
        </section>

        <RodapeIMIP />
      </PaginaIMIP>
    );
  }

  // INTRODUÇÃO DOS APONTAMENTOS — TÍTULO INTEIRO NUMA ÚNICA LINHA.

  return (
    <PaginaIMIP>
      <Navegacao />

      <header className="mt-6 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95">
        <FaixaPortugal />

        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
            />

            <div className="relative min-w-0">
              <p className="imip-etiqueta">
                ORGANIZAÇÃO · BATALHAS · RESULTADOS
              </p>

              <h1
                className={`${boldIMIP.className} mt-6 max-w-full whitespace-nowrap text-[clamp(1.35rem,3.15vw,3rem)] font-bold uppercase leading-[1.12] tracking-[-0.03em] text-[#f0e6d1]`}
              >
                APONTAMENTOS
                <span className="text-[#b82535]">.</span>
              </h1>

              <div className="mt-7 w-44">
                <FaixaPortugal />
              </div>

              <p className="mt-7 text-lg font-bold leading-relaxed">
                Cada batalha fica registada. Cada resultado tem
                consequências na classificação.
              </p>

              <p className="mt-4 text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                Introduz os apontamentos completos da edição.
                Antes de qualquer atualização, poderás rever
                as batalhas, a pontuação e os avisos apresentados
                pelo sistema.
              </p>

              <div className="mt-8 border-l-4 border-[#d6b56d] bg-black/25 p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#d6b56d]">
                  EDIÇÃO SELECIONADA
                </p>

                <p
                  className={`${boldIMIP.className} mt-3 break-words text-2xl font-bold uppercase`}
                >
                  {edicao.nome}
                </p>

                <p className="mt-3 text-xs font-black uppercase tracking-wider text-[#d6b56d]">
                  FORMATO · {nomeFormato(edicao.formato)}
                </p>
              </div>
            </div>

            <div className="relative mt-10 border-l-4 border-[#d6b56d] bg-black/20 px-5 py-4">
              <p
                className={`${veneerIMIP.className} text-[clamp(1.8rem,2.4vw,2.8rem)] uppercase leading-[1.15]`}
              >
                A RUA DECIDE.

                <span className="block text-[#d6b56d]">
                  O REGISTO NÃO ESQUECE.
                </span>
              </p>

              <p className="mt-4 text-xs font-black uppercase tracking-wider text-[#e3d0a1]">
                NACIONAL DE RUA · IMIP
              </p>
            </div>
          </div>

          <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-28 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
            />

            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                REGISTO DE BATALHAS · IMIP
              </p>

              <div className="mt-5 h-1 w-16 bg-[#101713]" />

              <h2
                className={`${boldIMIP.className} mt-7 text-[clamp(2rem,2.8vw,3.2rem)] uppercase leading-[1.09] [overflow-wrap:break-word]`}
              >
                INTRODUZ OS{" "}
                <span className="block text-[#b82535]">
                  RESULTADOS.
                </span>
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-[#394239]">
                Cola os apontamentos completos da edição no campo
                abaixo. Mantém o formato dos registos utilizado
                pela tua roda.
              </p>

              <div className="mt-7 border border-[#101713]/25 bg-[#f8f2e5] p-4 sm:p-5">
                <label
                  htmlFor="texto-apontamentos"
                  className="block border-l-4 border-[#087a43] pl-3 text-xs font-black uppercase tracking-wider"
                >
                  APONTAMENTOS COMPLETOS
                </label>

                <textarea
                  id="texto-apontamentos"
                  value={apontamentos}
                  onChange={(evento) =>
                    setApontamentos(evento.target.value)
                  }
                  placeholder="Cola aqui os apontamentos completos da edição..."
                  spellCheck={false}
                  className="mt-4 min-h-[370px] w-full min-w-0 resize-y border border-[#101713]/35 bg-white p-4 font-mono text-sm leading-relaxed text-[#101713] outline-none placeholder:text-[#687167] focus:border-[#087a43] sm:min-h-[440px]"
                />

                <div className="mt-3 flex flex-wrap justify-between gap-3 text-[10px] font-black uppercase tracking-wider text-[#394239]">
                  <span>REGISTO COMPLETO DA EDIÇÃO</span>
                  <span>
                    {apontamentos.length} CARACTERES
                  </span>
                </div>

                {erro && (
                  <div
                    role="alert"
                    className="mt-5 whitespace-pre-line border-l-4 border-[#b82535] bg-[#b82535]/10 p-4 text-sm font-bold text-[#842333]"
                  >
                    {erro}
                  </div>
                )}

                <button
                  type="button"
                  onClick={processar}
                  disabled={!apontamentos.trim() || aProcessar}
                  className={`mt-6 min-h-12 w-full px-5 py-4 text-xs font-black uppercase ${
                    apontamentos.trim() && !aProcessar
                      ? "bg-[#101713] text-[#f0e6d1] hover:bg-[#087a43]"
                      : "cursor-not-allowed bg-[#9b9c94] text-white"
                  }`}
                >
                  {aProcessar
                    ? "A PROCESSAR..."
                    : "PROCESSAR E REVER RESULTADOS ↗"}
                </button>
              </div>
            </div>

            <div className="relative mt-9 border-t-4 border-[#101713] pt-4">
              <p className="text-xs font-black uppercase tracking-wider">
                PRIMEIRO CONFERIR.
                <span className="block">
                  DEPOIS ATUALIZAR.
                </span>
              </p>

              <p
                className={`${veneerIMIP.className} mt-3 text-xl uppercase text-[#a82636]`}
              >
                MERITOCRACIA É LEI.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-8 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">
        <FaixaPortugal />

        <div className="p-5 sm:p-7">
          <p className="imip-etiqueta">
            CONFERÊNCIA DOS APONTAMENTOS
          </p>

          <h2
            className={`${boldIMIP.className} mt-3 text-[clamp(1.7rem,2.8vw,3rem)] uppercase leading-[1.1]`}
          >
            REVER ANTES{" "}
            <span className="block text-[#d6b56d]">
              DE CONFIRMAR.
            </span>
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#d2d9d0]">
            O processamento identifica batalhas, vencedores,
            pontos e permanências. As linhas não reconhecidas
            e as permanências não aceites bloqueiam a
            confirmação até serem corrigidas.
          </p>

          <Link
            href="/organizacao/gerir-edicao"
            className="mt-6 inline-flex border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#f0d58e] hover:bg-[#d6b56d] hover:text-[#101713]"
          >
            ESCOLHER OUTRA EDIÇÃO ↗
          </Link>
        </div>
      </section>

      <RodapeIMIP />
    </PaginaIMIP>
  );
}
