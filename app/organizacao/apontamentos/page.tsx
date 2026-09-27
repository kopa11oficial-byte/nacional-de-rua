"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
    .replace(/[ªº.:[\]()]/g, "")
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

function PaginaComFundo({
  children,
  largura = "max-w-4xl",
}: {
  children: ReactNode;
  largura?: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/40"
      />

      <div
        className={`relative mx-auto w-full ${largura} px-5 py-10 sm:px-6 sm:py-14`}
      >
        {children}
      </div>
    </main>
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

      const { data: guardado, error: erroApontamentos } =
        await supabase
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
        if (mc) encontrados.set(mc.id, mc);
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      if (mcsEmFalta.length > 0) {
        throw new Error(
          `Os seguintes MCs não estão registados:\n${mcsEmFalta.join("\n")}`,
        );
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
          const mc = mcsPorNome.get(normalizarTexto(nome));

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
            const mc = mcsPorNome.get(
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
          const mc = mcsPorNome.get(normalizarTexto(nome));

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

  if (loading) {
    return (
      <PaginaComFundo>
        <p className="rounded-xl bg-black/90 p-6 font-black text-yellow-500">
          A CARREGAR...
        </p>
      </PaginaComFundo>
    );
  }

  if (!edicao) {
    return (
      <PaginaComFundo largura="max-w-3xl">
        <Link
          href="/organizacao"
          className="font-black text-yellow-500"
        >
          ← VOLTAR À ORGANIZAÇÃO
        </Link>

        <div
          role="alert"
          className="mt-10 rounded-2xl border border-red-800 bg-black/90 p-6 font-bold text-red-300"
        >
          {erro || "Edição não encontrada."}
        </div>
      </PaginaComFundo>
    );
  }

  if (previsualizacao) {
    const { resultado, mcsEmFalta } = previsualizacao;

    const existemAvisos =
      resultado.linhasIgnoradas.length > 0 ||
      resultado.permanencias.ignoradas.length > 0 ||
      mcsEmFalta.length > 0;

    return (
      <PaginaComFundo largura="max-w-5xl">
        <button
          type="button"
          onClick={voltarParaCorrigir}
          className="text-sm font-black text-yellow-500"
        >
          ← VOLTAR E CORRIGIR
        </button>

        <p className="mt-10 text-xs font-black tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-2 text-4xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl">
          CONFIRMAR{" "}
          <span className="text-yellow-500">RESULTADOS</span>
        </h1>

        <p className="mt-3 text-zinc-200">
          {edicao.nome} · {nomeFormato(edicao.formato)}
        </p>

        {resultado.vencedorEdicao && (
          <div className="mt-8 rounded-2xl border border-yellow-500 bg-black/90 p-5">
            <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
              VENCEDOR DA EDIÇÃO
            </p>

            <p className="mt-2 break-words text-xl font-black">
              {resultado.vencedorEdicao}
            </p>
          </div>
        )}

        <section className="mt-10">
          <p className="text-xs font-black tracking-[0.25em] text-yellow-500">
            BATALHAS INTERPRETADAS
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {resultado.batalhas.length} batalhas
          </h2>

          <div className="mt-6 space-y-4">
            {resultado.batalhas.map((batalha, indice) => (
              <article
                key={`${batalha.fase}-${indice}`}
                className="rounded-2xl border border-zinc-700 bg-black/90 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-black tracking-[0.2em] text-yellow-500">
                    {batalha.fase}
                  </span>

                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-200">
                    BATALHA {indice + 1}
                  </span>
                </div>

                <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="min-w-0 text-center sm:text-right">
                    <p className="break-words text-lg font-black">
                      {batalha.equipa1.join(", ")}
                    </p>

                    <span className="mt-2 inline-block rounded-xl bg-yellow-500 px-4 py-2 text-xl font-black text-black">
                      {batalha.pontosEquipa1}
                    </span>
                  </div>

                  <span className="text-center text-xs font-black text-zinc-300">
                    VS
                  </span>

                  <div className="min-w-0 text-center sm:text-left">
                    <p className="break-words text-lg font-black">
                      {batalha.equipa2.join(", ")}
                    </p>

                    <span className="mt-2 inline-block rounded-xl bg-yellow-500 px-4 py-2 text-xl font-black text-black">
                      {batalha.pontosEquipa2}
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-700 pt-4">
                  <p className="text-sm text-zinc-200">
                    Vencedor:{" "}
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
                        className="mt-2 text-xs font-bold text-emerald-300"
                      >
                        {detalhe}
                      </p>
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <p className="text-xs font-black tracking-[0.25em] text-yellow-500">
            PONTUAÇÃO DESTA EDIÇÃO
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-700 bg-black/90">
            {resultado.classificacao.map((mc, indice) => (
              <div
                key={`${normalizarTexto(mc.nome)}-${indice}`}
                className="flex items-center justify-between gap-3 border-b border-zinc-700 px-4 py-4 last:border-b-0 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="w-8 shrink-0 font-black text-yellow-500">
                    {indice + 1}º
                  </span>

                  <span className="break-words font-black">
                    {mc.nome}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-black">
                    {mc.pontos}{" "}
                    {mc.pontos === 1 ? "ponto" : "pontos"}
                  </p>

                  {mc.vitoriasDoisZero > 0 && (
                    <p className="text-xs text-zinc-300">
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
            titulo="MCs NÃO REGISTADOS"
            itens={mcsEmFalta}
            cor="vermelho"
          />
        )}

        {erro && (
          <div
            role="alert"
            className="mt-8 whitespace-pre-line rounded-2xl border border-red-800 bg-black/90 p-5 font-bold text-red-300"
          >
            {erro}
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={voltarParaCorrigir}
            disabled={aAtualizar}
            className="rounded-xl border border-zinc-600 bg-black/90 px-6 py-4 font-black transition hover:border-yellow-500 disabled:opacity-50"
          >
            VOLTAR E CORRIGIR
          </button>

          <button
            type="button"
            onClick={confirmarAtualizacao}
            disabled={existemAvisos || confirmado || aAtualizar}
            className={`rounded-xl px-6 py-4 font-black transition ${
              existemAvisos || confirmado || aAtualizar
                ? "cursor-not-allowed bg-zinc-800 text-zinc-400"
                : "bg-yellow-500 text-black hover:bg-yellow-400"
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
          <p className="mt-4 text-center text-sm font-bold text-red-300">
            Corrige os avisos antes de atualizar os rankings.
          </p>
        )}
      </PaginaComFundo>
    );
  }

  return (
    <PaginaComFundo>
      <Link
        href="/organizacao"
        className="text-sm font-black text-yellow-500"
      >
        ← VOLTAR À ORGANIZAÇÃO
      </Link>

      <p className="mt-12 text-xs font-black tracking-[0.3em] text-yellow-500">
        NACIONAL DE RUA
      </p>

      <h1 className="mt-2 text-4xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl">
        APONTAMENTOS
      </h1>

      <p className="mt-3 text-zinc-200">
        {edicao.nome} · {nomeFormato(edicao.formato)}
      </p>

      <label htmlFor="texto-apontamentos" className="sr-only">
        Apontamentos completos da edição
      </label>

      <textarea
        id="texto-apontamentos"
        value={apontamentos}
        onChange={(evento) =>
          setApontamentos(evento.target.value)
        }
        placeholder="Cola aqui os apontamentos completos da edição..."
        className="mt-10 min-h-[350px] w-full resize-y rounded-xl border border-zinc-600 bg-black/90 p-5 text-base text-white outline-none placeholder:text-zinc-400 focus:border-yellow-500 sm:min-h-[430px] sm:p-6"
      />

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-bold text-zinc-200">
        <span>REGISTO COMPLETO DA EDIÇÃO</span>
        <span>{apontamentos.length} CARACTERES</span>
      </div>

      {erro && (
        <div
          role="alert"
          className="mt-6 whitespace-pre-line rounded-xl border border-red-800 bg-black/90 p-5 font-bold text-red-300"
        >
          {erro}
        </div>
      )}

      <button
        type="button"
        onClick={processar}
        disabled={!apontamentos.trim() || aProcessar}
        className={`mt-8 w-full rounded-xl px-6 py-4 font-black transition ${
          apontamentos.trim() && !aProcessar
            ? "bg-yellow-500 text-black hover:bg-yellow-400"
            : "cursor-not-allowed bg-zinc-800 text-zinc-400"
        }`}
      >
        {aProcessar
          ? "A PROCESSAR..."
          : "PROCESSAR E REVER RESULTADOS"}
      </button>

      <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-zinc-300">
        MERITOCRACIA É LEI.
      </p>
    </PaginaComFundo>
  );
}

function Aviso({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: string[];
  cor: "verde" | "vermelho";
}) {
  const classes =
    cor === "verde"
      ? "border-emerald-700 text-emerald-300"
      : "border-red-800 text-red-300";

  return (
    <section
      className={`mt-8 rounded-2xl border bg-black/90 p-5 ${classes}`}
    >
      <p className="text-xs font-black tracking-[0.2em]">
        {titulo}
      </p>

      <div className="mt-4 space-y-2">
        {itens.map((item, indice) => (
          <p key={`${item}-${indice}`} className="break-words text-sm">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}