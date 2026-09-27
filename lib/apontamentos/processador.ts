import { processarLadoAVsLadoB } from "./lado-a-vs-lado-b";
import { processarMegatron } from "./megatron";
import { processarMegazord } from "./megazord";
import { processarNormal } from "./normal";
import type {
  ContextoProcessamento,
  FormatoEdicao,
  ProcessadorFormato,
  ResultadoFormato,
} from "./tipos";
import { processarWildcards } from "./wildcards";

const PROCESSADORES: Record<FormatoEdicao, ProcessadorFormato> = {
  normal: processarNormal,
  wildcards: processarWildcards,
  lado_a_vs_lado_b: processarLadoAVsLadoB,
  megatron: processarMegatron,
  megazord: processarMegazord,
};

function prepararNomeFormato(formato: string): string {
  return formato
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/\bx\b/g, " vs ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function normalizarFormatoEdicao(
  formato: string | null | undefined,
): FormatoEdicao | null {
  if (!formato) return null;

  const valor = prepararNomeFormato(formato);

  if (
    valor === "normal" ||
    valor === "edicao_normal" ||
    valor === "formato_normal"
  ) {
    return "normal";
  }

  if (
    valor === "wildcard" ||
    valor === "wildcards" ||
    valor === "wild_card" ||
    valor === "wild_cards"
  ) {
    return "wildcards";
  }

  if (
    valor === "lado_a_vs_lado_b" ||
    valor === "lado_a_versus_lado_b" ||
    valor === "lado_a_e_lado_b" ||
    valor === "lado_a_lado_b" ||
    valor === "ladoavsladob"
  ) {
    return "lado_a_vs_lado_b";
  }

  if (valor === "megatron" || valor === "formato_megatron") {
    return "megatron";
  }

  if (valor === "megazord" || valor === "formato_megazord") {
    return "megazord";
  }

  return null;
}

export function obterProcessadorFormato(
  formato: string | null | undefined,
): ProcessadorFormato {
  const formatoNormalizado = normalizarFormatoEdicao(formato);

  if (!formatoNormalizado) {
    throw new Error(
      `Formato não reconhecido: ${formato?.trim() || "não indicado"}.`,
    );
  }

  return PROCESSADORES[formatoNormalizado];
}

export function processarApontamentos(
  formato: string | null | undefined,
  contexto: ContextoProcessamento,
): ResultadoFormato {
  const processador = obterProcessadorFormato(formato);
  const formatoNormalizado = normalizarFormatoEdicao(formato);

  const linhas = contexto.linhas.map((original) => {
    const linha = original.trim();
    const simples = linha
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[ªº]/g, "")
      .replace(/\s*-\s*/g, " ")
      .replace(/\s+/g, " ")
      .replace(/:$/, "")
      .trim();

    if (
      formatoNormalizado === "normal" ||
      formatoNormalizado === "megatron" ||
      formatoNormalizado === "megazord"
    ) {
      if (/^1\s*fas[ea]$/.test(simples)) return "1ª FASE";
      if (/^2\s*fas[ea]$/.test(simples)) return "2ª FASE";
      if (simples.replace(/\s/g, "") === "semifinal") {
        return "SEMI-FINAL";
      }
    }

    if (
      /^ponto(?:s)?\s+(?:extra|de\s+permanecia|de\s+permanencia)$/.test(
        simples,
      )
    ) {
      return formatoNormalizado === "normal"
        ? "PONTO EXTRA"
        : "PERMANÊNCIA";
    }

    const linhaSemAcentos = linha
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (/^campeao\b/i.test(linhaSemAcentos)) {
      return original.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return original;
  });

  return processador({ ...contexto, linhas });
}

export function formatoTemProcessador(
  formato: string | null | undefined,
): boolean {
  return normalizarFormatoEdicao(formato) !== null;
}

export function listarFormatosSuportados(): FormatoEdicao[] {
  return [
    "normal",
    "wildcards",
    "lado_a_vs_lado_b",
    "megatron",
    "megazord",
  ];
}