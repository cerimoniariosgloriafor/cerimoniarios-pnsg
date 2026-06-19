import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface ReportRow {
  userId: string;
  name: string;
  fullName: string;
  faltas: number;
  servicos: number;
  substituido: number;
  substituto: number;
  funcoesAssumidas: Record<string, number>;
}

interface MassReportPageProps {
  onBack?: () => void;
}

export default function MassReportPage({ onBack }: MassReportPageProps) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<ReportRow[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'servicos' | 'faltas' | 'substituido' | 'substituto'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Defaults to current month
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    setStartDate(`${y}-${m}-01`);

    // last day of current month
    const lastDay = new Date(y, today.getMonth() + 1, 0);
    const d = String(lastDay.getDate()).padStart(2, '0');
    setEndDate(`${y}-${m}-${d}`);
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/reports/masses', {
        params: { startDate, endDate }
      });
      if (res.data && Array.isArray(res.data.data)) {
        setData(res.data.data);
        setTotalEvents(res.data.totalEvents || 0);
      } else {
        // Fallback in case of old cache
        setData(Array.isArray(res.data) ? res.data : []);
        setTotalEvents(0);
      }
    } catch (err) {
      console.error('Failed to fetch report', err);
      alert('Erro ao carregar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  if (user?.role !== 'admin') {
    return <div className="page" style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>Acesso negado. Apenas administradores podem ver relatórios.</div>;
  }

  const handleSort = (field: 'name' | 'servicos' | 'faltas' | 'substituido' | 'substituto') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    const valA = a[sortField] as number;
    const valB = b[sortField] as number;
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <header style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Relatório Consolidado</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
              Acompanhe a assiduidade e o serviço dos cerimoniários.
            </p>
          </div>
        </header>

        <section style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Data Inicial</label>
              <input 
                type="date" 
                className="input" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Data Final</label>
              <input 
                type="date" 
                className="input" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button className="btn" onClick={fetchReport} disabled={loading} style={{ background: '#2563eb', padding: '12px 24px', height: '46px' }}>
                {loading ? 'Carregando...' : 'Filtrar Relatório'}
              </button>
            </div>
          </div>
        </section>

        {data.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#eff6ff', padding: 20, borderRadius: 16, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase' }}>Total de Serviços no Período</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e3a8a', marginTop: 4 }}>{totalEvents}</div>
            </div>
          </div>
        )}

        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th onClick={() => handleSort('name')} style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Servo {sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('servicos')} style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}>
                    Serviços {sortField === 'servicos' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('faltas')} style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}>
                    Faltas {sortField === 'faltas' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('substituido')} style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}>
                    Foi Substituído {sortField === 'substituido' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('substituto')} style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}>
                    Foi Substituto {sortField === 'substituto' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'left' }}>Funções Assumidas</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Carregando dados...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Nenhum dado encontrado para o período.</td></tr>
                ) : (
                  sortedData.map((row, idx) => (
                    <tr key={row.userId} style={{ borderBottom: idx === data.length - 1 ? 'none' : '1px solid #e2e8f0', background: '#fff', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#0f172a' }}>{row.name}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: row.servicos > 0 ? '#dcfce7' : '#f1f5f9', color: row.servicos > 0 ? '#166534' : '#64748b', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                          {row.servicos}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: row.faltas > 0 ? '#fee2e2' : '#f1f5f9', color: row.faltas > 0 ? '#991b1b' : '#64748b', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                          {row.faltas}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: row.substituido > 0 ? '#ffedd5' : '#f1f5f9', color: row.substituido > 0 ? '#c2410c' : '#64748b', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                          {row.substituido}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: row.substituto > 0 ? '#e0e7ff' : '#f1f5f9', color: row.substituto > 0 ? '#4338ca' : '#64748b', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                          {row.substituto}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {Object.entries(row.funcoesAssumidas || {}).length === 0 ? (
                             <span style={{ color: '#94a3b8', fontSize: 13 }}>Nenhuma</span>
                          ) : (
                             Object.entries(row.funcoesAssumidas || {}).map(([role, count]) => (
                               <span key={role} style={{ background: '#f3e8ff', color: '#5b21b6', padding: '2px 8px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                                 {role} ({count})
                               </span>
                             ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
