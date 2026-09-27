import type {
  BatalhaInterpretada,
  ClassificacaoEdicao,
  ContextoProcessamento,
  FaseEdicao,
  ResultadoFormato,
} from "./tipos";

type BatalhaMegazord = {
  fase: FaseEdicao;
  equipa1: string[];
  pontosEquipa1: number;
  equipa2: string[];
  pontosEquipa2: number;
  batalha: BatalhaInterpretada;
};

const PONTOS_POR_FASE: Record<FaseEdicao, number> = {
  "PRÉ-FASE": 2,
  "1ª FASE": 2,
  "2ª FASE": 3,
  "SEMI-FINAL": 4,
  FINAL: 5,
};

const TAMANHO_EQUIPA_POR_FASE: Record<FaseEdicao, number> = {
  "PRÉ-FASE": 2,
  "1ª FASE": 2,
  "2ª FASE": 3,
  "SEMI-FINAL": 4,
  FINAL: 5,
};

function limparLinha(linha: string): string {
  return linha
    .trim()
    .replace(/^[•\*]\s*/, "")
    .replace(/\s+/g, " ");
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function interpretarFase(linha: string): FaseEdicao | null {
  const texto = normalizarTexto(linha)
    .toUpperCase()
    .replace(/[ªº]/g, "")
    .replace(/[:_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^PRE ?FASE$/.test(texto)) return "PRÉ-FASE";
  if (/^(1|1A|PRIMEIRA) ?FASE$/.test(texto)) return "1ª FASE";
  if (/^(2|2A|SEGUNDA) ?FASE$/.test(texto)) return "2ª FASE";

  if (
    /^(SEMI ?FINAL|SEMIFINAL|MEIA ?FINAL|MEIAS ?FINAIS)$/.test(
      texto,
    )
  ) {
    return "SEMI-FINAL";
  }

  if (/^(FINAL|GRANDE ?FINAL)$/.test(texto)) return "FINAL";
  return null;
}

function separarEquipa(
  texto: string,
  obterNomeOficial: (nome: string) => string,
): string[] {
  return texto
    .replace(/[.;:]$/, "")
    .split(/\s*(?:,|&|\+|\be\b)\s*/i)
    .map((nome) => nome.trim())
    .filter(Boolean)
    .map(obterNomeOficial);
}

function interpretarPontuacao(valor: string): number {
  return valor.toLowerCase() === "o" ? 0 : Number(valor);
}

function interpretarBatalha(
  linha: string,
  fase: FaseEdicao,
  obterNomeOficial: (nome: string) => string,
): BatalhaMegazord | null {
  const linhaSemNumero = linha.replace(
    /^\d+(?:\.\d+)?\s*[-.)]\s*/,
    "",
  );

  const correspondencia = linhaSemNumero.match(
    /^(.+?)\s+(\d+|[oO])\s+(?:VS|X)\s+(\d+|[oO])\s+(.+?)\s*$/i,
  );

  if (!correspondencia) return null;

  const equipa1 = separarEquipa(
    correspondencia[1],
    obterNomeOficial,
  );

  const equipa2 = separarEquipa(
    correspondencia[4],
    obterNomeOficial,
  );

  const pontosEquipa1 = interpretarPontuacao(
    correspondencia[2],
  );

  const pontosEquipa2 = interpretarPontuacao(
    correspondencia[3],
  );

  const tamanhoEsperado = TAMANHO_EQUIPA_POR_FASE[fase];

  if (
    equipa1.length !== tamanhoEsperado ||
    equipa2.length !== tamanhoEsperado ||
    Number.isNaN(pontosEquipa1) ||
    Number.isNaN(pontosEquipa2)
  ) {
    return null;
  }

  const empate = pontosEquipa1 === pontosEquipa2;

  const vencedores = empate
    ? []
    : pontosEquipa1 > pontosEquipa2
      ? equipa1
      : equipa2;

  const derrotados = empate
    ? []
    : pontosEquipa1 < pontosEquipa2
      ? equipa1
      : equipa2;

  const vitoriaSemSofrerPontos =
    !empate && Math.min(pontosEquipa1, pontosEquipa2) === 0;

  const batalha: BatalhaInterpretada = {
    fase,
    equipa1,
    pontosEquipa1,
    equipa2,
    pontosEquipa2,
    vencedores,
    derrotados,
    resultado: `${pontosEquipa1}-${pontosEquipa2}`,
    bonusDoisZero: vitoriaSemSofrerPontos,
    pontuacoes: [],
    detalhes: empate
      ? ["Batalha empatada: não atribui pontos."]
      : [],
  };

  return {
    fase,
    equipa1,
    pontosEquipa1,
    equipa2,
    pontosEquipa2,
    batalha,
  };
}

function registarNome(
  nomes: Map<string, string>,
  nome: string,
  normalizarNome: (nome: string) => string,
): string {
  const chave = normalizarNome(nome);
  if (chave) nomes.set(chave, nome);
  return chave;
}

function adicionarPontos(
  pontos: Map<string, number>,
  nomes: Map<string, string>,
  nome: string,
  quantidade: number,
  normalizarNome: (nome: string) => string,
): void {
  const chave = registarNome(nomes, nome, normalizarNome);
  if (!chave) return;

  pontos.set(chave, (pontos.get(chave) ?? 0) + quantidade);
}

function adicionarVitoriaSemSofrer(
  vitoriasSemSofrer: Map<string, number>,
  nome: string,
  normalizarNome: (nome: string) => string,
): void {
  const chave = normalizarNome(nome);
  if (!chave) return;

  vitoriasSemSofrer.set(
    chave,
    (vitoriasSemSofrer.get(chave) ?? 0) + 1,
  );
}

function contemTodos(
  equipa: string[],
  nomesProcurados: string[],
  normalizarNome: (nome: string) => string,
): boolean {
  const chavesEquipa = new Set(equipa.map(normalizarNome));

  return nomesProcurados.every((nome) =>
    chavesEquipa.has(normalizarNome(nome)),
  );
}

function adicionarBonusNaFinal(
  batalhas: BatalhaMegazord[],
  nome: string,
  pontos: number,
  motivo: string,
  normalizarNome: (nome: string) => string,
): void {
  const chave = normalizarNome(nome);

  const batalhaFinal = batalhas.find(
    (item) =>
      item.fase === "FINAL" &&
      item.batalha.vencedores.some(
        (vencedor) => normalizarNome(vencedor) === chave,
      ),
  );

  if (!batalhaFinal) return;

  batalhaFinal.batalha.pontuacoes.push({
    nome,
    pontos,
    motivo,
  });

  batalhaFinal.batalha.detalhes.push(
    `${nome}: ${motivo} (+${pontos})`,
  );
}

function criarClassificacao(
  pontos: Map<string, number>,
  vitoriasSemSofrer: Map<string, number>,
  nomes: Map<string, string>,
): ClassificacaoEdicao[] {
  return Array.from(nomes.entries())
    .map(([chave, nome]) => ({
      nome,
      pontos: pontos.get(chave) ?? 0,
      vitoriasDoisZero: vitoriasSemSofrer.get(chave) ?? 0,
    }))
    .sort((a, b) => {
      if (b.pontos !== a.pontos) {
        return b.pontos - a.pontos;
      }

      if (b.vitoriasDoisZero !== a.vitoriasDoisZero) {
        return b.vitoriasDoisZero - a.vitoriasDoisZero;
      }

      return a.nome.localeCompare(b.nome, "pt");
    });
}

function adicionarNomesDaEquipa(
  equipa: string[],
  nomes: Map<string, string>,
  pontos: Map<string, number>,
  vitoriasSemSofrer: Map<string, number>,
  normalizarNome: (nome: string) => string,
): void {
  for (const nome of equipa) {
    const chave = registarNome(nomes, nome, normalizarNome);
    if (!chave) continue;

    if (!pontos.has(chave)) pontos.set(chave, 0);

    if (!vitoriasSemSofrer.has(chave)) {
      vitoriasSemSofrer.set(chave, 0);
    }
  }
}

function validarProgressao(
  batalhas: BatalhaMegazord[],
  normalizarNome: (nome: string) => string,
): string[] {
  const erros: string[] = [];

  // A PRÉ-FASE não obriga à escolha de um MC.
  const fases: FaseEdicao[] = [
    "1ª FASE",
    "2ª FASE",
    "SEMI-FINAL",
    "FINAL",
  ];

  for (let indice = 1; indice < fases.length; indice += 1) {
    const faseAnterior = fases[indice - 1];
    const faseAtual = fases[indice];

    const batalhasAnteriores = batalhas.filter(
      (item) =>
        item.fase === faseAnterior &&
        item.batalha.vencedores.length > 0,
    );

    const batalhasAtuais = batalhas.filter(
      (item) => item.fase === faseAtual,
    );

    if (batalhasAtuais.length === 0) continue;

    if (batalhasAnteriores.length === 0) {
      erros.push(
        `${faseAtual}: falta a fase anterior (${faseAnterior}) para validar as escolhas.`,
      );
      continue;
    }

    const equipasJaUtilizadas = new Set<BatalhaMegazord>();

    for (
      let numero = 0;
      numero < batalhasAtuais.length;
      numero += 1
    ) {
      const batalhaAtual = batalhasAtuais[numero];

      for (const equipa of [
        batalhaAtual.equipa1,
        batalhaAtual.equipa2,
      ]) {
        const nomesNormalizados = equipa.map(normalizarNome);

        if (
          new Set(nomesNormalizados).size !==
          nomesNormalizados.length
        ) {
          erros.push(
            `${faseAtual}, batalha ${numero + 1}: a equipa tem MCs repetidos.`,
          );
          continue;
        }

        const batalhaDeOrigem = batalhasAnteriores.find(
          (anterior) =>
            anterior.batalha.vencedores
              .map(normalizarNome)
              .every((nome) =>
                nomesNormalizados.includes(nome),
              ),
        );

        if (!batalhaDeOrigem) {
          erros.push(
            `${faseAtual}, batalha ${numero + 1}: ` +
              `${equipa.join(", ")} não corresponde a uma equipa ` +
              `vencedora da ${faseAnterior}.`,
          );
          continue;
        }

        if (equipasJaUtilizadas.has(batalhaDeOrigem)) {
          erros.push(
            `${faseAtual}, batalha ${numero + 1}: ` +
              `a mesma equipa vencedora da ${faseAnterior} ` +
              `foi utilizada duas vezes.`,
          );
          continue;
        }

        equipasJaUtilizadas.add(batalhaDeOrigem);

        const vencedoresAnteriores = new Set(
          batalhaDeOrigem.batalha.vencedores.map(normalizarNome),
        );

        const mcAcrescentados = equipa.filter(
          (nome) =>
            !vencedoresAnteriores.has(normalizarNome(nome)),
        );

        const derrotadosAnteriores = new Set(
          batalhaDeOrigem.batalha.derrotados.map(normalizarNome),
        );

        if (
          mcAcrescentados.length !== 1 ||
          !derrotadosAnteriores.has(
            normalizarNome(mcAcrescentados[0] ?? ""),
          )
        ) {
          erros.push(
            `${faseAtual}, batalha ${numero + 1}: ` +
              `${batalhaDeOrigem.batalha.vencedores.join(", ")} ` +
              `deve manter a equipa e escolher exatamente um MC de ` +
              `${batalhaDeOrigem.batalha.derrotados.join(", ")}.`,
          );
        }
      }
    }
  }

  return erros;
}

export function processarMegazord(
  contexto: ContextoProcessamento,
): ResultadoFormato {
  const {
    linhas,
    normalizarNome,
    obterNomeOficial,
  } = contexto;

  const pontos = new Map<string, number>();
  const vitoriasSemSofrer = new Map<string, number>();
  const nomes = new Map<string, string>();

  const batalhasMegazord: BatalhaMegazord[] = [];
  const linhasIgnoradas: string[] = [];

  const permanenciasPedidas: string[] = [];
  const permanenciasValidas: string[] = [];
  const permanenciasIgnoradas: string[] = [];

  let faseAtual: FaseEdicao = "1ª FASE";
  let emPermanencia = false;
  let emCampeoes = false;

  for (const linhaOriginal of linhas) {
    const linha = limparLinha(linhaOriginal);

    if (!linha) continue;
    if (/^MEGAZORD:?$/i.test(linha)) continue;

    const faseInterpretada = interpretarFase(linha);

    if (faseInterpretada) {
      faseAtual = faseInterpretada;
      emPermanencia = false;
      emCampeoes = false;
      continue;
    }

    if (/^PERMAN[EÊ]NCIA:?$/i.test(linha)) {
      emPermanencia = true;
      emCampeoes = false;
      continue;
    }

    const campeoesNaMesmaLinha = linha.match(
      /^CAMPE[ÕO]ES?:\s*(.+)$/i,
    );

    if (campeoesNaMesmaLinha) {
      emCampeoes = true;
      emPermanencia = false;

      separarEquipa(
        campeoesNaMesmaLinha[1],
        obterNomeOficial,
      ).forEach((nome) => {
        registarNome(nomes, nome, normalizarNome);
      });

      continue;
    }

    if (/^CAMPE[ÕO]ES?:?$/i.test(linha)) {
      emCampeoes = true;
      emPermanencia = false;
      continue;
    }

    if (emPermanencia) {
      permanenciasPedidas.push(
        ...separarEquipa(linha, obterNomeOficial),
      );
      continue;
    }

    if (emCampeoes) {
      separarEquipa(linha, obterNomeOficial).forEach(
        (nome) => {
          registarNome(nomes, nome, normalizarNome);
        },
      );
      continue;
    }

    const batalhaInterpretada = interpretarBatalha(
      linha,
      faseAtual,
      obterNomeOficial,
    );

    if (!batalhaInterpretada) {
      linhasIgnoradas.push(linhaOriginal.trim());
      continue;
    }

    const {
      batalha,
      equipa1,
      equipa2,
      pontosEquipa1,
      pontosEquipa2,
    } = batalhaInterpretada;

    adicionarNomesDaEquipa(
      equipa1,
      nomes,
      pontos,
      vitoriasSemSofrer,
      normalizarNome,
    );

    adicionarNomesDaEquipa(
      equipa2,
      nomes,
      pontos,
      vitoriasSemSofrer,
      normalizarNome,
    );

    if (pontosEquipa1 === pontosEquipa2) {
      batalhasMegazord.push(batalhaInterpretada);
      continue;
    }

    const pontosBase = PONTOS_POR_FASE[faseAtual];

    const vitoriaSemSofrer =
      Math.min(pontosEquipa1, pontosEquipa2) === 0;

    for (const vencedor of batalha.vencedores) {
      adicionarPontos(
        pontos,
        nomes,
        vencedor,
        pontosBase,
        normalizarNome,
      );

      batalha.pontuacoes.push({
        nome: vencedor,
        pontos: pontosBase,
        motivo: `vitória na ${faseAtual}`,
      });

      batalha.detalhes.push(
        `${vencedor}: vitória na ${faseAtual} (+${pontosBase})`,
      );

      if (vitoriaSemSofrer) {
        adicionarPontos(
          pontos,
          nomes,
          vencedor,
          1,
          normalizarNome,
        );

        adicionarVitoriaSemSofrer(
          vitoriasSemSofrer,
          vencedor,
          normalizarNome,
        );

        batalha.pontuacoes.push({
          nome: vencedor,
          pontos: 1,
          motivo: "vitória sem a equipa adversária pontuar",
        });

        batalha.detalhes.push(
          `${vencedor}: vitória sem sofrer pontos (+1)`,
        );
      }
    }

    for (const derrotado of batalha.derrotados) {
      registarNome(nomes, derrotado, normalizarNome);
    }

    batalhasMegazord.push(batalhaInterpretada);
  }

  const batalhaFinal =
    [...batalhasMegazord]
      .reverse()
      .find(
        (item) =>
          item.fase === "FINAL" &&
          item.batalha.vencedores.length > 0,
      ) ?? null;

  const equipaCampea = batalhaFinal
    ? batalhaFinal.batalha.vencedores
    : [];

  const duplasOriginaisVencedoras = batalhasMegazord
    .filter(
      (item) =>
        item.fase === "1ª FASE" &&
        item.batalha.vencedores.length === 2,
    )
    .map((item) => item.batalha.vencedores);

  let duplaFielCampea: string[] | null = null;

  for (const dupla of duplasOriginaisVencedoras) {
    if (
      equipaCampea.length === 5 &&
      contemTodos(
        equipaCampea,
        dupla,
        normalizarNome,
      )
    ) {
      duplaFielCampea = dupla;
      break;
    }
  }

  if (duplaFielCampea) {
    for (const nome of duplaFielCampea) {
      adicionarPontos(
        pontos,
        nomes,
        nome,
        2,
        normalizarNome,
      );

      adicionarBonusNaFinal(
        batalhasMegazord,
        nome,
        2,
        "bónus de fidelidade da dupla original campeã",
        normalizarNome,
      );
    }
  }

  const derrotadosPrimeiraFase = new Set<string>();

  batalhasMegazord
    .filter(
      (item) =>
        item.fase === "PRÉ-FASE" ||
        item.fase === "1ª FASE",
    )
    .flatMap((item) => item.batalha.derrotados)
    .forEach((nome) => {
      derrotadosPrimeiraFase.add(
        normalizarNome(nome),
      );
    });

  const permanenciasProcessadas = new Set<string>();

  for (const nomePedido of permanenciasPedidas) {
    const chave = normalizarNome(nomePedido);

    if (permanenciasProcessadas.has(chave)) {
      permanenciasIgnoradas.push(`${nomePedido} — nome repetido`);
      continue;
    }

    permanenciasProcessadas.add(chave);

    if (
      !chave ||
      !derrotadosPrimeiraFase.has(chave)
    ) {
      permanenciasIgnoradas.push(nomePedido);
      continue;
    }

    const nomeOficial = nomes.get(chave) ?? nomePedido;

    adicionarPontos(
      pontos,
      nomes,
      nomeOficial,
      1,
      normalizarNome,
    );

    permanenciasValidas.push(nomeOficial);
  }

  linhasIgnoradas.push(
    ...validarProgressao(
      batalhasMegazord,
      normalizarNome,
    ),
  );

  const classificacao = criarClassificacao(
    pontos,
    vitoriasSemSofrer,
    nomes,
  );

  return {
    formato: "megazord",
    batalhas: batalhasMegazord.map(
      (item) => item.batalha,
    ),
    classificacao,
    permanencias: {
      validas: permanenciasValidas,
      ignoradas: permanenciasIgnoradas,
    },
    linhasIgnoradas,
    vencedorEdicao:
      equipaCampea.length > 0
        ? equipaCampea.join(", ")
        : null,
  };
}