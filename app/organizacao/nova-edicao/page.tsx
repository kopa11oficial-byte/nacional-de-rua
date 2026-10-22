
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { boldIMIP, veneerIMIP } from "../../fonts/identidade";
import { supabase } from "@/lib/supabase";

/*
  ==================================================
  NACIONAL DE RUA — IMIP
  REGISTAR NOVA EDIÇÃO

  IDENTIDADE VISUAL:
  Bold — títulos
  Veneer — frases de impacto
  Geist — formulários e informações

  FUNCIONALIDADES PRESERVADAS:
  - Autenticação
  - Verificação de administrador geral
  - Organização associada à conta
  - Consulta das organizações e rodas ativas
  - Seleção da época ativa
  - Validação dos campos
  - Validação do ano e da data da edição
  - Validação de temporada e número de edição
  - Formatos originais do formulário
  - Inserção da edição em rascunho
  - Registo local da edição
  - Encaminhamento para apontamentos

  Nenhuma alteração às regras de pontuação.
  Nenhuma alteração ao esquema do Supabase.
  ==================================================
*/

type Organizacao = {
  id: string;
  nome: string;
};

type Roda = {
  id: string;
  nome: string;
  organizacao_id: string;
};

type Epoca = {
  id: string;
  nome: string;
  ano: number;
};

const FORMATOS = [
  { valor: "normal", nome: "NORMAL" },
  { valor: "wildcards", nome: "WILDCARDS" },
  { valor: "lado_a_vs_lado_b", nome: "LADO A VS LADO B" },
  { valor: "megatron", nome: "MEGATRON" },
  { valor: "megazord", nome: "MEGAZORD" },
];

const campo =
  "mt-2 min-h-12 w-full min-w-0 border border-[#101713]/35 bg-white px-4 py-3 text-sm text-[#101713] outline-none transition placeholder:text-[#697269] focus:border-[#087a43] focus:ring-2 focus:ring-[#087a43]/20";

const etiqueta =
  "block border-l-4 border-[#087a43] pl-3 text-xs font-black uppercase tracking-[0.08em] text-[#101713]";

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

