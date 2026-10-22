
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type AreaSuporte =
  | "jurados_arbitragem"
  | "rodas_organizacoes"
  | "mcs_participacao"
  | "ranking_resultados";

type Contagens = {
  mcs: number;
  rodas: number;
};

type Permissoes = Record<AreaSuporte, boolean>;

const permissoesVazias: Permissoes = {
  jurados_arbitragem: false,
  rodas_organizacoes: false,
  mcs_participacao: false,
  ranking_resultados: false,
};

const areas: {
  id: AreaSuporte;
  titulo: string;
  descricao: string;
  tarefas: string[];
}[] = [
  {
    id: "jurados_arbitragem",
    titulo: "JURADOS E ARBITRAGEM",
    descricao:
      "Gestão de jurados, arbitragem e acompanhamento das decisões.",
    tarefas: [
      "Gerir registos de jurados",
      "Acompanhar processos de arbitragem",
      "Registar decisões e ocorrências",
    ],
  },
  {
    id: "rodas_organizacoes",
    titulo: "RODAS E ORGANIZAÇÕES",
    descricao:
      "Registo de rodas, validação de responsáveis e gestão de acessos.",
    tarefas: [
      "Validar novas rodas",
      "Aprovar pedidos de organizadores",
      "Gerir informações dos perfis das rodas",
    ],
  },
  {
    id: "mcs_participacao",
    titulo: "MCs E PARTICIPAÇÃO",
    descricao:
      "Gestão dos perfis dos MCs e dos respetivos dados.",
    tarefas: [
      "Validar perfis de MCs",
      "Corrigir informações e identidades",
      "Acompanhar os dados de participação",
    ],
  },
  {
    id: "ranking_resultados",
    titulo: "RANKING E RESULTADOS",
    descricao:
      "Acompanhamento dos resultados e correção de inconsistências.",
    tarefas: [
      "Conferir os resultados registados",
      "Analisar inconsistências",
      "Gerir correções de resultados autorizadas",
    ],
  },
];

const cartoesGerais = [
  {
    titulo: "PEDIDOS DE ACESSO DE MCs",
    descricao:
      "Consulta, aprova ou recusa pedidos de acesso aos perfis de MC.",
    destino: "/organizacao/pedidos-mcs",
    categoria: "PEDIDOS",
    contador: "mcs" as const,
  },
  {
    titulo: "PEDIDOS DE ACESSO DE RODAS",
    descricao:
      "Consulta e trata pedidos de acesso dos organizadores às páginas das rodas.",
    destino: "/organizacao/pedidos-organizadores",
    categoria: "PEDIDOS",
    contador: "rodas" as const,
  },
  {
    titulo: "PEDIDOS DE REGISTO DE RODAS",
    descricao:
      "Consulta, aprova ou recusa pedidos de inscrição de novas rodas no IMIP.",
    destino: "/organizacao/pedidos-registo-rodas",
    categoria: "PEDIDOS",
  },
  {
    titulo: "MCs SEM REGISTO",
    descricao:
      "Valida os MCs adicionados ao site e ainda por confirmar.",
    destino: "/organizacao/mcs-pendentes",
    categoria: "MANUTENÇÃO",
  },
  {
    titulo: "EDITAR PERFIS DE MCs",
    descricao:
      "Atualiza fotografias, biografias, localização e redes sociais dos MCs.",
    destino: "/organizacao#editar-mc",
    categoria: "MANUTENÇÃO",
  },
  {
    titulo: "GERIR EDIÇÕES",
    descricao:
      "Consulta e gere edições registadas pelas organizações.",
    destino: "/organizacao/gerir-edicao",
    categoria: "GESTÃO DO SITE",
  },
  {
    titulo: "REGISTAR NOVA EDIÇÃO",
    descricao:
      "Regista uma edição de qualquer roda no site.",
    destino: "/organizacao/nova-edicao",
    categoria: "GESTÃO DO SITE",
  },
] as const;

