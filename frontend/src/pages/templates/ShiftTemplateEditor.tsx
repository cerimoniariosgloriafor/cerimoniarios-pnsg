import React, { useEffect, useState } from 'react';
import axios from 'axios';
import UserMultiSelect from '../../components/UserMultiSelect';

const WEEKDAYS = [
  { label: 'Seg', val: 1 },
  { label: 'Ter', val: 2 },
  { label: 'Qua', val: 3 },
  { label: 'Qui', val: 4 },
  { label: 'Sex', val: 5 },
  { label: 'Sáb', val: 6 },
  { label: 'Dom', val: 7 }
];

export default function ShiftTemplateEditor({ id, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [locationId, setLocationId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [timeStart, setTimeStart] = useState('09:00');
  const [recurrenceType, setRecurrenceType] = useState<'single'|'weekly'|'monthlyByWeekday'|'monthlyByMonthday'>('single');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weekOfMonth, setWeekOfMonth] = useState(1);
  const [monthDay, setMonthDay] = useState(1);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    axios.get('/locations').then(r=>setLocations(r.data||[])).catch(()=>{});
    axios.get('/users').then(r=>setUsers(r.data||[])).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/shift-templates/${id}`).then(res => {
      const d = res.data || {};
      setLocationId(typeof d.locationId === 'string' ? d.locationId : (d.locationId?._id || ''));
      setSelectedUsers((d.users||[]).map((u:any)=>u._id || u));
      setTimeStart(d.time?.start || '09:00');
      const type = d.recurrence?.type || 'single';
      setRecurrenceType(type);
      if (type === 'weekly') setWeekdays(d.recurrence.weekly?.weekdays || [1,2,3,4,5,6]);
      if (type === 'monthlyByWeekday') { setWeekOfMonth(d.recurrence.monthlyByWeekday?.weekOfMonth || 1); setWeekdays([d.recurrence.monthlyByWeekday?.weekday || 7]); }
      if (type === 'monthlyByMonthday') setMonthDay(d.recurrence.monthlyByMonthday?.dayOfMonth || 1);
    }).catch(err=>console.error('load template', err)).finally(()=>setLoading(false));
  }, [id]);

  const toggleUser = (uid:string) => setSelectedUsers(s => s.includes(uid) ? s.filter(x=>x!==uid) : [...s, uid]);
  const toggleWeekday = (d:number) => setWeekdays(s => s.includes(d) ? s.filter(x=>x!==d) : [...s, d]);

  const close = () => {
    const q = new URLSearchParams(window.location.search);
    const from = q.get('from');
    const target = from || '/templates';
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const submit = async (e:any) => {
    e?.preventDefault?.();
    if (!locationId) return alert('Local obrigatório');
    if (!timeStart) return alert('Horário obrigatório');

    setSaving(true);
    try {
      const payload:any = {
        title: '',
        locationId,
        users: selectedUsers,
        time: { start: timeStart },
        recurrence: { startDate: new Date() }
      };

      if (recurrenceType === 'single') {
        payload.recurrence.type = 'single';
      } else if (recurrenceType === 'weekly') {
        payload.recurrence.type = 'weekly';
        payload.recurrence.weekly = { interval: 1, weekdays };
      } else if (recurrenceType === 'monthlyByWeekday') {
        payload.recurrence.type = 'monthlyByWeekday';
        payload.recurrence.monthlyByWeekday = { weekOfMonth, weekday: weekdays[0] || 7 };
      } else if (recurrenceType === 'monthlyByMonthday') {
        payload.recurrence.type = 'monthlyByMonthday';
        payload.recurrence.monthlyByMonthday = { dayOfMonth: Number(monthDay) };
      }

      if (id) await axios.post(`/shift-templates/${id}`, payload);
      else await axios.post('/shift-templates', payload);
      onSaved && onSaved();
      close();
    } catch (err) {
      console.error('save template', err);
      alert('Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id) return close();
    if (!confirm('Deseja apagar esta escala?')) return;
    setDeleting(true);
    try {
      await axios.delete(`/shift-templates/${id}`);
      onSaved && onSaved();
      close();
    } catch (err) {
      console.error('delete template', err);
      alert('Erro ao apagar');
    } finally { setDeleting(false); }
  };

  return (
    <div className="editor-page">
      <div className="editor-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <h3 style={{ margin:0 }}>{id ? 'Editar Escala' : 'Criar Escala'}</h3>
          <div>
            {id && <button className="btn secondary" onClick={handleDelete} disabled={deleting}>{deleting ? 'Apagando...' : 'Apagar'}</button>}
          </div>
        </div>

        {loading ? <div>Carregando...</div> : (
          <form onSubmit={submit}>
            <div className="form-row">
              <select className="input" value={locationId} onChange={e=>setLocationId(e.target.value)} required>
                <option value="">Selecionar local</option>
                {locations.map(l=> <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>

              <div style={{ display:'flex', gap:8 }}>
                <input className="input" type="time" value={timeStart} onChange={e=>setTimeStart(e.target.value)} required />
                {/* start date is automatic: set to creation time on save */}
              </div>

              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={{ fontWeight:700 }}>Usuários</label>
                <UserMultiSelect users={users} value={selectedUsers} onChange={(v:any) => setSelectedUsers(v)} />
              </div>
            </div>

            <div style={{ marginTop:10 }}>  
              <div style={{ fontWeight:700, marginBottom:6 }}>Recorrência</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <label><input type="radio" checked={recurrenceType==='single'} onChange={() => setRecurrenceType('single')} /> Uma única vez</label>
                <label><input type="radio" checked={recurrenceType==='weekly'} onChange={() => setRecurrenceType('weekly')} /> Semanalmente (fixo)</label>
                <label><input type="radio" checked={recurrenceType==='monthlyByWeekday'} onChange={() => setRecurrenceType('monthlyByWeekday')} /> Mensal (por semana)</label>
                <label><input type="radio" checked={recurrenceType==='monthlyByMonthday'} onChange={() => setRecurrenceType('monthlyByMonthday')} /> Mensal (dia do mês)</label>
              </div>

              {recurrenceType === 'weekly' && (
                <div style={{ marginTop:8 }}>
                  <div style={{ marginBottom:6 }}>Dias da semana (marque):</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {WEEKDAYS.map(d => (
                      <label key={d.val} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        <input
                          type="radio"
                          name="weekly-day"
                          checked={weekdays[0] === d.val}
                          onChange={() => setWeekdays([d.val])}
                        /> {d.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {recurrenceType === 'monthlyByWeekday' && (
                <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
                  <select className="input" value={String(weekOfMonth)} onChange={e => setWeekOfMonth(Number(e.target.value))}>
                    <option value={1}>Semana 1</option>
                    <option value={2}>Semana 2</option>
                    <option value={3}>Semana 3</option>
                    <option value={4}>Semana 4</option>
                    <option value={5}>Semana 5</option>
                  </select>
                  <select className="input" value={String(weekdays[0] || 7)} onChange={e => setWeekdays([Number(e.target.value)])}>
                    {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                  </select>
                </div>
              )}

              {recurrenceType === 'monthlyByMonthday' && (
                <div style={{ marginTop:8 }}>
                  <label>Dia do mês: <input className="input" type="number" min={1} max={31} value={String(monthDay)} onChange={e => setMonthDay(Number(e.target.value))} style={{ width:120 }} /></label>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              <button type="button" className="btn secondary" onClick={close}>Fechar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
