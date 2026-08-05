import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';

// The schedule engine surface (script 014, SCHEDULE.md APPROVED 8/5, all 6
// rulings). One page, three tabs per job: Gantt (drag-cascade + baseline
// toggle) · List (LEARNINGS #15: click-to-sort on EVERY header + a filter
// control on EVERY column) · Templates (Day-N catalog + import). Draft →
// publish stamps the baseline in one act. The CASCADE LIVES IN THE DATABASE:
// this page only ever states intent (shift_schedule_item / publish_schedule /
// import_schedule_template RPCs, plain item/dep writes) — recalc_schedule
// does the topological, workday-aware math server-side. §9 laws: counts are
// doors, no voids, drawer over page-hop, scrolling is not your friend.

const DISCIPLINES = ['sitework','foundation_concrete','framing','roofing','masonry',
  'electrical','plumbing','hvac','insulation','drywall','paint','trim','flooring',
  'tile','cabinets','low_voltage','gutters','landscape_irrigation','pool',
  'well_septic','punch_clean'];
const SI_STATUSES = ['pending','in_progress','complete'];
const PHASE_COLORS = {}; // deterministic assignment below
const PALETTE = ['#1f3a5f','#8a6d3b','#3d6b4f','#6b4f8a','#8a3d3d','#3d7a8a','#5f5f1f'];

const input = { padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', fontSize: 13 };
const card = { background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 16px' };
const btn = { padding: '8px 13px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnGhost = { ...btn, background: '#fff', border: '1px solid var(--line)', color: 'var(--ink)' };
const filterCtl = { ...input, padding: '5px 7px', fontSize: 12, width: '100%', minWidth: 0 };
const nice = (s) => (s ?? '').replace(/_/g, ' ');
const iso = (d) => (d ? String(d).slice(0, 10) : '');
const dayMs = 86400000;
const toUTC = (s) => new Date(s + 'T00:00:00Z');
const addD = (s, n) => new Date(toUTC(s).getTime() + n * dayMs).toISOString().slice(0, 10);
const diffD = (a, b) => Math.round((toUTC(a) - toUTC(b)) / dayMs);
const fmtShort = (s) => (s ? toUTC(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—');

function phaseColor(phase, i) {
  if (!phase) return PALETTE[i % PALETTE.length];
  if (!PHASE_COLORS[phase]) PHASE_COLORS[phase] = PALETTE[Object.keys(PHASE_COLORS).length % PALETTE.length];
  return PHASE_COLORS[phase];
}

export default function Schedule({ orgId, role, personId }) {
  const [searchParams] = useSearchParams();     // dashboard rows deep-link ?job=
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [tab, setTab] = useState('gantt');
  const [items, setItems] = useState([]);
  const [deps, setDeps] = useState([]);
  const [drift, setDrift] = useState({});   // item_id -> v_schedule_item_progress row (015)
  const [lastEvent, setLastEvent] = useState(null);
  const [drawer, setDrawer] = useState(null); // item id
  const [err, setErr] = useState('');
  const canManage = ['owner','admin','pm'].includes(role);
  const canShift = ['owner','admin','pm','super'].includes(role);
  const job = jobs.find((j) => j.id === jobId);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('jobs')
        .select('id, name, schedule_status').eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setJobs(data ?? []);
      const wanted = searchParams.get('job');
      setJobId((cur) => cur
        || (wanted && data?.some((j) => j.id === wanted) ? wanted : '')
        || data?.[0]?.id || '');
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const load = async () => {
    if (!jobId) { setItems([]); setDeps([]); return; }
    setErr('');
    const [{ data: si }, { data: sd }, { data: ev }, { data: j }, { data: pg }] = await Promise.all([
      supabase.from('schedule_items').select('*').eq('job_id', jobId).order('sort').order('created_at'),
      supabase.from('schedule_deps').select('*, predecessor:schedule_items!schedule_deps_predecessor_id_fkey ( id, title )'),
      supabase.from('schedule_events').select('*').eq('job_id', jobId).order('created_at', { ascending: false }).limit(1),
      supabase.from('jobs').select('id, name, schedule_status').eq('id', jobId).maybeSingle(),
      supabase.from('v_schedule_item_progress').select('*').eq('job_id', jobId),
    ]);
    setDrift(Object.fromEntries((pg ?? []).map((p) => [p.item_id, p])));
    const ids = new Set((si ?? []).map((x) => x.id));
    setItems(si ?? []);
    setDeps((sd ?? []).filter((d) => ids.has(d.successor_id)));
    setLastEvent(ev?.[0] ?? null);
    if (j) setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, ...j } : x)));
  };
  useEffect(() => { load(); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = async () => {
    setErr('');
    const { error } = await supabase.rpc('publish_schedule', { p_job: jobId });
    if (error) { setErr(error.message); return; }
    load();
  };

  const tabBtn = (id, label, testid) => (
    <button key={id} data-testid={testid} onClick={() => setTab(id)}
      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700,
        background: tab === id ? 'var(--navy)' : 'transparent',
        color: tab === id ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer' }}>{label}</button>
  );

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        <div data-testid="schedule-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Schedule</div>
        <select data-testid="schedule-job" style={{ ...input, minWidth: 220 }} value={jobId} onChange={(e) => setJobId(e.target.value)}>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        {job && (
          <span data-testid="schedule-status-badge" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800,
            background: job.schedule_status === 'published' ? 'var(--good, #3d6b4f)' : 'var(--line)',
            color: job.schedule_status === 'published' ? '#fff' : 'var(--ink)' }}>
            {job.schedule_status}
          </span>
        )}
        {job?.schedule_status === 'draft' && canManage && items.length > 0 && (
          <button data-testid="schedule-publish" style={btn} onClick={publish}>Publish — set baseline</button>
        )}
        <div style={{ display: 'flex', gap: 4, background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 3, marginLeft: 'auto' }}>
          {tabBtn('gantt', 'Gantt', 'schedule-tab-gantt')}
          {tabBtn('list', 'List', 'schedule-tab-list')}
          {tabBtn('templates', 'Templates', 'schedule-tab-templates')}
        </div>
      </div>
      {lastEvent && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Last change: {nice(lastEvent.kind)}{lastEvent.reason ? ` — ${lastEvent.reason}` : ''} · {new Date(lastEvent.created_at).toLocaleString()}
        </div>
      )}
      {err && <div style={{ fontSize: 13, color: 'var(--bad)', marginBottom: 8 }}>{err}</div>}

      {tab === 'gantt' && <Gantt orgId={orgId} items={items} deps={deps} drift={drift} canShift={canShift} reload={load} setErr={setErr} openDrawer={setDrawer} />}
      {tab === 'list' && <List orgId={orgId} jobId={jobId} personId={personId} items={items} deps={deps} drift={drift} canShift={canShift} canManage={canManage} reload={load} setErr={setErr} openDrawer={setDrawer} />}
      {tab === 'templates' && <Templates orgId={orgId} jobs={jobs} canManage={canManage} reload={load} setErr={setErr} />}

      {drawer && <ItemDrawer itemId={drawer} items={items} deps={deps} drift={drift} canShift={canShift} canManage={canManage}
                             close={() => setDrawer(null)} reload={load} setErr={setErr} />}
    </div>
  );
}

