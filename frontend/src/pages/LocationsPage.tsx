import React, { useMemo, useState } from 'react';
import axios from 'axios';

const PAGE_SIZE = 8;

export default function LocationsPage({ locations, onCreated }: any) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => locations.filter((l: any) => l.name.toLowerCase().includes(query.toLowerCase())), [locations, query]);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: string, e: any) => {
    e?.stopPropagation?.();
    if (!confirm('Remover este local?')) return;
    try {
      await axios.delete(`/locations/${id}`);
      onCreated?.();
    } catch (err) {
      console.error('delete error', err);
      alert('Erro ao remover');
    }
  };

  const openNew = () => {
    window.history.pushState({}, '', '/locations/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openEdit = (id: string) => {
    window.history.pushState({}, '', `/locations/${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Locais</h2>
          <div className="result-count">{total} locais</div>
        </div>
        <div style={{ width: 320 }}>
          <input className="search-input" placeholder="Pesquisar locais" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div>
        <div>
          {total === 0 && <div className="empty">Nenhum local cadastrado</div>}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th style={{ width: 140 }}>ID</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l: any) => (
                  <tr key={l._id} onClick={() => openEdit(l._id)} style={{ cursor: 'pointer' }}>
                    <td className="td-name">{l.name}</td>
                    <td className="td-sub">{l.description || '— sem descrição —'}</td>
                    <td className="td-id">{l._id?.slice?.(0,8)}</td>
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

      <button className="fab" aria-label="Adicionar local" onClick={openNew}>+</button>
    </div>
  );
}
