import React, { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, UserRound, LogIn, UserPlus, LogOut, CalendarCheck, Clock3, CheckCircle2, AlertCircle, FileText, Printer, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const apiBase = import.meta.env.VITE_EMPRESA_SEGURA_API_URL || "https://empresa-segura-enat-api.onrender.com";
const employmentLabels = { unemployed: "Desempregado(a)", employed: "Empregado(a)", student: "Estudante", self_employed: "Autônomo(a) / empreendedor(a)", other: "Outro" };

export function EventParticipant({ onBack }) {
  const [mode, setMode] = useState("register");
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({ full_name:"", email:"", password:"", phone:"", city:"", employment_status:"unemployed", event_name:"", goals:"" });
  const [participants, setParticipants] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  async function loadMine(currentSession = session) {
    if (!currentSession?.access_token) { setParticipants([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(apiBase + "/api/event-participants/mine", { headers: { Authorization: "Bearer " + currentSession.access_token } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar suas inscrições.");
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
      if (data.participants?.[0]) {
        const latest = data.participants[0];
        setForm(current => ({ ...current, full_name: latest.full_name || current.full_name, phone: latest.phone || current.phone, city: latest.city || current.city, employment_status: latest.employment_status || current.employment_status }));
      }
    } catch (e) { setError(e.message || "Falha ao consultar suas inscrições."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!supabase) { setError("A autenticação ainda não está configurada no portal."); setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) loadMine(data.session); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      if (nextSession) loadMine(nextSession); else { setParticipants([]); setLoading(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (!supabase) throw new Error("Autenticação não configurada.");
      if (mode === "register") {
        if (!form.full_name.trim()) throw new Error("Informe seu nome completo.");
        const { data, error: authError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.full_name.trim(), requested_role: "event_participant" }, emailRedirectTo: window.location.origin }
        });
        if (authError) throw authError;
        if (data.session) {
          setSession(data.session);
          setMessage("Conta criada. Agora você pode solicitar participação em um evento ENAT.");
        } else {
          setMessage("Conta criada. Confirme seu e-mail e entre para enviar sua solicitação de participação.");
          setMode("login");
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (authError) throw authError;
        setSession(data.session);
        await loadMine(data.session);
        setMessage("Acesso realizado.");
      }
    } catch (e) { setError(e.message || "Não foi possível autenticar."); }
    finally { setBusy(false); }
  }

  async function submitRegistration(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (!form.full_name.trim() || !form.event_name.trim() || !form.city.trim()) throw new Error("Preencha nome, evento e cidade.");
      const response = await fetch(apiBase + "/api/event-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ full_name: form.full_name.trim(), phone: form.phone.trim(), city: form.city.trim(), employment_status: form.employment_status, event_name: form.event_name.trim(), goals: form.goals.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar sua solicitação.");
      setMessage("Solicitação registrada. A ENAT analisará sua inscrição; o relatório de participação só será liberado após confirmação de presença.");
      await loadMine(session);
    } catch (e) { setError(e.message || "Não foi possível enviar a solicitação."); }
    finally { setBusy(false); }
  }

  async function logout() { await supabase?.auth.signOut(); setSession(null); setParticipants([]); setMode("login"); }
  const statusLabel = status => ({ pending:"Em análise", approved:"Inscrição aprovada", rejected:"Não aprovada", attended:"Presença confirmada" }[status] || status || "Em análise");

  return <div className="event-participant-shell">
    <header className="event-participant-header">
      <a className="event-participant-brand" href="#inicio" onClick={e => { e.preventDefault(); onBack(); }}><span><ShieldCheck size={22}/></span><strong>ENAT <small>Participação em eventos</small></strong></a>
      <div className="event-participant-header-actions">{session && <button onClick={logout}><LogOut size={15}/> Sair</button>}<button onClick={onBack}><ArrowLeft size={16}/> Voltar ao portal</button></div>
    </header>
    <main className="event-participant-main">
      <div className="event-participant-intro"><span>PARTICIPAÇÃO ABERTA · ENAT</span><h1>Seu interesse em aprender também merece reconhecimento.</h1><p>Este espaço é destinado a pessoas desempregadas, estudantes, profissionais autônomos e demais interessados em participar de eventos e atividades do ENAT, sem necessidade de vínculo com uma empresa.</p><div className="event-participant-note"><ShieldCheck size={17}/><span>O relatório individual de participação será disponibilizado somente após a confirmação da presença pela organização. A inscrição, por si só, não comprova participação nem certificação.</span></div></div>
      {!session ? <section className="event-participant-auth">
        <div className="event-participant-tabs"><button className={mode==="register"?"active":""} onClick={() => { setMode("register"); setError(""); setMessage(""); }}><UserPlus size={15}/> Criar conta</button><button className={mode==="login"?"active":""} onClick={() => { setMode("login"); setError(""); setMessage(""); }}><LogIn size={15}/> Entrar</button></div>
        <h2>{mode==="register"?"Criar conta de participante":"Acessar minha conta"}</h2><p>Conta individual, independente de empresa ou situação de emprego.</p>
        <form onSubmit={submitAuth} className="event-participant-form">
          {mode==="register" && <><label>Nome completo</label><input required value={form.full_name} onChange={e=>change("full_name",e.target.value)} autoComplete="name" placeholder="Nome e sobrenome"/></>}
          <label>E-mail</label><input required type="email" value={form.email} onChange={e=>change("email",e.target.value)} autoComplete="email" placeholder="voce@email.com"/>
          <label>Senha</label><input required type="password" minLength={8} value={form.password} onChange={e=>change("password",e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Mínimo de 8 caracteres"/>
          <button className="event-participant-submit" disabled={busy}>{busy?"Processando…":mode==="register"?"Criar conta individual":"Entrar"}</button>
        </form>
      </section> : <section className="event-participant-account">
        <div className="event-participant-account-heading"><div><span>ÁREA DO PARTICIPANTE</span><h2>Olá, {session.user.user_metadata?.full_name || form.full_name || session.user.email}</h2><p>Cadastre seu interesse e acompanhe a situação de cada inscrição.</p></div><UserRound size={26}/></div>
        <form onSubmit={submitRegistration} className="event-participant-form event-participant-registration">
          <label>Nome completo</label><input required value={form.full_name} onChange={e=>change("full_name",e.target.value)} autoComplete="name" placeholder="Nome e sobrenome"/>
          <label>Evento ou atividade ENAT de interesse</label><input required value={form.event_name} onChange={e=>change("event_name",e.target.value)} placeholder="Nome do evento, palestra ou atividade"/>
          <div className="event-participant-fields"><div><label>Cidade/UF</label><input required value={form.city} onChange={e=>change("city",e.target.value)} placeholder="Ex.: Joinville/SC"/></div><div><label>Telefone (opcional)</label><input value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="(00) 00000-0000"/></div></div>
          <label>Situação atual</label><select value={form.employment_status} onChange={e=>change("employment_status",e.target.value)}><option value="unemployed">Desempregado(a)</option><option value="employed">Empregado(a)</option><option value="student">Estudante</option><option value="self_employed">Autônomo(a) / empreendedor(a)</option><option value="other">Outro</option></select>
          <label>O que espera aprender ou desenvolver? (opcional)</label><textarea value={form.goals} onChange={e=>change("goals",e.target.value)} rows={3} maxLength={1500} placeholder="Conte brevemente seus objetivos para a atividade."/>
          <button className="event-participant-submit" disabled={busy}>{busy?"Enviando…":"Enviar solicitação de participação"}</button>
        </form>
        <div className="event-participant-history"><div className="event-participant-section-heading"><div><span>MINHAS INSCRIÇÕES</span><h2>Inscrições e relatórios</h2></div><button onClick={()=>loadMine(session)}><RefreshCw size={14}/> Atualizar</button></div>
          {loading ? <p>Carregando inscrições…</p> : participants.length===0 ? <p className="event-participant-empty">Você ainda não possui inscrições registradas.</p> : participants.map(p=><article className="event-participant-record" key={p.id}><div><span>{statusLabel(p.status)}</span><h3>{p.event_name}</h3><p>{p.city} · Solicitação em {new Date(p.created_at).toLocaleDateString("pt-BR")}</p></div>{p.status==="attended" && p.report_issued_at ? <button className="event-participant-report-button" onClick={()=>window.print()}><Printer size={15}/> Imprimir relatório individual</button> : <small><Clock3 size={14}/> Relatório disponível após presença confirmada</small>}
            {p.status==="attended" && p.report_issued_at && <div className="event-report-print-target"><div className="event-report-print-brand"><ShieldCheck size={30}/><div><strong>ENAT · ENSINO NEUROEDUCACIONAL APLICADO AO TRÂNSITO</strong><span>RELATÓRIO INDIVIDUAL DE PARTICIPAÇÃO</span></div></div><h2>Relatório individual de participação em atividade</h2><p>Declaramos, para fins de registro curricular, que os dados abaixo correspondem à participação registrada no sistema Empresa Segura ENAT.</p><dl><div><dt>Participante</dt><dd>{p.full_name}</dd></div><div><dt>Evento / atividade</dt><dd>{p.event_name}</dd></div><div><dt>Cidade/UF</dt><dd>{p.city}</dd></div><div><dt>Data da confirmação de presença</dt><dd>{p.attendance_confirmed_at ? new Date(p.attendance_confirmed_at).toLocaleDateString("pt-BR") : "—"}</dd></div><div><dt>Situação informada</dt><dd>{employmentLabels[p.employment_status] || "Não informado"}</dd></div><div><dt>Código de verificação</dt><dd>{p.report_code || "—"}</dd></div></dl><p>Este documento registra a participação confirmada no evento indicado. Não substitui certificado de conclusão, habilitação profissional ou diploma, salvo emissão específica da organização.</p><div className="event-report-print-signature"><span>ENAT · Organização do evento</span><span>Emitido em {p.report_issued_at ? new Date(p.report_issued_at).toLocaleDateString("pt-BR") : "—"}</span></div></div>}
          </article>)}
        </div>
      </section>}
      {error && <div className="event-participant-message error"><AlertCircle size={16}/>{error}</div>}{message && <div className="event-participant-message success"><CheckCircle2 size={16}/>{message}</div>}
      <p className="event-participant-footnote">Seus dados são usados para administrar inscrições e registrar a participação. Informe apenas dados necessários. O relatório não é emitido antes da confirmação de presença.</p>
    </main>
  </div>;
}
