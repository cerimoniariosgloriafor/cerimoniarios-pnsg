import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ShiftTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/shift-templates');
      setTemplates(res.data || []);
    } catch (err) { console.error('fetch templates', err) }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNew = () => {
    window.history.pushState({}, '', '/templates/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openEdit = (id: string) => {
    window.history.pushState({}, '', `/templates/${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openWeekly = () => {
    window.history.pushState({}, '', '/templates/weekly');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openMonthly = () => {
    window.history.pushState({}, '', '/templates/monthly');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const weeklyCount = templates.filter(t => t.recurrence?.type === 'weekly').length;
  const monthlyCount = templates.filter(t => t.recurrence?.type === 'monthlyByWeekday' || t.recurrence?.type === 'monthlyByMonthday').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Escalas</h2>
        </div>
        <div style={{ width: 320 }}>
          {/* creation via FAB bottom-left */}
        </div>
      </div>

      <div style={{ display:'grid', gap:12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="big-card" style={{ flex: 1, cursor: 'pointer' }} onClick={openWeekly}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Escalas Semanais</div>
            <div style={{ color: '#64748b', marginTop: 8 }}>{weeklyCount} modelos semanais</div>
            <div style={{ marginTop: 12, color: '#0ea5a0' }}>Ver agenda fixa (segunda → sábado)</div>
          </div>

          <div className="big-card" style={{ flex: 1, cursor: 'pointer' }} onClick={openMonthly}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Escalas Mensais</div>
            <div style={{ color: '#64748b', marginTop: 8 }}>{monthlyCount} modelos mensais</div>
            <div style={{ marginTop: 12, color: '#0ea5a0' }}>Ver escalas mensais (ex.: 2º domingo)</div>
          </div>
        </div>  
      </div>

      <button className="fab" aria-label="Adicionar escala" onClick={openNew}>+</button>
    </div>
  );
}
