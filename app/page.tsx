export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
       <p className="mb-4 text-sm font-bold tracking-[0.35em] text-zinc-500">
  RANKING NACIONAL
</p>

<h1 className="max-w-5xl text-5xl font-black leading-none tracking-tight sm:text-7xl md:text-8xl">
  NACIONAL
  <span className="block text-yellow-500">DE RUA</span>
</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
          O ranking oficial das rodas de improviso.
          Resultados, percurso, mérito e consistência.
        </p>

        <p className="mt-5 text-lg font-black tracking-[0.18em] text-white">
          MERITOCRACIA É LEI.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3">
         <a
  href="/ranking"
  className="rounded-xl bg-yellow-500 px-6 py-4 text-center text-base font-black text-black transition hover:bg-yellow-400"
>
  VER RANKING NACIONAL
</a>

          <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-6 py-4 text-base font-bold text-white transition hover:border-zinc-500">
            ENTRAR COMO ORGANIZAÇÃO
          </button>

          <button className="rounded-xl border border-zinc-800 px-6 py-4 text-base font-bold text-zinc-300 transition hover:border-zinc-600">
            PERFIL DO MC
          </button>
        </div>

        <div className="mt-14 border-t border-zinc-900 pt-6 text-xs tracking-[0.25em] text-zinc-600">
          ÉPOCA OFICIAL 2026
        </div>
      </section>
    </main>
  );
}