export default function NovaEdicaoPage() {
  const router = useRouter();

  const [organizacao, setOrganizacao] =
    useState<Organizacao | null>(null);

  const [organizacoes, setOrganizacoes] =
    useState<Organizacao[]>([]);

  const [administrador, setAdministrador] =
    useState(false);

  const [rodas, setRodas] =
    useState<Roda[]>([]);

  const [epoca, setEpoca] =
    useState<Epoca | null>(null);

  const [rodaId, setRodaId] =
    useState("");

  const [nome, setNome] =
    useState("");

  const [numeroTemporada, setNumeroTemporada] =
    useState("");

  const [numeroEdicao, setNumeroEdicao] =
    useState("");

  const [dataEdicao, setDataEdicao] =
    useState("");

  const [formato, setFormato] =
    useState("normal");

  const [loading, setLoading] =
    useState(true);

  const [aGuardar, setAGuardar] =
    useState(false);

  const [erro, setErro] =
    useState("");

  /*
    ============================================
    CARREGAR ORGANIZAÇÃO, RODAS E ÉPOCA

    Consultas e permissões preservadas.
    ============================================
  */

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setLoading(true);
      setErro("");

      try {
        const {
          data: { user },
          error: erroAuth,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (erroAuth || !user) {
          setErro(
            "Tens de iniciar sessão para registar uma edição.",
          );
          return;
        }

        const {
          data: acesso,
          error: erroAcesso,
        } = await supabase.rpc(
          "e_administrador",
        );

        if (!ativo) return;

        if (erroAcesso) {
          setErro(
            "Não foi possível verificar as permissões desta conta.",
          );
          return;
        }

        const acessoGeral = acesso === true;

        setAdministrador(acessoGeral);

        const {
          data: org,
          error: orgError,
        } = await supabase
          .from("organizacoes")
          .select("id,nome")
          .eq("auth_user_id", user.id)
          .eq("ativa", true)
          .single();

        if (!ativo) return;

        if (orgError || !org) {
          console.error(
            "Erro ao carregar organização:",
            orgError,
          );

          setErro(
            "Organização não encontrada.",
          );

          return;
        }

        setOrganizacao(org);

        let idsOrganizacoes = [org.id];

        if (acessoGeral) {
          const {
            data: todas,
            error: erroTodas,
          } = await supabase
            .from("organizacoes")
            .select("id,nome")
            .eq("ativa", true)
            .order("nome");

          if (!ativo) return;

          if (erroTodas) {
            setErro(
              "Não foi possível carregar as organizações.",
            );

            return;
          }

          setOrganizacoes(todas ?? []);

          idsOrganizacoes = (
            todas ?? []
          ).map((item) => item.id);
        }

        const {
          data: rodasData,
          error: rodasError,
        } = await supabase
          .from("rodas")
          .select(
            "id,nome,organizacao_id",
          )
          .in(
            "organizacao_id",
            idsOrganizacoes,
          )
          .eq("ativa", true)
          .order("nome");

        if (!ativo) return;

        if (rodasError) {
          console.error(
            "Erro ao carregar rodas:",
            rodasError,
          );

          setErro(
            "Não foi possível carregar as rodas.",
          );

          return;
        }

        const rodasEncontradas =
          rodasData ?? [];

        setRodas(rodasEncontradas);

        if (rodasEncontradas.length === 1) {
          setRodaId(
            rodasEncontradas[0].id,
          );
        }

        const {
          data: epocaData,
          error: epocaError,
        } = await supabase
          .from("epocas")
          .select("id,nome,ano")
          .eq("estado", "ativa")
          .order("ano", {
            ascending: false,
          })
          .limit(1)
          .single();

        if (!ativo) return;

        if (epocaError || !epocaData) {
          console.error(
            "Erro ao carregar época:",
            epocaError,
          );

          setErro(
            "Não foi encontrada uma época ativa.",
          );

          return;
        }

        setEpoca(epocaData);
      } catch (falha) {
        if (ativo) {
          console.error(
            "Erro ao carregar dados:",
            falha,
          );

          setErro(
            "Não foi possível carregar os dados. Tenta novamente.",
          );
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  /*
    ============================================
    REGISTAR EDIÇÃO

    Preservamos as validações e os
    campos enviados ao Supabase.
    ============================================
  */

  async function registarEdicao(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    setErro("");

    if (
      !organizacao ||
      !epoca ||
      !rodaId ||
      !nome.trim() ||
      !numeroTemporada ||
      !numeroEdicao ||
      !dataEdicao ||
      !formato
    ) {
      setErro(
        "Preenche todos os campos obrigatórios.",
      );
      return;
    }

    const rodaSelecionada = rodas.find(
      (roda) => roda.id === rodaId,
    );

    if (
      !rodaSelecionada ||
      (!administrador &&
        rodaSelecionada.organizacao_id !==
          organizacao.id)
    ) {
      setErro(
        "Seleciona uma roda válida.",
      );
      return;
    }

    const anoDaEdicao = Number(
      dataEdicao.slice(0, 4),
    );

    if (anoDaEdicao !== epoca.ano) {
      setErro(
        `A data é de ${anoDaEdicao}, mas a época ativa é ${epoca.ano}. ` +
          "Não é possível guardar uma edição na época errada.",
      );

      return;
    }

    if (
      epoca.ano >= 2027 &&
      Number(dataEdicao.slice(5, 7)) > 10
    ) {
      setErro(
        "A época oficial conta apenas edições de janeiro a outubro. " +
          "Podes registar em novembro uma edição realizada até 31 de outubro.",
      );

      return;
    }

    const temporadaConvertida =
      Number(numeroTemporada);

    const edicaoConvertida =
      Number(numeroEdicao);

    if (
      !Number.isInteger(
        temporadaConvertida,
      ) ||
      temporadaConvertida <= 0
    ) {
      setErro(
        "Indica um número de temporada válido.",
      );

      return;
    }

    if (
      !Number.isInteger(
        edicaoConvertida,
      ) ||
      edicaoConvertida <= 0
    ) {
      setErro(
        "Indica um número de edição válido.",
      );

      return;
    }

    setAGuardar(true);

    try {
      const {
        data: novaEdicao,
        error,
      } = await supabase
        .from("edicoes")
        .insert({
          epoca_id: epoca.id,
          roda_id: rodaId,
          organizacao_id:
            rodaSelecionada.organizacao_id,
          nome: nome.trim(),
          numero_temporada:
            temporadaConvertida,
          numero_edicao:
            edicaoConvertida,
          data_edicao: dataEdicao,
          formato,
          estado: "rascunho",
        })
        .select("id")
        .single();

      if (error || !novaEdicao) {
        throw new Error(
          error?.message ??
            "Não foi possível registar a edição.",
        );
      }

      /*
        CONTEXTO DA NOVA EDIÇÃO

        Mantemos as mesmas chaves e
        estrutura de armazenamento local.
      */

      localStorage.setItem(
        "edicaoId",
        novaEdicao.id,
      );

      localStorage.removeItem(
        `participantesSelecionados:${novaEdicao.id}`,
      );

      localStorage.setItem(
        "novaEdicao",
        JSON.stringify({
          id: novaEdicao.id,
          nome: nome.trim(),
          numeroTemporada:
            temporadaConvertida,
          numeroEdicao:
            edicaoConvertida,
          data: dataEdicao,
          formato,
          rodaId,
        }),
      );

      router.push(
        "/organizacao/apontamentos",
      );
    } catch (falha) {
      console.error(
        "Erro ao registar edição:",
        falha,
      );

      setErro(
        falha instanceof Error
          ? `Erro: ${falha.message}`
          : "Não foi possível registar a edição.",
      );

      setAGuardar(false);
    }
  }

  /*
    ============================================
    APRESENTAÇÃO DA PÁGINA
    ============================================
  */

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
            IMIP · GESTÃO DE EDIÇÕES
          </span>
        </nav>

        {/* =====================================
            CABEÇALHO COM DOIS QUADROS
            ===================================== */}

        <section className="relative mt-5 overflow-hidden border border-[#d6b56d]/45 bg-[#091b13]/95 sm:mt-7">

          <FaixaPortugal altura="h-[6px]" />

          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

            {/* =====================================
                QUADRO ESQUERDO
                ===================================== */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rotate-12 border-[26px] border-[#087a43]/15"
              />

              <div className="relative min-w-0">

                <p className="imip-etiqueta">
                  ORGANIZAÇÃO · COMPETIÇÃO · REGISTO
                </p>

                {/* TÍTULO PRINCIPAL — BOLD */}

                <h1
                  className={`${boldIMIP.className} mt-6 min-w-0 font-bold uppercase leading-[1.07] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  <span className="block text-[clamp(2.7rem,4.7vw,5.2rem)] text-[#f0e6d1]">
                    REGISTAR
                  </span>

                  <span className="mt-2 block text-[clamp(3rem,5vw,5.6rem)] text-[#d6b56d]">
                    EDIÇÃO
                    <span className="text-[#b82535]">
                      .
                    </span>
                  </span>
                </h1>

                <div className="mt-7 w-48 max-w-full">
                  <FaixaPortugal />
                </div>

                <p className="mt-7 max-w-xl text-lg font-bold leading-relaxed text-[#f0e6d1] sm:text-xl">
                  Cada edição é uma nova página
                  na história da tua roda.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
                  Regista a roda, o nome da edição,
                  a temporada, a data e o formato.
                  Depois do registo, podes continuar
                  para a gestão dos participantes
                  e das batalhas.
                </p>

                {/* DADOS CARREGADOS DO SUPABASE */}

                <div className="mt-8 space-y-3 border-l-4 border-[#d6b56d] bg-black/25 px-5 py-5">

                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d6b56d]">
                    CONTEXTO DO REGISTO
                  </p>

                  {loading ? (
                    <p className="text-sm font-bold text-[#f0e6d1]">
                      A CARREGAR DADOS...
                    </p>
                  ) : (
                    <>
                      {organizacao && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#e5c980]">
                            ORGANIZAÇÃO
                          </p>

                          <p className="mt-1 break-words text-sm font-bold text-[#f0e6d1]">
                            {organizacao.nome}
                          </p>
                        </div>
                      )}

                      {epoca && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#e5c980]">
                            ÉPOCA ATIVA
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#f0e6d1]">
                            {epoca.nome} ·{" "}
                            {epoca.ano === 2026
                              ? "TESTES"
                              : epoca.ano}
                          </p>
                        </div>
                      )}

                      {administrador && (
                        <p className="border-t border-[#d6b56d]/20 pt-3 text-xs font-bold uppercase leading-relaxed text-[#f0d58e]">
                          ACESSO DE ORGANIZADOR GERAL
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* FRASE DE IMPACTO — VENEER */}

              <div className="relative mt-10 border-l-4 border-[#d6b56d] bg-black/20 px-5 py-4">

                <p
                  className={`${veneerIMIP.className} text-[clamp(1.8rem,2.4vw,2.8rem)] font-normal uppercase leading-[1.15] tracking-[0.02em] text-[#f0e6d1]`}
                >
                  CADA RODA
                  <span className="block text-[#d6b56d]">
                    CONSTRÓI O CAMINHO.
                  </span>
                </p>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.09em] text-[#e3d0a1]">
                  NACIONAL DE RUA · IMIP
                </p>
              </div>
            </div>

            {/* =====================================
                QUADRO DIREITO
                FORMULÁRIO MARFIM
                ===================================== */}

            <div className="relative flex min-w-0 flex-col justify-between overflow-hidden border-t border-[#d6b56d]/30 bg-[#e7ddc7] p-5 text-[#101713] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">

              {/* ELEMENTOS DECORATIVOS AFASTADOS */}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-28 z-0 h-48 w-48 rotate-12 border-[20px] border-[#b82535]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-36 -left-32 z-0 h-52 w-52 -rotate-12 border-[24px] border-[#087a43]"
              />

              <div className="relative z-10 min-w-0">

                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#a82636]">
                  NOVA EDIÇÃO · IMIP
                </p>

                <div className="mt-5 h-1 w-16 bg-[#101713]" />

                <h2
                  className={`${boldIMIP.className} mt-7 min-w-0 text-[clamp(2rem,2.8vw,3.2rem)] font-bold uppercase leading-[1.1] tracking-[0.01em] [overflow-wrap:break-word]`}
                >
                  DADOS DA

                  <span className="block text-[#b82535]">
                    EDIÇÃO.
                  </span>
                </h2>

                <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#394239]">
                  Preenche os dados necessários
                  para criar a edição.
                </p>

                {/* =====================================
                    ESTADO DE CARREGAMENTO
                    ===================================== */}

                {loading ? (
                  <div
                    role="status"
                    className="mt-7 border border-[#101713]/25 bg-[#f8f2e5] p-5 sm:p-6"
                  >
                    <p className="border-l-4 border-[#d6b56d] pl-3 text-xs font-black uppercase tracking-[0.08em]">
                      A CARREGAR...
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-[#394239]">
                      A verificar a organização,
                      as rodas disponíveis e a
                      época ativa.
                    </p>

                    <div className="mt-6 w-28">
                      <FaixaPortugal />
                    </div>
                  </div>
                ) : (

                  /* =====================================
                      FORMULÁRIO DE REGISTO

                      TODOS OS CAMPOS PRESERVADOS
                      ===================================== */

                  <form
                    onSubmit={registarEdicao}
                    className="mt-7 space-y-6 border border-[#101713]/25 bg-[#f8f2e5] p-4 sm:p-6"
                  >

                    {/* RODA */}

                    <div>
                      <label
                        htmlFor="roda-edicao"
                        className={etiqueta}
                      >
                        RODA
                      </label>

                      <select
                        id="roda-edicao"
                        value={rodaId}
                        onChange={(evento) =>
                          setRodaId(
                            evento.target.value,
                          )
                        }
                        className={campo}
                        required
                      >
                        <option value="">
                          Selecionar roda
                        </option>

                        {rodas.map((roda) => (
                          <option
                            key={roda.id}
                            value={roda.id}
                          >
                            {administrador
                              ? `${
                                  organizacoes.find(
                                    (org) =>
                                      org.id ===
                                      roda.organizacao_id,
                                  )?.nome ??
                                  "Organização"
                                } · ${roda.nome}`
                              : roda.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* NOME DA EDIÇÃO */}

                    <div>
                      <label
                        htmlFor="nome-edicao"
                        className={etiqueta}
                      >
                        NOME DA EDIÇÃO
                      </label>

                      <input
                        id="nome-edicao"
                        type="text"
                        value={nome}
                        onChange={(evento) =>
                          setNome(
                            evento.target.value,
                          )
                        }
                        placeholder="Ex.: Klandestina #42"
                        className={campo}
                        required
                      />
                    </div>

                    {/* TEMPORADA E NÚMERO */}

                    <div className="grid gap-5 sm:grid-cols-2">

                      <div className="min-w-0">
                        <label
                          htmlFor="numero-temporada"
                          className={etiqueta}
                        >
                          NÚMERO DA TEMPORADA
                        </label>

                        <input
                          id="numero-temporada"
                          type="number"
                          min="1"
                          step="1"
                          value={numeroTemporada}
                          onChange={(evento) =>
                            setNumeroTemporada(
                              evento.target.value,
                            )
                          }
                          placeholder="Ex.: 3"
                          className={campo}
                          required
                        />
                      </div>

                      <div className="min-w-0">
                        <label
                          htmlFor="numero-edicao"
                          className={etiqueta}
                        >
                          NÚMERO DA EDIÇÃO
                        </label>

                        <input
                          id="numero-edicao"
                          type="number"
                          min="1"
                          step="1"
                          value={numeroEdicao}
                          onChange={(evento) =>
                            setNumeroEdicao(
                              evento.target.value,
                            )
                          }
                          placeholder="Ex.: 34"
                          className={campo}
                          required
                        />
                      </div>
                    </div>

                    {/* DATA */}

                    <div>
                      <label
                        htmlFor="data-edicao"
                        className={etiqueta}
                      >
                        DATA
                      </label>

                      <input
                        id="data-edicao"
                        type="date"
                        value={dataEdicao}
                        onChange={(evento) =>
                          setDataEdicao(
                            evento.target.value,
                          )
                        }
                        min={
                          epoca
                            ? `${epoca.ano}-01-01`
                            : undefined
                        }
                        max={
                          epoca &&
                          epoca.ano >= 2027
                            ? `${epoca.ano}-10-31`
                            : epoca
                              ? `${epoca.ano}-12-31`
                              : undefined
                        }
                        className={campo}
                        required
                      />
                    </div>

                    {/* FORMATO */}

                    <div>
                      <label
                        htmlFor="formato-edicao"
                        className={etiqueta}
                      >
                        FORMATO
                      </label>

                      <select
                        id="formato-edicao"
                        value={formato}
                        onChange={(evento) =>
                          setFormato(
                            evento.target.value,
                          )
                        }
                        className={campo}
                        required
                      >
                        {FORMATOS.map((opcao) => (
                          <option
                            key={opcao.valor}
                            value={opcao.valor}
                          >
                            {opcao.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ERROS DO REGISTO */}

                    {erro && (
                      <p
                        role="alert"
                        className="border-l-4 border-[#b82535] bg-[#b82535]/10 px-4 py-3 text-sm font-bold leading-relaxed text-[#842333]"
                      >
                        {erro}
                      </p>
                    )}

                    {/* REGISTAR EDIÇÃO */}

                    <button
                      type="submit"
                      disabled={
                        aGuardar ||
                        !organizacao ||
                        !epoca ||
                        rodas.length === 0
                      }
                      className="flex min-h-12 w-full items-center justify-center bg-[#101713] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.06em] text-[#f0e6d1] transition hover:bg-[#087a43] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {aGuardar
                        ? "A REGISTAR..."
                        : "REGISTAR EDIÇÃO ↗"}
                    </button>
                  </form>
                )}

                {/* ERRO SEM ORGANIZAÇÃO */}

                {!loading &&
                  erro &&
                  !organizacao && (
                    <p
                      role="alert"
                      className="mt-5 border-l-4 border-[#b82535] bg-[#b82535]/10 px-4 py-3 text-sm font-bold text-[#842333]"
                    >
                      {erro}
                    </p>
                  )}
              </div>

              {/* ASSINATURA DO QUADRO */}

              <div className="relative z-10 mt-9 border-t-4 border-[#101713] pt-4">

                <p className="text-xs font-black uppercase leading-relaxed tracking-[0.08em]">
                  UMA NOVA EDIÇÃO.

                  <span className="block">
                    MAIS UM PASSO NO CIRCUITO.
                  </span>
                </p>

                <p
                  className={`${veneerIMIP.className} mt-3 text-xl font-normal uppercase tracking-[0.03em] text-[#a82636]`}
                >
                  MERITOCRACIA É LEI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================
            INFORMAÇÃO SOBRE O REGISTO
            ===================================== */}

        <section className="mt-8 overflow-hidden border border-[#d6b56d]/40 bg-[#0a110d]/95">

          <FaixaPortugal />

          <div className="p-5 sm:p-7">

            <p className="imip-etiqueta">
              DO REGISTO À BATALHA
            </p>

            <h2
              className={`${boldIMIP.className} mt-3 text-[clamp(1.7rem,2.8vw,3rem)] font-bold uppercase leading-[1.1] tracking-[0.02em]`}
            >
              PRIMEIRO A EDIÇÃO.

              <span className="block text-[#d6b56d]">
                DEPOIS OS MCs.
              </span>
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#d2d9d0] sm:text-base">
              Ao registar uma edição, esta é criada
              como rascunho. O passo seguinte é
              continuar para os apontamentos e
              preparar os participantes e os
              resultados das batalhas.
            </p>

            <Link
              href="/organizacao"
              className="mt-6 inline-flex min-h-11 items-center border border-[#d6b56d] px-5 py-3 text-xs font-black uppercase tracking-[0.05em] text-[#f0d58e] transition hover:bg-[#d6b56d] hover:text-[#101713]"
            >
              VOLTAR AO PAINEL ↗
            </Link>
          </div>
        </section>

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
