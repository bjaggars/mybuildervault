import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const STATUS_ORDER = ['lead','design','contract','permitting','planned','permitted',
                      'construction','listed','under_contract','closed_sold','warranty','closed'];
const STATUS_DOT = {
  lead: '#1D4E89', design: '#6B21A8', contract: '#8A5A00', permitting: '#8A5A00',
  planned: '#1D4E89', permitted: '#1F6B3A', construction: '#1F6B3A', listed: '#1D4E89',
  under_contract: '#8A5A00', closed_sold: '#5A6478', warranty: '#6B21A8', closed: '#5A6478',
};
const money = (n) => (n === null || n === undefined) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const card = {
  background: 'var(--cream-panel)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
};
const sectionTitle = {
  fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase',
  letterSpacing: 0.8, padding: '12px 16px 8px',
};

function Stat({ label, value, accent, to, testid }) {
  const nav = useNavigate();
  return (
    <div className="clickable" data-testid={testid} onClick={() => to && nav(to)}
      style={{ ...card, padding: '14px 18px', cursor: to ? 'pointer' : 'default', borderLeft: `3px solid ${accent ?? 'var(--gold)'}` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default function Dashboard({ orgId, orgName, role }) {
  const nav = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [conds, setConds] = useState([]);
  const [cos, setCos] = useState([]);
  const [tstats, setTstats] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const [{ data: j }, { data: b }, { data: c }, { data: o }, { data: t }] = await Promise.all([
        supabase.from('jobs').select('id, name, status, lifecycle').eq('org_id', orgId),
        supabase.from('v_job_budget').select('*').eq('org_id', orgId),
        supabase.from('conditions').select('id, text, type, trigger_date, status, jobs ( id, name )')
          .eq('org_id', orgId).in('status', ['open', 'triggered']).order('trigger_date', { ascending: true, nullsFirst: false }),
        supabase.from('change_orders').select('id, title, status, job_id, jobs ( name ), change_order_lines ( price )')
          .eq('org_id', orgId).in('status', ['tbd', 'discussed', 'considering']),
        supabase.from('v_ticket_stats').select('*').eq('org_id', orgId).maybeSingle(),
      ]);
      if (cancelled) return;
      setJobs(j ?? []); setBudgets(b ?? []); setConds(c ?? []); setCos(o ?? []); setTstats(t ?? {});
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const active = jobs.filter((j) => !['closed_sold', 'closed'].includes(j.status));
  const statusCounts = STATUS_ORDER.map((s) => [s, jobs.filter((j) => j.status === s).length]).filter(([, n]) => n > 0);
  const maxCount = Math.max(1, ...statusCounts.map(([, n]) => n));
  const inMotion = budgets
    .map((b) => ({ ...b, delta: (b.revised_price ?? 0) - (b.contract_baseline ?? 0) }))
    .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta));
  const triggered = conds.filter((c) => c.status === 'triggered');
  const coValue = (o) => (o.change_order_lines ?? []).reduce((s, l) => s + Number(l.price ?? 0), 0);

  return (
    <div style={{ flex: 1, padding: '22px 28px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div data-testid="dashboard-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{orgName ?? 'Dashboard'}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Your seat: {role ?? '…'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Stat testid="stat-active-jobs" label="Active jobs" value={active.length} accent="var(--gold)" to="/jobs" />
        <Stat testid="stat-open-tickets" label="Open tickets" value={tstats?.open_tickets ?? 0} accent="#1D4E89" to="/tickets" />
        <Stat testid="stat-awaiting-cos" label="COs awaiting decision" value={cos.length} accent="#8A5A00" to="/jobs" />
        <Stat testid="stat-conditions" label="Conditions watching" value={conds.length} accent={triggered.length ? 'var(--bad)' : '#1F6B3A'} to="/jobs" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 1.4fr', gap: 14, flex: 1, overflow: 'hidden' }}>
        {/* Pipeline */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={sectionTitle}>Pipeline — one engine, both funnels</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 14px' }}>
            {statusCounts.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No jobs yet.</div>}
            {statusCounts.map(([s, n]) => (
              <div key={s} className="clickable" onClick={() => nav('/jobs')}
                style={{ display: 'grid', gridTemplateColumns: '110px 1fr 24px', gap: 10, alignItems: 'center', padding: '7px 4px', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: STATUS_DOT[s], marginRight: 7 }} />
                  {s.replace('_', ' ')}
                </span>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--cream)', overflow: 'hidden' }}>
                  <div style={{ width: `${(n / maxCount) * 100}%`, height: '100%', background: STATUS_DOT[s], opacity: 0.75 }} />
                </div>
                <b style={{ fontSize: 13, color: 'var(--navy)', textAlign: 'right' }}>{n}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Money in motion */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={sectionTitle}>Money in motion</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 10px' }}>
            {inMotion.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '0 10px' }}>
                Appears when a job has an accepted contract — baseline, approved changes, and variance, computed live.
              </div>
            )}
            {inMotion.map((b) => (
              <div key={b.job_id} className="clickable" data-testid="motion-row" onClick={() => nav(`/jobs/${b.job_id}`)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px', gap: 10, alignItems: 'center', padding: '9px 10px', borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>baseline {money(b.contract_baseline)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', textAlign: 'right' }}>{money(b.revised_price)}</div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 6, padding: '2px 8px',
                    background: b.delta > 0 ? '#FBE9E9' : b.delta < 0 ? '#E7F6EC' : '#EEEEEA',
                    color: b.delta > 0 ? '#8F2730' : b.delta < 0 ? '#1F6B3A' : '#5A6478' }}>
                    {b.delta > 0 ? '+' : ''}{money(b.delta)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={sectionTitle}>Needs attention</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
            {conds.length === 0 && cos.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Clear board — no open conditions, no change orders waiting.</div>
            )}
            {conds.map((c) => (
              <div key={c.id} className="clickable" data-testid="attention-row" onClick={() => c.jobs && nav(`/jobs/${c.jobs.id}`)}
                style={{ borderLeft: `3px solid ${c.status === 'triggered' ? 'var(--bad)' : 'var(--warn)'}`, padding: '7px 10px', margin: '6px 0', background: '#fff', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600 }}>{c.text}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  {c.status === 'triggered' ? 'TRIGGERED' : c.type}
                  {c.trigger_date ? ` · ${new Date(c.trigger_date + 'T00:00:00').toLocaleDateString()}` : ''}
                  {c.jobs ? ` · ${c.jobs.name}` : ''}
                </div>
              </div>
            ))}
            {cos.map((o) => (
              <div key={o.id} className="clickable" onClick={() => nav(`/jobs/${o.job_id}`)}
                style={{ borderLeft: '3px solid var(--gold)', padding: '7px 10px', margin: '6px 0', background: '#fff', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600 }}>CO: {o.title} — {money(coValue(o))}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{o.status.replace('_', ' ')} · {o.jobs?.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
