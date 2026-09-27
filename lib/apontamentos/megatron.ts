import type {
  BatalhaInterpretada,
  ClassificacaoEdicao,
  ContextoProcessamento,
  FaseEdicao,
  ResultadoFormato,
} from "./tipos";

type GrupoMegatron = {
  fase: FaseEdicao;
  numero: string;
  equipa1: string[];
  equipa2: string[];
  batalhas: BatalhaInterpretada[];
};

type ResultadoIndividual = {
  numero: string;
  mc1: string;
  pontosMc1: number;
  mc2: string;
  pontosMc2: number;
};

const PONTOS_POR_FASE: Record<FaseEdicao, number> = {
  "PRÉ-FASE": 2,
  "1ª FASE": 2,
  "2ª FASE": 3,
  "SEMI-FINAL": 4,
  FINAL: 5,
};

function limparLinha(linha: string): string {
  return linha
    .trim()
    .replace(/^[•*]\s*/, "")
    .replace(/\s+/g, " ");
}

function normalizarZero(valor: string): number {
  return valor.toLowerCase() === "o" ? 0 : Number(valor);
}

function interpretarFase(linha: string): FaseEdicao | null {
  const texto = linha
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[:_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^PRE ?FASE$/.test(texto)) {
    return "PRÉ-FASE";
  }

  if (/^(1|1A|PRIMEIRA) ?FASE$/.test(texto)) {
    return "1ª FASE";
  }

  if (/^(2|2A|SEGUNDA) ?FASE$/.test(texto)) {
    return "2ª FASE";
  }

  if (/^(SEMI ?FINAL|MEIA ?FINAL|MEIAS ?FINAIS)$/.test(texto)) {
    return "SEMI-FINAL";
  }

  if (/^FINAL$/.test(texto)) {
    return "FINAL";
  }

  return null;
}

function separarEquipa(
  texto: string,
  obterNomeOficial: (nome: string) => string,
): string[] {
  return texto
    .replace(/\.$/, "")
    .split(/\s*(?:,|&|\+|\be\b)\s*/i)
    .map((nome) => nome.trim())
    .filter(Boolean)
    .map(obterNomeOficial);
}

function interpretarCabecalhoGrupo(
  linha: string,
  fase: FaseEdicao,
  obterNomeOficial: (nome: string) => string,
): GrupoMegatron | null {
  const correspondencia = linha.match(
    /^(\d+)\s*[-.)]\s*(.+?)\s+(?:VS|X)\s+(.+?)(?:\s+\d+\s*[xX]\s*\d+)?\s*$/i,
  );

  if (!correspondencia) {
    return null;
  }

  const equipa1 = separarEquipa(correspondencia[2], obterNomeOficial);
  const equipa2 = separarEquipa(correspondencia[3], obterNomeOficial);

  if (equipa1.length !== 3 || equipa2.length !== 3) {
    return null;
  }

  return {
    fase,
    numero: correspondencia[1],
    equipa1,
    equipa2,
    batalhas: [],
  };
}

function interpretarResultadoIndividual(
  linha: string,
  obterNomeOficial: (nome: string) => string,
): ResultadoIndividual | null {
  const correspondencia = linha.match(
    /^(\d+(?:\.\d+)?)\s*[-.)]\s*(.+?)\s+([01oO])\s*(?:VS|X)\s*([01oO])\s*(.+?)\s*$/i,
  );

  if (!correspondencia) {
    return null;
  }

  const mc1 = obterNomeOficial(correspondencia[2].trim());
  const mc2 = obterNomeOficial(correspondencia[5].trim());
  const pontosMc1 = normalizarZero(correspondencia[3]);
  const pontosMc2 = normalizarZero(correspondencia[4]);

  if (pontosMc1 === pontosMc2) {
    return {
      numero: correspondencia[1],
      mc1,
      pontosMc1,
      mc2,
      pontosMc2,
    };
  }

  if (
    !(
      (pontosMc1 === 1 && pontosMc2 === 0) ||
      (pontosMc1 === 0 && pontosMc2 === 1)
    )
  ) {
    return null;
  }

  return {
    numero: correspondencia[1],
    mc1,
    pontosMc1,
    mc2,
    pontosMc2,
  };
}

function criarChaveNome(
  nome: string,
  normalizarNome: (nome: string) => string,
): string {
  return normalizarNome(nome);
}

function adicionarPontos(
  mapa: Map<string, number>,
  nomes: Map<string, string>,
  nome: string,
  quantidade: number,
  normalizarNome: (nome: string) => string,
): void {
  const chave = criarChaveNome(nome, normalizarNome);

  if (!chave) {
    return;
  }

  nomes.set(chave, nome);
  mapa.set(chave, (mapa.get(chave) ?? 0) + quantidade);
}

