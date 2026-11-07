"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Corte = {
  id: string;
  titulo: string;
  reel_url: string;
};

function CartaoCorteInstagram({ corte }: { corte: Corte }) {
  const [reproduzir, setReproduzir] = useState(false);
  const [capaIndisponivel, setCapaIndisponivel] = useState(false);

  const codigo = corte.reel_url.match(
    /^https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)\/$/,
  )?.[1];

  if (!codigo) return null;

  // Os Reels públicos são incorporados diretamente na página.
  // Se o Instagram bloquear a reprodução externa, o link oficial continua disponível.
  const miniatura = `https://www.instagram.com/reel/${codigo}/media/?size=l`;

  return (
    <article className="overflow-hidden border border-[#d6b56d]/30 bg-[#091b13] transition hover:border-[#d6b56d]">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[390px] overflow-hidden bg-gradient-to-br from-[#123925] via-[#080f0a] to-[#41131d]">
        {reproduzir ? (
          <iframe
            title={`Reproduzir ${corte.titulo} dentro do IMIP`}
            src={`https://www.instagram.com/reel/${codigo}/embed/`}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setReproduzir(true)}
            aria-label={`Reproduzir ${corte.titulo} sem sair do IMIP`}
            className="group absolute inset-0 h-full w-full"
          >
            {!capaIndisponivel && (
              <img
                src={miniatura}
                alt=""
                loading="lazy"
                onError={() => setCapaIndisponivel(true)}
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-90"
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#f0d58e] bg-black/75 pl-1 text-2xl text-white shadow-xl transition group-hover:scale-110 sm:h-20 sm:w-20 sm:text-3xl"
            >
              ▶
            </span>
            <span className="absolute bottom-4 left-4 bg-black/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#e7c56f]">
              REPRODUZIR NO IMIP
            </span>
          </button>
        )}
      </div>

      <div className="border-t border-[#d6b56d]/20 px-4 py-4">
        <h3 className="break-words text-sm font-black uppercase leading-relaxed text-white sm:text-base">
          {corte.titulo}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {reproduzir && (
            <button
              type="button"
              onClick={() => setReproduzir(false)}
              className="inline-flex min-h-11 items-center border border-[#d6b56d]/50 px-3 py-2 text-xs font-black text-[#e7c56f] hover:bg-white/10"
            >
              FECHAR VÍDEO
            </button>
          )}
          <a
            href={corte.reel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center border border-white/30 px-3 py-2 text-xs font-black text-white hover:bg-white/10"
          >
            VER NO INSTAGRAM ↗
          </a>
        </div>
        {reproduzir && (
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            Se o Instagram impedir a reprodução incorporada, utiliza a ligação original.
          </p>
        )}
      </div>
    </article>
  );
}

export function CortesInstagramRoda({ rodaId }: { rodaId: string }) {
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [carregar, setCarregar] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!rodaId) return;

    let ativo = true;

    async function carregarCortes() {
      setCarregar(true);
      setErro("");

      const { data, error } = await supabase
        .from("cortes_instagram_rodas")
        .select("id,titulo,reel_url")
        .eq("roda_id", rodaId)
        .eq("publicado", true)
        .order("criado_em", { ascending: false });

      if (!ativo) return;

      if (error) {
        setErro("Não foi possível carregar os cortes desta roda.");
      } else {
        setCortes((data ?? []) as Corte[]);
      }
      setCarregar(false);
    }

    void carregarCortes();
    return () => { ativo = false; };
  }, [rodaId]);

  if (carregar) {
    return <p role="status" className="text-sm font-bold text-[#d6b56d]">A CARREGAR CORTES...</p>;
  }

  if (erro) {
    return <p role="alert" className="text-sm text-red-200">{erro}</p>;
  }

  if (cortes.length === 0) {
    return (
      <p className="border border-[#d6b56d]/25 bg-[#091b13]/90 p-6 text-sm text-zinc-300">
        Ainda não existem cortes partilhados por esta roda.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cortes.map((corte) => (
        <CartaoCorteInstagram key={corte.id} corte={corte} />
      ))}
    </div>
  );
}
