import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import LocationsPage from './pages/locations/LocationsPage';
import UsersPage from './pages/users/UsersPage';
import LocationEditor from './pages/locations/LocationEditor';
import UserEditor from './pages/users/UserEditor';
import ShiftTemplatesPage from './pages/templates/ShiftTemplatesPage';
import ShiftTemplateEditor from './pages/templates/ShiftTemplateEditor';
import TemplatesWeeklyPage from './pages/templates/TemplatesWeeklyPage';
import TemplatesMonthlyPage from './pages/templates/TemplatesMonthlyPage';
import AgendaPage from './pages/templates/AgendaPage';
import AgendaEventEditor from './pages/templates/AgendaEventEditor';
import EventReportPage from './pages/dashboard/EventReportPage';
import MassReportPage from './pages/reports/MassReportPage';
import ReportsPage from './pages/reports/ReportsPage';
import IndividualReportPage from './pages/reports/IndividualReportPage';
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import RoleFunctionsPage from './pages/functions/RoleFunctionsPage';
import EventDetailsModal from './components/EventDetailsModal';
import logo from './assets/logo.png';

const modalStyle: React.CSSProperties = { position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.4)', zIndex: 200 };
const modalCard: React.CSSProperties = { background: '#fff', padding: 18, borderRadius: 8, width: '100%', maxWidth: 420 };