/* ---------------- Gantt: drag-cascade + baseline toggle ---------------- */
function Gantt({ orgId, items, deps, drift, canShift, reload, setErr, openDrawer }) {
  const [showBaseline, setShowBaseline] = useState(true);
  const [drag, setDrag] = useState(null); // { id, startX, delta }
  const [reasonFor, setReasonFor] = useState(null); // { id, newStart }
  const [reason, setReason] = useState('');
  const dayW = 22, labelW = 260, rowH = 34;

  const dated = items.filter((i) => i.start_date && i.end_date);
  const predCount = useMemo(() => {
    const m = {};
    deps.forEach((d) => { m[d.successor_id] = (m[d.successor_id] ?? 0) + 1; });
    return m;
  }, [deps]);

  let min = dated[0]?.start_date ?? new Date().toISOString().slice(0, 10);
  let max = dated[0]?.end_date ?? min;
  dated.forEach((i) => {
    const s = i.baseline_start && showBaseline && i.baseline_start < i.start_date ? i.baseline_start : i.start_date;
    const e = i.baseline_end && showBaseline && i.baseline_end > i.end_date ? i.baseline_end : i.end_date;
    if (s < min) min = s;
    if (e > max) max = e;
  });
  min = addD(iso(min), -2);
  max = addD(iso(max), 3);
  const nDays = diffD(max, min) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const x = (d) => diffD(iso(d), min) * dayW;

  const months = [];
  for (let i = 0; i < nDays; i++) {
    const d = addD(min, i);
    const label = toUTC(d).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    if (!months.length || months[months.length - 1].label !== label) months.push({ label, from: i, days: 1 });
    else months[months.length - 1].days++;
  }

  const onDown = (e, it) => {
    if (!canShift) return;
    e.preventDefault();
    setDrag({ id: it.id, startX: e.clientX, delta: 0, orig: iso(it.start_date) });
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => setDrag((d) => d && { ...d, delta: Math.round((e.clientX - d.startX) / dayW) });
    const up = () => {
      setDrag((d) => {
        if (d && d.delta !== 0) setReasonFor({ id: d.id, newStart: addD(d.orig, d.delta) });
        return null;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [drag]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dated.length === 0) {
    return <div style={{ ...card, flex: 1 }}>No dated schedule items yet — import a template or add items in the List tab.</div>;
  }

  const confirmShift = async () => {
    if (!reason.trim()) { setErr('One change, one reason — a shift reason is required.'); return; }
    setErr('');
    const { error } = await supabase.rpc('shift_schedule_item',
      { p_item: reasonFor.id, p_new_start: reasonFor.newStart, p_reason: reason.trim() });
    setReasonFor(null); setReason('');
    if (error) { setErr(error.message); return; }
    reload();
  };

  return (
    <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input data-testid="gantt-baseline-toggle" type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} />
          Show baseline
        </label>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {canShift ? 'Drag a bar to shift — dependents cascade from the database.' : 'Read-only view.'}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ width: labelW + nDays * dayW, position: 'relative' }}>
          {/* month + day headers */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: 'var(--cream-panel)' }}>
            <div style={{ width: labelW, flexShrink: 0, borderBottom: '2px solid var(--navy)' }} />
            <div>
              <div style={{ display: 'flex' }}>
                {months.map((m, i) => (
                  <div key={i} style={{ width: m.days * dayW, fontSize: 11, fontWeight: 800, color: 'var(--navy)', padding: '2px 4px', borderLeft: '1px solid var(--line)' }}>{m.label}</div>
                ))}
              </div>
              <div style={{ display: 'flex', borderBottom: '2px solid var(--navy)' }}>
                {Array.from({ length: nDays }).map((_, i) => {
                  const d = addD(min, i);
                  const dow = toUTC(d).getUTCDay();
                  const weekend = dow === 0 || dow === 6;
                  return (
                    <div key={i} style={{ width: dayW, textAlign: 'center', fontSize: 9,
                      color: weekend ? 'var(--ink-soft)' : 'var(--ink)',
                      background: weekend ? 'rgba(0,0,0,0.05)' : 'transparent' }}>
                      {toUTC(d).getUTCDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* rows */}
          {items.map((it, idx) => {
            const isDrag = drag?.id === it.id;
            const start = it.start_date ? addD(iso(it.start_date), isDrag ? drag.delta : 0) : null;
            const end = it.end_date ? addD(iso(it.end_date), isDrag ? drag.delta : 0) : null;
            const col = phaseColor(it.phase, idx);
            return (
              <div key={it.id} data-testid="gantt-row" style={{ display: 'flex', height: rowH, borderBottom: '1px solid var(--line)' }}>
                <div onClick={() => openDrawer(it.id)}
                  style={{ width: labelW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', cursor: 'pointer', background: '#fff', position: 'sticky', left: 0, zIndex: 2, borderRight: '1px solid var(--line)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: col, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                  {predCount[it.id] ? <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>⇐{predCount[it.id]}</span> : null}
                  {drift?.[it.id]?.work_behind && (
                    <span title={`work behind: ${drift[it.id].actual_pct}% done, ${drift[it.id].expected_pct}% expected`}
                      style={{ fontSize: 9, fontWeight: 800, background: '#FBE9E9', color: '#8F2730', borderRadius: 4, padding: '1px 4px' }}>
                      ⚠ {drift[it.id].actual_pct}%
                    </span>
                  )}
                  {!it.client_visible && <span title="internal only" style={{ fontSize: 10 }}>🔒</span>}
                </div>
                <div style={{ position: 'relative', width: nDays * dayW,
                  background: `repeating-linear-gradient(90deg, transparent 0, transparent ${dayW - 1}px, var(--line) ${dayW - 1}px, var(--line) ${dayW}px)` }}>
                  {/* today line */}
                  <div style={{ position: 'absolute', left: x(today), top: 0, bottom: 0, width: 2, background: 'var(--gold)', zIndex: 1 }} />
                  {/* baseline ghost */}
                  {showBaseline && it.baseline_start && it.baseline_end && (
                    <div style={{ position: 'absolute', left: x(it.baseline_start), top: rowH - 9,
                      width: (diffD(iso(it.baseline_end), iso(it.baseline_start)) + 1) * dayW - 2,
                      height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.22)' }} title="baseline" />
                  )}
                  {/* current bar / milestone */}
                  {start && (it.milestone ? (
                    <div onMouseDown={(e) => onDown(e, it)} onClick={() => openDrawer(it.id)}
                      style={{ position: 'absolute', left: x(start) + dayW / 2 - 7, top: 6, width: 14, height: 14,
                        background: col, transform: 'rotate(45deg)', cursor: canShift ? 'grab' : 'pointer', zIndex: 2 }}
                      title={`${it.title} — ${fmtShort(start)}`} />
                  ) : (
                    <div onMouseDown={(e) => onDown(e, it)} onClick={() => !isDrag && openDrawer(it.id)}
                      style={{ position: 'absolute', left: x(start), top: 6,
                        width: (diffD(end, start) + 1) * dayW - 3, height: 15, borderRadius: 5,
                        background: it.status === 'complete' ? 'var(--good, #3d6b4f)' : col,
                        opacity: it.status === 'pending' ? 0.85 : 1,
                        outline: it.status === 'in_progress' ? '2px solid var(--gold)' : 'none',
                        cursor: canShift ? 'grab' : 'pointer', zIndex: 2 }}
                      title={`${it.title} — ${fmtShort(start)} → ${fmtShort(end)}${it.actual_end ? ' (field-complete)' : ''}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {reasonFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ ...card, background: '#fff', width: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Shift to {fmtShort(reasonFor.newStart)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>One change, one reason — everyone downstream sees it.</div>
            <input data-testid="shift-reason" style={input} placeholder="Reason for the shift…" value={reason}
              onChange={(e) => setReason(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnGhost} onClick={() => { setReasonFor(null); setReason(''); }}>Cancel</button>
              <button data-testid="shift-confirm" style={btn} onClick={confirmShift}>Shift & cascade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- List: LEARNINGS #15 — sort on EVERY header, filter EVERY column -------- */
function List({ orgId, jobId, personId, items, deps, drift, canShift, canManage, reload, setErr, openDrawer }) {
  const [sort, setSort] = useState({ key: 'sort', dir: 'asc' });
  const [fTitle, setFTitle] = useState('');
  const [fPhase, setFPhase] = useState('');
  const [fDisc, setFDisc] = useState('');
  const [fDays, setFDays] = useState('');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fBase, setFBase] = useState('');
  const [fDeps, setFDeps] = useState('');
  const [fProg, setFProg] = useState('');
  // add-item form
  const [nTitle, setNTitle] = useState('');
  const [nPhase, setNPhase] = useState('');
  const [nDisc, setNDisc] = useState('');
  const [nDays, setNDays] = useState('1');
  const [nStart, setNStart] = useState('');
  const [busy, setBusy] = useState(false);

  const predCount = useMemo(() => {
    const m = {};
    deps.forEach((d) => { m[d.successor_id] = (m[d.successor_id] ?? 0) + 1; });
    return m;
  }, [deps]);
  const phases = useMemo(() => [...new Set(items.map((i) => i.phase).filter(Boolean))], [items]);
  const slip = (i) => (i.baseline_start && i.start_date) ? diffD(iso(i.start_date), iso(i.baseline_start)) : null;

  const rows = useMemo(() => {
    const filtered = items.filter((i) => {
      const s = slip(i);
      return (!fTitle || i.title.toLowerCase().includes(fTitle.toLowerCase()))
        && (!fPhase || i.phase === fPhase)
        && (!fDisc || i.discipline === fDisc)
        && (!fDays || String(i.duration_days) === fDays.trim())
        && (!fStart || iso(i.start_date).includes(fStart.trim()))
        && (!fEnd || iso(i.end_date).includes(fEnd.trim()))
        && (!fStatus || i.status === fStatus)
        && (!fBase || (fBase === 'on_plan' ? s === 0 : fBase === 'slipped' ? (s ?? 0) > 0 : fBase === 'ahead' ? (s ?? 0) < 0 : s === null))
        && (!fDeps || String(predCount[i.id] ?? 0) === fDeps.trim())
        && (!fProg || (fProg === 'behind' ? !!drift?.[i.id]?.work_behind
                     : fProg === 'on_pace' ? (drift?.[i.id]?.drift != null && !drift[i.id].work_behind)
                     : drift?.[i.id]?.drift == null));
    });
    const val = (i) => {
      switch (sort.key) {
        case 'sort': return i.sort;
        case 'title': return i.title.toLowerCase();
        case 'phase': return i.phase ?? '';
        case 'discipline': return i.discipline ?? '';
        case 'days': return i.duration_days;
        case 'start': return iso(i.start_date);
        case 'end': return iso(i.end_date);
        case 'status': return i.status;
        case 'baseline': return slip(i) ?? -9999;
        case 'deps': return predCount[i.id] ?? 0;
        case 'prog': return drift?.[i.id]?.actual_pct ?? -1;
        default: return i.sort;
      }
    };
    return filtered.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
  }, [items, deps, drift, sort, fTitle, fPhase, fDisc, fDays, fStart, fEnd, fStatus, fBase, fDeps, fProg]); // eslint-disable-line react-hooks/exhaustive-deps

  const headerCell = (key, label) => (
    <span data-testid={`si-sort-${key}`} onClick={() => setSort((p) =>
        p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}
      style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' \u25B4' : ' \u25BE') : ''}
    </span>
  );

  const clearFilters = () => { setFTitle(''); setFPhase(''); setFDisc(''); setFDays(''); setFStart(''); setFEnd(''); setFStatus(''); setFBase(''); setFDeps(''); setFProg(''); };

  const addItem = async () => {
    setErr('');
    if (!nTitle.trim()) { setErr('Item title is required.'); return; }
    setBusy(true);
    const { error } = await supabase.from('schedule_items').insert({
      id: crypto.randomUUID(), org_id: orgId, job_id: jobId,
      title: nTitle.trim(), phase: nPhase.trim() || null, discipline: nDisc || null,
      duration_days: Math.max(0, Number(nDays) || 1),
      start_date: nStart || null,
      sort: (items[items.length - 1]?.sort ?? 0) + 1,
      created_by: personId,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setNTitle('');
    reload();
  };

  const grid = '46px 2fr 1fr 1fr 64px 96px 96px 1fr 90px 64px 86px';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 12 }}>
      {canShift && (
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input data-testid="si-title" style={{ ...input, flex: 2, minWidth: 180 }} placeholder="Schedule item title"
            value={nTitle} onChange={(e) => setNTitle(e.target.value)} />
          <input data-testid="si-phase" style={{ ...input, width: 130 }} placeholder="Phase" value={nPhase} onChange={(e) => setNPhase(e.target.value)} />
          <select data-testid="si-discipline" style={input} value={nDisc} onChange={(e) => setNDisc(e.target.value)}>
            <option value="">Discipline…</option>
            {DISCIPLINES.map((d) => <option key={d} value={d}>{nice(d)}</option>)}
          </select>
          <input data-testid="si-days" style={{ ...input, width: 70 }} placeholder="Days" value={nDays} onChange={(e) => setNDays(e.target.value)} />
          <input data-testid="si-start" type="date" style={input} value={nStart} onChange={(e) => setNStart(e.target.value)} />
          <button data-testid="si-add" style={btn} disabled={busy} onClick={addItem}>Add item</button>
        </div>
      )}

      <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '10px 16px', borderBottom: '2px solid var(--navy)', fontSize: 11, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase' }}>
          {headerCell('sort', '#')}{headerCell('title', 'Title')}{headerCell('phase', 'Phase')}{headerCell('discipline', 'Discipline')}{headerCell('days', 'Days')}{headerCell('start', 'Start')}{headerCell('end', 'End')}{headerCell('status', 'Status')}{headerCell('baseline', 'Baseline Δ')}{headerCell('deps', 'Deps')}{headerCell('prog', 'Prog')}
        </div>
        {/* filter row — a control on EVERY column (#15) */}
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '7px 16px', borderBottom: '1px solid var(--line)', background: '#fff', alignItems: 'center' }}>
          <button data-testid="si-filter-clear" style={{ ...btnGhost, padding: '4px 4px', fontSize: 11 }} onClick={clearFilters} title="Clear all filters">✕</button>
          <input data-testid="si-filter-title" style={filterCtl} placeholder="Contains…" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
          <select data-testid="si-filter-phase" style={filterCtl} value={fPhase} onChange={(e) => setFPhase(e.target.value)}>
            <option value="">All</option>{phases.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select data-testid="si-filter-discipline" style={filterCtl} value={fDisc} onChange={(e) => setFDisc(e.target.value)}>
            <option value="">All</option>{DISCIPLINES.map((d) => <option key={d} value={d}>{nice(d)}</option>)}
          </select>
          <input data-testid="si-filter-days" style={filterCtl} placeholder="=" value={fDays} onChange={(e) => setFDays(e.target.value)} />
          <input data-testid="si-filter-start" style={filterCtl} placeholder="YYYY-MM…" value={fStart} onChange={(e) => setFStart(e.target.value)} />
          <input data-testid="si-filter-end" style={filterCtl} placeholder="YYYY-MM…" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
          <select data-testid="si-filter-status" style={filterCtl} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All</option>{SI_STATUSES.map((s) => <option key={s} value={s}>{nice(s)}</option>)}
          </select>
          <select data-testid="si-filter-baseline" style={filterCtl} value={fBase} onChange={(e) => setFBase(e.target.value)}>
            <option value="">All</option>
            <option value="on_plan">on plan</option>
            <option value="slipped">slipped</option>
            <option value="ahead">ahead</option>
            <option value="unpublished">no baseline</option>
          </select>
          <input data-testid="si-filter-deps" style={filterCtl} placeholder="=" value={fDeps} onChange={(e) => setFDeps(e.target.value)} />
          <select data-testid="si-filter-prog" style={filterCtl} value={fProg} onChange={(e) => setFProg(e.target.value)}>
            <option value="">All</option>
            <option value="behind">behind</option>
            <option value="on_pace">on pace</option>
            <option value="no_signal">no signal</option>
          </select>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.map((i) => {
            const s = slip(i);
            return (
              <div key={i.id} data-testid="si-row" onClick={() => openDrawer(i.id)}
                style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '9px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, alignItems: 'center', cursor: 'pointer', background: '#fff' }}>
                <span style={{ color: 'var(--ink-soft)' }}>{i.sort}</span>
                <span style={{ fontWeight: 600 }}>{i.milestone ? '◆ ' : ''}{i.title}{!i.client_visible ? ' 🔒' : ''}</span>
                <span>{i.phase ?? '—'}</span>
                <span>{nice(i.discipline) || '—'}</span>
                <span>{i.duration_days}</span>
                <span>{fmtShort(i.start_date)}</span>
                <span>{fmtShort(i.end_date)}</span>
                <span style={{ fontWeight: 700, color: i.status === 'complete' ? 'var(--good, #3d6b4f)' : i.status === 'in_progress' ? 'var(--gold)' : 'var(--ink-soft)' }}>{nice(i.status)}</span>
                <span style={{ color: s > 0 ? 'var(--bad)' : s < 0 ? 'var(--good, #3d6b4f)' : 'var(--ink-soft)' }}>
                  {s === null ? '—' : s === 0 ? 'on plan' : s > 0 ? `+${s}d` : `${s}d`}
                </span>
                <span style={{ color: 'var(--ink-soft)' }}>{predCount[i.id] ?? 0}</span>
                <span>
                  {drift?.[i.id]?.work_behind ? (
                    <span title={`${drift[i.id].actual_pct}% done, ${drift[i.id].expected_pct}% expected`}
                      style={{ fontSize: 11, fontWeight: 800, background: '#FBE9E9', color: '#8F2730', borderRadius: 6, padding: '2px 7px' }}>
                      ⚠ {drift[i.id].actual_pct}%
                    </span>
                  ) : drift?.[i.id]?.drift != null ? (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{drift[i.id].actual_pct}%</span>
                  ) : <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                </span>
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-soft)' }}>No items match the filters.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Item drawer: deps, shift, status, visibility ---------------- */
function ItemDrawer({ itemId, items, deps, drift, canShift, canManage, close, reload, setErr }) {
  const it = items.find((x) => x.id === itemId);
  const myPreds = deps.filter((d) => d.successor_id === itemId);
  const [predSel, setPredSel] = useState('');
  const [lag, setLag] = useState('0');
  const [shiftDate, setShiftDate] = useState(iso(it?.start_date));
  const [shiftReason, setShiftReason] = useState('');
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!it) return;
    supabase.from('schedule_events').select('*').eq('item_id', itemId)
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setEvents(data ?? []));
  }, [itemId, it?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!it) return null;

  const addDep = async () => {
    setErr('');
    if (!predSel) return;
    const { error } = await supabase.from('schedule_deps').insert({
      id: crypto.randomUUID(), successor_id: itemId, predecessor_id: predSel, lag_days: Number(lag) || 0,
    });
    if (error) { setErr(error.message); return; }
    setPredSel(''); setLag('0');
    reload();
  };
  const dropDep = async (id) => {
    setErr('');
    const { error } = await supabase.from('schedule_deps').delete().eq('id', id);
    if (error) { setErr(error.message); return; }
    reload();
  };
  const doShift = async () => {
    setErr('');
    if (!shiftReason.trim()) { setErr('One change, one reason — a shift reason is required.'); return; }
    const { error } = await supabase.rpc('shift_schedule_item',
      { p_item: itemId, p_new_start: shiftDate, p_reason: shiftReason.trim() });
    if (error) { setErr(error.message); return; }
    setShiftReason('');
    reload();
  };
  const setField = async (patch) => {
    setErr('');
    const { error } = await supabase.from('schedule_items').update(patch).eq('id', itemId);
    if (error) { setErr(error.message); return; }
    reload();
  };
  const remove = async () => {
    setErr('');
    const { error } = await supabase.from('schedule_items').delete().eq('id', itemId);
    if (error) { setErr(error.message); return; }
    close(); reload();
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#fff', borderLeft: '1px solid var(--line)', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '2px solid var(--navy)' }}>
        <div data-testid="si-drawer-title" style={{ fontWeight: 800, color: 'var(--navy)', flex: 1 }}>{it.title}</div>
        <button data-testid="si-drawer-close" style={btnGhost} onClick={close}>Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
        {(() => {
          const p = drift?.[itemId];
          if (!p || it.status === 'complete') return null;
          const behind = p.work_behind;
          return (
            <div data-testid="si-drawer-drift" style={{ borderLeft: `4px solid ${behind ? '#8F2730' : 'var(--line)'}`,
              background: behind ? '#FBE9E9' : 'var(--cream-panel)', borderRadius: '0 8px 8px 0', padding: '8px 12px', fontSize: 12.5 }}>
              <b style={{ color: behind ? '#8F2730' : 'var(--navy)' }}>
                {behind ? '⚠ Work behind schedule' : 'Progress'}
              </b>
              <div style={{ marginTop: 3 }}>
                {p.drift == null
                  ? `Expected ${p.expected_pct ?? '—'}% by today — no field signal yet (add a checklist to a linked WO, or set % below).`
                  : `${p.actual_pct}% done vs ${p.expected_pct}% expected` +
                    (p.from_checklist ? ` · from checklist ${p.checklist_done}/${p.checklist_total}` : ' · manual')}
              </div>
            </div>
          );
        })()}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><b>Start</b><br />{fmtShort(it.start_date)}</div>
          <div><b>End</b><br />{fmtShort(it.end_date)}</div>
          <div><b>Baseline</b><br />{it.baseline_start ? `${fmtShort(it.baseline_start)} → ${fmtShort(it.baseline_end)}` : 'not published'}</div>
          <div><b>Actual</b><br />{it.actual_start ? `${fmtShort(it.actual_start)} → ${it.actual_end ? fmtShort(it.actual_end) : '…'}` : '—'}</div>
        </div>

        {canShift && (
          <>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>Duration</b>
              <input data-testid="si-drawer-days" style={{ ...input, width: 64 }} defaultValue={it.duration_days}
                onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== it.duration_days) setField({ duration_days: v }); }} />
              <span>workdays</span>
              <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="checkbox" checked={it.ignore_workdays} onChange={(e) => setField({ ignore_workdays: e.target.checked })} />
                run through weekends
              </label>
              <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input data-testid="si-drawer-visible" type="checkbox" checked={it.client_visible} onChange={(e) => setField({ client_visible: e.target.checked })} />
                client visible
              </label>
              {!drift?.[itemId]?.from_checklist && it.status !== 'complete' && (
                <label style={{ display: 'flex', gap: 4, alignItems: 'center' }} title="Manual fallback — checklists on linked WOs override this">
                  % done
                  <input data-testid="si-drawer-manual-pct" style={{ ...input, width: 58 }}
                    defaultValue={it.manual_pct ?? ''} placeholder="—"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const v = raw === '' ? null : Math.max(0, Math.min(100, Number(raw) || 0));
                      if (v !== it.manual_pct) setField({ manual_pct: v });
                    }} />
                </label>
              )}
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b>Shift start — cascade runs in the database</b>
              <div style={{ display: 'flex', gap: 6 }}>
                <input data-testid="si-drawer-shift-date" type="date" style={input} value={shiftDate ?? ''} onChange={(e) => setShiftDate(e.target.value)} />
                <input data-testid="si-drawer-shift-reason" style={{ ...input, flex: 1 }} placeholder="Reason (required)"
                  value={shiftReason} onChange={(e) => setShiftReason(e.target.value)} />
                <button data-testid="si-drawer-shift" style={btn} onClick={doShift}>Shift</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {it.status !== 'in_progress' && it.status !== 'complete' && (
                <button style={btnGhost} onClick={() => setField({ status: 'in_progress', actual_start: it.actual_start ?? new Date().toISOString().slice(0, 10) })}>Start</button>
              )}
              {it.status !== 'complete' && (
                <button data-testid="si-drawer-complete" style={btnGhost}
                  onClick={() => setField({ status: 'complete', actual_start: it.actual_start ?? new Date().toISOString().slice(0, 10), actual_end: new Date().toISOString().slice(0, 10) })}>
                  Mark complete
                </button>
              )}
              {canManage && <button style={{ ...btnGhost, color: 'var(--bad)', marginLeft: 'auto' }} onClick={remove}>Delete item</button>}
            </div>
          </>
        )}

        <div>
          <b>Predecessors (finish → start)</b>
          {myPreds.length === 0 && <div style={{ color: 'var(--ink-soft)', marginTop: 4 }}>None — this item anchors on its own start date.</div>}
          {myPreds.map((d) => (
            <div key={d.id} data-testid="si-dep-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ flex: 1 }}>{d.predecessor?.title ?? d.predecessor_id.slice(0, 8)}</span>
              <span style={{ color: 'var(--ink-soft)' }}>lag {d.lag_days}d</span>
              {canShift && <button style={{ ...btnGhost, padding: '3px 8px', fontSize: 12 }} onClick={() => dropDep(d.id)}>remove</button>}
            </div>
          ))}
          {canShift && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <select data-testid="si-dep-pred" style={{ ...input, flex: 1 }} value={predSel} onChange={(e) => setPredSel(e.target.value)}>
                <option value="">Add predecessor…</option>
                {items.filter((x) => x.id !== itemId).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
              <input data-testid="si-dep-lag" style={{ ...input, width: 60 }} value={lag} onChange={(e) => setLag(e.target.value)} title="lag workdays" />
              <button data-testid="si-dep-add" style={btn} onClick={addDep}>Link</button>
            </div>
          )}
        </div>

        <div>
          <b>Activity</b>
          {events.length === 0 && <div style={{ color: 'var(--ink-soft)', marginTop: 4 }}>No item events yet.</div>}
          {events.map((e) => (
            <div key={e.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{nice(e.kind)}</span>
              {e.reason ? ` — ${e.reason}` : ''} · {new Date(e.created_at).toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Templates: Day-N catalog + import (#15 grid) ---------------- */
function Templates({ orgId, jobs, canManage, reload, setErr }) {
  const [tpls, setTpls] = useState([]);
  const [counts, setCounts] = useState({});
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [fName, setFName] = useState('');
  const [fStyle, setFStyle] = useState('');
  const [fItems, setFItems] = useState('');
  const [open, setOpen] = useState(null);   // template id → item list
  const [openItems, setOpenItems] = useState([]);
  const [impTpl, setImpTpl] = useState('');
  const [impJob, setImpJob] = useState('');
  const [impStart, setImpStart] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState('');

  const load = async () => {
    const { data: t } = await supabase.from('schedule_templates').select('*').eq('org_id', orgId).order('name');
    setTpls(t ?? []);
    const ids = (t ?? []).map((x) => x.id);
    if (ids.length) {
      const { data: it } = await supabase.from('schedule_template_items').select('id, template_id').in('template_id', ids);
      const m = {};
      (it ?? []).forEach((x) => { m[x.template_id] = (m[x.template_id] ?? 0) + 1; });
      setCounts(m);
    } else setCounts({});
  };
  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) { setOpenItems([]); return; }
    supabase.from('schedule_template_items').select('*').eq('template_id', open).order('sort')
      .then(({ data }) => setOpenItems(data ?? []));
  }, [open]);

  const doImport = async () => {
    setErr(''); setOkMsg('');
    if (!impTpl || !impJob || !impStart) { setErr('Template, job, and start date are required.'); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('import_schedule_template',
      { p_job: impJob, p_template: impTpl, p_start: impStart });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOkMsg(`Imported ${data} items — dates computed from ${impStart} in workdays.`);
    reload();
  };

  const rows = useMemo(() => {
    const filtered = tpls.filter((t) =>
      (!fName || t.name.toLowerCase().includes(fName.toLowerCase()))
      && (!fStyle || (t.build_style ?? '').toLowerCase().includes(fStyle.toLowerCase()))
      && (!fItems || String(counts[t.id] ?? 0) === fItems.trim()));
    const val = (t) => sort.key === 'name' ? t.name.toLowerCase()
      : sort.key === 'style' ? (t.build_style ?? '')
      : sort.key === 'items' ? (counts[t.id] ?? 0)
      : t.created_at;
    return filtered.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
  }, [tpls, counts, sort, fName, fStyle, fItems]);

  const headerCell = (key, label) => (
    <span data-testid={`tpl-sort-${key}`} onClick={() => setSort((p) =>
        p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}
      style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' \u25B4' : ' \u25BE') : ''}
    </span>
  );

  const grid = '2fr 1fr 90px 130px';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 12 }}>
      {canManage && (
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <b style={{ fontSize: 13 }}>Import onto a job:</b>
          <select data-testid="tpl-import-tpl" style={input} value={impTpl} onChange={(e) => setImpTpl(e.target.value)}>
            <option value="">Template…</option>
            {tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select data-testid="tpl-import-job" style={input} value={impJob} onChange={(e) => setImpJob(e.target.value)}>
            <option value="">Job…</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <input data-testid="tpl-import-start" type="date" style={input} value={impStart} onChange={(e) => setImpStart(e.target.value)} />
          <button data-testid="tpl-import-go" style={btn} disabled={busy} onClick={doImport}>Import</button>
          {okMsg && <span style={{ fontSize: 13, color: 'var(--good, #3d6b4f)' }}>{okMsg}</span>}
        </div>
      )}

      <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '10px 16px', borderBottom: '2px solid var(--navy)', fontSize: 11, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase' }}>
          {headerCell('name', 'Template')}{headerCell('style', 'Build style')}{headerCell('items', 'Items')}{headerCell('created', 'Created')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '7px 16px', borderBottom: '1px solid var(--line)', background: '#fff', alignItems: 'center' }}>
          <input data-testid="tpl-filter-name" style={filterCtl} placeholder="Contains…" value={fName} onChange={(e) => setFName(e.target.value)} />
          <input data-testid="tpl-filter-style" style={filterCtl} placeholder="Contains…" value={fStyle} onChange={(e) => setFStyle(e.target.value)} />
          <input data-testid="tpl-filter-items" style={filterCtl} placeholder="=" value={fItems} onChange={(e) => setFItems(e.target.value)} />
          <button data-testid="tpl-filter-clear" style={{ ...btnGhost, padding: '4px 8px', fontSize: 12 }}
            onClick={() => { setFName(''); setFStyle(''); setFItems(''); }}>Clear</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rows.map((t) => (
            <React.Fragment key={t.id}>
              <div data-testid="tpl-row" onClick={() => setOpen(open === t.id ? null : t.id)}
                style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '9px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, alignItems: 'center', cursor: 'pointer', background: '#fff' }}>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span>{t.build_style ?? '—'}</span>
                <span>{counts[t.id] ?? 0}</span>
                <span style={{ color: 'var(--ink-soft)' }}>{fmtShort(t.created_at)}</span>
              </div>
              {open === t.id && (
                <div style={{ background: 'var(--cream-panel)', padding: '8px 24px', borderBottom: '1px solid var(--line)' }}>
                  {openItems.map((i) => (
                    <div key={i.id} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '3px 0' }}>
                      <span style={{ width: 60, color: 'var(--ink-soft)' }}>Day {i.day_offset + 1}</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{i.milestone ? '◆ ' : ''}{i.title}</span>
                      <span style={{ width: 120 }}>{i.phase ?? ''}</span>
                      <span style={{ width: 60 }}>{i.duration_days}d</span>
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
          {rows.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-soft)' }}>No templates yet.</div>}
        </div>
      </div>
    </div>
  );
}
