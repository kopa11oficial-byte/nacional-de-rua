"use client";
import Link from "next/link";
import {useState, type FormEvent} from "react";

export default function NovoMC() {
 const [nome,setNome]=useState("");
 const [cidade,setCidade]=useState("");
 const [distrito,setDistrito]=useState("");
 const [email,setEmail]=useState("");
 const [instagram,setInstagram]=useState("");
 const [website,setWebsite]=useState("");
 const [aEnviar,setAEnviar]=useState(false);
 const [mensagem,setMensagem]=useState("");
 const [concluido,setConcluido]=useState(false);
 async function submeter(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();
  if(aEnviar)return;
  setAEnviar(true);setMensagem("");setConcluido(false);
  try {
   const res=await fetch("/api/mcs/novo-registo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome_artistico:nome,cidade,distrito,email,instagram_url:instagram,website})});
   const d=await res.json().catch(()=>null);
   if(!res.ok||!d?.sucesso)throw new Error(d?.erro??"Não foi possível enviar o pedido.");
   setConcluido(true);setMensagem(d.mensagem??"Pedido enviado para o Suporte.");
  }catch(err){setMensagem(err instanceof Error?err.message:"Não foi possível enviar o pedido.");}
  finally{setAEnviar(false);}
 }
 const campo="mt-2 w-full min-h-12 border border-[#d6b56d]/50 bg-[#101713] px-4 py-3 text-[#f0e6d1] outline-none focus:border-[#e8c76c]";
 return <main className="min-h-screen bg-[#07110c] text-[#f0e6d1]">
  <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
   <Link href="/mcs" className="text-sm font-black text-[#e8c76c]">← VOLTAR AOS MCs</Link>
   <p className="mt-10 text-xs font-black uppercase tracking-widest text-[#e8c76c]">NACIONAL DE RUA · IMIP</p>
   <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">SOU MC — QUERO INSCREVER-ME</h1>
   <p className="mt-4 text-sm leading-relaxed text-zinc-300">Ainda não tens um perfil no Nacional de Rua? Envia os teus dados. O Suporte irá validar a inscrição antes de criar o perfil. A inscrição não dá acesso automático à conta.</p>
   <div className="mt-6 border-l-4 border-[#e8c76c] bg-[#15221a] p-4 text-sm">
    <strong>Já tens perfil no site?</strong> Procura o teu nome na <Link className="underline text-[#e8c76c]" href="/mcs">lista de MCs</Link> e pede acesso ao perfil existente. Não cries outro registo.
   </div>
   {concluido?<div role="status" className="mt-8 border border-[#e8c76c] bg-[#142319] p-6">
     <h2 className="text-xl font-black text-[#e8c76c]">PEDIDO RECEBIDO</h2><p className="mt-3">{mensagem}</p><Link href="/mcs" className="mt-5 inline-block underline">Ver MCs</Link>
   </div>:<form onSubmit={submeter} className="mt-8 space-y-5 border border-[#d6b56d]/40 bg-black/50 p-5 sm:p-8">
    <div><label htmlFor="nome" className="text-sm font-bold">Nome artístico *</label><input id="nome" className={campo} value={nome} onChange={e=>setNome(e.target.value)} minLength={2} maxLength={80} required autoComplete="nickname"/></div>
    <div className="grid gap-5 sm:grid-cols-2">
     <div><label htmlFor="cidade" className="text-sm font-bold">Cidade *</label><input id="cidade" className={campo} value={cidade} onChange={e=>setCidade(e.target.value)} minLength={2} maxLength={100} required/></div>
     <div><label htmlFor="distrito" className="text-sm font-bold">Distrito *</label><input id="distrito" className={campo} value={distrito} onChange={e=>setDistrito(e.target.value)} minLength={2} maxLength={100} required/></div>
    </div>
    <div><label htmlFor="email" className="text-sm font-bold">Email de contacto *</label><input id="email" type="email" className={campo} value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required autoComplete="email"/></div>
    <div><label htmlFor="instagram" className="text-sm font-bold">Instagram (opcional)</label><input id="instagram" type="url" placeholder="https://www.instagram.com/..." className={campo} value={instagram} onChange={e=>setInstagram(e.target.value)} maxLength={300}/></div>
    <div aria-hidden="true" className="absolute -left-[9999px]"><label htmlFor="website">Website</label><input tabIndex={-1} id="website" autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></div>
    <p className="text-xs leading-relaxed text-zinc-400">Os dados são usados para avaliar o pedido e contactar-te sobre a inscrição. O email não é apresentado publicamente. Contacto: imip.nacional@gmail.com.</p>
    {mensagem&&<p role="alert" className="border border-red-700 p-3 text-red-200">{mensagem}</p>}
    <button disabled={aEnviar} className="min-h-12 w-full bg-[#e8c76c] px-5 py-3 text-sm font-black uppercase text-[#101713] disabled:opacity-50">{aEnviar?"A ENVIAR...":"ENVIAR PEDIDO DE INSCRIÇÃO"}</button>
   </form>}
  </div>
 </main>;
}