export default function SuportePage() {
  const router = useRouter();

  const [aCarregar, setACarregar] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  const [suporteGeral, setSuporteGeral] = useState(false);

  const [permissoes, setPermissoes] =
    useState<Permissoes>(permissoesVazias);

  const [contagens, setContagens] = useState<Contagens>({
    mcs: 0,
    rodas: 0,
  });

  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarPainel() {
      setACarregar(true);
      setErro("");
      setAviso("");
      setTemAcesso(false);
      setSuporteGeral(false);
      setPermissoes(permissoesVazias);

      try {
        // Verificar a sessão.

        const {
          data: { user },
          error: erroUtilizador,
        } = await supabase.auth.getUser();

        if (!componenteAtivo) return;

        if (erroUtilizador || !user) {
          router.replace("/organizacao/login");
          return;
        }

        // Identificar o Suporte Geral IMIP.

        const {
          data: administrador,
          error: erroAdministrador,
        } = await supabase.rpc("e_administrador");

        if (!componenteAtivo) return;

        if (erroAdministrador) {
          throw new Error(
            "Não foi possível verificar as permissões do Suporte Geral.",
          );
        }

        const eSuporteGeral = administrador === true;

        setSuporteGeral(eSuporteGeral);

        if (eSuporteGeral) {
          // O Suporte Geral tem acesso às quatro áreas.

          const todasPermissoes: Permissoes = {
            jurados_arbitragem: true,
            rodas_organizacoes: true,
            mcs_participacao: true,
            ranking_resultados: true,
          };

          setPermissoes(todasPermissoes);
          setTemAcesso(true);

          // Manter as contagens do painel geral.

          const [respostaMCs, respostaRodas] =
            await Promise.all([
              supabase
                .from("pedidos_acesso_mcs")
                .select("id", {
                  count: "exact",
                  head: true,
                })
                .eq("estado", "pendente"),

              supabase
                .from("pedidos_acesso_organizacoes")
                .select("id", {
                  count: "exact",
                  head: true,
                })
                .eq("estado", "pendente"),
            ]);

          if (!componenteAtivo) return;

          setContagens({
            mcs: respostaMCs.count ?? 0,
            rodas: respostaRodas.count ?? 0,
          });

          if (
            respostaMCs.error ||
            respostaRodas.error
          ) {
            setAviso(
              "A central está disponível, mas não foi possível carregar todas as contagens.",
            );
          }

          return;
        }

        // Verificar as permissões específicas
        // dos restantes suportes nacionais.

        const respostas = await Promise.all(
          areas.map(async (area) => {
            const { data, error } = await supabase.rpc(
              "tem_permissao_suporte",
              {
                p_area: area.id,
              },
            );

            return {
              area: area.id,
              autorizado: data === true,
              error,
            };
          }),
        );

        if (!componenteAtivo) return;

        if (
          respostas.some(
            (resposta) => resposta.error,
          )
        ) {
          throw new Error(
            "Não foi possível verificar as permissões da tua área de suporte.",
          );
        }

        const permissoesUtilizador: Permissoes = {
          ...permissoesVazias,
        };

        for (const resposta of respostas) {
          permissoesUtilizador[resposta.area] =
            resposta.autorizado;
        }

        const autorizado = Object.values(
          permissoesUtilizador,
        ).some(Boolean);

        if (!autorizado) {
          throw new Error(
            "Esta central está disponível apenas para o Suporte Geral e para os suportes autorizados do IMIP.",
          );
        }

        setPermissoes(permissoesUtilizador);
        setTemAcesso(true);
      } catch (falha) {
        if (!componenteAtivo) return;

        console.error(
          "Erro ao carregar a Central de Suporte:",
          falha,
        );

        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar a Central de Suporte.",
        );
      } finally {
        if (componenteAtivo) {
          setACarregar(false);
        }
      }
    }

    void carregarPainel();

    return () => {
      componenteAtivo = false;
    };
  }, [router]);

  const areasVisiveis = areas.filter(
    (area) => permissoes[area.id],
  );

  return (
    <main className="relative min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <header className="border-b border-white/20 pb-8">
          <Link
            href="/organizacao"
            className="text-xs font-black tracking-wider text-[#e8c76c]"
          >
            ← VOLTAR AO PAINEL DA ORGANIZAÇÃO
          </Link>

          <p className="mt-8 text-xs font-black tracking-[0.2em] text-[#e8c76c]">
            IMPROVISO MADE IN PORTUGAL
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            CENTRAL DE{" "}
            <span className="text-[#e8c76c]">
              SUPORTE
            </span>
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            {suporteGeral
              ? "Administração geral do IMIP, gestão nacional e acompanhamento de todas as áreas de suporte."
              : "Área de trabalho dos suportes nacionais do IMIP, com responsabilidades e permissões específicas."}
          </p>
        </header>

        {aCarregar ? (
          <p className="mt-8 rounded-xl border border-white/15 bg-black/85 p-5 font-bold text-[#e8c76c]">
            A VALIDAR ACESSO E A CARREGAR A CENTRAL...
          </p>
        ) : !temAcesso ? (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-700 bg-black/90 p-5 text-sm font-bold text-red-300"
          >
            {erro ||
              "Não tens autorização para aceder à Central de Suporte."}
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-[#e8c76c]/40 bg-black/85 p-6">
              <p className="text-xs font-black tracking-[0.2em] text-[#e8c76c]">
                NÍVEL DE ACESSO
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {suporteGeral
                  ? "IMIP — SUPORTE GERAL"
                  : "SUPORTE NACIONAL IMIP"}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {suporteGeral
                  ? "Tens acesso à administração geral e às quatro áreas de suporte."
                  : "Tens acesso à tua área de suporte e às ferramentas autorizadas para a tua função."}
              </p>
            </section>

            {erro && (
              <p
                role="alert"
                className="mt-6 rounded-xl border border-red-700 bg-black/85 p-4 text-sm text-red-300"
              >
                {erro}
              </p>
            )}

            {aviso && (
              <p
                role="status"
                className="mt-6 rounded-xl border border-yellow-600/50 bg-black/85 p-4 text-sm text-yellow-200"
              >
                {aviso}
              </p>
            )}

            <section className="mt-10">
              <p className="text-xs font-black tracking-[0.2em] text-[#e8c76c]">
                ESTRUTURA NACIONAL
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {suporteGeral
                  ? "ÁREAS DE SUPORTE"
                  : "A TUA ÁREA DE SUPORTE"}
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {areasVisiveis.map((area) => (
                  <article
                    key={area.id}
                    className="rounded-2xl border border-white/15 border-l-4 border-l-[#e8c76c] bg-black/85 p-6"
                  >
                    <p className="text-[10px] font-black tracking-[0.2em] text-[#e8c76c]">
                      SUPORTE NACIONAL
                    </p>

                    <h3 className="mt-4 text-xl font-black">
                      {area.titulo}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                      {area.descricao}
                    </p>

                    <ul className="mt-5 space-y-2">
                      {area.tarefas.map((tarefa) => (
                        <li
                          key={tarefa}
                          className="text-sm text-zinc-300"
                        >
                          <span className="mr-2 text-[#e8c76c]">
                            •
                          </span>
                          {tarefa}
                        </li>
                      ))}
                    </ul>

                    {area.id === "rodas_organizacoes" ? (
                      <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                        <p className="text-xs font-black tracking-wider text-[#e8c76c]">
                          FERRAMENTAS DISPONÍVEIS
                        </p>

                        <Link
                          href="/organizacao/pedidos-registo-rodas"
                          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-[#e8c76c]/60 px-4 py-3 text-xs font-black tracking-wide text-[#e8c76c] transition hover:border-[#e8c76c] hover:bg-[#e8c76c]/10"
                        >
                          <span>
                            GERIR PEDIDOS DE REGISTO DE RODAS
                          </span>
                          <span aria-hidden="true">→</span>
                        </Link>

                        <Link
                          href="/organizacao/pedidos-organizadores"
                          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-[#e8c76c]/60 px-4 py-3 text-xs font-black tracking-wide text-[#e8c76c] transition hover:border-[#e8c76c] hover:bg-[#e8c76c]/10"
                        >
                          <span>
                            GERIR PEDIDOS DE ACESSO DE ORGANIZADORES
                          </span>
                          <span aria-hidden="true">→</span>
                        </Link>

                        <p className="pt-2 text-xs leading-relaxed text-zinc-400">
                          A edição dos perfis das rodas será
                          disponibilizada numa fase posterior.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-6 border-t border-white/10 pt-4 text-xs font-bold text-zinc-400">
                        FERRAMENTAS ESPECÍFICAS EM PREPARAÇÃO
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {suporteGeral && (
              <section className="mt-12">
                <p className="text-xs font-black tracking-[0.2em] text-[#e8c76c]">
                  ADMINISTRAÇÃO PRINCIPAL
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  FERRAMENTAS DO SUPORTE GERAL
                </h2>

                <p className="mt-3 max-w-3xl text-sm text-zinc-300">
                  Mantêm-se disponíveis as ferramentas de
                  gestão existentes do IMIP.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {cartoesGerais.map((cartao) => {
                    const quantidade =
                      "contador" in cartao
                        ? contagens[cartao.contador]
                        : null;

                    return (
                      <Link
                        key={cartao.titulo}
                        href={cartao.destino}
                        className="group rounded-2xl border border-white/15 border-l-4 border-l-[#e8c76c] bg-black/85 p-6 transition hover:border-[#e8c76c] hover:bg-black"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-[10px] font-black tracking-[0.2em] text-[#e8c76c]">
                            {cartao.categoria}
                          </span>

                          {quantidade !== null && (
                            <span className="min-w-9 rounded-full border border-[#e8c76c]/50 bg-[#e8c76c]/10 px-3 py-1 text-center text-sm font-black text-[#e8c76c]">
                              {quantidade}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-xl font-black text-white transition group-hover:text-[#e8c76c]">
                          {cartao.titulo}
                        </h3>

                        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                          {cartao.descricao}
                        </p>

                        <span className="mt-6 inline-block text-xs font-black tracking-wider text-[#e8c76c]">
                          ABRIR ÁREA →
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {!suporteGeral && (
              <p className="mt-10 rounded-xl border border-white/15 bg-black/80 p-5 text-sm leading-relaxed text-zinc-300">
                Esta central reconhece a tua área de suporte.
                As ferramentas disponíveis estão apresentadas
                no respetivo painel. As restantes funções serão
                adicionadas quando as suas permissões estiverem
                concluídas.
              </p>
            )}
          </>
        )}

        <footer className="mt-12 border-t border-[#e8c76c]/30 pt-5 text-center text-xs font-bold tracking-[0.25em] text-zinc-400">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