function adicionarDoisZero(
  mapa: Map<string, number>,
  nome: string,
  normalizarNome: (nome: string) => string,
): void {
  const chave = criarChaveNome(nome, normalizarNome);

  if (!chave) {
    return;
  }

  mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
}

function obterVencedoresGrupo(grupo: GrupoMegatron): string[] {
  return grupo.batalhas.flatMap((batalha) => batalha.vencedores);
}

function obterDerrotadosGrupo(grupo: GrupoMegatron): string[] {
  return grupo.batalhas.flatMap((batalha) => batalha.derrotados);
}

function trioVenceuTresZero(grupo: GrupoMegatron): string[] | null {
  if (grupo.batalhas.length !== 3) {
    return null;
  }

  const vencedores = obterVencedoresGrupo(grupo);

  if (vencedores.length !== 3) {
    return null;
  }

  const chavesEquipa1 = new Set(
    grupo.equipa1.map((nome) =>
      nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim(),
    ),
  );

  const chavesEquipa2 = new Set(
    grupo.equipa2.map((nome) =>
      nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim(),
    ),
  );

  const vencedoresNormalizados = vencedores.map((nome) =>
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim(),
  );

  const venceuEquipa1 = vencedoresNormalizados.every((nome) =>
    chavesEquipa1.has(nome),
  );

  const venceuEquipa2 = vencedoresNormalizados.every((nome) =>
    chavesEquipa2.has(nome),
  );

  if (venceuEquipa1) {
    return grupo.equipa1;
  }

  if (venceuEquipa2) {
    return grupo.equipa2;
  }

  return null;
}

function obterTrioVencedorFinal(
  grupos: GrupoMegatron[],
): string[] | null {
  const gruposFinal = grupos.filter((grupo) => grupo.fase === "FINAL");

  if (gruposFinal.length === 0) {
    return null;
  }

  const ultimoGrupo = gruposFinal[gruposFinal.length - 1];
  const vencedores = obterVencedoresGrupo(ultimoGrupo);

  if (vencedores.length !== 3) {
    return null;
  }

  return vencedores;
}

