"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Organizacao = {
  id: string;
  nome: string;
};

type Roda = {
  id: string;
  nome: string;
  organizacao_id: string;
};

type Epoca = {
  id: string;
  nome: string;
  ano: number;
};

const FORMATOS = [
  { valor: "normal", nome: "NORMAL" },
  { valor: "wildcards", nome: "WILDCARDS" },
  { valor: "lado_a_vs_lado_b", nome: "LADO A VS LADO B" },
  { valor: "megatron", nome: "MEGATRON" },
  { valor: "megazord", nome: "MEGAZORD" },
];

const campo =
  "w-full min-w-0 rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-4 text-white outline-none focus:border-yellow-500";

export default function NovaEdicaoPage() {
  const router = useRouter();

  const [organizacao, setOrganizacao] = useState<Organizacao | null>(
    null,
  );
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [administrador, setAdministrador] = useState(false);
  const [rodas, setRodas] = useState<Roda[]>([]);
  const [epoca, setEpoca] = useState<Epoca | null>(null);

  const [rodaId, setRodaId] = useState("");
  const [nome, setNome] = useState("");
  const [numeroTemporada, setNumeroTemporada] = useState("");
  const [numeroEdicao, setNumeroEdicao] = useState("");
  const [dataEdicao, setDataEdicao] = useState("");
  const [formato, setFormato] = useState("normal");

  const [loading, setLoading] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setLoading(true);
      setErro("");

      try {
        const {
          data: { user },
          error: erroAuth,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (erroAuth || !user) {
          setErro(
            "Tens de iniciar sessão para registar uma edição.",
          );
          return;
        }

        const { data: acesso, error: erroAcesso } =
          await supabase.rpc("e_administrador");

        if (!ativo) return;

        if (erroAcesso) {
          setErro(
            "Não foi possível verificar as permissões desta conta.",
          );
          return;
        }

        const acessoGeral = acesso === true;
        setAdministrador(acessoGeral);

        const { data: org, error: orgError } = await supabase
          .from("organizacoes")
          .select("id,nome")
          .eq("auth_user_id", user.id)
          .eq("ativa", true)
          .single();

        if (!ativo) return;

        if (orgError || !org) {
          console.error("Erro ao carregar organização:", orgError);
          setErro("Organização não encontrada.");
          return;
        }

        setOrganizacao(org);

        let idsOrganizacoes = [org.id];

        if (acessoGeral) {
          const { data: todas, error: erroTodas } = await supabase
            .from("organizacoes")
            .select("id,nome")
            .eq("ativa", true)
            .order("nome");

          if (!ativo) return;

          if (erroTodas) {
            setErro("Não foi possível carregar as organizações.");
            return;
          }

          setOrganizacoes(todas ?? []);
          idsOrganizacoes = (todas ?? []).map(
            (item) => item.id,
          );
        }

        const { data: rodasData, error: rodasError } =
          await supabase
            .from("rodas")
            .select("id,nome,organizacao_id")
            .in("organizacao_id", idsOrganizacoes)
            .eq("ativa", true)
            .order("nome");

        if (!ativo) return;

        if (rodasError) {
          console.error("Erro ao carregar rodas:", rodasError);
          setErro("Não foi possível carregar as rodas.");
          return;
        }

        const rodasEncontradas = rodasData ?? [];
        setRodas(rodasEncontradas);

        if (rodasEncontradas.length === 1) {
          setRodaId(rodasEncontradas[0].id);
        }

        const { data: epocaData, error: epocaError } =
          await supabase
            .from("epocas")
            .select("id,nome,ano")
            .eq("estado", "ativa")
            .order("ano", { ascending: false })
            .limit(1)
            .single();

        if (!ativo) return;

        if (epocaError || !epocaData) {
          console.error("Erro ao carregar época:", epocaError);
          setErro("Não foi encontrada uma época ativa.");
          return;
        }

        setEpoca(epocaData);
      } catch (falha) {
        if (ativo) {
          console.error("Erro ao carregar dados:", falha);
          setErro(
            "Não foi possível carregar os dados. Tenta novamente.",
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  async function registarEdicao(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    setErro("");

    if (
      !organizacao ||
      !epoca ||
      !rodaId ||
      !nome.trim() ||
      !numeroTemporada ||
      !numeroEdicao ||
      !dataEdicao ||
      !formato
    ) {
      setErro("Preenche todos os campos obrigatórios.");
      return;
    }

    const rodaSelecionada = rodas.find(
      (roda) => roda.id === rodaId,
    );

    if (
      !rodaSelecionada ||
      (!administrador &&
        rodaSelecionada.organizacao_id !== organizacao.id)
    ) {
      setErro("Seleciona uma roda válida.");
      return;
    }

    const anoDaEdicao = Number(dataEdicao.slice(0, 4));

    if (anoDaEdicao !== epoca.ano) {
      setErro(
        `A data é de ${anoDaEdicao}, mas a época ativa é ${epoca.ano}. ` +
          "Não é possível guardar uma edição na época errada.",
      );
      return;
    }

    if (
      epoca.ano >= 2027 &&
      Number(dataEdicao.slice(5, 7)) > 10
    ) {
      setErro(
        "A época oficial conta apenas edições de janeiro a outubro. " +
          "Podes registar em novembro uma edição realizada até 31 de outubro.",
      );
      return;
    }

    const temporadaConvertida = Number(numeroTemporada);
    const edicaoConvertida = Number(numeroEdicao);

    if (
      !Number.isInteger(temporadaConvertida) ||
      temporadaConvertida <= 0
    ) {
      setErro("Indica um número de temporada válido.");
      return;
    }

    if (
      !Number.isInteger(edicaoConvertida) ||
      edicaoConvertida <= 0
    ) {
      setErro("Indica um número de edição válido.");
      return;
    }

    setAGuardar(true);

    try {
      const { data: novaEdicao, error } = await supabase
        .from("edicoes")
        .insert({
          epoca_id: epoca.id,
          roda_id: rodaId,
          organizacao_id: rodaSelecionada.organizacao_id,
          nome: nome.trim(),
          numero_temporada: temporadaConvertida,
          numero_edicao: edicaoConvertida,
          data_edicao: dataEdicao,
          formato,
          estado: "rascunho",
        })
        .select("id")
        .single();

      if (error || !novaEdicao) {
        throw new Error(
          error?.message ??
            "Não foi possível registar a edição.",
        );
      }

      localStorage.setItem("edicaoId", novaEdicao.id);
      localStorage.removeItem(
        `participantesSelecionados:${novaEdicao.id}`,
      );
      localStorage.setItem(
        "novaEdicao",
        JSON.stringify({
          id: novaEdicao.id,
          nome: nome.trim(),
          numeroTemporada: temporadaConvertida,
          numeroEdicao: edicaoConvertida,
          data: dataEdicao,
          formato,
          rodaId,
        }),
      );

      router.push("/organizacao/apontamentos");
    } catch (falha) {
      console.error("Erro ao registar edição:", falha);
      setErro(
        falha instanceof Error
          ? `Erro: ${falha.message}`
          : "Não foi possível registar a edição.",
      );
      setAGuardar(false);
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

      <div className="relative mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <button
          type="button"
          onClick={() => router.push("/organizacao")}
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AO PAINEL
        </button>

        <p className="mt-10 text-xs font-black tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase leading-tight drop-shadow-[2px_3px_0_#000] sm:text-5xl md:text-6xl">
          REGISTAR <span className="text-yellow-500">EDIÇÃO</span>
        </h1>

        {loading ? (
          <p className="mt-10 rounded-xl border border-zinc-700 bg-black/90 p-6 font-black text-yellow-500">
            A CARREGAR...
          </p>
        ) : (
          <>
            {organizacao && !administrador && (
              <p className="mt-4 text-zinc-200">
                Organização:{" "}
                <span className="font-bold text-white">
                  {organizacao.nome}
                </span>
              </p>
            )}

            {epoca && (
              <p className="mt-1 text-zinc-200">
                Época:{" "}
                <span className="font-bold text-white">
                  {epoca.nome} ·{" "}
                  {epoca.ano === 2026
                    ? "TESTES"
                    : epoca.ano}
                </span>
              </p>
            )}

            <form
              onSubmit={registarEdicao}
              className="mt-10 space-y-6 rounded-2xl border border-zinc-700 bg-black/90 p-5 sm:p-8"
            >
              <div>
                <label
                  htmlFor="roda-edicao"
                  className="mb-2 block text-sm font-bold"
                >
                  RODA
                </label>

                <select
                  id="roda-edicao"
                  value={rodaId}
                  onChange={(evento) =>
                    setRodaId(evento.target.value)
                  }
                  className={campo}
                  required
                >
                  <option value="">Selecionar roda</option>

                  {rodas.map((roda) => (
                    <option key={roda.id} value={roda.id}>
                      {administrador
                        ? `${
                            organizacoes.find(
                              (org) =>
                                org.id ===
                                roda.organizacao_id,
                            )?.nome ?? "Organização"
                          } · ${roda.nome}`
                        : roda.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="nome-edicao"
                  className="mb-2 block text-sm font-bold"
                >
                  NOME DA EDIÇÃO
                </label>

                <input
                  id="nome-edicao"
                  type="text"
                  value={nome}
                  onChange={(evento) =>
                    setNome(evento.target.value)
                  }
                  placeholder="Ex.: Klandestina #42"
                  className={campo}
                  required
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="numero-temporada"
                    className="mb-2 block text-sm font-bold"
                  >
                    NÚMERO DA TEMPORADA
                  </label>

                  <input
                    id="numero-temporada"
                    type="number"
                    min="1"
                    step="1"
                    value={numeroTemporada}
                    onChange={(evento) =>
                      setNumeroTemporada(
                        evento.target.value,
                      )
                    }
                    placeholder="Ex.: 3"
                    className={campo}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="numero-edicao"
                    className="mb-2 block text-sm font-bold"
                  >
                    NÚMERO DA EDIÇÃO
                  </label>

                  <input
                    id="numero-edicao"
                    type="number"
                    min="1"
                    step="1"
                    value={numeroEdicao}
                    onChange={(evento) =>
                      setNumeroEdicao(
                        evento.target.value,
                      )
                    }
                    placeholder="Ex.: 34"
                    className={campo}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="data-edicao"
                  className="mb-2 block text-sm font-bold"
                >
                  DATA
                </label>

                <input
                  id="data-edicao"
                  type="date"
                  value={dataEdicao}
                  onChange={(evento) =>
                    setDataEdicao(evento.target.value)
                  }
                  min={
                    epoca
                      ? `${epoca.ano}-01-01`
                      : undefined
                  }
                  max={
                    epoca && epoca.ano >= 2027
                      ? `${epoca.ano}-10-31`
                      : epoca
                        ? `${epoca.ano}-12-31`
                        : undefined
                  }
                  className={campo}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="formato-edicao"
                  className="mb-2 block text-sm font-bold"
                >
                  FORMATO
                </label>

                <select
                  id="formato-edicao"
                  value={formato}
                  onChange={(evento) =>
                    setFormato(evento.target.value)
                  }
                  className={campo}
                  required
                >
                  {FORMATOS.map((opcao) => (
                    <option
                      key={opcao.valor}
                      value={opcao.valor}
                    >
                      {opcao.nome}
                    </option>
                  ))}
                </select>
              </div>

              {erro && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-800 bg-black p-4 font-bold text-red-300"
                >
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  aGuardar ||
                  !organizacao ||
                  !epoca ||
                  rodas.length === 0
                }
                className="w-full rounded-xl bg-yellow-500 px-6 py-4 text-base font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-400 sm:text-lg"
              >
                {aGuardar
                  ? "A REGISTAR..."
                  : "REGISTAR EDIÇÃO"}
              </button>
            </form>
          </>
        )}

        {!loading && erro && !organizacao && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-800 bg-black/90 p-5 font-bold text-red-300"
          >
            {erro}
          </p>
        )}

        <p className="mt-10 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}