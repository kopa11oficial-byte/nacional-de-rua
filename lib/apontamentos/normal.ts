
import type {
  BatalhaInterpretada,
  ClassificacaoEdicao,
  ContextoProcessamento,
  FaseEdicao,
  PontuacaoBatalha,
  ResultadoFormato,
} from "./tipos";

type ResultadoLido = {
  mc1: string;
  pontos1: number;
  mc2: string;
  pontos2: number;
};

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ªº.:*()[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function retirarNumeroInicial(linha: string): string {
  return linha.replace(/^\s*\d+\s*[-.)]\s*/, "").trim();
}

function reconhecerFase(linha: string): FaseEdicao | null {
  const texto = normalizarTexto(linha)
    .replace(/[-_–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (["pre fase", "pre eliminatoria"].includes(texto)) {
    return "PRÉ-FASE";
  }

  if (["1 fase", "primeira fase"].includes(texto)) {
    return "1ª FASE";
  }

  if (
    [
      "repescagem",
      "repescagem 1 round",
      "repescagem um round",
    ].includes(texto)
  ) {
    return "REPESCAGEM";
  }

  if (["2 fase", "segunda fase"].includes(texto)) {
    return "2ª FASE";
  }

  if (
    [
      "semi",
      "semis",
      "semifinal",
      "semifinais",
      "semi final",
      "semi finais",
      "meia final",
      "meias finais",
    ].includes(texto)
  ) {
    return "SEMI-FINAL";
  }

  if (["final", "batalha final"].includes(texto)) {
    return "FINAL";
  }

  return null;
}

function reconhecerPermanencia(linha: string): boolean {
  return [
    "permanencia",
    "permanencias",
    "pontos extra",
    "ponto extra",
    "ponto de permanencia",
    "pontos de permanencia",
    "ficaram ate ao fim",
    "permaneceram ate ao fim",
  ].includes(normalizarTexto(linha));
}

function reconhecerVencedorEdicao(
  linha: string,
): string | null {
  const semAcentos = linha
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const resultado = semAcentos.match(
    /^(?:vencedor(?:a|es|as)?|campeao|campea|campeoes|winner(?:s)?)(?=$|[\s:–—-])\s*[:–—-]?\s*(.*)$/i,
  );

  return resultado ? resultado[1].trim() : null;
}

function separarNomes(texto: string): string[] {
  return texto
    .split(/\s+(?:e|&|\+)\s+|\s*,\s*/i)
    .map((nome) => nome.trim())
    .filter(Boolean);
}

function pontosDaFase(fase: FaseEdicao): number {
  switch (fase) {
    case "PRÉ-FASE":
      return 0;

    case "1ª FASE":
      return 2;

    case "REPESCAGEM":
      return 2;

    case "2ª FASE":
      return 3;

    case "SEMI-FINAL":
      return 4;

    case "FINAL":
      return 5;

    default:
      return 0;
  }
}

function interpretarBatalha(
  linha: string,
): ResultadoLido | null {
  const limpa = retirarNumeroInicial(linha)
    .replace(/\s+/g, " ")
    .trim();

  const formatos: Array<{
    regex: RegExp;
    criar: (resultado: RegExpMatchArray) => ResultadoLido;
  }> = [
    {
      regex:
        /^(.+?)\s+vs\.?\s+(.+?)\s+(\d+)\s*[-–—xX:]\s*(\d+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[3]),
        mc2: r[2].trim(),
        pontos2: Number(r[4]),
      }),
    },
    {
      regex:
        /^(.+?)\s+(\d+)\s+vs\.?\s+(.+?)\s+(\d+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[3].trim(),
        pontos2: Number(r[4]),
      }),
    },
    {
      regex:
        /^(.+?)\s+(\d+)\s+vs\.?\s+(\d+)\s+(.+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[4].trim(),
        pontos2: Number(r[3]),
      }),
    },
    {
      regex:
        /^(.+?)\s*[-:]\s*(\d+)\s+vs\.?\s+(.+?)\s*[-:]\s*(\d+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[3].trim(),
        pontos2: Number(r[4]),
      }),
    },
    {
      regex:
        /^(.+?)\s+(\d+)\s*[-–—xX:]\s*(\d+)\s+(.+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[4].trim(),
        pontos2: Number(r[3]),
      }),
    },
  ];

  for (const formato of formatos) {
    const resultado = limpa.match(formato.regex);

    if (!resultado) continue;

    const batalha = formato.criar(resultado);

    if (
      !batalha.mc1 ||
      !batalha.mc2 ||
      normalizarTexto(batalha.mc1) ===
        normalizarTexto(batalha.mc2)
    ) {
      return null;
    }

    return batalha;
  }

  return null;
}

