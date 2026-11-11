// Origem oficial única para todos os emails e convites do Nacional de Rua.
// Não utilizar o endereço antigo workers.dev nem aceitar redirecionamentos
// provenientes de variáveis desatualizadas na Cloudflare.
const SITE_OFICIAL = "https://www.nacionalderua.pt";

export function urlRecuperacaoMC(_sitePublico?: string | null): string {
  return `${SITE_OFICIAL}/mcs/alterar-password`;
}
