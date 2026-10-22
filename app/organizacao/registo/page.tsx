
import Link from "next/link";

export default function RegistoOrganizacaoPage() {
  return (
    <main
      className="relative min-h-screen bg-black bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage: "url('/fundo-tijolos.png')",
      }}
    >
      <div
        className="absolute inset-0 bg-black/75"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="text-sm font-black text-yellow-500 hover:text-yellow-400"
        >
          ← VOLTAR
        </Link>

        <header className="mt-12">
          <div className="mb-5 h-1 w-16 bg-yellow-500" />

          <p className="text-xs font-black tracking-[0.3em] text-yellow-500">
            IMPROVISO MADE IN PORTUGAL
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            ACESSO DE
            <br />
            <span className="text-yellow-500">
              ORGANIZAÇÕES
            </span>
          </h1>

          <p className="mt-5 text-sm leading-relaxed text-zinc-300 sm:text-base">
            O acesso à gestão das rodas é atribuído
            após validação pelo Suporte Geral IMIP.
          </p>
        </header>

        <section className="mt-10 space-y-5">
          <article className="rounded-2xl border border-yellow-500/50 bg-black/90 p-6 sm:p-8">
            <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
              OPÇÃO 1
            </p>

            <h2 className="mt-3 text-2xl font-black">
              A TUA RODA JÁ ESTÁ REGISTADA?
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Procura a tua roda na lista do Nacional
              de Rua, abre o respetivo perfil e utiliza
              o botão PEDIR ACESSO DE ORGANIZADOR.
            </p>

            <Link
              href="/rodas"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-yellow-500 px-5 py-3 text-center text-sm font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-black sm:w-auto"
            >
              PROCURAR A MINHA RODA →
            </Link>
          </article>

          <article className="rounded-2xl border border-yellow-500/50 bg-black/90 p-6 sm:p-8">
            <p className="text-xs font-black tracking-[0.2em] text-yellow-500">
              OPÇÃO 2
            </p>

            <h2 className="mt-3 text-2xl font-black">
              QUERES REGISTAR UMA NOVA RODA?
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Preenche o formulário de inscrição.
              O pedido será analisado pelo Suporte Geral
              antes de ser criado o perfil público da roda.
            </p>

            <Link
              href="/rodas/registar"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-yellow-400 sm:w-auto"
            >
              REGISTAR NOVA RODA →
            </Link>
          </article>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-black/85 p-6 text-center">
          <h2 className="text-lg font-black">
            JÁ TENS UMA CONTA APROVADA?
          </h2>

          <p className="mt-3 text-sm text-zinc-300">
            Se já recebeste autorização e tens uma
            conta de organização, podes entrar normalmente.
          </p>

          <Link
            href="/organizacao/login"
            className="mt-5 inline-block text-sm font-black text-yellow-500 hover:text-yellow-400"
          >
            ENTRAR NA MINHA CONTA →
          </Link>
        </section>

        <footer className="mt-12 border-t border-yellow-500/40 pt-6 text-center text-xs font-bold tracking-[0.25em] text-zinc-300">
          MERITOCRACIA É LEI.
        </footer>
      </div>
    </main>
  );
}
