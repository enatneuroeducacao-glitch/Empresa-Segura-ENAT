import React from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, LockKeyhole, Building2, Users, FileText, BookOpenCheck, Settings, Activity, KeyRound, CircleHelp, LogOut, RefreshCw, CheckCircle2, XCircle, Clock3, Save, Eye, AlertTriangle, CalendarCheck, Printer } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client=url&&key?createClient(url,key):null;
const apiBase=import.meta.env.VITE_EMPRESA_SEGURA_API_URL||"https://empresa-segura-enat-api.onrender.com";
const tabs=[["companies","Empresas",Building2],["people","Funcionários",Users],["events","Participantes ENAT",CalendarCheck],["reports","Relatórios",FileText],["content","Conteúdo",BookOpenCheck],["audit","Auditoria",Activity]];

export function AdminContent({onBack}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [session,setSession]=useState(null);
  const [admin,setAdmin]=useState(null);
  const [tab,setTab]=useState("companies");
  const [companies,setCompanies]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [memberships,setMemberships]=useState([]);
  const [audit,setAudit]=useState([]);
  const [pages,setPages]=useState([]);
  const [pageType,setPageType]=useState("empresa");
  const [pageJson,setPageJson]=useState("");
  const [loading,setLoading]=useState(false);
  const [busyId,setBusyId]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [showInfo,setShowInfo]=useState(false);
  const [reportType,setReportType]=useState("todos");
  const [reportStatus,setReportStatus]=useState("todas");
  const [reportPeriod,setReportPeriod]=useState("todos");
  const [reportSearch,setReportSearch]=useState("");
  const [reportDetail,setReportDetail]=useState(null);
  const [eventParticipants,setEventParticipants]=useState([]);
  const [eventSearch,setEventSearch]=useState("");

  async function verifyAndLoad(s) {
    if(!client||!s?.user)return;
    setLoading(true);setError("");setNotice("");
    try{
      const {data:ap,error:ae}=await client.from("admin_profiles").select("id,role,active").eq("id",s.user.id).eq("role","admin").eq("active",true).maybeSingle();
      if(ae)throw ae;
      if(!ap){setAdmin(null);setError("Esta conta não possui perfil administrativo ENAT ativo. Solicite a habilitação a um administrador autorizado.");return;}
      setAdmin(ap);
      await loadData();
      await loadEventParticipants(s);
    }catch(e){setError(e.message||"Falha ao validar o perfil administrativo.");}
    finally{setLoading(false);}
  }
  async function loadEventParticipants(currentSession=session){
    if(!currentSession?.access_token){setEventParticipants([]);return;}
    const response=await fetch(apiBase+"/api/admin/event-participants",{headers:{Authorization:"Bearer "+currentSession.access_token}});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Não foi possível carregar inscrições em eventos ENAT.");
    setEventParticipants(Array.isArray(data.participants)?data.participants:[]);
  }
  async function reviewEventParticipant(participant,status){
    setBusyId(participant.id);setError("");setNotice("");
    try{
      const response=await fetch(apiBase+"/api/admin/event-participants/"+encodeURIComponent(participant.id)+"/status",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({status})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Não foi possível atualizar a inscrição.");
      setNotice(status==="attended"?"Presença confirmada. Relatório individual liberado para o participante.":status==="approved"?"Inscrição aprovada.":"Inscrição rejeitada.");
      await loadEventParticipants(session);
    }catch(e){setError(e.message||"Falha ao atualizar inscrição.");}
    finally{setBusyId("");}
  }
  async function loadData(){
    if(!client)return;
    const [c,p,m,a,pg]=await Promise.all([
      client.from("empresa_segura_companies").select("*").order("created_at",{ascending:false}).limit(200),
      client.from("empresa_segura_profiles").select("*").order("created_at",{ascending:false}).limit(500),
      client.from("empresa_segura_memberships").select("*, empresa_segura_companies(id,legal_name,trade_name,status)").order("created_at",{ascending:false}).limit(500),
      client.from("empresa_segura_audit_log").select("*").order("created_at",{ascending:false}).limit(200),
      client.from("empresa_segura_pages").select("*").order("page_type")
    ]);
    const first=[c,p,m,a,pg].find(x=>x.error);
    if(first)throw first.error;
    setCompanies(c.data||[]);setProfiles(p.data||[]);setMemberships(m.data||[]);setAudit(a.data||[]);setPages(pg.data||[]);
    const selected=(pg.data||[]).find(x=>x.page_type===pageType);
    setPageJson(JSON.stringify(selected?.content||defaultContent(pageType),null,2));
  }
  useEffect(()=>{
    if(!client){setError("Configuração do Supabase ausente. Confira as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no Render.");return;}
    let alive=true;
    client.auth.getSession().then(({data})=>{if(alive&&data.session){setSession(data.session);verifyAndLoad(data.session);}});
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,s)=>{if(!alive)return;setSession(s);if(s?.user)verifyAndLoad(s);else{setAdmin(null);setCompanies([]);setProfiles([]);setMemberships([]);setAudit([]);}});
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);
  useEffect(()=>{const selected=pages.find(x=>x.page_type===pageType);setPageJson(JSON.stringify(selected?.content||defaultContent(pageType),null,2));},[pageType,pages]);
  async function signIn(e){e.preventDefault();setLoading(true);setError("");setNotice("");try{const {data,error:e2}=await client.auth.signInWithPassword({email:email.trim(),password});if(e2)throw e2;setSession(data.session);await verifyAndLoad(data.session);}catch(e){setError(e.message||"Não foi possível autenticar.");}finally{setLoading(false);}}
  async function signOut(){await client?.auth.signOut();setSession(null);setAdmin(null);}
  async function act(id,fn,success){setBusyId(id);setError("");setNotice("");try{const {error:e}=await fn();if(e)throw e;setNotice(success);await loadData();}catch(e){setError(e.message||"Operação não concluída.");}finally{setBusyId("");}}
  async function reviewCompany(c,approved){await act(c.id,async()=>{
    const r=await client.from("empresa_segura_companies").update({status:approved?"ATIVA":"INATIVA",reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq("id",c.id);
    if(r.error)return r;
    if(approved)return await client.from("empresa_segura_profiles").update({role:"company_admin",status:"active"}).eq("user_id",c.owner_user_id);
    return await client.from("empresa_segura_profiles").update({status:"rejected"}).eq("user_id",c.owner_user_id);
  },approved?"Empresa aprovada e perfil do responsável habilitado.":"Solicitação de empresa rejeitada.");}
  async function reviewMember(m,approved){if(approved && !["approved","ATIVA"].includes(m.empresa_segura_companies?.status)){setError("A empresa precisa ser aprovada antes de autorizar o vínculo do funcionário.");return;}await act(m.id,async()=>{
    const r=await client.from("empresa_segura_memberships").update({status:approved?"approved":"rejected",reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq("id",m.id);
    if(r.error)return r;
    const anyApproved=approved?true:memberships.some(x=>x.user_id===m.user_id&&x.id!==m.id&&x.status==="approved");
    return await client.from("empresa_segura_profiles").update({status:anyApproved?"active":approved?"active":"rejected"}).eq("user_id",m.user_id);
  },approved?"Vínculo do funcionário aprovado.":"Vínculo rejeitado.");}
  async function savePage(e){e.preventDefault();setBusyId("cms");setError("");setNotice("");try{
    let parsed;try{parsed=JSON.parse(pageJson);}catch{throw new Error("O conteúdo precisa ser um JSON válido.");}
    const {error:e2}=await client.from("empresa_segura_pages").upsert({page_type:pageType,content:parsed,published:false,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:"page_type"});
    if(e2)throw e2;setNotice("Rascunho salvo. O conteúdo permanece privado até ser publicado.");await loadData();
  }catch(e){setError(e.message||"Não foi possível salvar o conteúdo.");}finally{setBusyId("");}}
  async function publishPage(published){setBusyId("cms-publish");setError("");setNotice("");try{
    let parsed;try{parsed=JSON.parse(pageJson);}catch{throw new Error("O conteúdo precisa ser um JSON válido.");}
    const {error:e}=await client.from("empresa_segura_pages").upsert({page_type:pageType,content:parsed,published,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:"page_type"});
    if(e)throw e;setNotice(published?"Página publicada para o público autorizado.":"Publicação suspensa; página em rascunho.");await loadData();
  }catch(e){setError(e.message||"Falha ao atualizar publicação.");}finally{setBusyId("");}}
  if(!session||!admin)return <div className="admin-shell">
    <header className="admin-header"><a className="admin-brand" href="#inicio" onClick={e=>{e.preventDefault();onBack();}}><span className="admin-brand-mark"><ShieldCheck size={25}/></span><span><strong>EMPRESA SEGURA <em>ENAT</em></strong><small>CENTRAL DE ADMINISTRAÇÃO</small></span></a><button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Voltar ao portal público</button></header>
    <main className="admin-layout"><section className="admin-intro"><span className="admin-eyebrow">GOVERNANÇA · PREVENÇÃO · GESTÃO</span><h1>Administração com <em>controle e rastreabilidade.</em></h1><p>Gerencie solicitações, autorizações, conteúdo publicado e histórico operacional da Empresa Segura ENAT.</p><div className="admin-feature-list"><div><Building2/><span><strong>Empresas e solicitações</strong><small>Análise e aprovação institucional</small></span></div><div><Users/><span><strong>Contas e vínculos</strong><small>Controle de acesso por perfil</small></span></div><div><Activity/><span><strong>Auditoria</strong><small>Histórico de alterações registradas</small></span></div></div></section>
    <section className="admin-login-card"><div className="admin-login-icon"><LockKeyhole size={24}/></div><span className="admin-eyebrow">ACESSO RESTRITO</span><h2>Entrar na administração</h2><p>Somente contas com perfil administrativo ENAT ativo podem continuar.</p><form onSubmit={signIn}><label htmlFor="admin-email">E-mail institucional</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@enat..." required/><label htmlFor="admin-password">Senha</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="admin-submit" disabled={loading}><KeyRound size={17}/>{loading?"Validando…":"Entrar com segurança"}</button></form>
    {error&&<div className="admin-warning"><AlertTriangle size={17}/><span><strong>Não foi possível acessar</strong><small>{error}</small></span></div>}<button className="admin-help-toggle" onClick={()=>setShowInfo(!showInfo)}><CircleHelp size={15}/> Como funciona a autorização?</button>{showInfo&&<div className="admin-help-copy">A autenticação usa Supabase Auth. O acesso administrativo depende de um registro ativo em admin_profiles, separado dos metadados editáveis do usuário. A conta inicial de administrador precisa ser habilitada por um operador autorizado no banco.</div>}<div className="admin-security-note"><ShieldCheck size={15}/><span>Senhas não são armazenadas pela aplicação; a sessão é gerenciada pelo Supabase Auth.</span></div></section></main>
    <footer className="admin-footer"><span>ENAT · EMPRESA SEGURA</span><span>Autenticação e autorização independentes</span><button onClick={onBack}><Eye size={14}/> Ver portal público</button></footer>
  </div>;

  const pendingCompanies=companies.filter(c=>c.status==="pending").length;
  const pendingMembers=memberships.filter(m=>m.status==="pending").length;
  const currentPage=pages.find(p=>p.page_type===pageType);
  return <div className="admin-dashboard">
    <aside className="admin-sidebar"><a className="admin-brand" href="#inicio" onClick={e=>{e.preventDefault();onBack();}}><span className="admin-brand-mark"><ShieldCheck size={23}/></span><span><strong>EMPRESA SEGURA <em>ENAT</em></strong><small>ADMINISTRAÇÃO</small></span></a><div className="admin-side-label">CENTRAL DE CONTROLE</div>{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={17}/>{label}{id==="companies"&&pendingCompanies>0?<b>{pendingCompanies}</b>:id==="people"&&pendingMembers>0?<b>{pendingMembers}</b>:null}</button>)}<div className="admin-side-bottom"><span>{session.user.email}</span><button onClick={signOut}><LogOut size={16}/> Sair com segurança</button><button onClick={onBack}><ArrowLeft size={16}/> Portal público</button></div></aside>
    <main className="admin-workspace"><header className="admin-workspace-header"><div><span className="admin-eyebrow">ENAT · GOVERNANÇA DIGITAL</span><h1>{tabs.find(t=>t[0]===tab)?.[1]||"Central administrativa"}</h1><p>Controle de acesso, solicitações e publicação institucional.</p></div><button className="admin-refresh" onClick={()=>loadData()} disabled={loading}><RefreshCw size={15}/> Atualizar dados</button></header>
    {error&&<div className="admin-alert error"><AlertTriangle size={17}/>{error}</div>}{notice&&<div className="admin-alert success"><CheckCircle2 size={17}/>{notice}</div>}
    {loading?<div className="admin-empty"><RefreshCw/> Carregando dados protegidos…</div>:<>
    <div className="admin-metrics"><article><span>Empresas cadastradas</span><strong>{companies.length}</strong><small>{pendingCompanies} aguardando análise</small></article><article><span>Contas individuais</span><strong>{profiles.length}</strong><small>{pendingMembers} vínculos pendentes</small></article><article><span>Páginas publicadas</span><strong>{pages.filter(p=>p.published).length}</strong><small>Conteúdo do portal</small></article><article><span>Eventos de auditoria</span><strong>{audit.length}</strong><small>Últimos 200 eventos</small></article></div>
    {tab==="companies"&&<section className="admin-data-panel"><div className="admin-panel-heading"><div><h2>Solicitações de empresas</h2><p>Confira os dados e aprove ou rejeite o cadastro institucional.</p></div><span>{companies.length} registros</span></div>{companies.length===0?<div className="admin-empty">Nenhuma solicitação de empresa encontrada.</div>:<div className="admin-table-wrap"><table><thead><tr><th>Empresa</th><th>CNPJ</th><th>Contato</th><th>Status</th><th>Recebida em</th><th>Ações</th></tr></thead><tbody>{companies.map(c=><tr key={c.id}><td><strong>{c.trade_name||c.legal_name}</strong><small>{c.legal_name}</small></td><td>{c.cnpj}</td><td>{c.contact_email}<small>{c.phone||"Telefone não informado"}</small></td><td><span className={"admin-state "+c.status}>{c.status}</span></td><td>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td><td>{c.status==="pending"?<div className="admin-row-actions"><button disabled={busyId===c.id} onClick={()=>reviewCompany(c,true)}><CheckCircle2 size={14}/> Aprovar</button><button className="reject" disabled={busyId===c.id} onClick={()=>reviewCompany(c,false)}><XCircle size={14}/> Rejeitar</button></div>:<span className="admin-muted">{c.review_note||"Analisada"}</span>}</td></tr>)}</tbody></table></div>}</section>}
    {tab==="people"&&<><section className="admin-data-panel"><div className="admin-panel-heading"><div><h2>Solicitações de vínculo</h2><p>Aprove o vínculo de funcionários à empresa participante.</p></div><span>{memberships.length} vínculos</span></div>{memberships.length===0?<div className="admin-empty">Nenhum vínculo encontrado.</div>:<div className="admin-table-wrap"><table><thead><tr><th>Conta</th><th>Empresa</th><th>Setor / cargo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{memberships.map(m=><tr key={m.id}><td>{profiles.find(p=>p.user_id===m.user_id)?.full_name||m.user_id.slice(0,8)}</td><td>{m.empresa_segura_companies?.trade_name||m.empresa_segura_companies?.legal_name||m.company_id}</td><td>{m.department||"—"} / {m.job_title||"—"}</td><td><span className={"admin-state "+m.status}>{m.status}</span></td><td>{m.status==="pending"?<div className="admin-row-actions"><button disabled={busyId===m.id} onClick={()=>reviewMember(m,true)}><CheckCircle2 size={14}/> Aprovar</button><button className="reject" disabled={busyId===m.id} onClick={()=>reviewMember(m,false)}><XCircle size={14}/> Rejeitar</button></div>:<span className="admin-muted">—</span>}</td></tr>)}</tbody></table></div>}</section><section className="admin-data-panel"><div className="admin-panel-heading"><div><h2>Contas cadastradas</h2><p>Perfis, situação e data de criação.</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Criado em</th></tr></thead><tbody>{profiles.map(p=><tr key={p.user_id}><td>{p.full_name||p.user_id.slice(0,8)}</td><td>{p.role}</td><td><span className={"admin-state "+p.status}>{p.status}</span></td><td>{new Date(p.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div></section></>}
    {tab==="events"&&<section className="admin-data-panel">
      <div className="admin-panel-heading"><div><h2>Participantes individuais de eventos ENAT</h2><p>Inscrições de pessoas sem necessidade de vínculo empresarial. O relatório curricular só é liberado após confirmação de presença.</p></div><span>{eventParticipants.length} inscrições</span></div>
      <div className="es-report-filters"><label className="es-report-search"><span>Pesquisar participante/evento</span><div><Search size={15}/><input value={eventSearch} onChange={e=>setEventSearch(e.target.value)} placeholder="Nome, e-mail, cidade ou evento…"/></div></label><label><span>Situação</span><select value={reportStatus} onChange={e=>setReportStatus(e.target.value)}><option value="todas">Todas</option><option value="pending">Em análise</option><option value="approved">Aprovadas</option><option value="rejected">Rejeitadas</option><option value="attended">Presença confirmada</option></select></label><div><button className="admin-refresh" onClick={()=>loadEventParticipants(session)}><RefreshCw size={14}/> Atualizar</button></div></div>
      <div className="admin-table-wrap"><table><thead><tr><th>Participante</th><th>Evento</th><th>Cidade</th><th>Situação profissional</th><th>Status</th><th>Relatório</th><th>Ações</th></tr></thead><tbody>
      {eventParticipants.filter(p=>{const q=eventSearch.trim().toLowerCase();return (!q||[p.full_name,p.email,p.city,p.event_name].some(v=>String(v||"").toLowerCase().includes(q)))&&(reportStatus==="todas"||p.status===reportStatus);}).map(p=><tr key={p.id}><td><strong>{p.full_name}</strong><small>{p.email||"—"}{p.phone?" · "+p.phone:""}</small></td><td>{p.event_name}</td><td>{p.city}</td><td>{({unemployed:"Desempregado(a)",employed:"Empregado(a)",student:"Estudante",self_employed:"Autônomo(a)",other:"Outro"})[p.employment_status]||"—"}</td><td><span className={"admin-state "+p.status}>{({pending:"Em análise",approved:"Aprovado",rejected:"Rejeitado",attended:"Presença confirmada"})[p.status]||p.status}</span></td><td>{p.report_issued_at&&p.report_code?<><strong>Disponível</strong><small>{p.report_code}</small></>:"Aguardando presença"}</td><td><div className="admin-row-actions">{p.status==="pending"&&<><button disabled={busyId===p.id} onClick={()=>reviewEventParticipant(p,"approved")}><CheckCircle2 size={13}/> Aprovar</button><button className="reject" disabled={busyId===p.id} onClick={()=>reviewEventParticipant(p,"rejected")}><XCircle size={13}/> Rejeitar</button></>}{p.status==="approved"&&<button disabled={busyId===p.id} onClick={()=>reviewEventParticipant(p,"attended")}><CalendarCheck size={13}/> Confirmar presença</button>}{p.status==="attended"&&<span className="admin-muted">Relatório liberado</span>}{p.status==="rejected"&&<span className="admin-muted">Encerrado</span>}</div></td></tr>)}
      {eventParticipants.filter(p=>{const q=eventSearch.trim().toLowerCase();return (!q||[p.full_name,p.email,p.city,p.event_name].some(v=>String(v||"").toLowerCase().includes(q)))&&(reportStatus==="todas"||p.status===reportStatus);}).length===0&&<tr><td colSpan="7"><div className="admin-empty">Nenhuma inscrição encontrada para os filtros selecionados.</div></td></tr>}
      </tbody></table></div>
      <p className="es-report-privacy"><ShieldCheck size={15}/> Confirme presença somente após validação pela organização. O documento emitido é um relatório de participação, não um diploma ou certificado profissional.</p>
    </section>}
    {tab==="reports"&&(()=>{
      const now=Date.now();
      const cutoff=reportPeriod==="30"?now-30*86400000:reportPeriod==="90"?now-90*86400000:reportPeriod==="365"?now-365*86400000:0;
      const rows=[
        ...companies.map(c=>({id:"company:"+c.id,type:"empresa",typeLabel:"Empresa",name:c.trade_name||c.legal_name||"Empresa sem nome",identifier:c.cnpj||"CNPJ não informado",status:String(c.status||"sem_status"),date:c.created_at,subtitle:c.contact_email||c.phone||"",company:c.legal_name,details:c})),
        ...profiles.map(p=>({id:"profile:"+p.user_id,type:"funcionario",typeLabel:"Perfil",name:p.full_name||p.user_id,identifier:p.user_id,status:String(p.status||"sem_status"),date:p.created_at,subtitle:p.role||p.requested_role||"",company:"",details:p})),
        ...memberships.map(m=>({id:"membership:"+m.id,type:"funcionario",typeLabel:"Vínculo",name:profiles.find(p=>p.user_id===m.user_id)?.full_name||m.user_id||"Funcionário",identifier:m.user_id||m.id,status:String(m.status||"sem_status"),date:m.created_at,subtitle:[m.department,m.job_title].filter(Boolean).join(" · "),company:m.empresa_segura_companies?.trade_name||m.empresa_segura_companies?.legal_name||m.company_id||"",details:m})),
        ...audit.map(a=>({id:"audit:"+a.id,type:"historico",typeLabel:"Histórico",name:a.action||"Evento",identifier:a.record_id||"—",status:String(a.action||"registrado"),date:a.created_at,subtitle:a.table_name||"",company:"",details:a}))
      ];
      const filtered=rows.filter(r=>{
        if(reportType!=="todos"&&r.type!==reportType)return false;
        if(reportStatus!=="todas"&&r.status.toLowerCase()!==reportStatus.toLowerCase())return false;
        if(cutoff&&(!r.date||new Date(r.date).getTime()<cutoff))return false;
        const q=reportSearch.trim().toLowerCase();
        return !q||[r.name,r.identifier,r.subtitle,r.company,r.status,r.typeLabel].some(v=>String(v||"").toLowerCase().includes(q));
      }).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
      const exportRows=()=>{
        const columns=["Tipo","Nome/Evento","Identificador","Situação","Data","Empresa/Contexto","Complemento"];
        const quote=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
        const csv="\uFEFF"+[columns,...filtered.map(r=>[r.typeLabel,r.name,r.identifier,r.status,r.date?new Date(r.date).toLocaleString("pt-BR"):"",r.company,r.subtitle])].map(row=>row.map(quote).join(";")).join("\r\n");
        const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
        const a=document.createElement("a");a.href=url;a.download="empresa-segura-relatorios.csv";a.click();URL.revokeObjectURL(url);
      };
      return <section className="admin-data-panel es-report-panel">
        <div className="admin-panel-heading"><div><h2>Relatórios de cadastros e histórico</h2><p>Consulta os registros disponíveis no Supabase. Dados originais e informações mensuradas permanecem restritos à administração.</p></div><span>{filtered.length} registros</span></div>
        <div className="es-report-filters">
          <label className="es-report-search"><span>Pesquisar</span><div><Search size={15}/><input value={reportSearch} onChange={e=>setReportSearch(e.target.value)} placeholder="Empresa, CNPJ, usuário, evento…"/></div></label>
          <label><span>Tipo</span><select value={reportType} onChange={e=>setReportType(e.target.value)}><option value="todos">Todos</option><option value="empresa">Empresas</option><option value="funcionario">Funcionários e vínculos</option><option value="historico">Histórico</option></select></label>
          <label><span>Situação</span><select value={reportStatus} onChange={e=>setReportStatus(e.target.value)}><option value="todas">Todas</option><option value="pending">Pendente</option><option value="active">Ativo</option><option value="approved">Aprovado</option><option value="rejected">Rejeitado</option><option value="INATIVA">Inativa</option><option value="ATIVA">Ativa</option></select></label>
          <label><span>Período</span><select value={reportPeriod} onChange={e=>setReportPeriod(e.target.value)}><option value="todos">Todo o período</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option></select></label>
        </div>
        <div className="es-report-actions"><span>Atualize a Central para consultar os dados mais recentes.</span><div><button onClick={exportRows} disabled={!filtered.length}><Download size={14}/> Exportar Excel/CSV</button><button onClick={()=>window.print()}><Printer size={14}/> Imprimir / PDF</button></div></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Tipo</th><th>Registro</th><th>Identificador</th><th>Empresa / contexto</th><th>Situação</th><th>Data</th><th>Detalhes</th></tr></thead><tbody>
        {filtered.length===0?<tr><td colSpan="7"><div className="admin-empty">Nenhum registro corresponde aos filtros selecionados.</div></td></tr>:filtered.map(r=><tr key={r.id}><td><span className="es-report-type">{r.typeLabel}</span></td><td><strong>{r.name}</strong><small>{r.subtitle||"—"}</small></td><td>{r.identifier}</td><td>{r.company||"—"}</td><td><span className={"admin-state "+r.status.toLowerCase()}>{r.status}</span></td><td>{r.date?new Date(r.date).toLocaleString("pt-BR"):"—"}</td><td><button className="es-report-detail" onClick={()=>setReportDetail(r)}><Eye size={14}/> Abrir</button></td></tr>)}
        </tbody></table></div>
        <p className="es-report-privacy"><ShieldCheck size={15}/> Esta tela consolida cadastros e eventos existentes. Mensurações, tratamento e publicação segregada por empresa exigem a estrutura específica de relatórios e homologação do banco.</p>
      </section>;
    })()}
    {tab==="content"&&<section className="admin-data-panel"><div className="admin-panel-heading"><div><h2>Editor de conteúdo institucional</h2><p>Edite o JSON da página. Salvar mantém como rascunho; publicar libera a versão atual.</p></div><span className={"admin-state "+(currentPage?.published?"approved":"pending")}>{currentPage?.published?"Publicado":"Rascunho"}</span></div><div className="admin-content-toolbar"><label>Área do portal<select value={pageType} onChange={e=>setPageType(e.target.value)}><option value="empresa">Portal da Empresa</option><option value="funcionario">Portal do Funcionário</option></select></label><span>Última alteração: {currentPage?.updated_at?new Date(currentPage.updated_at).toLocaleString("pt-BR"):"Ainda não salvo"}</span></div><form onSubmit={savePage}><label className="admin-json-label">Conteúdo em JSON</label><textarea className="admin-json-editor" spellCheck="false" value={pageJson} onChange={e=>setPageJson(e.target.value)} rows={18}/><div className="admin-editor-actions"><button type="submit" disabled={busyId==="cms"}><Save size={15}/> Salvar rascunho</button><button type="button" className="publish" disabled={busyId==="cms-publish"} onClick={()=>publishPage(true)}><CheckCircle2 size={15}/> Publicar</button><button type="button" className="unpublish" onClick={()=>publishPage(false)}><Eye size={15}/> Retirar publicação</button></div></form></section>}
    {tab==="audit"&&<section className="admin-data-panel"><div className="admin-panel-heading"><div><h2>Histórico de auditoria</h2><p>Eventos de criação, alteração e exclusão registrados automaticamente.</p></div><span>{audit.length} eventos</span></div>{audit.length===0?<div className="admin-empty">Ainda não existem eventos de auditoria registrados.</div>:<div className="admin-table-wrap"><table><thead><tr><th>Data e hora</th><th>Ator</th><th>Ação</th><th>Origem</th><th>Registro</th></tr></thead><tbody>{audit.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString("pt-BR")}</td><td>{a.actor_user_id||"Sistema"}</td><td><span className="admin-state">{a.action}</span></td><td>{a.table_name}</td><td>{a.record_id||"—"}</td></tr>)}</tbody></table></div>}</section>}
    </>}
    {reportDetail&&<div className="es-report-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setReportDetail(null);}}><section className="es-report-modal" role="dialog" aria-modal="true" aria-label="Detalhes do registro"><header><div><span>DETALHES DO REGISTRO</span><h2>{reportDetail.name}</h2></div><button onClick={()=>setReportDetail(null)} aria-label="Fechar">×</button></header><div className="es-report-json">{Object.entries(reportDetail.details||{}).map(([key,value])=><div key={key}><span>{key}</span><strong>{typeof value==="object"&&value!==null?JSON.stringify(value,null,2):String(value??"—")}</strong></div>)}</div><footer><button onClick={()=>setReportDetail(null)}>Fechar detalhes</button></footer></section></div>}
    <footer className="admin-workspace-footer">Empresa Segura ENAT · Acesso administrativo autorizado · Auditoria operacional ativa</footer>
    </main>
  </div>;
}

function defaultContent(type){return type==="empresa"?{title:"Portal da Empresa",subtitle:"Área institucional para organizações participantes.",heroTitle:"Organize a segurança da sua empresa",heroText:"Acompanhe ações preventivas e fortaleça uma cultura de segurança.",sections:[{title:"Visão geral",body:"<p>Acompanhe o status da organização e as próximas etapas.</p>"},{title:"Equipe",body:"<p>Organize responsáveis e participantes autorizados.</p>"}]}:{title:"Portal do Funcionário",subtitle:"Espaço individual para aprendizagem e acompanhamento.",heroTitle:"Sua participação fortalece a segurança",heroText:"Acesse orientações e atividades educativas.",sections:[{title:"Aprendizagem",body:"<p>Acesse conteúdos educativos disponibilizados.</p>"},{title:"Atividades",body:"<p>Consulte campanhas e ações preventivas.</p>"}]};}
