"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import ConversaImip from "../components/ConversaImip";
import { dataImip, nomeEstadoImip, REGIOES_PROPOSTAS_IMIP, type PropostaImip, type RegiaoPropostaImip } from "../../lib/comunicacao-imip";

export default function PropostasImipPage() {
  const [userId, setUserId] = useState("");
  const [emailConta, setEmailConta] = useState("");
  const [emailEntrada, setEmailEntrada] = useState("");
  const [codigo, setCodigo] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [aEntrar, setAEntrar] = useState(false);
  const [aCarregar, setACarregar] = useState(true);
  const [erroAcesso, setErroAcesso] = useState("");
  const [propostas, setPropostas] = useState<PropostaImip[]>([]);
  const [selecionada, setSelecionada] = useState("");
  const [nomeEntidade, setNomeEntidade] = useState("");
  const [assunto, setAssunto] = useState("");
  const [regiao, setRegiao] = useState<RegiaoPropostaImip>("nacional");
  const [mensagem, setMensagem] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);

  const carregar = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from("propostas_imip")
      .select("id,proponente_id,nome_entidade,email,assunto,regiao,regiao_responsavel,estado,criado_em")
      .eq("proponente_id", uid)
      .order("criado_em", { ascending: false }).limit(100);
    if (error) {
      setErro("Não foi possível consultar as propostas: " + error.message);
      return;
    }
    setPropostas((data ?? []) as PropostaImip[]);
  }, []);

  useEffect(() => {
    let ativo = true;
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ativo) return;
      setUserId(user?.id ?? "");
      setEmailConta(user?.email ?? "");
      setACarregar(false);
      if (user) void carregar(user.id);
    }
    void verificar();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo) return;
      setUserId(sessao?.user.id ?? "");
      setEmailConta(sessao?.user.email ?? "");
      if (sessao?.user.id) void carregar(sessao.user.id);
    });
    return () => { ativo = false; subscription.unsubscribe(); };
  }, [carregar]);

  useEffect(() => {
    if (!userId) return;
    const i = setInterval(() => void carregar(userId), 20000);
    return () => clearInterval(i);
  }, [userId, carregar]);

  async function pedirAcesso(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroAcesso("");
    setAEntrar(true);
    const email = emailEntrada.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/propostas", shouldCreateUser: true },
    });
    if (error) setErroAcesso("Não foi possível enviar o acesso: " + error.message);
    else setEmailEnviado(true);
    setAEntrar(false);
  }

  async function confirmarCodigo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroAcesso("");
    setAEntrar(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: emailEntrada.trim().toLowerCase(), token: codigo.trim(), type: "email",
    });
    if (error || !data.user) setErroAcesso("Não foi possível confirmar o código: " + (error?.message ?? "Código inválido"));
    else {
      setUserId(data.user.id);
      setEmailConta(data.user.email ?? "");
      void carregar(data.user.id);
    }
    setAEntrar(false);
  }

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || aEnviar) return;
    setAEnviar(true);
    setErro("");
    const { data, error } = await supabase.rpc("abrir_proposta_imip", {
      p_nome_entidade: nomeEntidade.trim(),
      p_assunto: assunto.trim(),
      p_regiao: regiao,
      p_mensagem: mensagem.trim(),
    });
    if (error) {
      setErro("Não foi possível enviar a proposta: " + error.message);
    } else {
      await carregar(userId);
      setSelecionada(data as string);
      setMostrarNova(false);
      setNomeEntidade("");
      setAssunto("");
      setMensagem("");
    }
    setAEnviar(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    setUserId("");
    setPropostas([]);
    setSelecionada("");
    setEmailEnviado(false);
  }

  const ativa = propostas.find(p => p.id === selecionada) ?? null;
  return (
    <main className="min-h-screen px-4 py-10 text-[#f0e6d1] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/apoios-e-patrocinios" className="text-xs font-black text-[#d6b56d]">← APOIOS E PATROCÍNIOS</Link>
          {userId && <button type="button" onClick={() => void sair()} className="border border-white/20 px-4 py-2 text-xs font-black text-white">TERMINAR SESSÃO</button>}
        </div>
        <header className="mt-8 border-b border-[#d6b56d]/40 pb-7">
          <p className="text-xs font-black tracking-[0.2em] text-[#d6b56d]">IMIP · NACIONAL DE RUA</p>
          <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">APRESENTAR UMA PROPOSTA</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Fala diretamente com a equipa do Nacional de Rua, acompanha as respostas e mantém toda a conversa no site.
          </p>
        </header>

        {aCarregar ? <p className="mt-8 text-sm text-zinc-300">A verificar o acesso...</p> : !userId ? (
          <section className="mt-8 max-w-xl border border-[#d6b56d]/40 bg-[#09120e] p-6">
            <h2 className="text-xl font-black">ENTRAR COM O TEU EMAIL</h2>
            <p className="mt-3 text-sm text-zinc-300">Para proteger as propostas e as respostas, enviaremos um acesso seguro para o teu email. Não precisas de instalar outra aplicação.</p>
            <form onSubmit={pedirAcesso} className="mt-5 space-y-4">
              <label htmlFor="email-patrocinador" className="block text-sm font-bold">Email de contacto</label>
              <input id="email-patrocinador" type="email" required autoComplete="email" value={emailEntrada} onChange={e => setEmailEntrada(e.target.value)} placeholder="contacto@empresa.pt" className="min-h-12 w-full border border-white/25 bg-black px-4 text-white" />
              <button type="submit" disabled={aEntrar} className="min-h-12 w-full bg-[#d6b56d] px-4 font-black text-[#101713] disabled:opacity-50">{aEntrar ? "A ENVIAR..." : "RECEBER LINK DE ACESSO"}</button>
            </form>
            {emailEnviado && (
              <div className="mt-5 border border-[#d6b56d]/30 p-4">
                <p className="text-sm font-bold text-[#d6b56d]">Verifica o teu email e abre o link recebido.</p>
                <p className="mt-2 text-xs text-zinc-300">Se o email incluir um código de seis dígitos, também podes introduzi-lo aqui.</p>
                <form onSubmit={confirmarCodigo} className="mt-3 flex flex-wrap gap-2">
                  <input aria-label="Código recebido por email" inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código de 6 dígitos" maxLength={6} className="min-h-11 flex-1 border border-white/25 bg-black px-3 text-white" />
                  <button type="submit" disabled={aEntrar || codigo.trim().length !== 6} className="bg-[#d6b56d] px-4 font-bold text-black disabled:opacity-50">CONFIRMAR</button>
                </form>
              </div>
            )}
            {erroAcesso && <p role="alert" className="mt-4 text-sm text-red-300">{erroAcesso}</p>}
          </section>
        ) : (
          <div className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-all text-xs text-zinc-300">Conta verificada: {emailConta}</p>
              <button type="button" onClick={() => { setMostrarNova(v => !v); setSelecionada(""); }} className="min-h-11 bg-[#d6b56d] px-5 py-3 text-xs font-black uppercase text-[#101713]">
                {mostrarNova ? "VOLTAR ÀS CONVERSAS" : "+ NOVA PROPOSTA"}
              </button>
            </div>

            {mostrarNova || (propostas.length === 0 && !selecionada) ? (
              <form onSubmit={criar} className="mt-6 max-w-3xl space-y-4 border border-[#d6b56d]/40 bg-[#09120e] p-5 sm:p-7">
                <h2 className="text-xl font-black">APRESENTAR PROPOSTA DE APOIO</h2>
                <label className="block text-sm font-bold">Nome da empresa, marca ou entidade
                  <input required minLength={2} maxLength={150} value={nomeEntidade} onChange={e => setNomeEntidade(e.target.value)} className="mt-2 min-h-11 w-full border border-white/25 bg-black px-3 text-white" />
                </label>
                <label className="block text-sm font-bold">Assunto
                  <input required minLength={5} maxLength={160} value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Ex.: Apoio à Final Nacional" className="mt-2 min-h-11 w-full border border-white/25 bg-black px-3 text-white" />
                </label>
                <label className="block text-sm font-bold">Região da proposta
                  <select value={regiao} onChange={e => setRegiao(e.target.value as RegiaoPropostaImip)} className="mt-2 min-h-11 w-full border border-white/25 bg-black px-3 text-white">
                    {REGIOES_PROPOSTAS_IMIP.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold">Descreve a proposta
                  <textarea required minLength={10} maxLength={5000} rows={7} value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Como gostarias de apoiar o Nacional de Rua?" className="mt-2 w-full border border-white/25 bg-black px-3 py-3 text-white" />
                </label>
                <p className="text-xs text-zinc-400">O Suporte Geral e os suportes regionais autorizados poderão consultar a proposta. A conversa não é pública.</p>
                {erro && <p role="alert" className="text-sm text-red-300">{erro}</p>}
                <button type="submit" disabled={aEnviar} className="min-h-12 w-full bg-[#d6b56d] px-5 py-3 font-black text-[#101713] disabled:opacity-50">{aEnviar ? "A ENVIAR..." : "ENVIAR PROPOSTA AO IMIP"}</button>
              </form>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)]">
                <section className="border border-white/20 bg-black/70 p-4">
                  <h2 className="mb-4 text-lg font-black">AS TUAS CONVERSAS</h2>
                  {propostas.map(p => (
                    <button key={p.id} type="button" onClick={() => setSelecionada(p.id)} className={"mb-2 w-full border p-4 text-left " + (selecionada === p.id ? "border-[#d6b56d] bg-[#17281c]" : "border-white/20 bg-[#0b120e]")}>
                      <span className="block break-words font-black">{p.assunto}</span>
                      <span className="mt-1 block text-xs text-[#d6b56d]">{nomeEstadoImip(p.estado)}</span>
                      <span className="mt-1 block text-xs text-zinc-400">{dataImip(p.criado_em)}</span>
                    </button>
                  ))}
                </section>
                {ativa ? <ConversaImip proposta={ativa} userId={userId} suporte={false} onAtividade={() => void carregar(userId)} /> : <div className="border border-white/20 bg-black/50 p-6 text-sm text-zinc-300">Escolhe uma conversa para ler ou enviar mensagens. As respostas aparecem aqui sem necessidade de WhatsApp.</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
