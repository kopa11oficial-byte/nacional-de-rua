"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { consultarTodas } from "../../lib/consultar-todas";

type Organizacao = {
  nome: string;
  cidade: string | null;
  distrito: string | null;
  email: string;
  telefone: string | null;
};

type MC = {
  id: string;
  nome_artistico: string;
  cidade: string | null;
  distrito: string | null;
};

export default function OrganizacaoPage() {
  const router = useRouter();

  const [organizacao, setOrganizacao] = useState<Organizacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aTerminarSessao, setATerminarSessao] = useState(false);
  const [erroSaida, setErroSaida] = useState("");
  const [administrador, setAdministrador] = useState(false);

  const [mcs, setMcs] = useState<MC[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [mcId, setMcId] = useState("");
  const [nomeArtistico, setNomeArtistico] = useState("");
  const [cidade, setCidade] = useState("");
  const [distrito, setDistrito] = useState("");
  const [aGuardarMC, setAGuardarMC] = useState(false);
  const [mensagemMC, setMensagemMC] = useState("");
  const [erroMC, setErroMC] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarOrganizacao() {
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

        const { data: acesso, error: erroAcesso } =
          await supabase.rpc("e_administrador");

        if (!ativo) return;

        if (erroAcesso) {
          setErro("Não foi possível verificar as permissões desta conta.");
          return;
        }

        const acessoGeral = acesso === true;
        setAdministrador(acessoGeral);

        if (acessoGeral) {
          const lista = await consultarTodas<MC>((inicio, fim) =>
            supabase
              .from("mcs")
              .select("id,nome_artistico,cidade,distrito")
              .order("id")
              .range(inicio, fim),
          );

          if (!ativo) return;

          setMcs(
            lista.sort((a, b) =>
              a.nome_artistico.localeCompare(b.nome_artistico, "pt-PT"),
            ),
          );
        }

        const { data, error } = await supabase
          .from("organizacoes")
          .select("nome,cidade,distrito,email,telefone")
          .eq("auth_user_id", user.id)
          .eq("ativa", true)
          .single();

        if (!ativo) return;

        if (error || !data) {
          console.error("Erro ao carregar organização:", error);
          setErro(
            "Não foi encontrada uma organização ativa associada a esta conta.",
          );
          return;
        }

        setOrganizacao(data);
      } catch (error) {
        if (ativo) {
          console.error("Erro ao carregar organização:", error);
          setErro("Não foi possível carregar a organização. Tenta novamente.");
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregarOrganizacao();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function terminarSessao() {
    if (aTerminarSessao) return;

    setErroSaida("");
    setATerminarSessao(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErroSaida("Não foi possível terminar a sessão. Tenta novamente.");
      setATerminarSessao(false);
      return;
    }

    router.replace("/organizacao/login");
    router.refresh();
  }

  function escolherMC(id: string) {
    setMcId(id);
    setMensagemMC("");
    setErroMC("");

    const mc = mcs.find((item) => item.id === id);

    setNomeArtistico(mc?.nome_artistico ?? "");
    setCidade(mc?.cidade ?? "");
    setDistrito(mc?.distrito ?? "");
  }

  async function guardarMC(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroMC("");
    setMensagemMC("");

    if (!administrador || !mcId || !nomeArtistico.trim()) {
      setErroMC("Seleciona um MC e indica o nome artístico.");
      return;
    }

    setAGuardarMC(true);

    try {
      const { error } = await supabase.rpc("editar_perfil_mc", {
        p_mc_id: mcId,
        p_nome_artistico: nomeArtistico.trim(),
        p_cidade: cidade.trim(),
        p_distrito: distrito.trim(),
      });

      if (error) {
        setErroMC(error.message);
        return;
      }

      setMcs((lista) =>
        lista
          .map((mc) =>
            mc.id === mcId
              ? {
                  ...mc,
                  nome_artistico: nomeArtistico.trim(),
                  cidade: cidade.trim() || null,
                  distrito: distrito.trim() || null,
                }
              : mc,
          )
          .sort((a, b) =>
            a.nome_artistico.localeCompare(b.nome_artistico, "pt-PT"),
          ),
      );

      setMensagemMC("Perfil atualizado.");
    } catch (error) {
      console.error("Erro ao guardar MC:", error);
      setErroMC("Não foi possível guardar o perfil. Tenta novamente.");
    } finally {
      setAGuardarMC(false);
    }
  }

  const mcsVisiveis = mcs.filter((mc) =>
    mc.nome_artistico
      .toLocaleLowerCase("pt-PT")
      .includes(pesquisa.trim().toLocaleLowerCase("pt-PT")),
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="font-bold text-yellow-500">A CARREGAR...</p>
      </main>
    );
  }

  if (!organizacao) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <p className="font-bold text-red-400">
          {erro || "ORGANIZAÇÃO NÃO ENCONTRADA."}
        </p>

        <Link
          href="/organizacao/login"
          className="font-bold text-yellow-500"
        >
          ← VOLTAR AO LOGIN
        </Link>
      </main>
    );
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

      <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-black tracking-[0.3em] text-yellow-500 sm:text-sm">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl">
          PAINEL DA <span className="text-yellow-500">ORGANIZAÇÃO</span>
        </h1>

        <button
          type="button"
          onClick={terminarSessao}
          disabled={aTerminarSessao}
          className="mt-6 rounded-xl border border-zinc-600 bg-black/90 px-5 py-3 text-sm font-bold text-white transition hover:border-yellow-500 hover:text-yellow-500 disabled:opacity-50"
        >
          {aTerminarSessao ? "A TERMINAR SESSÃO..." : "TERMINAR SESSÃO"}
        </button>

        {erroSaida && (
          <p role="alert" className="mt-3 text-sm font-bold text-red-400">
            {erroSaida}
          </p>
        )}

        <section className="mt-10 rounded-2xl border border-zinc-700 bg-black/90 p-6 sm:p-8">
          <h2 className="break-words text-2xl font-black text-yellow-500 sm:text-3xl">
            {organizacao.nome}
          </h2>

          <div className="mt-6 space-y-2 break-words text-sm text-zinc-200 sm:text-base">
            <p>
              <strong>Email:</strong> {organizacao.email}
            </p>
            <p>
              <strong>Cidade:</strong> {organizacao.cidade || "—"}
            </p>
            <p>
              <strong>Distrito:</strong> {organizacao.distrito || "—"}
            </p>
            <p>
              <strong>Telefone:</strong> {organizacao.telefone || "—"}
            </p>
          </div>
        </section>

        <Link
          href="/organizacao/nova-edicao"
          className="mt-8 block w-full rounded-xl bg-yellow-500 px-5 py-4 text-center text-sm font-black text-black transition hover:bg-yellow-400 sm:px-6 sm:text-base"
        >
          REGISTAR NOVA EDIÇÃO
        </Link>

        {administrador && (
          <p className="mt-6 rounded-xl border border-yellow-500/50 bg-black/90 p-4 text-sm text-yellow-400">
            Acesso de organizador geral ativo. Em «Registar nova edição»
            podes escolher qualquer roda; em «Gerir edição» vês as edições
            de todas as organizações.
          </p>
        )}

        {administrador && (
          <Link
            href="/organizacao/mcs-pendentes"
            className="mt-4 block w-full rounded-xl border border-yellow-500 bg-black/90 px-5 py-4 text-center text-sm font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black sm:px-6 sm:text-base"
          >
            MCs SEM REGISTO · MANUTENÇÃO
          </Link>
        )}

        {administrador && (
          <section
            id="editar-mc"
            className="mt-8 rounded-2xl border border-zinc-700 bg-black/90 p-5 sm:p-6"
          >
            <h2 className="text-2xl font-black text-yellow-500">
              EDITAR PERFIL DE MC
            </h2>

            <p className="mt-2 text-sm text-zinc-300">
              Corrige o nome artístico e a localização. Os pontos e as
              batalhas mantêm-se ligados ao mesmo MC.
            </p>

            <label
              htmlFor="pesquisa-mc"
              className="mt-6 block text-sm font-bold"
            >
              PROCURAR MC
            </label>

            <input
              id="pesquisa-mc"
              type="search"
              value={pesquisa}
              onChange={(evento) => setPesquisa(evento.target.value)}
              placeholder="Escreve o nome artístico"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
            />

            <label
              htmlFor="escolher-mc"
              className="mt-5 block text-sm font-bold"
            >
              SELECIONAR MC
            </label>

            <select
              id="escolher-mc"
              value={mcId}
              onChange={(evento) => escolherMC(evento.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-500"
            >
              <option value="">Seleciona um MC</option>

              {mcsVisiveis.map((mc) => (
                <option key={mc.id} value={mc.id}>
                  {mc.nome_artistico}
                </option>
              ))}

              {mcId && !mcsVisiveis.some((mc) => mc.id === mcId) && (
                <option value={mcId}>
                  {mcs.find((mc) => mc.id === mcId)?.nome_artistico}
                </option>
              )}
            </select>

            {mcId && (
              <form onSubmit={guardarMC} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="nome-mc" className="block text-sm font-bold">
                    NOME ARTÍSTICO
                  </label>

                  <input
                    id="nome-mc"
                    required
                    value={nomeArtistico}
                    onChange={(evento) =>
                      setNomeArtistico(evento.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="cidade-mc"
                      className="block text-sm font-bold"
                    >
                      CIDADE
                    </label>

                    <input
                      id="cidade-mc"
                      value={cidade}
                      onChange={(evento) => setCidade(evento.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="distrito-mc"
                      className="block text-sm font-bold"
                    >
                      DISTRITO
                    </label>

                    <input
                      id="distrito-mc"
                      value={distrito}
                      onChange={(evento) => setDistrito(evento.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                {erroMC && (
                  <p role="alert" className="text-sm font-bold text-red-400">
                    {erroMC}
                  </p>
                )}

                {mensagemMC && (
                  <p role="status" className="text-sm font-bold text-green-400">
                    {mensagemMC}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={aGuardarMC}
                  className="w-full rounded-xl bg-yellow-500 px-6 py-3 font-black text-black transition hover:bg-yellow-400 disabled:opacity-50 sm:w-auto"
                >
                  {aGuardarMC ? "A GUARDAR..." : "GUARDAR PERFIL"}
                </button>
              </form>
            )}
          </section>
        )}

        <nav className="mt-4 grid gap-4" aria-label="Opções da organização">
          <Link
            href="/ranking"
            className="block w-full rounded-xl border border-zinc-600 bg-black/90 px-5 py-4 text-center text-sm font-black text-white transition hover:border-yellow-500 sm:px-6 sm:text-base"
          >
            CONSULTAR RANKING NACIONAL
          </Link>

          <Link
            href="/mcs"
            className="block w-full rounded-xl border border-zinc-600 bg-black/90 px-5 py-4 text-center text-sm font-black text-white transition hover:border-yellow-500 sm:px-6 sm:text-base"
          >
            CONSULTAR MCs
          </Link>

          <Link
            href="/rodas"
            className="block w-full rounded-xl border border-zinc-600 bg-black/90 px-5 py-4 text-center text-sm font-black text-white transition hover:border-yellow-500 sm:px-6 sm:text-base"
          >
            CONSULTAR RANKINGS DAS RODAS
          </Link>

          <Link
            href="/organizacao/gerir-edicao"
            className="block w-full rounded-xl border border-yellow-500 bg-black/90 px-5 py-4 text-center text-sm font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black sm:px-6 sm:text-base"
          >
            GERIR EDIÇÃO
          </Link>
        </nav>

        <p className="mt-14 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}