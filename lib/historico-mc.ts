/** Lista as edições onde o MC marcou pontos OU participou numa batalha.
 * Uma derrota com zero pontos continua a ser uma participação oficial.
 * A lista preserva a ordem original e evita duplicações.
 */
export function obterIdsEdicoesHistorico(
  pontuacoes: ReadonlyArray<{ edicao_id: string }>,
  participacoes: ReadonlyArray<{ batalha_id: string }>,
  batalhas: ReadonlyArray<{ id: string; edicao_id: string }>,
): string[] {
  const edicaoPorBatalha = new Map(
    batalhas.map((batalha) => [batalha.id, batalha.edicao_id]),
  );

  const edicoes = new Set<string>();
  for (const pontuacao of pontuacoes) {
    if (pontuacao.edicao_id) edicoes.add(pontuacao.edicao_id);
  }
  for (const participacao of participacoes) {
    const edicaoId = edicaoPorBatalha.get(participacao.batalha_id);
    if (edicaoId) edicoes.add(edicaoId);
  }
  return [...edicoes];
}

/** Número de batalhas disputadas pelo MC em cada edição, sem depender dos pontos. */
export function contarBatalhasPorEdicao(
  participacoes: ReadonlyArray<{ batalha_id: string }>,
  batalhas: ReadonlyArray<{ id: string; edicao_id: string }>,
): Map<string, number> {
  const edicaoPorBatalha = new Map(
    batalhas.map((batalha) => [batalha.id, batalha.edicao_id]),
  );
  const contagens = new Map<string, number>();
  const batalhasUnicas = new Set<string>();
  for (const participacao of participacoes) {
    if (batalhasUnicas.has(participacao.batalha_id)) continue;
    batalhasUnicas.add(participacao.batalha_id);
    const edicaoId = edicaoPorBatalha.get(participacao.batalha_id);
    if (!edicaoId) continue;
    contagens.set(edicaoId, (contagens.get(edicaoId) ?? 0) + 1);
  }
  return contagens;
}
