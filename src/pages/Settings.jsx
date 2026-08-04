import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ROLES = ['admin', 'pm', 'sales', 'super'];
const input = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff' };

export default function Settings({ orgId, role, session }) {
  const [roster, setRoster] = useState(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('pm');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const canInvite = role === 'owner' || role === 'admin';

  const load = async () => {
    const { data } = await supabase
      .from('org_members')
      .select('role, created_at, people ( id, full_name, email )')
      .eq('org_id', orgId).order('created_at', { ascending: true });
    setRoster(data ?? []);
  };
  useEffect(() => { if (orgId) load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const invite = async () => {
    setMsg(null);
    if (!email.trim()) { setMsg({ ok: false, text: 'Email is required.' }); return; }
    setBusy(true);
    try {
      const res = await fetch('/.netlify/functions/invite-member', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId, email: email.trim(), fullName: fullName.trim(), role: inviteRole }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error ?? `Invite failed (${res.status})`);
      setMsg({ ok: true, text: out.message ?? 'Invitation sent.' });
      setEmail(''); setFullName('');
      load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div data-testid="settings-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 14 }}>Settings · Team</div>

      {canInvite && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <input data-testid="invite-email" style={{ ...input, width: 230 }} placeholder="email@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input data-testid="invite-name" style={{ ...input, width: 180 }} placeholder="Full name (optional)"
            value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <select data-testid="invite-role" style={input} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button data-testid="invite-submit" disabled={busy} onClick={invite}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Inviting…' : 'Invite via magic link'}
          </button>
        </div>
      )}
      {msg && (
        <div data-testid="invite-result" style={{ marginBottom: 10, fontSize: 13, color: msg.ok ? 'var(--ok)' : 'var(--bad)' }}>{msg.text}</div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
        {roster === null && <div style={{ padding: 18, color: 'var(--ink-soft)' }}>Loading…</div>}
        {roster?.map((m) => (
          <div key={m.people?.id ?? m.created_at} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{m.people?.full_name || m.people?.email}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{m.people?.email}</div>
            </div>
            <span style={{ background: 'var(--navy)', color: 'var(--gold)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{m.role}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
        Client (homeowner) invitations arrive with job participants in Phase B — clients attach
        to jobs, never to the org roster.
      </div>
    </div>
  );
}
