"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Edicao = {
  id: string;
  nome: string;
  roda_id: string;
};

type Registo = {
  id: string;
  titulo: string;
  tipo: "edicao" | "vencedores";
  post_url: string;
  imagem_indice: number;
};

function validarLigacaoInstagram(valor: string): {
  post_url: string;
  imagem_indice: number;
} | null {
  try {
    const url = new URL(valor.trim());
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    const post = url.pathname.match(/^\/p\/([A-Za-z0-9_-]+)\/?$/);
    const indice = Number(url.searchParams.get("img_index") || "1");
    if (!post || !Number.isInteger(indice) || indice < 1 || indice > 20) return null;

    return {
      post_url: `https://www.instagram.com/p/${post[1]}/`,
      imagem_indice: indice,
    };
  } catch {
    return null;
  }
}

export function GestaoGaleriaInstagram({ edicoes }: { edicoes: Edicao[] }) {
  const [edicaoId, setEdicaoId] = useState("");
  const [tipo, setTipo] = useState<"edicao" | "vencedores">("edicao");
  const [titulo, setTitulo] = useState("");
  const [ligacao, setLigacao] = useState("");
  const [registos, setRegistos] = useState<Registo[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!edicoes.length) return;
    if (!edicoes.some((edicao) => edicao.id === edicaoId)) setEdicaoId(edicoes[0].id);
  }, [edicoes, edicaoId]);

  useEffect(() => {
    let activo = true;
    if (!edicaoId) {
      setRegistos([]);
      return;
    }

    async function carregar() {
      const { data, error } = await supabase
        .from("galeria_instagram_rodas")
        .select("id,titulo,tipo,post_url,imagem_indice")
        .eq("edicao_id", edicaoId)
        .order("imagem_indice", { ascending: true });

      if (!activo) return;
      if (error) setErro("Não foi possível consultar as fotografias da edição.");
      else setRegistos((data ?? []) as Registo[]);
    }
    void carregar();
    return () => { activo = false; };
  }, [edicaoId]);

  const edicao = edicoes.find((item) => item.id === edicaoId);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!edicao || ocupado) return;
    setErro("");
    setMensagem("");

    const instagram = validarLigacaoInstagram(ligacao);
    if (!instagram) {
      setErro("Copia a ligação da publicação do Instagram, incluindo ?img_index=1 ou 2.");
      return;
    }

    setOcupado(true);
    try {
      const valores = {
        roda_id: edicao.roda_id,
        edicao_id: edicao.id,
        titulo: titulo.trim() || (tipo === "edicao"
          ? `Fotografia da edição — ${edicao.nome}`
          : `Vencedores da edição — ${edicao.nome}`),
        tipo,
        ...instagram,
        publicado: true,
      };
      const { data, error } = await supabase
        .from("galeria_instagram_rodas")
        .upsert(valores, { onConflict: "roda_id,post_url,imagem_indice,tipo" })
        .select("id,titulo,tipo,post_url,imagem_indice")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Não foi possível guardar a ligação.");
      setRegistos((anteriores) => [
        ...anteriores.filter((registo) => registo.id !== data.id),
        data as Registo,
      ]);
      setMensagem("Fotografia associada à edição e publicada na galeria da roda.");
      setLigacao("");
      setTitulo("");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível guardar a fotografia.");
    } finally {
      setOcupado(false);
    }
  }

  async function retirar(registoId: string) {
    if (ocupado) return;
    setOcupado(true);
    setErro("");
    const { error } = await supabase
      .from("galeria_instagram_rodas")
      .delete()
      .eq("id", registoId);
    if (error) {
      setErro(`Não foi possível retirar a ligação: ${error.message}`);
    } else {
      setRegistos((antes) => antes.filter((item) => item.id !== registoId));
      setMensagem("Ligação retirada do IMIP. A publicação original mantém-se no Instagram.");
    }
    setOcupado(false);
  }

  return (
    <section className="mt-10 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95" id="galeria-instagram">
      <div className="flex h-[5px]"><span className="w-[43%] bg-[#087a43]" /><span className="w-[14%] bg-[#d6b56d]" /><span className="flex-1 bg-[#b82535]" /></div>
      <div className="p-5 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d6b56d]">CONTEÚDO DA RODA · INSTAGRAM</p>
        <h2 className="mt-3 text-2xl font-black uppercase text-white sm:text-3xl">FOTOGRAFIAS DA EDIÇÃO E VENCEDORES</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
          Cola uma ligação do Instagram da roda, por exemplo, com ?img_index=1 para a fotografia da edição e
          ?img_index=2 para os vencedores. Não precisas de descarregar nem carregar imagens.
          As duas fotografias podem pertencer à mesma publicação.
        </p>
        {edicoes.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-300">Ainda não há edições disponíveis.</p>
        ) : (
          <form onSubmit={guardar} className="mt-6 grid gap-4 border border-[#d6b56d]/25 bg-black/40 p-4 sm:p-5">
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Edição
              <select value={edicaoId} onChange={(evento) => setEdicaoId(evento.target.value)}
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm text-white">
                {edicoes.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
              </select>
            </label>
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Tipo de fotografia
              <select value={tipo} onChange={(evento) => setTipo(evento.target.value as "edicao" | "vencedores")}
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm text-white">
                <option value="edicao">Fotografia da edição</option>
                <option value="vencedores">Fotografia dos vencedores</option>
              </select>
            </label>
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Ligação do Instagram
              <input type="url" required value={ligacao} onChange={(evento) => setLigacao(evento.target.value)}
                placeholder="https://www.instagram.com/p/.../?img_index=2"
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm font-normal text-white" />
            </label>
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Legenda (opcional)
              <input type="text" maxLength={140} value={titulo} onChange={(evento) => setTitulo(evento.target.value)}
                placeholder="Ex.: FLAYS & VIZZY — Vencedores"
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm font-normal text-white" />
            </label>
            {erro && <p role="alert" className="border-l-4 border-red-600 bg-black/60 p-3 text-sm text-red-200">{erro}</p>}
            {mensagem && <p role="status" className="border-l-4 border-[#087a43] bg-black/60 p-3 text-sm text-green-200">{mensagem}</p>}
            <button type="submit" disabled={!edicao || ocupado}
              className="min-h-12 bg-[#d6b56d] px-5 py-3 text-sm font-black uppercase text-[#101713] disabled:opacity-60">
              {ocupado ? "A GUARDAR..." : "PUBLICAR NA GALERIA DA RODA"}
            </button>
          </form>
        )}
        {registos.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#d6b56d]">Fotografias associadas a esta edição</p>
            {registos.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-black/40 p-3">
                <div>
                  <p className="text-sm font-bold text-white">{item.titulo}</p>
                  <p className="mt-1 text-xs text-zinc-300">Fotografia {item.imagem_indice} · {item.tipo === "vencedores" ? "Vencedores" : "Edição"}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`${item.post_url}?img_index=${item.imagem_indice}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center border border-[#d6b56d]/50 px-3 py-2 text-xs font-bold text-[#d6b56d]">ABRIR ↗</a>
                  <button type="button" disabled={ocupado} onClick={() => void retirar(item.id)}
                    className="min-h-10 border border-red-600/60 px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-60">RETIRAR</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
