"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import ConversaImip from "../../components/ConversaImip";
import {
  dataImip, nomeEstadoImip, nomeRegiaoImip, REGIOES_IMIP,
  ESTADOS_PROPOSTAS_IMIP,
  type RegiaoImip, type EstadoPropostaImip, type PropostaImip,
} from "../../../lib/comunicacao-imip";

type Membro = { auth_user_id: string; email_contacto: string; regiao: RegiaoImip; ativo: boolean };
const imagens = [
  "/suportes/JURADOS_E_ARBITRAGEM.png",
  "/suportes/RODAS_E_ORGANIZACOES.png",
  "/suportes/MCS_E_PARTICIPACAO.png",
  "/suportes/RANKING_E_RESULTADOS.png",
];

export default function CentralComunicacaoImip() {
  const [userId, setUserId] = useState("");
  const [temAcesso, setTemAcesso] = useState(false);
  const [administrador, setAdministrador] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [propostas, setPropostas] = useState<PropostaImip[]>([]);
  const [selecionada, setSelecionada] = useState("");
  const [filtroRegiao, setFiltroRegiao] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [notificacoes, setNotificacoes] = useState(0);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [emailMembro, setEmailMembro] = useState("");
  const [regiaoMembro, setRegiaoMembro] = useState<RegiaoImip>("norte");
  const [aAtribuir, setAAtribuir] = useState(false);

  const carregar = useCallback(async (uid: string, geral: boolean) => {
    const [respostaPropostas, respostaNotificacoes] = await Promise.all([
      supabase.from("propostas_imip")
        .select("id,proponente_id,nome_entidade,email,assunto,regiao,regiao_responsavel,estado,criado_em")
        .order("criado_em", { ascending: false }).limit(250),
      supabase.from("notificacoes_propostas_imip")
        .select("id", { head: true, count: "exact" })
        .eq("destinatario_id", uid).is("lida_em", null),
    ]);
    if (respostaPropostas.error) setErro("Erro ao consultar propostas: " + respostaPropostas.error.message);
    else setPropostas((respostaPropostas.data ?? []) as PropostaImip[]);
    if (!respostaNotificacoes.error) setNotificacoes(respostaNotificacoes.count ?? 0);
    if (geral) {
      const respostaMembros = await supabase.from("suportes_regionais_imip")
        .select("auth_user_id,email_contacto,regiao,ativo").order("regiao");
      if (!respostaMembros.error) setMembros((respostaMembros.data ?? []) as Membro[]);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ativo) return;
      if (!user) { setCarregando(false); return; }
      setUserId(user.id);
      const [acesso, geral] = await Promise.all([
        supabase.rpc("tem_acesso_central_imip"),
        supabase.rpc("e_administrador"),
      ]);
      if (!ativo) return;
      if (acesso.error || acesso.data !== true) {
        setErro("Esta conta não tem permissão para aceder à Central de Comunicação.");
      } else {
        setTemAcesso(true);
        setAdministrador(geral.data === true);
        void carregar(user.id, geral.data === true);
      }
      setCarregando(false);
    }
    void verificar();
    return () => { ativo = false; };
  }, [carregar]);

  useEffect(() => {
    if (!userId || !temAcesso) return;
    const i = setInterval(() => void carregar(userId, administrador), 15000);
    return () => clearInterval(i);
  }, [userId, temAcesso, administrador, carregar]);

  async function guardarEstado(proposta: PropostaImip, estado: EstadoPropostaImip, regiao: RegiaoImip | null) {
    setErro(""); setAviso("");
    const { error } = await supabase.from("propostas_imip")
      .update({ estado, regiao_responsavel: regiao }).eq("id", proposta.id);
    if (error) setErro("Não foi possível guardar a triagem: " + error.message);
    else { setAviso("Triagem da proposta atualizada."); void carregar(userId, administrador); }
  }

  async function atribuir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAAtribuir(true); setErro(""); setAviso("");
    const { error } = await supabase.rpc("atribuir_suporte_regional_imip", {
      p_email: emailMembro.trim(), p_regiao: regiaoMembro,
    });
    if (error) setErro("Não foi possível atribuir o suporte: " + error.message);
    else { setAviso("Responsável regional ativado."); setEmailMembro(""); await carregar(userId, administrador); }
    setAAtribuir(false);
  }

  async function desativar(id: string) {
    setErro(""); setAviso("");
    const { error } = await supabase.rpc("desativar_suporte_regional_imip", { p_auth_user_id: id });
    if (error) setErro("Não foi possível desativar: " + error.message);
    else { setAviso("Acesso regional desativado."); void carregar(userId, administrador); }
  }

  const filtradas = propostas.filter(p =>
    (filtroRegiao === "todas" || p.regiao === filtroRegiao || p.regiao_responsavel === filtroRegiao)
    && (filtroEstado === "todos" || p.estado === filtroEstado)
  );
  const ativa = propostas.find(p => p.id === selecionada) ?? null;

  return (
    <main className="min-h-screen px-4 py-10 text-[#f0e6d1] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/organizacao/suporte" className="text-xs font-black text-[#d6b56d]">← VOLTAR À CENTRAL DE SUPORTE</Link>
        <header className="mt-8 border-b border-[#d6b56d]/40 pb-7">
          <p className="text-xs font-black tracking-[0.2em] text-[#d6b56d]">IMIP · COMUNICAÇÃO NACIONAL</p>
          <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">CENTRAL DE COMUNICAÇÃO</h1>
          <p className="mt-3 text-sm text-zinc-300">Uma conversa por proposta. Os quatro suportes regionais e o Suporte Geral acompanham a mesma caixa de entrada, sem partilhar palavras-passe.</p>
        </header>
        {carregando && <p className="mt-8 text-sm text-zinc-300">A verificar permissões...</p>}
        {!carregando && !userId && <p className="mt-7 text-sm">Entra com uma conta de suporte autorizada em <Link href="/organizacao/login" className="font-black text-[#d6b56d] underline">Login das organizações</Link>.</p>}
        {!carregando && userId && !temAcesso && <p role="alert" className="mt-7 border border-red-700 bg-black p-5 text-sm text-red-300">{erro || "Não tens acesso à Central de Comunicação."}</p>}
        {temAcesso && <>
          <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Cinco suportes IMIP">
            {REGIOES_IMIP.map((r, i) => (
              <article key={r.id} className="flex items-center gap-3 border border-white/20 bg-black/70 p-3">
                <Image src={imagens[i]} width={56} height={56} alt="" className="h-14 w-14 shrink-0 object-contain" />
                <div><p className="text-xs font-black">SUPORTE {r.nome.toUpperCase()}</p><p className="text-[10px] text-zinc-400">Regional</p></div>
              </article>
            ))}
            <article className="flex items-center gap-3 border border-[#d6b56d]/50 bg-black/70 p-3">
              <Image src="/suportes/SUPORTE_GERAL.png" width={56} height={56} alt="" className="h-14 w-14 shrink-0 object-contain" />
              <div><p className="text-xs font-black">SUPORTE GERAL</p><p className="text-[10px] text-zinc-400">Coordenação</p></div>
            </article>
          </section>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[#d6b56d]/30 bg-[#17251b] p-4">
            <div><p className="font-black">{propostas.length} PROPOSTAS REGISTADAS</p><p className="mt-1 text-sm text-[#d6b56d]">{notificacoes} notificações por ler na tua conta</p></div>
            <button type="button" onClick={() => void carregar(userId, administrador)} className="min-h-10 border border-[#d6b56d] px-4 text-xs font-black">ATUALIZAR MENSAGENS</button>
          </div>
          {erro && <p role="alert" className="mt-5 border-l-4 border-red-600 bg-red-950/30 p-3 text-sm text-red-200">{erro}</p>}
          {aviso && <p role="status" className="mt-5 border-l-4 border-[#d6b56d] bg-[#13271a] p-3 text-sm text-[#d6b56d]">{aviso}</p>}
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
            <section className="min-w-0 border border-white/20 bg-black/70 p-4">
              <h2 className="text-lg font-black">CAIXA DE ENTRADA</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-bold">Região
                  <select value={filtroRegiao} onChange={e => setFiltroRegiao(e.target.value)} className="mt-1 min-h-10 w-full border border-white/25 bg-[#101713] px-2 text-white">
                    <option value="todas">Todas</option>
                    {REGIOES_IMIP.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                    <option value="nacional">Nacional</option>
                  </select>
                </label>
                <label className="text-xs font-bold">Estado
                  <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="mt-1 min-h-10 w-full border border-white/25 bg-[#101713] px-2 text-white">
                    <option value="todos">Todos</option>
                    {ESTADOS_PROPOSTAS_IMIP.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4 space-y-2">
                {filtradas.length === 0 && <p className="text-sm text-zinc-400">Sem propostas neste filtro.</p>}
                {filtradas.map(p => <button key={p.id} type="button" onClick={() => { setSelecionada(p.id); setAviso(""); }} className={"w-full border p-4 text-left " + (selecionada === p.id ? "border-[#d6b56d] bg-[#17281c]" : "border-white/15 bg-[#0c120e]")}>
                  <span className="block break-words font-black">{p.assunto}</span>
                  <span className="mt-1 block text-xs text-zinc-300">{p.nome_entidade} · {nomeRegiaoImip(p.regiao)}</span>
                  <span className="mt-2 block text-xs font-black text-[#d6b56d]">{nomeEstadoImip(p.estado)}</span>
                  <span className="mt-1 block text-xs text-zinc-400">{dataImip(p.criado_em)}</span>
                </button>)}
              </div>
            </section>
            <div className="min-w-0 space-y-4">
              {ativa ? <>
                <div className="grid gap-3 border border-[#d6b56d]/30 bg-black/80 p-4 sm:grid-cols-2">
                  <label className="text-xs font-black">ESTADO DA PROPOSTA
                    <select value={ativa.estado} onChange={e => void guardarEstado(ativa, e.target.value as EstadoPropostaImip, ativa.regiao_responsavel)} className="mt-2 min-h-11 w-full border border-white/25 bg-[#101713] px-2 text-white">
                      {ESTADOS_PROPOSTAS_IMIP.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-black">RESPONSÁVEL REGIONAL
                    <select value={ativa.regiao_responsavel ?? ""} onChange={e => void guardarEstado(ativa, ativa.estado, (e.target.value || null) as RegiaoImip | null)} className="mt-2 min-h-11 w-full border border-white/25 bg-[#101713] px-2 text-white">
                      <option value="">Por atribuir</option>
                      {REGIOES_IMIP.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                  </label>
                </div>
                <ConversaImip key={ativa.id} proposta={ativa} userId={userId} suporte onAtividade={() => void carregar(userId, administrador)} />
              </> : <div className="border border-white/20 bg-black/50 p-6 text-sm text-zinc-300">Escolhe uma proposta para consultar o histórico, responder ou acrescentar uma nota interna.</div>}
            </div>
          </div>
          {administrador && <section className="mt-9 border border-[#d6b56d]/40 bg-[#0e1a12] p-5 sm:p-7">
            <p className="text-xs font-black tracking-widest text-[#d6b56d]">SÓ SUPORTE GERAL</p>
            <h2 className="mt-2 text-xl font-black">ATRIBUIR RESPONSÁVEIS REGIONAIS</h2>
            <p className="mt-2 text-sm text-zinc-300">O colaborador precisa de uma conta IMIP com email confirmado. Atribuir um suporte não altera os acessos funcionais anteriores.</p>
            <form onSubmit={atribuir} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input type="email" aria-label="Email do responsável" required placeholder="Email do responsável" value={emailMembro} onChange={e => setEmailMembro(e.target.value)} className="min-h-11 min-w-0 border border-white/25 bg-black px-3 text-white" />
              <select aria-label="Região do suporte" value={regiaoMembro} onChange={e => setRegiaoMembro(e.target.value as RegiaoImip)} className="min-h-11 min-w-0 border border-white/25 bg-black px-3 text-white">
                {REGIOES_IMIP.map(r => <option key={r.id} value={r.id}>Suporte {r.nome}</option>)}
              </select>
              <button type="submit" disabled={aAtribuir} className="min-h-11 bg-[#d6b56d] px-4 text-xs font-black text-black disabled:opacity-50">ATRIBUIR</button>
            </form>
            <div className="mt-5 space-y-2">
              {membros.map(m => <div key={m.auth_user_id} className="flex flex-wrap items-center justify-between gap-3 border border-white/15 p-3 text-sm">
                <span className="break-all">{m.email_contacto} · {nomeRegiaoImip(m.regiao)} · {m.ativo ? "Ativo" : "Inativo"}</span>
                {m.ativo && <button type="button" onClick={() => void desativar(m.auth_user_id)} className="border border-red-500/60 px-3 py-2 text-xs font-black text-red-200">DESATIVAR</button>}
              </div>)}
              {membros.length === 0 && <p className="text-sm text-zinc-400">Ainda não há contas regionais atribuídas. O Suporte Geral já pode acompanhar as propostas.</p>}
            </div>
          </section>}
        </>}
      </div>
    </main>
  );
}
