import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function LocationEditor({ id, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    axios.get(`/locations/${id}`).then(res => {
      if (!mounted) return;
      const data = res.data || {};
      setName(data.name || '');
      setDescription(data.description || '');
    }).catch(err => console.error('load location', err)).finally(() => setLoading(false));
    return () => { mounted = false };
  }, [id]);

  const close = () => {
    window.history.pushState({}, '', '/locations');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const submit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) await axios.post(`/locations/${id}`, { name, description });
      else await axios.post('/locations', { name, description });
      onSaved && onSaved();
      close();
    } catch (err) {
      console.error('save location', err);
      alert('Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Deseja realmente apagar este local?')) return;
    setDeleting(true);
    try {
      await axios.delete(`/locations/${id}`);
      onSaved && onSaved();
      close();
    } catch (err) {
      console.error('delete location', err);
      alert('Erro ao apagar');
    } finally { setDeleting(false); }
  };

  return (
    <div className="editor-page">
      <div className="editor-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
          <h3 style={{ margin:0 }}>{id ? 'Editar Local' : 'Adicionar Local'}</h3>
          <div>
            {id && <button className="btn secondary" onClick={handleDelete} disabled={deleting}>{deleting ? 'Apagando...' : 'Apagar'}</button>}
            <button className="btn" style={{ marginLeft: 8 }} onClick={close}>Fechar</button>
          </div>
        </div>

        {loading ? <div>Carregando...</div> : (
          <form onSubmit={submit}>
            <div className="form-row">
              <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required />
              <input className="input" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : (id ? 'Salvar' : 'Criar')}</button>
              <button type="button" className="btn secondary" onClick={() => { setName(''); setDescription(''); }}>Limpar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
