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

type Publicacao = {
  postUrl: string;
  titulo: string;
  indice: number;
};

function FotoInstagram({ publicacao }: { publicacao: Publicacao }) {
  const [usarIncorporacao, setUsarIncorporacao] = useState(false);
  const codigo = publicacao.postUrl.match(
    /^https:\/\/www\.instagram\.com\/p\/([A-Za-z0-9_-]+)\/$/,
  )?.[1];

  if (!codigo) return null;

  const destino = `${publicacao.postUrl}?img_index=${publicacao.indice}`;
  // O endereço media/ devolve a imagem de capa quando está disponível.
  // Caso o Instagram não permita servir a imagem, mostramos a prévia
  // incorporada recortada. O clique abre sempre o Instagram original.
  const miniatura = `https://www.instagram.com/p/${codigo}/media/?size=l`;

  return (
    <div className="group relative aspect-square overflow-hidden border border-[#d6b56d]/20 bg-[#091b13] transition hover:border-[#d6b56d]">
      {!usarIncorporacao ? (
        <img
          src={miniatura}
          alt={publicacao.titulo}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={() => setUsarIncorporacao(true)}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <iframe
            src={`https://www.instagram.com/p/${codigo}/embed/`}
            title="Pré-visualização fotográfica"
            loading="lazy"
            tabIndex={-1}
            scrolling="no"
            className="pointer-events-none absolute left-1/2 top-0 h-[850px] w-[145%] max-w-none -translate-x-1/2 border-0"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      <a
        href={destino}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver no Instagram da roda: ${publicacao.titulo}`}
        title={`Abrir no Instagram: ${publicacao.titulo}`}
        className="absolute inset-0 z-10 block focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#d6b56d]"
      >
        <span className="sr-only">{publicacao.titulo}</span>
      </a>
    </div>
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
      if (error) {
        setErro("Não foi possível carregar as fotografias.");
      } else {
        setFotos((data ?? []) as FotografiaInstagram[]);
      }
      setCarregar(false);
    }

    void obter();
    return () => { activo = false; };
  }, [rodaId]);

  if (carregar) {
    return <p className="text-sm text-[#d6b56d]">A CARREGAR FOTOGRAFIAS...</p>;
  }

  if (erro) {
    return <p role="alert" className="text-sm text-red-200">{erro}</p>;
  }

  if (fotos.length === 0) {
    return (
      <p className="text-sm text-zinc-300">
        Ainda não há fotografias. A organização pode adicionar ligações
        do Instagram em Gerir Edição.
      </p>
    );
  }

  // Cada publicação do Instagram é um único cartão fotográfico.
  // Os carrosséis conservam todas as fotografias no Instagram original,
  // sem multiplicar miniaturas iguais ou esconder os vencedores.
  const publicacoes = new Map<string, Publicacao>();

  for (const foto of fotos) {
    if (!publicacoes.has(foto.post_url)) {
      publicacoes.set(foto.post_url, {
        postUrl: foto.post_url,
        titulo: foto.titulo,
        indice: foto.imagem_indice,
      });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
      {Array.from(publicacoes.values()).map((publicacao) => (
        <FotoInstagram key={publicacao.postUrl} publicacao={publicacao} />
      ))}
    </div>
  );
}
