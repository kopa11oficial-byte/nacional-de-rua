import Link from "next/link";

const formatos = [
  {
    id: "normal",
    nome: "NORMAL",
    descricao:
      "Formato tradicional individual, com 1.ª fase, 2.ª fase, meias-finais e final.",
    detalhes:
      "A pontuação varia conforme a fase alcançada, com bónus por vitória 2–0 e permanência.",
  },
  {
    id: "wildcards",
    nome: "WILDCARDS",
    descricao:
      "Formato competitivo com cartas especiais que alteram o jogo.",
    detalhes:
      "Inclui Double or Nothing, One Round, Revive, Freezer e Hunter.",
    href: "/organizacao/formatos/wildcards",
  },
  {
    id: "lado-a-b",
    nome: "LADO A vs LADO B",
    descricao:
      "Dois lados competem entre si durante toda a edição.",
    detalhes:
      "Todas as vitórias pontuam, com bónus para 2–0, finalista derrotado e vencedor.",
  },
  {
    id: "megatron",
    nome: "MEGATRON",
    descricao: "Formato competitivo disputado por trios.",
    detalhes:
      "Os confrontos são realizados em equipas de três e seguem a pontuação do formato Normal.",
  },
  {
    id: "megazord",
    nome: "MEGAZORD",
    descricao: "Formato progressivo por equipas.",
    detalhes:
      "Começa em duplas e evolui para trios, quartetos e quintetos, seguindo a pontuação Normal.",
  },
];

export default function FormatosPage() {
  return (
    <main
      className="relative min-h-screen bg-black bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
    >
      <div
        className="absolute inset-0 bg-black/75"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/organizacao"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR À ORGANIZAÇÃO
        </Link>

        <p className="mt-12 text-xs font-black tracking-[0.35em] text-yellow-500">
          NACIONAL DE RUA
        </p>

        <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
          FORMATOS
        </h1>

        <p className="mt-4 text-sm text-zinc-300 sm:text-base">
          Consulta os formatos competitivos disponíveis no Nacional de Rua.
        </p>

        <div className="mt-10 grid gap-4">
          {formatos.map((formato) => {
            const conteudo = (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-yellow-500">
                    {formato.nome}
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-white">
                    {formato.descricao}
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {formato.detalhes}
                  </p>
                </div>

                {formato.href && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-2xl font-black text-yellow-500"
                  >
                    →
                  </span>
                )}
              </div>
            );

            if (formato.href) {
              return (
                <Link
                  key={formato.id}
                  href={formato.href}
                  className="block rounded-xl border border-zinc-700 bg-black/85 p-5 transition hover:border-yellow-500 hover:bg-black/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 sm:p-6"
                >
                  {conteudo}
                </Link>
              );
            }

            return (
              <article
                key={formato.id}
                className="rounded-xl border border-zinc-700 bg-black/85 p-5 sm:p-6"
              >
                {conteudo}
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-yellow-500/40 bg-black/85 px-5 py-4 text-sm text-zinc-300">
          O formato competitivo é escolhido durante o registo da edição.
        </div>

        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-yellow-500">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}