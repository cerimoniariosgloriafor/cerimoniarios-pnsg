import React, { useState } from 'react';
import axios from 'axios';

export default function LocationForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const submit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/locations', { name, description });
      setName(''); setDescription('');
      setSuccess('Local criado com sucesso');
      setTimeout(() => setSuccess(''), 2500);
      onCreated && onCreated();
    } catch (err) {
      console.error('create location error', err);
      alert('Erro ao criar local');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{ padding: 8 }}>
      <div className="form-row">
        <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required />
        <input className="input" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Local'}</button>
        <button type="button" className="btn secondary" onClick={() => { setName(''); setDescription(''); }}>Limpar</button>
      </div>
      {success && <div style={{ marginTop: 8, color: '#059669' }}>{success}</div>}
    </form>
  );
}
