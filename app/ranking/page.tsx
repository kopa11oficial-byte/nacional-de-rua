
export default function RankingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">

        <a
          href="/"
          className="text-sm font-bold text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </a>

       <div className="mt-10">
  <h1 className="text-5xl font-black tracking-tight text-yellow-500 md:text-7xl">
    NACIONAL DE RUA
  </h1>

  <p className="mt-4 text-2xl font-black tracking-tight text-white md:text-4xl">
    RANKING NACIONAL
  </p>

  <p className="mt-3 text-zinc-400">
    ÉPOCA OFICIAL 2026
  </p>
</div>

        <div className="mt-12 overflow-hidden rounded-xl border border-zinc-800">

          <div className="grid grid-cols-[70px_1fr_100px] bg-zinc-900 px-5 py-4 text-sm font-bold text-zinc-400">
            <span>POS.</span>
            <span>MC</span>
            <span className="text-right">PONTOS</span>
          </div>

          <div className="grid grid-cols-[70px_1fr_100px] px-5 py-5">
            <span className="font-black text-yellow-500">1º</span>
            <span className="font-bold">—</span>
            <span className="text-right font-black">0</span>
          </div>

        </div>

        <p className="mt-8 text-center text-xs tracking-[0.2em] text-zinc-600">
          MERITOCRACIA É LEI.
        </p>

      </div>
    </main>
  );
}

