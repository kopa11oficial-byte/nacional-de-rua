// Testes de regressão Double Tri: três MCs, um vencedor e zero pontos na pré-fase.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const codigo = fs.readFileSync("lib/apontamentos/normal.ts", "utf8");
const javascript = ts.transpileModule(codigo, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const modulo = { exports: {} };
vm.runInNewContext(javascript, {
  exports: modulo.exports,
  module: modulo,
}, { filename: "lib/apontamentos/normal.ts" });
const { processarNormal } = modulo.exports;
const contexto = (linhas) => ({
  linhas,
  normalizarNome: (nome) => nome.trim().toLowerCase(),
  obterNomeOficial: (nome) => nome.trim(),
});

const pre = processarNormal(contexto([
  "PRÉ-FASE",
  "MZ 0 vs DZ 0 vs CHESS 2",
]));
assert.equal(pre.batalhas.length, 1);
assert.equal(pre.linhasIgnoradas.length, 0);
assert.equal(pre.batalhas[0].resultado, "0-0-2 — vencedor: CHESS");
assert.deepEqual(Array.from(pre.batalhas[0].participantesIndividuais), ["MZ", "DZ", "CHESS"]);
assert.deepEqual(Array.from(pre.batalhas[0].resultadosIndividuais), [0, 0, 2]);
assert.deepEqual(Array.from(pre.batalhas[0].vencedores), ["CHESS"]);
assert.equal(pre.batalhas[0].bonusDoisZero, false);
assert.equal(pre.batalhas[0].pontuacoes.length, 0);
assert.ok(pre.classificacao.every((mc) => mc.pontos === 0));

const invertida = processarNormal(contexto([
  "PRÉ-FASE",
  "MC1 2 vs MC2 0 vs MC3 0",
]));
assert.equal(invertida.batalhas[0].vencedores[0], "MC1");
assert.deepEqual(Array.from(invertida.batalhas[0].resultadosIndividuais), [2, 0, 0]);

const empate = processarNormal(contexto([
  "PRÉ-FASE",
  "MC1 2 vs MC2 2 vs MC3 0",
]));
assert.equal(empate.batalhas.length, 0);
assert.equal(empate.linhasIgnoradas.length, 1);

const normal = processarNormal(contexto([
  "1ª FASE",
  "MC1 2 vs MC2 0",
]));
assert.equal(normal.batalhas.length, 1);
assert.equal(normal.batalhas[0].participantesIndividuais, undefined);
assert.equal(normal.batalhas[0].pontuacoes[0].pontos, 3);

console.log("IMIP: Double Tri e batalha normal testados com sucesso.");
