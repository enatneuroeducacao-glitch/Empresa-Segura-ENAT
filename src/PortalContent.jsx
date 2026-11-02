import React from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, UserRound, ShieldCheck, LockKeyhole, LogIn, UserPlus, LogOut, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client = url && key ? createClient(url, key) : null;
const defaults = {
  empresa: { title:"Portal da Empresa", subtitle:"Área de referência para organização, equipe e ações preventivas.", heroTitle:"Organize a segurança da sua empresa", heroText:"Acompanhe a participação da organização, planeje ações preventivas e fortaleça uma cultura de segurança.", sections:[["Visão geral","Acompanhe o status da organização e as próximas etapas."],["Equipe","Organize responsáveis, setores e participantes autorizados."],["Ações preventivas","Planeje atividades educativas e iniciativas de prevenção."],["Indicadores","Acompanhe indicadores autorizados para sua organização."],["Documentos","Consulte materiais disponibilizados para a organização."]] },
  funcionario: { title:"Portal do Funcionário", subtitle:"Espaço individual para aprendizagem e acompanhamento.", heroTitle:"Sua participação fortalece a segurança", heroText:"Acesse orientações, atividades educativas e informações relacionadas à sua participação.", sections:[["Meu painel","Consulte suas atividades e próximos passos."],["Aprendizagem","Acesse conteúdos educativos e orientações."],["Atividades","Consulte campanhas e ações preventivas."],["Meu progresso","Acompanhe a conclusão das atividades disponíveis."],["Documentos","Consulte materiais de apoio publicados."]] }
};

