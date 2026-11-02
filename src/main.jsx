import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class PortalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }
  componentDidCatch(error) {
    console.error('Empresa Segura ENAT render error:', error);
  }
  render() {
    if (this.state.failed) {
      return React.createElement('main', {
        style: { fontFamily: 'Arial, sans-serif', maxWidth: '760px', margin: '10vh auto', padding: '32px', color: '#18352e', lineHeight: 1.6 }
      },
        React.createElement('h1', null, 'Empresa Segura ENAT'),
        React.createElement('p', null, 'O portal encontrou um erro ao carregar a página. Consulte os detalhes técnicos abaixo para identificar a falha.'),
        React.createElement('details', { style: { margin: '18px 0', fontSize: '13px', color: '#7a2f2f', overflowWrap: 'anywhere' } },
          React.createElement('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Detalhes técnicos'),
          React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace', fontSize: '12px', marginTop: '10px' } }, this.state.error?.message || 'Erro sem mensagem disponível')
        ),
        React.createElement('button', {
          onClick: () => window.location.reload(),
          style: { padding: '12px 18px', background: '#174c3d', color: '#fff', border: 0, borderRadius: '8px', cursor: 'pointer' }
        }, 'Recarregar portal')
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    React.createElement(PortalErrorBoundary, null,
      React.createElement(App)
    )
  );
} else {
  document.body.innerHTML = '<main style="font-family:Arial,sans-serif;padding:32px"><h1>Empresa Segura ENAT</h1><p>Não foi possível localizar a área de carregamento do portal.</p></main>';
}
