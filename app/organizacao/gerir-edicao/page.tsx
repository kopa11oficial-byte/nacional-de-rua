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

        const { data: organizacao, error: erroOrganizacao } = await comLimite(
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
    router.push("/organizacao/apontamentos");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/organizacao"
          className="mb-10 inline-block font-bold text-yellow-500"
        >
          ← VOLTAR AO PAINEL
        </Link>

        <p className="mb-2 text-xs font-black tracking-[0.35em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mb-3 text-5xl font-black">
          GERIR <span className="text-yellow-500">EDIÇÃO</span>
        </h1>

        <p className="mb-10 text-gray-400">
          Seleciona a edição cujos apontamentos queres gerir.
        </p>

        {loading ? (
          <p className="font-bold text-yellow-500">
            A CARREGAR…{" "}
            <span className="font-normal text-gray-400">{etapa}</span>
          </p>
        ) : erro ? (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-8 text-red-300">
            <p>{erro}</p>

            <button
              type="button"
              onClick={repetir}
              className="mt-5 rounded-lg border border-red-400 px-4 py-2 font-bold hover:bg-red-900/40"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        ) : edicoes.length === 0 ? (
          <div className="rounded-xl border border-gray-800 p-8">
            <p className="font-bold text-gray-400">
              Ainda não existem edições registadas nesta organização.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {edicoes.map((edicao) => (
              <button
                key={edicao.id}
                type="button"
                onClick={() => abrirEdicao(edicao.id)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-800 bg-[#08090b] p-6 text-left transition hover:border-yellow-500"
              >
                <div>
                  <h2 className="text-xl font-black text-white">
                    {edicao.nome}
                  </h2>

                  {administrador && (
                    <p className="mt-1 text-sm text-yellow-500">
                      {organizacoes.find(
                        (org) => org.id === edicao.organizacao_id,
                      )?.nome ?? "Organização"}
                    </p>
                  )}

                  {administrador &&
                    edicao.data_edicao &&
                    !edicao.data_submissao &&
                    Date.now() >
                      new Date(
                        `${edicao.data_edicao}T00:00:00`,
                      ).getTime() +
                        48 * 60 * 60 * 1000 && (
                      <p className="mt-2 text-xs font-bold text-red-300">
                        Registo por submeter · prazo de 48 horas terminado
                      </p>
                    )}

                  <p className="mt-2 text-sm text-gray-400">
                    {formatarData(edicao.data_edicao)}
                    {edicao.formato ? ` · ${edicao.formato}` : ""}
                  </p>
                </div>

                <span className="text-2xl font-black text-yellow-500">
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-16 text-center text-xs tracking-[0.35em] text-gray-700">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}