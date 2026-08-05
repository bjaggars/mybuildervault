import React, { useMemo, useState } from 'react';

// Build Progress — OWNER-ONLY, DEV-ONLY (Brice, 8/5/26): a founder's map of
// what's shipped and what's next, so progress is visible without reading BRAIN.
// SELF-RETIRING: renders only on *.netlify.app / localhost (see isDevHost in
// AppShell) — the prod domain never shows it, no config needed.
// MAINTENANCE RULE (BRAIN README): sessions that ship or start a module
// update MODULES below in the same commits as the work.
// Status colors: green = complete · gold = in progress · neutral = planned.

const MODULES = [
  // ---------------- shipped ----------------
  { module: 'Foundation & identity', area: 'Platform', status: 'complete', ref: '001–002 · Jul',
    desc: 'Orgs, people, roles, RLS security helpers, cost-code catalog — the multi-tenant spine everything sits on.' },
  { module: 'Ticketing & concierge', area: 'Support', status: 'complete', ref: '003–005 · Jul',
    desc: 'Support tickets with queue + stats, system auto-responses, and the AI concierge that files defects from chat.' },
  { module: 'Fresh-install hardening', area: 'Platform', status: 'complete', ref: '006 · fixed 8/5',
    desc: 'Platform-owner grants; amended so the whole script chain applies clean to an empty database (first prod release path, proven in CI every push).' },
  { module: 'Job container', area: 'Jobs', status: 'complete', ref: '007 · Aug',
    desc: 'Communities, lots, plans, contacts, jobs across both funnels (custom + spec), participants, job event history.' },
  { module: 'Estimates → contract', area: 'Money', status: 'complete', ref: '008 · Aug',
    desc: 'Estimate document with lines, acceptance flow, and the computed contract snapshot — totals are never hand-keyed.' },
  { module: 'Change orders & allowances', area: 'Money', status: 'complete', ref: '009 · Aug',
    desc: 'COs through the full Ocala status flow; allowances with variance tracking (incl. the hidden-overage case).' },
  { module: 'Selections, actuals & budget', area: 'Money', status: 'complete', ref: '010 · Aug',
    desc: 'Client selections, cost actuals auto-syncing allowances, and the live job budget view (baseline vs revised).' },
  { module: 'Cost prefs & extended roles', area: 'Platform', status: 'complete', ref: '011 · 8/4',
    desc: 'Cost basis preferences and the widened role set (architect, engineer, lender, owner\u2019s rep) for real job casts.' },
  { module: 'Dashboard personas & prefs', area: 'Dashboard', status: 'complete', ref: '012 · 8/5',
    desc: 'Role-based default dashboards (owner/PM/sales/office), customizable per person, saved server-side.' },
  { module: 'Field spine', area: 'Field', status: 'complete', ref: '013 · 8/5',
    desc: 'Work orders with acceptance events, crew checklists w/ photo proof, daily logs, time entries → labor actuals.' },
  { module: 'Schedule engine', area: 'Schedule', status: 'complete', ref: '014 · 8/5',
    desc: 'Items + dependencies with lag, workday calendar, Day-N templates, draft→publish baseline, and the database-owned cascade — the field advances the plan (WO completion moves successors).' },
  { module: 'Schedule surface', area: 'Schedule', status: 'complete', ref: 'shipped 8/5',
    desc: 'Gantt (drag-to-shift with required reason, baseline ghosts), full sort/filter list, template import, publish flow.' },
  { module: 'Schedule health card', area: 'Dashboard', status: 'complete', ref: 'shipped 8/5',
    desc: 'Late / at-risk / on-track / draft at a glance: stat tiles, per-item segment strips, drill into any job.' },
  { module: 'Progress drift detection', area: 'Schedule', status: 'complete', ref: '015 · 8/5',
    desc: 'The sniff test, derived not asked: expected % from elapsed workdays vs actual % from crew checklists — flags work-behind items before dates slip.' },
  { module: 'Quality rail', area: 'Platform', status: 'complete', ref: 'continuous',
    desc: '9 golden-path E2E robot runs, API smoke, and a 23-scenario behavioral smoke that rebuilds the entire database from scratch on every push.' },
  { module: 'Staff invites (magic link)', area: 'Access', status: 'complete', ref: 'shipped 8/5',
    desc: 'Passwordless one-time invite links for team seats; session persists per device. The pattern the sub portal will reuse.' },
  // ---------------- next ----------------
  { module: 'Comms rail', area: 'Comms', status: 'next', ref: 'BOARD-007 · elevated',
    desc: 'Email/SMS delivery spine: schedule shift notices, WO sent-to-sub messages (carrying the magic link), digest hooks. Unblocks sub loop + client notices.' },
  { module: 'WO checklist templates', area: 'Field', status: 'next', ref: 'queued',
    desc: 'Every framing WO born with its 8 steps, every trade with its own — makes drift detection automatic instead of opt-in.' },
  { module: 'Gantt dependency arrows', area: 'Schedule', status: 'next', ref: 'BOARD-032',
    desc: 'Draw the finish-to-start connectors on the Gantt so the chain reads visually. Demo polish.' },
  { module: 'Sub portal (magic link)', area: 'Access', status: 'planned', ref: 'Phase B',
    desc: 'Zero-friction sub access: one tap from email/text into their own scope — their WOs, checklists, money; never other trades\u2019 pricing. Free external seats.' },
  { module: 'Template from job / calendar view', area: 'Schedule', status: 'planned', ref: 'BOARD-032',
    desc: 'Turn a finished build\u2019s actuals into a reusable Day-N template; month/week calendar rendering of the schedule.' },
  { module: 'Client portal', area: 'Access', status: 'planned', ref: 'Phase C',
    desc: 'Homeowners see published, client-visible schedule + selections + budget views. RLS read paths already shipped in 014 — this is the surface.' },
  { module: 'Entitlements & licensing', area: 'Platform', status: 'planned', ref: 'Brije licensing',
    desc: 'Feature gating per license tier — the machinery for Brije running MyBuilderVault as a licensee.' },
  { module: 'Production release', area: 'Platform', status: 'planned', ref: 'ritual ready',
    desc: 'First main-branch release: prod Supabase + domain, DB change scripts 001→current in order (fresh-install path already CI-proven), prod smoke.' },
];

