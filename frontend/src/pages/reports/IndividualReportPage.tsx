import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatDateTime(date: Date | string, withTime = false) {
  const d = new Date(date);
  const datePart = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
  if (!withTime) return capitalize(datePart);
  return `${capitalize(datePart)} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatTime(value?: Date | string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function roleRank(role: string) {
  const order = ['M.C.', 'C.A.', 'C.L.'];
  const idx = order.indexOf(role);
  return idx === -1 ? 999 : idx;
}

function sortRolesList(roles: string[] = []) {
  return [...roles].sort((a, b) => roleRank(a) - roleRank(b) || a.localeCompare(b));
}

function sortByRoles(a: any, b: any) {
  const rolesA = a.roles || [];
  const rolesB = b.roles || [];
  const rankA = rolesA.length ? Math.min(...rolesA.map(roleRank)) : 999;
  const rankB = rolesB.length ? Math.min(...rolesB.map(roleRank)) : 999;
  if (rankA !== rankB) return rankA - rankB;
  const nameA = a.userId?.name || '';
  const nameB = b.userId?.name || '';
  return nameA.localeCompare(nameB);
}

function buildWhatsAppText(event: any, substitutionRequests: any[]) {
  const currentUsers = [...(event.users || [])].sort(sortByRoles);
  const approvedRequests = (substitutionRequests || []).filter((req: any) => req.status === 'APPROVED');
  const substitutionBySubstitute = new Map<string, any>();
  const eventDateLabel = formatDateTime(event.date, false);
  const eventTimeLabel = event.time?.start || '—';

  approvedRequests.forEach((req: any) => {
    const substituteId = String(req.substituteUserId?._id || req.substituteUserId || '');
    if (substituteId) substitutionBySubstitute.set(substituteId, req);
  });

  let text = `*${event.title || 'Missa'}*\n`;
  text += `*Local:* ${event.locationId?.name || 'Não informado'}\n`;
  text += `*Padre:* ${event.priestName || 'Não informado'}\n`;
  text += `*Data:* ${eventDateLabel}${eventTimeLabel !== '—' ? ` às ${eventTimeLabel}` : ''}\n\n`;

  text += `*Servos:*\n`;
  currentUsers
    .filter((u: any) => !!u.checkedInAt)
    .forEach((u: any) => {
      const roles = sortRolesList(u.roles || []).join(', ') || 'Sem função';
      text += `• ${u.userId?.name || 'Desconhecido'} - ${roles} | Check-in ${formatTime(u.checkedInAt)}\n`;
    });

  const absentUsers = currentUsers.filter((u: any) => !u.checkedInAt);
  if (absentUsers.length > 0 || approvedRequests.length > 0) {
    text += `\n*Faltas e substituições:*\n`;
    approvedRequests.forEach((req: any) => {
      text += `• ${req.originalUserId?.name || 'Desconhecido'} foi substituído por ${req.substituteUserId?.name || 'Sem substituto'}\n`;
    });
    absentUsers.forEach((u: any) => {
      const userId = String(u.userId?._id || u.userId || '');
      if (!substitutionBySubstitute.has(userId)) {
        text += `• ${u.userId?.name || 'Desconhecido'} faltou sem substituição\n`;
      }
    });
  }

  text += `\n*Acólitos:* ${event.acolyteCount || 0}\n`;

  const occs = (event.occurrences || []).filter((o: any) => String(o.note || '').trim() !== '');
  if (occs.length > 0) {
    text += `\n*Intercorrências:*\n`;
    [...occs]
      .sort((a: any, b: any) => {
        const nameA = a.userId?.name || '';
        const nameB = b.userId?.name || '';
        return nameA.localeCompare(nameB);
      })
      .forEach((o: any) => {
        const formattedNote = String(o.note)
          .split('\n')
          .filter((line: string) => line.trim() !== '')
          .map((line: string) => `  ${line.trim()}`)
          .join('\n');
        text += `• *[${o.userId?.name || 'Desconhecido'}]*\n${formattedNote}\n`;
      });
  }

  return text;
}

interface IndividualReportPageProps {
  onBack?: () => void;
}

function IndividualReportModal({
  event,
  substitutionRequests,
  onClose
}: {
  event: any;
  substitutionRequests: any[];
  onClose: () => void;
}) {
  const currentUsers = useMemo(() => [...(event.users || [])].sort(sortByRoles), [event.users]);
  const approvedRequests = useMemo(
    () => (substitutionRequests || []).filter((req: any) => req.status === 'APPROVED'),
    [substitutionRequests]
  );

  const substitutionBySubstitute = useMemo(() => {
    const map = new Map<string, any>();
    approvedRequests.forEach((req: any) => {
      const substituteId = String(req.substituteUserId?._id || req.substituteUserId || '');
      if (substituteId) map.set(substituteId, req);
    });
    return map;
  }, [approvedRequests]);

  const checkedInUsers = currentUsers.filter((u: any) => !!u.checkedInAt);
  const absentUsers = currentUsers.filter((u: any) => !u.checkedInAt && !substitutionBySubstitute.has(String(u.userId?._id || u.userId || '')));
  const occs = (event.occurrences || [])
    .filter((o: any) => String(o.note || '').trim() !== '')
    .sort((a: any, b: any) => {
      const nameA = a.userId?.name || '';
      const nameB = b.userId?.name || '';
      return nameA.localeCompare(nameB);
    });
  const eventDateLabel = formatDateTime(event.date, false);
  const eventTimeLabel = event.time?.start || '—';

  const exportToWhatsApp = () => {
    const text = buildWhatsAppText(event, substitutionRequests);
    window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2,6,23,0.55)',
    zIndex: 300,
    padding: 16
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 18,
    width: '100%',
    maxWidth: 920,
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(15,23,42,0.28)'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', zIndex: 1 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>{event.title || 'Missa'}</h3>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              {eventDateLabel}
              {eventTimeLabel !== '—' ? ` às ${eventTimeLabel}` : ''}
            </div>
          </div>
          <button className="btn secondary" onClick={onClose} style={{ height: 40 }}>
            Fechar
          </button>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 18 }}>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Local</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{event.locationId?.name || 'Não informado'}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Padre</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{event.priestName || 'Não informado'}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data e hora</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                {eventDateLabel}{eventTimeLabel !== '—' ? ` às ${eventTimeLabel}` : ''}
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Acólitos</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{event.acolyteCount || 0}</div>
            </div>
          </section>

          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Servos e check-ins</h4>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {checkedInUsers.length === 0 ? (
                <div style={{ color: '#64748b' }}>Nenhum servo escalado.</div>
              ) : checkedInUsers.map((u: any) => {
                const userId = String(u.userId?._id || u.userId || '');
                const roles = sortRolesList(u.roles || []).join(', ') || 'Sem função';
                return (
                  <div key={`${userId}-${(u.roles || []).join(',')}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.userId?.name || 'Desconhecido'}</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{roles}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: u.checkedInAt ? '#166534' : '#b91c1c' }}>
                        {u.checkedInAt ? 'Check-in' : 'Sem check-in'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                        {u.checkedInAt ? formatTime(u.checkedInAt) : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#0f172a' }}>Faltas e substituições</h4>
              {approvedRequests.length === 0 && absentUsers.length === 0 ? (
                <div style={{ color: '#64748b' }}>Nenhuma ocorrência registrada.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {approvedRequests.length > 0 && approvedRequests.map((req: any) => (
                    <div key={req._id} style={{ padding: 12, background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, color: '#9a3412' }}>
                        {req.originalUserId?.name || 'Desconhecido'} foi substituído por {req.substituteUserId?.name || 'Sem substituto'}
                      </div>
                      {req.reason && (
                        <div style={{ marginTop: 4, color: '#7c2d12', fontSize: 13 }}>
                          Motivo: {req.reason}
                        </div>
                      )}
                    </div>
                  ))}
                  {absentUsers.length > 0 && absentUsers.map((u: any) => (
                    <div key={`abs-${String(u.userId?._id || u.userId || '')}`} style={{ padding: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, color: '#991b1b' }}>
                        {u.userId?.name || 'Desconhecido'} faltou
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#0f172a' }}>Intercorrências</h4>
              {occs.length === 0 ? (
                <div style={{ color: '#64748b' }}>Nenhuma intercorrência registrada.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {occs.map((o: any, idx: number) => {
                    const formattedNote = String(o.note)
                      .split('\n')
                      .filter((line: string) => line.trim() !== '')
                      .map((line: string) => line.trim())
                      .join('\n');

                    return (
                    <div key={`${String(o.userId?._id || o.userId || '')}-${idx}`} style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{o.userId?.name || 'Desconhecido'}</div>
                      <div style={{ color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{formattedNote}</div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={exportToWhatsApp} style={{ background: '#25d366', borderColor: '#25d366' }}>
              Exportar para WhatsApp
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function IndividualReportPage(props: IndividualReportPageProps) {
  const { user } = useAuth();
  void props.onBack;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchLocations = async () => {
    try {
      setLocationsLoading(true);
      const res = await axios.get('/locations');
      setLocations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('failed to fetch locations', err);
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchEvents = async (overrides?: { startDate?: string; endDate?: string; locationId?: string }) => {
    const queryStart = overrides?.startDate ?? startDate;
    const queryEnd = overrides?.endDate ?? endDate;
    const queryLocation = overrides?.locationId ?? locationId;

    try {
      setLoading(true);
      const params: any = {};
      if (queryStart) params.startDate = queryStart;
      if (queryEnd) params.endDate = queryEnd;
      if (queryLocation) params.locationId = queryLocation;
      const res = await axios.get('/agenda-events', { params });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('failed to fetch individual report events', err);
      setEvents([]);
      alert('Erro ao carregar a lista de missas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const today = new Date();
    const initialStart = toDateInputValue(startOfMonth(today));
    const initialEnd = toDateInputValue(endOfMonth(today));
    setStartDate(initialStart);
    setEndDate(initialEnd);
    fetchLocations();
    fetchEvents({ startDate: initialStart, endDate: initialEnd, locationId: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleSearch = () => {
    setFiltersCollapsed(true);
    fetchEvents();
  };

  const openEventDetails = async (event: any) => {
    try {
      setDetailsLoading(true);
      setSelectedEvent(event);
      const [detailRes, requestsRes] = await Promise.all([
        axios.get(`/agenda-events/${event._id}`),
        axios.get('/substitution-requests', { params: { eventId: event._id, all: 'true' } })
      ]);
      setSelectedEvent(detailRes.data);
      setSelectedRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (err) {
      console.error('failed to load event details', err);
      alert('Erro ao carregar os detalhes da missa.');
      setSelectedEvent(null);
      setSelectedRequests([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const buildPrintableReportHtml = (events: any[], startDate?: string, endDate?: string) => {
    const formatDate = (dateString: string) => {
      try {
        const d = new Date(dateString);
        d.setDate(d.getDate() + 1);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
      } catch {
        return 'N/D';
      }
    };

    let reportText = `Relatório de Missas\n`;
    reportText += `Período: ${startDate ? formatDate(startDate) : 'N/A'} a ${endDate ? formatDate(endDate) : 'N/A'}\n`;
    reportText += `Total de missas: ${events.length}\n`;
    reportText += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    reportText += `${'-'.repeat(80)}\n\n`;

    events.forEach((event, index) => {
      const eventDateLabel = formatDateTime(event.date, false);
      const eventTimeLabel = event.time?.start || '—';
      const checkedInUsers = (event.users || []).filter((u: any) => !!u.checkedInAt).sort(sortByRoles);

      reportText += `MISSA ${index + 1} de ${events.length}\n`;
      reportText += `${'='.repeat(40)}\n`;
      reportText += `${event.title || 'Missa'}\n`;
      //reportText += `${eventDateLabel}${eventTimeLabel !== '—' ? ` às ${eventTimeLabel}` : ''}\n`;
      reportText += `Local: ${event.locationId?.name || 'Não informado'} - ${eventTimeLabel}\n`;
      reportText += `Padre: ${event.priestName || 'Não informado'}\n`;
      reportText += `Acólitos: ${event.acolyteCount || 0}\n\n`;

      reportText += `Servos:\n`;
      if (checkedInUsers.length > 0) {
        checkedInUsers.forEach((u: any) => {
          const roles = sortRolesList(u.roles || []).join(', ') || 'Sem função';
          reportText += `  • ${u.userId?.name || 'Desconhecido'} (${roles}) \n`;
        });
      } else {
        reportText += `  Nenhum servo com check-in.\n`;
      }
      reportText += `\n`;

      const occs = (event.occurrences || []).filter((o: any) => String(o.note || '').trim() !== '');
      if (occs.length > 0) {
          reportText += `Intercorrências Registradas:\n`;
          occs.forEach((o: any) => {
              const formattedNote = String(o.note).split('\n').map((line: string) => `    ${line.trim()}`).join('\n');
              reportText += `${formattedNote}\n`;
          });
      }
      reportText += `\n${'-'.repeat(80)}\n\n`;
    });

    return reportText;
  };

  const exportEventsToPdf = () => {
    const pdf = new jsPDF();

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);

    const html = buildPrintableReportHtml(events, startDate, endDate);

    const element = document.createElement('div');
    element.innerHTML = html;

    const text = element.innerText;

    const lines = pdf.splitTextToSize(text, 180);

    let y = 10;
    const pageHeight = pdf.internal.pageSize.getHeight();

    lines.forEach((line: string) => {
      if (y > pageHeight - 10) {
        pdf.addPage();
        y = 10;
      }

      pdf.text(line, 10, y);
      y += 5;
    });

    pdf.save(`relatorio-missas-${Date.now()}.pdf`);
  };

  if (user?.role !== 'admin') {
    return <div className="page" style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>Acesso negado. Apenas administradores podem ver relatórios.</div>;
  }

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720, minWidth: 0 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Relatório Individual</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: 14, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              Filtre por período e local, selecione a missa e veja os detalhes completos.
            </p>
          </div>
        </header>

        <section style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 20, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: filtersCollapsed ? 0 : 16, flexWrap: 'wrap', cursor: 'pointer' }}
            onClick={() => setFiltersCollapsed(prev => !prev)}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Filtros</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>Ajuste o período e o local da busca.</div>
            </div>
            <button
              type="button"
              aria-label={filtersCollapsed ? 'Mostrar filtros' : 'Recolher filtros'}
              onClick={(e) => { e.stopPropagation(); setFiltersCollapsed(prev => !prev); }}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.2s ease',
                transform: filtersCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                fontSize: 14,
                color: '#475569',
              }}>
                ⌃
              </span>
            </button>
          </div>
          {!filtersCollapsed && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data inicial</label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data final</label>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Local</label>
                <select
                  className="input"
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  style={{ width: '100%' }}
                  disabled={locationsLoading}
                >
                  <option value="">Todos os locais</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <button className="btn" onClick={handleSearch} disabled={loading} style={{ background: '#2563eb', borderColor: '#2563eb', width: '100%', height: 46 }}>
                  {loading ? 'Filtrando...' : 'Filtrar'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
              Missas encontradas <span style={{ color: '#64748b', fontWeight: 600 }}>({events.length})</span>
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Carregando missas...</div>
          ) : events.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16 }}>
              Nenhuma missa encontrada para os filtros selecionados.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {events.map((ev: any) => {
                const colorMap: Record<string, string> = {
                  verde: '#16a34a',
                  branco: '#e5e7eb',
                  roxo: '#7c3aed',
                  vermelho: '#dc2626'
                };
                const borderColor = ev.color ? (colorMap[ev.color] || ev.color) : '#cbd5e1';
                return (
                  <button
                    key={ev._id}
                    type="button"
                    onClick={() => openEventDetails(ev)}
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      padding: '16px 18px 16px 0',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 18,
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 16, alignItems: 'stretch' }}>
                      <div style={{ background: borderColor, borderRadius: '18px 0 0 18px', minHeight: 92 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', paddingRight: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#0f172a' }}>
                            {ev.title || 'Missa'}
                          </h4>
                          <div style={{ color: '#475569', fontSize: 14 }}>
                            {ev.locationId?.name || 'Local não informado'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', color: '#334155' }}>
                          <div style={{ fontWeight: 700 }}>{formatDateTime(ev.date)}</div>
                          <div style={{ color: '#64748b', marginTop: 4 }}>Horário: {ev.time?.start || '—'}</div>
                          <div style={{ color: '#64748b', marginTop: 4 }}>{ev.priestName || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedEvent && (
          detailsLoading ? (
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.55)', zIndex: 300, padding: 16 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 280, textAlign: 'center', color: '#334155' }}>
                Carregando detalhes...
              </div>
            </div>
          ) : (
            <IndividualReportModal
              event={selectedEvent}
              substitutionRequests={selectedRequests}
              onClose={() => {
                setSelectedEvent(null);
                setSelectedRequests([]);
              }}
            />
          )
        )}

        {events.length > 0 && (
          <button
            type="button"
            onClick={exportEventsToPdf}
            disabled={isGeneratingPdf}
            aria-label="Gerar PDF do relatório"
            style={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 450,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 18px 40px rgba(220, 38, 38, 0.35)',
              cursor: 'pointer',
              opacity: isGeneratingPdf ? 0.7 : 1,
            }}
          >
            {isGeneratingPdf ? (
              <svg style={{ animation: 'spin 1s linear infinite' }} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.92969 4.93L7.75969 7.76" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.2402 16.24L19.0702 19.07" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 12H22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.92969 19.07L7.75969 16.24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.2402 7.76L19.0702 4.93" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/>
                <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">PDF</text>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}