import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const money = (n) => (n === null || n === undefined) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const input = { padding: '8px 11px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', fontSize: 13 };

/* ---------------- report definitions (BOARD-030 catalog) ---------------- */
const REPORTS = [
  {
    id: 'wip_summary', title: 'WIP summary', roles: ['owner', 'admin', 'accounting', 'pm'], params: [],
    blurb: 'Every job with a contract: baseline, revised, spent, forecast cost, margin.',
    run: async (orgId) => {
      const [{ data: b }, { data: contracts }, { data: acts }, { data: cos }] = await Promise.all([
        supabase.from('v_job_budget').select('*').eq('org_id', orgId),
        supabase.from('contracts').select('job_id, estimate_id').eq('org_id', orgId).order('created_at'),
        supabase.from('actuals').select('job_id, amount').eq('org_id', orgId),
        supabase.from('change_orders').select('job_id, status, change_order_lines ( cost )').eq('org_id', orgId),
      ]);
      const estIds = [...new Set((contracts ?? []).map((x) => x.estimate_id))];
      const { data: lines } = estIds.length
        ? await supabase.from('estimate_lines').select('estimate_id, cost').in('estimate_id', estIds) : { data: [] };
      const latest = {}; (contracts ?? []).forEach((x) => { latest[x.job_id] = x.estimate_id; });
      const estCost = {}; (lines ?? []).forEach((l) => { if (l.cost != null) estCost[l.estimate_id] = (estCost[l.estimate_id] ?? 0) + Number(l.cost); });
      const spent = {}; (acts ?? []).forEach((a) => { spent[a.job_id] = (spent[a.job_id] ?? 0) + Number(a.amount); });
      const coCost = {}; (cos ?? []).forEach((o) => {
        if (!['approved', 'in_build', 'included'].includes(o.status)) return;
        coCost[o.job_id] = (coCost[o.job_id] ?? 0) + (o.change_order_lines ?? []).reduce((s, l) => s + Number(l.cost ?? 0), 0);
      });
      return {
        columns: [
          { key: 'name', label: 'Job' }, { key: 'status', label: 'Status' },
          { key: 'baseline', label: 'Baseline', money: true }, { key: 'revised', label: 'Revised', money: true },
          { key: 'spent', label: 'Spent', money: true }, { key: 'forecast', label: 'Forecast cost', money: true },
          { key: 'margin', label: 'Margin %' },
        ],
        rows: (b ?? []).map((j) => {
          const base = estCost[latest[j.job_id]];
          const forecast = base != null ? base + (coCost[j.job_id] ?? 0) : null;
          return {
            name: j.name, status: j.status.replace('_', ' '),
            baseline: j.contract_baseline, revised: j.revised_price,
            spent: spent[j.job_id] ?? 0, forecast,
            margin: forecast != null && j.revised_price
              ? `${(((j.revised_price - forecast) / j.revised_price) * 100).toFixed(1)}%` : '—',
          };
        }),
      };
    },
  },
  {
    id: 'budget_vs_actual', title: 'Budget vs actual — allowances', roles: ['owner', 'admin', 'accounting', 'pm'], params: ['job'],
    blurb: 'Per-allowance budgeted, actual, variance, status for one job.',
    run: async (orgId, { jobId }) => {
      const { data } = await supabase.from('allowances')
        .select('name, budgeted, actual, variance, status, variance_visible')
        .eq('job_id', jobId).order('name');
      const rows = (data ?? []).map((a) => ({
        name: a.name, budgeted: a.budgeted, actual: a.actual, variance: a.variance,
        status: a.status, revealed: a.variance_visible ? 'yes' : 'no',
      }));
      const tot = (k) => rows.reduce((s, r) => s + (r[k] == null ? 0 : Number(r[k])), 0);
      rows.push({ name: 'TOTAL', budgeted: tot('budgeted'), actual: tot('actual'), variance: tot('variance'), status: '', revealed: '' });
      return {
        columns: [
          { key: 'name', label: 'Allowance' }, { key: 'budgeted', label: 'Budgeted', money: true },
          { key: 'actual', label: 'Actual', money: true }, { key: 'variance', label: 'Variance', money: true },
          { key: 'status', label: 'Status' }, { key: 'revealed', label: 'Client reveal' },
        ],
        rows,
      };
    },
  },
  {
    id: 'co_log', title: 'Change order log', roles: ['owner', 'admin', 'pm', 'accounting'], params: ['job'],
    blurb: 'Every change order on a job with value, cost, and status. Exports to Excel.',
    run: async (orgId, { jobId }) => {
      const { data } = await supabase.from('change_orders')
        .select('number, title, status, approved_at, created_at, change_order_lines ( price, cost )')
        .eq('job_id', jobId).order('number');
      return {
        columns: [
          { key: 'number', label: '#' }, { key: 'title', label: 'Change order' },
          { key: 'status', label: 'Status' }, { key: 'value', label: 'Client value', money: true },
          { key: 'cost', label: 'Cost', money: true }, { key: 'approved', label: 'Approved' },
        ],
        rows: (data ?? []).map((o) => ({
          number: o.number, title: o.title, status: o.status.replace('_', ' '),
          value: (o.change_order_lines ?? []).reduce((s, l) => s + Number(l.price ?? 0), 0),
          cost: (o.change_order_lines ?? []).reduce((s, l) => s + Number(l.cost ?? 0), 0) || null,
          approved: o.approved_at ? new Date(o.approved_at).toLocaleDateString() : '—',
        })),
      };
    },
  },
  {
    id: 'job_cost_detail', title: 'Job cost detail', roles: ['owner', 'admin', 'accounting', 'pm'], params: ['job'],
    blurb: 'Every cost entry on a job — what, when, how much, against which bucket.',
    run: async (orgId, { jobId }) => {
      const { data } = await supabase.from('actuals')
        .select('description, amount, incurred_on, source, allowances ( name ), cost_codes ( code, name )')
        .eq('job_id', jobId).order('incurred_on', { ascending: true, nullsFirst: false });
      const rows = (data ?? []).map((a) => ({
        date: a.incurred_on ? new Date(a.incurred_on + 'T00:00:00').toLocaleDateString() : '—',
        description: a.description,
        bucket: a.allowances?.name ?? (a.cost_codes ? `${a.cost_codes.code ?? ''} ${a.cost_codes.name ?? ''}`.trim() : '—'),
        source: a.source, amount: a.amount,
      }));
      rows.push({ date: '', description: 'TOTAL', bucket: '', source: '', amount: rows.reduce((s, r) => s + Number(r.amount ?? 0), 0) });
      return {
        columns: [
          { key: 'date', label: 'Date' }, { key: 'description', label: 'Description' },
          { key: 'bucket', label: 'Allowance / cost code' }, { key: 'source', label: 'Source' },
          { key: 'amount', label: 'Amount', money: true },
        ],
        rows,
      };
    },
  },
  {
    id: 'sales_funnel', title: 'Sales funnel & aging', roles: ['owner', 'admin', 'sales'], params: [],
    blurb: 'Pre-contract jobs with days in current status; presented estimates with value.',
    run: async (orgId) => {
      const [{ data: jobs }, { data: evts }, { data: ests }] = await Promise.all([
        supabase.from('jobs').select('id, name, status, lifecycle, created_at, contacts ( display_name )')
          .eq('org_id', orgId).in('status', ['lead', 'design', 'contract']),
        supabase.from('job_events').select('job_id, to_status, created_at').eq('kind', 'status_change'),
        supabase.from('estimates').select('job_id, status, estimate_lines ( price )').eq('org_id', orgId).eq('status', 'presented'),
      ]);
      const lastChange = {};
      (evts ?? []).forEach((e) => {
        if (!lastChange[e.job_id] || e.created_at > lastChange[e.job_id]) lastChange[e.job_id] = e.created_at;
      });
      const presented = {};
      (ests ?? []).forEach((e) => {
        presented[e.job_id] = (e.estimate_lines ?? []).reduce((s, l) => s + Number(l.price), 0);
      });
      return {
        columns: [
          { key: 'name', label: 'Job' }, { key: 'client', label: 'Client' },
          { key: 'status', label: 'Status' }, { key: 'days', label: 'Days in status' },
          { key: 'presented', label: 'Presented value', money: true },
        ],
        rows: (jobs ?? []).map((j) => ({
          name: j.name, client: j.contacts?.display_name ?? '—', status: j.status,
          days: Math.floor((Date.now() - new Date(lastChange[j.id] ?? j.created_at).getTime()) / 86400000),
          presented: presented[j.id] ?? null,
        })),
      };
    },
  },
];

