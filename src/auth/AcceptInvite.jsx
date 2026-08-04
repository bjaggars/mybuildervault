import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function AcceptInvite({ session }) {
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // The Supabase invite / magic link deposits a session via the URL hash;
  // supabase-js processes it automatically (detectSessionInUrl). If no
  // session materialized, the link is expired or already used.
  if (session === null) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>Invite link expired</div>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
            This invitation link is no longer valid. Ask your builder admin to send a fresh one,
            or return to the <a href="/" style={{ color: 'var(--gold)' }}>sign-in page</a>.
          </p>
        </div>
      </div>
    );
  }
  if (!session) return null;

  const finish = async () => {
    setErr('');
    if (password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: fullName ? { full_name: fullName } : undefined,
    });
    if (!error && fullName) {
      await supabase.from('people').update({ full_name: fullName }).eq('id', session.user.id);
    }
    setBusy(false);
    if (error) { setErr(error.message); return; }
    nav('/', { replace: true });
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>Welcome to MyBuilderVault</div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
          You&rsquo;re signed in as <b>{session.user.email}</b>. Set your name and a password to finish.
        </p>
        <label style={label} htmlFor="accept-name">Full name</label>
        <input id="accept-name" data-testid="accept-name" style={input}
          value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label style={label} htmlFor="accept-password">Choose a password</label>
        <input id="accept-password" data-testid="accept-password" style={input} type="password" autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--bad)' }}>{err}</div>}
        <button data-testid="accept-submit" disabled={busy} onClick={finish}
          style={{ width: '100%', marginTop: 20, padding: '11px 0', border: 'none', borderRadius: 8, background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Saving…' : 'Enter MyBuilderVault'}
        </button>
      </div>
    </div>
  );
}
