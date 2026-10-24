// Teste de regressão do processador de resultados (chaves de 8 e 16).
// Executar: node scripts/testar-chaves-normal.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const codigo = fs.readFileSync("lib/apontamentos/normal.ts", "utf8");
const javascript = ts.transpileModule(codigo, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const modulo = { exports: {} };
vm.runInNewContext(javascript, {
  exports: modulo.exports,
  module: modulo,
}, { filename: "lib/apontamentos/normal.ts" });

const { processarNormal } = modulo.exports;
assert.equal(typeof processarNormal, "function");

function criarApontamentos(tamanho, doisZeroNaFinal) {
  assert.ok(tamanho === 8 || tamanho === 16);
  let equipas = Array.from({ length: tamanho }, (_, i) => `MC${i + 1}`);
  const linhas = [];
  const fases = tamanho === 8
    ? ["1 fase", "2 fase", "Final"]
    : ["1 fase", "2 fase", "Semi-final", "Final"];

  for (const fase of fases) {
    linhas.push(fase);
    const vencedores = [];
    for (let i = 0; i < equipas.length; i += 2) {
      const ehFinal = equipas.length === 2;
      const resultado = ehFinal && !doisZeroNaFinal ? "2 vs " : "2 vs ";
      const pontosDerrotado = ehFinal && !doisZeroNaFinal ? 1 : 0;
      linhas.push(`${i / 2 + 1}- ${equipas[i]} 2 vs ${equipas[i + 1]} ${pontosDerrotado}`);
      vencedores.push(equipas[i]);
    }
    equipas = vencedores;
  }

  return linhas;
}

function verificarChave(tamanho, final20, pontosEsperados, doisZeroEsperados) {
  const resultado = processarNormal({
    linhas: criarApontamentos(tamanho, final20),
    normalizarNome: (nome) => nome.trim().toLowerCase(),
    obterNomeOficial: (nome) => nome.trim(),
  });

  const campeao = resultado.classificacao.find((mc) => mc.nome === "MC1");
  const final = resultado.batalhas.find((b) => b.fase === "FINAL");
  assert.equal(resultado.batalhas.length, tamanho - 1);
  assert.ok(campeao && final);
  assert.equal(campeao.pontos, pontosEsperados);
  assert.equal(campeao.vitoriasDoisZero, doisZeroEsperados);
  assert.equal(final.pontuacoes[0].pontos, tamanho === 8
    ? (final20 ? 5 : 4)
    : (final20 ? 6 : 5));
  assert.equal(resultado.linhasIgnoradas.length, 0);
}

verificarChave(8, true, 12, 3);
verificarChave(8, false, 11, 2);
verificarChave(16, true, 18, 4);
verificarChave(16, false, 17, 3);
console.log("IMIP: 4 testes de pontuação (chaves de 8/16) aprovados.");
