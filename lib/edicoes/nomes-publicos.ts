/** Nome curto na listagem pública da Klandestina; não altera os dados guardados. */
export function eRodaKlandestina(nomeRoda: string | null | undefined): boolean {
  return /\bklandestina\b/i.test(nomeRoda ?? "");
}

export function nomePublicoEdicao(
  nomeEdicao: string,
  nomeRoda: string | null | undefined,
): string {
  if (!eRodaKlandestina(nomeRoda)) return nomeEdicao;

  // Aceita KL39, kl38, "37.ª Klandestina", "36ª klandestina seletiva..."
  // Não usa numero_edicao, que reinicia a cada temporada.
  const correspondencia = nomeEdicao.match(
    /^\s*(?:KL[\s.\-]*(\d{1,3})\b|(\d{1,3})\s*\.?\s*[ªº]?\s*klandestina\b)/i,
  );
  const numero = correspondencia?.[1] ?? correspondencia?.[2];
  return numero ? `KL ${Number(numero)}` : nomeEdicao;
}
