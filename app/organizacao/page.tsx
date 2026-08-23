"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Organizacao = {
  nome: string;
  cidade: string | null;
  distrito: string | null;
  email: string;
  telefone: string | null;
};

export default function OrganizacaoPage() {
  const router = useRouter();

  const [organizacao, setOrganizacao] = useState<Organizacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarOrganizacao() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/organizacao/login");
        return;
      }

      const { data, error } = await supabase
        .from("organizacoes")
        .select("nome, cidade, distrito, email, telefone")
        .eq("auth_user_id", user.id)
        .eq("ativa", true)
        .single();

      if (error || !data) {
        console.error("Erro ao carregar organização:", error);
        setLoading(false);
        return;
      }

      setOrganizacao(data);
      setLoading(false);
    }

    carregarOrganizacao();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="font-bold text-yellow-500">A CARREGAR...</p>
      </main>
    );
  }

  if (!organizacao) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="font-bold text-red-500">
          ORGANIZAÇÃO NÃO ENCONTRADA.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">

        <p className="text-sm font-bold tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-5xl font-black">
          PAINEL DA ORGANIZAÇÃO
        </h1>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-3xl font-black text-yellow-500">
            {organizacao.nome}
          </h2>

          <div className="mt-6 space-y-2 text-zinc-300">
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
        </div>

      </div>
    </main>
  );
}