# IMIP — Nacional de Rua

Circuito de rodas de improviso, perfis de MCs, batalhas, pontuação, rankings e Final Nacional.

## Domínio oficial

**https://nacionalderua.pt**

Domínio provisório que deve continuar a funcionar durante a transição:

`https://nacional-de-rua.rodasdeimproviso.workers.dev`

O Worker chama-se `nacional-de-rua`. A configuração `wrangler.jsonc` já prevê `nacionalderua.pt` como **Custom Domain** e mantém `workers_dev: true` para não desativar o endereço anterior.

> **Pendente fora do GitHub:** confirmar que `nacionalderua.pt` foi registado e pertence à conta correta, ter uma zona DNS ativa na Cloudflare e realizar um deploy autorizado para o Custom Domain começar a servir tráfego. Alterar o ficheiro Wrangler **não regista um domínio**, nem prova que ele já esteja ativo.

## Tecnologias

- Next.js 16, React 19, TypeScript
- Supabase (dados, autenticação, fotografias)
- Cloudflare Workers / OpenNext
- GitHub Actions para validação

## Validação antes de publicar

O workflow `.github/workflows/verificar-imip.yml` executa as verificações em cada atualização do repositório. Para repetir num ambiente de desenvolvimento com Node.js 22:

```bash
npm ci
npx tsc --noEmit
node scripts/testar-chaves-normal.cjs
node scripts/testar-double-tri.cjs
node scripts/testar-historico-mcs.cjs
npm run build
```

Deploy para a conta Cloudflare autorizada:

```bash
npm run deploy
```

## Passagem para nacionalderua.pt

1. **Domínio e DNS:** registar/confirmar titularidade de `nacionalderua.pt`, adicionar a zona DNS à mesma conta Cloudflare que aloja o Worker `nacional-de-rua` e verificar que está ativa. O Custom Domain requer uma zona ativa e não pode ser criado se existir um CNAME em conflito.
2. **Cloudflare:** fazer deploy da versão atual do Worker (ou adicionar `nacionalderua.pt` em Workers & Pages > `nacional-de-rua` > Settings > Domains & Routes > Add > Custom Domain). O `wrangler.jsonc` já contém `routes: [{ pattern: "nacionalderua.pt", custom_domain: true }]` e `workers_dev: true`.
3. **Supabase Auth > URL Configuration:** configurar `Site URL` como `https://nacionalderua.pt` e adicionar aos `Redirect URLs` tanto `https://nacionalderua.pt/mcs/alterar-password` como `https://nacional-de-rua.rodasdeimproviso.workers.dev/mcs/alterar-password` durante a transição. Confirmar outros redirects existentes antes de os remover.
4. **Variável Cloudflare `SITE_PUBLICO_URL`:** definir `https://nacionalderua.pt` **só após o domínio e os redirects estarem funcionais**. As rotas de criação de acesso e geração de ligação manual usam `lib/site-publico.ts`. Enquanto esta variável não estiver definida, os links de recuperação continuam a apontar para o domínio provisório.
5. **Segredos Cloudflare:** manter `SUPABASE_SERVICE_ROLE_KEY` apenas como segredo do Worker; nunca em GitHub, frontend ou variáveis `NEXT_PUBLIC_*`.
6. **Testar no domínio definitivo:** home, Rodas, Ranking, MCs, um perfil, pedidos de acesso, recuperação de palavra-passe, autenticação de organizações, gestão de edições, suporte, Jurados e Final Nacional. Testar em telemóvel e computador, incluindo fotografias e HTTPS.
7. **WWW:** `www.nacionalderua.pt` é outro hostname. Se for necessário, criar uma regra Cloudflare para redirecionar WWW para `https://nacionalderua.pt` (com DNS apropriado).
8. **Comunicação:** só divulgar o domínio definitivo após confirmar que o Worker o serve com certificado válido. Conservar o URL `workers.dev` enquanto houver ligações antigas em circulação.

## Configuração do projeto

Variáveis públicas (frontend): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Segredos/variáveis do Worker (apenas no servidor): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_PUBLICO_URL`.

Nunca incluir valores secretos neste repositório.

## Épocas

- **2026:** testes e histórico
- **2027:** início oficial da época, de janeiro a outubro; novembro destinado ao apuramento; final nacional em dezembro

As edições, pontuações e perfis existentes **não** devem ser eliminados ou recalculados ao mudar o domínio.
