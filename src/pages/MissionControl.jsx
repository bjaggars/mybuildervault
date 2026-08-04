import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Mission Control — founder console (JSH PATTERNS §4). Two core tabs:
// Quality (e2e_runs written by the robot via e2e-report) and Releases
// (release_approvals — the human gate made visible). Rendered only for
// platform staff; RLS enforces the same at the data layer, so a non-staff
// visitor who forces the route sees empty tables, not tenant data.
const tabBtn = (active) => ({
  padding: '8px 18px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
  background: active ? 'var(--gold)' : 'transparent',
  color: active ? 'var(--navy-deep)' : 'var(--ink-soft)', cursor: 'pointer',
});
const panel = {
  flex: 1, overflowY: 'auto', background: 'var(--cream-panel)',
  border: '1px solid var(--line)', borderRadius: 'var(--radius)',
};
const statusPill = (s) => ({
  background: s === 'pass' ? '#E7F6EC' : s === 'fail' ? '#FBE9E9' : '#FFF4DE',
  color: s === 'pass' ? '#1F6B3A' : s === 'fail' ? '#8F2730' : '#8A5A00',
  borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700,
});

export default function MissionControl() {
  const [tab, setTab] = useState('quality');
  const [runs, setRuns] = useState(null);
  const [approvals, setApprovals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: r }, { data: a }] = await Promise.all([
        supabase.from('e2e_runs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('release_approvals').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      setRuns(r ?? []);
      setApprovals(a ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const parseSummary = (s) => { try { return JSON.parse(s); } catch { return null; } };

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div data-testid="mc-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 12 }}>Mission Control</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button style={tabBtn(tab === 'quality')} data-testid="mc-tab-quality" onClick={() => setTab('quality')}>Quality</button>
        <button style={tabBtn(tab === 'releases')} data-testid="mc-tab-releases" onClick={() => setTab('releases')}>Releases</button>
      </div>

      {tab === 'quality' && (
        <div style={panel}>
          {runs === null && <div style={{ padding: 18, color: 'var(--ink-soft)' }}>Loading…</div>}
          {runs?.length === 0 && <div style={{ padding: 18, color: 'var(--ink-soft)', fontSize: 14 }}>No robot runs reported yet.</div>}
          {runs?.map((r) => {
            const sum = parseSummary(r.summary);
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
                <span style={statusPill(r.status)}>{r.status}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                    {r.branch} @ {r.sha}
                    {sum && <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}> — {sum.passed} passed{sum.failed ? `, ${sum.failed} failed` : ''}{sum.flaky ? `, ${sum.flaky} flaky` : ''} in {Math.round((sum.duration_ms ?? 0) / 1000)}s</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                {r.run_url && <a href={r.run_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>run ↗</a>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'releases' && (
        <div style={panel}>
          {approvals === null && <div style={{ padding: 18, color: 'var(--ink-soft)' }}>Loading…</div>}
          {approvals?.length === 0 && (
            <div style={{ padding: 18, color: 'var(--ink-soft)', fontSize: 14 }}>
              No releases yet. The first release ritual records its approval here
              (RELEASES.md notes → green Actions → DB change scripts on prod → merge → prod green).
            </div>
          )}
          {approvals?.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ background: 'var(--navy)', color: 'var(--gold)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{a.version}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>@ {a.sha} — approved by {a.approved_by}</div>
                {a.notes && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{a.notes}</div>}
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
