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
  
  const [acolyteCount, setAcolyteCount] = useState<number>(0);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [eventUsers, setEventUsers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [userToAdd, setUserToAdd] = useState('');

  const [expandedServos, setExpandedServos] = useState<boolean>(false);
  const [expandedOccurrences, setExpandedOccurrences] = useState<Record<string, boolean>>({});
  const [isReadOnly, setIsReadOnly] = useState(true);

  const toggleOccurrence = (userId: string) => {
    setExpandedOccurrences(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      
      const [eventRes, functionsRes, usersRes] = await Promise.all([
        axios.get(`/agenda-events/${id}`),
        axios.get('/role-functions'),
        axios.get('/users')
      ]);
      
      const data = eventRes.data;
      setEvent(data);

      const datePart = data.date.split('T')[0];
      const eventDate = new Date(datePart + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const msInDay = 1000 * 60 * 60 * 24;
      const diffInMs = today.getTime() - eventDate.getTime();
      const diffInDays = Math.floor(diffInMs / msInDay);
      setIsReadOnly(diffInDays >= 2);
      
      const reportEventDate = new Date(data.date);
      const activeUsers = (usersRes.data || []).filter((u: any) => {
        if (u.archived) return false;
        if (u.suspendedUntil && new Date(u.suspendedUntil) >= reportEventDate) return false;
        return true;
      });
      setAvailableUsers(activeUsers);
      setEventUsers(data.users || []);

      const defaultChecklist = functionsRes.data || [];
      const roles = Array.from(new Set(defaultChecklist.map((i: any) => i.role))) as string[];
      const roleOrder = ['M.C.', 'C.A.', 'C.L.', 'C.D.'];
      roles.sort((a, b) => {
        const aIdx = roleOrder.indexOf(a);
        const bIdx = roleOrder.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
      setAvailableRoles(roles);
      
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

  const handleSave = async (skipBack?: boolean | React.MouseEvent) => {
    if (isReadOnly) {
      alert('Este relatório não pode mais ser editado.');
      return;
    }
    const shouldSkipBack = skipBack === true;
    try {
      setSaving(true);
      const payload = {
        acolyteCount,
        occurrences: occurrences.filter(o => o.note.trim() !== ''),
        users: eventUsers.map((eu: any) => ({
          userId: eu.userId?._id || eu.userId,
          roles: eu.roles || [],
          checkedInAt: eu.checkedInAt
        }))
      };
      
      await axios.post(`/agenda-events/${id}`, payload);
      if (!shouldSkipBack) {
        alert('Relatório salvo com sucesso!');
        onBack();
      }
    } catch (err) {
      console.error('failed to save report', err);
      alert('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
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

  const exportToWhatsApp = () => {
    const evDate = new Date(event.date);
    const dateFormatted = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(evDate);
    
    const dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
    const capitalizedWeekday = dayFormatter.format(evDate).replace(/^\w/, c => c.toUpperCase());
    
    let text = `${dateFormatted}\n`;
    text += `${capitalizedWeekday}\n`;
    text += `${event.time?.start || ''}\n`;
    text += `${event.locationId?.name || ''}\n`;
    text += `${event.title || 'Missa'}\n`;
    text += `${event.priestName || ''}\n\n`;
    
    const servosWithRoles = eventUsers.filter((u: any) => u.roles && u.roles.length > 0)
      .sort((a: any, b: any) => {
        const getHighestRank = (roles: string[]) => {
          if (!roles || roles.length === 0) return 999;
          return Math.min(...roles.map(r => {
            const idx = availableRoles.indexOf(r);
            return idx === -1 ? 999 : idx;
          }));
        };
        const rankA = getHighestRank(a.roles);
        const rankB = getHighestRank(b.roles);
        if (rankA !== rankB) return rankA - rankB;
        return (a.userId?.name || '').localeCompare(b.userId?.name || '');
      });

    servosWithRoles.forEach(u => {
      if (u.roles && u.roles.length > 0) {
        const sortedRoles = [...u.roles].sort((a, b) => {
          const aIdx = availableRoles.indexOf(a);
          const bIdx = availableRoles.indexOf(b);
          return aIdx - bIdx;
        });
        text += `${sortedRoles[0]}: ${u.userId?.name || 'Desconhecido'}\n`;
      }
    });

    text += `Coroinhas: ${acolyteCount}\n\n`;

    const occsWithNotes = occurrences.filter(o => o.note && o.note.trim() !== '');
    if (occsWithNotes.length > 0) {
      occsWithNotes.forEach(o => {
        const formattedNote = o.note
          .split('\n')
          .filter((line: string) => line.trim() !== '')
          .map((line: string) => `  ${line.trim()}`)
          .join('\n');

        text += `${formattedNote}\n`;
      });
      text += `\n`; 
    }

    text += `Nossa Senhora da Glória, Rogai por nós!`;

    const encoded = encodeURIComponent(text);
    window.open(`whatsapp://send?text=${encoded}`, '_blank');
    
    handleSave(true);
  };

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 18, color: '#0f172a' }}>Relatório da Missa</h2>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{event.title || 'Evento sem título'}</div>
        <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{event.locationId?.name}</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>{new Date(event.date).toLocaleDateString()} às {event.time?.start}</div>
        {isReadOnly && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, color: '#b45309', fontSize: 14, fontWeight: 500 }}>
            Este relatório está em modo de visualização e não pode mais ser editado.
          </div>
        )}
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e293b' }}>Quantidade de Coroinhas</h3>
        <input 
          type="number" 
          className="input" 
          value={acolyteCount} 
          onChange={e => setAcolyteCount(parseInt(e.target.value) || 0)} 
          min="0"
          style={{ width: '100px' }}
          readOnly={isReadOnly}
        />
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <div 
          style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expandedServos ? 16 : 0
          }}
          onClick={() => setExpandedServos(!expandedServos)}
        >
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Servos e Funções Exercidas</h3>
          <span style={{ fontSize: 18, color: '#64748b' }}>
            {expandedServos ? '⌃' : '⌄'}
          </span>
        </div>

        {expandedServos && (
          <>
            <div style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              Ajuste as funções caso alguém tenha faltado ou assumido outra posição durante a missa.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {eventUsers.map((eu: any, idx: number) => {
                const u = eu.userId;
                const hasNoRoles = !eu.roles || eu.roles.length === 0;
                return (
                  <div key={u?._id || idx} style={{ background: hasNoRoles ? '#f1f5f9' : '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', opacity: hasNoRoles ? 0.7 : 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{u?.name || 'Usuário Desconhecido'}</span>
                        {eu.checkedInAt && <span style={{ color: '#10b981', fontSize: 12, background: '#d1fae5', padding: '2px 6px', borderRadius: 4 }}>✓</span>}
                        {hasNoRoles && <span style={{ color: '#ef4444', fontSize: 12, background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>Faltou</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {hasNoRoles && (
                          <button 
                             className="btn" 
                             style={{ background: 'transparent', color: '#ef4444', padding: '4px', fontSize: 16, border: 'none', boxShadow: 'none' }}
                             onClick={() => {
                               if (window.confirm('Remover este usuário da lista do evento?')) {
                                 setEventUsers(eventUsers.filter((_, i) => i !== idx));
                               }
                             }}
                             title="Remover usuário da lista"
                             disabled={isReadOnly}
                          >
                             🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px' }}>
                      {availableRoles.map(role => {
                        const hasRole = eu.roles?.includes(role);
                        return (
                          <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>
                            <input 
                              type="checkbox" 
                              checked={hasRole}
                              style={{ width: 16, height: 16 }}
                              onChange={(e) => {
                                const newUsers = [...eventUsers];
                                if (!newUsers[idx].roles) newUsers[idx].roles = [];
                                if (e.target.checked) {
                              newUsers[idx].roles.push(role);
                            } else {
                              newUsers[idx].roles = newUsers[idx].roles.filter((r: string) => r !== role);
                            }
                            setEventUsers(newUsers);
                          }}
                          disabled={isReadOnly}
                        />
                        {role}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <select className="input" style={{ flex: 1 }} value={userToAdd} onChange={e => setUserToAdd(e.target.value)} disabled={isReadOnly}>
            <option value="">Adicionar substituto</option>
            {availableUsers.filter(u => !eventUsers.find(eu => eu.userId?._id === u._id)).map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
          <button className="btn" onClick={() => {
            if (!userToAdd) return;
            const u = availableUsers.find(x => x._id === userToAdd);
            if (u) {
              setEventUsers([...eventUsers, { userId: u, roles: [] }]);
              setOccurrences([...occurrences, { userId: u, note: '' }]);
              setUserToAdd('');
            }
          }} disabled={isReadOnly}>Adicionar</button>
        </div>
          </>
        )}
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#1e293b' }}>Intercorrências (por servo)</h3>
        {eventUsers && eventUsers.filter((u: any) => u.roles && u.roles.length > 0).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {eventUsers.filter((u: any) => u.roles && u.roles.length > 0)
              .sort((a: any, b: any) => {
                const getHighestRank = (roles: string[]) => {
                  if (!roles || roles.length === 0) return 999;
                  const ranks = roles.map(r => {
                    const idx = availableRoles.indexOf(r);
                    return idx === -1 ? 999 : idx;
                  });
                  return Math.min(...ranks);
                };
                const rankA = getHighestRank(a.roles);
                const rankB = getHighestRank(b.roles);
                if (rankA !== rankB) return rankA - rankB;
                return (a.userId?.name || '').localeCompare(b.userId?.name || '');
              })
              .map((u: any) => {
              const occ = occurrences.find(o => String(o.userId?._id || o.userId) === String(u.userId?._id || u.userId));
              const uid = u.userId?._id || u.userId;
              const isExpanded = expandedOccurrences[uid];
              
              let sortedRoles = [];
              if (u.roles && u.roles.length > 0) {
                sortedRoles = [...u.roles].sort((a, b) => {
                  const aIdx = availableRoles.indexOf(a);
                  const bIdx = availableRoles.indexOf(b);
                  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                  if (aIdx === -1) return 1;
                  if (bIdx === -1) return -1;
                  return aIdx - bIdx;
                });
              }

              return (
                <div key={uid} style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      fontWeight: 600, fontSize: 14, color: '#334155', padding: '12px 16px', 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                    }}
                    onClick={() => toggleOccurrence(uid)}
                  >
                    <span>{u.userId?.name || 'Usuário Desconhecido'} {sortedRoles.length > 0 ? `(${sortedRoles.join(', ')})` : ''}</span>
                    <span style={{ fontSize: 18, color: '#64748b' }}>
                      {isExpanded ? '⌃' : '⌄'}
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: 16 }}>
                      <textarea
                        className="input"
                        style={{ minWidth: '100%', maxWidth: '100%', resize: 'vertical' }}
                        rows={3}
                        placeholder="Descreva se houve alguma intercorrência ou observação para sua função..."
                        value={occ?.note || ''}
                        onChange={e => updateOccurrence(uid, e.target.value)}
                        disabled={isReadOnly || user?._id !== uid}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 14 }}>Nenhum servo registrado neste evento.</div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 16, display: 'flex', gap: 12, justifyContent: 'flex-end', background: 'transparent' }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: 16, background: '#10b981' }} onClick={exportToWhatsApp}>
          WhatsApp
        </button>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: 16 }} onClick={handleSave} disabled={saving || isReadOnly}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
