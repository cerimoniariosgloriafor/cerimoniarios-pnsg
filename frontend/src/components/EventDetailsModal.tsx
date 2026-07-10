import React, { useState } from 'react';
import axios from 'axios';

interface EventDetailsModalProps {
  event: any;
  authUser: any;
  users: any[];
  existingRequest?: any;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

export default function EventDetailsModal({ event, authUser, users, existingRequest, onClose, onRequestSubmitted }: EventDetailsModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'A' | 'B'>('A');
  const [substituteId, setSubstituteId] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const isActionable = () => {
    if (!event || !event.date) return false;

    const datePart = event.date.split('T')[0];
    const eventDate = new Date(datePart + 'T00:00:00');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msInDay = 1000 * 60 * 60 * 24;
    const diffInMs = today.getTime() - eventDate.getTime();
    const diffInDays = Math.floor(diffInMs / msInDay);

    return diffInDays < 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setReasonError(true);
      return;
    }

    setReasonError(false);
    setLoading(true);
    try {
      await axios.post('/substitution-requests', {
        eventId: event._id,
        originalUserId: authUser._id,
        substituteUserId: type === 'A' ? substituteId : null,
        reason: reason.trim()
      });
      alert('Solicitação enviada com sucesso!');
      shareOnWhatsApp(type, event, authUser, substituteId, users);
      onRequestSubmitted();
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!existingRequest) return;
    if (!window.confirm('Tem certeza que deseja cancelar sua solicitação de substituição?')) return;
    
    setLoading(true);
    try {
      await axios.post(`/substitution-requests/${existingRequest._id}/reject`);
      alert('Solicitação cancelada com sucesso!');
      onRequestSubmitted();
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const addr = event.locationId?.address || event.locationAddress || event.address;

  const handleCheckIn = async () => {
    if (!addr) {
      alert('Local não possui endereço cadastrado.');
      return;
    }
    const match = addr.match(/([-+]?\d{1,3}\.\d+)\s*,\s*([-+]?\d{1,3}\.\d+)/);
    if (!match) {
      alert('Endereço do local não possui coordenadas válidas (ex: -23.5505, -46.6333). Peça ao administrador para atualizar o endereço do local com as coordenadas exatas.');
      return;
    }
    const locLat = parseFloat(match[1]);
    const locLng = parseFloat(match[2]);

    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        // Haversine formula
        const R = 6371e3; // metres
        const lat1 = locLat * Math.PI/180;
        const lat2 = userLat * Math.PI/180;
        const dLat = (userLat-locLat) * Math.PI/180;
        const dLng = (userLng-locLng) * Math.PI/180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        if (distance > 500) {
          alert(`Você está a ${Math.round(distance)} metros do local. O check-in só é permitido a uma distância máxima de 500 metros.`);
          setLocLoading(false);
          return;
        }

        if (window.confirm('Deseja fazer o Check-In?')) {
          try {
            await axios.post(`/agenda-events/${event._id}/checkin`, { userId: authUser._id });
            alert('Check-in realizado com sucesso!');
            onRequestSubmitted();
            onClose();
            window.location.reload();
          } catch (err) {
            console.error(err);
            alert('Erro ao realizar check-in.');
          } finally {
            setLocLoading(false);
          }
        } else {
          setLocLoading(false);
        }
      },
      (error) => {
        let errorMsg = 'Não foi possível obter sua localização. Verifique as permissões do navegador.';
        if (error.code === error.PERMISSION_DENIED) errorMsg = 'Permissão de localização negada pelo usuário.';
        if (error.code === error.POSITION_UNAVAILABLE) errorMsg = 'Informação de localização indisponível.';
        if (error.code === error.TIMEOUT) errorMsg = 'Tempo limite esgotado ao buscar localização.';
        alert(errorMsg);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCancelCheckIn = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar seu Check-In?')) return;
    
    setLoading(true);
    try {
      await axios.post(`/agenda-events/${event._id}/cancel-checkin`, { userId: authUser._id });
      alert('Check-in cancelado com sucesso!');
      onRequestSubmitted();
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar check-in.');
    } finally {
      setLoading(false);
    }
  };

  const isEventPassed = () => {
    if (!event || !event.date || !event.time?.start) return false;
    
    const datePart = event.date.split('T')[0]; // "YYYY-MM-DD"
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = event.time.start.split(':').map(Number);
    const eventStart = new Date(year, month - 1, day, hour, minute, 0);
    const now = new Date();
    
    return now > eventStart;
  };

  const modalStyle: React.CSSProperties = { position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.4)', zIndex: 300, padding: 16 };
  const modalCard: React.CSSProperties = { background: '#fff', padding: 24, borderRadius: 12, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' };

  const myUser = (event.users || []).find((u: any) => String(u.userId?._id || u.userId) === String(authUser._id));
  const otherUsers = (event.users || []).filter((u: any) => String(u.userId?._id || u.userId) !== String(authUser._id));

  const openMaps = () => {
    if (!addr) return alert('Endereço não disponível');
    const q = encodeURIComponent(addr);
    try {
      if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
        window.location.href = `maps://maps.apple.com/?q=${q}`;
        setTimeout(() => { window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank'); }, 700);
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
      }
    } catch (err) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }
  };

  const shareOnWhatsApp = (type: 'A' | 'B', event: any, authUser: any, substituteId: string, users: any[]) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const weekdayOptions: Intl.DateTimeFormatOptions = { weekday: 'long' };
        const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

        let weekday = date.toLocaleDateString('pt-BR', weekdayOptions);
        weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1); // Capitalize first letter

        const datePart = date.toLocaleDateString('pt-BR', dateOptions);

        return `${weekday}, ${datePart}`;
    };

    const formattedDate = formatDate(event.date);
    const eventTime = event.time?.start || 'Horário não informado';
    const eventLocation = event.locationId?.name || event.locationAddress || 'Local não informado';
    const replacedUser = authUser.name;

    let message = `*AVISO DE SUBSTITUIÇÃO*\n\n`;
    message += `📅 Dia: ${formattedDate}\n`;
    message += `⏰ Horário: ${eventTime}\n`;
    message += `📍 Local: ${eventLocation}\n\n`;
    message += `👤 Substituído: ${replacedUser}\n`;

    if (type === 'A') {
        const substituteUser = users.find(u => String(u._id) === String(substituteId));
        message += `👤 Substituto: ${substituteUser?.name || 'Não informado'}\n\n`;
        message += `Pode confirmar se está ok pra você?\n\n{MARQUE OS COORDENADORES AQUI}\n\nObrigado! 🙏`;
    } else {
        message += `\nPRECISO DE AJUDA PARA ESTA ESCALA.\n\n`;
        message += `Por favor, entre em contato se puder ajudar.\n\nObrigado! 🙏`;
    }

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Detalhes da Escala</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{event.title || (event.locationId?.name || 'Local não informado')}</div>
          <div style={{ color: '#64748b', fontSize: 14 }}>
            {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time?.start || '—'}
          </div>
          {event.priestName && <div style={{ color: '#64748b', fontSize: 14 }}>Celebrante: {event.priestName}</div>}
          {event.locationId?.name && <div style={{ color: '#64748b', fontSize: 14 }}>Local: {event.locationId.name}</div>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, margin: '0 0 8px 0' }}>Minha Função</h3>
          <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, fontWeight: 500 }}>
            {myUser?.roles?.join(', ') || 'Nenhuma função'}
          </div>
        </div>

        {otherUsers.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 8px 0' }}>Outros Escalados</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#334155' }}>
              {otherUsers.map((u: any, i: number) => {
                const userId = u.userId?._id || u.userId;
                const userObj = users.find(x => String(x._id) === String(userId));
                return (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {userObj?.name || 'Desconhecido'} - <span style={{ color: '#64748b', fontSize: 13 }}>{u.roles?.join(', ')}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={openMaps}>
              Ver no Mapa
            </button>
            
            {myUser?.checkedInAt && (
              <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }} onClick={() => {
                window.history.pushState({}, '', `/agenda/${event._id}/report`);
                window.dispatchEvent(new PopStateEvent('popstate'));
                onClose();
              }}>
                Relatório da Missa
              </button>
            )}

            {myUser?.checkedInAt ? (
              <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 8, border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Check-In Realizado
                    </div>
                    <div style={{ fontSize: 13, color: '#065f46', marginTop: 4 }}>
                      Em {new Date(myUser.checkedInAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
                <button className="btn secondary" style={{ width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: '#ef4444', backgroundColor: 'transparent' }} onClick={handleCancelCheckIn} disabled={loading || !isActionable()}>
                  {loading ? 'Cancelando...' : 'Cancelar Check-In'}
                </button>
              </div>
            ) : existingRequest ? (
              <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#b45309' }}>Solicitação de Substituição Pendente</div>
                  <div style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
                    {existingRequest.substituteUserId 
                      ? `Você solicitou troca direta com ${existingRequest.substituteUserId.name || 'outro irmão'}. Aguardando aprovação.` 
                      : 'Você solicitou ajuda para esta escala. Aguardando voluntário ou aprovação.'}
                  </div>
                </div>
                <button className="btn secondary" style={{ width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: '#ef4444' }} onClick={handleCancelRequest} disabled={loading}>
                  {loading ? 'Cancelando...' : 'Cancelar Solicitação'}
                </button>
              </div>
            ) : (
              <>
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#10b981', borderColor: '#10b981', color: '#fff' }} onClick={handleCheckIn} disabled={locLoading || !isActionable()}>
                  {locLoading ? 'Verificando localização...' : 'Fazer Check-In'}
                </button>
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }} onClick={() => setShowForm(true)} disabled={locLoading || isEventPassed()}>
                  Não poderei ir / Solicitar Troca
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#fffbeb', padding: 16, borderRadius: 8, border: '1px solid #fde68a' }}>
            <h3 style={{ fontSize: 16, margin: '0 0 12px 0', color: '#b45309' }}>Solicitar Substituição</h3>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Tipo de Troca</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="radio" name="type" checked={type === 'A'} onChange={() => setType('A')} />
                  Já combinei com outro irmão (Troca Direta)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="radio" name="type" checked={type === 'B'} onChange={() => setType('B')} />
                  Não tenho substituto (Pedir Ajuda)
                </label>
              </div>
            </div>

            {type === 'A' && (
              <div className="form-group">
                <label>Selecione o Substituto</label>
                <select className="input" value={substituteId} onChange={e => setSubstituteId(e.target.value)} required>
                  <option value="">-- Selecione --</option>
                  {users.filter(u => {
                    if (String(u._id) === String(authUser._id)) return false;
                    if (u.archived) return false;
                    if (u.suspendedUntil && new Date(u.suspendedUntil) >= new Date(event.date)) return false;
                    return true;
                  }).sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Justificativa
              </label>
              <textarea
                className="input"
                rows={3}
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setReasonError(false);
                }}
                placeholder="Por que você precisa ser substituído?"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  ...(reasonError ? { borderColor: '#ef4444', outline: 'none', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : {})
                }}
              />
              {reasonError && (
                <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠ Por favor, informe o motivo da substituição.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowForm(false); setReasonError(false); setReason(''); }}>Cancelar</button>
              <button type="submit" className="btn" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
