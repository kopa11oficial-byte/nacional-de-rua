type Resposta<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

// O Supabase limita o número de linhas devolvidas por pedido.
export async function consultarTodas<T>(
  consulta: (inicio: number, fim: number) => PromiseLike<Resposta<T>>,
): Promise<T[]> {
  const tamanho = 500;
  const todas: T[] = [];

  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await consulta(inicio, inicio + tamanho - 1);
    if (error) throw new Error(error.message);

    const pagina = data ?? [];
    todas.push(...pagina);
    if (pagina.length < tamanho) return todas;
  }
}