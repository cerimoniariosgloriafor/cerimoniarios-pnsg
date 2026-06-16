import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const WEEKDAYS = [
  { id: 1, label: 'SEGUNDA' },
  { id: 2, label: 'TERÇA' },
  { id: 3, label: 'QUARTA' },
  { id: 4, label: 'QUINTA' },
  { id: 5, label: 'SEXTA' },
  { id: 6, label: 'SÁBADO' }
];

export default function TemplatesWeeklyPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<number>(1); // default to Monday
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

  const weeklyTemplates = templates.filter(t => t.recurrence?.type === 'weekly');
  // helper to sort by time.start (HH:MM)
  const toMinutes = (time?: string) => {
    if (!time || typeof time !== 'string') return 0;
    const [h, m] = time.split(':').map(x => Number(x || 0));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };

  const itemsForDay = weeklyTemplates
    .filter(t => (t.recurrence?.weekly?.weekdays || []).includes(selected))
    .slice()
    .sort((a, b) => toMinutes(a.time?.start) - toMinutes(b.time?.start));

  const openEditTemplate = (templateId: string) => {
    if (!templateId) return;
    window.history.pushState({}, '', `/templates/${templateId}?from=/templates/weekly`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Escala Fixa Semanal</h2>
        </div>
        <div style={{ width: 320 }} />
      </div>

      <div className="weekday-row" style={{ marginBottom: 12 }}>
        {WEEKDAYS.map(d => (
          <button
            key={d.id}
            className={`weekday-btn ${selected === d.id ? 'active' : ''}`}
            onClick={() => setSelected(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div>
        {itemsForDay.length === 0 && (
          <div className="empty">Nenhuma escala fixa para {WEEKDAYS.find(w => w.id === selected)?.label}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {itemsForDay.map(t => (
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
    </div>
  );
}
