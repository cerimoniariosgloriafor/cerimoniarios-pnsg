import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PREDEFINED_COLORS = [
  { hex: '#b7e1cd', label: 'Verde Claro' },
  { hex: '#d9d2e9', label: 'Roxo Claro' },
  { hex: '#fef08a', label: 'Amarelo' },
  { hex: '#f4cccc', label: 'Vermelho Claro' },
  { hex: '#fce5cd', label: 'Laranja Claro' },
  { hex: '#c9daf8', label: 'Azul Centaúrea' },
  { hex: '#f1c232', label: 'Amarelo Escuro' },
  { hex: '#e2e8f0', label: 'Cinza' },
  { hex: '#bfdbfe', label: 'Azul' },
  { hex: '#bbf7d0', label: 'Verde' },
  { hex: '#fecaca', label: 'Vermelho' },
  { hex: '#fbcfe8', label: 'Rosa' },
];

export default function LocationEditor({ id, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [color, setColor] = useState('');
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
      setAddress(data.address || '');
      setColor(data.color || '');
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
      if (id) await axios.post(`/locations/${id}`, { name, description, address, color });
      else await axios.post('/locations', { name, description, address, color });
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
            <div className="form-row">
              <input className="input" placeholder="Endereço" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 8 }}>Cor do Local</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  title="Sem cor"
                  onClick={() => setColor('')}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: '2px solid #ddd',
                    background: '#fff', cursor: 'pointer',
                    outline: color === '' ? '2px solid #64748b' : 'none', outlineOffset: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <span style={{ color: '#aaa', fontSize: 18, lineHeight: 1 }}>⊘</span>
                </button>
                {PREDEFINED_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.hex)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)',
                      background: c.hex, cursor: 'pointer',
                      outline: color === c.hex ? '2px solid #64748b' : 'none', outlineOffset: 2
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : (id ? 'Salvar' : 'Criar')}</button>
              <button type="button" className="btn secondary" onClick={() => { setName(''); setDescription(''); setAddress(''); setColor(''); }}>Limpar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
