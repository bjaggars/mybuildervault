import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

const card = {
  background: 'var(--cream-panel)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
};
const sectionTitle = {
  fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase',
  letterSpacing: 0.8, padding: '11px 16px 7px', flexShrink: 0,
};
const money = (n) => (n === null || n === undefined) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const mono = { fontVariantNumeric: 'tabular-nums' };

/* ---------- exposure strip ---------- */
function ExposureStrip({ orgId }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let c = false;
    (async () => {
      const [{ data: alw }, { data: co }, { data: est }] = await Promise.all([
        supabase.from('allowances').select('budgeted, variance, status').eq('org_id', orgId),
        supabase.from('change_orders').select('status, change_order_lines ( price )').eq('org_id', orgId),
        supabase.from('estimates').select('status, estimate_lines ( price )').eq('org_id', orgId).eq('status', 'presented'),
      ]);
      if (c) return;
      const open = (alw ?? []).filter((a) => ['open', 'quoted'].includes(a.status)).reduce((s, a) => s + Number(a.budgeted), 0);
      const unres = (alw ?? []).filter((a) => a.variance != null && a.status !== 'reconciled').reduce((s, a) => s + Number(a.variance), 0);
      const approvedUnbuilt = (co ?? []).filter((o) => o.status === 'approved')
        .reduce((s, o) => s + (o.change_order_lines ?? []).reduce((t, l) => t + Number(l.price), 0), 0);
      const pipeline = (est ?? []).reduce((s, e) => s + (e.estimate_lines ?? []).reduce((t, l) => t + Number(l.price), 0), 0);
      setD({ open, unres, approvedUnbuilt, pipeline });
    })();
    return () => { c = true; };
  }, [orgId]);
  const cell = (label, value, color) => (
    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', ...mono }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, padding: '4px 14px 14px' }}>
      {cell('Allowance exposure', d ? money(d.open) : '…', 'var(--bad)')}
      {cell('Unresolved variance', d ? money(d.unres) : '…', 'var(--warn)')}
      {cell('Approved, unbuilt COs', d ? money(d.approvedUnbuilt) : '…', 'var(--gold)')}
      {cell('Pipeline (presented)', d ? money(d.pipeline) : '…', '#1D4E89')}
    </div>
  );
}