const metaEnv = (import.meta as any).env || {};
const apiBase = metaEnv.VITE_API_BASE ? metaEnv.VITE_API_BASE : (metaEnv.DEV ? 'http://localhost:4000/api' : '/api');
axios.defaults.baseURL = apiBase;

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth <= 600 : false));
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState<string>(() => {
    const p = window.location.pathname.replace(/\/$/, '');
    if (p === '/login') return 'login';
    if (p === '' || p === '/') return 'dashboard';
    if (p === '/profile') return 'profile';
    if (p === '/locations') return 'locations';
    if (p === '/users') return 'users';
    if (p === '/templates') return 'templates';
    if (p === '/templates/new') return 'template_new';
    if (p === '/templates/weekly') return 'templates_weekly';
    if (p === '/templates/monthly') return 'templates_monthly';
    if (p === '/reports') return 'reports_home';
    if (p === '/reports/masses') return 'reports_masses';
    if (p === '/reports/individual') return 'reports_individual';
    if (p === '/functions') return 'functions';
    if (p === '/agenda') return 'templates_agenda';
    if (p === '/agenda/new') return 'agenda_new';
    if (p.startsWith('/agenda/') && p.endsWith('/report')) return 'agenda_report';
    if (p.startsWith('/agenda/')) return 'agenda_edit';
    if (p.startsWith('/templates/')) return 'template_edit';
    if (p === '/locations/new') return 'location_new';
    if (p.startsWith('/locations/')) return 'location_edit';
    if (p === '/users/new') return 'user_new';
    if (p.startsWith('/users/')) return 'user_edit';
    return 'dashboard';
  });

  // we also keep the current resource id when editing
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const p = window.location.pathname.replace(/\/$/, '');
    const m1 = p.match(/^\/locations\/(.+)/);
    if (m1) return m1[1];
    const m2 = p.match(/^\/users\/(.+)/);
    if (m2) return m2[1];
    const m3 = p.match(/^\/templates\/(.+)/);
    if (m3) return m3[1];
    const m4 = p.match(/^\/agenda\/(.+)/);
    if (m4) return m4[1];
    return null;
  });

  const { user: authUser, loading: authLoading, mustChangePassword, login, logout, setUser, setMustChangePassword } = useAuth();
  const [dashboardEvents, setDashboardEvents] = useState<any[]>([]);
  const [substitutionRequests, setSubstitutionRequests] = useState<any[]>([]);
  const [selectedEventForModal, setSelectedEventForModal] = useState<any | null>(null);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecentEvents, setShowRecentEvents] = useState(false);
  const isServo = !!(authUser && authUser.role === 'servo');
  const isAdmin = !!(authUser && authUser.role === 'admin');

  const [dismissedBirthdays, setDismissedBirthdays] = useState<string[]>([]);

  useEffect(() => {
    if (authUser) {
      try {
        const stored = localStorage.getItem(`dismissedBirthdays_${authUser._id}`);
        if (stored) setDismissedBirthdays(JSON.parse(stored));
      } catch (e) {}
    }
  }, [authUser]);

  const handleDismissBirthday = (userId: string) => {
    const currentYear = new Date().getFullYear();
    const key = `${userId}_${currentYear}`;
    const newDismissed = [...dismissedBirthdays, key];
    setDismissedBirthdays(newDismissed);
    if (authUser) {
      localStorage.setItem(`dismissedBirthdays_${authUser._id}`, JSON.stringify(newDismissed));
    }
  };

  const today = new Date();
  const todayMMDD = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const currentYear = today.getFullYear();
  const activeBirthdays = users.filter(u => {
    if (!u.birthDate) return false;
    const mmdd = String(u.birthDate).slice(5, 10);
    return mmdd === todayMMDD && !dismissedBirthdays.includes(`${u._id}_${currentYear}`);
  });

  const handleDismissNotification = async (notifId: string) => {
    if (!authUser) return;
    try {
      await axios.post(`/users/${authUser._id}/notifications/${notifId}/dismiss`);
      const updatedUser = { ...authUser, notifications: (authUser.notifications || []).filter((n: any) => String(n._id) !== notifId) };
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to dismiss notification', err);
    }
  };

  const toLocalDateKey = (value: string | Date) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const shiftDateKey = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toLocalDateKey(d);
  };

  const handleLogin = async (identity: string, password: string) => {
    try {
      await login(identity, password);
      navigate('/');
    } catch (err) {
      console.error('login failed', err);
      throw err;
    }
  };

  const handleCheckIn = async (eventId: string) => {
    if (!authUser) return;
    try {
      const res = await axios.post(`/agenda-events/${eventId}/checkin`, { userId: authUser._id });
      if (res.data.success) {
        setDashboardEvents(prev => prev.map(ev => {
          if (ev._id === eventId) {
            return {
              ...ev,
              users: ev.users.map((u: any) => {
                if (String(u.userId?._id || u.userId) === String(authUser._id)) {
                  return { ...u, checkedInAt: res.data.checkedInAt };
                }
                return u;
              })
            };
          }
          return ev;
        }));
      }
    } catch (err) {
      console.error('checkin failed', err);
      alert('Erro ao realizar check-in');
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  // navigate to a path and update history
  const navigate = (path: string) => {
    const normalized = path === '/' ? '/' : (path.startsWith('/') ? path : `/${path}`);
    window.history.pushState({}, '', normalized);

    // derive page and id from normalized
    if (normalized === '/login') {
      setPage('login'); setCurrentId(null);
    } else if (normalized === '/' || normalized === '/dashboard') {
      setPage('dashboard'); setCurrentId(null);
    } else if (normalized === '/profile') {
      setPage('profile'); setCurrentId(null);
    } else if (normalized === '/locations') {
      setPage('locations'); setCurrentId(null);
    } else if (normalized === '/users') {
      setPage('users'); setCurrentId(null);
    } else if (normalized === '/templates') {
      setPage('templates'); setCurrentId(null);
    } else if (normalized === '/templates/new') {
      setPage('template_new'); setCurrentId(null);
    } else if (normalized === '/templates/weekly') {
      setPage('templates_weekly'); setCurrentId(null);
    } else if (normalized === '/templates/monthly') {
      setPage('templates_monthly'); setCurrentId(null);
    } else if (normalized === '/reports') {
      setPage('reports_home'); setCurrentId(null);
    } else if (normalized === '/reports/masses') {
      setPage('reports_masses'); setCurrentId(null);
    } else if (normalized === '/reports/individual') {
      setPage('reports_individual'); setCurrentId(null);
    } else if (normalized === '/functions') {
      setPage('functions'); setCurrentId(null);
    } else if (normalized === '/agenda') {
      setPage('templates_agenda'); setCurrentId(null);
    } else if (normalized === '/agenda/new') {
      setPage('agenda_new'); setCurrentId(null);
    } else if (normalized.startsWith('/agenda/') && normalized.endsWith('/report')) {
      setPage('agenda_report'); setCurrentId(normalized.split('/')[2]);
    } else if (normalized.startsWith('/agenda/')) {
      setPage('agenda_edit'); setCurrentId(normalized.replace('/agenda/', ''));
    } else if (normalized.startsWith('/templates/')) {
      setPage('template_edit'); setCurrentId(normalized.replace('/templates/', ''));
    } else if (normalized === '/locations/new') {
      setPage('location_new'); setCurrentId(null);
    } else if (normalized.startsWith('/locations/')) {
      setPage('location_edit'); setCurrentId(normalized.replace('/locations/', ''));
    } else if (normalized === '/users/new') {
      setPage('user_new'); setCurrentId(null);
    } else if (normalized.startsWith('/users/')) {
      setPage('user_edit'); setCurrentId(normalized.replace('/users/', ''));
    } else {
      setPage('dashboard'); setCurrentId(null);
    }

    // close sidebar on navigation (mobile UX)
    setSidebarOpen(false);
  };

  // support back/forward
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname.replace(/\/$/, '');
      if (p === '/login') { setPage('login'); setCurrentId(null); return; }
      if (p === '' || p === '/') { setPage('dashboard'); setCurrentId(null); }
      else if (p === '/profile') { setPage('profile'); setCurrentId(null); }
      else if (p === '/locations') { setPage('locations'); setCurrentId(null); }
      else if (p === '/users') { setPage('users'); setCurrentId(null); }
      else if (p === '/templates') { setPage('templates'); setCurrentId(null); }
      else if (p === '/templates/new') { setPage('template_new'); setCurrentId(null); }
      else if (p === '/templates/weekly') { setPage('templates_weekly'); setCurrentId(null); }
      else if (p === '/templates/monthly') { setPage('templates_monthly'); setCurrentId(null); }
      else if (p === '/reports') { setPage('reports_home'); setCurrentId(null); }
      else if (p === '/reports/masses') { setPage('reports_masses'); setCurrentId(null); }
      else if (p === '/reports/individual') { setPage('reports_individual'); setCurrentId(null); }
      else if (p === '/agenda') { setPage('templates_agenda'); setCurrentId(null); }
      else if (p === '/agenda/new') { setPage('agenda_new'); setCurrentId(null); }
      else if (p.startsWith('/agenda/') && p.endsWith('/report')) { setPage('agenda_report'); setCurrentId(p.split('/')[2]); }
      else if (p.startsWith('/agenda/')) { setPage('agenda_edit'); setCurrentId(p.replace('/agenda/', '')); }
      else if (p.startsWith('/templates/')) { setPage('template_edit'); setCurrentId(p.replace('/templates/', '')); }
      else if (p === '/locations/new') { setPage('location_new'); setCurrentId(null); }
      else if (p.startsWith('/locations/')) { setPage('location_edit'); setCurrentId(p.replace('/locations/', '')); }
      else if (p === '/users/new') { setPage('user_new'); setCurrentId(null); }
      else if (p.startsWith('/users/')) { setPage('user_edit'); setCurrentId(p.replace('/users/', '')); }
      else { setPage('dashboard'); setCurrentId(null); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!authLoading && !authUser && page !== 'login') {
      navigate('/login');
    }
  }, [authLoading, authUser, page]);

  const fetchData = async () => {
    try {
      const [locRes, usrRes] = await Promise.all([
        axios.get('/locations'),
        axios.get('/users')
      ]);
      setLocations(locRes.data || []);
      setUsers(usrRes.data || []);
    } catch (err) {
      console.error('fetchData error', err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onSaved = async () => { await fetchData(); navigate('/locations'); };
  const onUserSaved = async () => { await fetchData(); navigate('/users'); };

  useEffect(() => {
    if (!authUser || page !== 'dashboard') {
      setDashboardEvents([]);
      setSubstitutionRequests([]);
      return;
    }
    const fetchDashboardData = async () => {
      try {
        const startDate = shiftDateKey(-3);
        
        const [evRes, reqRes] = await Promise.all([
          axios.get('/agenda-events', { params: { startDate } }),
          axios.get('/substitution-requests')
        ]);

        const items = evRes.data || [];
        const mine = (items || []).filter((ev: any) => {
          const users = ev.users || [];
          return users.some((u: any) => String(u.userId?._id || u.userId) === String(authUser._id));
        });
        
        // Sort by date then by time
        mine.sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const timeA = a.time?.start || '00:00';
          const timeB = b.time?.start || '00:00';
          return timeA.localeCompare(timeB);
        });
        
        setDashboardEvents(mine);

        const now = new Date();
        const validRequests = (reqRes.data || []).filter((req: any) => {
          if (!req.eventId || !req.eventId.date) return false;
          const dateStr = String(req.eventId.date).substring(0, 10);
          const [yStr, mStr, dStr] = dateStr.split('-');
          const eventDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
          if (req.eventId.time && req.eventId.time.start) {
            const [hours, minutes] = req.eventId.time.start.split(':');
            eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          } else {
            eventDate.setHours(23, 59, 59, 999);
          }
          return eventDate >= now;
        });
        setSubstitutionRequests(validRequests);
      } catch (err) {
        console.error('load dashboard data', err);
        setDashboardEvents([]);
        setSubstitutionRequests([]);
      }
    };
    fetchDashboardData();
  }, [authUser, page]);

  const handleApproveRequest = async (reqId: string, substituteUserId?: string) => {
    try {
      await axios.post(`/substitution-requests/${reqId}/approve`, { substituteUserId });
      alert('Solicitação aprovada e escala atualizada!');
      window.location.reload();
    } catch (err) {
      alert('Erro ao aprovar solicitação');
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    try {
      await axios.post(`/substitution-requests/${reqId}/reject`);
      alert('Solicitação recusada!');
      window.location.reload();
    } catch (err) {
      alert('Erro ao recusar solicitação');
    }
  };

  const handleTakeShift = async (reqId: string) => {
    if (!window.confirm('Tem certeza que deseja assumir esta escala? Ela será enviada para aprovação.')) return;
    try {
      await axios.post(`/substitution-requests/${reqId}/volunteer`, { substituteUserId: authUser?._id });
      alert('Solicitação de voluntariado enviada! Aguardando aprovação.');
      window.location.reload();
    } catch (err) {
      alert('Erro ao assumir escala');
    }
  };

  // if showing the login page and not authenticated, render only the login card
  if (page === 'login' && !authLoading && !authUser) {
    return (
      <div className="app-root">
        <main className="app-main">
          <LoginPage onLogin={handleLogin} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="menu-btn" onClick={() => setSidebarOpen(s => !s)} aria-label="Toggle menu">☰</button>
          <h1 className="app-title" style={{ cursor: 'pointer', margin: 0 }} onClick={() => navigate('/')}>Cerimoniários PNSG</h1>
        </div>
        {authUser && authUser.notifications && authUser.notifications.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button 
              className="menu-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative', fontSize: 24, cursor: 'pointer' }}
              aria-label="Notificações"
            >
              🔔
              <span style={{ position: 'absolute', top: -2, right: -4, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 'bold', padding: '2px 6px', borderRadius: 10 }}>
                {authUser.notifications.length}
              </span>
            </button>
            {showNotifications && (
              <div style={{ position: 'absolute', right: 0, top: 40, width: 300, background: '#fff', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, border: '1px solid #e2e8f0', color: '#1e293b' }}>
                <div style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Notificações</div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {authUser.notifications.map((n: any) => (
                    <div key={n._id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 14 }}>{n.message}</div>
                      <button onClick={() => handleDismissNotification(n._id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }} aria-label="Descartar">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="app-body">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`} style={{ width: sidebarOpen && isMobile ? '90%' : undefined }}>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <img src={logo} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 6 }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Sistema Cerimoniários</div>
                  {authUser && (
                    <div style={{ marginTop: 4, color: '#64748b', fontWeight: 600, fontSize: 13 }}>{authUser.name}</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="nav-btn" onClick={() => navigate('/profile')}>
                <span className="icon">👤</span>
                <span className="label">Meu Perfil</span>
              </button>

              {!isServo && (
                <>
                  <button className="nav-btn" onClick={() => navigate('/locations')}>
                    <span className="icon">⛪</span>
                    <span className="label">Locais</span>
                  </button>

                  <button className="nav-btn" onClick={() => navigate('/users')}>
                    <span className="icon">👥</span>
                    <span className="label">Usuários</span>
                  </button>

                  <button className="nav-btn" onClick={() => navigate('/functions')}>
                    <span className="icon">⚙️</span>
                    <span className="label">Funções</span>
                  </button>

                  <button className="nav-btn" onClick={() => navigate('/reports')}>
                    <span className="icon">📊</span>
                    <span className="label">Relatórios</span>
                  </button>
                </>
              )}

              <button className="nav-btn" onClick={() => navigate('/templates')}>
                <span className="icon">🗓️</span>
                <span className="label">Escalas</span>
              </button>
            </div>

            <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid #eee' }}>
              {authUser && (
                <button className="nav-btn" onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <span className="icon">🚪</span>
                  <span className="label">Sair</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="app-overlay"
            onClick={() => setSidebarOpen(false)}
            onTouchStart={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <main className="app-main">
          {authLoading ? <div>Carregando sessão...</div> : null}

          {!authLoading && authUser && (
            <>
              {mustChangePassword && <ChangePasswordModal onDone={() => setMustChangePassword(false)} />}

              {page === 'profile' && (
                <UserEditor id={authUser._id} isProfile={true} isAdmin={isAdmin} onSaved={() => fetchData()} />
              )}

              {page === 'dashboard' && (
                <>
                  <section className="hero">
                    <h2>Dashboard</h2>
                    <p>Bem-vindo ao sistema de escalas — abaixo estão seus próximos serviços.</p>
                  </section>

                  {activeBirthdays.length > 0 && (
                    <div style={{ margin: '16px 0', padding: 16, backgroundColor: '#fdf4ff', border: '1px solid #fbcfe8', borderRadius: 8 }}>
                      <h3 style={{ margin: '0 0 12px 0', color: '#be185d', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🎉</span> Aniversariantes do Dia
                      </h3>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {activeBirthdays.map(u => {
                          const isMe = authUser && String(u._id) === String(authUser._id);
                          return (
                            <div key={u._id} style={{ position: 'relative', background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #fce7f3', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div style={{ paddingRight: 24 }}>
                                <div style={{ fontWeight: 600 }}>{isMe ? `Hoje é seu aniversário, ${u.name}! Parabéns! 🥳` : `Hoje é aniversário do ${u.name}!`}</div>
                                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{isMe ? 'Que Deus abençoe e ilumine o seu dia.' : 'Deseje a ele um feliz aniversário.'}</div>
                              </div>
                              <button onClick={() => handleDismissBirthday(u._id)} style={{ position: 'absolute', top: 8, right: 4, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, padding: '4px', lineHeight: 1 }} aria-label="Descartar">×</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isAdmin && substitutionRequests.filter(r => r.status === 'PENDING').length > 0 && (
                    <div style={{ margin: '16px 0', padding: 16, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                      <h3 
                        style={{ margin: '0', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => setShowPendingRequests(!showPendingRequests)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🔔</span> Solicitações de Troca Pendentes ({substitutionRequests.filter(r => r.status === 'PENDING').length})
                        </div>
                        <span>{showPendingRequests ? '▲' : '▼'}</span>
                      </h3>
                      {showPendingRequests && (
                        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                          {substitutionRequests.filter(r => r.status === 'PENDING').map(req => (
                            <div key={req._id} style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>{req.originalUserId?.name} quer ser substituído por {req.substituteUserId?.name}</div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>
                                  Escala: {req.eventId?.title || req.eventId?.locationId?.name} - {new Date(req.eventId?.date).toLocaleDateString('pt-BR')} às {req.eventId?.time?.start}
                                </div>
                                {isAdmin && req.reason && <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>"{req.reason}"</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApproveRequest(req._id)}>Aprovar</button>
                                <button className="btn secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleRejectRequest(req._id)}>Recusar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(!authUser?.archived && (!authUser?.suspendedUntil || new Date(authUser.suspendedUntil) < new Date())) && substitutionRequests.filter(r => r.status === 'OPEN').length > 0 && (
                    <div style={{ margin: '16px 0', padding: 16, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                      <h3 style={{ margin: '0 0 12px 0', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🤝</span> Escalas Precisando de Ajuda
                      </h3>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {substitutionRequests.filter(r => r.status === 'OPEN').map(req => {
                          const isMine = String(req.originalUserId?._id || req.originalUserId) === String(authUser._id);
                          return (
                            <div key={req._id} style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>{req.originalUserId?.name} precisa de um substituto</div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>
                                  Escala: {req.eventId?.title || req.eventId?.locationId?.name} - {new Date(req.eventId?.date).toLocaleDateString('pt-BR')} às {req.eventId?.time?.start}
                                </div>
                                {isAdmin && req.reason && <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>"{req.reason}"</div>}
                              </div>
                              {!isMine && (
                                <button className="btn" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => handleTakeShift(req._id)}>Eu posso assumir</button>
                              )}
                              {isMine && <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Aguardando voluntário...</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {authUser?.suspendedUntil && new Date(authUser.suspendedUntil) > new Date() && (
                    <div style={{ margin: '16px 0', padding: 16, backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: 8, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>⛔</span>
                      <div>
                        <strong>Você está suspenso até o dia {new Date(authUser.suspendedUntil).toLocaleDateString('pt-BR')}</strong>
                        <div style={{ fontSize: 13, marginTop: 4 }}>Durante este período, você foi removido de todas as escalas e não poderá ser escalado.</div>
                      </div>
                    </div>
                  )}

                  <section style={{ marginTop: 12 }}>
                    {(() => {
                      const todayStr = toLocalDateKey(new Date());
                      const groupedEvents = dashboardEvents.reduce((acc: any, ev: any) => {
                        const dateStr = toLocalDateKey(ev.date);
                        if (!acc[dateStr]) acc[dateStr] = [];
                        acc[dateStr].push(ev);
                        return acc;
                      }, {});

                      const renderGroupedEvents = (dateKeys: string[], muted = false) => dateKeys.map(dateStr => {
                        const [y, m, d] = dateStr.split('-');
                        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                        const parts = new Intl.DateTimeFormat('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }).formatToParts(dateObj);
                        const weekdayLong = (parts.find(p => p.type === 'weekday')?.value || '');
                        const day = parts.find(p => p.type === 'day')?.value || '';
                        const month = parts.find(p => p.type === 'month')?.value || '';
                        const year = parts.find(p => p.type === 'year')?.value || '';
                        const weekdayShort = weekdayLong.replace(/-feira/gi, '').replace(/ feira/gi, '').replace(/feira/gi, '');
                        const weekdayCap = weekdayShort ? (weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1)) : '';
                        const isToday = todayStr === dateStr;

                        return (
                          <div key={dateStr} style={{ background: muted ? '#f8fafc' : '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', opacity: muted ? 0.96 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                              <div style={{ background: isToday ? '#2563eb' : '#475569', color: '#fff', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', minWidth: 64 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{day}</div>
                                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, marginTop: 2, opacity: 0.9 }}>{month}/{year.slice(2)}</div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{weekdayCap}</div>
                                {isToday && <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 14 }}>Hoje</div>}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gap: 12 }}>
                              {(groupedEvents[dateStr] || []).map((ev: any) => {
                                const myUser = (ev.users || []).find((u: any) => String(u.userId?._id || u.userId) === String(authUser._id)) || {};
                                const colorMap: any = { verde: '#16a34a', branco: '#e5e7eb', roxo: '#7c3aed', vermelho: '#dc2626' };
                                const borderColor = ev.color ? (colorMap[ev.color] || ev.color) : null;
                                return (
                                  <div key={ev._id} style={{ position: 'relative' }}>
                                    <div
                                      onClick={() => setSelectedEventForModal(ev)}
                                      style={{
                                        background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', gap: 12, alignItems: 'center', borderLeft: borderColor ? `9px solid ${borderColor}` : '1px solid #e2e8f0',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <div style={{ width: 60, fontWeight: 700, fontSize: 16, color: '#334155' }}>{ev.time?.start || '—'}</div>
                                      <div style={{ flex: 1, borderLeft: '1px solid #f1f5f9', paddingLeft: 12 }}>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{ev.title || (ev.locationId?.name || 'Local não informado')}</div>
                                        <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{ev.locationId?.name ? `${ev.locationId?.name}` : ''} </div>
                                        <div style={{ color: '#64748b', fontSize: 13 }}>{ev.priestName ? `Presidida por ${ev.priestName}` : ''} </div>
                                        <div style={{ marginTop: 6, fontSize: 13 }}>
                                          <span style={{ background: '#e0e7ff', color: '#0f172a', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                                            {(myUser.roles || []).join(', ') || 'Sem função'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });

                      const upcomingKeys = Object.keys(groupedEvents).filter(dateStr => dateStr >= todayStr).sort();
                      const recentKeys = Object.keys(groupedEvents).filter(dateStr => dateStr < todayStr).sort().reverse();

                      if (upcomingKeys.length === 0 && recentKeys.length === 0) {
                        return (
                          <div style={{ color: '#666' }}>
                            Nenhuma escala para você nos próximos dias.
                            <button className="btn" onClick={() => navigate('/agenda')} style={{ marginLeft: 8 }}>Ver agenda</button>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                          {recentKeys.length > 0 && (
                            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 16 }}>
                              <button
                                type="button"
                                onClick={() => setShowRecentEvents(v => !v)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: '#9a3412'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                  <span>🕓</span>
                                  <span>Últimos 3 dias</span>
                                  <span style={{ fontWeight: 600, color: '#c2410c' }}>({recentKeys.length})</span>
                                </div>
                                <span>{showRecentEvents ? '▲' : '▼'}</span>
                              </button>
                              {showRecentEvents && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                                  {renderGroupedEvents(recentKeys, true)}
                                </div>
                              )}
                            </div>
                          )}

                          {upcomingKeys.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {renderGroupedEvents(upcomingKeys)}
                            </div>
                          )}

                          <div style={{ marginTop: 8 }}><button className="btn secondary" onClick={() => navigate('/agenda')} style={{ width: '100%', justifyContent: 'center' }}>Ver agenda completa</button></div>
                        </div>
                      );
                    })()}
                  </section>
                  
                  {selectedEventForModal && (
                    <EventDetailsModal 
                      event={selectedEventForModal} 
                      authUser={authUser} 
                      users={users} 
                      existingRequest={substitutionRequests.find(r => 
                        (r.status === 'PENDING' || r.status === 'OPEN') && 
                        String(r.eventId?._id || r.eventId) === String(selectedEventForModal._id) && 
                        String(r.originalUserId?._id || r.originalUserId) === String(authUser._id)
                      )}
                      onClose={() => setSelectedEventForModal(null)}
                      onRequestSubmitted={() => {
                        window.location.reload();
                      }}
                    />
                  )}
                </>
              )}

              {/* rest of routes unchanged, render only when authenticated */}
              {page === 'locations' && (
                <LocationsPage locations={locations} onCreated={fetchData} />
              )}

              {page === 'users' && (
                <UsersPage users={users} onCreated={fetchData} />
              )}

              {page === 'functions' && (
                <RoleFunctionsPage />
              )}

              {page === 'reports_home' && (
                <ReportsPage
                  onOpenConsolidated={() => navigate('/reports/masses')}
                  onOpenIndividual={() => navigate('/reports/individual')}
                />
              )}

              {page === 'reports_masses' && (
                <MassReportPage onBack={() => navigate('/reports')} />
              )}

              {page === 'reports_individual' && (
                <IndividualReportPage onBack={() => navigate('/reports')} />
              )}

              {page === 'location_new' && (
                <LocationEditor onSaved={onSaved} />
              )}

              {page === 'location_edit' && currentId && (
                <LocationEditor id={currentId} onSaved={onSaved} />
              )}

              {page === 'user_new' && (
                <UserEditor onSaved={onUserSaved} />
              )}

              {page === 'user_edit' && currentId && (
                <UserEditor id={currentId} onSaved={onUserSaved} />
              )}

              {page === 'templates' && (
                <ShiftTemplatesPage />
              )}

              {page === 'template_new' && (
                <ShiftTemplateEditor onSaved={() => { fetchData(); }} />
              )}

              {page === 'template_edit' && currentId && (
                <ShiftTemplateEditor id={currentId} onSaved={() => { fetchData(); }} />
              )}

              {page === 'templates_weekly' && (
                <TemplatesWeeklyPage />
              )}

              {page === 'templates_monthly' && (
                <TemplatesMonthlyPage />
              )}

              {page === 'templates_agenda' && (
                <AgendaPage />
              )}
              {page === 'agenda_new' && (
                <AgendaEventEditor />
              )}
              {page === 'agenda_edit' && currentId && (
                <AgendaEventEditor id={currentId} />
              )}
              {page === 'agenda_report' && currentId && (
                <EventReportPage id={currentId} onBack={() => navigate('/')} />
              )}
            </>
          )}
        </main>
      </div>

      <footer className="app-footer">© PNSG — Cerimoniários</footer>
    </div>
  );
}
