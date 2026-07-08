import React, { useEffect, useRef, useState } from 'react';

export default function UserMultiSelect({ users, value = [], onChange }: any) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v: string) => v !== id));
    else onChange([...(value || []), id]);
  };

  const filtered = users
    .filter((u: any) => !u.archived && u.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <div className="multi-select" ref={ref}>
      <div className={`multi-select__control ${open ? 'open' : ''}`} onClick={() => setOpen(s => !s)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
        <div className="multi-select__value">
          {(value || []).length === 0 ? (
            <span className="multi-select__placeholder">Selecionar cerimoniários</span>
          ) : (
            <div className="multi-select__chips">
              {(value || []).map((id: string) => {
                const u = users.find((x: any) => x._id === id) || { name: id };
                return <span key={id} className="chip">{u.name}</span>;
              })}
            </div>
          )}
        </div>
        <div className="multi-select__arrow">▾</div>
      </div>

      {open && (
        <div className="multi-select__dropdown">
          <div style={{ padding: 8 }}>
            <input className="search-input" placeholder="Filtrar..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <div className="multi-select__list">
            {filtered.length === 0 && <div className="empty" style={{ padding: 8 }}>Nenhum usuário</div>}
            {filtered.map((u: any) => (
              <div key={u._id} className={`multi-select__item ${value.includes(u._id) ? 'selected' : ''}`} onClick={() => toggle(u._id)}>
                <div>{u.name}</div>
                <div style={{ opacity: value.includes(u._id) ? 1 : 0.2 }}>{value.includes(u._id) ? '✓' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
