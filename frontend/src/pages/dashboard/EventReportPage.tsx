import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface EventReportPageProps {
  id: string;
  onBack: () => void;
}

export default function EventReportPage({ id, onBack }: EventReportPageProps) {
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const [checklist, setChecklist] = useState<any[]>([]);
  const [acolyteCount, setAcolyteCount] = useState<number>(0);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({
    'M.C.': true,
    'C.A.': true,
    'C.L.': true
  });

  const toggleRole = (role: string) => {
    setExpandedRoles(prev => ({ ...prev, [role]: !prev[role] }));
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      
      const [eventRes, functionsRes] = await Promise.all([
        axios.get(`/agenda-events/${id}`),
        axios.get('/role-functions')
      ]);
      
      const data = eventRes.data;
      setEvent(data);
      
      const defaultChecklist = functionsRes.data || [];
      
      const existingChecklist = data.checklist || [];
      const mergedChecklist = defaultChecklist.map((defaultItem: any) => {
        const found = existingChecklist.find((i: any) => i.role === defaultItem.role && i.task === defaultItem.task);
        if (found) return found;
        return { ...defaultItem, status: 'N/A' };
      });
      setChecklist(mergedChecklist);
      setAcolyteCount(data.acolyteCount || 0);
      
      const existingOccs = data.occurrences || [];
      const mergedOccs = (data.users || []).map((u: any) => {
        const found = existingOccs.find((o: any) => String(o.userId?._id || o.userId) === String(u.userId?._id || u.userId));
        return found || { userId: u.userId, note: '' };
      });
      setOccurrences(mergedOccs);

    } catch (err) {
      console.error('failed to fetch event for report', err);
      alert('Erro ao carregar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        checklist,
        acolyteCount,
        occurrences: occurrences.filter(o => o.note.trim() !== '')
      };
      
      await axios.post(`/agenda-events/${id}`, payload);
      alert('Relatório salvo com sucesso!');
      onBack();
    } catch (err) {
      console.error('failed to save report', err);
      alert('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
  };

  const updateChecklistItem = (idx: number, status: string) => {
    const newChecklist = [...checklist];
    newChecklist[idx] = {
      ...newChecklist[idx],
      status,
      updatedBy: user?._id,
      updatedAt: new Date()
    };
    setChecklist(newChecklist);
  };

  const updateOccurrence = (userId: string, note: string) => {
    const newOccs = occurrences.map(o => {
      if (String(o.userId?._id || o.userId) === String(userId)) {
        return { ...o, note };
      }
      return o;
    });
    setOccurrences(newOccs);
  };

  if (loading) {
    return <div className="page" style={{ padding: 24, textAlign: 'center' }}>Carregando...</div>;
  }

  if (!event) {
    return <div className="page" style={{ padding: 24, textAlign: 'center' }}>Evento não encontrado</div>;
  }

  const groupedChecklist = checklist.reduce((acc, item, idx) => {
    if (!acc[item.role]) acc[item.role] = [];
    acc[item.role].push({ ...item, idx });
    return acc;
  }, {} as any);

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 18, color: '#0f172a' }}>Relatório da Missa</h2>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{event.title || 'Evento sem título'}</div>
        <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{event.locationId?.name}</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>{new Date(event.date).toLocaleDateString()} às {event.time?.start}</div>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e293b' }}>Quantidade de Acólitos</h3>
        <input 
          type="number" 
          className="input" 
          value={acolyteCount} 
          onChange={e => setAcolyteCount(parseInt(e.target.value) || 0)} 
          min="0"
          style={{ width: '100px' }}
        />
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e293b' }}>Check-list das Funções</h3>
        
        {['M.C.', 'C.A.', 'C.L.'].map(role => {
          if (!groupedChecklist[role]) return null;
          const isExpanded = expandedRoles[role];
          return (
            <div key={role} style={{ marginBottom: 24, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div 
                style={{ 
                  fontWeight: 700, fontSize: 15, color: '#334155', padding: '12px 16px', background: '#f8fafc', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                }}
                onClick={() => toggleRole(role)}
              >
                <span>{role}</span>
                <span style={{ fontSize: 18, color: '#64748b' }}>
                  {isExpanded ? '⌃' : '⌄'}
                </span>
              </div>
              
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
                  {groupedChecklist[role].map((item: any) => (
                    <div key={item.idx} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 14, color: '#1e293b', marginBottom: 8 }}>{item.task}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <input type="radio" name={`checklist-${item.idx}`} checked={item.status === 'Sim'} onChange={() => updateChecklistItem(item.idx, 'Sim')} /> Sim
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <input type="radio" name={`checklist-${item.idx}`} checked={item.status === 'Nao'} onChange={() => updateChecklistItem(item.idx, 'Nao')} /> Não
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <input type="radio" name={`checklist-${item.idx}`} checked={item.status === 'N/A'} onChange={() => updateChecklistItem(item.idx, 'N/A')} /> N/A
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e293b' }}>Intercorrências (por servo)</h3>
        {event.users && event.users.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {event.users.map((u: any) => {
              const occ = occurrences.find(o => String(o.userId?._id || o.userId) === String(u.userId?._id || u.userId));
              return (
                <div key={u.userId?._id || u.userId} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 8 }}>
                    {u.userId?.name || 'Usuário Desconhecido'} {(u.roles && u.roles.length > 0) ? `(${u.roles.join(', ')})` : ''}
                  </div>
                  <textarea
                    className="input"
                    style={{ minWidth: '100%', maxWidth: '100%', resize: 'vertical' }}
                    rows={3}
                    placeholder="Descreva se houve alguma intercorrência ou observação para este servo..."
                    value={occ?.note || ''}
                    onChange={e => updateOccurrence(u.userId?._id || u.userId, e.target.value)}
                  />                
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 14 }}>Nenhum servo escalado.</div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Relatório'}
        </button>
      </div>
    </div>
  );
}
