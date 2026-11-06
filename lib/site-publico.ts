// Usado exclusivamente nos emails e ligações de recuperação dos MCs.
// A origem é configurada pelo servidor: nunca confiar em headers Host do pedido.
const SITE_PROVISORIO = "https://nacional-de-rua.rodasdeimproviso.workers.dev";

export function urlRecuperacaoMC(sitePublico?: string | null): string {
  const base = sitePublico?.trim() || SITE_PROVISORIO;
  let url: URL;

  try {
    url = new URL(base);
  } catch {
    throw new Error("SITE_PUBLICO_URL deve ser um domínio HTTPS válido.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("SITE_PUBLICO_URL deve indicar apenas a origem HTTPS do site.");
  }

  return new URL("/mcs/alterar-password", url.origin).toString();
}
