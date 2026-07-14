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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
      handleCancel();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Deseja realmente excluir esta função?')) return;
    try {
      await axios.delete(`/role-functions/${editingId}`);
      handleCancel();
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
    if (!draggedId) return;

    const fromFunction = functions.find(f => f._id === draggedId);
    const toFunction = functions.find(f => f._id === id);

    if (!fromFunction || !toFunction || fromFunction.role !== toFunction.role) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const roleKey = fromFunction.role;
    const itemsForRole = functions.filter(f => f.role === roleKey);
    const otherItems = functions.filter(f => f.role !== roleKey);

    const fromIndex = itemsForRole.findIndex(f => f._id === draggedId);
    const toIndex = itemsForRole.findIndex(f => f._id === id);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const reorderedItems = [...itemsForRole];
    const [movedItem] = reorderedItems.splice(fromIndex, 1);
    reorderedItems.splice(toIndex, 0, movedItem);

    const newFunctions = [...otherItems, ...reorderedItems];
    setFunctions(newFunctions);

    setDraggedId(null);
    setDragOverId(null);

    try {
      const orderedIds = reorderedItems.map(f => f._id);
      await axios.put('/role-functions/reorder', { role: roleKey, orderedIds });
      fetchFunctions(); // a good practice to re-fetch to ensure consistency
    } catch (err) {
      console.error('Failed to reorder role functions', err);
      alert('Erro ao reordenar as funções.');
      fetchFunctions(); // revert on error
    }
  };

  const onDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (user?.role !== 'admin') {
    return <div className="page" style={{ padding: 24 }}>Acesso negado.</div>;
  }

  const grouped = functions.reduce((acc, fn) => {
    if (!acc[fn.role]) acc[fn.role] = [];
    acc[fn.role].push(fn);
    return acc;
  }, {} as any);

  const roleOrder = ["M.C.", "C.A.", "C.L.", "C.D."];
  const sortedRoles = Object.keys(grouped).sort((a, b) => {
    const indexA = roleOrder.indexOf(a);
    const indexB = roleOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 24, color: '#0f172a' }}>Funções (Checklist)</h2>

      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>{editingId ? 'Editar Função' : 'Nova Função'}</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: '#475569' }}>Papel (M.C., C.A., C.L., C.D.)</label>
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
              <option value="C.D.">C.D.</option>
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
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <div>
              <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Adicionar'}</button>
              {editingId && (
                <button type="button" className="btn secondary" onClick={handleCancel} style={{ marginLeft: 8 }}>Cancelar</button>
              )}
              {editingId && (
              <button type="button" className="btn danger" onClick={handleDelete}>Remover</button>
            )}
            </div>
          </div>
        </form>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sortedRoles.map(roleKey => (
            <div key={roleKey} style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
                {roleKey}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grouped[roleKey].map((fn: any) => (
                  <div
                    key={fn._id}
                    draggable
                    onDragStart={(e) => onDragStart(e, fn._id)}
                    onDragOver={(e) => onDragOver(e, fn._id)}
                    onDrop={(e) => onDrop(e, fn._id)}
                    onDragEnd={onDragEnd}
                    onClick={() => handleEdit(fn)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      background: dragOverId === fn._id ? '#f0f9ff' : '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      cursor: 'grab',
                      opacity: draggedId === fn._id ? 0.5 : 1,
                    }}
                  >
                    <span style={{ flex: 1 }}>{fn.task}</span>
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
