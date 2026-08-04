import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const wrap = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(160deg, var(--navy) 0%, var(--navy-deep) 100%)', padding: 24,
};
const card = {
  width: 380, maxWidth: '92vw', background: 'var(--cream-panel)', borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)', padding: '32px 30px 26px',
};
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', margin: '14px 0 5px' };
const input = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8,
  background: '#fff', color: 'var(--ink)',
};
const primary = {
  width: '100%', marginTop: 20, padding: '11px 0', border: 'none', borderRadius: 8,
  background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, letterSpacing: 0.3,
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  const signIn = async () => {
    setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  };

  const sendLink = async () => {
    if (!email) { setErr('Enter your email first, then request a sign-in link.'); return; }
    setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + '/' },
    });
    setBusy(false);
    if (error) setErr(error.message); else setLinkSent(true);
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--navy)" />
            <path d="M16 7 5 16h3v9h6v-6h4v6h6v-9h3z" fill="var(--gold)" />
          </svg>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>MyBuilderVault</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>The builder platform that includes the client</div>
          </div>
        </div>

        <label style={label} htmlFor="login-email">Email</label>
        <input id="login-email" data-testid="login-email" style={input} type="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={label} htmlFor="login-password">Password</label>
        <input id="login-password" data-testid="login-password" style={input} type="password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') signIn(); }} />

        {err && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--bad)' }}>{err}</div>}
        {linkSent && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ok)' }}>Sign-in link sent — check your email.</div>}

        <button data-testid="login-submit" style={{ ...primary, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={signIn}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          style={{ width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 13 }}
          disabled={busy} onClick={sendLink}>
          Email me a sign-in link instead
        </button>
      </div>
    </div>
  );
}