/* ---------- margin board ---------- */
function MarginBoard({ orgId }) {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let c = false;
    (async () => {
      const [{ data: b }, { data: contracts }, { data: acts }, { data: cos }] = await Promise.all([
        supabase.from('v_job_budget').select('*').eq('org_id', orgId),
        supabase.from('contracts').select('job_id, estimate_id').eq('org_id', orgId).order('created_at'),
        supabase.from('actuals').select('job_id, amount').eq('org_id', orgId),
        supabase.from('change_orders').select('job_id, status, change_order_lines ( cost )').eq('org_id', orgId),
      ]);
      const estIds = [...new Set((contracts ?? []).map((x) => x.estimate_id))];
      const { data: lines } = estIds.length
        ? await supabase.from('estimate_lines').select('estimate_id, cost').in('estimate_id', estIds)
        : { data: [] };
      if (c) return;
      const latestContract = {};
      (contracts ?? []).forEach((x) => { latestContract[x.job_id] = x.estimate_id; });
      const estCost = {};
      (lines ?? []).forEach((l) => {
        if (l.cost == null) return;
        estCost[l.estimate_id] = (estCost[l.estimate_id] ?? 0) + Number(l.cost);
      });
      const spent = {}; (acts ?? []).forEach((a) => { spent[a.job_id] = (spent[a.job_id] ?? 0) + Number(a.amount); });
      const coCost = {};
      (cos ?? []).forEach((o) => {
        if (!['approved', 'in_build', 'included'].includes(o.status)) return;
        const t = (o.change_order_lines ?? []).reduce((s, l) => s + Number(l.cost ?? 0), 0);
        coCost[o.job_id] = (coCost[o.job_id] ?? 0) + t;
      });
      setRows((b ?? []).map((j) => {
        const base = estCost[latestContract[j.job_id]];
        const forecast = base != null ? base + (coCost[j.job_id] ?? 0) : null;
        const margin = forecast != null && j.revised_price ? (j.revised_price - forecast) / j.revised_price : null;
        return { ...j, spent: spent[j.job_id] ?? 0, forecast, margin };
      }));
    })();
    return () => { c = true; };
  }, [orgId]);
  const head = { fontSize: 11, color: 'var(--ink-soft)', textAlign: 'right' };
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 100px 100px 70px', gap: 10, padding: '4px 2px', borderBottom: '2px solid var(--line)' }}>
        <span style={{ ...head, textAlign: 'left' }}>Job</span><span style={head}>Revised</span>
        <span style={head}>Cost to date</span><span style={head}>Forecast cost</span><span style={head}>Margin</span>
      </div>
      {rows === null && <div style={{ padding: 12, fontSize: 13, color: 'var(--ink-soft)' }}>Loading…</div>}
      {rows?.length === 0 && <div style={{ padding: 12, fontSize: 13, color: 'var(--ink-soft)' }}>Appears when a job has an accepted contract.</div>}
      {rows?.map((r) => (
        <div key={r.job_id} className="clickable" data-testid="margin-row" onClick={() => nav(`/jobs/${r.job_id}`)}
          style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 100px 100px 70px', gap: 10, alignItems: 'center', padding: '9px 2px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{r.status.replace('_', ' ')}</div>
          </div>
          <div style={{ fontSize: 12.5, textAlign: 'right', color: 'var(--ink)', ...mono }}>{money(r.revised_price)}</div>
          <div style={{ fontSize: 12.5, textAlign: 'right', color: 'var(--ink)', ...mono }}>{money(r.spent)}</div>
          <div style={{ fontSize: 12.5, textAlign: 'right', color: r.forecast == null ? 'var(--ink-soft)' : 'var(--ink)', ...mono }}>
            {r.forecast == null ? 'add costs' : money(r.forecast)}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, textAlign: 'right', color: r.margin == null ? 'var(--ink-soft)' : r.margin >= 0.2 ? 'var(--ok)' : 'var(--warn)', ...mono }}>
            {r.margin == null ? '—' : `${(r.margin * 100).toFixed(1)}%`}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- burn chart (recharts) ---------- */
function BurnChart({ orgId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let c = false;
    supabase.from('actuals').select('amount, incurred_on, created_at').eq('org_id', orgId)
      .then(({ data: acts }) => {
        if (c) return;
        const pts = (acts ?? [])
          .map((a) => ({ d: a.incurred_on ?? a.created_at?.slice(0, 10), v: Number(a.amount) }))
          .filter((p) => p.d).sort((a, z) => a.d.localeCompare(z.d));
        let run = 0;
        setData(pts.map((p) => { run += p.v; return { date: p.d.slice(5), total: Math.round(run) }; }));
      });
    return () => { c = true; };
  }, [orgId]);
  return (
    <div style={{ flex: 1, minHeight: 170, padding: '0 10px 10px' }}>
      {data && data.length === 0 && <div style={{ padding: 12, fontSize: 13, color: 'var(--ink-soft)' }}>Cost entries chart here as they land.</div>}
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5A6478' }} tickLine={false} axisLine={{ stroke: '#E3DCCE' }} />
            <YAxis tick={{ fontSize: 11, fill: '#5A6478' }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} width={44} />
            <Tooltip formatter={(v) => money(v)} labelStyle={{ color: '#1C2B4A' }} contentStyle={{ borderRadius: 8, border: '1px solid #E3DCCE', fontSize: 12 }} />
            <Area type="monotone" dataKey="total" stroke="#1C2B4A" strokeWidth={2} fill="#C5A028" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ---------- sales funnel ---------- */
function SalesFunnel({ orgId }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let c = false;
    supabase.from('jobs').select('status, created_at').eq('org_id', orgId).then(({ data: jobs }) => {
      if (c) return;
      const j = jobs ?? [];
      const leads = j.filter((x) => x.status === 'lead').length;
      const design = j.filter((x) => x.status === 'design').length;
      const contracted = j.filter((x) => !['lead', 'design'].includes(x.status)).length;
      setD({ leads, design, contracted, conv: (leads + design + contracted) ? Math.round((contracted / (leads + design + contracted)) * 100) : 0 });
    });
    return () => { c = true; };
  }, [orgId]);
  const bar = (label, n, max, color) => (
    <div style={{ display: 'grid', gridTemplateColumns: '86px 1fr 28px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{label}</span>
      <div style={{ height: 8, background: 'var(--cream)', borderRadius: 4 }}>
        <div style={{ width: `${max ? (n / max) * 100 : 0}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <b style={{ fontSize: 13, textAlign: 'right', color: 'var(--navy)', ...mono }}>{n}</b>
    </div>
  );
  const max = d ? Math.max(1, d.leads, d.design, d.contracted) : 1;
  return (
    <div style={{ padding: '2px 16px 12px' }}>
      {bar('lead', d?.leads ?? 0, max, '#1D4E89')}
      {bar('design', d?.design ?? 0, max, '#6B21A8')}
      {bar('contracted+', d?.contracted ?? 0, max, '#1F6B3A')}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
        conversion to contract <b style={{ color: 'var(--navy)' }}>{d?.conv ?? 0}%</b>
      </div>
    </div>
  );
}

/* ---------- registry ---------- */
export { card, sectionTitle };
export const CATALOG = [
  { id: 'exposure_strip', title: 'Exposure', span: 2, component: ExposureStrip },
  { id: 'margin_board', title: 'Margin board', span: 2, component: MarginBoard },
  { id: 'burn_chart', title: 'Cost burn — cumulative', span: 1, component: BurnChart },
  { id: 'sales_funnel', title: 'Sales funnel', span: 1, component: SalesFunnel },
];
export const PERSONA_DEFAULTS = {
  P1: ['schedule_health', 'exposure_strip', 'margin_board', 'burn_chart', 'sales_funnel'],
  P2: ['schedule_health', 'pipeline', 'needs_attention', 'money_in_motion', 'ticket_stats'],
  P3: ['sales_funnel', 'pipeline', 'ticket_stats'],
  P4: ['schedule_health', 'ticket_stats', 'pipeline', 'needs_attention'],
};
export const ROLE_PERSONA = {
  owner: 'P1', accounting: 'P1', estimator: 'P1',
  pm: 'P2', super: 'P2', field: 'P2', selections: 'P2', warranty: 'P2',
  sales: 'P3',
  admin: 'P4', office: 'P4',
};
