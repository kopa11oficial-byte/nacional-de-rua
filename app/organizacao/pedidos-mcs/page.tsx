
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type PedidoAcesso = {
  id: string;
  mc_id: string;
  email: string;
  estado: "pendente" | "aprovado" | "recusado";
  criado_em: string;
  tratado_em: string | null;
  tratado_por: string | null;
};

type MC = {
  id: string;
  nome_artistico: string;
};

type ResultadoAcesso = {
  sucesso: true;
  mc: string;
  email: string;
  emailEnviado?: boolean;
  mensagem?: string;
};

type ResultadoErro = {
  erro?: string;
};

type AtivacaoEmail = {
  id: string;
  mc_id: string;
  nome_artistico: string;
  email: string;
  estado: string;
  criado_em: string;
  expira_em: string | null;
  perfil_associado: boolean;
};

type RespostaAtivacoes = {
  ativacoes?: AtivacaoEmail[];
  pagina?: number;
  porPagina?: number;
  total?: number;
  erro?: string;
};

function dataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(valor));
}

export default function PedidosAcessoMCsPage() {
  const [pedidos, setPedidos] = useState<PedidoAcesso[]>([]);
  const [nomesMCs, setNomesMCs] = useState<Record<string, string>>({});
  const [aCarregar, setACarregar] = useState(true);
  const [aAtualizar, setAAtualizar] = useState<string | null>(null);
  const [administrador, setAdministrador] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [aviso, setAviso] = useState("");

  // Ligação sensível: mantida só em memória e apenas no painel do suporte.
  const [ligacaoManual, setLigacaoManual] = useState<{
    pedidoId: string;
    url: string;
    email: string;
  } | null>(null);

  // Histórico separado das aprovações: não altera estados nem envia emails.
  const [ativacoes, setAtivacoes] = useState<AtivacaoEmail[]>([]);
  const [aCarregarAtivacoes, setACarregarAtivacoes] = useState(false);
  const [erroAtivacoes, setErroAtivacoes] = useState("");
  const [paginaAtivacoes, setPaginaAtivacoes] = useState(0);
  const [totalAtivacoes, setTotalAtivacoes] = useState(0);
  const [porPaginaAtivacoes, setPorPaginaAtivacoes] = useState(100);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroData, setFiltroData] = useState("");

  const carregarAtivacoes = useCallback(async (pagina: number) => {
    setACarregarAtivacoes(true);
    setErroAtivacoes("");

    try {
      const { data: sessao, error: erroSessao } =
        await supabase.auth.getSession();

      const token = sessao.session?.access_token;
      if (erroSessao || !token) {
        throw new Error("A sessão expirou. Volta a iniciar sessão.");
      }

      const resposta = await fetch(
        `/organizacao/pedidos-mcs/ativacoes?pagina=${pagina}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      const resultado = (await resposta.json().catch(() => null)) as
        | RespostaAtivacoes
        | null;

      if (!resposta.ok || !resultado || !Array.isArray(resultado.ativacoes)) {
        throw new Error(
          resultado?.erro ?? "Não foi possível consultar as ativações.",
        );
      }

      setAtivacoes(resultado.ativacoes);
      setTotalAtivacoes(resultado.total ?? 0);
      setPaginaAtivacoes(resultado.pagina ?? pagina);
      setPorPaginaAtivacoes(resultado.porPagina ?? 100);
    } catch (falha) {
      setAtivacoes([]);
      setErroAtivacoes(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar as ativações por email.",
      );
    } finally {
      setACarregarAtivacoes(false);
    }
  }, []);

  const carregarPedidos = useCallback(async () => {
    setACarregar(true);
    setErro("");
    setMensagem("");
    setAviso("");

    try {
      const { data: acesso, error: erroAcesso } =
        await supabase.rpc("e_administrador");

      if (erroAcesso || acesso !== true) {
        setAdministrador(false);
        setPedidos([]);
        setAtivacoes([]);
        setErro("Esta área está disponível apenas para o suporte.");
        return;
      }

      setAdministrador(true);
      void carregarAtivacoes(0);

      const { data, error: erroPedidos } = await supabase
        .from("pedidos_acesso_mcs")
        .select(
          "id,mc_id,email,estado,criado_em,tratado_em,tratado_por",
        )
        .order("criado_em", { ascending: false });

      if (erroPedidos) {
        setErro(
          `Não foi possível carregar os pedidos: ${erroPedidos.message}`,
        );
        setPedidos([]);
        return;
      }

      const lista = (data ?? []) as PedidoAcesso[];
      setPedidos(lista);

      const idsMCs = [...new Set(lista.map((pedido) => pedido.mc_id))];

      if (idsMCs.length === 0) {
        setNomesMCs({});
        return;
      }

      const { data: mcs, error: erroMCs } = await supabase
        .from("mcs")
        .select("id,nome_artistico")
        .in("id", idsMCs);

      if (erroMCs) {
        setErro(
          `Os pedidos foram carregados, mas não os nomes dos MCs: ${erroMCs.message}`,
        );
        return;
      }

      const nomes: Record<string, string> = {};

      for (const mc of (mcs ?? []) as MC[]) {
        nomes[mc.id] = mc.nome_artistico;
      }

      setNomesMCs(nomes);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Ocorreu um erro ao carregar os pedidos.",
      );
    } finally {
      setACarregar(false);
    }
  }, [carregarAtivacoes]);

  useEffect(() => {
    void carregarPedidos();
  }, [carregarPedidos]);

  useEffect(() => {
    if (
      administrador &&
      !aCarregarAtivacoes &&
      window.location.hash === "#ativacoes-email"
    ) {
      document.getElementById("ativacoes-email")?.scrollIntoView({
        block: "start",
      });
    }
  }, [administrador, aCarregarAtivacoes]);

  async function obterToken(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        "A sessão expirou. Inicia sessão novamente.",
      );
    }

    return data.session.access_token;
  }

  async function chamarRota(
    pedidoId: string,
    acao?: "reenviar-email",
  ): Promise<ResultadoAcesso> {
    const token = await obterToken();

    const resposta = await fetch(
      "/organizacao/pedidos-mcs/criar-acesso",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pedidoId,
          ...(acao ? { acao } : {}),
        }),
      },
    );

    let resultado: ResultadoAcesso | ResultadoErro;

    try {
      resultado = (await resposta.json()) as
        | ResultadoAcesso
        | ResultadoErro;
    } catch {
      throw new Error(
        "O servidor devolveu uma resposta inválida. Atualiza a lista antes de repetir.",
      );
    }

    if (
      !resposta.ok ||
      !("sucesso" in resultado) ||
      resultado.sucesso !== true
    ) {
      const mensagemErro =
        "erro" in resultado ? resultado.erro : undefined;

      throw new Error(
        mensagemErro ??
          "Não foi possível concluir a operação.",
      );
    }

    return resultado;
  }

  async function recusarPedido(pedido: PedidoAcesso) {
    if (aAtualizar) return;

    const nomeMC = nomesMCs[pedido.mc_id] ?? "este MC";

    const confirmado = window.confirm(
      `Queres recusar o pedido de acesso de ${nomeMC}?`,
    );

    if (!confirmado) return;

    setAAtualizar(pedido.id);
    setErro("");
    setMensagem("");
    setAviso("");

    try {
      const { data: utilizadorResposta } =
        await supabase.auth.getUser();

      const utilizadorId = utilizadorResposta.user?.id;

      if (!utilizadorId) {
        throw new Error(
          "A sessão expirou. Inicia sessão novamente.",
        );
      }

      const { data, error: erroAtualizacao } = await supabase
        .from("pedidos_acesso_mcs")
        .update({
          estado: "recusado",
          tratado_em: new Date().toISOString(),
          tratado_por: utilizadorId,
        })
        .eq("id", pedido.id)
        .eq("estado", "pendente")
        .select("id")
        .maybeSingle();

      if (erroAtualizacao || !data) {
        throw new Error(
          erroAtualizacao?.message ??
            "Este pedido já foi tratado ou não pode ser atualizado.",
        );
      }

      await carregarPedidos();
      setMensagem(`Pedido de ${nomeMC} recusado.`);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível recusar o pedido.",
      );
    } finally {
      setAAtualizar(null);
    }
  }

  async function aprovarEEnviarEmail(pedido: PedidoAcesso) {
    if (aAtualizar) return;

    const nomeMC = nomesMCs[pedido.mc_id] ?? "este MC";

    const confirmado = window.confirm(
      `Aprovar o pedido de ${nomeMC} e enviar o email de acesso para ${pedido.email}?`,
    );

    if (!confirmado) return;

    setAAtualizar(pedido.id);
    setErro("");
    setMensagem("");
    setAviso("");

    try {
      const resultado = await chamarRota(pedido.id);

      await carregarPedidos();

      if (resultado.emailEnviado === false) {
        setAviso(
          `O pedido de ${resultado.mc} foi APROVADO e a conta ficou associada ao perfil. Porém, o email para ${resultado.email} não foi enviado. Utiliza o botão REENVIAR EMAIL DE ACESSO nos pedidos tratados.`,
        );
      } else {
        setMensagem(
          `Pedido de ${resultado.mc} aprovado. Foi solicitado o envio do email de acesso para ${resultado.email}.`,
        );
      }
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Ocorreu um erro ao aprovar o pedido.",
      );
    } finally {
      setAAtualizar(null);
    }
  }

  async function reenviarEmailAcesso(pedido: PedidoAcesso) {
    if (aAtualizar) return;

    const nomeMC = nomesMCs[pedido.mc_id] ?? "este MC";

    const confirmado = window.confirm(
      `Enviar um novo email de acesso de ${nomeMC} para ${pedido.email}?`,
    );

    if (!confirmado) return;

    setAAtualizar(pedido.id);
    setErro("");
    setMensagem("");
    setAviso("");

    try {
      const resultado = await chamarRota(
        pedido.id,
        "reenviar-email",
      );

      setMensagem(
        `Foi solicitado um novo email de acesso para ${resultado.email}.`,
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível reenviar o email.",
      );
    } finally {
      setAAtualizar(null);
    }
  }

  async function gerarLigacaoManual(pedido: PedidoAcesso) {
    if (aAtualizar || pedido.estado !== "aprovado") return;

    const nome = nomesMCs[pedido.mc_id] ?? "este MC";
    const confirmado = window.confirm(
      `Gerar uma ligação temporária para ${nome}? Envia-a exclusivamente para ${pedido.email}, por uma mensagem privada da conta oficial IMIP. Quem possuir esta ligação pode alterar a palavra-passe.`,
    );
    if (!confirmado) return;

    setAAtualizar(pedido.id);
    setLigacaoManual(null);
    setErro("");
    setMensagem("");
    setAviso("");

    try {
      const token = await obterToken();
      const resposta = await fetch(
        "/organizacao/pedidos-mcs/gerar-ligacao",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pedidoId: pedido.id }),
          cache: "no-store",
        },
      );

      const resultado = (await resposta.json().catch(() => null)) as
        | { sucesso?: boolean; ligacao?: string; erro?: string }
        | null;

      if (
        !resposta.ok ||
        resultado?.sucesso !== true ||
        !resultado.ligacao
      ) {
        throw new Error(resultado?.erro ?? "Não foi possível gerar a ligação.");
      }

      setLigacaoManual({
        pedidoId: pedido.id,
        url: resultado.ligacao,
        email: pedido.email,
      });
      setMensagem(
        `Ligação temporária criada para ${nome}. Copia-a e envia-a somente para o email validado. Não publiques nem partilhes com terceiros.`,
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Ocorreu um erro ao gerar a ligação de recuperação.",
      );
    } finally {
      setAAtualizar(null);
    }
  }

  async function copiarLigacaoManual() {
    if (!ligacaoManual) return;

    try {
      await navigator.clipboard.writeText(ligacaoManual.url);
      setMensagem(
        `Ligação copiada. Envia-a em privado para ${ligacaoManual.email}, a partir do email oficial do IMIP. Não abras tu próprio a ligação.`,
      );
    } catch {
      setErro(
        "A cópia automática falhou. Verifica as permissões da área de transferência do navegador.",
      );
    }
  }

  const pendentes = pedidos.filter(
    (pedido) => pedido.estado === "pendente",
  );

  const tratados = pedidos.filter(
    (pedido) => pedido.estado !== "pendente",
  );

  const listaAtivacoes = ativacoes.filter((ativacao) => {
    const correspondeEstado =
      filtroEstado === "todas" || ativacao.estado === filtroEstado;
    const correspondeData =
      !filtroData ||
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(ativacao.criado_em)) === filtroData;

    return correspondeEstado && correspondeData;
  });

  const totalPaginasAtivacoes = Math.max(
    1,
    Math.ceil(totalAtivacoes / porPaginaAtivacoes),
  );

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/fundo-tijolos.png')",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/45"
      />

      <div className="relative mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/organizacao/suporte"
          className="inline-block text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AO PAINEL DE SUPORTE
        </Link>

        <header className="mt-10">
          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            FERRAMENTAS DE SUPORTE
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            PEDIDOS DE{" "}
            <span className="text-yellow-500">
              ACESSO MC
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
            Consulta os pedidos de acesso aos perfis e
            acompanha o estado de cada pedido.
          </p>
        </header>

        {erro && (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-red-800 bg-black/90 p-4 text-sm font-bold text-red-300"
          >
            {erro}
          </p>
        )}

        {aviso && (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-amber-500 bg-black/90 p-4 text-sm font-bold text-amber-300"
          >
            {aviso}
          </p>
        )}

        {mensagem && (
          <p
            role="status"
            className="mt-8 rounded-xl border border-emerald-800 bg-black/90 p-4 text-sm font-bold text-emerald-300"
          >
            {mensagem}
          </p>
        )}

        {administrador && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-yellow-400">
                {pendentes.length}{" "}
                {pendentes.length === 1
                  ? "pedido pendente"
                  : "pedidos pendentes"}
              </p>

              <button
                type="button"
                onClick={() => void carregarPedidos()}
                disabled={aCarregar || Boolean(aAtualizar)}
                className="rounded-lg border border-yellow-500 px-4 py-2 text-xs font-black text-yellow-500 hover:bg-yellow-500 hover:text-black disabled:opacity-50"
              >
                {aCarregar
                  ? "A CARREGAR..."
                  : "ATUALIZAR LISTA"}
              </button>
            </div>

            {aCarregar ? (
              <p className="mt-5 rounded-xl border border-zinc-700 bg-black/90 p-5 text-zinc-300">
                A carregar pedidos...
              </p>
            ) : pendentes.length === 0 ? (
              <p className="mt-5 rounded-xl border border-zinc-700 bg-black/90 p-5 text-zinc-300">
                Não há pedidos pendentes.
              </p>
            ) : (
              <section
                aria-label="Pedidos pendentes"
                className="mt-5 space-y-4"
              >
                {pendentes.map((pedido) => (
                  <article
                    key={pedido.id}
                    className="rounded-xl border border-yellow-600/60 bg-black/90 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-black">
                          {nomesMCs[pedido.mc_id] ?? "MC"}
                        </h2>

                        <p className="mt-2 break-all text-sm text-zinc-200">
                          {pedido.email}
                        </p>

                        <p className="mt-2 text-xs text-zinc-400">
                          Pedido recebido:{" "}
                          {dataHora(pedido.criado_em)}
                        </p>

                        <p className="mt-2 text-xs font-black uppercase tracking-wider text-yellow-400">
                          Pendente
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/organizacao/mcs/${pedido.mc_id}`}
                          className="rounded-lg border border-zinc-500 px-4 py-2 text-center text-xs font-black hover:border-yellow-500 hover:text-yellow-400"
                        >
                          VER PERFIL
                        </Link>

                        <a
                          href={`mailto:${pedido.email}?subject=${encodeURIComponent(
                            `Acesso ao perfil de ${
                              nomesMCs[pedido.mc_id] ?? "MC"
                            }`,
                          )}`}
                          className="rounded-lg border border-zinc-500 px-4 py-2 text-center text-xs font-black hover:border-yellow-500 hover:text-yellow-400"
                        >
                          CONTACTAR
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            void aprovarEEnviarEmail(pedido)
                          }
                          disabled={Boolean(aAtualizar)}
                          className="rounded-lg bg-yellow-500 px-4 py-2 text-xs font-black text-black hover:bg-yellow-400 disabled:opacity-50"
                        >
                          {aAtualizar === pedido.id
                            ? "A PROCESSAR..."
                            : "APROVAR E ENVIAR EMAIL"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void recusarPedido(pedido)
                          }
                          disabled={Boolean(aAtualizar)}
                          className="rounded-lg border border-red-800 px-4 py-2 text-xs font-black text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                        >
                          {aAtualizar === pedido.id
                            ? "A ATUALIZAR..."
                            : "RECUSAR PEDIDO"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {tratados.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-black">
                  PEDIDOS TRATADOS
                </h2>

                <div className="mt-4 overflow-hidden rounded-xl border border-zinc-700 bg-black/90">
                  {tratados.map((pedido, indice) => (
                    <div
                      key={pedido.id}
                      className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                        indice > 0
                          ? "border-t border-zinc-800"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="break-words font-bold">
                          {nomesMCs[pedido.mc_id] ?? "MC"}
                        </p>

                        <p className="break-all text-xs text-zinc-400">
                          {pedido.email}
                        </p>
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <p
                          className={`text-xs font-black uppercase ${
                            pedido.estado === "aprovado"
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {pedido.estado}
                          {pedido.tratado_em
                            ? ` · ${dataHora(
                                pedido.tratado_em,
                              )}`
                            : ""}
                        </p>

                        {pedido.estado === "aprovado" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void reenviarEmailAcesso(pedido)
                              }
                              disabled={Boolean(aAtualizar)}
                              className="rounded-lg border border-yellow-500 px-4 py-2 text-xs font-black text-yellow-400 hover:bg-yellow-500 hover:text-black disabled:opacity-50"
                            >
                              {aAtualizar === pedido.id
                                ? "A ENVIAR EMAIL..."
                                : "REENVIAR EMAIL DE ACESSO"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void gerarLigacaoManual(pedido)}
                              disabled={Boolean(aAtualizar)}
                              className="rounded-lg border border-emerald-600 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-800 hover:text-white disabled:opacity-50"
                            >
                              {aAtualizar === pedido.id
                                ? "A GERAR..."
                                : "GERAR LIGAÇÃO SEM SMTP"}
                            </button>
                            {ligacaoManual?.pedidoId === pedido.id && (
                              <div className="max-w-sm border-l-4 border-emerald-600 bg-emerald-950/40 p-3 text-xs text-emerald-100">
                                <p className="mb-2">
                                  Ligação temporária gerada. Envia apenas ao email confirmado do MC, através do IMIP. Não a abras nem a partilhes publicamente.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void copiarLigacaoManual()}
                                  className="rounded bg-emerald-600 px-3 py-2 font-black text-white hover:bg-emerald-500"
                                >
                                  COPIAR LIGAÇÃO PRIVADA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLigacaoManual(null)}
                                  className="ml-2 border border-white/30 px-3 py-2 font-black"
                                >
                                  OCULTAR
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {administrador && (
          <section
            id="ativacoes-email"
            aria-labelledby="titulo-ativacoes-email"
            className="mt-12 rounded-xl border border-yellow-500/50 bg-black/90 p-5 sm:p-7"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
              ATIVAÇÃO AUTOMÁTICA
            </p>
            <h2
              id="titulo-ativacoes-email"
              className="mt-2 text-2xl font-black text-white"
            >
              HISTÓRICO DE ATIVAÇÕES POR EMAIL
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Pedidos iniciados pelos MCs nos seus perfis públicos.
              São diferentes dos pedidos sujeitos a aprovação acima.
              Este histórico é apenas de consulta; não reenvia emails
              nem aprova automaticamente o acesso.
            </p>

            {erroAtivacoes && (
              <p role="alert" className="mt-5 border border-red-800 bg-red-950/30 p-4 text-sm text-red-200">
                {erroAtivacoes}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-end gap-4">
              <label className="text-xs font-bold text-zinc-300">
                ESTADO
                <select
                  value={filtroEstado}
                  onChange={(evento) => setFiltroEstado(evento.target.value)}
                  className="mt-2 block min-h-10 rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm text-white"
                >
                  <option value="todas">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="ativado">Ativado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
              <label className="text-xs font-bold text-zinc-300">
                DATA (PORTUGAL)
                <input
                  type="date"
                  value={filtroData}
                  onChange={(evento) => setFiltroData(evento.target.value)}
                  className="mt-2 block min-h-10 rounded-md border border-zinc-600 bg-zinc-950 px-3 text-sm text-white"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setFiltroEstado("todas");
                  setFiltroData("");
                }}
                className="min-h-10 rounded-md border border-zinc-500 px-3 text-xs font-bold text-zinc-200 hover:border-yellow-500"
              >
                LIMPAR FILTROS
              </button>
            </div>

            <p className="mt-4 text-xs text-zinc-400">
              {totalAtivacoes} registo(s) no total. Os filtros aplicam-se
              apenas aos {porPaginaAtivacoes} registos desta página.
              Para consultar datas mais antigas, muda de página.
            </p>

            {aCarregarAtivacoes ? (
              <p role="status" className="mt-5 text-sm text-yellow-300">
                A carregar ativações...
              </p>
            ) : listaAtivacoes.length === 0 && !erroAtivacoes ? (
              <p className="mt-5 text-sm text-zinc-300">
                Não há ativações correspondentes aos filtros nesta página.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {listaAtivacoes.map((ativacao) => {
                  const expirada =
                    ativacao.estado === "pendente" &&
                    Boolean(ativacao.expira_em) &&
                    new Date(ativacao.expira_em as string).getTime() < Date.now();

                  return (
                    <article
                      key={ativacao.id}
                      className="rounded-lg border border-zinc-700 bg-zinc-950/95 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-white">
                            {ativacao.nome_artistico}
                          </p>
                          <p className="mt-1 break-all text-sm text-zinc-300">
                            {ativacao.email}
                          </p>
                          <p className="mt-2 text-xs text-zinc-400">
                            {dataHora(ativacao.criado_em)}
                            {" · "}
                            Perfil associado: {ativacao.perfil_associado ? "SIM" : "NÃO"}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-black uppercase tracking-wider ${
                            ativacao.estado === "ativado"
                              ? "text-emerald-300"
                              : ativacao.estado === "cancelado"
                                ? "text-red-300"
                                : "text-yellow-300"
                          }`}
                        >
                          {ativacao.estado}
                          {expirada ? " · PRAZO EXPIRADO" : ""}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold text-zinc-300">
                PÁGINA {paginaAtivacoes + 1} DE {totalPaginasAtivacoes}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={aCarregarAtivacoes || paginaAtivacoes === 0}
                  onClick={() => void carregarAtivacoes(paginaAtivacoes - 1)}
                  className="rounded-md border border-yellow-600 px-4 py-2 text-xs font-black text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← ANTERIOR
                </button>
                <button
                  type="button"
                  disabled={aCarregarAtivacoes || paginaAtivacoes + 1 >= totalPaginasAtivacoes}
                  onClick={() => void carregarAtivacoes(paginaAtivacoes + 1)}
                  className="rounded-md border border-yellow-600 px-4 py-2 text-xs font-black text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  SEGUINTE →
                </button>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
