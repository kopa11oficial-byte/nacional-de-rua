"use client";

import Link from "next/link";
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
  const [erro, setErro] = useState("");
  const [administrador, setAdministrador] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarOrganizacao() {
      try {
        const { data: { user }, error: erroAuth } = await supabase.auth.getUser();
        if (!ativo) return;

        if (erroAuth || !user) {
          router.replace("/organizacao/login");
          return;
        }

        const { data: acesso, error: erroAcesso } = await supabase.rpc("e_administrador");
        if (erroAcesso) {
          setErro("Não foi possível verificar as permissões desta conta.");
          return;
        }
        if (ativo) setAdministrador(acesso === true);

        const { data, error } = await supabase
          .from("organizacoes")
          .select("nome,cidade,distrito,email,telefone")
          .eq("auth_user_id", user.id)
          .eq("ativa", true)
          .single();

        if (!ativo) return;
        if (error || !data) {
          console.error("Erro ao carregar organização:", error);
          setErro("Não foi encontrada uma organização ativa associada a esta conta.");
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
    return () => { ativo = false; };
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <p className="font-bold text-red-500">{erro || "ORGANIZAÇÃO NÃO ENCONTRADA."}</p>
        <Link href="/organizacao/login" className="font-bold text-yellow-500">
          ← VOLTAR AO LOGIN
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-bold tracking-[0.3em] text-yellow-500">
          NACIONAL DE RUA
        </p>
        <h1 className="mt-3 text-5xl font-black">PAINEL DA ORGANIZAÇÃO</h1>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-3xl font-black text-yellow-500">{organizacao.nome}</h2>
          <div className="mt-6 space-y-2 text-zinc-300">
            <p><strong>Email:</strong> {organizacao.email}</p>
            <p><strong>Cidade:</strong> {organizacao.cidade || "—"}</p>
            <p><strong>Distrito:</strong> {organizacao.distrito || "—"}</p>
            <p><strong>Telefone:</strong> {organizacao.telefone || "—"}</p>
          </div>
        </div>

        <Link
          href="/organizacao/nova-edicao"
          className="mt-8 block w-full rounded-xl bg-yellow-500 px-6 py-4 text-center text-base font-black text-black transition hover:bg-yellow-400"
        >
          REGISTAR NOVA EDIÇÃO
        </Link>
        {administrador && (
          <p className="mt-6 rounded-xl border border-yellow-500/50 p-4 text-sm text-yellow-500">
            Acesso de organizador geral ativo. Em «Registar nova edição» podes escolher qualquer roda; em «Gerir edição» vês as edições de todas as organizações.
          </p>
        )}
        {administrador && <Link href="/organizacao/mcs-pendentes" className="mt-4 block w-full rounded-xl border border-yellow-500 px-6 py-4 text-center text-base font-black text-yellow-500">MCs SEM REGISTO · MANUTENÇÃO</Link>}
        <Link href="/ranking" className="mt-4 block w-full rounded-xl border border-zinc-700 px-6 py-4 text-center text-base font-black text-white hover:border-yellow-500">CONSULTAR RANKING NACIONAL</Link>
        <Link href="/rodas" className="mt-4 block w-full rounded-xl border border-zinc-700 px-6 py-4 text-center text-base font-black text-white hover:border-yellow-500">CONSULTAR RANKINGS DAS RODAS</Link>
        <Link
          href="/organizacao/gerir-edicao"
          className="mt-4 block w-full rounded-xl border border-yellow-500 px-6 py-4 text-center text-base font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
        >
          GERIR EDIÇÃO
        </Link>
      </div>
    </main>
  );
}
