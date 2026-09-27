"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Edicao = {
  id: string;
  nome: string;
  data_edicao: string | null;
  formato: string | null;
  organizacao_id: string;
  data_submissao: string | null;
};

type Organizacao = {
  id: string;
  nome: string;
};

async function comLimite<T>(
  operacao: PromiseLike<T>,
  etapa: string,
  segundos = 12,
): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operacao),
      new Promise<never>((_, rejeitar) => {
        temporizador = setTimeout(
          () => rejeitar(new Error(`Tempo esgotado ao ${etapa}.`)),
          segundos * 1000,
        );
      }),
    ]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

function formatarData(data: string | null) {
  if (!data) return "Data não definida";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function GerirEdicaoPage() {
  const router = useRouter();

  const [edicoes, setEdicoes] = useState<Edicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [etapa, setEtapa] = useState("verificar a sessão");
  const [erro, setErro] = useState("");
  const [administrador, setAdministrador] = useState(false);
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [tentativa, setTentativa] = useState(0);
  const [agora, setAgora] = useState<number | null>(null);

  const repetir = useCallback(() => {
    setTentativa((anterior) => anterior + 1);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarEdicoes() {
      setLoading(true);
      setErro("");
      setEtapa("verificar a sessão");

      try {
        const {
          data: { user },
          error: erroAuth,
        } = await comLimite(
          supabase.auth.getUser(),
          "verificar a sessão",
        );

        if (!ativo) return;

        if (erroAuth) {
          throw new Error(`Sessão: ${erroAuth.message}`);
        }

        if (!user) {
          router.replace("/organizacao/login");
          return;
        }

        setEtapa("verificar as permissões");

        const { data: acesso, error: erroAcesso } = await comLimite(
          supabase.rpc("e_administrador"),
          "verificar as permissões",
        );

        if (!ativo) return;

        if (erroAcesso) {
          throw new Error(`Permissões: ${erroAcesso.message}`);
        }

        const acessoGeral = acesso === true;
        setAdministrador(acessoGeral);
        setEtapa("procurar a organização");

        const { data: organizacao, error: erroOrganizacao } =
          await comLimite(
            supabase
              .from("organizacoes")
              .select("id")
              .eq("auth_user_id", user.id)
              .eq("ativa", true)
              .single(),
            "procurar a organização",
          );

        if (!ativo) return;

        if (erroOrganizacao || !organizacao) {
          throw new Error(
            erroOrganizacao
              ? `Organização: ${erroOrganizacao.message}`
              : "Não foi encontrada uma organização ativa associada a esta conta.",
          );
        }

        if (acessoGeral) {
          setEtapa("carregar as organizações");

          const { data: todas, error: erroTodas } = await comLimite(
            supabase
              .from("organizacoes")
              .select("id,nome")
              .eq("ativa", true),
            "carregar as organizações",
          );

          if (!ativo) return;

          if (erroTodas) {
            throw new Error(`Organizações: ${erroTodas.message}`);
          }

          setOrganizacoes(todas ?? []);
        }

        setEtapa("carregar as edições");

        let consulta = supabase
          .from("edicoes")
          .select(
            "id,nome,data_edicao,formato,organizacao_id,data_submissao",
          );

        if (!acessoGeral) {
          consulta = consulta.eq("organizacao_id", organizacao.id);
        }

        const { data, error } = await comLimite(
          consulta.order("data_edicao", { ascending: false }),
          "carregar as edições",
        );

        if (!ativo) return;

        if (error) {
          throw new Error(`Edições: ${error.message}`);
        }

        setEdicoes(data ?? []);
        setAgora(Date.now());
      } catch (falha) {
        if (!ativo) return;

        console.error("Erro ao carregar edições:", falha);
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar as edições.",
        );
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregarEdicoes();

    return () => {
      ativo = false;
    };
  }, [router, tentativa]);

  function abrirEdicao(id: string) {
    localStorage.setItem("edicaoId", id);
    router.push("/organizacao/participantes");
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
          className="inline-block text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AO PAINEL
        </Link>

        <p className="mt-10 text-xs font-black tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-4xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl">
          GERIR <span className="text-yellow-500">EDIÇÃO</span>
        </h1>

        <p className="mt-3 text-sm text-zinc-200 sm:text-base">
          Seleciona a edição que queres gerir.
        </p>

        <div className="mt-10">
          {loading ? (
            <p className="rounded-xl border border-zinc-700 bg-black/90 p-6 font-bold text-yellow-500">
              A CARREGAR…{" "}
              <span className="font-normal text-zinc-300">{etapa}</span>
            </p>
          ) : erro ? (
            <div
              role="alert"
              className="rounded-xl border border-red-800 bg-black/90 p-6 text-red-300 sm:p-8"
            >
              <p className="break-words">{erro}</p>

              <button
                type="button"
                onClick={repetir}
                className="mt-5 rounded-lg border border-red-400 px-4 py-2 font-bold transition hover:bg-red-900/40"
              >
                TENTAR NOVAMENTE
              </button>
            </div>
          ) : edicoes.length === 0 ? (
            <div className="rounded-xl border border-zinc-700 bg-black/90 p-6 sm:p-8">
              <p className="font-bold text-zinc-300">
                Ainda não existem edições registadas nesta organização.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {edicoes.map((edicao) => {
                const prazoTerminado =
                  administrador &&
                  agora !== null &&
                  !!edicao.data_edicao &&
                  !edicao.data_submissao &&
                  agora >
                    new Date(
                      `${edicao.data_edicao}T00:00:00`,
                    ).getTime() +
                      48 * 60 * 60 * 1000;

                const nomeOrganizacao = organizacoes.find(
                  (org) => org.id === edicao.organizacao_id,
                )?.nome;

                return (
                  <button
                    key={edicao.id}
                    type="button"
                    onClick={() => abrirEdicao(edicao.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-700 bg-black/90 p-5 text-left transition hover:border-yellow-500 sm:p-6"
                  >
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-black text-white sm:text-xl">
                        {edicao.nome}
                      </h2>

                      {administrador && (
                        <p className="mt-1 break-words text-sm font-bold text-yellow-500">
                          {nomeOrganizacao ?? "Organização"}
                        </p>
                      )}

                      {prazoTerminado && (
                        <p className="mt-2 text-xs font-bold text-red-300">
                          Registo por submeter · prazo de 48 horas terminado
                        </p>
                      )}

                      <p className="mt-2 break-words text-sm text-zinc-300">
                        {formatarData(edicao.data_edicao)}
                        {edicao.formato ? ` · ${edicao.formato}` : ""}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="shrink-0 text-2xl font-black text-yellow-500"
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-16 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}