const STATUS = {
  complete: { label: 'Complete',    bg: '#E7F6EC', fg: '#1F6B3A', dot: '#1F6B3A' },
  next:     { label: 'In progress / next', bg: '#FBF0C8', fg: '#9A6E00', dot: '#EFB100' },
  planned:  { label: 'Planned',     bg: '#fff',    fg: '#5A6478', dot: '#C9C6BB' },
};
const input = { padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', fontSize: 12, width: '100%', minWidth: 0 };
const card = { background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' };

export default function Progress() {
  const [sort, setSort] = useState({ key: 'status', dir: 'asc' });
  const [fModule, setFModule] = useState('');
  const [fArea, setFArea] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fRef, setFRef] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [pick, setPick] = useState('');

  const areas = useMemo(() => [...new Set(MODULES.map((m) => m.area))].sort(), []);
  const order = { complete: 0, next: 1, planned: 2 };
  const counts = { complete: 0, next: 0, planned: 0 };
  MODULES.forEach((m) => { counts[m.status]++; });

  const rows = useMemo(() => {
    const filtered = MODULES.filter((m) =>
      (!pick || m.status === pick)
      && (!fModule || m.module.toLowerCase().includes(fModule.toLowerCase()))
      && (!fArea || m.area === fArea)
      && (!fStatus || m.status === fStatus)
      && (!fRef || m.ref.toLowerCase().includes(fRef.toLowerCase()))
      && (!fDesc || m.desc.toLowerCase().includes(fDesc.toLowerCase())));
    const val = (m) => sort.key === 'module' ? m.module.toLowerCase()
      : sort.key === 'area' ? m.area
      : sort.key === 'ref' ? m.ref
      : sort.key === 'desc' ? m.desc.toLowerCase()
      : order[m.status];
    return filtered.sort((a, z) => {
      const x = val(a), y = val(z);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
  }, [sort, fModule, fArea, fStatus, fRef, fDesc, pick]);

  const headerCell = (key, label) => (
    <span onClick={() => setSort((p) => p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}
      style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' \u25B4' : ' \u25BE') : ''}
    </span>
  );
  const grid = '1.4fr 100px 150px 130px 3fr';

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div data-testid="progress-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Build Progress</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          Founder view · dev only — this tab does not exist on the production domain. Source of truth stays in the BRAIN.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {Object.entries(STATUS).map(([k, st]) => (
          <button key={k} data-testid={`progress-pill-${k}`} onClick={() => setPick(pick === k ? '' : k)}
            style={{ border: pick === k ? `2px solid ${st.fg}` : '1px solid var(--line)', background: st.bg, color: st.fg,
              borderRadius: 999, padding: '5px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
              opacity: pick && pick !== k ? 0.55 : 1 }}>
            {st.label} {counts[k]}
          </button>
        ))}
      </div>

      <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 16px', borderBottom: '2px solid var(--navy)', fontSize: 11, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase' }}>
          {headerCell('module', 'Module')}{headerCell('area', 'Area')}{headerCell('status', 'Status')}{headerCell('ref', 'Shipped / ref')}{headerCell('desc', 'What it does')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '7px 16px', borderBottom: '1px solid var(--line)', background: '#fff', alignItems: 'center' }}>
          <input style={input} placeholder="Contains…" value={fModule} onChange={(e) => setFModule(e.target.value)} />
          <select style={input} value={fArea} onChange={(e) => setFArea(e.target.value)}>
            <option value="">All</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select style={input} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS).map(([k, st]) => <option key={k} value={k}>{st.label}</option>)}
          </select>
          <input style={input} placeholder="Contains…" value={fRef} onChange={(e) => setFRef(e.target.value)} />
          <input style={input} placeholder="Contains…" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.map((m) => {
            const st = STATUS[m.status];
            return (
              <div key={m.module} data-testid="progress-row"
                style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '9px 16px',
                  borderBottom: '1px solid var(--line)', fontSize: 13, alignItems: 'start',
                  background: st.bg }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.module}</span>
                <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{m.area}</span>
                <span style={{ fontWeight: 800, color: st.fg, fontSize: 12, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: st.dot, marginRight: 6 }} />
                  {st.label}
                </span>
                <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{m.ref}</span>
                <span style={{ color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.45 }}>{m.desc}</span>
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-soft)' }}>No modules match the filters.</div>}
        </div>
      </div>
    </div>
  );
}
