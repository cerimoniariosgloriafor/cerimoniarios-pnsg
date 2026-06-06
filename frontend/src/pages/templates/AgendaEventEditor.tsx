import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AgendaEventEditor({ predate, id }: { predate?: string, id?: string }) {
  const [date, setDate] = useState<string>(predate || '');
  const [templates, setTemplates] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState<string>('');
  const [assignedUsers, setAssignedUsers] = useState<Array<{ userId: string, roles: string[] }>>([]);
  const [priestName, setPriestName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [color, setColor] = useState<string>('');

  useEffect(() => {
    (async () => {
      const [locRes, usrRes] = await Promise.all([axios.get('/locations'), axios.get('/users')]);
      setLocations(locRes.data || []);
      setUsers(usrRes.data || []);
    })();

    // if URL has ?date= and no predate provided, use it
    if (!predate && !id) {
      const params = new URLSearchParams(window.location.search);
      const qd = params.get('date');
      if (qd) setDate(qd);
    }
  }, []);

  useEffect(() => {
    if (!date) return;
    (async () => {
      try {
        const res = await axios.get('/shift-templates/occurrences', { params: { date } });
        const items = (res.data || []).map((it: any) => ({ template: it.template, occurrences: it.occurrences }));
        setTemplates(items);
      } catch (err) {
        console.error('load occurrences', err);
      }
    })();
  }, [date]);

  // load event when editing
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await axios.get(`/agenda-events/${id}`);
        const ev = res.data;
        if (ev) {
          // format date to YYYY-MM-DD for input
          const d = new Date(ev.date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setDate(`${y}-${m}-${day}`);
          setPriestName(ev.priestName || '');
          setTitle(ev.title || '');
          setColor(ev.color || '');
          setLocationId(ev.locationId?._id || ev.locationId || null);
          setTimeStart(ev.time?.start || '');
          setAssignedUsers((ev.users || []).map((au: any) => ({ userId: au.userId?._id || au.userId, roles: au.roles || [], checkedInAt: au.checkedInAt })));
          setSelectedTemplateId(ev.templateId || null);
        }
      } catch (err) {
        console.error('load event', err);
      }
    })();
  }, [id]);

  const onSelectTemplate = (tid: string) => {
    if (!tid) {
      setSelectedTemplateId(null);
      return;
    }
    setSelectedTemplateId(tid);
    const found = templates.find(t => t.template._id === tid)?.template;
    if (found) {
      setLocationId(found.locationId?._id || found.locationId || null);
      setTimeStart(found.time?.start || '');
      const u = (found.users || []).map((uu: any) => ({ userId: uu._id, roles: [] }));
      setAssignedUsers(u);
      setTitle(prevTitle => prevTitle || found.title || '');
    }
  };

  // more robust immutable toggle by index
  const toggleRole = (index: number, role: string) => {
    setAssignedUsers(prev => prev.map((au, i) => {
      if (i !== index) return au;
      const roles = au.roles || [];
      const has = roles.includes(role);
      return { ...au, roles: has ? roles.filter(r => r !== role) : [...roles, role] };
    }));
  };

  const submit = async () => {
    if (!date) return alert('Data obrigatória');
    if (!priestName) return alert('Nome do padre obrigatório');
    try {
      const payload: any = {
        date,
        priestName,
        title,
        color,
        locationId,
        time: { start: timeStart },
        users: assignedUsers
      };
      if (selectedTemplateId) payload.templateId = selectedTemplateId;
      let res;
      if (id) {
        res = await axios.post(`/agenda-events/${id}`, payload);
      } else {
        res = await axios.post('/agenda-events', payload);
      }
      window.history.pushState({}, '', '/agenda');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: any) {
      console.error('create/update event', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('falha ao salvar evento');
      }
    }
  };

  const remove = async () => {
    if (!id) return;
    if (!confirm('Remover este evento?')) return;
    try {
      await axios.delete(`/agenda-events/${id}`);
      window.history.pushState({}, '', '/agenda');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      console.error('delete event', err);
      alert('falha ao remover evento');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
      </div>

      <div style={{ padding: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 8 }}>

          <div style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Novo Evento</h2>
            <div style={{ color: '#666', marginTop: 4 }}>Criação de evento/escala avulsa</div>
          </div>

          {/* Title and liturgical color first */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Título da Missa</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: VERMELHO - Memória de São Carlos..." style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Cor litúrgica</div>
            <select value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <option value="">-- sem cor --</option>
              <option value="verde">Verde</option>
              <option value="branco">Branco</option>
              <option value="roxo">Roxo</option>
              <option value="vermelho">Vermelho</option>
            </select>
          </div>

          {/* Date and time follow */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Data</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Horário</div>
              <input value={timeStart} onChange={e => setTimeStart(e.target.value)} placeholder="HH:MM" style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Templates disponíveis para esta data</div>
            <select value={selectedTemplateId || ''} onChange={e => onSelectTemplate(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <option value="">-- nenhum --</option>
              {templates.map(t => (
                <option key={t.template._id} value={t.template._id}>{`${t.template.locationId?.name || ''} - ${t.template.time?.start || ''}`}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Local</div>
            <select value={locationId || ''} onChange={e => setLocationId(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <option value="">-- selecione --</option>
              {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 600 }}>Usuários (atribuir funções)</div>
              <button 
                type="button" 
                onClick={() => {
                  if (!confirm('Deseja adicionar todos os usuários ativos que ainda não estão na lista?')) return;
                  const currentIds = new Set(assignedUsers.map(au => String(au.userId)));
                  const newUsers = users
                    .filter(u => !u.archived && (!u.suspendedUntil || new Date(u.suspendedUntil) <= new Date()) && !currentIds.has(String(u._id)))
                    .map(u => ({ userId: u._id, roles: [] }));
                  setAssignedUsers(prev => [...prev, ...newUsers]);
                }}
                style={{ fontSize: 12, padding: '4px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', color: '#334155' }}
              >
                Adicionar Todos Ativos
              </button>
            </div>
            <div className="assigned-users-list">
               {assignedUsers.map((au, idx) => (
                 <div key={`${au.userId}-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, padding: 8, border: '1px solid #f3f4f6', borderRadius: 6 }}>
                   <div className="assigned-user-name" style={{ width: 220, fontWeight: 500 }}>{users.find(u => String(u._id) === String(au.userId))?.name || 'Usuário'}</div>
                   {(() => {
                     const roles = au.roles || [];
                     return (
                       <div style={{ display: 'flex', gap: 1 }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <input
                             type="checkbox"
                             checked={roles.includes('M.C.')}
                             onChange={(e) => { e.stopPropagation(); toggleRole(idx, 'M.C.'); }}
                           /> <span>M.C.</span>
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <input
                             type="checkbox"
                             checked={roles.includes('C.A.')}
                             onChange={(e) => { e.stopPropagation(); toggleRole(idx, 'C.A.'); }}
                           /> <span>C.A.</span>
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <input
                             type="checkbox"
                             checked={roles.includes('C.L.')}
                             onChange={(e) => { e.stopPropagation(); toggleRole(idx, 'C.L.'); }}
                           /> <span>C.L</span>
                         </label>
                       </div>
                     );
                   })()}
                   <button title="Remover" onClick={() => { setAssignedUsers(prev => prev.filter((_, i) => i !== idx)); }} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                 </div>
               ))}

               <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                 <select onChange={e => {
                   const uid = e.target.value;
                   if (!uid) return;
                   setAssignedUsers(prev => [...prev, { userId: uid, roles: [] }]);
                 }} style={{ flex: 1, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                   <option value="">Adicionar usuário...</option>
                   {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                 </select>
                 <div style={{ width: 120, color: '#666', alignSelf: 'center' }}>Funções</div>
               </div>
             </div>
           </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Nome do padre</div>
            <input value={priestName} onChange={e => setPriestName(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={submit} style={{ padding: '8px 14px' }}>Salvar evento</button>
            {id && (<button className="btn" onClick={remove} style={{ marginLeft: 8, background: '#ffffff', color: '#000000', border: '1px solid #e5e7eb' }}>🗑️ Apagar</button>)}
          </div>

        </div>
      </div>
    </div>
  );
}