function criarClassificacao(
  pontos: Record<string, number>,
  doisZero: Record<string, number>,
  nomes: Record<string, string>,
  batalhas: BatalhaInterpretada[],
  normalizarNome: (nome: string) => string,
): ClassificacaoEdicao[] {
  return Object.keys(pontos)
    .sort((a, b) => {
      if (pontos[b] !== pontos[a]) {
        return pontos[b] - pontos[a];
      }

      if (doisZero[b] !== doisZero[a]) {
        return doisZero[b] - doisZero[a];
      }

      const confronto = [...batalhas]
        .reverse()
        .find((batalha) => {
          const lado1 =
            batalha.equipa1.map(normalizarNome);

          const lado2 =
            batalha.equipa2.map(normalizarNome);

          return (
            (lado1.includes(a) && lado2.includes(b)) ||
            (lado1.includes(b) && lado2.includes(a))
          );
        });

      if (confronto) {
        const vencedores =
          confronto.vencedores.map(normalizarNome);

        if (vencedores.includes(a)) return -1;
        if (vencedores.includes(b)) return 1;
      }

      return nomes[a].localeCompare(nomes[b], "pt");
    })
    .map((chave) => ({
      nome: nomes[chave],
      pontos: pontos[chave],
      vitoriasDoisZero: doisZero[chave],
    }));
}

