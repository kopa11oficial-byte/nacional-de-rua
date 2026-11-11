import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Amb={SUPABASE_URL?:string;SUPABASE_SERVICE_ROLE_KEY?:string};
const reply=(status:number, data:Record<string,unknown>)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const limpar=(x:unknown)=>typeof x==="string"?x.trim().replace(/\s+/g," "):"";
const comparar=(x:string)=>x.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-PT").trim();
async function autenticar(req:NextRequest) {
 const token=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token) return null;
 const env=getCloudflareContext().env as unknown as Amb;
 const url=env.SUPABASE_URL??process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return null;
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const user=await admin.auth.getUser(token);
 if(user.error||!user.data.user)return null;
 const cliente=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:ok,error}=await cliente.rpc("tem_permissao_suporte",{p_area:"mcs_participacao"});
 if(error||ok!==true)return null;
 return {admin,userId:user.data.user.id};
}
export async function GET(req:NextRequest) {
 try {
  const sessao=await autenticar(req);
  if(!sessao)return reply(403,{erro:"Acesso reservado ao Suporte de MCs."});
  const {data,error}=await sessao.admin.from("pedidos_registo_mcs").select("id,nome_artistico,cidade,distrito,email,instagram_url,estado,criado_em,mc_id").order("criado_em",{ascending:false}).limit(200);
  if(error)return reply(503,{erro:"Não foi possível carregar as inscrições."});
  return reply(200,{pedidos:data??[]});
 }catch{return reply(503,{erro:"Serviço temporariamente indisponível."});}
}
async function criarPerfil(admin:SupabaseClient, d:{nome_artistico:unknown;cidade:unknown;distrito:unknown;email?:unknown}, userId:string) {
 const nome=limpar(d.nome_artistico), cidade=limpar(d.cidade), distrito=limpar(d.distrito), email=typeof d.email==="string"?d.email.trim().toLowerCase():"";
 if(nome.length<2||nome.length>80||cidade.length<2||cidade.length>100||distrito.length<2||distrito.length>100||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
  return {erro:"Dados inválidos. Preenche nome, cidade, distrito e um email válido se aplicável."};
 const {data:mcs,error:erroConsulta}=await admin.from("mcs").select("id,nome_artistico").eq("ativo",true);
 if(erroConsulta)return {erro:"Não foi possível verificar perfis existentes."};
 const jaExiste=(mcs??[]).find(mc=>comparar(mc.nome_artistico)===comparar(nome));
 if(jaExiste)return {erro:"Já existe um MC com este nome artístico. Confirma se é a mesma pessoa antes de criar outro perfil."};
 const {data:mc,error}=await admin.from("mcs").insert({nome_artistico:nome,cidade,distrito,ativo:true,por_confirmar:false}).select("id,nome_artistico").single();
 if(error||!mc) return {erro:"Não foi possível criar o perfil MC."};
 // O MC ainda não possui login: a atribuição de conta passa sempre pela aprovação de acesso.
 if(email){
   const {data:pedidos,error:erroPedidos}=await admin.from("pedidos_acesso_mcs").select("id").eq("mc_id",mc.id).eq("email",email).eq("estado","pendente").limit(1);
   if(!erroPedidos&&!(pedidos??[]).length) {
      const r=await admin.from("pedidos_acesso_mcs").insert({mc_id:mc.id,email,estado:"pendente"});
      if(r.error)console.error("MC criado; pedido de acesso pendente falhou:",r.error.code);
   }
 }
 return {mcId:mc.id,nome:mc.nome_artistico};
}
export async function POST(req:NextRequest) {
 try {
  const sessao=await autenticar(req);
  if(!sessao)return reply(403,{erro:"Acesso reservado ao Suporte de MCs."});
  const d=await req.json().catch(()=>null);
  if(!d||typeof d!=="object"||Array.isArray(d))return reply(400,{erro:"Pedido inválido."});
  if(d.acao==="criar"){
   const novo=await criarPerfil(sessao.admin,d,sessao.userId);
   if("erro" in novo)return reply(409,{erro:novo.erro});
   return reply(200,{sucesso:true,...novo,mensagem:"Perfil criado. O acesso por email fica sujeito à aprovação habitual do suporte."});
  }
  const id=typeof d.id==="string"?d.id:"";
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["aprovar","recusar"].includes(d.acao))return reply(400,{erro:"Operação inválida."});
  const {data:pedido,error:err}=await sessao.admin.from("pedidos_registo_mcs").select("*").eq("id",id).eq("estado","pendente").maybeSingle();
  if(err||!pedido)return reply(409,{erro:"O pedido já foi tratado. Atualiza a lista."});
  if(d.acao==="recusar"){
   const {data,error}=await sessao.admin.from("pedidos_registo_mcs").update({estado:"recusado",tratado_em:new Date().toISOString(),tratado_por:sessao.userId}).eq("id",id).eq("estado","pendente").select("id").maybeSingle();
   if(error||!data)return reply(409,{erro:"Não foi possível recusar o pedido."});
   return reply(200,{sucesso:true,mensagem:"Pedido recusado."});
  }
  const novo=await criarPerfil(sessao.admin,pedido,sessao.userId);
  if("erro" in novo)return reply(409,{erro:novo.erro});
  const {error:erroEstado}=await sessao.admin.from("pedidos_registo_mcs").update({estado:"aprovado",mc_id:novo.mcId,tratado_em:new Date().toISOString(),tratado_por:sessao.userId}).eq("id",id).eq("estado","pendente");
  if(erroEstado)return reply(503,{erro:"O perfil foi criado, mas não foi possível atualizar o pedido. Não repitas a criação; contacta o Suporte Geral.",mcId:novo.mcId});
  return reply(200,{sucesso:true,...novo,mensagem:"Inscrição aprovada. Perfil criado; o pedido de login segue para a área de acessos de MCs."});
 }catch(e){
   console.error("Gestão de novos MCs:",e instanceof Error?e.message:"erro");
   return reply(503,{erro:"Não foi possível concluir a operação."});
 }
}
