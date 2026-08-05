import React, { useEffect, useMemo, useState } from 'react';
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
  const [comms, setComms] = useState([]);
  const [sLabel, setSLabel] = useState('');
  const [sKind, setSKind] = useState('house');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const canWrite = ['owner', 'admin', 'pm', 'sales'].includes(role);
  const canStructures = ['owner', 'admin', 'pm'].includes(role);

  const load = async () => {
    const [{ data: j }, { data: s }, { data: b }, { data: c }] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).maybeSingle(),
      supabase.from('structures').select('*').eq('job_id', jobId).order('sort'),
      supabase.from('v_job_budget').select('*').eq('job_id', jobId).maybeSingle(),
      supabase.from('comm_events').select('id, direction, subject, to_emails, from_email, created_at')
        .eq('job_id', jobId).order('created_at', { ascending: false }).limit(200),
    ]);
    setJob(j ?? false);
    setStructures(s ?? []);
    setBudget(b ?? null);
    setComms(c ?? []);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1.4, overflow: 'hidden', marginBottom: 16 }}>
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

      {/* Comms — the job's platform-email record (BOARD-007 rail) */}
      <CommsPanel comms={comms} card={card} input={input} />
    </div>
  );
}

/**
 * Comms panel — the recorded lane made visible. Columnar grid per design
 * law #15: click-to-sort on every header, a filter control per column,
 * one-click Clear. Rows are written by the rail (service role) only.
 */
function CommsPanel({ comms, card, input }) {
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' });
  const [f, setF] = useState({ date: '', direction: '', to: '', subject: '' });

  const rows = useMemo(() => {
    const shaped = comms.map((c) => ({
      ...c,
      date: new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      to: c.direction === 'inbound' ? (c.from_email ?? '—') : (c.to_emails ?? []).join(', '),
    }));
    const filtered = shaped.filter((r) =>
      (!f.date || r.date.toLowerCase().includes(f.date.toLowerCase()))
      && (!f.direction || r.direction === f.direction)
      && (!f.to || r.to.toLowerCase().includes(f.to.toLowerCase()))
      && (!f.subject || (r.subject ?? '').toLowerCase().includes(f.subject.toLowerCase())));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sort.key === 'created_at' ? a.created_at : String(a[sort.key] ?? '');
      const bv = sort.key === 'created_at' ? b.created_at : String(b[sort.key] ?? '');
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [comms, sort, f]);

  const clear = () => setF({ date: '', direction: '', to: '', subject: '' });
  const th = (key, label, flex) => (
    <button onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
      style={{ flex, textAlign: 'left', border: 'none', background: 'none', padding: '4px 6px',
               fontSize: 11.5, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </button>
  );
  const fi = { ...input, padding: '5px 8px', fontSize: 12 };
  const hasFilter = Object.values(f).some(Boolean);

  return (
    <div data-testid="comms-panel" style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Comms</div>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{rows.length} of {comms.length} platform emails on this job</span>
      </div>
      <div style={{ display: 'flex' }}>
        {th('created_at', 'Date', '0 0 150px')}{th('direction', 'Dir', '0 0 90px')}{th('to', 'To / From', '0 0 240px')}{th('subject', 'Subject', 1)}
      </div>
      <div style={{ display: 'flex', gap: 6, paddingBottom: 6, borderBottom: '2px solid var(--navy)' }}>
        <input style={{ ...fi, flex: '0 0 144px' }} placeholder="filter…" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <select style={{ ...fi, flex: '0 0 84px' }} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>
          <option value="">all</option><option value="outbound">outbound</option><option value="inbound">inbound</option>
        </select>
        <input style={{ ...fi, flex: '0 0 234px' }} placeholder="filter…" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <input style={{ ...fi, flex: 1 }} placeholder="filter…" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
        {hasFilter && <button onClick={clear} style={{ ...fi, flex: '0 0 auto', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, fontWeight: 700 }}>Clear</button>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {comms.length === 0 && (
          <div style={{ color: 'var(--ink-soft)', fontSize: 13, padding: '10px 6px' }}>
            No platform emails on this job yet. Sends, replies (via the relay), and BCC-captured
            mail all file here automatically — recording is structural, not a checkbox.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} data-testid="comm-row" style={{ display: 'flex', alignItems: 'center', padding: '7px 6px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
            <span style={{ flex: '0 0 150px', color: 'var(--ink-soft)' }}>{r.date}</span>
            <span style={{ flex: '0 0 90px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: r.direction === 'inbound' ? '#E7F0F9' : '#F4EDDA',
                color: r.direction === 'inbound' ? '#27567F' : '#7A6414' }}>{r.direction}</span>
            </span>
            <span style={{ flex: '0 0 240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.to}</span>
            <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
