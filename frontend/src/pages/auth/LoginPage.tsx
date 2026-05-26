import React, { useState } from 'react';

export default function LoginPage({ onLogin }: any) {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await onLogin(identity, password);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Falha no login';
      setErrorMsg(String(msg));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 48, lineHeight: '48px' }} aria-hidden>⛪</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 20 }}>Cerimoniários PNSG</h1>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 10, boxShadow: '0 12px 30px rgba(2,6,23,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Entrar</h2>
          <p style={{ color: '#64748b', marginBottom: 12 }}>Use email ou telefone e sua senha.</p>
          {errorMsg && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{errorMsg}</div>}
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Email ou telefone" className="input" value={identity} onChange={e => { setIdentity(e.target.value); setErrorMsg(null); }} />
              <input placeholder="Senha" type="password" className="input" value={password} onChange={e => { setPassword(e.target.value); setErrorMsg(null); }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
