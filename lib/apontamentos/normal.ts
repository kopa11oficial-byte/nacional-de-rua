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

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ªº.:[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function retirarNumeroInicial(linha: string) {
  return linha.replace(/^\s*\d+\s*[-.)]\s*/, "").trim();
}

function reconhecerFase(linha: string): FaseEdicao | null {
  const texto = normalizarTexto(linha);

  if (
    texto === "pre fase" ||
    texto === "pre-fase" ||
    texto === "pre eliminatoria"
  ) {
    return "PRÉ-FASE";
  }

  if (
    texto === "1 fase" ||
    texto === "1- fase" ||
    texto === "primeira fase"
  ) {
    return "1ª FASE";
  }

  if (
    texto === "2 fase" ||
    texto === "2- fase" ||
    texto === "segunda fase"
  ) {
    return "2ª FASE";
  }

  if (
    texto === "semi" ||
    texto === "semis" ||
    texto === "meia final" ||
    texto === "meias finais" ||
    texto === "semi-final"
  ) {
    return "SEMI-FINAL";
  }

  if (texto === "final" || texto === "batalha final") {
    return "FINAL";
  }

  return null;
}

function reconhecerPermanencia(linha: string) {
  const texto = normalizarTexto(linha);

  return (
    texto === "permanencia" ||
    texto === "permanencias" ||
    texto === "pontos extra" ||
    texto === "ponto extra" ||
    texto === "ficaram ate ao fim" ||
    texto === "permaneceram ate ao fim"
  );
}

function reconhecerVencedorEdicao(linha: string) {
  const resultado = linha.match(
    /^\s*(?:vencedor|vencedora|campeao|campea)\s*[:\-]?\s*(.+?)\s*$/i,
  );

  return resultado?.[1]?.trim() || null;
}

function separarNomes(texto: string): string[] {
  return texto
    .split(/\s+(?:e|&|\+)\s+|\s*,\s*/i)
    .map((nome) => nome.trim())
    .filter(Boolean);
}

function pontosDaFase(fase: FaseEdicao) {
  if (fase === "2ª FASE") return 3;
  if (fase === "SEMI-FINAL") return 4;
  if (fase === "FINAL") return 5;
  return 2;
}

