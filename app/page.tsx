import Image from "next/image";
import Link from "next/link";

const ligacoes = [
  {
    href: "/ranking",
    numero: "01",
    titulo: "RANKING NACIONAL",
    descricao: "A classificação dos MCs",
    cor: "border-l-[#087a43]",
  },
  {
    href: "/rodas",
    numero: "02",
    titulo: "RANKING DAS RODAS",
    descricao: "As rodas de norte a sul",
    cor: "border-l-[#087a43]",
  },
  {
    href: "/mcs",
    numero: "03",
    titulo: "PERFIL DOS MCs",
    descricao: "Quem faz a cultura acontecer",
    cor: "border-l-[#087a43]",
  },
  {
    href: "/final-nacional",
    numero: "04",
    titulo: "FINAL NACIONAL",
    descricao: "Os 16 apurados",
    cor: "border-l-[#b3202b]",
  },
  {
    href: "/jurados",
    numero: "05",
    titulo: "MANUAL DE ARBITRAGEM",
    descricao: "Consulta para jurados e organizações",
    cor: "border-l-[#b3202b]",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080a09] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,55,35,.78) 0%, rgba(0,55,35,.55) 38%, rgba(100,15,24,.54) 42%, rgba(100,15,24,.76) 100%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.48))]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/25 pb-5">
          <Link
            href="/"
            aria-label="Nacional de Rua — página inicial"
            className="inline-flex items-center"
          >
            <span className="relative block h-16 w-[76px] shrink-0 overflow-hidden sm:h-[72px] sm:w-[86px]">
              <Image
                src="/logo-portugal.png"
                alt="Improviso Made in Portugal"
                width={1414}
                height={2000}
                priority
                className="absolute left-1/2 top-1/2 h-[120px] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 sm:h-[135px]"
              />
            </span>
          </Link>

          <span className="hidden text-right text-[10px] font-bold uppercase tracking-[0.24em] text-white/75 sm:block">
            RODAS DE IMPROVISO
            <br />
            PORTUGAL
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-16 lg:py-20">
          <section aria-labelledby="titulo-inicio" className="min-w-0">
            <p className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-[#e8c76c]">
              <span
                aria-hidden="true"
                className="h-[2px] w-9 shrink-0 bg-[#e8c76c]"
              />
              BATALHAS DE RAP · PORTUGAL
            </p>

            <h1
              id="titulo-inicio"
              className="max-w-full text-[clamp(3.25rem,5vw,5.75rem)] font-black uppercase leading-[0.95] tracking-[-0.035em] text-[#f6f2e9] drop-shadow-[4px_5px_0_rgba(0,0,0,.5)]"
            >
              <span className="block">NACIONAL</span>
              <span className="block">DE RUA</span>
            </h1>

            <div aria-hidden="true" className="mt-7 flex h-[5px] w-36">
              <span className="w-2/5 bg-[#087a43]" />
              <span className="w-3/5 bg-[#b3202b]" />
            </div>

            <p className="mt-7 max-w-lg text-lg font-semibold leading-relaxed text-white sm:text-xl">
              Acompanha o progresso dos MCs na caminhada até à Final
              Nacional.
            </p>

            <p className="mt-8 text-base font-black uppercase tracking-[0.16em] text-[#e8c76c] sm:text-lg">
              MERITOCRACIA É LEI.
            </p>
          </section>

          <nav
            aria-label="Navegação principal"
            className="rounded-2xl border border-white/15 bg-black/75 p-3 shadow-2xl backdrop-blur-sm sm:p-4"
          >
            <div className="grid gap-2">
              {ligacoes.map((ligacao) => (
                <Link
                  key={ligacao.href}
                  href={ligacao.href}
                  className={`group flex min-h-20 items-center gap-4 rounded-lg border border-white/10 border-l-4 bg-white/[0.04] px-4 py-3 transition hover:bg-white/10 ${ligacao.cor}`}
                >
                  <span className="text-sm font-black text-[#e8c76c]">
                    {ligacao.numero}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-white sm:text-base">
                      {ligacao.titulo}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-300">
                      {ligacao.descricao}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-xl text-[#e8c76c] transition group-hover:translate-x-1"
                  >
                    ↗
                  </span>
                </Link>
              ))}
            </div>

            <Link
              href="/organizacao/login"
              className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-lg border border-[#e8c76c]/60 px-4 py-3 text-sm font-black text-[#e8c76c] transition hover:bg-[#e8c76c] hover:text-black"
            >
              <span>ENTRAR COMO ORGANIZAÇÃO</span>
              <span aria-hidden="true" className="text-xl">
                ↗
              </span>
            </Link>
          </nav>
        </div>

        <footer className="flex flex-wrap justify-between gap-3 border-t border-white/25 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 sm:text-xs">
          <span>2026: TESTES · ÉPOCA OFICIAL: 2027</span>
          <span>DE NORTE A SUL, A RUA TEM VOZ.</span>
        </footer>
      </div>
    </main>
  );
}