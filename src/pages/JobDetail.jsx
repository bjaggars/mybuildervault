import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const STATUSES = ['lead','design','contract','permitting','planned','permitted',
                  'construction','listed','under_contract','closed_sold','warranty','closed'];
const STRUCTURE_KINDS = ['house','shop','garage','adu','barn','other'];
const input = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff' };
const card = {
  background: 'var(--cream-panel)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)', padding: '16px 18px',
};
const money = (n) => (n === null || n === undefined) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function JobDetail({ role, personId }) {
  const { jobId } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [structures, setStructures] = useState([]);
  const [budget, setBudget] = useState(null);
  const [sLabel, setSLabel] = useState('');
  const [sKind, setSKind] = useState('house');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const canWrite = ['owner', 'admin', 'pm', 'sales'].includes(role);
  const canStructures = ['owner', 'admin', 'pm'].includes(role);

  const load = async () => {
    const [{ data: j }, { data: s }, { data: b }] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).maybeSingle(),
      supabase.from('structures').select('*').eq('job_id', jobId).order('sort'),
      supabase.from('v_job_budget').select('*').eq('job_id', jobId).maybeSingle(),
    ]);
    setJob(j ?? false);
    setStructures(s ?? []);
    setBudget(b ?? null);
  };
  useEffect(() => { load(); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (to) => {
    setErr('');
    const from = job.status;
    const { error } = await supabase.from('jobs').update({ status: to }).eq('id', jobId);
    if (error) { setErr(error.message); return; }
    await supabase.from('job_events').insert({
      id: crypto.randomUUID(), job_id: jobId, kind: 'status_change',
      from_status: from, to_status: to, actor: personId,
    });
    load();
  };

  const addStructure = async () => {
    setErr('');
    if (!sLabel.trim()) { setErr('Structure label required.'); return; }
    setBusy(true);
    const { error } = await supabase.from('structures').insert({
      id: crypto.randomUUID(), job_id: jobId, kind: sKind,
      label: sLabel.trim(), sort: structures.length,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSLabel('');
    load();
  };

  if (job === null) return <div style={{ padding: 30, color: 'var(--ink-soft)' }}>Loading…</div>;
  if (job === false) return <div style={{ padding: 30, color: 'var(--ink-soft)' }}>Job not found.</div>;

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button onClick={() => nav('/jobs')} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: 13 }}>←</button>
        <div data-testid="job-detail-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{job.name}</div>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{job.lifecycle}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0 16px' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Status</span>
        {canWrite ? (
          <select data-testid="job-status" style={input} value={job.status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        ) : (
          <b style={{ color: 'var(--navy)' }}>{job.status.replace('_', ' ')}</b>
        )}
        {err && <span style={{ fontSize: 13, color: 'var(--bad)' }}>{err}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Structures */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>Structures</div>
          {canStructures && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input data-testid="structure-label" style={{ ...input, flex: 1 }} placeholder="Label (e.g. Main House)"
                value={sLabel} onChange={(e) => setSLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addStructure(); }} />
              <select data-testid="structure-kind" style={input} value={sKind} onChange={(e) => setSKind(e.target.value)}>
                {STRUCTURE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button data-testid="structure-add" disabled={busy} onClick={addStructure}
                style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700 }}>Add</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {structures.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>No structures yet — every job gets at least one (house, shop…). Financial lines carry structure scope.</div>}
            {structures.map((s) => (
              <div key={s.id} data-testid="structure-row" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{s.label}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{s.kind}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div style={{ ...card, overflowY: 'auto' }}>
          <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>Budget</div>
          {!budget && (
            <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
              No contract baseline yet. The budget appears when an estimate is accepted —
              baseline + approved change orders + allowance variance = revised price,
              computed by the database, never hand-maintained.
            </div>
          )}
          {budget && (
            <div style={{ fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>Contract baseline</span><b>{money(budget.contract_baseline)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>Approved change orders</span><b>{money(budget.approved_change_orders)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>Allowance variance</span><b>{money(budget.allowance_variance)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--navy)', marginTop: 6 }}>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>Revised price</span>
                <b data-testid="revised-price" style={{ color: 'var(--navy)' }}>{money(budget.revised_price)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--ink-soft)', fontSize: 12 }}>
                <span>Approved selections (informational)</span><span>{money(budget.approved_selections_total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
