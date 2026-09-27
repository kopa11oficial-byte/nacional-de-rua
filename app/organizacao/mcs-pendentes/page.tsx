"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mc = {
  id: string;
  nome_artistico: string;
  cidade: string | null;
  distrito: string | null;
};

export default function MCSemRegistoPage() {
  const [mcs, setMcs] = useState<Mc[]>([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [aGuardar, setAGuardar] = useState<string | null>(null);
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const {
          data: { user },
          error: erroAuth,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (erroAuth || !user) {
          window.location.href = "/organizacao/login";
          return;
        }

        const {
          data: administrador,
          error: erroAcesso,
        } = await supabase.rpc("e_administrador");

        if (!ativo) return;

        if (erroAcesso || administrador !== true) {
          setErro(
            "Esta página é exclusiva do organizador geral.",
          );
          return;
        }

        setPermitido(true);

        const { data, error } = await supabase
          .from("mcs")
          .select("id,nome_artistico,cidade,distrito")
          .eq("por_confirmar", true)
          .order("nome_artistico");

        if (!ativo) return;

        if (error) {
          setErro(
            "Não foi possível carregar os MCs: " + error.message,
          );
          return;
        }

        setMcs(data ?? []);
      } catch (falha) {
        if (ativo) {
          console.error("Erro ao carregar MCs:", falha);
          setErro(
            "Não foi possível carregar os MCs. Tenta novamente.",
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  async function confirmar(mc: Mc) {
    if (aGuardar) return;

    const aceite = window.confirm(
      `Confirmar o MC «${mc.nome_artistico}»? Confere primeiro se já não existe outro perfil para o mesmo MC.`,
    );

    if (!aceite) return;

    setAGuardar(mc.id);
    setErro("");

    try {
      const { data, error } = await supabase
        .from("mcs")
        .update({ por_confirmar: false })
        .eq("id", mc.id)
        .select("id")
        .single();

      if (error || !data) {
        setErro(
          error?.message ??
            "Não foi possível confirmar o MC.",
        );
        return;
      }

      setMcs((atuais) =>
        atuais.filter((item) => item.id !== mc.id),
      );
    } catch (falha) {
      console.error("Erro ao confirmar MC:", falha);
      setErro(
        "Não foi possível confirmar o MC. Tenta novamente.",
      );
    } finally {
      setAGuardar(null);
    }
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

        <p className="mt-10 text-xs font-black tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-4xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl md:text-6xl">
          MCs <span className="text-yellow-500">SEM REGISTO</span>
        </h1>

        <p className="mt-4 text-sm text-zinc-200 sm:text-base">
          MCs adicionados pelas rodas durante o registo de uma edição.
          Confirma apenas depois de verificares os dados.
        </p>

        {erro && (
          <p
            role="alert"
            className="mt-6 break-words rounded-xl border border-red-800 bg-black/90 p-5 text-red-300"
          >
            {erro}
          </p>
        )}

        {loading && (
          <p className="mt-8 rounded-xl border border-zinc-700 bg-black/90 p-5 font-bold text-yellow-500">
            A CARREGAR...
          </p>
        )}

        {!loading && permitido && mcs.length === 0 && !erro && (
          <p className="mt-8 rounded-xl border border-zinc-700 bg-black/90 p-5 text-zinc-200">
            Não há MCs por confirmar.
          </p>
        )}

        {!loading && permitido && mcs.length > 0 && (
          <div className="mt-8 space-y-4">
            {mcs.map((mc) => (
              <article
                key={mc.id}
                className="rounded-xl border border-zinc-700 bg-black/90 p-5 sm:p-6"
              >
                <h2 className="break-words text-xl font-black">
                  {mc.nome_artistico}{" "}
                  <span className="text-sm font-bold text-yellow-500">
                    (sem registo)
                  </span>
                </h2>

                <p className="mt-2 text-sm text-zinc-300">
                  {[mc.cidade, mc.distrito]
                    .filter(Boolean)
                    .join(" · ") ||
                    "Localização não indicada"}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/mcs/${mc.id}`}
                    className="rounded-lg border border-yellow-500 bg-black px-4 py-3 text-center text-sm font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
                  >
                    VER PERFIL
                  </Link>

                  <button
                    type="button"
                    disabled={aGuardar !== null}
                    onClick={() => confirmar(mc)}
                    className="rounded-lg border border-emerald-500 bg-black px-4 py-3 text-center text-sm font-black text-emerald-300 transition hover:bg-emerald-950 disabled:opacity-50"
                  >
                    {aGuardar === mc.id
                      ? "A GUARDAR..."
                      : "CONFIRMAR MC"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}