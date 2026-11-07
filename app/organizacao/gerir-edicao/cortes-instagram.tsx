"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Edicao = {
  id: string;
  nome: string;
  roda_id: string;
};

type Corte = {
  id: string;
  titulo: string;
  reel_url: string;
  edicao_id: string | null;
};

function validarReel(valor: string): string | null {
  try {
    const url = new URL(valor.trim());
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port
    ) return null;

    const correspondencia = url.pathname.match(/^\/reel\/([A-Za-z0-9_-]+)\/?$/);
    return correspondencia
      ? `https://www.instagram.com/reel/${correspondencia[1]}/`
      : null;
  } catch {
    return null;
  }
}

export function GestaoCortesInstagram({ edicoes }: { edicoes: Edicao[] }) {
  const [edicaoId, setEdicaoId] = useState("");
  const [associarEdicao, setAssociarEdicao] = useState(false);
  const [reel, setReel] = useState("");
  const [titulo, setTitulo] = useState("");
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!edicoes.some((edicao) => edicao.id === edicaoId)) {
      setEdicaoId(edicoes[0]?.id ?? "");
    }
  }, [edicoes, edicaoId]);

  const edicao = edicoes.find((item) => item.id === edicaoId);
  const rodaId = edicao?.roda_id ?? "";

  useEffect(() => {
    if (!rodaId) {
      setCortes([]);
      return;
    }
    let ativo = true;

    async function carregarCortes() {
      const { data, error } = await supabase
        .from("cortes_instagram_rodas")
        .select("id,titulo,reel_url,edicao_id")
        .eq("roda_id", rodaId)
        .order("criado_em", { ascending: false });

      if (!ativo) return;
      if (error) setErro("Não foi possível consultar os vídeos da roda.");
      else setCortes((data ?? []) as Corte[]);
    }

    void carregarCortes();
    return () => { ativo = false; };
  }, [rodaId]);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!edicao || ocupado) return;

    setErro("");
    setMensagem("");

    const url = validarReel(reel);
    if (!url) {
      setErro("Utiliza a ligação HTTPS de um Reel público do Instagram.");
      return;
    }

    setOcupado(true);
    try {
      const valores = {
        roda_id: edicao.roda_id,
        edicao_id: associarEdicao ? edicao.id : null,
        titulo: titulo.trim() || `Corte da roda — ${edicao.nome}`,
        reel_url: url,
        publicado: true,
      };

      const { data, error } = await supabase
        .from("cortes_instagram_rodas")
        .upsert(valores, { onConflict: "roda_id,reel_url" })
        .select("id,titulo,reel_url,edicao_id")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Não foi possível guardar o corte.");

      setCortes((anteriores) => [
        data as Corte,
        ...anteriores.filter((corte) => corte.id !== data.id),
      ]);
      setReel("");
      setTitulo("");
      setMensagem("Corte publicado na secção VÍDEOS & CORTES do perfil da roda.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível publicar o corte.");
    } finally {
      setOcupado(false);
    }
  }

  async function retirar(id: string) {
    if (ocupado) return;
    setOcupado(true);
    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("cortes_instagram_rodas")
      .delete()
      .eq("id", id)
      .eq("roda_id", rodaId);

    if (error) {
      setErro(`Não foi possível retirar o corte: ${error.message}`);
    } else {
      setCortes((anteriores) => anteriores.filter((corte) => corte.id !== id));
      setMensagem("Corte retirado do IMIP. O vídeo continua no Instagram.");
    }
    setOcupado(false);
  }

  return (
    <section
      id="gestao-cortes"
      className="mt-10 overflow-hidden border border-[#d6b56d]/40 bg-[#091b13]/95"
    >
      <div className="flex h-[5px]">
        <span className="w-[43%] bg-[#087a43]" />
        <span className="w-[14%] bg-[#d6b56d]" />
        <span className="flex-1 bg-[#b82535]" />
      </div>
      <div className="p-5 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#d6b56d]">
          CONTEÚDO DA RODA · REELS DO INSTAGRAM
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase text-white sm:text-3xl">
          VÍDEOS & CORTES
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
          Partilha os melhores momentos publicados no Instagram da roda.
          Basta colar o link do Reel: não precisas de descarregar nem carregar vídeos.
        </p>

        {edicoes.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-300">
            É necessário ter uma edição registada para escolher a roda.
          </p>
        ) : (
          <form onSubmit={guardar} className="mt-6 grid gap-4 border border-[#d6b56d]/25 bg-black/40 p-4 sm:p-5">
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Roda / edição de referência
              <select
                value={edicaoId}
                onChange={(evento) => setEdicaoId(evento.target.value)}
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm text-white"
              >
                {edicoes.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-zinc-200">
              <input
                type="checkbox"
                checked={associarEdicao}
                onChange={(evento) => setAssociarEdicao(evento.target.checked)}
                className="h-5 w-5 accent-[#d6b56d]"
              />
              Associar o corte especificamente a esta edição
            </label>
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Ligação do Reel do Instagram
              <input
                required
                type="url"
                value={reel}
                onChange={(evento) => setReel(evento.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm font-normal text-white"
              />
            </label>
            <label className="block text-xs font-black uppercase text-[#d6b56d]">
              Título do corte (opcional)
              <input
                type="text"
                maxLength={160}
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                placeholder="Ex.: Melhor momento da KL 38"
                className="mt-2 min-h-12 w-full border border-[#d6b56d]/40 bg-[#080e0a] p-3 text-sm font-normal text-white"
              />
            </label>
            {erro && <p role="alert" className="border-l-4 border-red-600 bg-black/65 p-3 text-sm text-red-200">{erro}</p>}
            {mensagem && <p role="status" className="border-l-4 border-[#087a43] bg-black/65 p-3 text-sm text-green-200">{mensagem}</p>}
            <button
              type="submit"
              disabled={ocupado || !edicao}
              className="min-h-12 bg-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#101713] disabled:opacity-60"
            >
              {ocupado ? "A PUBLICAR..." : "PUBLICAR CORTE NO PERFIL DA RODA"}
            </button>
          </form>
        )}

        {cortes.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-[#d6b56d]">
              Cortes associados à roda
            </p>
            {cortes.map((corte) => (
              <div key={corte.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-black/50 p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-white">{corte.titulo}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {corte.edicao_id ? "Associado a uma edição" : "Vídeo geral da roda"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={corte.reel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center border border-[#d6b56d]/50 px-3 py-2 text-xs font-bold text-[#d6b56d]"
                  >
                    VER REEL ↗
                  </a>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void retirar(corte.id)}
                    className="min-h-10 border border-red-600/50 px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-60"
                  >
                    RETIRAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
