"use client";

import { useState, type ReactNode } from "react";

const mensagem = encodeURIComponent(
  "Olá! Preciso de ajuda com o Nacional de Rua.",
);

const whatsapp = `https://wa.me/351961901107?text=${mensagem}`;

function PolvoPortugal() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="58"
      height="58"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 65C20 70 14 64 14 58M38 70C28 81 18 78 17 73M46 72C41 85 33 88 28 83M54 72C59 85 67 88 72 83M62 70C72 81 82 78 83 73M68 65C80 70 86 64 86 58"
        stroke="#D62828"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <path
        d="M25 43C25 24 36 13 50 13C64 13 75 24 75 43V52C75 66 64 75 50 75C36 75 25 66 25 52V43Z"
        fill="#E83B38"
        stroke="#111111"
        strokeWidth="3"
      />

      <path
        d="M29 53C34 48 41 47 50 47C59 47 66 48 71 53L68 71C63 76 57 79 50 79C43 79 37 76 32 71L29 53Z"
        fill="#087A43"
        stroke="#111111"
        strokeWidth="3"
      />

      <path
        d="M50 48C59 48 66 50 71 53L68 71C63 76 57 79 50 79V48Z"
        fill="#D62828"
      />

      <circle cx="50" cy="61" r="8" fill="#F6C744" />

      <path
        d="M47 57H53V64L50 66L47 64V57Z"
        fill="#FFFFFF"
        stroke="#173D7A"
        strokeWidth="1.5"
      />

      <ellipse cx="39" cy="37" rx="5" ry="6" fill="white" />
      <ellipse cx="61" cy="37" rx="5" ry="6" fill="white" />
      <circle cx="40" cy="38" r="2" fill="#111111" />
      <circle cx="60" cy="38" r="2" fill="#111111" />

      <path
        d="M44 44C47 48 53 48 56 44"
        stroke="#111111"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function OrganizacaoLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {children}

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 z-50 flex flex-col items-end gap-3 sm:right-6">
        {aberto && (
          <div
            id="ajuda-organizacoes"
            className="w-[min(340px,calc(100vw-32px))] rounded-2xl border border-yellow-500 bg-zinc-950 p-5 text-white shadow-2xl shadow-black"
          >
            <p className="text-lg font-black text-yellow-500">
              PRECISAS DE AJUDA?
            </p>

            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Se estás com dificuldades a registar uma edição, participantes
              ou resultados, fala comigo pelo WhatsApp.
            </p>

            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-xl bg-yellow-500 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-yellow-400"
            >
              FALAR NO WHATSAPP ↗
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => setAberto((valor) => !valor)}
          aria-label={aberto ? "Fechar ajuda" : "Pedir ajuda"}
          aria-expanded={aberto}
          aria-controls="ajuda-organizacoes"
          title="Pedir ajuda"
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-yellow-500 shadow-lg shadow-black transition hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
        >
          <PolvoPortugal />
        </button>
      </div>
    </>
  );
}