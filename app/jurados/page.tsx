import Link from "next/link";

const pdf = "/documentos/manual-de-arbitragem.pdf";

export const metadata = {
  title: "Manual de Arbitragem | Nacional de Rua",
  description:
    "Consulta pública do Manual de Arbitragem para Batalhas de Improviso em Portugal.",
};

export default function JuradosPage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/fundo-tijolos.png')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black/25"
      />

      <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <Link
          href="/"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            NACIONAL DE RUA
          </p>

          <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.04em] drop-shadow-[3px_4px_0_#000] sm:text-5xl md:text-6xl">
            <span className="text-white">MANUAL DE </span>
            <span className="text-yellow-500">ARBITRAGEM</span>
          </h1>

          <p className="mt-5 text-sm text-zinc-200">
            Documento de consulta para jurados e organizações · 12 páginas.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-yellow-400 bg-yellow-500 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-400"
          >
            ABRIR PDF
          </a>

          <a
            href={pdf}
            download="Manual-de-Arbitragem.pdf"
            className="rounded-md border border-yellow-500 bg-black/90 px-5 py-3 text-sm font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
          >
            DESCARREGAR
          </a>
        </div>

        <section className="mt-8 rounded-md border border-zinc-700 bg-black/90 p-6 sm:hidden">
          <h2 className="font-black text-white">
            CONSULTAR NO TELEMÓVEL
          </h2>

          <p className="mt-2 text-sm text-zinc-200">
            Abre o manual para ajustares o tamanho da página e fazeres zoom no
            visualizador do navegador.
          </p>

          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-md bg-yellow-500 px-5 py-4 text-center text-sm font-black text-black transition hover:bg-yellow-400"
          >
            LER O MANUAL →
          </a>
        </section>

        <div className="mt-8 hidden overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 sm:block">
          <iframe
            title="Manual de Arbitragem para Batalhas de Improviso em Portugal"
            src={pdf}
            className="h-[75vh] min-h-[480px] w-full"
          />
        </div>

        <p className="mt-4 text-sm text-zinc-200 sm:hidden">
          Também podes guardar o documento com o botão «Descarregar».
        </p>

        <p className="mt-4 hidden text-sm text-zinc-200 sm:block">
          Se o documento não aparecer no navegador, usa o botão «Abrir PDF».
        </p>

        <footer className="mt-14 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}