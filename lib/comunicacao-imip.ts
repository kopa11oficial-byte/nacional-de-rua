export const REGIOES_IMIP = [
  { id: "norte", nome: "Norte" },
  { id: "centro", nome: "Centro" },
  { id: "lisboa_margem_sul", nome: "Lisboa e Margem Sul" },
  { id: "algarve", nome: "Algarve" },
] as const;

export const REGIOES_PROPOSTAS_IMIP = [
  ...REGIOES_IMIP,
  { id: "nacional", nome: "Nacional / várias regiões" },
] as const;

export type RegiaoImip = typeof REGIOES_IMIP[number]["id"];
export type RegiaoPropostaImip = typeof REGIOES_PROPOSTAS_IMIP[number]["id"];
export type EstadoPropostaImip =
  | "recebida"
  | "em_analise"
  | "a_aguardar_resposta"
  | "concluida";

export const ESTADOS_PROPOSTAS_IMIP: {id: EstadoPropostaImip; nome: string}[] = [
  {id:"recebida",nome:"Recebida"},
  {id:"em_analise",nome:"Em análise"},
  {id:"a_aguardar_resposta",nome:"A aguardar resposta"},
  {id:"concluida",nome:"Concluída"},
];

export type PropostaImip = {
  id: string;
  proponente_id: string;
  nome_entidade: string;
  email: string;
  assunto: string;
  regiao: RegiaoPropostaImip;
  regiao_responsavel: RegiaoImip | null;
  estado: EstadoPropostaImip;
  criado_em: string;
};

export type MensagemImip = {
  id: string;
  proposta_id: string;
  autor_id: string;
  autor_tipo: "proponente" | "suporte";
  conteudo: string;
  interna: boolean;
  criado_em: string;
};

export function nomeRegiaoImip(id: string | null) {
  if (!id) return "Por atribuir";
  return REGIOES_PROPOSTAS_IMIP.find((r) => r.id === id)?.nome ?? "Região";
}

export function nomeEstadoImip(id: string) {
  return ESTADOS_PROPOSTAS_IMIP.find((e) => e.id === id)?.nome ?? "Recebida";
}

export function dataImip(valor: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(valor));
}