export function processarNormal(
  contexto: ContextoProcessamento,
): ResultadoFormato {
  const {
    linhas,
    normalizarNome,
    obterNomeOficial,
  } = contexto;

  const batalhas: BatalhaInterpretada[] = [];
  const linhasIgnoradas: string[] = [];

  const permanenciasIndicadas: string[] = [];
  const permanenciasValidas: string[] = [];
  const permanenciasIgnoradas: string[] = [];

  const pontos: Record<string, number> =
    Object.create(null);

  const doisZero: Record<string, number> =
    Object.create(null);

  const nomes: Record<string, string> =
    Object.create(null);

  let faseAtual: FaseEdicao = "1ª FASE";
  let aLerPermanencias = false;
  let linhaVencedorPendente: number | null = null;
  let vencedorEdicao: string | null = null;

  function prepararMC(nomeRecebido: string) {
    const nome = obterNomeOficial(
      nomeRecebido.trim(),
    );

    return {
      chave: normalizarNome(nome),
      nome,
    };
  }

  function registarMC(mc: {
    chave: string;
    nome: string;
  }) {
    nomes[mc.chave] ??= mc.nome;
    pontos[mc.chave] ??= 0;
    doisZero[mc.chave] ??= 0;

    return {
      chave: mc.chave,
      nome: nomes[mc.chave],
    };
  }

  function validarVencedor(
    texto: string,
    numeroLinha: number,
  ) {
    const final = [...batalhas]
      .reverse()
      .find((batalha) => batalha.fase === "FINAL");

    const indicados = separarNomes(texto).map(
      (nome) =>
        normalizarNome(obterNomeOficial(nome)),
    );

    const vencedores =
      final?.vencedores.map(normalizarNome) ?? [];

    if (
      final &&
      indicados.length === vencedores.length &&
      new Set(indicados).size === indicados.length &&
      indicados.every((nome) =>
        vencedores.includes(nome),
      )
    ) {
      vencedorEdicao = final.vencedores.join(" e ");
      return;
    }

    linhasIgnoradas.push(
      `Linha ${numeroLinha}: ${texto} — vencedor não corresponde à final`,
    );
  }

  function avisarVencedorSemNome() {
    if (linhaVencedorPendente !== null) {
      linhasIgnoradas.push(
        `Linha ${linhaVencedorPendente}: cabeçalho de vencedor sem nome`,
      );

      linhaVencedorPendente = null;
    }
  }

  for (
    let indice = 0;
    indice < linhas.length;
    indice += 1
  ) {
    let linha = linhas[indice].trim();

    if (
      !linha ||
      /^[★*━═=\s]+$/.test(linha)
    ) {
      continue;
    }

    const vencedorIndicado =
      reconhecerVencedorEdicao(linha);

    if (vencedorIndicado !== null) {
      avisarVencedorSemNome();
      aLerPermanencias = false;

      if (vencedorIndicado) {
        validarVencedor(
          vencedorIndicado,
          indice + 1,
        );
      } else {
        linhaVencedorPendente = indice + 1;
      }

      continue;
    }

    const faseReconhecida =
      reconhecerFase(linha);

    const permanenciaReconhecida =
      reconhecerPermanencia(linha);

    if (linhaVencedorPendente !== null) {
      if (
        faseReconhecida ||
        permanenciaReconhecida
      ) {
        avisarVencedorSemNome();
      } else {
        validarVencedor(linha, indice + 1);
        linhaVencedorPendente = null;
        continue;
      }
    }

    if (faseReconhecida) {
      faseAtual = faseReconhecida;
      aLerPermanencias = false;
      continue;
    }

    if (permanenciaReconhecida) {
      aLerPermanencias = true;
      continue;
    }

    if (aLerPermanencias) {
      permanenciasIndicadas.push(
        ...separarNomes(linha),
      );

      continue;
    }

    if (/\bvs\.?\s*$/i.test(linha)) {
      let proxima = indice + 1;

      while (
        proxima < linhas.length &&
        !linhas[proxima].trim()
      ) {
        proxima += 1;
      }

      if (proxima < linhas.length) {
        linha += ` ${linhas[proxima].trim()}`;
        indice = proxima;
      }
    }

    const resultado = interpretarBatalha(linha);

    if (!resultado) {
      linhasIgnoradas.push(
        `Linha ${indice + 1}: ${linha}`,
      );

      continue;
    }

    // REPESCAGEM:
    // Apenas um round: 1-0 ou 0-1.
    // Outros resultados não são aceites.
    if (
      faseAtual === "REPESCAGEM" &&
      !(
        (
          resultado.pontos1 === 1 &&
          resultado.pontos2 === 0
        ) ||
        (
          resultado.pontos1 === 0 &&
          resultado.pontos2 === 1
        )
      )
    ) {
      linhasIgnoradas.push(
        `Linha ${indice + 1}: ${linha} — REPESCAGEM aceita apenas 1–0 ou 0–1 (um round)`,
      );

      continue;
    }

    const lado1 = separarNomes(
      resultado.mc1,
    ).map(prepararMC);

    const lado2 = separarNomes(
      resultado.mc2,
    ).map(prepararMC);

    const participantes = [
      ...lado1,
      ...lado2,
    ];

    if (
      lado1.length === 0 ||
      lado1.length !== lado2.length ||
      participantes.some((mc) => !mc.chave) ||
      new Set(
        participantes.map((mc) => mc.chave),
      ).size !== participantes.length
    ) {
      linhasIgnoradas.push(
        `Linha ${indice + 1}: ${linha} — equipas inválidas`,
      );

      continue;
    }

    const equipa1 = lado1.map(registarMC);
    const equipa2 = lado2.map(registarMC);

    const empate =
      resultado.pontos1 === resultado.pontos2;

    const vencedores = empate
      ? null
      : resultado.pontos1 > resultado.pontos2
        ? equipa1
        : equipa2;

    const derrotados = empate
      ? null
      : vencedores === equipa1
        ? equipa2
        : equipa1;

    // A pré-fase e a repescagem não
    // atribuem bónus de vitória por 2-0.
    const bonusDoisZero =
      faseAtual !== "PRÉ-FASE" &&
      faseAtual !== "REPESCAGEM" &&
      !empate &&
      Math.max(
        resultado.pontos1,
        resultado.pontos2,
      ) === 2 &&
      Math.min(
        resultado.pontos1,
        resultado.pontos2,
      ) === 0;

    const pontuacoes: PontuacaoBatalha[] = [];
    const detalhes: string[] = [];

    if (vencedores) {
      const pontosBatalha =
        pontosDaFase(faseAtual) +
        (bonusDoisZero ? 1 : 0);

      if (faseAtual === "PRÉ-FASE") {
        detalhes.push(
          "Pré-fase — apuramento sem pontuação",
        );
      }

      if (faseAtual === "REPESCAGEM") {
        detalhes.push(
          "Repescagem — 1 round; vitória: +2 pontos por MC",
        );
      }

      if (bonusDoisZero) {
        detalhes.push("bónus 2-0: +1");
      }

      for (const vencedor of vencedores) {
        pontos[vencedor.chave] +=
          pontosBatalha;

        if (bonusDoisZero) {
          doisZero[vencedor.chave] += 1;
        }

        // A pré-fase não cria
        // movimentos de pontuação.
        if (faseAtual !== "PRÉ-FASE") {
          pontuacoes.push({
            nome: vencedor.nome,
            pontos: pontosBatalha,
            motivo:
              `${faseAtual} — vitória ` +
              `${resultado.pontos1}-${resultado.pontos2}`,
          });
        }
      }
    }

    batalhas.push({
      fase: faseAtual,

      equipa1: equipa1.map(
        (mc) => mc.nome,
      ),

      pontosEquipa1: resultado.pontos1,

      equipa2: equipa2.map(
        (mc) => mc.nome,
      ),

      pontosEquipa2: resultado.pontos2,

      vencedores:
        vencedores?.map((mc) => mc.nome) ?? [],

      derrotados:
        derrotados?.map((mc) => mc.nome) ?? [],

      resultado:
        `${resultado.pontos1}-${resultado.pontos2}`,

      bonusDoisZero,
      pontuacoes,

      detalhes: empate
        ? ["empate — sem pontuação"]
        : detalhes,
    });
  }

  avisarVencedorSemNome();

  const elegiveisParaPermanencia =
    new Set<string>();

  for (const batalha of batalhas) {
    if (
      batalha.fase !== "PRÉ-FASE" &&
      batalha.fase !== "1ª FASE"
    ) {
      continue;
    }

    for (const derrotado of batalha.derrotados) {
      elegiveisParaPermanencia.add(
        normalizarNome(derrotado),
      );
    }
  }

  const permanenciasProcessadas =
    new Set<string>();

  for (const nomeIndicado of permanenciasIndicadas) {
    const nomeOficial =
      obterNomeOficial(nomeIndicado);

    const chave =
      normalizarNome(nomeOficial);

    if (permanenciasProcessadas.has(chave)) {
      permanenciasIgnoradas.push(
        `${nomeIndicado} — nome repetido`,
      );

      continue;
    }

    permanenciasProcessadas.add(chave);

    if (!(chave in pontos)) {
      permanenciasIgnoradas.push(
        `${nomeIndicado} — não participou nesta edição`,
      );

      continue;
    }

    if (!elegiveisParaPermanencia.has(chave)) {
      permanenciasIgnoradas.push(
        `${nomes[chave]} — não perdeu na pré-fase ou na 1.ª fase`,
      );

      continue;
    }

    pontos[chave] += 1;

    permanenciasValidas.push(
      nomes[chave],
    );
  }

  return {
    formato: "normal",

    batalhas,

    classificacao: criarClassificacao(
      pontos,
      doisZero,
      nomes,
      batalhas,
      normalizarNome,
    ),

    permanencias: {
      validas: permanenciasValidas,
      ignoradas: permanenciasIgnoradas,
    },

    linhasIgnoradas,
    vencedorEdicao,
  };
}
