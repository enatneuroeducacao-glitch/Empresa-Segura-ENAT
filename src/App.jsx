import React from "react";
import { useState } from 'react';
import { PortalContent } from './PortalContent';
import { AdminContent } from './AdminContent';
import {
  ArrowRight, ShieldCheck, Brain, Users, ClipboardCheck, Building2,
  Menu, X, ChevronRight, CheckCircle2, LockKeyhole, HardHat, CarFront,
  BarChart3, HeartHandshake
} from 'lucide-react';

const pillars = [
  { icon: Brain, title: 'Comportamento humano', text: 'Desenvolvimento da percepção de risco, atenção, tomada de decisão e responsabilidade.' },
  { icon: ShieldCheck, title: 'Prevenção integrada', text: 'Ações educativas para fortalecer práticas seguras dentro e fora do ambiente de trabalho.' },
  { icon: Users, title: 'Cultura de segurança', text: 'Envolvimento de lideranças e equipes para transformar prevenção em rotina.' },
  { icon: BarChart3, title: 'Acompanhamento', text: 'Organização de ações, indicadores e evolução das iniciativas de segurança.' }
];

const steps = [
  ['01', 'Conheça o programa', 'Entenda a proposta e os eixos de atuação da Empresa Segura ENAT.'],
  ['02', 'Organize sua participação', 'Identifique a empresa, as equipes envolvidas e as necessidades de prevenção.'],
  ['03', 'Desenvolva as ações', 'Estruture atividades educativas e acompanhe a evolução da cultura de segurança.']
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessType, setAccessType] = useState(null);
  const [portalType, setPortalType] = useState(() => {
    const initial = window.location.hash.replace("#portal-", "");
    return ["empresa", "funcionario", "admin"].includes(initial) ? initial : null;
  });
  const openPortal = (type) => { setAccessType(null); setPortalType(type); window.location.hash = `portal-${type}`; };
  const closePortal = () => { setPortalType(null); window.location.hash = 'inicio'; };

  const closeMenu = () => setMenuOpen(false);
  const goTo = (id) => {
    closeMenu();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (portalType === 'admin') return <AdminContent onBack={closePortal} />;
  if (portalType) return <PortalContent pageType={portalType} onBack={closePortal} />;

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#inicio" onClick={closeMenu} aria-label="Empresa Segura ENAT - início">
          <span className="brand-mark"><ShieldCheck size={25} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>EMPRESA SEGURA</strong><small>ENAT · Neuroeducação aplicada</small></span>
        </a>
        <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'}>
          <a href="#programa" onClick={closeMenu}>O programa</a>
          <a href="#eixos" onClick={closeMenu}>Eixos de atuação</a>
          <a href="#etapas" onClick={closeMenu}>Como participar</a>
          <button className="nav-login" onClick={() => { setAccessType('empresa'); closeMenu(); }}>Área da empresa <ArrowRight size={16} /></button>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-pattern" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> SEGURANÇA É UMA CULTURA</div>
            <h1>Empresas mais seguras começam com <em>pessoas mais conscientes.</em></h1>
            <p className="hero-lead">Educação, comportamento humano e prevenção unidos para desenvolver uma cultura de segurança no trabalho, na mobilidade e na vida.</p>
            <div className="hero-actions">
              <button className="button-primary" onClick={() => goTo('programa')}>Conheça o programa <ArrowRight size={18} /></button>
              <button className="button-ghost" onClick={() => setAccessType('empresa')}>Acessar área da empresa</button>
            </div>
            <div className="hero-note"><ShieldCheck size={17} /> Uma iniciativa ENAT — Ensino Neuroeducacional Aplicado ao Trânsito</div>
          </div>
          <div className="hero-visual" aria-label="Conceito visual de proteção e segurança">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-card visual-card-main">
              <div className="visual-icon"><ShieldCheck size={39} /></div>
              <span className="visual-kicker">NOSSO COMPROMISSO</span>
              <strong>Prevenir.<br />Conscientizar.<br />Transformar.</strong>
              <div className="visual-card-line" />
              <span className="visual-foot">Segurança construída por pessoas</span>
            </div>
            <div className="floating-tag tag-top"><Brain size={17} /><span>Comportamento humano</span></div>
            <div className="floating-tag tag-bottom"><HeartHandshake size={17} /><span>Cuidado coletivo</span></div>
            <div className="visual-dot dot-one" /><div className="visual-dot dot-two" /><div className="visual-dot dot-three" />
          </div>
        </section>

        <section className="trust-strip" aria-label="Princípios do programa">
          <div><ShieldCheck /><span>Prevenção contínua</span></div>
          <div><Brain /><span>Neuroeducação aplicada</span></div>
          <div><Users /><span>Responsabilidade compartilhada</span></div>
          <div><ClipboardCheck /><span>Ações estruturadas</span></div>
        </section>

        <section className="section intro-section" id="programa">
          <div className="section-heading">
            <span className="section-label">SOBRE O PROGRAMA</span>
            <h2>Segurança não é apenas uma regra.<br /><em>É uma decisão diária.</em></h2>
          </div>
          <div className="intro-copy">
            <p>A Empresa Segura ENAT propõe uma abordagem educativa para apoiar organizações no desenvolvimento de atitudes, conhecimentos e práticas que favoreçam ambientes mais seguros.</p>
            <p>O foco está nas pessoas: como percebem riscos, tomam decisões, interagem com os outros e transformam conhecimento em comportamento preventivo.</p>
            <button className="text-link" onClick={() => goTo('eixos')}>Conheça os eixos de atuação <ChevronRight size={18} /></button>
          </div>
        </section>

        <section className="section pillars-section" id="eixos">
          <div className="section-heading centered">
            <span className="section-label">NOSSA ABORDAGEM</span>
            <h2>Quatro eixos para fortalecer<br /><em>a cultura de segurança.</em></h2>
            <p>Uma visão integrada que conecta conhecimento, comportamento e prevenção.</p>
          </div>
          <div className="pillar-grid">
            {pillars.map(({ icon: Icon, title, text }, index) => (
              <article className="pillar-card" key={title}>
                <div className="pillar-top"><span className="pillar-number">0{index + 1}</span><span className="pillar-icon"><Icon size={23} /></span></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="pillar-bottom-line" />
              </article>
            ))}
          </div>
        </section>

        <section className="section process-section" id="etapas">
          <div className="process-copy">
            <span className="section-label">COMECE AQUI</span>
            <h2>Um caminho claro para<br /><em>evoluir com segurança.</em></h2>
            <p>A participação começa com o conhecimento do programa e a organização dos próximos passos de acordo com a realidade de cada empresa.</p>
            <button className="button-primary" onClick={() => setAccessType('empresa')}>Área da empresa <ArrowRight size={18} /></button>
          </div>
          <div className="steps-list">
            {steps.map(([number, title, text]) => (
              <div className="step-item" key={number}>
                <span className="step-number">{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
                <ChevronRight className="step-chevron" size={20} />
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-symbol"><Building2 size={29} /></div>
          <div className="cta-copy"><span className="section-label">EMPRESA SEGURA ENAT</span><h2>O próximo passo é construir<br />uma cultura de prevenção.</h2><p>Conheça o programa e prepare sua organização para avançar.</p></div>
          <button className="button-light" onClick={() => setAccessType('empresa')}>Acessar área da empresa <ArrowRight size={18} /></button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#inicio">
          <span className="brand-mark"><ShieldCheck size={22} /></span>
          <span className="brand-copy"><strong>EMPRESA SEGURA</strong><small>Uma iniciativa ENAT</small></span>
        </a>
        <p>Educação e prevenção para uma cultura de segurança.</p>
        <span className="footer-copyright">© {new Date().getFullYear()} ENAT · Todos os direitos reservados</span>
        <a className="footer-admin-link" href="#portal-admin" onClick={() => openPortal("admin")}>Central administrativa</a>
      </footer>

      {accessType && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccessType(null); }}>
          <section className="access-modal" role="dialog" aria-modal="true" aria-labelledby="access-title">
            <button className="modal-close" onClick={() => setAccessType(null)} aria-label="Fechar"><X size={20} /></button>
            <div className="modal-brand-mark"><LockKeyhole size={25} /></div>
            <span className="section-label">ACESSO INSTITUCIONAL</span>
            <h2 id="access-title">Acesso à Empresa Segura</h2>
            <p className="modal-description">O acesso funciona por contas individuais. A empresa solicita sua habilitação e cadastra seus funcionários; cada funcionário só poderá entrar depois de ser cadastrado e autorizado pela empresa.</p>
            <div className="access-status"><span className="status-dot" /><div><strong>Controle de acesso por perfil</strong><small>Os conteúdos institucionais são gerenciados exclusivamente pela administração ENAT.</small></div></div>
            <div className="portal-choice-actions">
              <button className="button-primary modal-button" onClick={() => openPortal('empresa')}><Building2 size={17}/> Acesso da empresa / solicitar cadastro <ArrowRight size={18} /></button>
              <button className="button-ghost modal-button" onClick={() => openPortal('funcionario')}><Users size={17}/> Acesso do funcionário <ArrowRight size={18} /></button>
            </div>
            <p className="modal-footnote"><ShieldCheck size={14} /> Não existem contas ou senhas demonstrativas. O login real será habilitado com autenticação segura, aprovação da empresa e permissões administradas pela ENAT.</p>
          </section>
        </div>
      )}
    </div>
  );
}