/* ---------------- surface ---------------- */
export default function Reports({ orgId, role }) {
  const [jobs, setJobs] = useState([]);
  const [reportId, setReportId] = useState(null);
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const available = REPORTS.filter((r) => r.roles.includes(role));
  const report = available.find((r) => r.id === reportId) ?? null;

  useEffect(() => {
    if (!orgId) return;
    supabase.from('jobs').select('id, name').eq('org_id', orgId).order('name')
      .then(({ data }) => setJobs(data ?? []));
  }, [orgId]);

  const run = async () => {
    if (!report) return;
    if (report.params.includes('job') && !jobId) { setErr('Pick a job first.'); return; }
    setErr(''); setBusy(true); setResult(null);
    try {
      const out = await report.run(orgId, { jobId });
      setResult(out);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = () => {
    if (!result) return;
    const data = result.rows.map((r) => Object.fromEntries(result.columns.map((c) => [c.label, r[c.key]])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 31));
    XLSX.writeFile(wb, `${report.id}.xlsx`);
  };

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div data-testid="reports-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 12 }} className="no-print">Reports</div>

      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select data-testid="report-pick" style={input} value={reportId ?? ''}
          onChange={(e) => { setReportId(e.target.value || null); setResult(null); }}>
          <option value="">Choose a report…</option>
          {available.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        {report?.params.includes('job') && (
          <select data-testid="report-job" style={input} value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Job…</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        )}
        {report && (
          <button data-testid="report-run" disabled={busy} onClick={run}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Running…' : 'Run'}
          </button>
        )}
        {result && (
          <>
            <button onClick={exportExcel} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 13, fontWeight: 600 }}>Export Excel</button>
            <button onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 13, fontWeight: 600 }}>Print</button>
          </>
        )}
        {err && <span style={{ fontSize: 13, color: 'var(--bad)' }}>{err}</span>}
        {report && !result && <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{report.blurb}</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
        {!report && (
          <div style={{ padding: 20, fontSize: 14, color: 'var(--ink-soft)' }}>
            Pick a report. Your seat ({role}) sees: {available.map((r) => r.title).join(' · ')}
          </div>
        )}
        {report && result && (
          <table data-testid="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {result.columns.map((c) => (
                  <th key={c.key} style={{ textAlign: c.money ? 'right' : 'left', padding: '10px 14px', borderBottom: '2px solid var(--line)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: 0.5, position: 'sticky', top: 0, background: 'var(--cream-panel)' }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 && (
                <tr><td colSpan={result.columns.length} style={{ padding: 16, color: 'var(--ink-soft)' }}>No rows.</td></tr>
              )}
              {result.rows.map((r, i) => (
                <tr key={i} style={{ fontWeight: String(r[result.columns[0].key]).startsWith('TOTAL') || r[result.columns[1]?.key] === 'TOTAL' ? 700 : 400 }}>
                  {result.columns.map((c) => (
                    <td key={c.key} style={{ padding: '9px 14px', borderBottom: '1px solid var(--line)', textAlign: c.money ? 'right' : 'left', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                      {c.money ? money(r[c.key]) : (r[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
