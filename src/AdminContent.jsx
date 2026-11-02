import { useState } from "react";
import { ArrowLeft, ShieldCheck, LockKeyhole, Building2, Users, FileText, BookOpenCheck, Settings, Activity, Eye, KeyRound, CircleHelp } from "lucide-react";

export function AdminContent({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [attempted, setAttempted] = useState(false);
  function handleSubmit(event) { event.preventDefault(); setAttempted(true); }

  return <div className="admin-shell">
    <header className="admin-header">
      <a className="admin-brand" href="#inicio" onClick={e => { e.preventDefault(); onBack(); }}>
        <span className="admin-brand-mark"><ShieldCheck size={25}/></span>
        <span><strong>EMPRESA SEGURA <em>ENAT</em></strong><small>CENTRAL DE ADMINISTRAÇÃO</small></span>
      </a>
      <button className="admin-back" onClick={onBack}><ArrowLeft size={16}/> Voltar ao portal público</button>
    </header>
    <main className="admin-layout">
      <section className="admin-intro">
        <span className="admin-eyebrow">GOVERNANÇA · PREVENÇÃO · GESTÃO</span>
        <h1>Uma central.<br/><em>Três experiências integradas.</em></h1>
        <p>Gerencie a experiência institucional da Empresa Segura ENAT, mantendo separados os ambientes da organização, dos funcionários e da administração do programa.</p>
        <div className="admin-feature-list">
          <div><Building2/><span><strong>Portal da Empresa</strong><small>Organizações, responsáveis e ações preventivas</small></span></div>
          <div><Users/><span><strong>Portal do Funcionário</strong><small>Conteúdo educativo e jornada individual</small></span></div>
          <div><Settings/><span><strong>Administração ENAT</strong><small>Conteúdo, acessos e publicação institucional</small></span></div>
        </div>
      </section>
      <section className="admin-login-card">
        <div className="admin-login-icon"><LockKeyhole size={24}/></div>
        <span className="admin-eyebrow">ACESSO RESTRITO</span>
        <h2>Entrar na administração</h2>
        <p>Use uma conta administrativa autorizada pela ENAT.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-email">E-mail institucional</label>
          <input id="admin-email" type="email" autoComplete="username" placeholder="nome@organizacao.com.br" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <label htmlFor="admin-password">Senha</label>
          <input id="admin-password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={e=>setPassword(e.target.value)} required/>
          <button className="admin-submit" type="submit"><KeyRound size={17}/> Validar acesso</button>
        </form>
        {attempted && <div className="admin-warning" role="status"><LockKeyhole size={17}/><span><strong>Autenticação ainda não conectada</strong><small>O serviço de identidade e a base de permissões precisam ser configurados antes de liberar sessões administrativas. Nenhuma senha foi enviada ou armazenada.</small></span></div>}
        <button className="admin-help-toggle" onClick={()=>setShowInfo(!showInfo)}><CircleHelp size={15}/> Por que o acesso ainda não foi liberado?</button>
        {showInfo && <div className="admin-help-copy">Esta implantação inicia a nova estrutura visual. Para autenticação real, é necessário conectar um provedor de identidade, criar os perfis de administrador, empresa e funcionário, configurar políticas de acesso no banco e validar os fluxos de recuperação de senha e sessão.</div>}
        <div className="admin-security-note"><ShieldCheck size={15}/><span>Segurança primeiro: o portal não aceita contas demonstrativas nem senhas fictícias.</span></div>
      </section>
    </main>
    <section className="admin-system-overview">
      <div className="admin-overview-heading"><div><span className="admin-eyebrow">ARQUITETURA DO PORTAL</span><h2>Áreas previstas para gestão</h2></div><span className="admin-status"><Activity size={14}/> Estrutura visual inicial</span></div>
      <div className="admin-area-grid">
        <article><span className="admin-area-icon"><Building2/></span><h3>Empresas</h3><p>Solicitações, cadastro institucional, responsáveis e situação de participação.</p><small>Requer banco e regras de acesso</small></article>
        <article><span className="admin-area-icon"><Users/></span><h3>Funcionários</h3><p>Vínculo à organização, autorização individual e conteúdos disponíveis.</p><small>Requer autenticação e vínculo</small></article>
        <article><span className="admin-area-icon"><BookOpenCheck/></span><h3>Conteúdo dos portais</h3><p>Textos, seções, materiais educativos, revisão e publicação.</p><small>Requer persistência de conteúdo</small></article>
        <article><span className="admin-area-icon"><FileText/></span><h3>Auditoria e publicação</h3><p>Histórico de alterações, responsáveis, aprovação e estado de publicação.</p><small>Requer trilha de auditoria</small></article>
      </div>
    </section>
    <footer className="admin-footer"><span>ENAT · EMPRESA SEGURA</span><span>Ambientes separados por perfil e finalidade</span><button onClick={onBack}><Eye size={14}/> Ver portal público</button></footer>
  </div>;
}
