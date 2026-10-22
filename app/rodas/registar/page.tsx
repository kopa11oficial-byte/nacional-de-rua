
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegistarRodaPage() {
  const [nomeRoda, setNomeRoda] = useState("");
  const [cidade, setCidade] = useState("");
  const [distrito, setDistrito] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [descricao, setDescricao] = useState("");

  const [aEnviar, setAEnviar] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  const campo =
    "mt-2 w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500 disabled:opacity-50";

  async function registar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (aEnviar || enviado) return;

    setErro("");

    const dados = {
      p_nome_roda: nomeRoda.trim(),
      p_cidade: cidade.trim(),
      p_distrito: distrito.trim(),
      p_nome_responsavel: responsavel.trim(),
      p_email: email.trim().toLowerCase(),
      p_telefone: telefone.trim() || null,
      p_instagram: instagram.trim() || null,
      p_descricao: descricao.trim() || null,
    };

    if (
      !dados.p_nome_roda ||
      !dados.p_cidade ||
      !dados.p_distrito ||
      !dados.p_nome_responsavel ||
      !dados.p_email
    ) {
      setErro("Preenche todos os campos obrigatórios.");
      return;
    }

    setAEnviar(true);

    try {
      const { error } = await supabase.rpc(
        "pedir_registo_nova_roda",
        dados,
      );

      if (error) {
        console.error(
          "Erro ao solicitar registo da roda:",
          error,
        );

        if (
          error.message
            .toLowerCase()
            .includes("já existe")
        ) {
          setErro(
            "Esta roda já está registada ou tem um pedido em análise. Consulta a lista de rodas ou contacta o Suporte Geral.",
          );
        } else {
          setErro(
            "Não foi possível enviar o pedido. Confirma os dados e tenta novamente.",
          );
        }

        return;
      }

      setEnviado(true);
    } catch (falha) {
      console.error(
        "Falha ao registar nova roda:",
        falha,
      );

      setErro(
        "Ocorreu um erro ao enviar o pedido. Tenta novamente.",
      );
    } finally {
      setAEnviar(false);
    }
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
        className="absolute inset-0 bg-black/70"
      />

      <div className="relative mx-auto max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/rodas"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR ÀS RODAS
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            IMPROVISO MADE IN PORTUGAL
          </p>

          <h1 className="mt-4 text-4xl font-black uppercase leading-tight sm:text-5xl">
            REGISTAR
            <br />
            <span className="text-yellow-500">
              NOVA RODA
            </span>
          </h1>

          <p className="mt-5 text-sm leading-relaxed text-zinc-300 sm:text-base">
            A tua roda ainda não faz parte do Nacional de Rua?
            Preenche o formulário e envia o pedido ao
            Suporte Geral IMIP.
          </p>

          <p className="mt-4 text-sm text-zinc-300">
            Se a tua roda já está registada, utiliza
            o botão de pedido de acesso no respetivo
            perfil público.
          </p>
        </header>

        {enviado ? (
          <section
            role="status"
            className="mt-10 rounded-2xl border border-emerald-600/60 bg-black/90 p-7"
          >
            <h2 className="text-2xl font-black text-emerald-300">
              PEDIDO ENVIADO
            </h2>

            <p className="mt-4 leading-relaxed text-zinc-200">
              O pedido de registo de{" "}
              <strong>{nomeRoda.trim()}</strong>{" "}
              foi recebido.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              O Suporte Geral IMIP irá analisar os dados.
              O envio do pedido não atribui automaticamente
              acesso de gestão.
            </p>

            <Link
              href="/rodas"
              className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400"
            >
              VOLTAR ÀS RODAS →
            </Link>
          </section>
        ) : (
          <form
            onSubmit={registar}
            className="mt-10 space-y-6 rounded-2xl border border-zinc-700 bg-black/90 p-5 sm:p-8"
          >
            <div>
              <p className="text-xs font-black tracking-[0.25em] text-yellow-500">
                DADOS DA RODA
              </p>
            </div>

            <div>
              <label
                htmlFor="nome-roda"
                className="text-sm font-bold"
              >
                NOME DA RODA *
              </label>

              <input
                id="nome-roda"
                type="text"
                value={nomeRoda}
                onChange={(e) => setNomeRoda(e.target.value)}
                placeholder="Ex.: Batalha do Bairro"
                required
                minLength={2}
                maxLength={150}
                disabled={aEnviar}
                className={campo}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cidade-roda"
                  className="text-sm font-bold"
                >
                  CIDADE / LOCALIDADE *
                </label>

                <input
                  id="cidade-roda"
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  required
                  maxLength={120}
                  disabled={aEnviar}
                  className={campo}
                />
              </div>

              <div>
                <label
                  htmlFor="distrito-roda"
                  className="text-sm font-bold"
                >
                  DISTRITO / REGIÃO *
                </label>

                <input
                  id="distrito-roda"
                  type="text"
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  required
                  maxLength={120}
                  disabled={aEnviar}
                  className={campo}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="instagram-roda"
                className="text-sm font-bold"
              >
                INSTAGRAM DA RODA (OPCIONAL)
              </label>

              <input
                id="instagram-roda"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@nomedaroda ou link do perfil"
                maxLength={300}
                disabled={aEnviar}
                className={campo}
              />
            </div>

            <div>
              <label
                htmlFor="descricao-roda"
                className="text-sm font-bold"
              >
                DESCRIÇÃO (OPCIONAL)
              </label>

              <textarea
                id="descricao-roda"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Conta-nos um pouco sobre a tua roda..."
                maxLength={2000}
                rows={4}
                disabled={aEnviar}
                className={campo}
              />
            </div>

            <div className="border-t border-zinc-700 pt-7">
              <p className="text-xs font-black tracking-[0.25em] text-yellow-500">
                DADOS DO RESPONSÁVEL
              </p>
            </div>

            <div>
              <label
                htmlFor="responsavel-roda"
                className="text-sm font-bold"
              >
                NOME DO RESPONSÁVEL *
              </label>

              <input
                id="responsavel-roda"
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                disabled={aEnviar}
                className={campo}
              />
            </div>

            <div>
              <label
                htmlFor="email-roda"
                className="text-sm font-bold"
              >
                EMAIL DE CONTACTO *
              </label>

              <input
                id="email-roda"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.pt"
                required
                maxLength={254}
                autoComplete="email"
                disabled={aEnviar}
                className={campo}
              />
            </div>

            <div>
              <label
                htmlFor="telefone-roda"
                className="text-sm font-bold"
              >
                TELEFONE (OPCIONAL)
              </label>

              <input
                id="telefone-roda"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                maxLength={40}
                autoComplete="tel"
                disabled={aEnviar}
                className={campo}
              />
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              Os dados enviados serão utilizados para
              analisar o pedido e contactar o responsável
              no âmbito do registo da roda.
            </p>

            {erro && (
              <p
                role="alert"
                className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm font-bold text-red-300"
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={aEnviar}
              className="min-h-14 w-full rounded-xl bg-yellow-500 px-6 py-4 text-base font-black text-black transition hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-50"
            >
              {aEnviar
                ? "A ENVIAR PEDIDO..."
                : "ENVIAR PEDIDO DE REGISTO"}
            </button>

            <p className="text-center text-xs text-zinc-400">
              O acesso de organizador depende da aprovação
              do Suporte Geral IMIP.
            </p>
          </form>
        )}

        <footer className="mt-12 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
