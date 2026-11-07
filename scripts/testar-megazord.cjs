// Testes de regressão Megazord, sem tocar em edições ou pontuações reais.
// Executar: node scripts/testar-megazord.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("lib/apontamentos/megazord.ts", "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const modulo = { exports: {} };
vm.runInNewContext(javascript, {
  exports: modulo.exports,
  module: modulo,
}, { filename: "lib/apontamentos/megazord.ts" });
const { processarMegazord } = modulo.exports;
assert.equal(typeof processarMegazord, "function");

const inicio = [
  "MEGAZORD",
  "1.ª FASE",
  "Vizzy e Ned 2 vs 1 Guigox e DZ",
  "JC e Jão Manin 2 vs 1 Nunes e Redboy",
  "MZ e R7 0 vs 2 Gash e Chess",
  "Concept e Ares 1 vs 2 Koyotte e VB",
  "Cody e Davy 2 vs 1 Dante e Perigo",
  "Farofa e Yazui 0 vs 2 Nelli e Sachetti",
  "Beaver e Cleto 2 vs 0 Tigazz e Minidriller",
  "Oryx e Ty 2 vs 0 Ildo e Ares",
  "2.ª FASE",
  "Vizzy, Ned e Guigox 1 vs 2 Gash, Chess e R7",
  "JC, Jão Manin e Nunes 0 vs 2 Koyotte, VB e Concept",
  "Cody, Davy e Perigo 2 vs 0 Cleto, Beaver e Tigazz",
  "Ty, Oryx e Ares 2 vs 0 Nelli, Sachetti e Farofa",
  "SEMIFINAIS",
  "R7, Gash, Chess e Guigox 2 vs 1 Cody, Davy, Perigo e Cleto",
  "Koyotte, VB, Nunes e Concept 0 vs 2 Ty, Oryx, Ares e Nelli",
];

function processar(linhas) {
  return processarMegazord({
    linhas,
    normalizarNome: (nome) => nome.trim().toLowerCase(),
    obterNomeOficial: (nome) => nome.trim(),
  });
}

const antesDaFinal = processar(inicio);
assert.equal(antesDaFinal.batalhas.length, 14, "8 duplas + 4 trios + 2 quartetos");
assert.deepEqual(
  Array.from(antesDaFinal.batalhas.reduce((m, b) => {
    m.set(b.fase, (m.get(b.fase) ?? 0) + 1); return m;
  }, new Map())),
  [["1ª FASE", 8], ["2ª FASE", 4], ["SEMI-FINAL", 2]],
);
assert.equal(antesDaFinal.linhasIgnoradas.length, 0);

const completo = processar([
  ...inicio,
  "FINAL",
  "R7, Gash, Chess, Guigox e Davy 2 vs 1 Ty, Oryx, Ares, Nelli e Koyotte",
  "Permanebcia:",
  "Tigazz",
  "Minidriller",
]);
assert.equal(completo.batalhas.length, 15);
assert.equal(completo.batalhas.filter(b => b.fase === "FINAL").length, 1);
assert.equal(completo.linhasIgnoradas.length, 0, completo.linhasIgnoradas.join(" | "));
assert.equal(completo.permanencias.validas.length, 2);
assert.match(completo.vencedorEdicao, /R7/);

const incompleto = processar([
  ...inicio,
  "Vencedores",
  "R7, Gash, Chess, Guigox e Davy vs Ares",
]);
assert.equal(incompleto.batalhas.length, 14);
assert.ok(incompleto.linhasIgnoradas.some(x => x.includes("FINAL exige")));

// A mesma anotação de campeões é aceite com os seis títulos equivalentes.
const titulosEquivalentes = [
  "CAMPEÃO",
  "CAMPEAO",
  "CAMPEÕES",
  "CAMPEOES",
  "VENCEDOR",
  "VENCEDORES",
];
for (const titulo of titulosEquivalentes) {
  const separadamente = processar([
    ...inicio,
    titulo,
    "R7, Gash, Chess, Guigox, Davy",
  ]);
  assert.equal(
    separadamente.linhasIgnoradas.length,
    0,
    `${titulo}: ${separadamente.linhasIgnoradas.join(" | ")}`,
  );
  assert.equal(separadamente.batalhas.length, 14);
  assert.equal(separadamente.vencedorEdicao, null, "A anotação não inventa a FINAL");

  const inline = processar([
    ...inicio,
    `${titulo}: R7, Gash, Chess, Guigox, Davy`,
  ]);
  assert.equal(inline.linhasIgnoradas.length, 0, `${titulo}: ${inline.linhasIgnoradas.join(" | ")}`);
  assert.equal(inline.batalhas.length, 14);
}

// Anotações ambíguas não podem transformar uma final sem placar em pontuação.
const campeaoAmbiguo = processar([...inicio, "CAMPEÃO", "R7, Gash, Chess, Guigox e Davy vs Ares"]);
assert.ok(campeaoAmbiguo.linhasIgnoradas.some((linha) => linha.includes("FINAL exige")));

console.log("IMIP: Megazord reconhece 1.ª/2.ª, semifinais, final e permanência; rejeita final ambígua.");
