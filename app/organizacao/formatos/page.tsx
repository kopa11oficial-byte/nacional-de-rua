"use client";

import Link from "next/link";

const formatos = [
  { id: "normal", nome: "NORMAL", descricao: "Formato tradicional individual, com 1.ª fase, 2.ª fase, meias-finais e final.", detalhes: "A pontuação varia conforme a fase alcançada, com bónus por vitória 2–0 e permanência." },
  { id: "wildcards", nome: "WILDCARDS", descricao: "Formato competitivo com cartas especiais que alteram o jogo.", detalhes: "Inclui Double or Nothing, One Round, Revive, Freezer e Hunter.", href: "/organizacao/formatos/wildcards" },
  { id: "lado-a-b", nome: "LADO A vs LADO B", descricao: "Dois lados competem entre si durante toda a edição.", detalhes: "Todas as vitórias pontuam, com bónus para 2–0, finalista derrotado e vencedor." },
  { id: "megatron", nome: "MEGATRON", descricao: "Formato competitivo disputado por trios.", detalhes: "Os confrontos são realizados em equipas de três e seguem a pontuação do formato Normal." },
  { id: "megazord", nome: "MEGAZORD", descricao: "Formato progressivo por equipas.", detalhes: "Começa em duplas e evolui para trios, quartetos e quintetos, seguindo a pontuação Normal." },
];

export default function FormatosPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/organizacao" className="text-sm font-black text-yellow-400">← VOLTAR À ORGANIZAÇÃO</Link>
        <p className="mt-10 text-xs font-black tracking-[0.35em] text-yellow-400">NACIONAL DE RUA</p>
        <h1 className="mt-3 text-5xl font-black">FORMATOS</h1>
        <p className="mt-2 text-zinc-400">Consulta os formatos competitivos disponíveis no Nacional de Rua.</p>

        <div className="mt-10 grid gap-4">
          {formatos.map((formato) => {
            const conteudo = (
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-xl font-black text-yellow-400">{formato.nome}</h2>
                  <p className="mt-2 text-sm text-white">{formato.descricao}</p>
                  <p className="mt-2 text-sm text-zinc-500">{formato.detalhes}</p>
                </div>
                {formato.href && <span className="shrink-0 text-2xl font-black text-yellow-400">→</span>}
              </div>
            );

            if (formato.href) {
              return <Link key={formato.id} href={formato.href} className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-yellow-400">{conteudo}</Link>;
            }

            return <article key={formato.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">{conteudo}</article>;
          })}
        </div>

        <div className="mt-8 rounded-xl border border-yellow-900/60 bg-yellow-950/20 px-5 py-4 text-sm text-zinc-300">O formato competitivo é escolhido durante o registo da edição.</div>
        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-yellow-400">MERITOCRACIA É LEI.</p>
      </div>
    </main>
  );
}
