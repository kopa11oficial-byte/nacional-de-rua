import Link from "next/link";

const cartas = [
  {
    id: "double-or-nothing",
    nome: "DOUBLE OR NOTHING",
    descricao: "A próxima batalha vale pontuação a dobrar.",
    imagem: "/wildcards/double-or-nothing.png",
  },
  {
    id: "one-round",
    nome: "ONE ROUND",
    descricao:
      "A próxima batalha tem apenas 1 round — bate e volta, 8 entradas.",
    imagem: "/wildcards/one-round.png",
  },
  {
    id: "revive",
    nome: "REVIVE",
    descricao:
      "Um MC eliminado regressa ao jogo. Quem ativa a carta escolhe quem revive.",
    imagem: "/wildcards/revive.png",
  },
  {
    id: "freezer",
    nome: "FREEZER",
    descricao:
      "O MC perde a vez. Não é eliminado, mas sai temporariamente da rotação.",
    imagem: "/wildcards/freezer.png",
  },
  {
    id: "hunter",
    nome: "HUNTER",
    descricao: "Escolhe qualquer MC ativo como próximo adversário.",
    imagem: "/wildcards/hunter.png",
  },
];

export default function WildcardsPage() {
  return (
    <main
      className="relative min-h-screen bg-black bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
    >
      <div
        className="absolute inset-0 bg-black/75"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/organizacao/formatos"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR AOS FORMATOS
        </Link>

        <header className="mt-12">
          <p className="text-xs font-black tracking-[0.35em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
            WILDCARDS
          </h1>

          <p className="mt-4 text-sm text-zinc-300 sm:text-base">
            Consulta as cartas disponíveis e o efeito de cada uma.
          </p>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cartas.map((carta) => (
            <article
              key={carta.id}
              className="overflow-hidden rounded-xl border border-zinc-700 bg-black/85"
            >
              <div className="aspect-[2/3] overflow-hidden bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={carta.imagem}
                  alt={`Carta ${carta.nome}`}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="border-t border-zinc-700 px-5 py-5">
                <h2 className="text-lg font-black text-yellow-500">
                  {carta.nome}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {carta.descricao}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-yellow-500/40 bg-black/85 px-5 py-4 text-sm leading-relaxed text-zinc-300">
          A utilização das cartas e os resultados das batalhas são
          registados nos apontamentos da edição.
        </div>

        <p className="mt-14 text-center text-xs font-black tracking-[0.25em] text-yellow-500">
          MERITOCRACIA É LEI.
        </p>
      </div>
    </main>
  );
}