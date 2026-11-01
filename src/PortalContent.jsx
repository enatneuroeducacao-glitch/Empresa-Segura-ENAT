import { useEffect, useState } from "react";
import { ArrowLeft, Building2, UserRound, ShieldCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client = url && key ? createClient(url, key) : null;
const defaults = {
  empresa: {
    title: "Portal da Empresa",
    subtitle: "Área de referência para organização, equipe e ações preventivas.",
    heroTitle: "Organize a segurança da sua empresa",
    heroText: "Acompanhe a participação da organização, planeje ações preventivas e fortaleça uma cultura de segurança.",
    sections: [
      { title: "Visão geral", body: "<p>Acompanhe o status da organização, as etapas de participação e os próximos passos.</p>" },
      { title: "Equipe", body: "<p>Organize responsáveis, setores e participantes autorizados da empresa.</p>" },
      { title: "Ações preventivas", body: "<p>Planeje atividades educativas, campanhas e iniciativas de prevenção.</p>" },
      { title: "Indicadores", body: "<p>Acompanhe a evolução das ações e os indicadores autorizados para sua organização.</p>" },
      { title: "Documentos", body: "<p>Consulte materiais e documentos disponibilizados para a organização.</p>" }
    ]
  },
  funcionario: {
    title: "Portal do Funcionário",
    subtitle: "Espaço individual para aprendizagem, participação e acompanhamento de ações preventivas.",
    heroTitle: "Sua participação fortalece a segurança",
    heroText: "Acesse orientações, atividades educativas e informações relacionadas à sua participação no programa Empresa Segura ENAT.",
    sections: [
      { title: "Meu painel", body: "<p>Consulte suas atividades e os próximos passos da sua participação.</p>" },
      { title: "Aprendizagem", body: "<p>Acesse conteúdos educativos e orientações de prevenção disponibilizados pela organização.</p>" },
      { title: "Atividades", body: "<p>Consulte atividades, campanhas e ações preventivas em andamento.</p>" },
      { title: "Meu progresso", body: "<p>Acompanhe a conclusão das atividades e os registros que estiverem disponíveis para você.</p>" },
      { title: "Documentos", body: "<p>Consulte materiais de apoio e documentos disponibilizados para funcionários.</p>" }
    ]
  }
};

export function PortalContent({ pageType, onBack }) {
  const [page, setPage] = useState(defaults[pageType]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!client) { setLoading(false); return; }
      const { data, error } = await client.from("empresa_segura_pages").select("content").eq("page_type", pageType).eq("published", true).maybeSingle();
      if (active && !error && data?.content) setPage({ ...defaults[pageType], ...data.content });
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [pageType]);
  return <div className="portal-content-shell">
    <header className="portal-content-header">
      <a className="portal-content-brand" href="#inicio" onClick={(e) => { e.preventDefault(); onBack(); }}><span><ShieldCheck size={22}/></span><strong>EMPRESA SEGURA <small>ENAT · Neuroeducação aplicada</small></strong></a>
      <button onClick={onBack}><ArrowLeft size={16}/> Voltar ao portal público</button>
    </header>
    <main className="portal-content-main">
      <div className="portal-content-kicker">{pageType === "empresa" ? <Building2 size={16}/> : <UserRound size={16}/>} {pageType === "empresa" ? "ÁREA DE REFERÊNCIA DA ORGANIZAÇÃO" : "ÁREA DE REFERÊNCIA DO FUNCIONÁRIO"}</div>
      <section className="portal-content-hero"><span>{pageType === "empresa" ? "PORTAL DA EMPRESA" : "PORTAL DO FUNCIONÁRIO"}</span><h1>{page.heroTitle}</h1><p>{page.heroText}</p><small>{page.subtitle}</small></section>
      <div className="portal-content-grid">{(page.sections || []).map((section, i) => <article key={section.title || i} className="portal-content-card"><span>SEÇÃO {String(i + 1).padStart(2, "0")}</span><h2>{section.title}</h2><div dangerouslySetInnerHTML={{ __html: section.body || "" }}/></article>)}</div>
      {loading && <p className="portal-content-loading">Verificando conteúdo publicado…</p>}
      <p className="portal-content-note">Esta é uma área de referência de conteúdo. Dados individuais, registros internos e informações da organização exigem autenticação e permissões específicas.</p>
    </main>
  </div>;
}
