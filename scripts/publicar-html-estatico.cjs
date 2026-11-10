// Publica as páginas que Next.js já pré-gerou como assets nativos Cloudflare.
// Em pedidos de navegação normais estas páginas deixam de executar o Worker.
// Só inclui rotas comprovadamente estáticas no build, sem rotas dinâmicas/API.
const fs = require("node:fs");
const path = require("node:path");

const origem = path.resolve(".next/server/app");
const destino = path.resolve("public");
const rotas = [
  "", "ranking", "rodas", "mcs", "final-nacional", "jurados",
  "apoios-e-patrocinios", "organizacao", "organizacao/login",
  "organizacao/suporte", "organizacao/pedidos-organizadores",
  "organizacao/pedidos-mcs", "organizacao/gerir-edicao",
  "organizacao/participantes", "organizacao/comunicacao",
  "organizacao/repor-password", "propostas"
];

if (!fs.existsSync(origem)) {
  console.error("Páginas Next.js não encontradas. Não publicar assets incompletos.");
  process.exit(1);
}

for (const rota of rotas) {
  const nome = rota || "index";
  const fonte = path.join(origem, nome + ".html");
  // A rota só pode ser interceptada se o Next.js realmente a pré-gerou.
  if (!fs.existsSync(fonte)) {
    console.error("PÁGINA NÃO ESTÁTICA: " + nome + " — a publicação foi interrompida.");
    process.exit(1);
  }
}

for (const rota of rotas) {
  const nome = rota || "index";
  const fonte = path.join(origem, nome + ".html");
  const alvo = path.join(destino, nome + ".html");
  fs.mkdirSync(path.dirname(alvo), { recursive: true });
  fs.copyFileSync(fonte, alvo);
  console.log("ASSET ESTÁTICO: /" + nome + " (" + fs.statSync(alvo).size + " bytes)");
}
console.log("OK: " + rotas.length + " páginas públicas/cliente servidas sem SSR no Worker.");
