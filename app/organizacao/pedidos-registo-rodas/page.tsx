
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PedidoRoda = {
  id: string;
  nome_roda: string;
  cidade: string;
  distrito: string;
  nome_responsavel: string;
  email: string;
  telefone: string | null;
  instagram: string | null;
  descricao: string | null;
  estado: string;
  criado_em: string;
};

type Acao = "aprovar" | "recusar";

type Confirmacao = {
  mensagem: string;
  rodaId: string | null;
};

export default function PedidosRegistoRodasPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<PedidoRoda[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aProcessar, setAProcessar] = useState<string | null>(null);
  const [temAcesso, setTemAcesso] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmacao, setConfirmacao] =
    useState<Confirmacao | null>(null);

  const carregarPedidos = useCallback(async () => {
    const { data, error } = await supabase.rpc(
      "listar_pedidos_registo_rodas",
    );

    if (error) {
      throw new Error(
        `Não foi possível consultar os pedidos: ${error.message}`,
      );
    }

    setPedidos(
      Array.isArray(data) ? (data as PedidoRoda[]) : [],
    );
  }, []);

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      setACarregar(true);
      setErro("");

      try {
        const {
          data: { user },
          error: erroAuth,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (erroAuth || !user) {
          router.replace("/organizacao/login");
          return;
        }

        const {
          data: autorizado,
          error: erroPermissao,
        } = await supabase.rpc("tem_permissao_suporte", {
          p_area: "rodas_organizacoes",
        });

        if (!ativo) return;

        if (erroPermissao || autorizado !== true) {
          setTemAcesso(false);
          setErro(
            "Esta área está reservada ao Suporte Geral IMIP e ao Suporte de Rodas e Organizações.",
          );
          return;
        }

        setTemAcesso(true);
        await carregarPedidos();
      } catch (falha) {
        if (!ativo) return;

        console.error(
          "Erro ao abrir pedidos de rodas:",
          falha,
        );

        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar os pedidos.",
        );
      } finally {
        if (ativo) setACarregar(false);
      }
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [router, carregarPedidos]);

  async function atualizarLista() {
    if (aProcessar) return;

    setACarregar(true);
    setErro("");
    setConfirmacao(null);

    try {
      await carregarPedidos();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível atualizar a lista.",
      );
    } finally {
      setACarregar(false);
    }
  }

  async function tratarPedido(
    pedido: PedidoRoda,
    acao: Acao,
  ) {
    if (aProcessar) return;

    const mensagem =
      acao === "aprovar"
        ? `Aprovar a inscrição de "${pedido.nome_roda}" em ${pedido.cidade}?\n\nSerá criado um perfil público em Rodas em Espera. Não será criada uma conta de organizador.`
        : `Recusar a inscrição de "${pedido.nome_roda}"?\n\nNenhuma roda será criada.`;

    if (!window.confirm(mensagem)) return;

    setAProcessar(pedido.id);
    setErro("");
    setConfirmacao(null);

    try {
      const { data: resultado, error } =
        await supabase.rpc("tratar_pedido_registo_roda", {
          p_pedido_id: pedido.id,
          p_acao: acao,
        });

      if (error) {
        throw new Error(error.message);
      }

      const rodaId =
        acao === "aprovar" && typeof resultado === "string"
          ? resultado
          : null;

      await carregarPedidos();

      setConfirmacao({
        mensagem:
          acao === "aprovar"
            ? `A roda "${pedido.nome_roda}" foi aprovada e o seu perfil público foi criado em Rodas em Espera.`
            : `O pedido da roda "${pedido.nome_roda}" foi recusado.`,
        rodaId,
      });
    } catch (falha) {
      console.error(
        "Erro ao tratar inscrição da roda:",
        falha,
      );

      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível tratar este pedido. Atualiza a lista antes de tentar novamente.",
      );
    } finally {
      setAProcessar(null);
    }
  }

  function formatarData(valor: string) {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return "Data indisponível";
    }

    return data.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main
      className="relative min-h-screen bg-black bg-cover bg-center text-white"
      style={{
        backgroundImage: "url('/fundo-tijolos.png')",
      }}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/70"
      />

      <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/organizacao/suporte"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR À CENTRAL DE SUPORTE
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            IMIP — SUPORTE NACIONAL
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            REGISTO DE{" "}
            <span className="text-yellow-500">
              NOVAS RODAS
            </span>
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Consulta e valida as inscrições de rodas que
            ainda não existem no Nacional de Rua.
          </p>
        </header>

        {aCarregar ? (
          <p className="mt-10 rounded-xl border border-zinc-700 bg-black/90 p-6 font-black text-yellow-500">
            A CARREGAR PEDIDOS...
          </p>
        ) : !temAcesso ? (
          <p
            role="alert"
            className="mt-10 rounded-xl border border-red-800 bg-black/90 p-6 font-bold text-red-300"
          >
            {erro ||
              "Não tens autorização para aceder a esta área."}
          </p>
        ) : (
          <>
            {confirmacao && (
              <div
                role="status"
                className="mt-8 rounded-xl border border-emerald-700 bg-black/90 p-5"
              >
                <p className="font-bold text-emerald-300">
                  {confirmacao.mensagem}
                </p>

                {confirmacao.rodaId && (
                  <Link
                    href={`/rodas/${confirmacao.rodaId}`}
                    className="mt-4 inline-block text-sm font-black text-yellow-500 hover:text-yellow-400"
                  >
                    ABRIR PERFIL DA RODA →
                  </Link>
                )}
              </div>
            )}

            {erro && (
              <p
                role="alert"
                className="mt-8 rounded-xl border border-red-800 bg-black/90 p-5 font-bold text-red-300"
              >
                {erro}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
                  INSCRIÇÕES
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {pedidos.length}{" "}
                  {pedidos.length === 1
                    ? "PEDIDO PENDENTE"
                    : "PEDIDOS PENDENTES"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => void atualizarLista()}
                disabled={!!aProcessar}
                className="rounded-xl border border-yellow-500 px-5 py-3 text-xs font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black disabled:opacity-50"
              >
                ATUALIZAR LISTA
              </button>
            </div>

            {pedidos.length === 0 ? (
              <div className="mt-6 rounded-xl border border-zinc-700 bg-black/90 p-7">
                <p className="font-bold text-zinc-300">
                  Não existem pedidos pendentes de novas rodas.
                </p>
              </div>
            ) : (
              <section
                className="mt-6 space-y-5"
                aria-label="Pedidos de novas rodas"
              >
                {pedidos.map((pedido) => (
                  <article
                    key={pedido.id}
                    className="rounded-2xl border border-yellow-500/50 bg-black/90 p-5 sm:p-7"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
                          PEDIDO PENDENTE
                        </p>

                        <h3 className="mt-3 break-words text-2xl font-black">
                          {pedido.nome_roda}
                        </h3>

                        <p className="mt-2 text-sm text-zinc-300">
                          {pedido.cidade} · {pedido.distrito}
                        </p>
                      </div>

                      <p className="text-xs text-zinc-400">
                        Recebido em{" "}
                        {formatarData(pedido.criado_em)}
                      </p>
                    </div>

                    <div className="mt-6 grid gap-5 border-t border-zinc-700 pt-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-black text-yellow-500">
                          RESPONSÁVEL
                        </p>

                        <p className="mt-2 break-words text-sm text-white">
                          {pedido.nome_responsavel}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black text-yellow-500">
                          EMAIL
                        </p>

                        <p className="mt-2 break-all text-sm text-white">
                          {pedido.email}
                        </p>
                      </div>

                      {pedido.telefone && (
                        <div>
                          <p className="text-xs font-black text-yellow-500">
                            TELEFONE
                          </p>

                          <p className="mt-2 text-sm text-white">
                            {pedido.telefone}
                          </p>
                        </div>
                      )}

                      {pedido.instagram && (
                        <div>
                          <p className="text-xs font-black text-yellow-500">
                            INSTAGRAM
                          </p>

                          <p className="mt-2 break-all text-sm text-white">
                            {pedido.instagram}
                          </p>
                        </div>
                      )}
                    </div>

                    {pedido.descricao?.trim() && (
                      <div className="mt-5 border-t border-zinc-700 pt-5">
                        <p className="text-xs font-black text-yellow-500">
                          DESCRIÇÃO DA RODA
                        </p>

                        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-zinc-300">
                          {pedido.descricao}
                        </p>
                      </div>
                    )}

                    <div className="mt-7 flex flex-wrap gap-3 border-t border-zinc-700 pt-5">
                      <button
                        type="button"
                        onClick={() =>
                          void tratarPedido(pedido, "aprovar")
                        }
                        disabled={!!aProcessar}
                        className="min-h-12 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-400 disabled:opacity-50"
                      >
                        {aProcessar === pedido.id
                          ? "A PROCESSAR..."
                          : "APROVAR RODA"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void tratarPedido(pedido, "recusar")
                        }
                        disabled={!!aProcessar}
                        className="min-h-12 rounded-xl border border-red-600 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-950/40 disabled:opacity-50"
                      >
                        RECUSAR PEDIDO
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <div className="mt-10 rounded-xl border border-zinc-700 bg-black/85 p-5 text-sm leading-relaxed text-zinc-300">
              <p className="font-black text-yellow-500">
                IMPORTANTE
              </p>

              <p className="mt-3">
                Aprovar uma nova roda cria apenas o seu
                perfil público em Rodas em Espera.
              </p>

              <p className="mt-2">
                O responsável terá de pedir acesso
                através do perfil da roda. A conta de
                organizador só será atribuída depois
                da validação desse segundo pedido.
              </p>
            </div>
          </>
        )}

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
