import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface ReportsPageProps {
  onOpenConsolidated?: () => void;
  onOpenIndividual?: () => void;
}

export default function ReportsPage({ onOpenConsolidated, onOpenIndividual }: ReportsPageProps) {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <div className="page" style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>Acesso negado. Apenas administradores podem ver relatórios.</div>;
  }

  const consolidatedAction = onOpenConsolidated || (() => window.location.assign('/reports/masses'));
  const individualAction = onOpenIndividual || (() => window.location.assign('/reports/individual'));

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 24,
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 220
  };

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Relatórios</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
            Escolha o tipo de relatório que deseja consultar.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <article style={cardStyle}>
            <div>
              <h3 style={{ margin: '14px 0 8px 0', fontSize: 20, color: '#0f172a' }}>Relatório Consolidado</h3>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                Visão geral com total de serviços, faltas, substituições e funções assumidas por cerimoniário.
              </p>
            </div>
            <button className="btn" onClick={consolidatedAction} style={{ background: '#2563eb', borderColor: '#2563eb', alignSelf: 'flex-start' }}>
              Abrir consolidado
            </button>
          </article>

          <article style={{ ...cardStyle, borderStyle: 'dashed', background: '#fffbeb' }}>
            <div>
              <h3 style={{ margin: '14px 0 8px 0', fontSize: 20, color: '#0f172a' }}>Relatório Individual por Missa</h3>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                Tela para pesquisar uma missa/serviço específico e ver o detalhamento completo da ocorrência.
              </p>
            </div>
            <button className="btn secondary" onClick={individualAction} style={{ alignSelf: 'flex-start' }}>
              Abrir relatório
            </button>
          </article>
        </section>
      </div>
    </div>
  );
}
