import React, { useMemo, useState } from 'react';
import axios from 'axios';

const PAGE_SIZE = 8;

export default function UsersPage({ users, onCreated }: any) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => users.filter((u: any) => u.name.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: string, e: any) => {
    e?.stopPropagation?.();
    if (!confirm('Remover este usuário?')) return;
    try {
      await axios.delete(`/users/${id}`);
      onCreated?.();
    } catch (err) {
      console.error('delete error', err);
      alert('Erro ao remover');
    }
  };

  const openNew = () => {
    window.history.pushState({}, '', '/users/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openEdit = (id: string) => {
    window.history.pushState({}, '', `/users/${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Usuários</h2>
          <div className="result-count">{total} usuários</div>
        </div>
        <div style={{ width: 320 }}>
          <input className="search-input" placeholder="Pesquisar usuários" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div>
        <div>
          {total === 0 && <div className="empty">Nenhum usuário cadastrado</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th style={{ width: 140 }}>ID</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u: any) => (
                  <tr key={u._id} onClick={() => openEdit(u._id)} style={{ cursor: 'pointer' }}>
                    <td className="td-name">{u.name}</td>
                    <td className="td-sub">{u.email || '— sem email —'}</td>
                    <td className="td-id">{u._id?.slice?.(0,8)}</td>
                    <td className="td-actions">
                      <span style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="action-btn danger" title="Remover" onClick={(e) => handleDelete(u  ._id, e)}>🗑️</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination" style={{ marginTop: 18 }}>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} className={`page-btn ${page === i+1 ? 'active' : ''}`} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>Próxima</button>
            </div>
          </div>
        </div>
        <aside style={{ display: 'none' }} />
      </div>

      <button className="fab" aria-label="Adicionar usuário" onClick={openNew}>+</button>
    </div>
  );
}
