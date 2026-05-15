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

  // navigate to a path and update history
  const navigate = (path: string) => {
    const normalized = path === '/' ? '/' : (path.startsWith('/') ? path : `/${path}`);
    window.history.pushState({}, '', normalized);

    // derive page and id from normalized
    if (normalized === '/' || normalized === '/dashboard') { setPage('dashboard'); setCurrentId(null); }
    else if (normalized === '/locations') { setPage('locations'); setCurrentId(null); }
    else if (normalized === '/users') { setPage('users'); setCurrentId(null); }
    else if (normalized === '/templates') { setPage('templates'); setCurrentId(null); }
    else if (normalized === '/templates/new') { setPage('template_new'); setCurrentId(null); }
    else if (normalized === '/templates/weekly') { setPage('templates_weekly'); setCurrentId(null); }
    else if (normalized === '/templates/monthly') { setPage('templates_monthly'); setCurrentId(null); }
    else if (normalized === '/agenda') { setPage('templates_agenda'); setCurrentId(null); }
    else if (normalized === '/agenda/new') { setPage('agenda_new'); setCurrentId(null); }
    else if (normalized.startsWith('/agenda/')) { setPage('agenda_edit'); setCurrentId(normalized.replace('/agenda/', '')); }
    else if (normalized.startsWith('/templates/')) { setPage('template_edit'); setCurrentId(normalized.replace('/templates/', '')); }
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
            <AgendaEventEditor predate={null} />
          )}
          {page === 'agenda_edit' && currentId && (
            <AgendaEventEditor id={currentId} />
          )}
        </main>
      </div>

      <footer className="app-footer">© PNSG — Cerimoniários</footer>
    </div>
  );
}
