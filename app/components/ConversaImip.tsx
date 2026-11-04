"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { dataImip, nomeEstadoImip, nomeRegiaoImip, type MensagemImip, type PropostaImip } from "../../lib/comunicacao-imip";

type Props = {
  proposta: PropostaImip;
  userId: string;
  suporte: boolean;
  onAtividade?: () => void;
};

export default function ConversaImip({ proposta, userId, suporte, onAtividade }: Props) {
  const [mensagens, setMensagens] = useState<MensagemImip[]>([]);
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("mensagens_propostas_imip")
      .select("id,proposta_id,autor_id,autor_tipo,conteudo,interna,criado_em")
      .eq("proposta_id", proposta.id).order("criado_em", { ascending: false }).limit(250);
    if (error) {
      setErro("Não foi possível carregar as mensagens: " + error.message);
      return;
    }
    setMensagens(((data ?? []) as MensagemImip[]).reverse());
    setErro("");
    setACarregar(false);
  }, [proposta.id]);

  useEffect(() => {
    let ativo = true;
    void carregar();
    // Atualização periódica sem exigir instalações ou aplicações externas.
    const intervalo = setInterval(() => {
      if (ativo) void carregar();
    }, 12000);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [carregar]);

  useEffect(() => {
    // Marca como lidas apenas as notificações dirigidas ao próprio utilizador.
    if (!proposta.id || !userId) return;
    void supabase.from("notificacoes_propostas_imip")
      .update({ lida_em: new Date().toISOString() })
      .eq("destinatario_id", userId)
      .eq("proposta_id", proposta.id)
      .is("lida_em", null);
  }, [proposta.id, userId, mensagens.length]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (aEnviar || !texto.trim()) return;
    setAEnviar(true);
    setErro("");
    const { error } = await supabase.from("mensagens_propostas_imip").insert({
      proposta_id: proposta.id,
      autor_id: userId,
      autor_tipo: suporte ? "suporte" : "proponente",
      conteudo: texto.trim(),
      interna: suporte ? interna : false,
    });
    if (error) {
      setErro("Não foi possível enviar: " + error.message);
    } else {
      setTexto("");
      setInterna(false);
      await carregar();
      onAtividade?.();
    }
    setAEnviar(false);
  }

  return (
    <section className="min-w-0 border border-[#d6b56d]/40 bg-[#09120e]">
      <header className="border-b border-white/15 p-5">
        <p className="text-[11px] font-black tracking-widest text-[#d6b56d]">CONVERSA PRIVADA · IMIP</p>
        <h2 className="mt-2 break-words text-xl font-black text-white">{proposta.assunto}</h2>
        <p className="mt-2 text-sm text-zinc-300">{proposta.nome_entidade} · {nomeRegiaoImip(proposta.regiao)}</p>
        <p className="mt-1 text-xs text-[#d6b56d]">{nomeEstadoImip(proposta.estado)} · Aberta em {dataImip(proposta.criado_em)}</p>
        {suporte && <p className="mt-2 break-all text-xs text-zinc-400">Contacto verificado: {proposta.email}</p>}
      </header>
      <div className="max-h-[440px] min-h-48 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-label="Mensagens da proposta">
        {aCarregar && <p className="text-sm text-zinc-400">A carregar conversa...</p>}
        {!aCarregar && mensagens.length === 0 && <p className="text-sm text-zinc-400">Ainda não existem mensagens.</p>}
        {mensagens.map((m) => {
          const proprio = m.autor_id === userId;
          return (
            <article key={m.id} className={"max-w-[93%] border p-3 sm:max-w-[85%] " + (m.interna ? "border-amber-500/60 bg-amber-950/40" : proprio ? "ml-auto border-[#d6b56d]/50 bg-[#17281c]" : "border-white/15 bg-black/60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#d6b56d]">{m.interna ? "NOTA INTERNA · SÓ SUPORTES" : m.autor_tipo === "suporte" ? "EQUIPA IMIP" : "PROPONENTE"}</p>
                <time className="text-[10px] text-zinc-400">{dataImip(m.criado_em)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">{m.conteudo}</p>
            </article>
          );
        })}
      </div>
      <form onSubmit={enviar} className="space-y-3 border-t border-white/15 p-4 sm:p-5">
        <label htmlFor="resposta-proposta-imip" className="block text-sm font-bold text-[#f0e6d1]">{suporte ? "Responder à proposta" : "Escrever à equipa IMIP"}</label>
        <textarea id="resposta-proposta-imip" rows={4} maxLength={5000} value={texto} onChange={e => setTexto(e.target.value)} required placeholder="Escreve a tua mensagem..." className="w-full resize-y border border-white/25 bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#d6b56d]" />
        {suporte && <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={interna} onChange={e => setInterna(e.target.checked)} /><span>Nota interna — invisível para o proponente</span></label>}
        {erro && <p role="alert" className="border-l-4 border-red-500 bg-red-950/30 p-3 text-sm text-red-200">{erro}</p>}
        <button type="submit" disabled={aEnviar || !texto.trim()} className="min-h-11 w-full bg-[#d6b56d] px-5 py-3 text-sm font-black uppercase text-[#101713] disabled:opacity-50">{aEnviar ? "A ENVIAR..." : interna ? "GUARDAR NOTA INTERNA" : "ENVIAR MENSAGEM"}</button>
      </form>
    </section>
  );
}
