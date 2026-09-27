import type {
  BatalhaInterpretada,
  ClassificacaoEdicao,
  ContextoProcessamento,
  PontuacaoBatalha,
  ResultadoFormato,
} from "./tipos";

type ResultadoEquipas = {
  equipa1: string[];
  pontos1: number;
  equipa2: string[];
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

function reconhecerCabecalhoDeLado(linha: string) {
  return /^(?:lado|labo)\s+[ab]$/.test(normalizarTexto(linha));
}

function reconhecerTituloDoFormato(linha: string) {
  return /^(?:lado|labo)\s+a\s+vs\s+(?:lado|labo)\s+b$/.test(
    normalizarTexto(linha),
  );
}

function reconhecerFinal(linha: string) {
  const texto = normalizarTexto(linha);

  return texto === "final" || texto === "batalha final";
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

function separarEquipa(texto: string) {
  return texto
    .split(/\s+(?:e|&)\s+|\s*,\s*/i)
    .map((nome) => nome.trim())
    .filter(Boolean);
}

function interpretarBatalha(linha: string): ResultadoEquipas | null {
  const limpa = retirarNumeroInicial(linha)
    .replace(/\s+/g, " ")
    .trim();

  const partes = limpa.split(/\s+vs\.?\s+/i);

  if (partes.length !== 2) {
    return null;
  }

  const esquerda = partes[0].match(/^(.+?)\s+(\d+)$/);
  const direita = partes[1].match(/^(.+?)\s+(\d+)$/);

  if (!esquerda || !direita) {
    return null;
  }

  const equipa1 = separarEquipa(esquerda[1]);
  const equipa2 = separarEquipa(direita[1]);

  if (equipa1.length === 0 || equipa2.length === 0) {
    return null;
  }

  return {
    equipa1,
    pontos1: Number(esquerda[2]),
    equipa2,
    pontos2: Number(direita[2]),
  };
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

      const confronto = [...batalhas].reverse().find((batalha) => {
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

export function processarLadoAVsLadoB(
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

  const pontos: Record<string, number> = {};
  const doisZero: Record<string, number> = {};
  const nomes: Record<string, string> = {};

  let aLerParticipantes = false;
  let aLerPermanencias = false;
  let faseFinal = false;
  let vencedorEdicao: string | null = null;

  function registarMC(nomeRecebido: string) {
    const nomeOficial = obterNomeOficial(nomeRecebido.trim());
    const chave = normalizarNome(nomeOficial);

    nomes[chave] ??= nomeOficial;
    pontos[chave] ??= 0;
    doisZero[chave] ??= 0;

    return {
      chave,
      nome: nomes[chave],
    };
  }

  for (let indice = 0; indice < linhas.length; indice += 1) {
    const linha = linhas[indice].trim();

    if (!linha) {
      continue;
    }

    if (
      reconhecerTituloDoFormato(linha) ||
      reconhecerCabecalhoDeLado(linha)
    ) {
      aLerParticipantes = true;
      continue;
    }

    if (reconhecerFinal(linha)) {
      faseFinal = true;
      aLerParticipantes = false;
      continue;
    }

    const vencedorIndicado = reconhecerVencedorEdicao(linha);

    if (vencedorIndicado) {
      vencedorEdicao = vencedorIndicado.toUpperCase();
      continue;
    }

    if (reconhecerPermanencia(linha)) {
      aLerPermanencias = true;
      aLerParticipantes = false;
      continue;
    }

    if (aLerPermanencias) {
      permanenciasIndicadas.push(linha);
      continue;
    }

    if (
      aLerParticipantes &&
      !/\bvs\.?\b/i.test(linha)
    ) {
      registarMC(linha);
      continue;
    }

    const resultado = interpretarBatalha(linha);

    if (!resultado) {
      linhasIgnoradas.push(
        `Linha ${indice + 1}: ${linha}`,
      );

      continue;
    }

    aLerParticipantes = false;

    const equipa1 = resultado.equipa1.map(registarMC);
    const equipa2 = resultado.equipa2.map(registarMC);

    const empate =
      resultado.pontos1 === resultado.pontos2;

    const equipaVencedora = empate
      ? []
      : resultado.pontos1 > resultado.pontos2
        ? equipa1
        : equipa2;

    const equipaDerrotada = empate
      ? []
      : resultado.pontos1 > resultado.pontos2
        ? equipa2
        : equipa1;

    const bonusDoisZero =
      !empate &&
      Math.max(
        resultado.pontos1,
        resultado.pontos2,
      ) === 2 &&
      Math.min(
        resultado.pontos1,
        resultado.pontos2,
      ) === 0;

    const pontosVitoria =
      (faseFinal ? 5 : 2) +
      (bonusDoisZero ? 1 : 0);

    const pontuacoes: PontuacaoBatalha[] = [];
    const detalhes: string[] = [];

    for (const mc of equipaVencedora) {
      pontos[mc.chave] += pontosVitoria;

      if (bonusDoisZero) {
        doisZero[mc.chave] += 1;
      }

      pontuacoes.push({
        nome: mc.nome,
        pontos: pontosVitoria,
        motivo: faseFinal
          ? `LADO A VS LADO B — vencedor da final ${resultado.pontos1}-${resultado.pontos2}`
          : `LADO A VS LADO B — vitória ${resultado.pontos1}-${resultado.pontos2}`,
      });
    }

    if (faseFinal) {
      for (const mc of equipaDerrotada) {
        pontos[mc.chave] += 3;

        pontuacoes.push({
          nome: mc.nome,
          pontos: 3,
          motivo:
            `LADO A VS LADO B — finalista derrotado ` +
            `${resultado.pontos1}-${resultado.pontos2}`,
        });
      }

      detalhes.push("vencedor da final: +5");
      detalhes.push("finalista derrotado: +3");
    }

    if (bonusDoisZero) {
      detalhes.push("bónus 2-0: +1");
    }

    batalhas.push({
      fase: faseFinal ? "FINAL" : "1ª FASE",
      equipa1: equipa1.map((mc) => mc.nome),
      pontosEquipa1: resultado.pontos1,
      equipa2: equipa2.map((mc) => mc.nome),
      pontosEquipa2: resultado.pontos2,
      vencedores: equipaVencedora.map(
        (mc) => mc.nome,
      ),
      derrotados: equipaDerrotada.map(
        (mc) => mc.nome,
      ),
      resultado:
        `${resultado.pontos1}-${resultado.pontos2}`,
      bonusDoisZero,
      pontuacoes,
      detalhes: empate
        ? ["empate — sem pontuação"]
        : detalhes,
    });
  }

  const primeirosOitoEliminados: string[] = [];
  const eliminadosRegistados = new Set<string>();

  for (const batalha of batalhas) {
    if (batalha.fase === "FINAL") {
      continue;
    }

    for (const derrotado of batalha.derrotados) {
      const chave = normalizarNome(derrotado);

      if (eliminadosRegistados.has(chave)) {
        continue;
      }

      eliminadosRegistados.add(chave);
      primeirosOitoEliminados.push(chave);

      if (primeirosOitoEliminados.length === 8) {
        break;
      }
    }

    if (primeirosOitoEliminados.length === 8) {
      break;
    }
  }

  const elegiveis = new Set(
    primeirosOitoEliminados,
  );

  const permanenciasProcessadas =
    new Set<string>();

  for (const nomeIndicado of permanenciasIndicadas) {
    const nomeOficial =
      obterNomeOficial(nomeIndicado);

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

    if (!elegiveis.has(chave)) {
      permanenciasIgnoradas.push(
        `${nomes[chave]} — não pertence aos primeiros 8 eliminados`,
      );

      continue;
    }

    pontos[chave] += 1;
    permanenciasValidas.push(nomes[chave]);
  }

  return {
    formato: "lado_a_vs_lado_b",
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