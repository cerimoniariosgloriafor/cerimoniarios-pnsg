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
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import RoleFunctionsPage from './pages/functions/RoleFunctionsPage';
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const isServo = !!(authUser && authUser.role === 'servo');
  const isAdmin = !!(authUser && authUser.role === 'admin');

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
        setSwipedId(null);
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

  // load today's and upcoming events for the dashboard filtered to the logged-in user
  useEffect(() => {
    if (!authUser || page !== 'dashboard') {
      setDashboardEvents([]);
      return;
    }
    const fetchMyEvents = async () => {
      try {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const startDate = `${y}-${m}-${day}`;
        const res = await axios.get('/agenda-events', { params: { startDate } });
        const items = res.data || [];
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
      } catch (err) {
        console.error('load dashboard events', err);
        setDashboardEvents([]);
      }
    };
    fetchMyEvents();
  }, [authUser, page]);

  const handleTouchStart = (e: any, id: string) => {
    setTouchStartX(e.touches?.[0]?.clientX ?? null);
    setDraggingId(id);
  };

  const handleTouchMove = (e: any) => {
    if (!draggingId || touchStartX === null) return;
    const x = e.touches?.[0]?.clientX ?? null;
    if (x === null) return;
    const dx = x - touchStartX;
    if (dx < -40) setSwipedId(draggingId);
    if (dx > 40) setSwipedId(null);
  };

  const handleTouchEnd = () => { setTouchStartX(null); setDraggingId(null); };

  const handlePointerDown = (e: any, id: string) => {
    // support mouse and stylus
    setPointerStartX(e.clientX ?? null);
    setDraggingId(id);
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch (err) {}
  };

  const handlePointerMove = (e: any) => {
    if (!draggingId || pointerStartX === null) return;
    const x = e.clientX ?? null;
    if (x === null) return;
    const dx = x - pointerStartX;
    if (dx < -40) setSwipedId(draggingId);
    if (dx > 40) setSwipedId(null);
  };

  const handlePointerUp = (e?: any) => {
    setPointerStartX(null);
    setDraggingId(null);
    try { (e?.target as Element)?.releasePointerCapture?.(e?.pointerId); } catch (err) {}
  };

  const openMaps = (address?: string) => {
    if (!address) return alert('Endereço não disponível');
    const q = encodeURIComponent(address);
    // try Apple Maps first (iOS), then fallback to Google Maps
    // Using location href for native maps; also open Google Maps after short delay as fallback
    try {
      window.location.href = `maps://maps.apple.com/?q=${q}`;
      setTimeout(() => { window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank'); }, 700);
    } catch (err) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
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
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="menu-btn" onClick={() => setSidebarOpen(s => !s)} aria-label="Toggle menu">☰</button>
          <h1 className="app-title" style={{ cursor: 'pointer', margin: 0 }} onClick={() => navigate('/')}>Cerimoniários PNSG</h1>
        </div>
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
                    {dashboardEvents.length === 0 ? (
                      <div style={{ color: '#666' }}>Nenhuma escala para você nos próximos dias. <button className="btn" onClick={() => navigate('/agenda')} style={{ marginLeft: 8 }}>Ver agenda</button></div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {(() => {
                          const grouped = dashboardEvents.reduce((acc: any, ev: any) => {
                            const dateStr = new Date(ev.date).toISOString().slice(0, 10);
                            if (!acc[dateStr]) acc[dateStr] = [];
                            acc[dateStr].push(ev);
                            return acc;
                          }, {});
                          
                          return Object.keys(grouped).sort().map(dateStr => {
                            const [y, m, d] = dateStr.split('-');
                            const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                            const parts = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(dateObj);
                            const weekdayLong = (parts.find(p => p.type === 'weekday')?.value || '');
                            const day = parts.find(p => p.type === 'day')?.value || '';
                            const month = parts.find(p => p.type === 'month')?.value || '';
                            const year = parts.find(p => p.type === 'year')?.value || '';
                            const weekdayShort = weekdayLong.replace(/-feira/gi, '').replace(/ feira/gi, '').replace(/feira/gi, '');
                            const weekdayCap = weekdayShort ? (weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1)) : '';
                            
                            const isToday = new Date().toISOString().slice(0, 10) === dateStr;
                            
                            return (
                              <div key={dateStr} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
                                  {grouped[dateStr].map((ev: any) => {
                                    const myUser = (ev.users || []).find((u: any) => String(u.userId?._id || u.userId) === String(authUser._id)) || {};
                                    const colorMap: any = { verde: '#16a34a', branco: '#e5e7eb', roxo: '#7c3aed', vermelho: '#dc2626' };
                                    const borderColor = ev.color ? (colorMap[ev.color] || ev.color) : null;
                                    const addr = ev.locationId?.address || ev.locationAddress || ev.address;
                                    return (
                                      <div key={ev._id} style={{ position: 'relative' }}>
                                        <div
                                          onTouchStart={(e) => handleTouchStart(e, ev._id)}
                                          onTouchMove={(e) => handleTouchMove(e)}
                                          onTouchEnd={() => handleTouchEnd()}
                                          onPointerDown={(e) => handlePointerDown(e, ev._id)}
                                          onPointerMove={(e) => handlePointerMove(e)}
                                          onPointerUp={(e) => handlePointerUp(e)}
                                          style={{
                                            background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', gap: 12, alignItems: 'center', borderLeft: borderColor ? `9px solid ${borderColor}` : '1px solid #e2e8f0',
                                            transform: swipedId === ev._id ? 'translateX(-190px)' : 'translateX(0)', transition: 'transform 180ms ease-out', touchAction: 'pan-y', userSelect: 'none'
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
                                          <div style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold' }} aria-hidden>‹‹</div>
                                        </div>
                                        {swipedId === ev._id && (
                                          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
                                            {myUser.checkedInAt ? (
                                              <button className="btn" style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }} onClick={() => { navigate('/agenda/' + ev._id + '/report'); setSwipedId(null); }}>✅ Feito</button>
                                            ) : (
                                              <button className="btn secondary" onClick={() => handleCheckIn(ev._id)}>Check-in</button>
                                            )}
                                            <button className="btn" onClick={() => { openMaps(addr); setSwipedId(null); }}>Mapa</button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                        <div style={{ marginTop: 8 }}><button className="btn secondary" onClick={() => navigate('/agenda')} style={{ width: '100%', justifyContent: 'center' }}>Ver agenda completa</button></div>
                      </div>
                    )}
                  </section>
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
