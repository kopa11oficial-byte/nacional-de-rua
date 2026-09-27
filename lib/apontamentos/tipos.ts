export type FormatoEdicao =
  | "normal"
  | "wildcards"
  | "lado_a_vs_lado_b"
  | "megatron"
  | "megazord";

export type FaseEdicao =
  | "PRÉ-FASE"
  | "1ª FASE"
  | "2ª FASE"
  | "SEMI-FINAL"
  | "FINAL";

export type PontuacaoBatalha = {
  nome: string;
  pontos: number;
  motivo: string;
};

export type BatalhaInterpretada = {
  fase: FaseEdicao;
  equipa1: string[];
  pontosEquipa1: number;
  equipa2: string[];
  pontosEquipa2: number;
  vencedores: string[];
  derrotados: string[];
  resultado: string;
  bonusDoisZero: boolean;
  pontuacoes: PontuacaoBatalha[];
  detalhes: string[];
};

export type ClassificacaoEdicao = {
  nome: string;
  pontos: number;
  vitoriasDoisZero: number;
};

export type PermanenciaInterpretada = {
  validas: string[];
  ignoradas: string[];
};

export type ResultadoFormato = {
  formato: FormatoEdicao;
  batalhas: BatalhaInterpretada[];
  classificacao: ClassificacaoEdicao[];
  permanencias: PermanenciaInterpretada;
  linhasIgnoradas: string[];
  vencedorEdicao: string | null;
};

export type ContextoProcessamento = {
  linhas: string[];
  normalizarNome: (nome: string) => string;
  obterNomeOficial: (nome: string) => string;
};

export type ProcessadorFormato = (
  contexto: ContextoProcessamento,
) => ResultadoFormato;
