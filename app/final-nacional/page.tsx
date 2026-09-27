"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Finalista = {
  posicao: number;
  mc_id: string;
  nome: string;
};

type Registo = {
  posicao: number;
  mc_id: string;
};

type MC = {
  id: string;
  nome_artistico: string;
};

const anos = Array.from(
  { length: Math.max(1, new Date().getFullYear() - 2026) },
  (_, indice) => 2027 + indice,
).reverse();

export default function FinalNacionalPage() {
  const [ano, setAno] = useState(() =>
    Math.max(2027, new Date().getFullYear()),
  );
  const [finalistas, setFinalistas] = useState<Finalista[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setACarregar(true);
      setErro("");
      setFinalistas([]);

      try {
        const resposta = await supabase
          .from("finalistas_nacionais")
          .select("posicao,mc_id")
          .eq("ano", ano)
          .order("posicao");

        if (resposta.error) throw resposta.error;

        const registos = (resposta.data ?? []) as Registo[];

        if (registos.length === 0) return;

        if (registos.length !== 16) {
          throw new Error("A lista de finalistas está incompleta.");
        }

        const mcsResposta = await supabase
          .from("mcs")
          .select("id,nome_artistico")
          .in(
            "id",
            registos.map((registo) => registo.mc_id),
          );

        if (mcsResposta.error) throw mcsResposta.error;

        const nomes = new Map(
          ((mcsResposta.data ?? []) as MC[]).map((mc) => [
            mc.id,
            mc.nome_artistico,
          ]),
        );

        if (nomes.size !== 16) {
          throw new Error("Não foi possível carregar todos os MCs.");
        }

        if (ativo) {
          setFinalistas(
            registos.map((registo) => ({
              ...registo,
              nome: nomes.get(registo.mc_id) ?? "",
            })),
          );
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar os finalistas.",
          );
        }
      } finally {
        if (ativo) setACarregar(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [ano]);

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/25"
      />

      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/ranking"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VER RANKING NACIONAL
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500 sm:text-sm">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.04em] drop-shadow-[3px_4px_0_#000] sm:text-6xl md:text-7xl">
            <span className="text-white">FINAL </span>
            <span className="text-yellow-500">NACIONAL</span>
          </h1>

          <p className="mt-5 text-sm text-zinc-200 sm:text-base">
            Os 16 apurados pelo ranking nacional.
          </p>
        </header>

        <label
          htmlFor="ano-final"
          className="mt-10 block text-xs font-black uppercase text-zinc-200"
        >
          ANO DA FINAL
        </label>

        <select
          id="ano-final"
          value={ano}
          onChange={(evento) => setAno(Number(evento.target.value))}
          className="mt-2 rounded-md border border-zinc-600 bg-zinc-950 px-4 py-3 text-white"
        >
          {anos.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>

        {aCarregar && (
          <p className="mt-10 font-bold text-yellow-500">
            A CARREGAR...
          </p>
        )}

        {!aCarregar && erro && (
          <p
            role="alert"
            className="mt-10 rounded-md border border-red-800 bg-black/90 p-5 text-red-300"
          >
            {erro}
          </p>
        )}

        {!aCarregar && !erro && finalistas.length === 0 && (
          <section className="mt-10 rounded-md border border-zinc-700 bg-black/90 p-6">
            <h2 className="text-xl font-black">
              APURAMENTO EM CURSO
            </h2>

            <p className="mt-3 text-zinc-200">
              A lista oficial de {ano} será publicada depois de o
              administrador geral validar os 16 primeiros do ranking
              anual.
            </p>

            <Link
              href="/ranking"
              className="mt-5 inline-block font-bold text-yellow-500 hover:text-yellow-400"
            >
              CONSULTAR CLASSIFICAÇÃO PROVISÓRIA →
            </Link>
          </section>
        )}

        {!aCarregar && !erro && finalistas.length === 16 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black drop-shadow-[2px_2px_0_#000]">
              16 FINALISTAS · {ano}
            </h2>

            <div className="mt-5 overflow-hidden rounded-md border border-zinc-700 bg-black/90">
              {finalistas.map((mc, index) => (
                <Link
                  key={mc.mc_id}
                  href={`/mcs/${mc.mc_id}`}
                  className={`flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-900/90 sm:gap-6 ${
                    index > 0 ? "border-t border-zinc-800" : ""
                  }`}
                >
                  <span className="w-10 shrink-0 font-black text-yellow-500 sm:w-12">
                    {mc.posicao}º
                  </span>

                  <span className="min-w-0 break-words font-bold text-white">
                    {mc.nome}
                  </span>

                  <span
                    aria-hidden="true"
                    className="ml-auto shrink-0 font-black text-yellow-500"
                  >
                    ↗
                  </span>
                </Link>
              ))}
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