import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LocationsPage from './pages/LocationsPage';
import UsersPage from './pages/UsersPage';
import LocationEditor from './pages/LocationEditor';
import UserEditor from './pages/UserEditor';

axios.defaults.baseURL = (import.meta as any).env?.DEV ? 'http://localhost:4000/api' : '/api';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState<string>(() => {
    const p = window.location.pathname.replace(/\/$/, '');
    if (p === '' || p === '/') return 'dashboard';
    if (p === '/locations') return 'locations';
    if (p === '/users') return 'users';
    if (p === '/templates') return 'templates';
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
    return null;
  });

  // navigate to a path and update history
  const navigate = (path: string) => {
    const normalized = path === '/' ? '/' : (path.startsWith('/') ? path : `/${path}`);
    window.history.pushState({}, '', normalized);

    // derive page and id from normalized
    if (normalized === '/' || normalized === '/dashboard') {
      setPage('dashboard'); setCurrentId(null);
    } else if (normalized === '/locations') { setPage('locations'); setCurrentId(null); }
    else if (normalized === '/users') { setPage('users'); setCurrentId(null); }
    else if (normalized === '/templates') { setPage('templates'); setCurrentId(null); }
    else if (normalized === '/locations/new') { setPage('location_new'); setCurrentId(null); }
    else if (normalized.startsWith('/locations/')) { setPage('location_edit'); setCurrentId(normalized.replace('/locations/', '')); }
    else if (normalized === '/users/new') { setPage('user_new'); setCurrentId(null); }
    else if (normalized.startsWith('/users/')) { setPage('user_edit'); setCurrentId(normalized.replace('/users/', '')); }
    else { setPage('dashboard'); setCurrentId(null); }

    // close sidebar on navigation (mobile UX)
    setSidebarOpen(false);
  };

  // support back/forward
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname.replace(/\/$/, '');
      if (p === '' || p === '/') { setPage('dashboard'); setCurrentId(null); }
      else if (p === '/locations') { setPage('locations'); setCurrentId(null); }
      else if (p === '/users') { setPage('users'); setCurrentId(null); }
      else if (p === '/templates') { setPage('templates'); setCurrentId(null); }
      else if (p === '/locations/new') { setPage('location_new'); setCurrentId(null); }
      else if (p.startsWith('/locations/')) { setPage('location_edit'); setCurrentId(p.replace('/locations/', '')); }
      else if (p === '/users/new') { setPage('user_new'); setCurrentId(null); }
      else if (p.startsWith('/users/')) { setPage('user_edit'); setCurrentId(p.replace('/users/', '')); }
      else { setPage('dashboard'); setCurrentId(null); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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

  const onSaved = async () => {
    await fetchData();
    navigate('/locations');
  };

  const onUserSaved = async () => {
    await fetchData();
    navigate('/users');
  };

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
          {page === 'dashboard' && (
            <>
              <section className="hero">
                <h2>Dashboard</h2>
                <p>Bem-vindo ao sistema de escalas — por enquanto o calendário estará vazio enquanto não criarmos templates.</p>
              </section>

              <section className="calendar-placeholder">
                <div className="cal-box">Calendário (em breve)</div>
              </section>
            </>
          )}

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
            <div>
              <h2>Escalas</h2>
              <p>Formulário de criação de escalas será implementado em breve.</p>
            </div>
          )}
        </main>
      </div>

      <footer className="app-footer">© PNSG — Cerimoniários</footer>
    </div>
  );
}
