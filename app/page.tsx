export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">

        <div className="mb-10">
          <h1 className="whitespace-nowrap text-4xl font-black leading-none sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-white">NACIONAL </span>
            <span className="text-yellow-500">DE RUA</span>
          </h1>

          <p className="mt-4 text-sm font-bold tracking-[0.3em] text-zinc-400">
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-5 max-w-xl text-zinc-500">
            Ranking Nacional de Rodas de Improviso.
          </p>
        </div>

        <div className="grid gap-4">

          <a
            href="/ranking"
            className="rounded-xl bg-yellow-500 px-6 py-4 text-center text-base font-black text-black transition hover:bg-yellow-400"
          >
            VER RANKING NACIONAL
          </a>

          <a
            href="/rodas"
            className="rounded-xl bg-yellow-500 px-6 py-4 text-center text-base font-black text-black transition hover:bg-yellow-400"
          >
            RANKING DAS RODAS
          </a>

          <a
            href="/mcs"
            className="rounded-xl bg-yellow-500 px-6 py-4 text-center text-base font-black text-black transition hover:bg-yellow-400"
          >
            PERFIL DOS MCs
          </a>

          <a
            href="/organizacao/login"
            className="mt-4 rounded-xl border border-yellow-500 bg-zinc-950 px-6 py-4 text-center text-base font-black text-white transition hover:bg-zinc-900"
          >
            ENTRAR COMO ORGANIZAÇÃO
          </a>

        </div>

        <div className="mt-14 border-t border-zinc-900 pt-6 text-xs tracking-[0.25em] text-zinc-600">
          ÉPOCA OFICIAL 2026
        </div>

      </section>
    </main>
  );
}