"use client";
import Link from "next/link";
import {useEffect,useCallback,useState, type FormEvent} from "react";
import {supabase} from "@/lib/supabase";
type Pedido={id:string;nome_artistico:string;cidade:string;distrito:string;email:string;instagram_url:string|null;estado:string;criado_em:string;mc_id:string|null};
const campo="mt-2 min-h-11 w-full border border-[#e8c76c]/45 bg-[#0b120d] px-3 py-2 text-white";
export default function InscricoesMCs(){
 const [pedidos,setPedidos]=useState<Pedido[]>([]);
 const [novo,setNovo]=useState({nome_artistico:"",cidade:"",distrito:"",email:""});
 const [erro,setErro]=useState("");
 const [mensagem,setMensagem]=useState("");
 const [carregar,setCarregar]=useState(true);
 const [processar,setProcessar]=useState(false);
 const [autorizado,setAutorizado]=useState(false);
 const token=async()=>{const s=await supabase.auth.getSession();if(!s.data.session)throw new Error("Inicia sessão no painel da organização.");return s.data.session.access_token;};
 const atualizar=useCallback(async()=>{
   setCarregar(true);
   try{
    const t=await token();
    const r=await fetch("/api/suporte/registo-mcs",{headers:{Authorization:`Bearer ${t}`},cache:"no-store"});
    const d=await r.json().catch(()=>null);
    if(!r.ok)throw new Error(d?.erro??"Falha ao consultar pedidos.");
    setPedidos(d.pedidos??[]);setAutorizado(true);setErro("");
   }catch(e){setAutorizado(false);setErro(e instanceof Error?e.message:"Erro de acesso.");}finally{setCarregar(false);}
 },[]);
 useEffect(()=>{void atualizar();},[atualizar]);
 async function acao(d:Record<string,string>) {
   setProcessar(true);setErro("");setMensagem("");
   try{
     const t=await token();
     const r=await fetch("/api/suporte/registo-mcs",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify(d)});
     const resultado=await r.json().catch(()=>null);
     if(!r.ok)throw new Error(resultado?.erro??"Operação não concluída.");
     setMensagem(resultado?.mensagem??"Operação concluída.");await atualizar();
   }catch(e){setErro(e instanceof Error?e.message:"Falha na operação.");}
   finally{setProcessar(false);}
 }
 async function criar(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(!window.confirm(`Criar perfil de ${novo.nome_artistico}? Confirma primeiro que não existe um MC igual.`))return;
   await acao({acao:"criar",...novo});
   setNovo({nome_artistico:"",cidade:"",distrito:"",email:""});
 }
 const porTratar=pedidos.filter(p=>p.estado==="pendente");
 const tratados=pedidos.filter(p=>p.estado!=="pendente");
 return <main className="min-h-screen bg-[#07110c] text-white"><div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
  <Link href="/organizacao/suporte" className="text-sm font-bold text-[#e8c76c]">← VOLTAR À CENTRAL DE SUPORTE</Link>
  <p className="mt-10 text-xs font-black tracking-widest text-[#e8c76c]">SUPORTE · MCs E PARTICIPAÇÃO</p>
  <h1 className="mt-3 text-3xl font-black uppercase sm:text-4xl">INSCRIÇÕES E CRIAÇÃO DE MCs</h1>
  <p className="mt-3 text-zinc-300">Valida os pedidos de novos perfis e regista MCs manualmente. Antes de criar um MC, confirma se já está na lista pública para evitar duplicados.</p>
  {erro&&<p role="alert" className="mt-6 border border-red-700 bg-red-950/60 p-4 text-red-200">{erro}</p>}
  {mensagem&&<p role="status" className="mt-6 border border-green-700 p-4 text-green-200">{mensagem}</p>}
  {carregar?<p className="mt-8">A VERIFICAR PERMISSÕES E INSCRIÇÕES...</p>:autorizado&&<>
   <section className="mt-8 border border-[#d6b56d]/50 bg-black/70 p-5 sm:p-7">
    <h2 className="text-xl font-black text-[#e8c76c]">CRIAR MC MANUALMENTE</h2>
    <p className="mt-2 text-sm text-zinc-300">Este botão cria o perfil. Se indicares email, fica também um pedido de acesso pendente para aprovação — sem enviar automaticamente uma palavra-passe.</p>
    <form onSubmit={criar} className="mt-5 grid gap-4 sm:grid-cols-2">
     {(["nome_artistico","cidade","distrito","email"] as const).map((f)=><label key={f} className="text-sm font-bold">{({nome_artistico:"NOME ARTÍSTICO",cidade:"CIDADE",distrito:"DISTRITO",email:"EMAIL (OPCIONAL)"} as Record<string,string>)[f]}<input className={campo} type={f==="email"?"email":"text"} required={f!=="email"} maxLength={f==="email"?254:100} value={novo[f]} onChange={e=>setNovo(v=>({...v,[f]:e.target.value}))}/></label>)}
     <button disabled={processar} className="min-h-12 bg-[#e8c76c] px-5 text-xs font-black text-black sm:col-span-2 disabled:opacity-50">CRIAR PERFIL MC</button>
    </form>
   </section>
   <section className="mt-8">
    <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-[#e8c76c]">PEDIDOS PENDENTES ({porTratar.length})</h2><button className="border border-[#e8c76c] px-3 py-2 text-xs font-bold" disabled={processar} onClick={()=>void atualizar()}>ATUALIZAR</button></div>
    {porTratar.length===0?<p className="mt-4 text-sm text-zinc-400">Não existem novos pedidos pendentes.</p>:<div className="mt-4 grid gap-4">
      {porTratar.map(p=><article key={p.id} className="border border-[#e8c76c]/50 bg-black/65 p-5">
       <h3 className="text-xl font-black">{p.nome_artistico}</h3>
       <p className="mt-2 text-sm text-zinc-300">{p.cidade} · {p.distrito}</p>
       <p className="mt-1 break-words text-sm">Email: {p.email}</p>
       {p.instagram_url&&<a href={p.instagram_url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-[#e8c76c] underline">Instagram do MC</a>}
       <p className="mt-2 text-xs text-zinc-500">{new Date(p.criado_em).toLocaleString("pt-PT")}</p>
       <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={processar} onClick={()=>{if(window.confirm(`Aprovar ${p.nome_artistico} e criar o perfil MC?`))void acao({acao:"aprovar",id:p.id});}} className="min-h-11 bg-[#e8c76c] px-4 text-xs font-black text-black">APROVAR E CRIAR PERFIL</button>
        <button disabled={processar} onClick={()=>{if(window.confirm(`Recusar inscrição de ${p.nome_artistico}?`))void acao({acao:"recusar",id:p.id});}} className="min-h-11 border border-red-600 px-4 text-xs font-black text-red-300">RECUSAR</button>
       </div>
      </article>)}
     </div>}
   </section>
   <section className="mt-10"><h2 className="text-xl font-black text-[#e8c76c]">PEDIDOS TRATADOS ({tratados.length})</h2>
    <div className="mt-4 grid gap-3">{tratados.map(p=><div key={p.id} className="border border-white/20 bg-black/40 p-4 text-sm"><strong>{p.nome_artistico}</strong> · {p.estado.toUpperCase()}{p.mc_id&&<Link href={`/mcs/${p.mc_id}`} className="ml-3 text-[#e8c76c] underline">VER PERFIL</Link>}</div>)}</div>
   </section>
  </>}
 </div></main>;
}
