
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

function dataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
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
        setErro("Esta área está disponível apenas para o suporte.");
        return;
      }

      setAdministrador(true);

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
  }, []);

  useEffect(() => {
    void carregarPedidos();
  }, [carregarPedidos]);

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

  const pendentes = pedidos.filter(
    (pedido) => pedido.estado === "pendente",
  );

  const tratados = pedidos.filter(
    (pedido) => pedido.estado !== "pendente",
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
