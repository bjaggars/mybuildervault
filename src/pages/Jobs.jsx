import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const STATUS_COLORS = {
  lead: ['#EAF2FF', '#1D4E89'], design: ['#F3E8FF', '#6B21A8'], contract: ['#FFF4DE', '#8A5A00'],
  permitting: ['#FFF4DE', '#8A5A00'], planned: ['#EAF2FF', '#1D4E89'], permitted: ['#E7F6EC', '#1F6B3A'],
  construction: ['#E7F6EC', '#1F6B3A'], listed: ['#EAF2FF', '#1D4E89'], under_contract: ['#FFF4DE', '#8A5A00'],
  closed_sold: ['#EEEEEA', '#5A6478'], warranty: ['#F3E8FF', '#6B21A8'], closed: ['#EEEEEA', '#5A6478'],
};
const input = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff' };

export default function Jobs({ orgId, role, personId }) {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [name, setName] = useState('');
  const [lifecycle, setLifecycle] = useState('custom');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const canWrite = ['owner', 'admin', 'pm', 'sales'].includes(role);

  const load = async () => {
    const { data } = await supabase.from('jobs')
      .select('id, name, lifecycle, status, updated_at')
      .eq('org_id', orgId).order('updated_at', { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { if (orgId) load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setErr('');
    if (!name.trim()) { setErr('Job name is required.'); return; }
    setBusy(true);
    // Client-generated UUID, no RETURNING — the RLS insert trap (LEARNINGS).
    const id = crypto.randomUUID();
    const { error } = await supabase.from('jobs').insert({
      id, org_id: orgId, name: name.trim(), lifecycle,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setName('');
    nav(`/jobs/${id}`);
  };

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div data-testid="jobs-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 14 }}>Jobs</div>

      {canWrite && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <input data-testid="job-name" style={{ ...input, width: 260 }} placeholder="New job name"
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
          <select data-testid="job-lifecycle" style={input} value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}>
            <option value="custom">custom</option>
            <option value="spec">spec</option>
          </select>
          <button data-testid="job-create" disabled={busy} onClick={create}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Creating…' : 'Create job'}
          </button>
          {err && <span style={{ fontSize: 13, color: 'var(--bad)' }}>{err}</span>}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
        {rows === null && <div style={{ padding: 18, color: 'var(--ink-soft)' }}>Loading…</div>}
        {rows?.length === 0 && (
          <div style={{ padding: 18, color: 'var(--ink-soft)', fontSize: 14 }}>
            No jobs yet. Every build starts as a job — spec or custom, one status engine.
          </div>
        )}
        {rows?.map((j) => {
          const [bg, fg] = STATUS_COLORS[j.status] ?? STATUS_COLORS.closed;
          return (
            <div key={j.id} data-testid="job-row" onClick={() => nav(`/jobs/${j.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{j.lifecycle} · updated {new Date(j.updated_at).toLocaleDateString()}</div>
              </div>
              <span style={{ background: bg, color: fg, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{j.status.replace('_', ' ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
