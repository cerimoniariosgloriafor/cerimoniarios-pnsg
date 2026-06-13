import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function RoleFunctionsPage() {
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [task, setTask] = useState('');
  const { user } = useAuth();
  
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);

  useEffect(() => {
    fetchFunctions();
  }, []);

  const fetchFunctions = async () => {
    try {
      const res = await axios.get('/role-functions');
      setFunctions(res.data);
    } catch (err) {
      console.error('Failed to fetch role functions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/role-functions/${editingId}`, { role, task });
      } else {
        await axios.post('/role-functions', { role, task });
      }
      setRole('');
      setTask('');
      setEditingId(null);
      fetchFunctions();
    } catch (err) {
      console.error('Failed to save role function', err);
      alert('Erro ao salvar a função');
    }
  };

  const handleEdit = (fn: any) => {
    setEditingId(fn._id);
    setRole(fn.role);
    setTask(fn.task);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta função?')) return;
    try {
      await axios.delete(`/role-functions/${id}`);
      fetchFunctions();
    } catch (err) {
      console.error('Failed to delete role function', err);
      alert('Erro ao excluir a função');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setRole('');
    setTask('');
  };

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

  if (user?.role !== 'admin') {
    return <div className="page" style={{ padding: 24 }}>Acesso negado.</div>;
  }

  const grouped = functions.reduce((acc, fn) => {
    if (!acc[fn.role]) acc[fn.role] = [];
    acc[fn.role].push(fn);
    return acc;
  }, {} as any);

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 24, color: '#0f172a' }}>Funções (Checklist)</h2>

      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>{editingId ? 'Editar Função' : 'Nova Função'}</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: '#475569' }}>Papel (M.C., C.A., C.L.)</label>
            <select
              className="input"
              value={role}
              onChange={e => setRole(e.target.value)}
              required
            >
              <option value="">Selecione um papel</option>
              <option value="M.C.">M.C.</option>
              <option value="C.A.">C.A.</option>
              <option value="C.L.">C.L.</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: '#475569' }}>Tarefa</label>
            <textarea
              className="input"
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="Ex: Verificar Missal"
              required
              rows={3}
              style={{ resize: 'both', fontFamily: 'inherit', minWidth: '100%', maxWidth: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Adicionar'}</button>
            {editingId && (
              <button type="button" className="btn secondary" onClick={handleCancel}>Cancelar</button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.keys(grouped).sort().map(roleKey => (
            <div key={roleKey} style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
                {roleKey}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grouped[roleKey].map((fn: any) => (
                  <div key={fn._id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
                    <div
                      onTouchStart={(e) => handleTouchStart(e, fn._id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onPointerDown={(e) => handlePointerDown(e, fn._id)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
                        transform: swipedId === fn._id ? 'translateX(-140px)' : 'translateX(0)',
                        transition: 'transform 180ms ease-out',
                        touchAction: 'pan-y',
                        userSelect: 'none'
                      }}
                    >
                      <span style={{ flex: 1 }}>{fn.task}</span>
                      <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }} aria-hidden>‹‹</span>
                    </div>
                    {swipedId === fn._id && (
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
                        <button className="btn secondary" onClick={() => { handleEdit(fn); setSwipedId(null); }} style={{ padding: '4px 8px', fontSize: 12 }}>Editar</button>
                        <button className="btn danger" onClick={() => { handleDelete(fn._id); setSwipedId(null); }} style={{ padding: '4px 8px', fontSize: 12 }}>Excluir</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {functions.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>Nenhuma função cadastrada.</div>
          )}
        </div>
      )}
    </div>
  );
}
