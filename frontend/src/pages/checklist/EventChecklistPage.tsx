import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface EventChecklistPageProps {
  id: string;
}

export default function EventChecklistPage({ id }: EventChecklistPageProps) {
  const [event, setEvent] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]); // Merged checklist with statuses
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchChecklistData = async () => {
      try {
        setLoading(true);
        const [eventRes, functionsRes] = await Promise.all([
          axios.get(`/agenda-events/${id}`),
          axios.get('/role-functions'),
        ]);
        const fetchedEvent = eventRes.data;
        const allRoleFunctions = functionsRes.data;
        setEvent(fetchedEvent);

        const myUserInEvent = fetchedEvent.users.find((u: any) => String(u.userId?._id || u.userId) === String(user?._id));
        const myRoles = myUserInEvent?.roles || [];

        const roleOrder = ["M.C.", "C.A.", "C.L.", "C.D."];
        const sortedMyRoles = myRoles.sort((a: string, b: string) => {
          const indexA = roleOrder.indexOf(a);
          const indexB = roleOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        
        const myFilteredFunctions = allRoleFunctions.filter((fn: any) => sortedMyRoles.includes(fn.role));

        // Merge fetched role functions with existing checklist statuses from the event
        const mergedChecklist = myFilteredFunctions.map((func: any) => {
          const existingItem = fetchedEvent.checklist.find((item: any) => item.role === func.role && item.task === func.task);
          return {
            ...func,
            status: existingItem ? existingItem.status : 'N/A', // Default to N/A if not found
          };
        });

        setChecklist(mergedChecklist);

      } catch (err) {
        console.error('Failed to fetch checklist data', err);
        alert('Erro ao carregar o checklist.');
      } finally {
        setLoading(false);
      }
    };
    if (user) { // Only fetch if user is defined
      fetchChecklistData();
    }
  }, [id, user]);

  const updateChecklistItem = async (itemToUpdate: any, newStatus: string) => {
    if (!user) return; // User must be logged in to update

    // Update local state immediately for responsiveness
    setChecklist(prevChecklist =>
      prevChecklist.map(item =>
        item._id === itemToUpdate._id
          ? { ...item, status: newStatus }
          : item
      )
    );

    try {
      await axios.put(`/agenda-events/${id}/checklist-status`, {
        role: itemToUpdate.role,
        task: itemToUpdate.task,
        status: newStatus,
        userId: user._id,
      });
      // Optionally, show a small toast notification for successful save
    } catch (err) {
      console.error('Failed to update checklist item status', err);
      alert('Erro ao salvar o status do item do checklist.');
      // Revert local state on error (or re-fetch data)
      // fetchChecklistData();
    }
  };

  if (loading) {
    return <div className="page" style={{ padding: 24, textAlign: 'center' }}>Carregando...</div>;
  }

  if (!event || !user) {
    return <div className="page" style={{ padding: 24, textAlign: 'center' }}>Evento ou usuário não encontrado.</div>;
  }

  const myUserInEvent = event.users.find((u: any) => String(u.userId?._id || u.userId) === String(user._id));
  const myRoles = myUserInEvent?.roles || [];

  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.role]) acc[item.role] = [];
    acc[item.role].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const roleOrder = ["M.C.", "C.A.", "C.L.", "C.D."];
  const sortedMyRoles = myRoles.sort((a: string, b: string) => {
    const indexA = roleOrder.indexOf(a);
    const indexB = roleOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 18, color: '#0f172a' }}>Check-list da Função</h2>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{event.title || 'Evento sem título'}</div>
        <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{event.locationId?.name}</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>{new Date(event.date).toLocaleDateString()} às {event.time?.start}</div>
      </div>

      {sortedMyRoles.length === 0 || checklist.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          Você não possui funções atribuídas para este evento ou não há itens no checklist para suas funções.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sortedMyRoles.map((role: string) => {
            if (!groupedChecklist[role] || groupedChecklist[role].length === 0) return null;
            return (
              <div key={role} style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
                  {role}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {groupedChecklist[role].map((item: any) => (
                    <div key={item._id} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 14, color: '#1e293b', marginBottom: 8 }}>{item.task}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <input
                            type="radio"
                            name={`checklist-${item._id}`}
                            checked={item.status === 'Sim'}
                            onChange={() => updateChecklistItem(item, 'Sim')}
                          /> Sim
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <input
                            type="radio"
                            name={`checklist-${item._id}`}
                            checked={item.status === 'Nao'}
                            onChange={() => updateChecklistItem(item, 'Nao')}
                          /> Não
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <input
                            type="radio"
                            name={`checklist-${item._id}`}
                            checked={item.status === 'N/A'}
                            onChange={() => updateChecklistItem(item, 'N/A')}
                          /> N/A
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
