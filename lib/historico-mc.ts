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
