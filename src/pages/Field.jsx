import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

// The field spine surface (script 013, FIELD-SPINE.md APPROVED 8/5).
// One page, four tabs: Board (super dispatch) · Today (crew) · Daily Log ·
// Time (entry + approval queue). §9 laws: rows are columnar grids with
// headers (no voids); every status count is a door (filters the board).
// WO detail opens as a drawer — no page hop, scrolling is not your friend.

const DISCIPLINES = ['sitework','foundation_concrete','framing','roofing','masonry',
  'electrical','plumbing','hvac','insulation','drywall','paint','trim','flooring',
  'tile','cabinets','low_voltage','gutters','landscape_irrigation','pool',
  'well_septic','punch_clean'];
const WO_STATUSES = ['draft','issued','accepted','declined','in_progress',
  'complete','verified','closed','cancelled'];
const NEXT_STATUS = { // staff advance path; accepted/declined arrive via events
  draft: ['issued','cancelled'], issued: ['in_progress','cancelled'],
  accepted: ['in_progress','cancelled'], declined: ['issued','cancelled'],
  in_progress: ['complete','cancelled'], complete: ['verified','in_progress'],
  verified: ['closed'], closed: [], cancelled: ['draft'],
};
const input = { padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', fontSize: 13 };
const card = { background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 16px' };
const btn = { padding: '8px 13px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, fontSize: 13 };
const btnGhost = { ...btn, background: '#fff', border: '1px solid var(--line)', color: 'var(--ink)' };
const nice = (s) => (s ?? '').replace(/_/g, ' ');
const money = (n) => (n === null || n === undefined) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function Field({ role, personId, orgId }) {
  const [tab, setTab] = useState('board');
  const [jobs, setJobs] = useState([]);
  const [members, setMembers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [me, setMe] = useState(null); // my org_members row (discipline)

  const canDispatch = ['owner','admin','pm','super'].includes(role);
  const canApprove = ['owner','admin','pm','accounting'].includes(role);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const [{ data: j }, { data: m }, { data: c }, { data: mine }] = await Promise.all([
        supabase.from('jobs').select('id, name').eq('org_id', orgId).order('created_at', { ascending: false }),
        supabase.from('org_members').select('person_id, role, discipline, people ( id, full_name, email )').eq('org_id', orgId),
        supabase.from('cost_codes').select('id, code, name').eq('org_id', orgId).order('code'),
        supabase.from('org_members').select('discipline').eq('org_id', orgId).eq('person_id', personId).maybeSingle(),
      ]);
      if (cancelled) return;
      setJobs(j ?? []); setMembers(m ?? []); setCodes(c ?? []); setMe(mine ?? null);
    })();
    return () => { cancelled = true; };
  }, [orgId, personId]);

  const tabBtn = (id, label, testid) => (
    <button key={id} data-testid={testid} onClick={() => setTab(id)}
      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700,
        background: tab === id ? 'var(--navy)' : 'transparent',
        color: tab === id ? 'var(--cream)' : 'var(--ink-soft)' }}>{label}</button>
  );

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div data-testid="field-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Field</div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 3 }}>
          {tabBtn('board', 'Board', 'field-tab-board')}
          {tabBtn('today', 'Today', 'field-tab-today')}
          {tabBtn('logs', 'Daily Log', 'field-tab-logs')}
          {tabBtn('time', 'Time', 'field-tab-time')}
        </div>
      </div>
      {tab === 'board' && <Board orgId={orgId} personId={personId} jobs={jobs} members={members} codes={codes} canDispatch={canDispatch} />}
      {tab === 'today' && <Today orgId={orgId} personId={personId} me={me} />}
      {tab === 'logs' && <Logs orgId={orgId} personId={personId} jobs={jobs} />}
      {tab === 'time' && <Time orgId={orgId} personId={personId} jobs={jobs} codes={codes} canApprove={canApprove} />}
    </div>
  );
}

