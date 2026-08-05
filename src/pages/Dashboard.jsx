import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CATALOG, PERSONA_DEFAULTS, ROLE_PERSONA, card, sectionTitle } from '../dashboard/widgets.jsx';

const STATUS_ORDER = ['lead','design','contract','permitting','planned','permitted',
                      'construction','listed','under_contract','closed_sold','warranty','closed'];
const STATUS_DOT = {
  lead: '#1D4E89', design: '#6B21A8', contract: '#8A5A00', permitting: '#8A5A00',
  planned: '#1D4E89', permitted: '#1F6B3A', construction: '#1F6B3A', listed: '#1D4E89',
  under_contract: '#8A5A00', closed_sold: '#5A6478', warranty: '#6B21A8', closed: '#5A6478',
};
const money = (n) => (n === null || n === undefined) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });


function Stat({ label, value, accent, to, onOpen, testid }) {
  const nav = useNavigate();
  const clickable = to || onOpen;
  return (
    <div className="clickable" data-testid={testid} onClick={() => onOpen ? onOpen() : (to && nav(to))}
      style={{ ...card, padding: '14px 18px', cursor: clickable ? 'pointer' : 'default', borderLeft: `3px solid ${accent ?? 'var(--gold)'}` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function Drawer({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,74,0.35)', zIndex: 50 }} />
      <div data-testid="detail-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '92vw',
        background: 'var(--cream-panel)', borderLeft: '1px solid var(--line)', boxShadow: '-6px 0 24px rgba(28,43,74,0.18)',
        zIndex: 51, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 15 }}>{title}</div>
          <button data-testid="drawer-close" onClick={onClose} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 13 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>{children}</div>
      </div>
    </>
  );
}

const ctl = { border: '1px solid var(--line)', background: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, cursor: 'pointer' };

const STATUS_DOT2 = STATUS_DOT;
function PipelineWidget({ shared, nav }) {
  const { statusCounts, maxCount } = shared;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px' }}>
      {statusCounts.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No jobs yet.</div>}
      {statusCounts.map(([st, n]) => (
        <div key={st} className="clickable" onClick={() => nav('/jobs')}
          style={{ display: 'grid', gridTemplateColumns: '110px 1fr 24px', gap: 10, alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: STATUS_DOT2[st], marginRight: 7 }} />
            {st.replace('_', ' ')}
          </span>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--cream)', overflow: 'hidden' }}>
            <div style={{ width: `${(n / maxCount) * 100}%`, height: '100%', background: STATUS_DOT2[st], opacity: 0.75 }} />
          </div>
          <b style={{ fontSize: 13, color: 'var(--navy)', textAlign: 'right' }}>{n}</b>
        </div>
      ))}
    </div>
  );
}
function MoneyInMotionWidget({ shared, nav }) {
  const { inMotion } = shared;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 10px' }}>
      {inMotion.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '0 8px' }}>Appears when a job has an accepted contract.</div>}
      {inMotion.map((b) => (
        <div key={b.job_id} className="clickable" data-testid="motion-row" onClick={() => nav(`/jobs/${b.job_id}`)}
          style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>
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
  );
}
function AttentionWidget({ shared, nav }) {
  const { conds, cos, coValue } = shared;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
      {conds.length === 0 && cos.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Clear board.</div>}
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
  );
}
function TicketStatsWidget({ shared, nav }) {
  const t = shared.tstats ?? {};
  const cell = (label, v) => (
    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{v ?? 0}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  );
  return (
    <div className="clickable" onClick={() => nav('/tickets')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, padding: '2px 14px 14px', cursor: 'pointer' }}>
      {cell('Open', t.open_tickets)}{cell('New 7d', t.new_7d)}{cell('Feature requests', t.feature_requests)}{cell('Avg hrs close', t.avg_hours_to_close ?? '—')}
    </div>
  );
}
/* Schedule health — which builds are tracking, at risk, or late.
   Dashboard-grade v2 (Brice, 8/5): solid stat tiles, per-item segment
   strips, current-phase line, finish vs baseline. Health is computed
   against the PUBLISHED baseline (script 014):
     late      projected finish (max coalesce(actual_end, end_date)) is past
               the baseline finish — the schedule says you land late.
     at risk   finish still holds, but an incomplete item is running behind
               its own baseline window — the early warning before "late".
     tracking  neither; shows days ahead when the field beat the plan.
   Draft schedules sit dim at the bottom. Every tile and row is a door. */
