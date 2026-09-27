import type {
  BatalhaInterpretada,
  ClassificacaoEdicao,
  ContextoProcessamento,
  PontuacaoBatalha,
  ResultadoFormato,
} from "./tipos";

type CartaWildcard =
  | "NORMAL"
  | "DOUBLE_OR_NOTHING"
  | "REVIVE"
  | "SOBREVIVIDO";

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

function reconhecerCabecalho(linha: string) {
  const texto = normalizarTexto(linha);
  return texto === "wildcard" || texto === "wildcards";
}

function reconhecerPermanencia(linha: string) {
  const texto = normalizarTexto(linha);
  return (
    texto === "permanencia" ||
    texto === "permanencias" ||
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

function reconhecerCartaSemBatalha(linha: string) {
  const texto = normalizarTexto(retirarNumeroInicial(linha));
  return (
    !/\bvs\b/.test(texto) &&
    (/\bwildcards?\s+(?:freezer|frezer|congelo|freeze)\b/.test(texto) ||
      /\b(?:freezer|frezer|congelo|freeze)\b/.test(texto))
  );
}

function tipoCarta(texto: string | null): CartaWildcard {
  const carta = normalizarTexto(texto ?? "");

  if (/double\s+or\s+nothing|dobro\s+ou\s+nada/.test(carta)) {
    return "DOUBLE_OR_NOTHING";
  }

  if (/second\s+life|revive|segunda\s+vida/.test(carta)) {
    return "REVIVE";
  }

  if (/sobrevivido|repescado/.test(carta)) {
    return "SOBREVIVIDO";
  }

  return "NORMAL";
}

function retirarCarta(linha: string) {
  const semNumero = retirarNumeroInicial(linha);
  const explicativa = semNumero.match(
    /^(.+?)\s+ativa\s+wildcards?\s+(.+?)\s+contra\s+(.+?)\s+[—–-]+\s+(.+?)\s+vence\s+(\d+)\s*[-x:]\s*(\d+)$/i,
  );

  if (explicativa) {
    const mc1 = explicativa[1].trim();
    const carta = explicativa[2].trim();
    const mc2 = explicativa[3].trim();
    const vencedor = normalizarTexto(explicativa[4]);
    const pontosVencedor = Number(explicativa[5]);
    const pontosVencido = Number(explicativa[6]);
    const mc1Venceu = normalizarTexto(mc1) === vencedor;

    return {
      linha: `${mc1} vs ${mc2} ${
        mc1Venceu
          ? `${pontosVencedor}-${pontosVencido}`
          : `${pontosVencido}-${pontosVencedor}`
      }`,
      carta,
    };
  }

  const anotacao = semNumero.match(
    /\(\s*(?:wildcards?\s+)?(double\s+or\s+nothing|dobro\s+ou\s+nada|second\s+life|revive|segunda\s+vida|sobrevivido|repescado|one\s+round|hunter|freezer|frezer|congelo|freeze)[^)]*\)/i,
  );

  return {
    linha: semNumero
      .replace(anotacao?.[0] ?? "", "")
      .replace(/\s+/g, " ")
      .trim(),
    carta: anotacao?.[1] ?? null,
  };
}

function interpretarResultado(linha: string): ResultadoLido | null {
  const limpa = retirarNumeroInicial(linha).replace(/\s+/g, " ").trim();

  const formatos: Array<{
    regex: RegExp;
    criar: (resultado: RegExpMatchArray) => ResultadoLido;
  }> = [
    {
      regex: /^(.+?)\s+vs\.?\s+(.+?)\s+(\d+)\s*[-–—xX:]\s*(\d+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[3]),
        mc2: r[2].trim(),
        pontos2: Number(r[4]),
      }),
    },
    {
      regex: /^(.+?)\s+(\d+)\s+vs\.?\s+(.+?)\s+(\d+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[3].trim(),
        pontos2: Number(r[4]),
      }),
    },
    {
      regex: /^(.+?)\s+(\d+)\s+vs\.?\s+(\d+)\s+(.+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[4].trim(),
        pontos2: Number(r[3]),
      }),
    },
    {
      regex: /^(.+?)\s*[-:]\s*(\d+)\s+vs\.?\s+(.+?)\s*[-:]\s*(\d+)$/i,
      criar: (r) => ({
        mc1: r[1].trim(),
        pontos1: Number(r[2]),
        mc2: r[3].trim(),
        pontos2: Number(r[4]),
      }),
    },
  ];

  for (const formato of formatos) {
    const resultado = limpa.match(formato.regex);
    if (!resultado) continue;

    const batalha = formato.criar(resultado);
    if (
      batalha.mc1 &&
      batalha.mc2 &&
      normalizarTexto(batalha.mc1) !== normalizarTexto(batalha.mc2)
    ) {
      return batalha;
    }
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
      if (pontos[b] !== pontos[a]) return pontos[b] - pontos[a];
      if (doisZero[b] !== doisZero[a]) return doisZero[b] - doisZero[a];

      const confronto = [...batalhas].reverse().find((batalha) => {
        const participantes = [...batalha.equipa1, ...batalha.equipa2].map(
          normalizarNome,
        );
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

export function processarWildcards(
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
  let aLerPermanencias = false;
  let vencedorEdicao: string | null = null;
  let vencedorAnterior: string | null = null;
  let vitoriasConsecutivas = 0;

  function registarMC(nomeRecebido: string) {
    const nomeOficial = obterNomeOficial(nomeRecebido.trim());
    const chave = normalizarNome(nomeOficial);

    nomes[chave] ??= nomeOficial;
    pontos[chave] ??= 0;
    doisZero[chave] ??= 0;
    return chave;
  }

  for (let indice = 0; indice < linhas.length; indice += 1) {
    const linha = linhas[indice].trim();
    if (!linha || reconhecerCabecalho(linha)) continue;

    const vencedorIndicado = reconhecerVencedorEdicao(linha);
    if (vencedorIndicado) {
      vencedorEdicao = obterNomeOficial(vencedorIndicado);
      registarMC(vencedorIndicado);
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

    if (reconhecerCartaSemBatalha(linha)) continue;

    const anotacao = retirarCarta(linha);
    const resultado = interpretarResultado(anotacao.linha);

    if (!resultado) {
      linhasIgnoradas.push(`Linha ${indice + 1}: ${linha}`);
      continue;
    }

    const chave1 = registarMC(resultado.mc1);
    const chave2 = registarMC(resultado.mc2);
    const nome1 = nomes[chave1];
    const nome2 = nomes[chave2];

    if (resultado.pontos1 === resultado.pontos2) {
      batalhas.push({
        fase: "1ª FASE",
        equipa1: [nome1],
        pontosEquipa1: resultado.pontos1,
        equipa2: [nome2],
        pontosEquipa2: resultado.pontos2,
        vencedores: [],
        derrotados: [],
        resultado: `${resultado.pontos1}-${resultado.pontos2}`,
        bonusDoisZero: false,
        pontuacoes: [],
        detalhes: ["empate — sem pontuação"],
      });
      vencedorAnterior = null;
      vitoriasConsecutivas = 0;
      continue;
    }

    const chaveVencedor =
      resultado.pontos1 > resultado.pontos2 ? chave1 : chave2;
    const chaveDerrotado = chaveVencedor === chave1 ? chave2 : chave1;
    const nomeVencedor = nomes[chaveVencedor];
    const nomeDerrotado = nomes[chaveDerrotado];
    const bonusDoisZero =
      Math.max(resultado.pontos1, resultado.pontos2) === 2 &&
      Math.min(resultado.pontos1, resultado.pontos2) === 0;
    const carta = tipoCarta(anotacao.carta);
    const detalhes: string[] = [];
    let pontosBatalha = 2;

    if (carta === "REVIVE") {
      pontosBatalha = 3;
      detalhes.push("vitória com REVIVE: 3 pontos");
    }

    if (carta === "SOBREVIVIDO") {
      pontosBatalha = 1;
      detalhes.push("vitória como Sobrevivido/repescado: 1 ponto");
    }

    if (bonusDoisZero) {
      pontosBatalha += 1;
      doisZero[chaveVencedor] += 1;
      detalhes.push("bónus 2-0: +1");
    }

    if (carta === "DOUBLE_OR_NOTHING") {
      pontosBatalha *= 2;
      detalhes.push("DOUBLE OR NOTHING: pontos x2");
    }

    if (
      chaveDerrotado === vencedorAnterior &&
      vitoriasConsecutivas >= 3
    ) {
      pontosBatalha += 1;
      detalhes.push("derrubou MC após 3 vitórias consecutivas: +1");
    }

    pontos[chaveVencedor] += pontosBatalha;

    const pontuacoes: PontuacaoBatalha[] = [
      {
        nome: nomeVencedor,
        pontos: pontosBatalha,
        motivo: `WILDCARDS — vitória ${resultado.pontos1}-${resultado.pontos2}`,
      },
    ];

    batalhas.push({
      fase: "1ª FASE",
      equipa1: [nome1],
      pontosEquipa1: resultado.pontos1,
      equipa2: [nome2],
      pontosEquipa2: resultado.pontos2,
      vencedores: [nomeVencedor],
      derrotados: [nomeDerrotado],
      resultado: `${resultado.pontos1}-${resultado.pontos2}`,
      bonusDoisZero,
      pontuacoes,
      detalhes,
    });

    if (chaveVencedor === vencedorAnterior) {
      vitoriasConsecutivas += 1;
    } else {
      vencedorAnterior = chaveVencedor;
      vitoriasConsecutivas = 1;
    }
  }

  if (batalhas.length > 0) {
    const final = batalhas[batalhas.length - 1];
    final.fase = "FINAL";

    if (final.vencedores.length === 1) {
      const nomeVencedor = final.vencedores[0];
      const chaveVencedor = normalizarNome(nomeVencedor);
      const bonusFinal = final.bonusDoisZero ? 5 : 4;

      pontos[chaveVencedor] += bonusFinal;
      final.pontuacoes[0].pontos += bonusFinal;
      final.pontuacoes[0].motivo +=
        " — vencedor da última batalha";
      final.detalhes.push(
        `vencedor da última batalha: +${bonusFinal}`,
      );
    }
  }

  const elegiveis = new Set<string>();
  for (const batalha of batalhas.slice(0, 8)) {
    for (const derrotado of batalha.derrotados) {
      elegiveis.add(normalizarNome(derrotado));
    }
  }

  const permanenciasProcessadas = new Set<string>();

  for (const nomeIndicado of permanenciasIndicadas) {
    const nomeOficial = obterNomeOficial(nomeIndicado);
    const chave = normalizarNome(nomeOficial);

    if (permanenciasProcessadas.has(chave)) {
      permanenciasIgnoradas.push(`${nomeIndicado} — nome repetido`);
      continue;
    }

    permanenciasProcessadas.add(chave);

    if (!(chave in pontos)) {
      permanenciasIgnoradas.push(
        `${nomeIndicado} — não participou nesta edição`,
      );
      continue;
    }

    if (!elegiveis.has(chave)) {
      permanenciasIgnoradas.push(
        `${nomes[chave]} — não perdeu numa das primeiras 8 batalhas`,
      );
      continue;
    }

    pontos[chave] += 1;
    permanenciasValidas.push(nomes[chave]);
  }

  return {
    formato: "wildcards",
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