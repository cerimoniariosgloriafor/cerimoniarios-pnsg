import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

function startOfIsoWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as first day
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  r.setHours(0,0,0,0);
  return r;
}

function formatShort(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function AgendaPage() {
  const today = new Date();
  const [baseWeek, setBaseWeek] = useState<Date>(() => startOfIsoWeek(today));
  const [selected, setSelected] = useState<Date>(() => new Date(today));
  const [pickerVisible, setPickerVisible] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [templatesForDay, setTemplatesForDay] = useState<any[]>([]);
  const [eventsForDay, setEventsForDay] = useState<any[]>([]);

  useEffect(() => {
    // keep baseWeek in sync with selected (useful for other features)
    setBaseWeek(startOfIsoWeek(selected));
  }, [selected]);

  useEffect(() => {
    // fetch template occurrences and existing agenda events when selected changes
    const dateStr = isoDateValue(selected);
    (async () => {
      try {
        const [tplRes, evRes] = await Promise.all([
          axios.get('/shift-templates/occurrences', { params: { date: dateStr } }),
          axios.get('/agenda-events', { params: { date: dateStr } })
        ]);
        const titems = (tplRes.data || []).map((it: any) => ({ template: it.template, occurrences: it.occurrences }));
        // sort by time.start
        titems.sort((a: any, b: any) => {
          const ta = (a.template.time?.start || '00:00').split(':').map(Number);
          const tb = (b.template.time?.start || '00:00').split(':').map(Number);
          return (ta[0]*60+ta[1]) - (tb[0]*60+tb[1]);
        });
        setTemplatesForDay(titems);
        const evs = (evRes.data || []).slice();
        evs.sort((a: any, b: any) => {
          const ta = (a.time?.start || '00:00').split(':').map(Number);
          const tb = (b.time?.start || '00:00').split(':').map(Number);
          return (ta[0]*60+ta[1]) - (tb[0]*60+tb[1]);
        });
        setEventsForDay(evs);
      } catch (err) {
        console.error('load agenda items', err);
        setTemplatesForDay([]);
        setEventsForDay([]);
      }
    })();
  }, [selected]);

  const prevDay = () => setSelected(s => addDays(s, -1));
  const nextDay = () => setSelected(s => addDays(s, 1));

  const openDatePicker = async () => {
    // briefly make the input visible so browsers allow opening the native picker
    setPickerVisible(true);
    await new Promise(r => setTimeout(r, 50));
    const input = dateInputRef.current as any;
    try {
      if (input && typeof input.showPicker === 'function') {
        input.showPicker();
      } else if (input) {
        input.focus();
        input.click();
      }
    } catch (e) {
      // ignore
      input?.focus();
      input?.click();
    }
  };

  const onDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; // format YYYY-MM-DD
    if (!v) return;
    const parts = v.split('-').map(n => parseInt(n, 10));
    const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    setSelected(d);
    setPickerVisible(false);
  };

  const isoDateValue = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openTemplateEdit = (id: string) => {
    window.history.pushState({}, '', `/templates/${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openEventEdit = (ev: any) => {
    if (!ev || !ev._id) return;
    window.history.pushState({}, '', `/agenda/${ev._id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Agenda</h2>
        </div>
       </div>

       <div className="agenda">
        <div style={{ marginTop: 12 }}>
          <h3 style={{ margin: 0 }}>{selected.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' })}</h3>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <button className="btn" onClick={prevDay} aria-label="Dia anterior">◀</button>

            <button className="btn" onClick={openDatePicker} aria-label="Escolher data">📅</button>

            <button className="btn" onClick={nextDay} aria-label="Próximo dia">▶</button>

            <input
              ref={dateInputRef}
              type="date"
              value={isoDateValue(selected)}
              onChange={onDateChange}
              style={pickerVisible ? { display: 'inline-block' } : { position: 'absolute', left: -9999 }}
              aria-hidden={!pickerVisible}
              onBlur={() => setPickerVisible(false)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            {/* Agenda events created manually */}
            {eventsForDay.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ marginBottom: 8 }}>Agendas do dia</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {eventsForDay.map((ev: any) => (
                    <div key={ev._id} className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => openEventEdit(ev)}>
                      <div style={{ fontWeight: 700 }}>{ev.title || ev.priestName || 'Evento'}</div>
                      <div style={{ color: '#444', marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div>{ev.locationId?.name || ''}</div>
                        {ev.time?.start && (<div style={{ color: '#666' }}>| {ev.time?.start}</div>)}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(ev.users || []).map((au: any, i: number) => (
                          <div key={i} style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 6 }}>{au.userId?.name || 'Usuário' + i} {au.roles && au.roles.length ? `(${au.roles.join(',')})` : ''}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eventsForDay.length === 0 && (
              <div style={{ color: '#666' }}>
                Sem agenda definida para o dia.
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="fab" aria-label="Adicionar evento" onClick={() => { window.history.pushState({}, '', '/agenda/new'); window.dispatchEvent(new PopStateEvent('popstate')); }}>+</button>
    </div>
  );
}
