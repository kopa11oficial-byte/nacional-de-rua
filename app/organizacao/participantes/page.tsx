"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MC = {
  id: string;
  nome_artistico: string;
  cidade: string | null;
  distrito: string | null;
  por_confirmar: boolean;
};

type NomeAlternativo = {
  id: string;
  mc_id: string;
  nome_alternativo: string;
};

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function separarNomesAlternativos(texto: string) {
  return Array.from(
    new Set(
      texto
        .split(/[,;\n]/)
        .map((nome) => nome.trim())
        .filter(Boolean),
    ),
  );
}

export default function ParticipantesPage() {
  const [mcs, setMcs] = useState<MC[]>([]);
  const [nomesAlternativos, setNomesAlternativos] = useState<
    NomeAlternativo[]
  >([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [mostrarNovoMC, setMostrarNovoMC] = useState(false);
  const [nomeArtistico, setNomeArtistico] = useState("");
  const [cidade, setCidade] = useState("");
  const [distrito, setDistrito] = useState("");
  const [aliasesNovoMC, setAliasesNovoMC] = useState("");
  const [aGuardarMC, setAGuardarMC] = useState(false);

  const [mcParaAlias, setMcParaAlias] = useState("");
  const [novoAlias, setNovoAlias] = useState("");
  const [aGuardarAlias, setAGuardarAlias] = useState(false);
  const [aliasAEliminar, setAliasAEliminar] = useState<string | null>(null);

  useEffect(() => {
    void carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    setErro("");

    const edicaoId = localStorage.getItem("edicaoId");

    if (!edicaoId) {
      setErro(
        "Seleciona uma edição em Gerir edição antes de escolher os participantes.",
      );
      setLoading(false);
      return;
    }

    const chaveSelecao = `participantesSelecionados:${edicaoId}`;
    let selecaoLocal: string[] = [];

    try {
      const guardados = JSON.parse(
        localStorage.getItem(chaveSelecao) ?? "[]",
      );

      if (Array.isArray(guardados)) {
        selecaoLocal = guardados.filter(
          (id): id is string => typeof id === "string",
        );
      }
    } catch {
      localStorage.removeItem(chaveSelecao);
    }

    const { data: batalhasDaEdicao, error: erroBatalhas } = await supabase
      .from("batalhas")
      .select("id")
      .eq("edicao_id", edicaoId);

    if (erroBatalhas) {
      setErro(
        `Não foi possível carregar os participantes da edição: ${erroBatalhas.message}`,
      );
      setLoading(false);
      return;
    }

    let selecaoGravada: string[] = [];
    const idsBatalhas = (batalhasDaEdicao ?? []).map(
      (batalha) => batalha.id,
    );

    if (idsBatalhas.length > 0) {
      const { data: participacoes, error: erroParticipacoes } =
        await supabase
          .from("participacoes")
          .select("mc_id")
          .in("batalha_id", idsBatalhas);

      if (erroParticipacoes) {
        setErro(
          `Não foi possível carregar os participantes da edição: ${erroParticipacoes.message}`,
        );
        setLoading(false);
        return;
      }

      selecaoGravada = [
        ...new Set((participacoes ?? []).map((item) => item.mc_id)),
      ];
    }

    const [mcsResposta, aliasesResposta] = await Promise.all([
      supabase
        .from("mcs")
        .select("id,nome_artistico,cidade,distrito,por_confirmar")
        .eq("ativo", true)
        .order("nome_artistico"),
      supabase
        .from("mc_nomes_alternativos")
        .select("id,mc_id,nome_alternativo")
        .order("nome_alternativo"),
    ]);

    if (mcsResposta.error) {
      setErro(
        `Não foi possível carregar os MCs: ${mcsResposta.error.message}`,
      );
      setLoading(false);
      return;
    }

    if (aliasesResposta.error) {
      setErro(
        `Não foi possível carregar os nomes alternativos: ${aliasesResposta.error.message}`,
      );
      setLoading(false);
      return;
    }

    setMcs(mcsResposta.data ?? []);
    setNomesAlternativos(aliasesResposta.data ?? []);
    setSelecionados([
      ...new Set([...selecaoGravada, ...selecaoLocal]),
    ]);
    setLoading(false);
  }

  const aliasesPorMC = useMemo(() => {
    const resultado = new Map<string, NomeAlternativo[]>();

    for (const alias of nomesAlternativos) {
      const atuais = resultado.get(alias.mc_id) ?? [];
      atuais.push(alias);
      resultado.set(alias.mc_id, atuais);
    }

    return resultado;
  }, [nomesAlternativos]);

  const mcsFiltrados = useMemo(() => {
    const termo = normalizarTexto(pesquisa);
    if (!termo) return mcs;

    return mcs.filter((mc) => {
      const localizacao = `${mc.cidade ?? ""} ${mc.distrito ?? ""}`;
      const aliases = (aliasesPorMC.get(mc.id) ?? [])
        .map((alias) => alias.nome_alternativo)
        .join(" ");

      return normalizarTexto(
        `${mc.nome_artistico} ${localizacao} ${aliases}`,
      ).includes(termo);
    });
  }, [aliasesPorMC, mcs, pesquisa]);

  function nomeJaExiste(nome: string, ignorarMcId?: string) {
    const nomeNormalizado = normalizarTexto(nome);

    const existeComoOficial = mcs.some(
      (mc) =>
        mc.id !== ignorarMcId &&
        normalizarTexto(mc.nome_artistico) === nomeNormalizado,
    );

    const existeComoAlias = nomesAlternativos.some(
      (alias) =>
        alias.mc_id !== ignorarMcId &&
        normalizarTexto(alias.nome_alternativo) === nomeNormalizado,
    );

    return existeComoOficial || existeComoAlias;
  }

  function selecionarMC(id: string) {
    setSelecionados((atuais) => {
      const seguintes = atuais.includes(id)
        ? atuais.filter((mcId) => mcId !== id)
        : [...atuais, id];

      const edicaoId = localStorage.getItem("edicaoId");

      if (edicaoId) {
        localStorage.setItem(
          `participantesSelecionados:${edicaoId}`,
          JSON.stringify(seguintes),
        );
      }

      return seguintes;
    });
  }

  async function registarMC(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    const nomeLimpo = nomeArtistico.trim();
    const aliases = separarNomesAlternativos(aliasesNovoMC).filter(
      (alias) =>
        normalizarTexto(alias) !== normalizarTexto(nomeLimpo),
    );

    if (!nomeLimpo) {
      setErro("Escreve o nome artístico do MC.");
      return;
    }

    if (nomeJaExiste(nomeLimpo)) {
      setErro("Este nome já pertence a um MC registado.");
      return;
    }

    const aliasDuplicado = aliases.find((alias) =>
      nomeJaExiste(alias),
    );

    if (aliasDuplicado) {
      setErro(
        `O nome alternativo “${aliasDuplicado}” já está registado.`,
      );
      return;
    }

    setAGuardarMC(true);

    const { data: novoMC, error: erroMC } = await supabase
      .from("mcs")
      .insert({
        nome_artistico: nomeLimpo,
        cidade: cidade.trim() || null,
        distrito: distrito.trim() || null,
        ativo: true,
        por_confirmar: true,
      })
      .select("id,nome_artistico,cidade,distrito,por_confirmar")
      .single();

    if (erroMC || !novoMC) {
      setErro(
        `Não foi possível registar o MC: ${erroMC?.message ?? "erro"}`,
      );
      setAGuardarMC(false);
      return;
    }

    if (aliases.length > 0) {
      const { error: erroAliases } = await supabase
        .from("mc_nomes_alternativos")
        .insert(
          aliases.map((alias) => ({
            mc_id: novoMC.id,
            nome_alternativo: alias,
          })),
        );

      if (erroAliases) {
        setErro(
          `O MC foi registado, mas os nomes alternativos não foram guardados: ${erroAliases.message}`,
        );
        setAGuardarMC(false);
        await carregarDados();
        return;
      }
    }

    const edicaoId = localStorage.getItem("edicaoId");

    if (edicaoId) {
      const chave = `participantesSelecionados:${edicaoId}`;
      const guardados = localStorage.getItem(chave);
      let ids: string[] = [];

      try {
        const valor = JSON.parse(guardados ?? "[]");

        if (Array.isArray(valor)) {
          ids = valor.filter(
            (item): item is string => typeof item === "string",
          );
        }
      } catch {
        ids = [];
      }

      localStorage.setItem(
        chave,
        JSON.stringify([...new Set([...ids, novoMC.id])]),
      );
    }

    setNomeArtistico("");
    setCidade("");
    setDistrito("");
    setAliasesNovoMC("");
    setMostrarNovoMC(false);
    setAGuardarMC(false);

    await carregarDados();
  }

  async function adicionarAlias(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    const aliasLimpo = novoAlias.trim();

    if (!mcParaAlias || !aliasLimpo) {
      setErro("Seleciona o MC e escreve o nome alternativo.");
      return;
    }

    const mc = mcs.find((item) => item.id === mcParaAlias);

    if (!mc) {
      setErro("O MC selecionado não foi encontrado.");
      return;
    }

    if (
      normalizarTexto(mc.nome_artistico) ===
      normalizarTexto(aliasLimpo)
    ) {
      setErro(
        "O nome alternativo é igual ao nome artístico oficial.",
      );
      return;
    }

    if (nomeJaExiste(aliasLimpo, mcParaAlias)) {
      setErro("Este nome alternativo já pertence a outro MC.");
      return;
    }

    const repetidoNoMesmoMC = (
      aliasesPorMC.get(mcParaAlias) ?? []
    ).some(
      (alias) =>
        normalizarTexto(alias.nome_alternativo) ===
        normalizarTexto(aliasLimpo),
    );

    if (repetidoNoMesmoMC) {
      setErro("Este MC já possui esse nome alternativo.");
      return;
    }

    setAGuardarAlias(true);

    const { data, error } = await supabase
      .from("mc_nomes_alternativos")
      .insert({
        mc_id: mcParaAlias,
        nome_alternativo: aliasLimpo,
      })
      .select("id,mc_id,nome_alternativo")
      .single();

    if (error || !data) {
      setErro(
        `Não foi possível guardar o nome alternativo: ${
          error?.message ?? "erro"
        }`,
      );
      setAGuardarAlias(false);
      return;
    }

    setNomesAlternativos((atuais) => [...atuais, data]);
    setNovoAlias("");
    setAGuardarAlias(false);
  }

  async function eliminarAlias(alias: NomeAlternativo) {
    const confirmado = window.confirm(
      `Remover o nome alternativo “${alias.nome_alternativo}”?`,
    );

    if (!confirmado) return;

    setErro("");
    setAliasAEliminar(alias.id);

    const { error } = await supabase
      .from("mc_nomes_alternativos")
      .delete()
      .eq("id", alias.id);

    if (error) {
      setErro(
        `Não foi possível remover o nome alternativo: ${error.message}`,
      );
      setAliasAEliminar(null);
      return;
    }

    setNomesAlternativos((atuais) =>
      atuais.filter((item) => item.id !== alias.id),
    );
    setAliasAEliminar(null);
  }

  function continuar() {
    const edicaoId = localStorage.getItem("edicaoId");

    if (!edicaoId) {
      setErro("Seleciona uma edição antes de continuar.");
      return;
    }

    localStorage.setItem(
      `participantesSelecionados:${edicaoId}`,
      JSON.stringify(selecionados),
    );

    window.location.href = "/organizacao/apontamentos";
  }

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

      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/organizacao"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AO PAINEL
        </Link>

        <header className="mt-10">
          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 break-words text-4xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl md:text-6xl">
            PARTICIPANTES
          </h1>

          <p className="mt-3 text-sm text-zinc-200 sm:text-base">
            Seleciona os MCs que vão participar nesta edição.
          </p>
        </header>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMostrarNovoMC((atual) => !atual)}
            className="rounded-xl bg-yellow-500 px-5 py-4 text-sm font-black text-black transition hover:bg-yellow-400 sm:text-base"
          >
            {mostrarNovoMC
              ? "FECHAR REGISTO"
              : "+ ADICIONAR MC SEM REGISTO"}
          </button>

          <a
            href="#nomes-alternativos"
            className="rounded-xl border border-yellow-500 bg-black/90 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-yellow-500 hover:text-black sm:text-base"
          >
            GERIR NOMES ALTERNATIVOS
          </a>
        </div>

        {mostrarNovoMC && (
          <form
            onSubmit={registarMC}
            className="mt-6 rounded-2xl border border-yellow-500/60 bg-black/90 p-5 sm:p-6"
          >
            <h2 className="text-2xl font-black text-yellow-500">
              ADICIONAR MC SEM REGISTO
            </h2>

            <p className="mt-3 text-sm text-zinc-300">
              Podes continuar a edição. O MC fica identificado como «sem
              registo» até o organizador geral confirmar os seus dados.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="novo-nome-artistico"
                  className="mb-2 block text-sm font-black"
                >
                  NOME ARTÍSTICO OFICIAL
                </label>

                <input
                  id="novo-nome-artistico"
                  value={nomeArtistico}
                  onChange={(evento) =>
                    setNomeArtistico(evento.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                  placeholder="Ex.: Supremo CDC"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="nova-cidade"
                  className="mb-2 block text-sm font-black"
                >
                  CIDADE
                </label>

                <input
                  id="nova-cidade"
                  value={cidade}
                  onChange={(evento) => setCidade(evento.target.value)}
                  className="w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                  placeholder="Ex.: Almada"
                />
              </div>

              <div>
                <label
                  htmlFor="novo-distrito"
                  className="mb-2 block text-sm font-black"
                >
                  DISTRITO
                </label>

                <input
                  id="novo-distrito"
                  value={distrito}
                  onChange={(evento) =>
                    setDistrito(evento.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                  placeholder="Ex.: Setúbal"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="novos-aliases"
                  className="mb-2 block text-sm font-black"
                >
                  NOMES ALTERNATIVOS
                </label>

                <textarea
                  id="novos-aliases"
                  value={aliasesNovoMC}
                  onChange={(evento) =>
                    setAliasesNovoMC(evento.target.value)
                  }
                  className="min-h-24 w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                  placeholder="Ex.: Supremo, Supremo CDC Portugal"
                />

                <p className="mt-2 text-xs text-zinc-300">
                  Separa vários nomes com vírgulas ou escreve um por
                  linha.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={aGuardarMC}
              className="mt-6 w-full rounded-xl bg-yellow-500 px-5 py-4 font-black text-black transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {aGuardarMC
                ? "A GUARDAR..."
                : "ADICIONAR E SELECIONAR MC"}
            </button>
          </form>
        )}

        {erro && (
          <div
            role="alert"
            className="mt-6 whitespace-pre-line rounded-xl border border-red-800 bg-black/90 p-4 font-bold text-red-300"
          >
            {erro}
          </div>
        )}

        <div className="mt-10">
          <label htmlFor="pesquisar-participantes" className="sr-only">
            Pesquisar participantes
          </label>

          <input
            id="pesquisar-participantes"
            type="search"
            value={pesquisa}
            onChange={(evento) => setPesquisa(evento.target.value)}
            placeholder="Pesquisar por nome, nome alternativo, cidade ou distrito"
            className="w-full rounded-xl border border-zinc-600 bg-black/90 px-5 py-4 text-white outline-none placeholder:text-zinc-400 focus:border-yellow-500"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-600 pb-4 text-sm sm:text-base">
          <span className="font-black">MCs DISPONÍVEIS</span>
          <span className="font-black text-yellow-500">
            {selecionados.length} SELECIONADOS
          </span>
        </div>

        {loading ? (
          <p className="mt-10 rounded-xl bg-black/90 p-5 text-zinc-200">
            A carregar MCs...
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {mcsFiltrados.map((mc) => {
              const ativo = selecionados.includes(mc.id);
              const aliases = aliasesPorMC.get(mc.id) ?? [];

              return (
                <button
                  type="button"
                  key={mc.id}
                  onClick={() => selecionarMC(mc.id)}
                  aria-pressed={ativo}
                  className={`w-full rounded-xl border px-5 py-4 text-left transition ${
                    ativo
                      ? "border-yellow-500 bg-yellow-500 text-black"
                      : "border-zinc-700 bg-black/90 text-white hover:border-yellow-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="break-words text-lg font-black">
                        {mc.nome_artistico}
                        {mc.por_confirmar ? " (sem registo)" : ""}
                      </p>

                      <p
                        className={`mt-1 text-sm ${
                          ativo ? "text-black/80" : "text-zinc-300"
                        }`}
                      >
                        {[mc.cidade, mc.distrito]
                          .filter(Boolean)
                          .join(" · ") || "Localização não indicada"}
                      </p>

                      {aliases.length > 0 && (
                        <p
                          className={`mt-2 break-words text-xs ${
                            ativo ? "text-black/80" : "text-zinc-300"
                          }`}
                        >
                          Também reconhecido como:{" "}
                          {aliases
                            .map((alias) => alias.nome_alternativo)
                            .join(", ")}
                        </p>
                      )}
                    </div>

                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xl font-black"
                    >
                      {ativo ? "✓" : "+"}
                    </span>
                  </div>
                </button>
              );
            })}

            {mcsFiltrados.length === 0 && (
              <p className="rounded-xl border border-zinc-700 bg-black/90 p-5 text-zinc-300">
                Não foram encontrados MCs com esta pesquisa.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={loading || selecionados.length === 0}
          onClick={continuar}
          className="mt-8 w-full rounded-xl bg-yellow-500 px-5 py-4 font-black text-black transition hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-400"
        >
          CONTINUAR COM {selecionados.length} MCs
        </button>

        <section
          id="nomes-alternativos"
          className="mt-16 rounded-2xl border border-zinc-700 bg-black/90 p-5 sm:p-6"
        >
          <p className="text-xs font-black tracking-[0.25em] text-yellow-500">
            NOMES ALTERNATIVOS
          </p>

          <h2 className="mt-2 text-3xl font-black">GERIR NOMES</h2>

          <p className="mt-2 text-sm text-zinc-300">
            Liga outras formas de escrever o nome ao perfil oficial do
            MC.
          </p>

          <form
            onSubmit={adicionarAlias}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <label htmlFor="mc-alias" className="sr-only">
              Selecionar MC oficial
            </label>

            <select
              id="mc-alias"
              value={mcParaAlias}
              onChange={(evento) =>
                setMcParaAlias(evento.target.value)
              }
              className="min-w-0 rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-4 text-white outline-none focus:border-yellow-500"
              required
            >
              <option value="">Selecionar MC oficial</option>

              {mcs.map((mc) => (
                <option key={mc.id} value={mc.id}>
                  {mc.nome_artistico}
                </option>
              ))}
            </select>

            <label htmlFor="novo-alias" className="sr-only">
              Novo nome alternativo
            </label>

            <input
              id="novo-alias"
              value={novoAlias}
              onChange={(evento) => setNovoAlias(evento.target.value)}
              className="min-w-0 rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
              placeholder="Novo nome alternativo"
              required
            />

            <button
              type="submit"
              disabled={aGuardarAlias}
              className="rounded-xl bg-yellow-500 px-5 py-4 font-black text-black transition hover:bg-yellow-400 disabled:opacity-50 sm:col-span-2"
            >
              {aGuardarAlias
                ? "A GUARDAR..."
                : "ADICIONAR NOME ALTERNATIVO"}
            </button>
          </form>

          {mcParaAlias && (
            <div className="mt-6">
              <p className="text-sm font-black text-zinc-300">
                NOMES ASSOCIADOS
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(aliasesPorMC.get(mcParaAlias) ?? []).map(
                  (alias) => (
                    <div
                      key={alias.id}
                      className="flex max-w-full items-center gap-3 rounded-full border border-zinc-600 bg-zinc-950 px-4 py-2"
                    >
                      <span className="min-w-0 break-words text-sm font-bold">
                        {alias.nome_alternativo}
                      </span>

                      <button
                        type="button"
                        onClick={() => eliminarAlias(alias)}
                        disabled={aliasAEliminar === alias.id}
                        className="shrink-0 font-black text-red-400 disabled:opacity-50"
                        aria-label={`Remover ${alias.nome_alternativo}`}
                      >
                        ×
                      </button>
                    </div>
                  ),
                )}

                {(aliasesPorMC.get(mcParaAlias) ?? []).length ===
                  0 && (
                  <p className="text-sm text-zinc-300">
                    Este MC ainda não possui nomes alternativos.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}