import { NextResponse } from "next/server";

// Suspensão pública temporária do Nacional de Rua.
// Para reativar o site, mudar para false e republicar.
const EM_MANUTENCAO = true;

const paginaManutencao = `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#0b0b0b">
  <title>Nacional de Rua — Em Manutenção</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 32px 20px;
      background: #0b0b0b;
      color: #f5f5f5;
      font-family: Arial, Helvetica, sans-serif;
      text-align: center;
    }
    main { width: min(100%, 680px); }
    .marca {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .26em;
      color: #b5b5b5;
    }
    .separador {
      width: 58px;
      height: 2px;
      margin: 34px auto;
      background: #777;
    }
    h1 {
      margin: 0;
      font-size: clamp(34px, 8vw, 64px);
      line-height: 1.05;
      letter-spacing: -.04em;
      text-transform: uppercase;
      font-weight: 800;
    }
    p {
      margin: 28px auto 0;
      max-width: 440px;
      color: #aaa;
      font-size: clamp(15px, 3vw, 18px);
      line-height: 1.65;
    }
  </style>
</head>
<body>
  <main role="main">
    <div class="marca">NACIONAL DE RUA</div>
    <div class="separador" aria-hidden="true"></div>
    <h1>EM MANUTENÇÃO</h1>
    <p>A plataforma encontra-se temporariamente indisponível.</p>
  </main>
</body>
</html>`;

export function middleware() {
  if (!EM_MANUTENCAO) {
    return NextResponse.next();
  }

  // Interceta também as rotas internas, sem alterar contas, rankings ou base de dados.
  return new NextResponse(paginaManutencao, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const config = {
  matcher: "/:path*",
};