// ---------- Board (super dispatch) ----------
function Board({ orgId, personId, jobs, members, codes, canDispatch }) {
  const [wos, setWos] = useState([]);
  const [filter, setFilter] = useState('active'); // active | a status | all
  const [jobFilter, setJobFilter] = useState('all');
  const [discFilter, setDiscFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' });
  const [open, setOpen] = useState(null); // WO id for the drawer
  const [err, setErr] = useState('');
  // create form
  const [fTitle, setFTitle] = useState('');
  const [fJob, setFJob] = useState('');
  const [fKind, setFKind] = useState('work');
  const [fDisc, setFDisc] = useState('framing');
  const [fAssign, setFAssign] = useState('discipline');
  const [fPerson, setFPerson] = useState('');
  const [fSub, setFSub] = useState('');
  const [fCode, setFCode] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [subs, setSubs] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('work_orders')
      .select('*, jobs ( name ), cost_codes ( code )')
      .eq('org_id', orgId).order('created_at', { ascending: false }).limit(400);
    setWos(data ?? []);
  };
  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // sub participants for the selected job (assignee_kind = sub)
  useEffect(() => {
    if (!fJob || fAssign !== 'sub') { setSubs([]); return; }
    supabase.from('job_participants')
      .select('id, contacts ( display_name )').eq('job_id', fJob).eq('role', 'sub')
      .then(({ data }) => setSubs(data ?? []));
  }, [fJob, fAssign]);

  const counts = useMemo(() => {
    const c = {};
    WO_STATUSES.forEach((s) => { c[s] = 0; });
    wos.forEach((w) => { c[w.status] = (c[w.status] ?? 0) + 1; });
    return c;
  }, [wos]);

  const SORT_VAL = {
    number: (w) => w.number ?? 0,
    title: (w) => (w.title ?? '').toLowerCase(),
    job: (w) => (w.jobs?.name ?? '').toLowerCase(),
    discipline: (w) => w.discipline ?? '~', // nulls last
    assignee: (w) => w.assignee_kind ?? '',
    code: (w) => w.cost_codes?.code ?? '~',
    status: (w) => WO_STATUSES.indexOf(w.status),
    created_at: (w) => w.created_at,
  };
  const shown = useMemo(() => {
    const rows = wos.filter((w) =>
      (filter === 'all' ? true
        : filter === 'active' ? !['closed','cancelled','declined'].includes(w.status)
        : w.status === filter)
      && (jobFilter === 'all' || w.job_id === jobFilter)
      && (discFilter === 'all' || w.discipline === discFilter));
    const val = SORT_VAL[sort.key] ?? SORT_VAL.created_at;
    const mul = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      return av < bv ? -mul : av > bv ? mul : 0;
    });
  }, [wos, filter, jobFilter, discFilter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const headerCell = (key, label) => (
    <span data-testid={`wo-sort-${key}`} onClick={() => setSort((p) =>
        p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}
      style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' \u25B4' : ' \u25BE') : ''}
    </span>
  );

  const create = async () => {
    setErr('');
    if (!fTitle.trim() || !fJob) { setErr('Title and job are required.'); return; }
    if (fAssign === 'member' && !fPerson) { setErr('Pick a member.'); return; }
    if (fAssign === 'sub' && !fSub) { setErr('Pick a sub on this job.'); return; }
    setBusy(true);
    const { error } = await supabase.from('work_orders').insert({
      id: crypto.randomUUID(), org_id: orgId, job_id: fJob, kind: fKind,
      title: fTitle.trim(), discipline: fDisc || null,
      cost_code_id: fCode || null,
      assignee_kind: fAssign,
      assigned_person: fAssign === 'member' ? fPerson : null,
      assigned_participant_id: fAssign === 'sub' ? fSub : null,
      amount: fAssign === 'sub' && fAmount ? Number(fAmount) : null,
      created_by: personId,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setFTitle(''); setFAmount('');
    load();
  };

  const advance = async (wo, to) => {
    setErr('');
    const { error } = await supabase.from('work_orders').update({
      status: to,
      ...(to === 'in_progress' && !wo.actual_start ? { actual_start: new Date().toISOString().slice(0, 10) } : {}),
      ...(to === 'complete' ? { actual_end: new Date().toISOString().slice(0, 10) } : {}),
    }).eq('id', wo.id);
    if (error) { setErr(error.message); return; }
    await supabase.from('work_order_events').insert({
      id: crypto.randomUUID(), work_order_id: wo.id, kind: 'status_change',
      body: `${wo.status} → ${to}`, actor: personId,
    });
    load();
  };

  const grid = '52px 2fr 1.4fr 1.1fr 1fr 0.9fr 0.9fr 130px';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 12 }}>
      {/* status counts — every count is a door */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <CountChip label="Active" n={wos.filter((w) => !['closed','cancelled','declined'].includes(w.status)).length}
          active={filter === 'active'} onClick={() => setFilter('active')} testid="wo-count-active" />
        {WO_STATUSES.map((s) => (
          <CountChip key={s} label={nice(s)} n={counts[s]} active={filter === s}
            onClick={() => setFilter(s)} testid={`wo-count-${s}`} />
        ))}
        <CountChip label="All" n={wos.length} active={filter === 'all'} onClick={() => setFilter('all')} testid="wo-count-all" />
        <span style={{ flex: 1 }} />
        <select data-testid="wo-filter-job" style={input} value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="all">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        <select data-testid="wo-filter-discipline" style={input} value={discFilter} onChange={(e) => setDiscFilter(e.target.value)}>
          <option value="all">All disciplines</option>
          {DISCIPLINES.map((d) => <option key={d} value={d}>{nice(d)}</option>)}
        </select>
      </div>

      {canDispatch && (
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input data-testid="wo-title" style={{ ...input, flex: 2, minWidth: 180 }} placeholder="Work order title"
            value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
          <select data-testid="wo-job" style={input} value={fJob} onChange={(e) => setFJob(e.target.value)}>
            <option value="">Job…</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <select data-testid="wo-kind" style={input} value={fKind} onChange={(e) => setFKind(e.target.value)}>
            <option value="work">work</option><option value="punch">punch</option>
          </select>
          <select data-testid="wo-discipline" style={input} value={fDisc} onChange={(e) => setFDisc(e.target.value)}>
            {DISCIPLINES.map((d) => <option key={d} value={d}>{nice(d)}</option>)}
          </select>
          <select data-testid="wo-code" style={input} value={fCode} onChange={(e) => setFCode(e.target.value)}>
            <option value="">Cost code…</option>
            {codes.map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
          </select>
          <select data-testid="wo-assign-kind" style={input} value={fAssign} onChange={(e) => setFAssign(e.target.value)}>
            <option value="discipline">discipline pool</option>
            <option value="member">member</option>
            <option value="sub">sub</option>
          </select>
          {fAssign === 'member' && (
            <select data-testid="wo-assignee" style={input} value={fPerson} onChange={(e) => setFPerson(e.target.value)}>
              <option value="">Member…</option>
              {members.map((m) => <option key={m.person_id} value={m.person_id}>{m.people?.full_name || m.people?.email}</option>)}
            </select>
          )}
          {fAssign === 'sub' && (
            <>
              <select data-testid="wo-sub" style={input} value={fSub} onChange={(e) => setFSub(e.target.value)}>
                <option value="">Sub on job…</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.contacts?.display_name ?? s.id.slice(0, 8)}</option>)}
              </select>
              <input data-testid="wo-amount" style={{ ...input, width: 110 }} placeholder="Amount"
                value={fAmount} onChange={(e) => setFAmount(e.target.value)} />
            </>
          )}
          <button data-testid="wo-create" style={btn} disabled={busy} onClick={create}>Create</button>
          {err && <span style={{ fontSize: 13, color: 'var(--bad)' }}>{err}</span>}
        </div>
      )}

      {/* columnar grid, header row — no voids */}
      <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '10px 16px', borderBottom: '2px solid var(--navy)', fontSize: 11, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase' }}>
          {headerCell('number', '#')}{headerCell('title', 'Title')}{headerCell('job', 'Job')}{headerCell('discipline', 'Discipline')}{headerCell('assignee', 'Assignee')}{headerCell('code', 'Code')}{headerCell('status', 'Status')}<span>Advance</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {shown.length === 0 && <div style={{ padding: 16, color: 'var(--ink-soft)', fontSize: 13 }}>No work orders in this view.</div>}
          {shown.map((w) => (
            <div key={w.id} data-testid="wo-row" onClick={() => setOpen(w.id)}
              style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '9px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ color: 'var(--ink-soft)' }}>{w.kind === 'punch' ? 'P' : ''}{w.number}</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.jobs?.name}</span>
              <span>{nice(w.discipline) || '—'}</span>
              <span>{w.assignee_kind}</span>
              <span>{w.cost_codes?.code ?? '—'}</span>
              <span style={{ fontWeight: 700, color: ['complete','verified','closed'].includes(w.status) ? 'var(--good, #2f7d32)' : 'var(--navy)' }}>{nice(w.status)}</span>
              <span onClick={(e) => e.stopPropagation()}>
                {(NEXT_STATUS[w.status] ?? []).length > 0 && (
                  <select data-testid="wo-advance" style={{ ...input, padding: '5px 8px', fontSize: 12 }} value=""
                    onChange={(e) => { if (e.target.value) advance(w, e.target.value); }}>
                    <option value="">→</option>
                    {NEXT_STATUS[w.status].map((s) => <option key={s} value={s}>{nice(s)}</option>)}
                  </select>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      {open && <Drawer woId={open} personId={personId} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function CountChip({ label, n, active, onClick, testid }) {
  return (
    <button data-testid={testid} onClick={onClick}
      style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        background: active ? 'var(--navy)' : '#fff', color: active ? 'var(--cream)' : 'var(--ink)' }}>
      {label} <span style={{ opacity: 0.75 }}>{n}</span>
    </button>
  );
}

// ---------- WO drawer: checklist + events ----------
function Drawer({ woId, personId, onClose }) {
  const [wo, setWo] = useState(null);
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const [{ data: w }, { data: i }, { data: e }] = await Promise.all([
      supabase.from('work_orders').select('*, jobs ( name )').eq('id', woId).maybeSingle(),
      supabase.from('work_order_items').select('*').eq('work_order_id', woId).order('sort'),
      supabase.from('work_order_events').select('*').eq('work_order_id', woId).order('created_at', { ascending: false }).limit(50),
    ]);
    setWo(w ?? false); setItems(i ?? []); setEvents(e ?? []);
  };
  useEffect(() => { load(); }, [woId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = async () => {
    if (!newItem.trim()) return;
    const { error } = await supabase.from('work_order_items').insert({
      id: crypto.randomUUID(), work_order_id: woId, label: newItem.trim(), sort: items.length,
    });
    if (error) { setErr(error.message); return; }
    setNewItem(''); load();
  };
  const toggle = async (it) => {
    const next = !it.done;
    // optimistic: flip locally first (field connections are slow; the
    // checkbox must respond on tap), persist behind it, revert on error.
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, done: next } : p)));
    const { error } = await supabase.from('work_order_items').update({
      done: next, done_by: next ? personId : null,
      done_at: next ? new Date().toISOString() : null,
    }).eq('id', it.id);
    if (error) { setErr(error.message); load(); return; }
    load();
  };
  const say = async () => {
    if (!comment.trim()) return;
    const { error } = await supabase.from('work_order_events').insert({
      id: crypto.randomUUID(), work_order_id: woId, kind: 'comment',
      body: comment.trim(), actor: personId,
    });
    if (error) { setErr(error.message); return; }
    setComment(''); load();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.35)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div data-testid="wo-drawer" onClick={(e) => e.stopPropagation()}
        style={{ width: 460, height: '100%', background: 'var(--cream)', boxShadow: '-8px 0 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', padding: '20px 22px', overflow: 'hidden' }}>
        {wo === null && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}
        {wo === false && <div style={{ color: 'var(--ink-soft)' }}>Not found.</div>}
        {wo && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div data-testid="wo-drawer-title" style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', flex: 1 }}>
                {wo.kind === 'punch' ? 'P' : ''}#{wo.number} · {wo.title}
              </div>
              <button style={btnGhost} onClick={onClose} data-testid="wo-drawer-close">Close</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0 12px' }}>
              {wo.jobs?.name} · {nice(wo.discipline) || 'no discipline'} · {nice(wo.status)}
              {wo.amount !== null && <> · {money(wo.amount)}</>}
              {wo.is_variance && <b style={{ color: 'var(--bad)' }}> · VARIANCE</b>}
            </div>
            {wo.scope && <div style={{ fontSize: 13, marginBottom: 10 }}>{wo.scope}</div>}

            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)', margin: '6px 0' }}>Checklist</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input data-testid="woi-label" style={{ ...input, flex: 1 }} placeholder="Add checklist item"
                value={newItem} onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }} />
              <button data-testid="woi-add" style={btn} onClick={addItem}>Add</button>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 12 }}>
              {items.map((it) => (
                <label key={it.id} data-testid="woi-row" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={it.done} onChange={() => toggle(it)} data-testid="woi-check" />
                  <span style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--ink-soft)' : 'var(--ink)' }}>{it.label}</span>
                </label>
              ))}
              {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>No items yet.</div>}
            </div>

            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)', margin: '6px 0' }}>Activity</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input data-testid="woe-body" style={{ ...input, flex: 1 }} placeholder="Comment (internal)"
                value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') say(); }} />
              <button data-testid="woe-add" style={btn} onClick={say}>Post</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
                  <b style={{ color: 'var(--navy)' }}>{ev.kind}</b>
                  {ev.body && <span> — {ev.body}</span>}
                  <span style={{ color: 'var(--ink-soft)' }}> · {new Date(ev.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {err && <div style={{ fontSize: 13, color: 'var(--bad)', marginTop: 8 }}>{err}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Today (crew) ----------
function Today({ orgId, personId, me }) {
  const [wos, setWos] = useState([]);
  const [open, setOpen] = useState(null);

  const load = async () => {
    // My direct assignments + my discipline's pool, active only.
    let q = supabase.from('work_orders')
      .select('*, jobs ( name ), cost_codes ( code )')
      .eq('org_id', orgId)
      .in('status', ['issued','accepted','in_progress'])
      .order('planned_start', { ascending: true, nullsFirst: false });
    const disc = me?.discipline;
    q = disc
      ? q.or(`assigned_person.eq.${personId},and(assignee_kind.eq.discipline,discipline.eq.${disc})`)
      : q.eq('assigned_person', personId);
    const { data } = await q;
    setWos(data ?? []);
  };
  useEffect(() => { load(); }, [orgId, personId, me]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Your active work — direct assignments{me?.discipline ? <> plus the <b>{nice(me.discipline)}</b> pool</> : null}.
      </div>
      <div style={{ ...card, flex: 1, overflowY: 'auto' }}>
        {wos.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }} data-testid="today-empty">Nothing on your plate. Enjoy it while it lasts.</div>}
        {wos.map((w) => (
          <div key={w.id} data-testid="today-row" onClick={() => setOpen(w.id)}
            style={{ display: 'grid', gridTemplateColumns: '52px 2fr 1.4fr 1fr 0.9fr', gap: 8, padding: '10px 6px', borderBottom: '1px solid var(--line)', fontSize: 14, alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ color: 'var(--ink-soft)' }}>{w.kind === 'punch' ? 'P' : ''}{w.number}</span>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{w.title}</span>
            <span>{w.jobs?.name}</span>
            <span>{w.planned_start ?? '—'}</span>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{nice(w.status)}</span>
          </div>
        ))}
      </div>
      {open && <Drawer woId={open} personId={personId} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

// ---------- Daily Log ----------
function Logs({ orgId, personId, jobs }) {
  const [jobId, setJobId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState([]);
  const [notes, setNotes] = useState('');
  const [weather, setWeather] = useState('');
  const [entryKind, setEntryKind] = useState('note');
  const [entryBody, setEntryBody] = useState('');
  const [myLog, setMyLog] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    if (!jobId) { setLogs([]); setMyLog(null); return; }
    const { data } = await supabase.from('daily_logs')
      .select('*, daily_log_entries ( * ), people:created_by ( full_name, email )')
      .eq('job_id', jobId).eq('log_date', date).order('created_at');
    setLogs(data ?? []);
    setMyLog((data ?? []).find((l) => l.created_by === personId) ?? null);
  };
  useEffect(() => { load(); }, [jobId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setErr('');
    if (!jobId) { setErr('Pick a job.'); return; }
    if (myLog) {
      const { error } = await supabase.from('daily_logs').update({
        notes: notes || myLog.notes,
        weather: weather ? { summary: weather } : myLog.weather,
      }).eq('id', myLog.id);
      if (error) { setErr(error.message); return; }
    } else {
      const { error } = await supabase.from('daily_logs').insert({
        id: crypto.randomUUID(), org_id: orgId, job_id: jobId, log_date: date,
        author_kind: 'staff', notes: notes || null,
        weather: weather ? { summary: weather } : null, created_by: personId,
      });
      if (error) { setErr(error.message); return; }
    }
    setNotes(''); setWeather('');
    load();
  };

  const addEntry = async () => {
    setErr('');
    if (!myLog) { setErr('Save today\u2019s log first, then add entries.'); return; }
    if (!entryBody.trim()) return;
    const { error } = await supabase.from('daily_log_entries').insert({
      id: crypto.randomUUID(), daily_log_id: myLog.id, kind: entryKind,
      body: entryBody.trim(),
      qty: entryKind === 'crew_count' && !Number.isNaN(Number(entryBody)) ? Number(entryBody) : null,
    });
    if (error) { setErr(error.message); return; }
    setEntryBody(''); load();
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select data-testid="dl-job" style={input} value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">Job…</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        <input data-testid="dl-date" type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
        <input data-testid="dl-weather" style={{ ...input, width: 170 }} placeholder="Weather (e.g. 94° clear)"
          value={weather} onChange={(e) => setWeather(e.target.value)} />
        <input data-testid="dl-notes" style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Notes for the day"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button data-testid="dl-save" style={btn} onClick={save}>{myLog ? 'Update log' : 'Start log'}</button>
        {err && <span style={{ fontSize: 13, color: 'var(--bad)' }}>{err}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select data-testid="dle-kind" style={input} value={entryKind} onChange={(e) => setEntryKind(e.target.value)}>
          {['note','delay','delivery','crew_count','safety','inspection'].map((k) => <option key={k} value={k}>{nice(k)}</option>)}
        </select>
        <input data-testid="dle-body" style={{ ...input, flex: 1 }} placeholder="Entry — what happened"
          value={entryBody} onChange={(e) => setEntryBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addEntry(); }} />
        <button data-testid="dle-add" style={btnGhost} onClick={addEntry}>Add entry</button>
      </div>
      <div style={{ ...card, flex: 1, overflowY: 'auto' }}>
        {logs.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>No logs for this job/date.</div>}
        {logs.map((l) => (
          <div key={l.id} data-testid="dl-card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)' }}>
              {l.people?.full_name || l.people?.email} <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>· {l.author_kind}{l.weather?.summary ? ` · ${l.weather.summary}` : ''}</span>
            </div>
            {l.notes && <div style={{ fontSize: 13, margin: '3px 0' }}>{l.notes}</div>}
            {(l.daily_log_entries ?? []).map((en) => (
              <div key={en.id} style={{ fontSize: 12, padding: '3px 0 3px 12px', borderLeft: '2px solid var(--line)' }}>
                <b style={{ color: 'var(--navy)' }}>{nice(en.kind)}</b> — {en.body}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Time ----------
function Time({ orgId, personId, jobs, codes, canApprove }) {
  const [mine, setMine] = useState([]);
  const [queue, setQueue] = useState([]);
  const [tJob, setTJob] = useState('');
  const [tCode, setTCode] = useState('');
  const [tHours, setTHours] = useState('');
  const [tDate, setTDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState('');

  const load = async () => {
    const [{ data: m }, { data: q }] = await Promise.all([
      supabase.from('time_entries').select('*, jobs ( name ), cost_codes ( code )')
        .eq('org_id', orgId).eq('person_id', personId)
        .order('worked_on', { ascending: false }).limit(30),
      canApprove
        ? supabase.from('time_entries').select('*, jobs ( name ), cost_codes ( code ), people:person_id ( full_name, email )')
            .eq('org_id', orgId).eq('status', 'pending').order('worked_on')
        : Promise.resolve({ data: [] }),
    ]);
    setMine(m ?? []); setQueue(q ?? []);
  };
  useEffect(() => { load(); }, [orgId, personId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    setErr('');
    const h = Number(tHours);
    if (!tJob || !tHours || Number.isNaN(h) || h <= 0) { setErr('Job and positive hours required.'); return; }
    const { error } = await supabase.from('time_entries').insert({
      id: crypto.randomUUID(), org_id: orgId, person_id: personId, job_id: tJob,
      cost_code_id: tCode || null, worked_on: tDate, hours: h, entry_source: 'manual',
    });
    if (error) { setErr(error.message); return; }
    setTHours('');
    load();
  };

  const decide = async (te, status) => {
    setErr('');
    const { error } = await supabase.from('time_entries').update({
      status, approved_by: personId, approved_at: new Date().toISOString(),
    }).eq('id', te.id);
    if (error) { setErr(error.message); return; }
    load();
  };

  const grid = '110px 1.6fr 0.9fr 70px 1fr 190px';
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input data-testid="te-date" type="date" style={input} value={tDate} onChange={(e) => setTDate(e.target.value)} />
        <select data-testid="te-job" style={input} value={tJob} onChange={(e) => setTJob(e.target.value)}>
          <option value="">Job…</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        <select data-testid="te-code" style={input} value={tCode} onChange={(e) => setTCode(e.target.value)}>
          <option value="">Cost code…</option>
          {codes.map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
        </select>
        <input data-testid="te-hours" style={{ ...input, width: 90 }} placeholder="Hours"
          value={tHours} onChange={(e) => setTHours(e.target.value)} />
        <button data-testid="te-add" style={btn} onClick={add}>Log time</button>
        {err && <span style={{ fontSize: 13, color: 'var(--bad)' }}>{err}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: canApprove ? '1fr 1fr' : '1fr', gap: 12, flex: 1, overflow: 'hidden' }}>
        <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ padding: '10px 16px', fontWeight: 800, fontSize: 13, color: 'var(--navy)', borderBottom: '2px solid var(--navy)' }}>My time</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {mine.length === 0 && <div style={{ padding: 14, color: 'var(--ink-soft)', fontSize: 13 }}>No entries yet.</div>}
            {mine.map((t) => (
              <div key={t.id} data-testid="te-mine-row" style={{ display: 'grid', gridTemplateColumns: '100px 1.6fr 0.9fr 70px 90px', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, alignItems: 'center' }}>
                <span>{t.worked_on}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.jobs?.name}</span>
                <span>{t.cost_codes?.code ?? '—'}</span>
                <span><b>{t.hours}</b>h</span>
                <span style={{ fontWeight: 700, color: t.status === 'approved' ? 'var(--good, #2f7d32)' : t.status === 'rejected' ? 'var(--bad)' : 'var(--ink-soft)' }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
        {canApprove && (
          <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '10px 16px', fontWeight: 800, fontSize: 13, color: 'var(--navy)', borderBottom: '2px solid var(--navy)' }}>
              Approval queue <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>· approved hours × labor rate post to actuals</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase' }}>
              <span>Date</span><span>Person</span><span>Job</span><span>Hrs</span><span>Code</span><span>Decision</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {queue.length === 0 && <div style={{ padding: 14, color: 'var(--ink-soft)', fontSize: 13 }} data-testid="te-queue-empty">Queue clear.</div>}
              {queue.map((t) => (
                <div key={t.id} data-testid="te-queue-row" style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--line)', fontSize: 13, alignItems: 'center' }}>
                  <span>{t.worked_on}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.people?.full_name || t.people?.email}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.jobs?.name}</span>
                  <span><b>{t.hours}</b></span>
                  <span>{t.cost_codes?.code ?? '—'}</span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button data-testid="te-approve" style={{ ...btn, padding: '5px 10px', fontSize: 12 }} onClick={() => decide(t, 'approved')}>Approve</button>
                    <button data-testid="te-reject" style={{ ...btnGhost, padding: '5px 10px', fontSize: 12 }} onClick={() => decide(t, 'rejected')}>Reject</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