const HEALTH = {
  late:     { label: 'Late',     caption: 'past baseline',   fg: '#8F2730', tint: '#FBE9E9', txt: '#fff' },
  at_risk:  { label: 'At risk',  caption: 'behind window',   fg: '#8A5A00', tint: '#FBF3E4', txt: '#fff' },
  tracking: { label: 'On track', caption: 'holding baseline', fg: '#1F6B3A', tint: '#E7F6EC', txt: '#fff' },
  draft:    { label: 'Draft',    caption: 'not published',   fg: '#5A6478', tint: '#EEEEEA', txt: '#5A6478' },
};
function ScheduleHealthWidget({ orgId, shared, nav }) {
  const [items, setItems] = useState([]);
  const [pick, setPick] = useState('');   // '' = all, or a HEALTH key
  useEffect(() => {
    if (!orgId) return;
    let c = false;
    supabase.from('schedule_items')
      .select('job_id, title, status, sort, start_date, end_date, actual_end, baseline_start, baseline_end')
      .eq('org_id', orgId).order('sort')
      .then(({ data }) => { if (!c) setItems(data ?? []); });
    return () => { c = true; };
  }, [orgId]);

  const today = new Date().toISOString().slice(0, 10);
  const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
  const byJob = {};
  items.forEach((i) => { (byJob[i.job_id] = byJob[i.job_id] ?? []).push(i); });
  const rows = (shared.jobs ?? [])
    .filter((j) => byJob[j.id]?.length)
    .map((j) => {
      const its = byJob[j.id];
      const done = its.filter((i) => i.status === 'complete').length;
      const fin = (arr) => arr.reduce((m, d) => (d && (!m || d > m) ? d : m), null);
      const projFinish = fin(its.map((i) => i.actual_end ?? i.end_date));
      const baseFinish = fin(its.map((i) => i.baseline_end));
      const now = its.find((i) => i.status === 'in_progress') ?? its.find((i) => i.status !== 'complete');
      let health, slip = null;
      if (j.schedule_status !== 'published' || !baseFinish) health = 'draft';
      else {
        slip = projFinish && dayDiff(projFinish, baseFinish);
        const behindWindow = its.some((i) => i.status !== 'complete' && i.baseline_end
          && (i.baseline_end < today || (i.end_date && i.end_date > i.baseline_end)));
        health = slip > 0 ? 'late' : behindWindow ? 'at_risk' : 'tracking';
      }
      return { id: j.id, name: j.name, health, slip, done, total: its.length,
               projFinish, baseFinish, its, nowTitle: now?.title ?? null };
    })
    .sort((a, z) => ['late', 'at_risk', 'tracking', 'draft'].indexOf(a.health)
                  - ['late', 'at_risk', 'tracking', 'draft'].indexOf(z.health));

  const counts = Object.fromEntries(Object.keys(HEALTH).map((k) => [k, rows.filter((r) => r.health === k).length]));
  const shown = pick ? rows.filter((r) => r.health === pick) : rows;
  const fmtD = (d) => d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';
  const pillText = (r) =>
    r.health === 'late' ? `LATE +${r.slip}d`
    : r.health === 'at_risk' ? 'AT RISK'
    : r.health === 'tracking' ? (r.slip < 0 ? `${-r.slip}d AHEAD` : 'ON TRACK')
    : 'DRAFT';
  const segColor = (r, i) =>
    i.status === 'complete' ? HEALTH[r.health === 'draft' ? 'draft' : 'tracking'].fg
    : i.status === 'in_progress' ? 'var(--gold)'
    : (r.health !== 'draft' && i.baseline_end && i.baseline_end < today) ? HEALTH.late.tint
    : '#E3E1D8';

  return (
    <div style={{ padding: '2px 16px 14px' }}>
      {/* stat tiles — solid, big-number, clickable filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        {Object.entries(HEALTH).map(([k, h]) => {
          const selected = pick === k;
          return (
            <div key={k} className="clickable" data-testid={`sched-health-pill-${k}`}
              onClick={() => setPick(selected ? '' : k)}
              style={{ background: k === 'draft' ? h.tint : h.fg, color: k === 'draft' ? h.fg : h.txt,
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                outline: selected ? '3px solid var(--gold)' : 'none',
                opacity: pick && !selected ? 0.55 : 1 }}>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{counts[k]}</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>{h.label}</div>
              <div style={{ fontSize: 10.5, opacity: 0.85 }}>{h.caption}</div>
            </div>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {rows.length === 0 ? 'No schedules yet — import a template on the Schedule page.' : 'Nothing in this bucket.'}
        </div>
      )}
      {shown.map((r) => {
        const h = HEALTH[r.health];
        const pct = Math.round((r.done / r.total) * 100);
        return (
          <div key={r.id} className="clickable" data-testid="sched-health-row" onClick={() => nav(`/schedule?job=${r.id}`)}
            style={{ display: 'grid', gridTemplateColumns: '230px 1fr 96px 118px', gap: 12, alignItems: 'center',
              borderLeft: `4px solid ${h.fg}`, background: r.health === 'draft' ? 'transparent' : '#fff',
              opacity: r.health === 'draft' ? 0.7 : 1,
              borderRadius: '0 8px 8px 0', padding: '7px 12px', margin: '5px 0', cursor: 'pointer' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.nowTitle ? `now: ${r.nowTitle}` : 'complete'}
              </div>
            </div>
            <div>
              {/* per-item segment strip: green done · gold in progress · red-tint overdue · gray ahead */}
              <div style={{ display: 'flex', gap: 2, height: 12, alignItems: 'stretch' }}>
                {r.its.map((i) => (
                  <div key={i.title + i.sort} title={`${i.title} — ${i.status.replace('_', ' ')}`}
                    style={{ flex: 1, borderRadius: 2, background: segColor(r, i) }} />
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 3 }}>{r.done}/{r.total} items · {pct}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, borderRadius: 6, padding: '3px 9px',
                background: h.tint, color: h.fg, whiteSpace: 'nowrap' }}>{pillText(r)}</span>
            </div>
            <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: r.health === 'late' ? h.fg : 'var(--navy)' }}>{fmtD(r.projFinish)}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>
                {r.health === 'draft' ? 'projected' : `baseline ${fmtD(r.baseFinish)}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const LOCAL_WIDGETS = [
  { id: 'schedule_health', title: 'Schedule health', span: 2, component: ScheduleHealthWidget },
  { id: 'pipeline', title: 'Pipeline — one engine, both funnels', span: 1, component: PipelineWidget },
  { id: 'money_in_motion', title: 'Money in motion', span: 1, component: MoneyInMotionWidget },
  { id: 'needs_attention', title: 'Needs attention', span: 1, component: AttentionWidget },
  { id: 'ticket_stats', title: 'Support health', span: 1, component: TicketStatsWidget },
];

export default function Dashboard({ orgId, orgName, role }) {
  const nav = useNavigate();
  const [drawer, setDrawer] = useState(null); // 'conditions' | 'cos' | null
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
        supabase.from('jobs').select('id, name, status, lifecycle, schedule_status').eq('org_id', orgId),
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

  const shared = { jobs, budgets, conds, cos, tstats, active, statusCounts, maxCount, inMotion, triggered, coValue };
  const registry = [...CATALOG, ...LOCAL_WIDGETS];
  const persona = ROLE_PERSONA[role] ?? 'P2';
  const defaults = PERSONA_DEFAULTS[persona] ?? PERSONA_DEFAULTS.P2;
  const [layout, setLayout] = useState(defaults);
  const [editing, setEditing] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let c = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('org_members').select('dashboard_prefs')
        .eq('org_id', orgId).eq('person_id', uid).maybeSingle();
      if (c) return;
      const saved = data?.dashboard_prefs?.widgets;
      if (!prefsLoaded && Array.isArray(saved) && saved.length) setLayout(saved.filter((id) => registry.some((w) => w.id === id)));
      setPrefsLoaded(true);
    })();
    return () => { c = true; };
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addWidget = (id) => setLayout((l) => [...l, id]);
  const removeWidget = (id) => setLayout((l) => l.filter((x) => x !== id));
  const moveWidget = (i, d) => setLayout((l) => {
    const n = [...l]; const j = i + d;
    if (j < 0 || j >= n.length) return l;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const resetLayout = () => setLayout(defaults);
  const saveLayout = async () => {
    setEditing(false);
    try { await supabase.rpc('save_dashboard_prefs', { p_org: orgId, p_prefs: { widgets: layout } }); }
    catch { /* script 012 not run yet — layout persists for this session only */ }
  };

  return (
    <div style={{ flex: 1, padding: '22px 28px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div data-testid="dashboard-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{orgName ?? 'Dashboard'}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Your seat: {role ?? '…'}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        {editing && (
          <>
            <select data-testid="widget-add" value="" onChange={(e) => { if (e.target.value) addWidget(e.target.value); }}
              style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', fontSize: 12 }}>
              <option value="">Add widget…</option>
              {registry.filter((w) => !layout.includes(w.id)).map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
            <button onClick={resetLayout} style={{ padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'transparent', color: 'var(--ink-soft)', fontSize: 12 }}>Reset to default</button>
          </>
        )}
        <button data-testid="dashboard-edit" onClick={() => (editing ? saveLayout() : setEditing(true))}
          style={{ padding: '6px 14px', border: 'none', borderRadius: 8, background: editing ? 'var(--gold)' : 'var(--navy)', color: editing ? 'var(--navy-deep)' : 'var(--cream)', fontWeight: 700, fontSize: 12 }}>
          {editing ? 'Done' : 'Customize'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1, overflowY: 'auto', alignContent: 'start' }}>
        {layout.map((id, i) => {
          const w = registry.find((x) => x.id === id);
          if (!w) return null;
          const C = w.component;
          return (
            <div key={id} data-testid={`widget-${id}`} style={{ ...card, gridColumn: w.span === 2 ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={sectionTitle}>{w.title}</div>
                {editing && (
                  <div style={{ display: 'flex', gap: 4, padding: '8px 10px 0' }}>
                    <button onClick={() => moveWidget(i, -1)} aria-label="up" style={ctl}>↑</button>
                    <button onClick={() => moveWidget(i, 1)} aria-label="down" style={ctl}>↓</button>
                    <button onClick={() => removeWidget(id)} aria-label="remove" style={{ ...ctl, color: 'var(--bad)' }}>✕</button>
                  </div>
                )}
              </div>
              <C orgId={orgId} shared={shared} nav={nav} openDrawer={setDrawer} />
            </div>
          );
        })}
      </div>
      {drawer === 'conditions' && (
        <Drawer title={`Conditions watching (${conds.length})`} onClose={() => setDrawer(null)}>
          {conds.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Nothing being watched.</div>}
          {conds.map((c) => (
            <div key={c.id} className="clickable" onClick={() => c.jobs && nav(`/jobs/${c.jobs.id}`)}
              style={{ borderLeft: `3px solid ${c.status === 'triggered' ? 'var(--bad)' : 'var(--warn)'}`, padding: '9px 12px', margin: '7px 0', background: '#fff', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{c.text}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                {c.status === 'triggered' ? 'TRIGGERED' : c.type}
                {c.trigger_date ? ` · ${new Date(c.trigger_date + 'T00:00:00').toLocaleDateString()}` : ''}
                {c.jobs ? ` · ${c.jobs.name}` : ''}
              </div>
            </div>
          ))}
        </Drawer>
      )}
      {drawer === 'cos' && (
        <Drawer title={`Change orders awaiting decision (${cos.length})`} onClose={() => setDrawer(null)}>
          {cos.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>None waiting.</div>}
          {cos.map((o) => (
            <div key={o.id} className="clickable" onClick={() => nav(`/jobs/${o.job_id}`)}
              style={{ borderLeft: '3px solid var(--gold)', padding: '9px 12px', margin: '7px 0', background: '#fff', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{o.title} — {money(coValue(o))}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{o.status.replace('_', ' ')} · {o.jobs?.name}</div>
            </div>
          ))}
        </Drawer>
      )}
    </div>
  );
}
