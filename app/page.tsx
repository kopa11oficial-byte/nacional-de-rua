import Link from "next/link";

const botaoPrincipal =
  "group flex min-h-14 items-center justify-between gap-3 rounded-md border border-yellow-400 bg-yellow-500 px-5 py-4 text-left text-sm font-black tracking-wide text-black shadow-[4px_4px_0_#111] transition hover:-translate-y-0.5 hover:bg-yellow-400 hover:shadow-[6px_6px_0_#111] sm:px-6 sm:text-base";

const botaoSecundario =
  "group flex min-h-14 items-center justify-between gap-3 rounded-md border border-yellow-500 bg-black/80 px-5 py-4 text-left text-sm font-black tracking-wide text-yellow-400 shadow-[4px_4px_0_#111] transition hover:-translate-y-0.5 hover:bg-yellow-500 hover:text-black sm:px-6 sm:text-base";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/25"
      />

      <section className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5 py-12 sm:px-6 sm:py-16">
        <header className="mb-9 sm:mb-10">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="mb-3 text-xs font-black tracking-[0.35em] text-yellow-500">
            BATALHAS DE RAP · PORTUGAL
          </p>

          <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] drop-shadow-[3px_4px_0_#000] sm:text-6xl md:text-7xl">
            <span className="block text-white">NACIONAL</span>
            <span className="block text-yellow-500">DE RUA</span>
          </h1>

          <p className="mt-6 text-xs font-black tracking-[0.28em] text-white sm:text-sm">
            MERITOCRACIA É LEI.
          </p>

          <p className="mt-4 max-w-xl text-sm text-zinc-300 sm:text-base">
            Ranking Nacional de Rodas de Improviso.
          </p>
        </header>

        <nav className="grid gap-3 sm:gap-4" aria-label="Navegação principal">
          <Link href="/ranking" className={botaoPrincipal}>
            <span>VER RANKING NACIONAL</span>
            <span aria-hidden="true" className="text-xl">↗</span>
          </Link>

          <Link href="/rodas" className={botaoPrincipal}>
            <span>RANKING DAS RODAS</span>
            <span aria-hidden="true" className="text-xl">↗</span>
          </Link>

          <Link href="/mcs" className={botaoPrincipal}>
            <span>PERFIL DOS MCs</span>
            <span aria-hidden="true" className="text-xl">↗</span>
          </Link>

          <Link href="/final-nacional" className={botaoSecundario}>
            <span>FINAL NACIONAL · 16 APURADOS</span>
            <span aria-hidden="true" className="text-xl">↗</span>
          </Link>

          <Link href="/jurados" className={botaoSecundario}>
            <span>MANUAL DE ARBITRAGEM · JURADOS</span>
            <span aria-hidden="true" className="text-xl">↗</span>
          </Link>

          <Link
            href="/organizacao/login"
            className="group mt-2 flex min-h-14 items-center justify-between gap-3 rounded-md border border-zinc-500 bg-zinc-950/95 px-5 py-4 text-left text-sm font-black tracking-wide text-white transition hover:border-yellow-500 hover:text-yellow-400 sm:mt-4 sm:px-6 sm:text-base"
          >
            <span>ENTRAR COMO ORGANIZAÇÃO</span>
            <span aria-hidden="true" className="text-xl text-yellow-500">↗</span>
          </Link>
        </nav>

        <footer className="mt-12 border-t border-yellow-500/40 pt-6 text-[10px] font-bold tracking-[0.2em] text-zinc-400 sm:mt-14 sm:text-xs sm:tracking-[0.25em]">
          2026: TESTES · ÉPOCA OFICIAL: 2027
        </footer>
      </section>
    </main>
  );
}