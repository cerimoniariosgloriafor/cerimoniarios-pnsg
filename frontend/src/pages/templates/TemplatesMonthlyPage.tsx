import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const WEEKDAYS = [
  { id: 1, label: 'SEG' },
  { id: 2, label: 'TER' },
  { id: 3, label: 'QUA' },
  { id: 4, label: 'QUI' },
  { id: 5, label: 'SEX' },
  { id: 6, label: 'SÁB' },
  { id: 7, label: 'DOM' }
];

const WEEKS = [1,2,3,4,5];

export default function TemplatesMonthlyPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1); // default to 1ª semana
  const [viewMode, setViewMode] = useState<'byWeek'|'byDay'>('byWeek');
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState<number | null>(null);
  const { user } = useAuth();
  const isServo = user?.role === 'servo';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get('/shift-templates');
        if (mounted) setTemplates(res.data || []);
      } catch (err) { console.error('fetch templates', err); }
    })();
    return () => { mounted = false };
  }, []);

  const monthlyByWeekday = templates.filter(t => t.recurrence?.type === 'monthlyByWeekday');
  const monthlyByMonthday = templates.filter(t => t.recurrence?.type === 'monthlyByMonthday');

  // helper: parse HH:MM -> minutes for proper sorting
  const toMinutes = (time?: string) => {
    if (!time || typeof time !== 'string') return 0;
    const [h, m] = time.split(':').map(x => Number(x || 0));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  
  // group templates for the selected week by weekday (1..7)
  const itemsForWeek = monthlyByWeekday.filter(t => (t.recurrence?.monthlyByWeekday?.weekOfMonth || 1) === selectedWeek);
  const groupedByWeekday = WEEKDAYS.map(d => ({
    day: d,
    items: itemsForWeek
      .filter(t => (t.recurrence?.monthlyByWeekday?.weekday || 7) === d.id)
      .slice()
      .sort((a,b) => toMinutes(a.time?.start) - toMinutes(b.time?.start))
  }));

  // group monthday templates by dayOfMonth
  const monthdayGroups: { day: number; items: any[] }[] = [];
  monthlyByMonthday.forEach(t => {
    const day = Number(t.recurrence?.monthlyByMonthday?.dayOfMonth || 0);
    if (!day) return;
    let g = monthdayGroups.find(x => x.day === day);
    if (!g) { g = { day, items: [] }; monthdayGroups.push(g); }
    g.items.push(t);
  });
  // sort items inside each day group by time.start
  monthdayGroups.forEach(g => {
    g.items = g.items.slice().sort((a,b) => toMinutes(a.time?.start) - toMinutes(b.time?.start));
  });
  monthdayGroups.sort((a,b) => a.day - b.day);

  const openEditTemplate = (templateId: string) => {
    if (!templateId) return;
    window.history.pushState({}, '', `/templates/${templateId}?from=/templates/monthly`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Escalas — Mensal</h2>
        </div>
        <div style={{ width: 320 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button className={`weekday-btn ${viewMode === 'byWeek' ? 'active' : ''}`} onClick={() => setViewMode('byWeek')}>Por semana</button>
        <button className={`weekday-btn ${viewMode === 'byDay' ? 'active' : ''}`} onClick={() => setViewMode('byDay')}>Por dia do mês</button>
      </div>

      {viewMode === 'byWeek' ? (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            {WEEKS.map(w => (
              <button key={w} className={`weekday-btn ${selectedWeek === w ? 'active' : ''}`} onClick={() => setSelectedWeek(w)}>
                {w}ª semana
              </button>
            ))}
          </div>

          <div>
            {itemsForWeek.length === 0 ? (
              <div className="empty">Nenhuma escala para a {selectedWeek}ª semana</div>
            ) : (
              groupedByWeekday.filter(g => g.items.length > 0).map(g => (
                <div key={g.day.id} style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: '6px 0' }}>{g.day.label.toUpperCase()} <span style={{ color:'#64748b', fontWeight:600, marginLeft:8 }}>({g.items.length})</span></h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {g.items.map(t => (
                      <div key={t._id} className="card square" onClick={isServo ? undefined : () => openEditTemplate(t._id)} style={{ cursor: isServo ? 'default' : 'pointer' }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.locationId?.color && (
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.locationId.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                          )}
                          <span>{t.locationId?.name || '— local —'}</span>
                        </div>
                        <div style={{ color: '#64748b', marginTop: 6 }}>{t.time?.start || '—'}</div>
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(t.users || []).slice(0,4).map((u: any) => (
                            <div key={u._id} className="chip">{u.name}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {monthdayGroups.length === 0 ? <div className="empty">Nenhuma escala por dia do mês</div> : (
              monthdayGroups.map(g => (
                <button key={g.day} className={`weekday-btn ${selectedDayOfMonth === g.day ? 'active' : ''}`} onClick={() => setSelectedDayOfMonth(g.day)}>
                  Dia {g.day} ({g.items.length})
                </button>
              ))
            )}
          </div>

          <div>
            {selectedDayOfMonth == null ? (
              monthdayGroups.length === 0 ? null : <div className="empty">Selecione um dia do mês para ver as escalas</div>
            ) : (
              (() => {
                const group = monthdayGroups.find(g => g.day === selectedDayOfMonth);
                if (!group) return <div className="empty">Nenhuma escala para o dia {selectedDayOfMonth}</div>;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {group.items.map(t => (
                      <div key={t._id} className="card square" onClick={isServo ? undefined : () => openEditTemplate(t._id)} style={{ cursor: isServo ? 'default' : 'pointer' }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.locationId?.color && (
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.locationId.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                          )}
                          <span>{t.locationId?.name || '— local —'}</span>
                        </div>
                        <div style={{ color: '#64748b', marginTop: 6 }}>{t.time?.start || '—'}</div>
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(t.users || []).slice(0,4).map((u: any) => (
                            <div key={u._id} className="chip">{u.name}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </>
      )}
    </div>
  );
}
