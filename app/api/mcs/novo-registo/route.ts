import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Amb = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
const resposta = (status:number, dados:Record<string,unknown>) => NextResponse.json(dados,{status,headers:{"Cache-Control":"no-store"}});
const normal = (v:string) => v.trim().replace(/\s+/g," ");
const emailValido = (v:string) => v.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const urlInsta = (v:string) => {
  if (!v) return true;
  try { const u=new URL(v); return u.protocol==="https:" && ["instagram.com","www.instagram.com"].includes(u.hostname) && !u.username && !u.password && !u.port; }
  catch { return false; }
};
export async function POST(request:NextRequest) {
  try {
    const tamanho=Number(request.headers.get("content-length")??0);
    if(tamanho>4096) return resposta(413,{erro:"Pedido demasiado grande."});
    const d=await request.json().catch(()=>null);
    if (!d || typeof d!=="object" || Array.isArray(d)) return resposta(400,{erro:"Pedido inválido."});
    const nome=typeof d.nome_artistico==="string"?normal(d.nome_artistico):"";
    const cidade=typeof d.cidade==="string"?normal(d.cidade):"";
    const distrito=typeof d.distrito==="string"?normal(d.distrito):"";
    const email=typeof d.email==="string"?d.email.trim().toLowerCase():"";
    const instagram=typeof d.instagram_url==="string"?d.instagram_url.trim():"";
    // Campo de proteção contra formulários automáticos; nunca visível a visitantes.
    if (d.website) return resposta(200,{sucesso:true,mensagem:"Pedido recebido. O Suporte do IMIP irá analisar o registo."});
    if (nome.length<2||nome.length>80||cidade.length<2||cidade.length>100||distrito.length<2||distrito.length>100||!emailValido(email)||instagram.length>300||!urlInsta(instagram))
      return resposta(400,{erro:"Preenche corretamente nome artístico, cidade, distrito e email. Instagram deve ser um endereço https://instagram.com válido."});
    const env=getCloudflareContext().env as unknown as Amb;
    const url=env.SUPABASE_URL??process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return resposta(503,{erro:"O registo está temporariamente indisponível."});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const inicio=new Date(Date.now()-24*60*60*1000).toISOString();
    const [recentes, pendentes, perfis]=await Promise.all([
      db.from("pedidos_registo_mcs").select("id",{count:"exact",head:true}).eq("email",email).gte("criado_em",inicio),
      db.from("pedidos_registo_mcs").select("id").eq("email",email).eq("estado","pendente").limit(5),
      db.from("mcs").select("id,nome_artistico").ilike("nome_artistico",nome).limit(5)
    ]);
    if(recentes.error||pendentes.error||perfis.error) return resposta(503,{erro:"Não foi possível verificar os pedidos."});
    const mensagem="Pedido recebido. O Suporte do IMIP irá analisar o registo. Se já tens perfil, utiliza a opção PEDIR ACESSO desse perfil.";
    if((recentes.count??0)>=3||(pendentes.data?.length??0)>0||(perfis.data?.length??0)>0)
      return resposta(200,{sucesso:true,mensagem});
    const {error}=await db.from("pedidos_registo_mcs").insert({nome_artistico:nome,cidade,distrito,email,instagram_url:instagram||null});
    if(error && error.code!=="23505") {
      console.error("Novo registo MC:",error.code);
      return resposta(503,{erro:"Não foi possível submeter o pedido. Contacta imip.nacional@gmail.com."});
    }
    return resposta(200,{sucesso:true,mensagem});
  } catch(error) {
    console.error("Novo registo MC:",error instanceof Error?error.message:"erro");
    return resposta(503,{erro:"Não foi possível registar o pedido neste momento."});
  }
}
