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
  const [capaIndisponivel, setCapaIndisponivel] = useState(false);

  const codigo = corte.reel_url.match(
    /^https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)\/$/,
  )?.[1];

  if (!codigo) return null;

  // O Instagram pode bloquear a miniatura pública.
  // Nesse caso, o cartão continua limpo e clicável, sem incorporar
  // pedaços da interface do Instagram.
  const miniatura = `https://www.instagram.com/reel/${codigo}/media/?size=l`;

  return (
    <a
      href={corte.reel_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver corte no Instagram: ${corte.titulo}`}
      className="group block overflow-hidden border border-[#d6b56d]/25 bg-[#091b13] transition hover:border-[#d6b56d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6b56d]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#123925] via-[#080f0a] to-[#41131d]">
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
        <span className="absolute bottom-3 left-3 bg-black/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#e7c56f]">
          INSTAGRAM REEL ↗
        </span>
      </div>
      <div className="border-t border-[#d6b56d]/20 px-4 py-4">
        <h3 className="break-words text-sm font-black uppercase leading-relaxed text-white sm:text-base">
          {corte.titulo}
        </h3>
      </div>
    </a>
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {cortes.map((corte) => (
        <CartaoCorteInstagram key={corte.id} corte={corte} />
      ))}
    </div>
  );
}
