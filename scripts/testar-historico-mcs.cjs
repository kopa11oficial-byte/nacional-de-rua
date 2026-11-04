// A participação conta para o histórico mesmo quando o MC recebe zero pontos.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const codigo = fs.readFileSync("lib/historico-mc.ts", "utf8");
const js = ts.transpileModule(codigo, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const modulo = { exports: {} };
vm.runInNewContext(js, { exports: modulo.exports, module: modulo });
const { obterIdsEdicoesHistorico, contarBatalhasPorEdicao } = modulo.exports;

const batalhas = [
  { id: "bc46-batalha8", edicao_id: "BC46" },
  { id: "klandestina-batalha7", edicao_id: "KLANDESTINA36" },
  { id: "klandestina-batalha9", edicao_id: "KLANDESTINA36" },
];
const pontos = [{ edicao_id: "KLANDESTINA36" }];
const participacoes = [
  { batalha_id: "bc46-batalha8" }, // Raiver perdeu: 0 pontos.
  { batalha_id: "klandestina-batalha7" },
  { batalha_id: "klandestina-batalha9" },
];
const ids = obterIdsEdicoesHistorico(pontos, participacoes, batalhas);
assert.deepEqual(Array.from(ids), ["KLANDESTINA36", "BC46"]);
assert.equal(ids.filter((id) => id === "KLANDESTINA36").length, 1);
assert.deepEqual(Array.from(obterIdsEdicoesHistorico([], [{ batalha_id: "bc46-batalha8" }], batalhas)), ["BC46"]);
assert.deepEqual(Array.from(obterIdsEdicoesHistorico([], [], batalhas)), []);
assert.deepEqual(Array.from(obterIdsEdicoesHistorico([], [{ batalha_id: "inexistente" }], batalhas)), []);
const contagem = contarBatalhasPorEdicao(participacoes, batalhas);
assert.equal(contagem.get("BC46"), 1);
assert.equal(contagem.get("KLANDESTINA36"), 2);
assert.equal(contagem.size, 2);

// Uma participação com 0 pontos aparece no histórico, não no total de pontos.
const soComDerrota = contarBatalhasPorEdicao(
  [{ batalha_id: "bc46-batalha8" }],
  batalhas,
);
assert.equal(soComDerrota.get("BC46"), 1);

console.log("IMIP: histórico inclui participações sem pontos, sem duplicar edições.");