function interpretarBatalha(linha: string): ResultadoLido | null {
  const limpa = retirarNumeroInicial(linha)
    .replace(/\s+/g, " ")
    .trim();

  const formatos: Array<{
    regex: RegExp;
    criar: (resultado: RegExpMatchArray) => ResultadoLido;
  }> = [
    {
      regex: /^(.+?)\s+vs\.?\s+(.+?)\s+(\d+)\s*[-–—xX:]\s*(\d+)$/i,
      criar: (resultado) => ({
        mc1: resultado[1].trim(),
        pontos1: Number(resultado[3]),
        mc2: resultado[2].trim(),
        pontos2: Number(resultado[4]),
      }),
    },
    {
      regex: /^(.+?)\s+(\d+)\s+vs\.?\s+(.+?)\s+(\d+)$/i,
      criar: (resultado) => ({
        mc1: resultado[1].trim(),
        pontos1: Number(resultado[2]),
        mc2: resultado[3].trim(),
        pontos2: Number(resultado[4]),
      }),
    },
    {
      regex: /^(.+?)\s+(\d+)\s+vs\.?\s+(\d+)\s+(.+)$/i,
      criar: (resultado) => ({
        mc1: resultado[1].trim(),
        pontos1: Number(resultado[2]),
        mc2: resultado[4].trim(),
        pontos2: Number(resultado[3]),
      }),
    },
    {
      regex: /^(.+?)\s*[-:]\s*(\d+)\s+vs\.?\s+(.+?)\s*[-:]\s*(\d+)$/i,
      criar: (resultado) => ({
        mc1: resultado[1].trim(),
        pontos1: Number(resultado[2]),
        mc2: resultado[3].trim(),
        pontos2: Number(resultado[4]),
      }),
    },
    {
      regex: /^(.+?)\s+(\d+)\s*[-–—xX:]\s*(\d+)\s+(.+)$/i,
      criar: (resultado) => ({
        mc1: resultado[1].trim(),
        pontos1: Number(resultado[2]),
        mc2: resultado[4].trim(),
        pontos2: Number(resultado[3]),
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
      normalizarTexto(batalha.mc1) === normalizarTexto(batalha.mc2)
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
          const participantes = [
            ...batalha.equipa1,
            ...batalha.equipa2,
          ].map(normalizarNome);

          return participantes.includes(a) && participantes.includes(b);
        });

      if (confronto) {
        const vencedores = confronto.vencedores.map(normalizarNome);
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
  const { linhas, normalizarNome, obterNomeOficial } = contexto;

  const batalhas: BatalhaInterpretada[] = [];
  const linhasIgnoradas: string[] = [];
  const permanenciasIndicadas: string[] = [];
  const permanenciasValidas: string[] = [];
  const permanenciasIgnoradas: string[] = [];

  const pontos: Record<string, number> = {};
  const doisZero: Record<string, number> = {};
  const nomes: Record<string, string> = {};

  let faseAtual: FaseEdicao = "1ª FASE";
  let aLerPermanencias = false;
  let aLerVencedor = false;
  let vencedorEdicao: string | null = null;

  function registarMC(nomeRecebido: string) {
    const nomeOficial = obterNomeOficial(nomeRecebido.trim());
    const chave = normalizarNome(nomeOficial);

    nomes[chave] ??= nomeOficial;
    pontos[chave] ??= 0;
    doisZero[chave] ??= 0;

    return { chave, nome: nomes[chave] };
  }

  function validarVencedor(
    texto: string,
    numeroLinha: number,
  ) {
    const final = [...batalhas]
      .reverse()
      .find((batalha) => batalha.fase === "FINAL");

    const indicados = separarNomes(texto);

    if (
      final &&
      indicados.length === final.vencedores.length &&
      indicados.every((nome) =>
        final.vencedores.some(
          (vencedor) =>
            normalizarNome(vencedor) ===
            normalizarNome(obterNomeOficial(nome)),
        ),
      )
    ) {
      vencedorEdicao = final.vencedores.join(" e ");
    } else {
      linhasIgnoradas.push(
        `Linha ${numeroLinha}: ${texto} — vencedor não corresponde à final`,
      );
    }
  }

  for (let indice = 0; indice < linhas.length; indice += 1) {
    let linha = linhas[indice].trim();

    if (!linha) continue;
    if (/^[★*━═=\s]+$/.test(linha)) continue;

    if (/^vencedor(?:es)?\s*:\s*$/i.test(linha)) {
      aLerVencedor = true;
      continue;
    }

    if (aLerVencedor) {
      validarVencedor(linha, indice + 1);
      aLerVencedor = false;
      continue;
    }

    const vencedorIndicado = reconhecerVencedorEdicao(linha);

    if (vencedorIndicado) {
      validarVencedor(vencedorIndicado, indice + 1);
      continue;
    }

    if (reconhecerPermanencia(linha)) {
      aLerPermanencias = true;
      continue;
    }

    if (aLerPermanencias) {
      permanenciasIndicadas.push(linha);
      continue;
    }

    const faseReconhecida = reconhecerFase(linha);

    if (faseReconhecida) {
      faseAtual = faseReconhecida;
      continue;
    }

    if (/\bvs\.?\s*$/i.test(linha)) {
      let proxima = indice + 1;

      while (proxima < linhas.length && !linhas[proxima].trim()) {
        proxima += 1;
      }

      if (proxima < linhas.length) {
        linha += ` ${linhas[proxima].trim()}`;
        indice = proxima;
      }
    }

    const resultado = interpretarBatalha(linha);

    if (!resultado) {
      linhasIgnoradas.push(`Linha ${indice + 1}: ${linha}`);
      continue;
    }

    const equipa1 = separarNomes(resultado.mc1)
      .map(registarMC)
      .filter((mc) => mc.chave);

    const equipa2 = separarNomes(resultado.mc2)
      .map(registarMC)
      .filter((mc) => mc.chave);

    if (
      equipa1.length !== equipa2.length ||
      equipa1.length === 0 ||
      new Set([...equipa1, ...equipa2].map((mc) => mc.chave)).size !==
        equipa1.length + equipa2.length
    ) {
      linhasIgnoradas.push(
        `Linha ${indice + 1}: ${linha} — equipas inválidas`,
      );
      continue;
    }

    const empate = resultado.pontos1 === resultado.pontos2;

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

    const bonusDoisZero =
      !empate &&
      Math.max(resultado.pontos1, resultado.pontos2) === 2 &&
      Math.min(resultado.pontos1, resultado.pontos2) === 0;

    const pontuacoes: PontuacaoBatalha[] = [];
    const detalhes: string[] = [];

    if (vencedores) {
      let pontosBatalha = pontosDaFase(faseAtual);

      if (bonusDoisZero) {
        pontosBatalha += 1;
        detalhes.push("bónus 2-0: +1");
      }

      for (const vencedor of vencedores) {
        pontos[vencedor.chave] += pontosBatalha;

        if (bonusDoisZero) {
          doisZero[vencedor.chave] += 1;
        }

        pontuacoes.push({
          nome: vencedor.nome,
          pontos: pontosBatalha,
          motivo:
            `${faseAtual} — vitória ${resultado.pontos1}-${resultado.pontos2}`,
        });
      }
    }

    batalhas.push({
      fase: faseAtual,
      equipa1: equipa1.map((mc) => mc.nome),
      pontosEquipa1: resultado.pontos1,
      equipa2: equipa2.map((mc) => mc.nome),
      pontosEquipa2: resultado.pontos2,
      vencedores: vencedores?.map((mc) => mc.nome) ?? [],
      derrotados: derrotados?.map((mc) => mc.nome) ?? [],
      resultado: `${resultado.pontos1}-${resultado.pontos2}`,
      bonusDoisZero,
      pontuacoes,
      detalhes: empate ? ["empate — sem pontuação"] : detalhes,
    });
  }

  const elegiveisParaPermanencia = new Set<string>();

  for (const batalha of batalhas) {
    if (
      batalha.fase !== "PRÉ-FASE" &&
      batalha.fase !== "1ª FASE"
    ) {
      continue;
    }

    for (const derrotado of batalha.derrotados) {
      elegiveisParaPermanencia.add(normalizarNome(derrotado));
    }
  }

  const permanenciasProcessadas = new Set<string>();

  for (const nomeIndicado of permanenciasIndicadas) {
    const nomeOficial = obterNomeOficial(nomeIndicado);
    const chave = normalizarNome(nomeOficial);

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
    permanenciasValidas.push(nomes[chave]);
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