export function PortalContent({ pageType, onBack }) {
  const isCompany = pageType === "empresa";
  const [mode, setMode] = useState("login");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [membership, setMembership] = useState(null);
  const [page, setPage] = useState(null);
  const [form, setForm] = useState({full_name:"",email:"",password:"",legal_name:"",trade_name:"",cnpj:"",contact_email:"",phone:"",sector:"",employee_count:"",company_cnpj:"",department:"",job_title:""});
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const change=(field,value)=>setForm(v=>({...v,[field]:value}));
  const sayError=(e)=>setError(e?.message || "Não foi possível concluir a operação.");

  async function refresh(user) {
    if (!client || !user) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const [p, cms] = await Promise.all([
        client.from("empresa_segura_profiles").select("*").eq("user_id",user.id).maybeSingle(),
        client.from("empresa_segura_pages").select("content").eq("page_type",pageType).eq("published",true).maybeSingle()
      ]);
      if (p.error) throw p.error;
      setProfile(p.data);
      setPage(cms.data?.content ? {...defaults[pageType],...cms.data.content} : defaults[pageType]);
      if (isCompany) {
        const c=await client.from("empresa_segura_companies").select("*").eq("owner_user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
        if (c.error) throw c.error;
        setCompany(c.data);
        if (!c.data && user.user_metadata?.legal_name) {
          const m=user.user_metadata;
          const inserted=await client.from("empresa_segura_companies").insert({owner_user_id:user.id,legal_name:m.legal_name,trade_name:m.trade_name||null,cnpj:m.cnpj,contact_email:m.contact_email||user.email,phone:m.phone||null,sector:m.sector||null,employee_count:m.employee_count?Number(m.employee_count):null,status:"pending"}).select("*").single();
          if (!inserted.error) setCompany(inserted.data);
        }
      } else {
        const m=await client.from("empresa_segura_memberships").select("*, empresa_segura_companies(id,legal_name,trade_name,status)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
        if (m.error) throw m.error;
        setMembership(m.data);
        if (!m.data && user.user_metadata?.company_cnpj) {
          const inserted=await client.rpc("empresa_segura_request_membership",{p_cnpj:user.user_metadata.company_cnpj,p_department:user.user_metadata.department||null,p_job_title:user.user_metadata.job_title||null});
          if (!inserted.error) { const refreshed=await client.from("empresa_segura_memberships").select("*, empresa_segura_companies(id,legal_name,trade_name,status)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(); if(!refreshed.error) setMembership(refreshed.data); }
        }
      }
    } catch(e) { sayError(e); }
    finally { setLoading(false); }
  }

  useEffect(()=>{
    if (!client) { setLoading(false); setError("Autenticação não configurada no serviço. Verifique as variáveis do Render."); return; }
    let alive=true;
    client.auth.getSession().then(({data})=>{ if(alive && data.session){setSession(data.session); refresh(data.session.user);} else if(alive) setLoading(false); });
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,s)=>{ if(!alive)return; setSession(s); if(s?.user) refresh(s.user); else {setProfile(null);setCompany(null);setMembership(null);setLoading(false);} });
    return ()=>{alive=false;subscription.unsubscribe();};
  },[pageType]);

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true);setError("");setMessage("");
    try {
      if (!client) throw new Error("Serviço de autenticação não configurado.");
      if(mode==="register") {
        if(!form.full_name.trim()) throw new Error("Informe seu nome completo.");
        if(isCompany && (!form.legal_name.trim() || !form.cnpj.trim() || !form.contact_email.trim())) throw new Error("Informe razão social, CNPJ e e-mail de contato.");
        if(!isCompany && !form.company_cnpj.trim()) throw new Error("Informe o CNPJ da empresa participante.");
        const metadata={full_name:form.full_name.trim(),requested_role:isCompany?"company_admin":"employee"};
        if(isCompany) Object.assign(metadata,{legal_name:form.legal_name.trim(),trade_name:form.trade_name.trim(),cnpj:form.cnpj.replace(/\\D/g,""),contact_email:form.contact_email.trim(),phone:form.phone.trim(),sector:form.sector.trim(),employee_count:form.employee_count});
        else Object.assign(metadata,{company_cnpj:form.company_cnpj.replace(/\\D/g,""),department:form.department.trim(),job_title:form.job_title.trim()});
        const {data,error:authError}=await client.auth.signUp({email:form.email.trim(),password:form.password,options:{data:metadata,emailRedirectTo:window.location.origin}});
        if(authError) throw authError;
        if(data.session){setSession(data.session);await refresh(data.session.user);setMessage("Solicitação registrada. O acesso ficará pendente até a aprovação da ENAT.");}
        else setMessage("Conta criada. Confirme seu e-mail e depois entre novamente para concluir sua solicitação. O acesso permanece pendente de aprovação.");
        setMode("login");
      } else {
        const {data,error:authError}=await client.auth.signInWithPassword({email:form.email.trim(),password:form.password});
        if(authError) throw authError;
        setSession(data.session); await refresh(data.user);
      }
    } catch(e){sayError(e);} finally{setBusy(false);}
  }

  async function logout(){await client?.auth.signOut();setSession(null);setProfile(null);setCompany(null);setMembership(null);setMode("login");}
  const status= isCompany ? company?.status : membership?.status;
  const active=profile?.status==="active" && (isCompany ? profile?.role==="company_admin" && company?.status==="approved" : membership?.status==="approved" && membership?.empresa_segura_companies?.status==="approved");
  const pending=status==="pending" || profile?.status==="pending";

  return <div className="portal-content-shell">
    <header className="portal-content-header">
      <a className="portal-content-brand" href="#inicio" onClick={e=>{e.preventDefault();onBack();}}><span><ShieldCheck size={22}/></span><strong>EMPRESA SEGURA <small>ENAT · Neuroeducação aplicada</small></strong></a>
      <div className="portal-header-actions">{session && <button onClick={logout}><LogOut size={15}/> Sair</button>}<button onClick={onBack}><ArrowLeft size={16}/> Portal público</button></div>
    </header>
    <main className="portal-content-main">
      <div className="portal-content-kicker">{isCompany?<Building2 size={16}/>:<UserRound size={16}/>} {isCompany?"ÁREA DA ORGANIZAÇÃO":"ÁREA INDIVIDUAL DO FUNCIONÁRIO"}</div>
      {!session ? <section className="portal-auth-layout">
        <div className="portal-auth-intro"><span>EMPRESA SEGURA · ENAT</span><h1>{isCompany?"Gestão da segurança começa com uma empresa comprometida.":"Aprendizagem e segurança começam com você."}</h1><p>{isCompany?"Solicite a participação da sua organização. O acesso é liberado após análise e aprovação da ENAT.":"Entre com sua conta individual ou solicite vínculo à empresa participante."}</p><div className="portal-auth-assurance"><ShieldCheck size={18}/><span>Autenticação individual, aprovação de acesso e permissões por perfil.</span></div></div>
        <section className="portal-auth-card"><div className="portal-auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");setMessage("");}}><LogIn size={15}/> Entrar</button><button className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("");setMessage("");}}><UserPlus size={15}/> {isCompany?"Solicitar cadastro":"Criar conta"}</button></div>
          <h2>{mode==="login"?"Acesse sua conta":isCompany?"Solicitar cadastro da empresa":"Solicitar acesso como funcionário"}</h2><p className="portal-auth-subtitle">{mode==="login"?"Use seu e-mail e senha cadastrados.": "Sua conta e seu acesso ficarão pendentes até a confirmação e aprovação exigidas."}</p>
          <form onSubmit={submitAuth} className="portal-auth-form">
            {mode==="register" && <><label>Nome completo do responsável</label><input required value={form.full_name} onChange={e=>change("full_name",e.target.value)} autoComplete="name" placeholder="Nome e sobrenome"/></>}
            <label>E-mail</label><input required type="email" value={form.email} onChange={e=>change("email",e.target.value)} autoComplete="email" placeholder="voce@empresa.com.br"/>
            <label>Senha</label><input required type="password" minLength={8} value={form.password} onChange={e=>change("password",e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Mínimo de 8 caracteres"/>
            {mode==="register" && isCompany && <><label>Razão social</label><input required value={form.legal_name} onChange={e=>change("legal_name",e.target.value)} placeholder="Nome empresarial"/><label>Nome fantasia (opcional)</label><input value={form.trade_name} onChange={e=>change("trade_name",e.target.value)} placeholder="Nome público"/><label>CNPJ</label><input required value={form.cnpj} onChange={e=>change("cnpj",e.target.value)} placeholder="00.000.000/0000-00"/><label>E-mail de contato da empresa</label><input required type="email" value={form.contact_email} onChange={e=>change("contact_email",e.target.value)} placeholder="contato@empresa.com.br"/><label>Telefone</label><input value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="(00) 00000-0000"/><label>Setor de atuação</label><input value={form.sector} onChange={e=>change("sector",e.target.value)} placeholder="Ex.: transporte, indústria, serviços"/><label>Número aproximado de funcionários</label><input type="number" min="1" value={form.employee_count} onChange={e=>change("employee_count",e.target.value)} placeholder="Quantidade"/></>}
            {mode==="register" && !isCompany && <><label>CNPJ da empresa participante</label><input required value={form.company_cnpj} onChange={e=>change("company_cnpj",e.target.value)} placeholder="00.000.000/0000-00"/><label>Setor/departamento</label><input value={form.department} onChange={e=>change("department",e.target.value)} placeholder="Seu setor"/><label>Cargo</label><input value={form.job_title} onChange={e=>change("job_title",e.target.value)} placeholder="Seu cargo"/></>}
            <button className="portal-auth-submit" disabled={busy||loading}>{busy?"Processando…":mode==="login"?"Entrar com segurança": "Enviar solicitação"}</button>
          </form>
          {error&&<div className="portal-auth-message error"><AlertCircle size={16}/>{error}</div>}{message&&<div className="portal-auth-message success"><CheckCircle2 size={16}/>{message}</div>}
          {mode==="login"&&<button className="portal-reset-password" onClick={async()=>{setError("");setMessage("");if(!form.email.trim()){setError("Informe seu e-mail para recuperar a senha.");return;}const {error:e}=await client.auth.resetPasswordForEmail(form.email.trim(),{redirectTo:window.location.origin});if(e)setError(e.message);else setMessage("Se o endereço estiver cadastrado, você receberá instruções de recuperação.");}}>Esqueci minha senha</button>}
        </section>
      </section> : <section className="portal-account-layout">
        <div className="portal-account-heading"><div><span>CONTA AUTENTICADA</span><h1>{profile?.full_name||session.user.email}</h1><p>{session.user.email}</p></div><span className={"portal-status-pill "+(active?"approved":pending?"pending":"blocked")}>{active?"Acesso aprovado":pending?"Em análise":"Acesso não autorizado"}</span></div>
        {loading ? <p>Carregando permissões…</p> : active ? <><div className="portal-account-welcome"><CheckCircle2 size={21}/><div><strong>Bem-vindo ao {isCompany?"Portal da Empresa":"Portal do Funcionário"}</strong><p>Seu acesso foi validado para este perfil.</p></div></div>
          {isCompany && company && <div className="portal-account-card"><h2>{company.trade_name||company.legal_name}</h2><p>CNPJ: {company.cnpj}</p><p>Participação aprovada. As áreas de equipe e conteúdos operacionais serão disponibilizadas conforme as permissões do programa.</p></div>}
          {!isCompany && membership && <div className="portal-account-card"><h2>{membership.empresa_segura_companies?.trade_name||membership.empresa_segura_companies?.legal_name||"Empresa vinculada"}</h2><p>Setor: {membership.department||"Não informado"} · Cargo: {membership.job_title||"Não informado"}</p></div>}
          <div className="portal-content-grid">{(page?.sections||defaults[pageType].sections.map(([title,body])=>({title,body}))).map((section,i)=><article key={section.title||i} className="portal-content-card"><span>SEÇÃO {String(i+1).padStart(2,"0")}</span><h2>{section.title}</h2><p>{section.body?.replace(/<[^>]*>/g,"")||""}</p></article>)}</div>
        </> : <div className="portal-pending-card"><Clock3 size={25}/><h2>{pending?"Solicitação em análise":"Acesso ainda não autorizado"}</h2><p>{pending?"Sua conta foi criada, mas a ENAT precisa aprovar o cadastro da empresa ou o vínculo funcional antes de liberar os dados internos.":"O perfil não tem uma autorização válida para esta área. Confirme se entrou no portal correto ou contate a administração ENAT."}</p><button onClick={()=>refresh(session.user)}>Atualizar situação</button></div>}
        {error&&<div className="portal-auth-message error"><AlertCircle size={16}/>{error}</div>}
      </section>}
      <p className="portal-content-note">Acesso protegido por autenticação. Cadastros e vínculos ficam pendentes até aprovação; não utilize contas compartilhadas.</p>
    </main>
  </div>;
}
