"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  rodaId: string;
  rodaNome: string;
};

export function PedirAcessoOrganizacao({ rodaId, rodaNome }: Props) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);

  async function enviarPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem("");
    setAEnviar(true);

    try {
      const { error } = await supabase.rpc(
        "pedir_acesso_perfil_organizacao",
        {
          p_roda_id: rodaId,
          p_nome: nome.trim(),
          p_email: email.trim(),
          p_telefone: telefone.trim() || null,
        },
      );

      if (error) {
        const erro = error.message.toLowerCase();

        if (erro.includes("já existe um pedido pendente")) {
          setMensagem(
            "Já existe um pedido pendente para esta organização. O suporte irá analisá-lo.",
          );
        } else {
          setMensagem(
            "Não foi possível registar o pedido. Confirma os dados e tenta novamente.",
          );
        }

        return;
      }

      setPedidoEnviado(true);
      setMensagem(
        "Pedido registado. O suporte irá validar os dados e contactar-te por email.",
      );
      setNome("");
      setEmail("");
      setTelefone("");
    } catch {
      setMensagem(
        "Ocorreu um erro ao enviar o pedido. Tenta novamente.",
      );
    } finally {
      setAEnviar(false);
    }
  }

  function fechar() {
    setAberto(false);
    setMensagem("");
    setPedidoEnviado(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAberto(true);
          setMensagem("");
          setPedidoEnviado(false);
        }}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-yellow-500/50 bg-yellow-500 px-4 py-2 text-xs font-black text-black transition hover:bg-yellow-400"
      >
        PEDIR ACESSO DE ORGANIZADOR
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) fechar();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-pedido-acesso-organizacao"
            className="w-full max-w-md rounded-xl border border-yellow-500/40 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
                  PERFIL DA RODA
                </p>

                <h2
                  id="titulo-pedido-acesso-organizacao"
                  className="mt-2 text-xl font-black text-white"
                >
                  PEDIR ACESSO
                </h2>
              </div>

              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="rounded px-2 text-2xl leading-none text-zinc-300 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Indica os teus dados para pedir acesso de gestão ao perfil de{" "}
              <span className="font-bold text-white">{rodaNome}</span>. O
              suporte irá validar o pedido antes de conceder o acesso.
            </p>

            {pedidoEnviado ? (
              <div
                role="status"
                className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm leading-relaxed text-emerald-200"
              >
                {mensagem}
              </div>
            ) : (
              <form
                onSubmit={(evento) => void enviarPedido(evento)}
                className="mt-5"
              >
                <label
                  htmlFor="nome-pedido-acesso-organizacao"
                  className="block text-sm font-bold text-white"
                >
                  O teu nome
                </label>

                <input
                  id="nome-pedido-acesso-organizacao"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  placeholder="Nome completo"
                  className="mt-2 min-h-12 w-full rounded-lg border border-zinc-600 bg-black px-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                />

                <label
                  htmlFor="email-pedido-acesso-organizacao"
                  className="mt-4 block text-sm font-bold text-white"
                >
                  Email
                </label>

                <input
                  id="email-pedido-acesso-organizacao"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  placeholder="nome@email.com"
                  className="mt-2 min-h-12 w-full rounded-lg border border-zinc-600 bg-black px-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                />

                <label
                  htmlFor="telefone-pedido-acesso-organizacao"
                  className="mt-4 block text-sm font-bold text-white"
                >
                  Telefone <span className="font-normal text-zinc-400">(opcional)</span>
                </label>

                <input
                  id="telefone-pedido-acesso-organizacao"
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={telefone}
                  onChange={(evento) => setTelefone(evento.target.value)}
                  placeholder="Contacto telefónico"
                  className="mt-2 min-h-12 w-full rounded-lg border border-zinc-600 bg-black px-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                />

                {mensagem && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm leading-relaxed text-red-200"
                  >
                    {mensagem}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={aEnviar}
                  className="mt-5 min-h-12 w-full rounded-lg bg-yellow-500 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {aEnviar ? "A ENVIAR..." : "ENVIAR PEDIDO"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}