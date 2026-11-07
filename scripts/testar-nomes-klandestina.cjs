// Verifica os nomes curtos públicos; não altera as edições da base de dados.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("lib/edicoes/nomes-publicos.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const modulo = { exports: {} };
vm.runInNewContext(js, {
  exports: modulo.exports,
  module: modulo,
}, { filename: "lib/edicoes/nomes-publicos.ts" });
const { nomePublicoEdicao, eRodaKlandestina } = modulo.exports;
assert.equal(eRodaKlandestina("Klandestina MS"), true);
assert.equal(eRodaKlandestina("Batalha Central"), false);

for (const [original, curto] of [
  ["34ª klandestina seletiva 45 segundos", "KL 34"],
  ["35ª klandestina seletiva duplas", "KL 35"],
  ["36ª klandestina seletiva duplas", "KL 36"],
  ["37.ª Klandestina", "KL 37"],
  ["kl38", "KL 38"],
  ["KL39", "KL 39"],
]) {
  assert.equal(nomePublicoEdicao(original, "Klandestina MS"), curto, original);
  assert.equal(nomePublicoEdicao(original, "Batalha Central"), original);
}
assert.equal(nomePublicoEdicao("Edição especial", "Klandestina MS"), "Edição especial");
console.log("IMIP: KL 34 a KL 39 visíveis com nomes curtos; outras rodas inalteradas.");
