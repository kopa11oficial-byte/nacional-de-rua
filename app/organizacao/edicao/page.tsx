"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Organizacao = {
  id: string;
  nome: string;
};

type Roda = {
  id: string;
  nome: string;
};

type Epoca = {
  id: string;
  nome: string;
};

export default function NovaEdicaoPage() {
  const router = useRouter();

  const [organizacao, setOrganizacao] = useState<Organizacao | null>(null);
  const [rodas, setRodas] = useState<Roda[]>([]);
  const [epoca, setEpoca] = useState<Epoca | null>(null);

  const [rodaId, setRodaId] = useState("");
  const [nome, setNome] = useState("");
  const [dataEdicao, setDataEdicao] = useState("");
  const [formato, setFormato] = useState("normal");

  const [loading, setLoading] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    setErro("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/organizacao/login");
      return;
    }

    const { data: org, error: orgError } = await supabase
      .from("organizacoes")
      .select("id,nome")
      .eq("auth_user_id", user.id)
      .eq("ativa", true)
      .single();

    if (orgError || !org) {
      setErro("Organização não encontrada.");
      setLoading(false);
      return;
    }

    setOrganizacao(org);

    const { data: rodasData, error: rodasError } = await supabase
      .from("rodas")
      .select("id,nome")
      .eq("organizacao_id", org.id)
      .eq("ativa", true)
      .order("nome");

    if (rodasError) {
      setErro("Não foi possível carregar as rodas.");
      setLoading(false);
      return;
    }

    setRodas(rodasData ?? []);

    if (rodasData && rodasData.length === 1) {
      setRodaId(rodasData[0].id);
    }

    const { data: epocaData, error: epocaError } = await supabase
      .from("epocas")
      .select("id,nome")
      .eq("estado", "ativa")
      .order("ano", { ascending: false })
      .limit(1)
      .single();

    if (epocaError || !epocaData) {
      setErro("Não foi encontrada uma época ativa.");
      setLoading(false);
      return;
    }

    setEpoca(epocaData);
    setLoading(false);
  }

  async function guardarEdicao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSucesso("");

    if (!organizacao || !epoca || !rodaId || !nome || !dataEdicao) {
      setErro("Preenche todos os campos obrigatórios.");
      return;
    }

    setAGuardar(true);

    const { error } = await supabase.from("edicoes").insert({
      epoca_id: epoca.id,
      roda_id: rodaId,
      organizacao_id: organizacao.id,
      nome: nome.trim(),
      data_edicao: dataEdicao,
      formato,
      estado: "rascunho",
    });

    if (error) {
      console.error(error);
      setErro("Não foi possível registar a edição.");
      setAGuardar(false);
      return;
    }

    setSucesso("EDIÇÃO REGISTADA COM SUCESSO.");
    setNome("");
    setDataEdicao("");
    setFormato("normal");
    setAGuardar(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        A CARREGAR...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => router.push("/organizacao")}
          className="mb-10 text-sm font-bold text-yellow-500"
        >
          ← VOLTAR AO PAINEL
        </button>

        <p className="mb-3 text-xs font-bold tracking-[0.35em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="text-4xl font-black uppercase md:text-6xl">
          REGISTAR <span className="text-yellow-500">EDIÇÃO</span>
        </h1>

        {organizacao && (
          <p className="mt-4 text-zinc-400">
            Organização:{" "}
            <span className="font-bold text-white">{organizacao.nome}</span>
          </p>
        )}

        {epoca && (
          <p className="mt-1 text-zinc-400">
            Época: <span className="font-bold text-white">{epoca.nome}</span>
          </p>
        )}

        <form
          onSubmit={guardarEdicao}
          className="mt-10 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-bold">RODA</label>

            <select
              value={rodaId}
              onChange={(e) => setRodaId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-4 text-white"
              required
            >
              <option value="">Selecionar roda</option>

              {rodas.map((roda) => (
                <option key={roda.id} value={roda.id}>
                  {roda.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              NOME DA EDIÇÃO
            </label>

            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Klandestina #42"
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-4 text-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">DATA</label>

            <input
              type="date"
              value={dataEdicao}
              onChange={(e) => setDataEdicao(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-4 text-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">FORMATO</label>

            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-4 text-white"
            >
              <option value="normal">normal</option>
              <option value="WILDCARD">WILDCARD</option>
              <option value="LADO_A_VS_LADO_B">LADO A VS LADO B</option>
              <option value="MEGATRON">MEGATRON</option>
              <option value="MEGAZORD">MEGAZORD</option>
            </select>
          </div>

          {erro && (
            <p className="font-bold text-red-500">
              {erro}
            </p>
          )}

          {sucesso && (
            <p className="font-black text-green-500">
              {sucesso}
            </p>
          )}

          <button
            type="submit"
            disabled={aGuardar}
            className="w-full rounded-xl bg-yellow-500 px-6 py-4 text-lg font-black text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {aGuardar ? "A GUARDAR..." : "REGISTAR EDIÇÃO"}
          </button>
        </form>

        <p className="mt-10 text-center text-xs tracking-[0.25em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}