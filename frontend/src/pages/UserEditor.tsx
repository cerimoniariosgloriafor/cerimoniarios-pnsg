import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserEditor({ id, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    axios.get(`/users/${id}`).then(res => {
      if (!mounted) return;
      const data = res.data || {};
      setName(data.name || '');
      setEmail(data.email || '');
    }).catch(err => console.error('load user', err)).finally(() => setLoading(false));
    return () => { mounted = false };
  }, [id]);

  const close = () => {
    window.history.pushState({}, '', '/users');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const submit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) await axios.post(`/users/${id}`, { name, email });
      else await axios.post('/users', { name, email });
      onSaved && onSaved();
      close();
    } catch (err) {
      console.error('save user', err);
      alert('Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Deseja realmente apagar este usuário?')) return;
    setDeleting(true);
    try {
      await axios.delete(`/users/${id}`);
      onSaved && onSaved();
      close();
    } catch (err) {
      console.error('delete user', err);
      alert('Erro ao apagar');
    } finally { setDeleting(false); }
  };

  return (
    <div className="editor-page">
      <div className="editor-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
          <h3 style={{ margin:0 }}>{id ? 'Editar Usuário' : 'Adicionar Usuário'}</h3>
          <div>
            {id && <button className="btn secondary" onClick={handleDelete} disabled={deleting}>{deleting ? 'Apagando...' : 'Apagar'}</button>}
            <button className="btn" style={{ marginLeft: 8 }} onClick={close}>Fechar</button>
          </div>
        </div>

        {loading ? <div>Carregando...</div> : (
          <form onSubmit={submit}>
            <div className="form-row">
              <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required />
              <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : (id ? 'Salvar' : 'Criar')}</button>
              <button type="button" className="btn secondary" onClick={() => { setName(''); setEmail(''); }}>Limpar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
