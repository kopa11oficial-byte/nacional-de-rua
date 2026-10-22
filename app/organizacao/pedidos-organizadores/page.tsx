
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PedidoOrganizacao = {
  id: string;
  organizacao_id: string;
  roda_id: string;
  nome_solicitante: string;
  email: string;
  telefone: string | null;
  estado: "pendente" | "aprovado" | "recusado";
  criado_em: string;
  tratado_em: string | null;
  tratado_por: string | null;
  nome_roda: string | null;
  nome_organizacao: string | null;
};

type ResultadoAcesso = {
  sucesso: true;
  organizacao: string;
  email: string;
};

type AcaoAcesso = "aprovar" | "reenviar-email";

function dataHora(valor: string | null) {
  if (!valor) return "Data indisponível";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export default function PedidosAcessoOrganizacoesPage() {
  const router = useRouter();

  const [pedidos, setPedidos] =
    useState<PedidoOrganizacao[]>([]);

  const [aCarregar, setACarregar] =
    useState(true);

  const [aAtualizar, setAAtualizar] =
    useState<string | null>(null);

  const [temAcesso, setTemAcesso] =
    useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  // ==========================================
  // CONSULTAR PEDIDOS ATRAVÉS DA FUNÇÃO
  // PROTEGIDA DO SUPABASE
  // ==========================================

  const carregarPedidos = useCallback(
    async () => {
      const { data, error } = await supabase.rpc(
        "listar_pedidos_organizadores_suporte",
      );

      if (error) {
        throw new Error(
          `Não foi possível carregar os pedidos: ${error.message}`,
        );
      }

      setPedidos(
        Array.isArray(data)
          ? (data as PedidoOrganizacao[])
          : [],
      );
    },
    [],
  );

  // ==========================================
  // VALIDAR SESSÃO E PERMISSÕES
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      setACarregar(true);
      setErro("");
      setTemAcesso(false);

      try {
        const {
          data: { user },
          error: erroUtilizador,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (erroUtilizador || !user) {
          router.replace("/organizacao/login");
          return;
        }

        const {
          data: autorizado,
          error: erroPermissao,
        } = await supabase.rpc(
          "tem_permissao_suporte",
          {
            p_area: "rodas_organizacoes",
          },
        );

        if (!ativo) return;

        if (
          erroPermissao ||
          autorizado !== true
        ) {
          throw new Error(
            "Esta área está disponível apenas para o Suporte Geral IMIP e o Suporte de Rodas e Organizações.",
          );
        }

        setTemAcesso(true);

        await carregarPedidos();
      } catch (falha) {
        if (!ativo) return;

        console.error(
          "Erro ao abrir pedidos de organizadores:",
          falha,
        );

        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível abrir os pedidos.",
        );
      } finally {
        if (ativo) {
          setACarregar(false);
        }
      }
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [router, carregarPedidos]);

  // ==========================================
  // ATUALIZAR LISTA
  // ==========================================

  async function atualizarLista() {
    if (aAtualizar || aCarregar) return;

    setACarregar(true);
    setErro("");
    setMensagem("");

    try {
      await carregarPedidos();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível atualizar os pedidos.",
      );
    } finally {
      setACarregar(false);
    }
  }

  // ==========================================
  // RECUSAR PEDIDO
  // ==========================================

  async function recusarPedido(
    pedido: PedidoOrganizacao,
  ) {
    if (aAtualizar || aCarregar || !temAcesso) {
      return;
    }

    const rodaNome =
      pedido.nome_roda ?? "esta roda";

    const confirmado = window.confirm(
      `Queres recusar o pedido de acesso à roda "${rodaNome}"?\n\nO pedido ficará registado como recusado. Nenhuma conta ou roda será eliminada.`,
    );

    if (!confirmado) return;

    setAAtualizar(pedido.id);
    setErro("");
    setMensagem("");

    try {
      const { data, error } =
        await supabase.rpc(
          "recusar_pedido_organizador_suporte",
          {
            p_pedido_id: pedido.id,
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (data !== pedido.id) {
        throw new Error(
          "Não foi possível confirmar a recusa do pedido.",
        );
      }

      await carregarPedidos();

      setMensagem(
        `O pedido de acesso à roda "${rodaNome}" foi recusado.`,
      );
    } catch (falha) {
      console.error(
        "Erro ao recusar pedido:",
        falha,
      );

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível recusar o pedido.",
      );
    } finally {
      setAAtualizar(null);
    }
  }

  // ==========================================
  // APROVAR OU REENVIAR EMAIL
  // ==========================================

  async function processarAcesso(
    pedido: PedidoOrganizacao,
    acao: AcaoAcesso,
  ) {
    if (aAtualizar || aCarregar || !temAcesso) {
      return;
    }

    const rodaNome =
      pedido.nome_roda ?? "esta roda";

    const pergunta =
      acao === "aprovar"
        ? `Aprovar o acesso de "${pedido.nome_solicitante}" à roda "${rodaNome}"?\n\nA roda e as respetivas edições serão associadas à organização aprovada. Será solicitado o envio de um email para ${pedido.email}.`
        : `Solicitar um novo email de acesso para ${pedido.email}?\n\nO sistema verificará primeiro se o acesso continua ativo.`;

    if (!window.confirm(pergunta)) return;

    setAAtualizar(pedido.id);
    setErro("");
    setMensagem("");

    try {
      const {
        data: sessaoResposta,
        error: erroSessao,
      } = await supabase.auth.getSession();

      const token =
        sessaoResposta.session?.access_token;

      if (erroSessao || !token) {
        throw new Error(
          "A sessão expirou. Inicia sessão novamente.",
        );
      }

      // A rota do servidor verifica novamente
      // a identidade e as permissões de suporte.

      const resposta = await fetch(
        "/organizacao/pedidos-organizadores/criar-acesso",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pedidoId: pedido.id,
            acao,
          }),
        },
      );

      const resultado = (await resposta.json()) as
        | ResultadoAcesso
        | { erro?: string };

      if (
        !resposta.ok ||
        !("sucesso" in resultado) ||
        resultado.sucesso !== true
      ) {
        throw new Error(
          "erro" in resultado && resultado.erro
            ? resultado.erro
            : "Não foi possível processar o pedido.",
        );
      }

      await carregarPedidos();

      if (acao === "aprovar") {
        setMensagem(
          `O acesso à roda "${rodaNome}" foi aprovado. Foi solicitado o envio do email para ${resultado.email}.`,
        );
      } else {
        setMensagem(
          `Foi solicitado um novo email de acesso para ${resultado.email}.`,
        );
      }
    } catch (falha) {
      console.error(
        "Erro ao processar pedido de organizador:",
        falha,
      );

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível processar o pedido.",
      );
    } finally {
      setAAtualizar(null);
    }
  }

  // ==========================================
  // SEPARAR PEDIDOS
  // ==========================================

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
          backgroundImage:
            "url('/fundo-tijolos.png')",
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
              ACESSO RODAS
            </span>
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-200 sm:text-base">
            Consulta os pedidos de organizadores,
            aprova ou recusa acessos e acompanha
            o histórico de decisões.
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

        {mensagem && (
          <p
            role="status"
            className="mt-8 rounded-xl border border-emerald-800 bg-black/90 p-4 text-sm font-bold text-emerald-300"
          >
            {mensagem}
          </p>
        )}

        {aCarregar && !temAcesso && (
          <p className="mt-8 rounded-xl border border-zinc-700 bg-black/90 p-5 font-bold text-yellow-500">
            A VALIDAR ACESSO...
          </p>
        )}

        {temAcesso && (
          <>
            <section className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-bold text-yellow-400">
                  {pendentes.length}{" "}
                  {pendentes.length === 1
                    ? "pedido pendente"
                    : "pedidos pendentes"}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void atualizarLista()
                  }
                  disabled={
                    aCarregar ||
                    Boolean(aAtualizar)
                  }
                  className="rounded-lg border border-yellow-500 px-4 py-2 text-xs font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black disabled:opacity-50"
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
                <div className="mt-5 space-y-4">
                  {pendentes.map((pedido) => {
                    const rodaNome =
                      pedido.nome_roda ??
                      "Roda não identificada";

                    return (
                      <article
                        key={pedido.id}
                        className="rounded-xl border border-yellow-600/60 bg-black/90 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
                              PEDIDO PENDENTE
                            </p>

                            <h2 className="mt-2 break-words text-xl font-black text-white">
                              {rodaNome}
                            </h2>

                            <p className="mt-1 text-sm text-zinc-300">
                              Organização:{" "}
                              {pedido.nome_organizacao ??
                                "não identificada"}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs text-zinc-400">
                            Recebido em{" "}
                            {dataHora(
                              pedido.criado_em,
                            )}
                          </p>
                        </div>

                        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="font-bold text-zinc-400">
                              Pessoa que pediu
                            </dt>

                            <dd className="mt-1 break-words text-white">
                              {pedido.nome_solicitante}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold text-zinc-400">
                              Email
                            </dt>

                            <dd className="mt-1 break-all text-white">
                              <a
                                href={`mailto:${pedido.email}`}
                                className="underline decoration-yellow-500/60 underline-offset-2 hover:text-yellow-400"
                              >
                                {pedido.email}
                              </a>
                            </dd>
                          </div>

                          {pedido.telefone && (
                            <div>
                              <dt className="font-bold text-zinc-400">
                                Telefone
                              </dt>

                              <dd className="mt-1 text-white">
                                <a
                                  href={`tel:${pedido.telefone}`}
                                  className="underline decoration-yellow-500/60 underline-offset-2 hover:text-yellow-400"
                                >
                                  {pedido.telefone}
                                </a>
                              </dd>
                            </div>
                          )}
                        </dl>

                        <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-800 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              void processarAcesso(
                                pedido,
                                "aprovar",
                              )
                            }
                            disabled={
                              Boolean(aAtualizar) ||
                              aCarregar
                            }
                            className="rounded-lg bg-yellow-500 px-4 py-2.5 text-xs font-black text-black transition hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-50"
                          >
                            {aAtualizar === pedido.id
                              ? "A PROCESSAR..."
                              : "APROVAR E ENVIAR ACESSO"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void recusarPedido(
                                pedido,
                              )
                            }
                            disabled={
                              Boolean(aAtualizar) ||
                              aCarregar
                            }
                            className="rounded-lg border border-red-700 px-4 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-950/60 disabled:cursor-wait disabled:opacity-50"
                          >
                            RECUSAR PEDIDO
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black text-white">
                PEDIDOS TRATADOS
              </h2>

              {tratados.length === 0 ? (
                <p className="mt-4 rounded-xl border border-zinc-700 bg-black/90 p-5 text-sm text-zinc-300">
                  Ainda não há pedidos tratados.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {tratados.map((pedido) => (
                    <article
                      key={pedido.id}
                      className="rounded-xl border border-zinc-700 bg-black/90 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words font-black text-white">
                            {pedido.nome_roda ??
                              "Roda não identificada"}

                            <span className="font-normal text-zinc-400">
                              {" · "}
                              {pedido.estado ===
                              "aprovado"
                                ? "Aprovado"
                                : "Recusado"}
                            </span>
                          </p>

                          <p className="mt-1 break-words text-sm text-zinc-300">
                            {pedido.nome_solicitante}
                            {" · "}
                            {pedido.email}
                          </p>

                          {pedido.tratado_em && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Tratado em{" "}
                              {dataHora(
                                pedido.tratado_em,
                              )}
                            </p>
                          )}
                        </div>

                        {pedido.estado ===
                          "aprovado" && (
                          <button
                            type="button"
                            onClick={() =>
                              void processarAcesso(
                                pedido,
                                "reenviar-email",
                              )
                            }
                            disabled={
                              Boolean(aAtualizar) ||
                              aCarregar
                            }
                            className="shrink-0 rounded-lg border border-yellow-500/70 px-4 py-2 text-xs font-black text-yellow-400 transition hover:bg-yellow-500 hover:text-black disabled:cursor-wait disabled:opacity-50"
                          >
                            {aAtualizar ===
                            pedido.id
                              ? "A ENVIAR..."
                              : "REENVIAR EMAIL DE ACESSO"}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-10 rounded-xl border border-zinc-700 bg-black/85 p-5 text-sm leading-relaxed text-zinc-300">
              <p className="font-black text-yellow-500">
                GESTÃO DE ACESSOS
              </p>

              <p className="mt-3">
                As aprovações associam apenas a roda
                solicitada à organização autorizada.
                Os resultados e as edições são
                preservados.
              </p>

              <p className="mt-2">
                Os pedidos antigos continuam no
                histórico. Se uma roda tiver regressado
                a RODAS EM ESPERA, o reenvio de email
                será impedido pelo servidor até existir
                uma nova aprovação.
              </p>
            </div>
          </>
        )}

        <footer className="mt-12 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-400">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
