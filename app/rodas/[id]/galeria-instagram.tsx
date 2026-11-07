"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FotografiaInstagram = {
  id: string;
  titulo: string;
  tipo: "edicao" | "vencedores";
  post_url: string;
  imagem_indice: number;
};

function urlInstagram(foto: FotografiaInstagram): string {
  return `${foto.post_url}?img_index=${foto.imagem_indice}`;
}

function PublicacaoInstagram({
  fotos,
}: {
  fotos: FotografiaInstagram[];
}) {
  const [mensagem, setMensagem] = useState("");
  const original = fotos[0]?.post_url ?? "";
  const codigo = original.match(/^https:\/\/www\.instagram\.com\/p\/([A-Za-z0-9_-]+)\/$/)?.[1];
  if (!codigo) return null;

  async function partilhar(foto: FotografiaInstagram) {
    const url = urlInstagram(foto);
    const titulo = foto.titulo;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: titulo, text: titulo, url });
        setMensagem("");
      } else {
        await navigator.clipboard.writeText(url);
        setMensagem("Ligação da fotografia copiada.");
      }
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") return;
      setMensagem("Podes partilhar através da ligação ABRIR NO INSTAGRAM.");
    }
  }

  return (
    <article className="overflow-hidden border border-[#d6b56d]/35 bg-[#091b13]/90">
      <div className="flex h-[5px]">
        <span className="w-[43%] bg-[#087a43]" />
        <span className="w-[14%] bg-[#d6b56d]" />
        <span className="flex-1 bg-[#b82535]" />
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:gap-7 lg:p-6">
        <div className="mx-auto w-full max-w-[540px] overflow-hidden bg-black">
          <iframe
            title="Publicação original da roda no Instagram"
            src={`https://www.instagram.com/p/${codigo}/embed/`}
            loading="lazy"
            className="block h-[580px] w-full border-0 sm:h-[650px]"
            allow="encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <p className="px-3 py-2 text-center text-[11px] text-zinc-300">
            Desliza as imagens no carrossel. Se o Instagram não apresentar a publicação, utiliza as ligações à direita.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#d6b56d]">
              PUBLICAÇÃO ORIGINAL · INSTAGRAM
            </p>
            <h3 className="mt-3 text-2xl font-black uppercase leading-tight text-white">
              MOMENTOS DA RODA
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Fotografias partilhadas diretamente do Instagram da organização, sem novo carregamento.
            </p>
          </div>
          {fotos.map((foto) => (
            <div key={foto.id} className="border-l-4 border-[#d6b56d] bg-black/70 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
                {foto.tipo === "vencedores" ? "VENCEDORES" : "FOTOGRAFIA DA EDIÇÃO"} · FOTO {foto.imagem_indice}
              </p>
              <p className="mt-2 break-words text-base font-bold text-white">{foto.titulo}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={urlInstagram(foto)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center border border-[#d6b56d]/60 px-3 py-2 text-xs font-black uppercase text-[#f0d58e] hover:bg-white/10"
                >
                  ABRIR NO INSTAGRAM ↗
                </a>
                <button
                  type="button"
                  onClick={() => void partilhar(foto)}
                  className="min-h-11 border border-white/35 px-3 py-2 text-xs font-black uppercase text-white hover:bg-white/10"
                >
                  PARTILHAR ↗
                </button>
              </div>
            </div>
          ))}
          {mensagem && <p role="status" className="text-xs text-[#e7c56f]">{mensagem}</p>}
          <p className="text-xs leading-relaxed text-zinc-400">
            O Instagram pode abrir o carrossel na primeira fotografia mesmo quando a ligação identifica a segunda.
          </p>
        </div>
      </div>
    </article>
  );
}

export function GaleriaInstagramRoda({ rodaId }: { rodaId: string }) {
  const [fotos, setFotos] = useState<FotografiaInstagram[]>([]);
  const [carregar, setCarregar] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let activo = true;
    if (!rodaId) return;
    async function obter() {
      setCarregar(true);
      setErro("");
      const { data, error } = await supabase
        .from("galeria_instagram_rodas")
        .select("id,titulo,tipo,post_url,imagem_indice")
        .eq("roda_id", rodaId)
        .eq("publicado", true)
        .order("criado_em", { ascending: false })
        .order("imagem_indice", { ascending: true });

      if (!activo) return;
      if (error) setErro("Não foi possível carregar a galeria do Instagram.");
      else setFotos((data ?? []) as FotografiaInstagram[]);
      setCarregar(false);
    }
    void obter();
    return () => { activo = false; };
  }, [rodaId]);

  if (carregar) {
    return <p className="border border-[#d6b56d]/25 bg-black/60 p-6 text-sm text-[#d6b56d]">A CARREGAR FOTOGRAFIAS...</p>;
  }
  if (erro) {
    return <p role="alert" className="border-l-4 border-red-600 bg-black/60 p-5 text-sm text-red-200">{erro}</p>;
  }
  if (fotos.length === 0) {
    return (
      <div className="border border-[#d6b56d]/25 bg-gradient-to-br from-[#143727] to-[#08100b] p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">REGISTO FOTOGRÁFICO</p>
        <h3 className="mt-3 text-2xl font-black uppercase text-white">FOTOGRAFIAS</h3>
        <p className="mt-4 text-sm text-zinc-300">
          Esta roda ainda não partilhou fotografias do Instagram. A organização pode associá-las às edições em Gerir Edição.
        </p>
      </div>
    );
  }

  const grupos = new Map<string, FotografiaInstagram[]>();
  for (const foto of fotos) {
    grupos.set(foto.post_url, [...(grupos.get(foto.post_url) ?? []), foto]);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#d6b56d]">
          FOTOGRAFIAS DA EDIÇÃO · VENCEDORES
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase text-white">GALERIA DO INSTAGRAM</h3>
        <p className="mt-2 text-sm text-zinc-300">
          As publicações continuam no Instagram original. Abre, percorre e partilha cada fotografia.
        </p>
      </div>
      {Array.from(grupos.entries()).map(([url, fotografias]) => (
        <PublicacaoInstagram key={url} fotos={fotografias} />
      ))}
    </div>
  );
}