function criarClassificacao(
  pontos: Map<string, number>,
  doisZero: Map<string, number>,
  nomes: Map<string, string>,
): ClassificacaoEdicao[] {
  return Array.from(nomes.entries())
    .map(([chave, nome]) => ({
      nome,
      pontos: pontos.get(chave) ?? 0,
      vitoriasDoisZero: doisZero.get(chave) ?? 0,
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

export function processarMegatron(
  contexto: ContextoProcessamento,
): ResultadoFormato {
  const {
    linhas,
    normalizarNome,
    obterNomeOficial,
  } = contexto;

  const pontos = new Map<string, number>();
  const doisZero = new Map<string, number>();
  const nomes = new Map<string, string>();

  const grupos: GrupoMegatron[] = [];
  const batalhas: BatalhaInterpretada[] = [];
  const linhasIgnoradas: string[] = [];

  const permanenciasPedidas: string[] = [];
  const permanenciasValidas: string[] = [];
  const permanenciasIgnoradas: string[] = [];

  let faseAtual: FaseEdicao = "1ª FASE";
  let grupoAtual: GrupoMegatron | null = null;
  let emPermanencia = false;
  let emVencedores = false;

  for (const linhaOriginal of linhas) {
    const linha = limparLinha(linhaOriginal);

    if (!linha) {
      continue;
    }

    if (/^MEGATRON:?$/i.test(linha)) {
      continue;
    }

    const faseInterpretada = interpretarFase(linha);

    if (faseInterpretada) {
      faseAtual = faseInterpretada;
      grupoAtual = null;
      emPermanencia = false;
      emVencedores = false;
      continue;
    }

    if (/^PERMAN[EÊ]NCIA:?$/i.test(linha)) {
      emPermanencia = true;
      emVencedores = false;
      grupoAtual = null;
      continue;
    }

    if (/^VENCEDORES?:?$/i.test(linha)) {
      emVencedores = true;
      emPermanencia = false;
      grupoAtual = null;
      continue;
    }

    if (emPermanencia) {
      const pessoas = separarEquipa(linha, obterNomeOficial);
      permanenciasPedidas.push(...pessoas);
      continue;
    }

    if (emVencedores) {
      // O vencedor oficial será confirmado pelos resultados da FINAL.
      // Esta lista é aceite para não aparecer como linha ignorada.
      separarEquipa(linha, obterNomeOficial).forEach((nome) => {
        const chave = normalizarNome(nome);

        if (chave) {
          nomes.set(chave, nome);
        }
      });
      continue;
    }

    const cabecalho = interpretarCabecalhoGrupo(
      linha,
      faseAtual,
      obterNomeOficial,
    );

    if (cabecalho) {
      grupoAtual = cabecalho;
      grupos.push(cabecalho);

      [...cabecalho.equipa1, ...cabecalho.equipa2].forEach((nome) => {
        const chave = normalizarNome(nome);

        if (chave) {
          nomes.set(chave, nome);
          pontos.set(chave, pontos.get(chave) ?? 0);
          doisZero.set(chave, doisZero.get(chave) ?? 0);
        }
      });

      continue;
    }

    const resultado = interpretarResultadoIndividual(
      linha,
      obterNomeOficial,
    );

    if (!resultado || !grupoAtual) {
      linhasIgnoradas.push(linhaOriginal.trim());
      continue;
    }

    const houveEmpate = resultado.pontosMc1 === resultado.pontosMc2;

    const vencedor = houveEmpate
      ? null
      : resultado.pontosMc1 > resultado.pontosMc2
        ? resultado.mc1
        : resultado.mc2;

    const derrotado = houveEmpate
      ? null
      : resultado.pontosMc1 < resultado.pontosMc2
        ? resultado.mc1
        : resultado.mc2;

    const pontosVitoria = PONTOS_POR_FASE[grupoAtual.fase];

    const batalha: BatalhaInterpretada = {
      fase: grupoAtual.fase,
      equipa1: [resultado.mc1],
      pontosEquipa1: resultado.pontosMc1,
      equipa2: [resultado.mc2],
      pontosEquipa2: resultado.pontosMc2,
      vencedores: vencedor ? [vencedor] : [],
      derrotados: derrotado ? [derrotado] : [],
      resultado: `${resultado.pontosMc1}-${resultado.pontosMc2}`,
      bonusDoisZero: false,
      pontuacoes: [],
      detalhes: houveEmpate
        ? ["Confronto individual empatado: não atribui pontos."]
        : [],
    };

    if (vencedor) {
      adicionarPontos(
        pontos,
        nomes,
        vencedor,
        pontosVitoria,
        normalizarNome,
      );

      batalha.pontuacoes.push({
        nome: vencedor,
        pontos: pontosVitoria,
        motivo: `vitória na ${grupoAtual.fase}`,
      });

      batalha.detalhes.push(
        `${vencedor}: vitória na ${grupoAtual.fase} (+${pontosVitoria})`,
      );
    }

    if (derrotado) {
      const chaveDerrotado = normalizarNome(derrotado);

      nomes.set(chaveDerrotado, derrotado);
    }

    grupoAtual.batalhas.push(batalha);
    batalhas.push(batalha);
  }

  for (const grupo of grupos) {
    const trioPerfeito = trioVenceuTresZero(grupo);

    if (!trioPerfeito) {
      continue;
    }

    for (const nome of trioPerfeito) {
      adicionarPontos(
        pontos,
        nomes,
        nome,
        1,
        normalizarNome,
      );

      adicionarDoisZero(
        doisZero,
        nome,
        normalizarNome,
      );

      const batalha = grupo.batalhas.find((item) =>
        item.vencedores.some(
          (vencedor) =>
            normalizarNome(vencedor) === normalizarNome(nome),
        ),
      );

      if (batalha) {
        batalha.bonusDoisZero = true;
        batalha.pontuacoes.push({
          nome,
          pontos: 1,
          motivo: "vitória perfeita do trio por 3-0",
        });
        batalha.detalhes.push(
          `${nome}: vitória perfeita do trio por 3-0 (+1)`,
        );
      }
    }
  }

  const trioVencedor = obterTrioVencedorFinal(grupos);

  const derrotadosPrimeiraFase = new Set<string>();

  grupos
    .filter(
      (grupo) =>
        grupo.fase === "PRÉ-FASE" ||
        grupo.fase === "1ª FASE",
    )
    .flatMap(obterDerrotadosGrupo)
    .forEach((nome) => {
      derrotadosPrimeiraFase.add(normalizarNome(nome));
    });

  const permanenciasProcessadas = new Set<string>();

  for (const nomePedido of permanenciasPedidas) {
    const chave = normalizarNome(nomePedido);

    if (permanenciasProcessadas.has(chave)) {
      permanenciasIgnoradas.push(`${nomePedido} — nome repetido`);
      continue;
    }

    permanenciasProcessadas.add(chave);

    if (!chave || !derrotadosPrimeiraFase.has(chave)) {
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

  const classificacao = criarClassificacao(
    pontos,
    doisZero,
    nomes,
  );

  return {
    formato: "megatron",
    batalhas,
    classificacao,
    permanencias: {
      validas: permanenciasValidas,
      ignoradas: permanenciasIgnoradas,
    },
    linhasIgnoradas,
    vencedorEdicao: trioVencedor
      ? trioVencedor.join(", ")
      : null,
  };
}