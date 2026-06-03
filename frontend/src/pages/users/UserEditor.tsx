import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserEditor({ id, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [sacraments, setSacraments] = useState('');
  const [preferredCommunity, setPreferredCommunity] = useState('');
  const [otherPastorals, setOtherPastorals] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'servo' | 'admin'>('servo');
  const [mustChangePassword, setMustChangePassword] = useState(false);
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
      setFullName(data.fullName || '');
      setNote(data.note || '');
      setEmail(data.email || '');
      setPhone(formatPhone(data.phone || ''));
      setRole(data.role || 'servo');
      setBirthDate(data.birthDate ? new Date(data.birthDate).toISOString().slice(0,10) : '');
      setAddress(data.address || '');
      setProfession(data.profession || '');
      setSacraments((data.sacraments || []).join(', '));
      setPreferredCommunity(data.preferredCommunity || '');
      setOtherPastorals((data.otherPastorals || []).join(', '));
    }).catch(err => console.error('load user', err)).finally(() => setLoading(false));
    return () => { mounted = false };
  }, [id]);

  const close = () => {
    window.history.pushState({}, '', '/users');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const submit = async (e: any) => {
    e.preventDefault();

    if (!email && !phone) return alert('Informe email ou telefone');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email inválido');
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && phoneDigits.length !== 11) return alert('Telefone inválido: informe DDD + número (11 dígitos)');
    if (password) {
      if (password.length < 6) return alert('Senha muito curta (mínimo 6 caracteres)');
      if (password !== confirmPassword) return alert('Senhas não coincidem');
    }

    setSaving(true);
    try {
      const payload: any = { name, email, role };
      if (fullName) payload.fullName = fullName;
      if (note) payload.note = note;
      if (birthDate) payload.birthDate = birthDate;
      if (address) payload.address = address;
      if (profession) payload.profession = profession;
      if (sacraments) payload.sacraments = sacraments.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (preferredCommunity) payload.preferredCommunity = preferredCommunity;
      if (otherPastorals) payload.otherPastorals = otherPastorals.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (phone) payload.phone = phoneDigits;
      if (password) payload.password = password;
      if (mustChangePassword) payload.mustChangePassword = true;
      if (id) await axios.post(`/users/${id}`, payload);
      else await axios.post('/users', payload);
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

  const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  };

  const handlePhoneChange = (e: any) => {
    const raw = e.target.value;
    setPhone(formatPhone(raw));
  };

  return (
    <div className="editor-page">
      <div className="editor-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
          <h3 style={{ margin:0 }}>{id ? 'Editar Usuário' : 'Adicionar Usuário'}</h3>
        </div>

        {loading ? <div>Carregando...</div> : (
          <form onSubmit={submit}>
            <div className="form-row">
              <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required />
              <input className="input" placeholder="Nome completo" value={fullName} onChange={e => setFullName(e.target.value)} />
              <select className="input" value={role} onChange={e => setRole(e.target.value as any)}>
                <option value="servo">Servo</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-row">
              <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="input" placeholder="(00) 00000-0000" value={phone} onChange={handlePhoneChange} inputMode="numeric" maxLength={15} />
            </div>
            <div className="form-row">
              <input className="input" type="password" placeholder="Nova Senha" value={password} onChange={e => setPassword(e.target.value)} />
              <input className="input" type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Data de Nascimento</div>
            <div className="form-row">
              <input className="input" type="date" placeholder="Data de nascimento" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              <input className="input" placeholder="Endereço" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="form-row">
              <input className="input" placeholder="Profissão" value={profession} onChange={e => setProfession(e.target.value)} />
              <input className="input" placeholder="Comunidade(s) preferida(s)" value={preferredCommunity} onChange={e => setPreferredCommunity(e.target.value)} />
            </div>
            <div className="form-row">
              <input className="input" placeholder="Quais sacramentos possui" value={sacraments} onChange={e => setSacraments(e.target.value)} />
              <input className="input" placeholder="Outras pastorais" value={otherPastorals} onChange={e => setOtherPastorals(e.target.value)} />
            </div>
            <div className="form-row">
              <textarea className="input" placeholder="Observação" value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 80 }} />
            </div>
            {id && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={mustChangePassword} onChange={e => setMustChangePassword(e.target.checked)} />
                  <span>Exigir troca de senha no próximo login</span>
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : (id ? 'Salvar' : 'Criar')}</button>
              {id && <button type="button" className="btn secondary" onClick={handleDelete} disabled={deleting}>{deleting ? 'Apagando...' : 'Apagar'}</button>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
