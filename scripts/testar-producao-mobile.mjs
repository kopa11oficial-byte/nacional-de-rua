// Smoke test independente do deploy Cloudflare, com viewport Android/iPhone.
// Não recolhe nem utiliza credenciais de MC, suporte ou organização.
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "https://nacional-de-rua.rodasdeimproviso.workers.dev";
const ROTAS = [
  { caminho: "/", nome: "inicio" },
  { caminho: "/rodas", nome: "rodas" },
  { caminho: "/ranking", nome: "ranking" },
  { caminho: "/mcs", nome: "mcs" },
  { caminho: "/organizacao/login", nome: "login-organizacao" },
  { caminho: "/rodas/c0e01a2d-b433-4bff-b627-cc37481921c3#cortes", nome: "klandestina-cortes" },
  { caminho: "/final-nacional", nome: "final-nacional" },
  { caminho: "/jurados", nome: "jurados" },
];

await mkdir("artefactos-producao", { recursive: true });
const navegador = await chromium.launch({ headless: true });
const falhas = [];

for (const aparelho of [
  { nome: "android", definicao: devices["Pixel 7"] },
  { nome: "iphone", definicao: devices["iPhone 13"] },
]) {
  const contexto = await navegador.newContext(aparelho.definicao);
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(20_000);

  for (const rota of ROTAS) {
    const destino = `${BASE}${rota.caminho}`;
    try {
      const resposta = await pagina.goto(destino, {
        waitUntil: "domcontentloaded",
        timeout: 25_000,
      });
      await pagina.waitForTimeout(900);

      const metrica = await pagina.evaluate(() => ({
        viewport: window.innerWidth,
        documento: document.documentElement.scrollWidth,
        titulo: document.title,
        metaViewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "",
        principal: Boolean(document.querySelector("main")),
        tamanhoTexto: document.body.innerText.length,
      }));

      const estado = resposta?.status() ?? 0;
      const transbordo = metrica.documento - metrica.viewport;
      const ok = estado >= 200 && estado < 400
        && transbordo <= 4 && Boolean(metrica.metaViewport)
        && metrica.principal && metrica.tamanhoTexto >= 70;

      console.log(JSON.stringify({
        aparelho: aparelho.nome, rota: rota.nome, estado,
        viewport: metrica.viewport, documento: metrica.documento,
        transbordo, titulo: metrica.titulo, ok,
      }));

      if (!ok) {
        falhas.push(`${aparelho.nome}/${rota.nome}: HTTP ${estado}; transbordo ${transbordo}px; viewport=${Boolean(metrica.metaViewport)}; main=${metrica.principal}; texto=${metrica.tamanhoTexto}`);
      }

      if (rota.nome === "inicio" || rota.nome === "klandestina-cortes" || !ok) {
        await pagina.screenshot({
          path: `artefactos-producao/${aparelho.nome}-${rota.nome}.png`,
          fullPage: true,
          animations: "disabled",
          timeout: 15_000,
        });
      }
    } catch (erro) {
      falhas.push(`${aparelho.nome}/${rota.nome}: ${String(erro)}`);
      console.error(`${aparelho.nome}/${rota.nome}: ${String(erro)}`);
    }
  }
  await contexto.close();
}
await navegador.close();

if (falhas.length) {
  console.error(`\nFALHAS NA PUBLICAÇÃO OU NO MOBILE (${falhas.length}):\n${falhas.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("\nOK: todos os ecrãs públicos responderam e não apresentaram transbordo horizontal.");
}
