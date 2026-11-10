"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Resultado = {
  id: string;
  nome: string;
  detalhe: string;
  tipo: "MC" | "RODA";
  href: string;
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT").trim();
}

export default function PesquisaGlobal() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [aProcurar, setAProcurar] = useState(false);
  const [erro, setErro] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    const atual = ++pedido.current;
    const pesquisa = termo.trim();
    if (pesquisa.length < 2) {
      return;
    }

    const temporizador = setTimeout(async () => {
      setAProcurar(true);
      setErro(false);
      try {
        // A pesquisa é pública e só consulta os campos necessários dos perfis.
        const filtro = `%${pesquisa.replace(/[%_]/g, "")}%`;
        const [mcs, rodas] = await Promise.all([
          supabase.from("mcs")
            .select("id,nome_artistico,cidade,distrito")
            .ilike("nome_artistico", filtro)
            .order("nome_artistico").limit(12),
          supabase.from("rodas")
            .select("id,nome,cidade,distrito")
            .eq("ativa", true)
            .ilike("nome", filtro)
            .order("nome").limit(12),
        ]);
        if (mcs.error || rodas.error) throw new Error("Pesquisa indisponível");
        if (atual !== pedido.current) return;
        const encontrados: Resultado[] = [
          ...(mcs.data ?? []).map(mc => ({
            id: String(mc.id), nome: String(mc.nome_artistico),
            detalhe: [mc.cidade, mc.distrito].filter(Boolean).join(" · "),
            tipo: "MC" as const, href: `/mcs/${mc.id}`,
          })),
          ...(rodas.data ?? []).map(roda => ({
            id: String(roda.id), nome: String(roda.nome),
            detalhe: [roda.cidade, roda.distrito].filter(Boolean).join(" · "),
            tipo: "RODA" as const, href: `/rodas/${roda.id}`,
          })),
        ];
        encontrados.sort((a, b) =>
          Number(!normalizar(a.nome).startsWith(normalizar(pesquisa))) -
          Number(!normalizar(b.nome).startsWith(normalizar(pesquisa))) ||
          a.nome.localeCompare(b.nome, "pt")
        );
        setResultados(encontrados);
      } catch {
        if (atual === pedido.current) setErro(true);
      } finally {
        if (atual === pedido.current) setAProcurar(false);
      }
    }, 250);
    return () => clearTimeout(temporizador);
  }, [termo]);

  const alterar = (valor: string) => {
    pedido.current += 1;
    setTermo(valor);
    setResultados([]);
    setAProcurar(false);
    setErro(false);
  };

  return (
    <section aria-label="Pesquisa global de MCs e rodas" className="relative z-20 border-b border-[#d6b56d]/45 bg-[#0c1711] px-4 py-7 sm:px-8 lg:px-[5vw]">
      <div className="mx-auto max-w-[1100px]">
        <label htmlFor="pesquisa-global" className="mb-3 block text-sm font-black uppercase tracking-[0.1em] text-[#e8c778]">
          ENCONTRA UM MC OU UMA RODA
        </label>
        <div className="flex min-h-14 items-center gap-3 border border-[#d6b56d]/60 bg-[#080d0a] px-4 focus-within:border-[#f0d58e] focus-within:ring-2 focus-within:ring-[#d6b56d]/30">
          <span aria-hidden="true" className="text-xl text-[#e8c778]">⌕</span>
          <input
            id="pesquisa-global"
            type="search"
            autoComplete="off"
            value={termo}
            onChange={e => alterar(e.target.value)}
            placeholder="Pesquisa um MC ou uma roda..."
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-[#acb3a8]"
          />
        </div>
        <p className="mt-2 text-xs text-[#c0cbbd]">Escreve pelo menos 2 letras e escolhe o perfil nos resultados.</p>
        {termo.trim().length >= 2 && (
          <div className="mt-3 border border-[#d6b56d]/40 bg-[#080d0a]" aria-live="polite">
            {aProcurar && <p className="px-4 py-4 text-sm text-[#e8c778]">A procurar MCs e rodas...</p>}
            {!aProcurar && erro && <p className="px-4 py-4 text-sm text-red-200">Não foi possível pesquisar. Tenta novamente.</p>}
            {!aProcurar && !erro && resultados.length === 0 && (
              <p className="px-4 py-4 text-sm text-[#cdd3ca]">Sem resultados para esta pesquisa.</p>
            )}
            {!aProcurar && !erro && resultados.map(item => (
              <Link
                key={`${item.tipo}-${item.id}`}
                href={item.href}
                className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 transition hover:bg-[#182c1f] focus-visible:bg-[#182c1f] focus-visible:outline-2 focus-visible:outline-[#e8c778] last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm font-bold text-white">{item.nome}</span>
                  {item.detalhe && <span className="block text-xs text-[#bfcbbd]">{item.detalhe}</span>}
                </span>
                <span className="shrink-0 border border-[#e8c778]/60 px-2 py-1 text-[11px] font-black text-[#e8c778]">{item.tipo}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
