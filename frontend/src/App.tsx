import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';

const modalStyle: React.CSSProperties = { position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.4)', zIndex: 200 };
const modalCard: React.CSSProperties = { background: '#fff', padding: 18, borderRadius: 8, width: '100%', maxWidth: 420 };

const metaEnv = (import.meta as any).env || {};
const apiBase = metaEnv.VITE_API_BASE ? metaEnv.VITE_API_BASE : (metaEnv.DEV ? 'http://localhost:4000/api' : '/api');
axios.defaults.baseURL = apiBase;

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState<string>(() => {
    const p = window.location.pathname.replace(/\/$/, '');
    if (p === '/login') return 'login';
    if (p === '' || p === '/') return 'dashboard';
    if (p === '/locations') return 'locations';
    if (p === '/users') return 'users';
    if (p === '/templates') return 'templates';
    if (p === '/templates/new') return 'template_new';
    if (p === '/templates/weekly') return 'templates_weekly';
    if (p === '/templates/monthly') return 'templates_monthly';
    if (p === '/agenda') return 'templates_agenda';
    if (p === '/agenda/new') return 'agenda_new';
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

  const [authUser, setAuthUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [dashboardEvents, setDashboardEvents] = useState<any[]>([]);

  // initialize authentication from sessionStorage (survive page reloads)
  useEffect(() => {
    const initAuth = async () => {
      const tok = sessionStorage.getItem('accessToken');
      if (!tok) {
        setAuthLoading(false);
        return;
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
      try {
        const r = await axios.get('/auth/me');
        // /auth/me may return the user directly or { user }
        const payload = r.data || {};
        const user = payload.user || payload;
        setAuthUser(user || null);
        setAccessToken(tok);
        setMustChangePassword(!!user?.mustChangePassword);
      } catch (err) {
        console.error('initAuth failed', err);
        sessionStorage.removeItem('accessToken');
        delete axios.defaults.headers.common['Authorization'];
        setAuthUser(null);
        setAccessToken(null);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  const handleLogin = async (identity: string, password: string) => {
    const res = await axios.post('/auth/login', { identity, password });
    const { accessToken: token, user, mustChangePassword } = res.data || {};
    if (token) {
      // persist for this tab/session
      sessionStorage.setItem('accessToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAccessToken(token);
    }
    setAuthUser(user || null);
    setMustChangePassword(!!mustChangePassword);
    navigate('/');
  };

  const handleLogout = async () => {
    try { await axios.post('/auth/logout'); } catch {}
    sessionStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
    setAuthUser(null);
    setAccessToken(null);
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
    } else if (normalized === '/agenda') {
      setPage('templates_agenda'); setCurrentId(null);
    } else if (normalized === '/agenda/new') {
      setPage('agenda_new'); setCurrentId(null);
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
      else if (p === '/locations') { setPage('locations'); setCurrentId(null); }
      else if (p === '/users') { setPage('users'); setCurrentId(null); }
      else if (p === '/templates') { setPage('templates'); setCurrentId(null); }
      else if (p === '/templates/new') { setPage('template_new'); setCurrentId(null); }
      else if (p === '/templates/weekly') { setPage('templates_weekly'); setCurrentId(null); }
      else if (p === '/templates/monthly') { setPage('templates_monthly'); setCurrentId(null); }
      else if (p === '/agenda') { setPage('templates_agenda'); setCurrentId(null); }
      else if (p === '/agenda/new') { setPage('agenda_new'); setCurrentId(null); }
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

  // load today's events for the dashboard filtered to the logged-in user
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
        const date = `${y}-${m}-${day}`;
        const res = await axios.get('/agenda-events', { params: { date } });
        const items = res.data || [];
        const mine = (items || []).filter((ev: any) => {
          const users = ev.users || [];
          return users.some((u: any) => String(u.userId?._id || u.userId) === String(authUser._id));
        });
        setDashboardEvents(mine);
      } catch (err) {
        console.error('load dashboard events', err);
        setDashboardEvents([]);
      }
    };
    fetchMyEvents();
  }, [authUser, page]);

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
      <header className="app-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(s => !s)} aria-label="Toggle menu">☰</button>
        <h1 className="app-title" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Cerimoniários PNSG</h1>
      </header>

      <div className="app-body">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="nav-btn" onClick={() => navigate('/locations')}>
                <span className="icon">⛪</span>
                <span className="label">Locais</span>
              </button>

              <button className="nav-btn" onClick={() => navigate('/users')}>
                <span className="icon">👥</span>
                <span className="label">Usuários</span>
              </button>

              <button className="nav-btn" onClick={() => navigate('/templates')}>
                <span className="icon">🗓️</span>
                <span className="label">Escalas</span>
              </button>
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

              {page === 'dashboard' && (
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ color: '#64748b', marginRight: 12 }}>Olá, {authUser?.name}</div>
                  <button className="btn secondary" onClick={handleLogout}>Sair</button>
                </div>
              )}

              {page === 'dashboard' && (
                <>
                  <section className="hero">
                    <h2>Dashboard</h2>
                    <p>Bem-vindo ao sistema de escalas — abaixo está sua escala para hoje.</p>
                  </section>

                  <section style={{ marginTop: 12 }}>
                    {dashboardEvents.length === 0 ? (
                      <div style={{ color: '#666' }}>Nenhuma escala hoje para você. <button className="btn" onClick={() => navigate('/agenda')} style={{ marginLeft: 8 }}>Ver agenda</button></div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {dashboardEvents.map(ev => {
                          const myUser = (ev.users || []).find((u: any) => String(u.userId?._id || u.userId) === String(authUser._id)) || {};
                          return (
                            <div key={ev._id} style={{ background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', gap: 12, alignItems: 'center' }}>
                              <div style={{ width: 90, fontWeight: 700 }}>{ev.time?.start || '—'}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{ev.title || (ev.locationId?.name || 'Local não informado')}</div>
                                <div style={{ color: '#666', fontSize: 13 }}>{ev.priestName ? `Padre: ${ev.priestName}` : ''} </div>
                                <div style={{ marginTop: 6, fontSize: 13 }}><strong>Suas funções:</strong> {(myUser.roles || []).join(', ') || '—'}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: 8 }}><button className="btn" onClick={() => navigate('/agenda')}>Ver agenda completa</button></div>
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
            </>
          )}
        </main>
      </div>

      <footer className="app-footer">© PNSG — Cerimoniários</footer>
    </div>
  );
}
