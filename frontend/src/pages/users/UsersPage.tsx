import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';

// pagination removed: always show all users

export default function UsersPage({ users, onCreated }: any) {
  const [query, setQuery] = useState('');
  const [ordered, setOrdered] = useState<any[]>(users || []);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    // initialize ordered list from prop, sorting by existing order then name
    const list = (users || []).slice().sort((a: any, b: any) => {
      const oa = typeof a.order === 'number' ? a.order : 0;
      const ob = typeof b.order === 'number' ? b.order : 0;
      if (oa !== ob) return oa - ob;
      return (a.name || '').localeCompare(b.name || '');
    });
    setOrdered(list);
  }, [users]);

  const filtered = useMemo(() => ordered.filter((u: any) => (u.name || '').toLowerCase().includes(query.toLowerCase())), [ordered, query]);
  const total = filtered.length;
  const visible = filtered;

  const handleDelete = async (id: string, e: any) => {
    e?.stopPropagation?.();
    if (!confirm('Remover este usuário?')) return;
    try {
      await axios.delete(`/users/${id}`);
      // remove from local ordered state and notify parent
      setOrdered(prev => prev.filter(u => u._id !== id));
      onCreated?.();
    } catch (err) {
      console.error('delete error', err);
      alert('Erro ao remover');
    }
  };

  const onDragStart = (e: any, id: string) => {
    setDraggedId(id);
    try { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
  };

  const onDragOver = (e: any, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  };

  const onDrop = async (e: any, id: string) => {
    e.preventDefault();
    const fromIdx = ordered.findIndex(u => u._id === draggedId);
    const toIdx = ordered.findIndex(u => u._id === id);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); setDragOverId(null); return; }
    const copy = ordered.slice();
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setOrdered(copy);
    setDraggedId(null);
    setDragOverId(null);
    // persist immediately
    try {
      const ids = copy.map(u => u._id);
      await axios.post('/users/reorder', { ids });
      onCreated?.();
    } catch (err) {
      console.error('auto-save order failed', err);
      alert('Erro ao salvar ordem automaticamente');
    }
  };

  const onDragEnd = () => { setDraggedId(null); setDragOverId(null); };

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
        <div style={{ width: 480, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="search-input" placeholder="Pesquisar usuários" value={query} onChange={e => { setQuery(e.target.value); }} />
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
                  <th>Observação</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u: any, idx: number) => (
                  <tr
                    key={u._id}
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragStart(e, u._id); }}
                    onDragOver={(e) => { e.stopPropagation(); onDragOver(e, u._id); }}
                    onDrop={(e) => { e.stopPropagation(); onDrop(e, u._id); }}
                    onDragEnd={() => onDragEnd()}
                    onClick={() => openEdit(u._id)}
                    style={{ cursor: draggedId === u._id ? 'grabbing' : 'grab', background: dragOverId === u._id ? '#f8fafc' : undefined }}
                  >
                    <td className="td-name">{idx + 1}. {u.name}</td>
                    <td className="td-sub" title={u.note || ''}>
                      {u.note ? (u.note.length > 80 ? u.note.slice(0,80) + '…' : u.note) : ('')}
                    </td>
                    <td className="td-actions">
                      <span style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="action-btn danger" title="Remover" onClick={(e) => handleDelete(u._id, e)}>🗑️</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          
        </div>
        <aside style={{ display: 'none' }} />
      </div>

      <button className="fab" aria-label="Adicionar usuário" onClick={openNew}>+</button>
    </div>
  );
}
