"use client";

import Link from "next/link";

const cartas = [
  { id: "double-or-nothing", nome: "DOUBLE OR NOTHING", descricao: "A próxima batalha vale pontuação a dobrar.", imagem: "/wildcards/double-or-nothing.png" },
  { id: "one-round", nome: "ONE ROUND", descricao: "A próxima batalha tem apenas 1 round — bate e volta, 8 entradas.", imagem: "/wildcards/one-round.png" },
  { id: "revive", nome: "REVIVE", descricao: "Um MC eliminado regressa ao jogo. Quem ativa a carta escolhe quem revive.", imagem: "/wildcards/revive.png" },
  { id: "freezer", nome: "FREEZER", descricao: "O MC perde a vez. Não é eliminado, mas sai temporariamente da rotação.", imagem: "/wildcards/freezer.png" },
  { id: "hunter", nome: "HUNTER", descricao: "Escolhe qualquer MC ativo como próximo adversário.", imagem: "/wildcards/hunter.png" },
];

export default function WildcardsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/organizacao/formatos" className="text-sm font-black text-yellow-400">← VOLTAR AOS FORMATOS</Link>

        <div className="mt-10">
          <p className="text-xs font-black tracking-[0.35em] text-yellow-400">NACIONAL DE RUA</p>
          <h1 className="mt-3 text-5xl font-black">WILDCARDS</h1>
          <p className="mt-2 text-zinc-400">Consulta as cartas disponíveis e o efeito de cada uma.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cartas.map((carta) => (
            <article key={carta.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="aspect-[2/3] overflow-hidden bg-black">
                <img src={carta.imagem} alt={`Carta ${carta.nome}`} className="h-full w-full object-cover" />
              </div>
              <div className="px-5 py-5">
                <h2 className="text-lg font-black text-yellow-400">{carta.nome}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{carta.descricao}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-400">A utilização das cartas e os resultados das batalhas são registados nos apontamentos da edição.</div>
        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-yellow-400">MERITOCRACIA É LEI.</p>
      </div>
    </main>
  );
}
