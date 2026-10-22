
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { boldIMIP, veneerIMIP } from "../../fonts/identidade";
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
    <main className="relative min-h-screen min-w-0 text-[#f0e6d1]">
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        {/* NAVEGAÇÃO */}
        <nav
          aria-label="Navegação da página"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/organizacao"
            className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 bg-[#080a09]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#f0d58e] transition hover:border-[#f0d58e] hover:bg-[#122b1d]"
          >
            ← VOLTAR AO PAINEL
          </Link>
          <span className="border-l-4 border-[#b82535] bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#f0e6d1] sm:text-xs">
            IMIP · GESTÃO DE PARTICIPANTES
          </span>
        </nav>

        {/* CARTAZ DE ABERTURA */}
        <header className="mt-6 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95">
          <div aria-hidden="true" className="flex h-[5px] w-full">
            <span className="w-[43%] bg-[#087a43]" />
            <span className="w-[14%] bg-[#d6b56d]" />
            <span className="flex-1 bg-[#b82535]" />
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="relative min-w-0 overflow-hidden px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">
                <p className="imip-etiqueta">
                  ORGANIZAÇÃO · MCs · IDENTIDADE
                </p>

                <h1
                  className={`${boldIMIP.className} mt-6 text-[clamp(1.8rem,3.4vw,3.6rem)] font-bold uppercase leading-[1.1] tracking-[-0.025em] text-[#f0e6d1] [overflow-wrap:anywhere]`}
                >
                  PARTICIPANTES
                  <span className="text-[#b82535]">.</span>
                </h1>

                <div
                  aria-hidden="true"
                  className="mt-7 flex h-[5px] w-44 max-w-full"
                >
                  <span className="w-[43%] bg-[#087a43]" />
                  <span className="w-[14%] bg-[#d6b56d]" />
                  <span className="flex-1 bg-[#b82535]" />
                </div>

                <p className="mt-7 text-lg font-bold leading-relaxed text-[#f0e6d1]">
                  Cada MC tem um nome. Cada nome tem uma história.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Seleciona quem participa nesta edição, regista MCs
                  ainda sem perfil confirmado e associa os nomes
                  alternativos ao nome oficial.
                </p>

                <div className="mt-8 border-l-4 border-[#d6b56d] bg-black/25 px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#d6b56d]">
                    SELEÇÃO DA EDIÇÃO
                  </p>

                  <p
                    className={`${veneerIMIP.className} mt-3 text-2xl font-normal uppercase leading-tight text-[#f0e6d1] sm:text-3xl`}
                  >
                    A RUA TEM VOZ.
                    <span className="block text-[#d6b56d]">
                      O REGISTO TEM NOME.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-6 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  O CIRCUITO COMEÇA NOS MCs
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <h2
                  className={`${boldIMIP.className} mt-7 text-[clamp(2.2rem,3vw,3.4rem)] font-bold uppercase leading-[1.08]`}
                >
                  TODOS
                  <span className="block text-[#b82535]">
                    CONTAM.
                  </span>
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-[#394239]">
                  Pesquisa os MCs pelo nome, localização ou nome
                  alternativo e seleciona os participantes da edição.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="border-l-4 border-[#087a43] bg-[#f8f2e5] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#a82636]">
                      MCs DISPONÍVEIS
                    </p>
                    <p
                      className={`${boldIMIP.className} mt-3 text-4xl font-bold leading-none tabular-nums`}
                    >
                      {loading ? "—" : mcs.length}
                    </p>
                  </div>

                  <div className="border-l-4 border-[#b82535] bg-[#f8f2e5] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#a82636]">
                      SELECIONADOS
                    </p>
                    <p
                      className={`${boldIMIP.className} mt-3 text-4xl font-bold leading-none tabular-nums`}
                    >
                      {selecionados.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-9 border-t-4 border-[#101713] pt-4">
                <p className="text-xs font-black uppercase tracking-[0.06em]">
                  A IDENTIDADE IMPORTA.
                </p>

                <p
                  className={`${veneerIMIP.className} mt-3 text-xl font-normal uppercase text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* AÇÕES RÁPIDAS */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMostrarNovoMC((atual) => !atual)}
            aria-expanded={mostrarNovoMC}
            aria-controls="formulario-novo-mc"
            className="min-h-12 border border-[#d6b56d] bg-[#d6b56d] px-5 py-4 text-center text-xs font-black uppercase tracking-[0.05em] text-[#101713] transition hover:bg-[#f0d58e]"
          >
            {mostrarNovoMC
              ? "FECHAR REGISTO"
              : "+ ADICIONAR MC SEM REGISTO"}
          </button>

          <a
            href="#nomes-alternativos"
            className="flex min-h-12 items-center justify-center border border-[#d6b56d] bg-[#0a110d]/95 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#14251a]"
          >
            GERIR NOMES ALTERNATIVOS ↘
          </a>
        </div>

        {/* REGISTAR MC SEM REGISTO */}
        {mostrarNovoMC && (
          <form
            id="formulario-novo-mc"
            onSubmit={registarMC}
            className="mt-6 overflow-hidden border border-[#d6b56d]/50 bg-[#0a110d]/95"
          >
            <div aria-hidden="true" className="flex h-[5px]">
              <span className="w-[43%] bg-[#087a43]" />
              <span className="w-[14%] bg-[#d6b56d]" />
              <span className="flex-1 bg-[#b82535]" />
            </div>

            <div className="p-5 sm:p-8">
              <p className="imip-etiqueta">
                NOVO PARTICIPANTE · IDENTIDADE
              </p>

              <h2
                className={`${boldIMIP.className} mt-3 text-2xl font-bold uppercase leading-tight text-[#f0e6d1] sm:text-3xl`}
              >
                ADICIONAR{" "}
                <span className="text-[#d6b56d]">
                  MC SEM REGISTO.
                </span>
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#d2d9d0]">
                Podes continuar a edição. O MC fica identificado
                como «sem registo» até o organizador geral
                confirmar os seus dados.
              </p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="novo-nome-artistico"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
                  >
                    NOME ARTÍSTICO OFICIAL
                  </label>

                  <input
                    id="novo-nome-artistico"
                    value={nomeArtistico}
                    onChange={(evento) =>
                      setNomeArtistico(evento.target.value)
                    }
                    className="min-h-12 w-full border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e]"
                    placeholder="Ex.: Supremo CDC"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="nova-cidade"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
                  >
                    CIDADE
                  </label>

                  <input
                    id="nova-cidade"
                    value={cidade}
                    onChange={(evento) =>
                      setCidade(evento.target.value)
                    }
                    className="min-h-12 w-full border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e]"
                    placeholder="Ex.: Almada"
                  />
                </div>

                <div>
                  <label
                    htmlFor="novo-distrito"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
                  >
                    DISTRITO
                  </label>

                  <input
                    id="novo-distrito"
                    value={distrito}
                    onChange={(evento) =>
                      setDistrito(evento.target.value)
                    }
                    className="min-h-12 w-full border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e]"
                    placeholder="Ex.: Setúbal"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="novos-aliases"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
                  >
                    NOMES ALTERNATIVOS
                  </label>

                  <textarea
                    id="novos-aliases"
                    value={aliasesNovoMC}
                    onChange={(evento) =>
                      setAliasesNovoMC(evento.target.value)
                    }
                    className="min-h-28 w-full resize-y border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e]"
                    placeholder="Ex.: Supremo, Supremo CDC Portugal"
                  />

                  <p className="mt-2 text-xs leading-relaxed text-[#d2d9d0]">
                    Separa vários nomes com vírgulas ou escreve um por
                    linha.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={aGuardarMC}
                className="mt-7 min-h-12 w-full bg-[#d6b56d] px-5 py-4 text-xs font-black uppercase text-[#101713] transition hover:bg-[#f0d58e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aGuardarMC
                  ? "A GUARDAR..."
                  : "ADICIONAR E SELECIONAR MC"}
              </button>
            </div>
          </form>
        )}

        {/* AVISOS E ERROS */}
        {erro && (
          <div
            role="alert"
            className="mt-6 whitespace-pre-line border-l-4 border-[#b82535] bg-[#0a110d]/95 px-5 py-5 text-sm font-bold leading-relaxed text-red-200"
          >
            {erro}
          </div>
        )}

        {/* PESQUISA E SELEÇÃO */}
        <section
          aria-labelledby="titulo-selecao"
          className="mt-10"
        >
          <p className="imip-etiqueta">
            SELEÇÃO DA EDIÇÃO
          </p>

          <h2
            id="titulo-selecao"
            className={`${boldIMIP.className} mt-3 text-[clamp(1.9rem,3.5vw,3.8rem)] font-bold uppercase leading-[1.1]`}
          >
            ESCOLHE OS{" "}
            <span className="text-[#d6b56d]">
              MCs.
            </span>
          </h2>

          <div className="mt-6 border border-[#d6b56d]/40 bg-[#0a110d]/95 p-4 sm:p-6">
            <label
              htmlFor="pesquisar-participantes"
              className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
            >
              PESQUISAR MCs
            </label>

            <input
              id="pesquisar-participantes"
              type="search"
              value={pesquisa}
              onChange={(evento) =>
                setPesquisa(evento.target.value)
              }
              placeholder="Pesquisar por nome, nome alternativo, cidade ou distrito"
              className="min-h-12 w-full border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e]"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#d6b56d]/35 pb-4">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-[#f0e6d1]">
              MCs DISPONÍVEIS
            </span>

            <span className="text-xs font-black uppercase tracking-[0.08em] text-[#d6b56d]">
              {selecionados.length} SELECIONADOS
            </span>
          </div>

          {loading ? (
            <div
              role="status"
              className="mt-5 border border-[#d6b56d]/35 bg-[#0a110d]/95 p-6 text-sm text-[#d2d9d0]"
            >
              A carregar MCs...
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {mcsFiltrados.map((mc) => {
                const ativo = selecionados.includes(mc.id);
                const aliases = aliasesPorMC.get(mc.id) ?? [];

                return (
                  <button
                    type="button"
                    key={mc.id}
                    onClick={() => selecionarMC(mc.id)}
                    aria-pressed={ativo}
                    className={`relative w-full min-w-0 border p-5 text-left transition-colors ${
                      ativo
                        ? "border-[#d6b56d] bg-[#d6b56d] text-[#101713]"
                        : "border-[#d6b56d]/35 bg-[#0a110d]/95 text-[#f0e6d1] hover:border-[#f0d58e] hover:bg-[#14251a]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-0 h-1 w-20 ${
                        ativo ? "bg-[#087a43]" : "bg-[#b82535]"
                      }`}
                    />

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="break-words text-lg font-black uppercase leading-tight">
                          {mc.nome_artistico}
                        </p>

                        {mc.por_confirmar && (
                          <p
                            className={`mt-2 text-[10px] font-black uppercase tracking-[0.05em] ${
                              ativo
                                ? "text-[#842333]"
                                : "text-[#f0d58e]"
                            }`}
                          >
                            SEM REGISTO
                          </p>
                        )}

                        <p
                          className={`mt-2 text-xs leading-relaxed ${
                            ativo
                              ? "text-[#394239]"
                              : "text-[#c7cdc5]"
                          }`}
                        >
                          {[mc.cidade, mc.distrito]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Localização não indicada"}
                        </p>

                        {aliases.length > 0 && (
                          <p
                            className={`mt-2 break-words text-xs leading-relaxed ${
                              ativo
                                ? "text-[#394239]"
                                : "text-[#c7cdc5]"
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
                        className="shrink-0 text-2xl font-black"
                      >
                        {ativo ? "✓" : "+"}
                      </span>
                    </div>
                  </button>
                );
              })}

              {mcsFiltrados.length === 0 && (
                <p className="border border-[#d6b56d]/35 bg-[#0a110d]/95 p-6 text-sm text-[#d2d9d0] lg:col-span-2">
                  Não foram encontrados MCs com esta pesquisa.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={loading || selecionados.length === 0}
            onClick={continuar}
            className="mt-7 min-h-12 w-full bg-[#d6b56d] px-5 py-4 text-sm font-black uppercase tracking-[0.05em] text-[#101713] transition hover:bg-[#f0d58e] disabled:cursor-not-allowed disabled:bg-[#465049] disabled:text-[#c5c8c0]"
          >
            CONTINUAR COM {selecionados.length} MCs ↗
          </button>
        </section>

        {/* NOMES ALTERNATIVOS */}
        <section
          id="nomes-alternativos"
          aria-labelledby="titulo-aliases"
          className="mt-14 scroll-mt-6 overflow-hidden border border-[#d6b56d]/45 bg-[#0a110d]/95"
        >
          <div aria-hidden="true" className="flex h-[5px]">
            <span className="w-[43%] bg-[#087a43]" />
            <span className="w-[14%] bg-[#d6b56d]" />
            <span className="flex-1 bg-[#b82535]" />
          </div>

          <div className="p-5 sm:p-8">
            <p className="imip-etiqueta">
              IDENTIDADE · NOMES ALTERNATIVOS
            </p>

            <h2
              id="titulo-aliases"
              className={`${boldIMIP.className} mt-3 text-[clamp(1.9rem,3.2vw,3.5rem)] font-bold uppercase leading-[1.1]`}
            >
              GERIR{" "}
              <span className="text-[#d6b56d]">
                NOMES.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-[#d2d9d0]">
              Liga outras formas de escrever o nome ao perfil
              oficial do MC.
            </p>

            <form
              onSubmit={adicionarAlias}
              className="mt-7 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="mc-alias"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
                >
                  MC OFICIAL
                </label>

                <select
                  id="mc-alias"
                  value={mcParaAlias}
                  onChange={(evento) =>
                    setMcParaAlias(evento.target.value)
                  }
                  className="min-h-12 w-full min-w-0 border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none focus:border-[#f0d58e]"
                  required
                >
                  <option value="">
                    Selecionar MC oficial
                  </option>

                  {mcs.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.nome_artistico}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="novo-alias"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]"
                >
                  NOVO NOME ALTERNATIVO
                </label>

                <input
                  id="novo-alias"
                  value={novoAlias}
                  onChange={(evento) =>
                    setNovoAlias(evento.target.value)
                  }
                  className="min-h-12 w-full min-w-0 border border-[#d6b56d]/45 bg-[#152119] px-4 py-3 text-sm text-white outline-none placeholder:text-[#a7ada6] focus:border-[#f0d58e]"
                  placeholder="Novo nome alternativo"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={aGuardarAlias}
                className="min-h-12 bg-[#d6b56d] px-5 py-4 text-xs font-black uppercase tracking-[0.05em] text-[#101713] transition hover:bg-[#f0d58e] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
              >
                {aGuardarAlias
                  ? "A GUARDAR..."
                  : "ADICIONAR NOME ALTERNATIVO"}
              </button>
            </form>

            {mcParaAlias && (
              <div className="mt-8 border-t border-[#d6b56d]/25 pt-6">
                <p className="text-xs font-black uppercase tracking-[0.06em] text-[#d6b56d]">
                  NOMES ASSOCIADOS
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {(aliasesPorMC.get(mcParaAlias) ?? []).map(
                    (alias) => (
                      <div
                        key={alias.id}
                        className="flex max-w-full items-center gap-3 border border-[#d6b56d]/40 bg-[#152119] px-4 py-2"
                      >
                        <span className="min-w-0 break-words text-sm font-bold text-[#f0e6d1]">
                          {alias.nome_alternativo}
                        </span>

                        <button
                          type="button"
                          onClick={() => eliminarAlias(alias)}
                          disabled={aliasAEliminar === alias.id}
                          className="shrink-0 text-xl font-black text-red-300 transition hover:text-red-100 disabled:opacity-50"
                          aria-label={`Remover ${alias.nome_alternativo}`}
                        >
                          ×
                        </button>
                      </div>
                    ),
                  )}

                  {(aliasesPorMC.get(mcParaAlias) ?? []).length ===
                    0 && (
                    <p className="text-sm text-[#d2d9d0]">
                      Este MC ainda não possui nomes alternativos.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-14 border-t border-[#d6b56d]/35 pt-8 text-center">
          <p
            className={`${veneerIMIP.className} text-xl font-normal uppercase tracking-[0.04em] text-[#d6b56d] sm:text-2xl`}
          >
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ded8ca]">
            NACIONAL DE RUA · IMIP · IMPROVISO MADE IN PORTUGAL
          </p>
        </footer>
      </div>
    </main>
  );
}
