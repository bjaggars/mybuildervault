#!/usr/bin/env node
/**
 * MyBuilderVault Tier-2 behavioral smoke — THE RECALC ENGINE (script 014).
 *
 * Topological cascade + workday math fail quietly; this smoke exercises the
 * COMMITTED SQL, not a re-implementation: it applies scripts/pg-shim.sql
 * (Supabase-environment shim) + the real migration chain 001..NNN to a
 * scratch PostgreSQL database, seeds a fixture org/job, and asserts the
 * engine's behavior scenario by scenario:
 *
 *   1. workday end-date math (weekend skip)
 *   2. excluded dates (holidays) push work
 *   3. FS dependency chain with lag cascades on shift (via shift_schedule_item)
 *   4. diamond dependencies resolve topologically (successor waits for MAX)
 *   5. dependent-item drag = start-no-earlier-than (deps still win)
 *   6. publish stamps baselines; later shifts move current, never baseline
 *   7. WO completion advances the item and successors follow actual_end
 *   8. selection decision deadline moves with the schedule
 *   9. dependency cycles RAISE (never silently dropped)
 *  10. per-item ignore_workdays override (weekend pour)
 *
 * Usage:  DATABASE_URL=postgres://user@host:port/postgres node scripts/smoke-recalc.mjs
 * The harness creates/drops its own scratch database (mbv_recalc_smoke).
 * A side benefit proven on first run: the chain itself must apply cleanly
 * to an empty database — exactly what the first prod release does.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const ADMIN_URL = process.env.DATABASE_URL;
if (!ADMIN_URL) { console.error('DATABASE_URL required'); process.exit(2); }
const SCRATCH = 'mbv_recalc_smoke';

const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
// Next date from `from` (exclusive) whose ISO weekday is `dow` (1=Mon..7=Sun).
function nextDow(from, dow) {
  const d = new Date(from + 'T00:00:00Z');
  do { d.setUTCDate(d.getUTCDate() + 1); } while (((d.getUTCDay() + 6) % 7) + 1 !== dow);
  return iso(d);
}
function addDays(from, n) {
  const d = new Date(from + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

let passed = 0, failed = 0;
function ok(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function main() {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${SCRATCH}`);
  await admin.query(`create database ${SCRATCH}`);
  await admin.end();

  const url = new URL(ADMIN_URL);
  url.pathname = `/${SCRATCH}`;
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();

  // ---- apply shim + the real chain, in order ----
  const files = ['scripts/pg-shim.sql',
    ...readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort()
      .map((f) => join('supabase/migrations', f))];
  for (const f of files) {
    try { await db.query(readFileSync(f, 'utf8')); }
    catch (e) { console.error(`chain apply FAILED at ${f}: ${e.message}`); process.exit(1); }
  }
  console.log(`chain applied clean: ${files.length - 1} migrations on a fresh database`);

  // ---- fixture: person, org (Mon-Fri), job ----
  const PERSON = '00000000-0000-4000-8000-000000000001';
  await db.query(`insert into auth.users (id, email, raw_user_meta_data)
                  values ($1, 'smoke@mybuildervault.dev', '{"full_name":"Recalc Smoke"}')`, [PERSON]);
  const { rows: [org] } = await db.query(
    `insert into builder_orgs (name, slug) values ('Recalc Smoke Builder','recalc-smoke') returning id`);
  const ORG = org.id;
  await db.query(`insert into org_members (org_id, person_id, role) values ($1,$2,'owner')`, [ORG, PERSON]);
  const { rows: [job] } = await db.query(
    `insert into jobs (org_id, lifecycle, name, status) values ($1,'spec','Smoke Spec','construction') returning id`, [ORG]);
  const JOB = job.id;
  // Run as the owner so auth.uid()-dependent paths (events, role checks) behave.
  await db.query(`set request.jwt.claim.sub = '${PERSON}'`);

  const item = async (title, opts = {}) => {
    const { rows: [r] } = await db.query(
      `insert into schedule_items (org_id, job_id, title, duration_days, start_date, milestone, ignore_workdays, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [ORG, JOB, title, opts.duration ?? 1, opts.start ?? null,
       opts.milestone ?? false, opts.ignore ?? false, opts.sort ?? 0]);
    return r.id;
  };
  const dep = (succ, pred, lag = 0) =>
    db.query(`insert into schedule_deps (successor_id, predecessor_id, lag_days) values ($1,$2,$3)`, [succ, pred, lag]);
  const get = async (id) =>
    (await db.query(`select * from schedule_items where id = $1`, [id])).rows[0];

  // ---------------------------------------------------------------
  // 1. Workday math: 3 workdays starting Friday → Fri, Mon, Tue.
  // ---------------------------------------------------------------
  const friday = nextDow(iso(new Date()), 5);
  const A = await item('A sitework', { duration: 3, start: friday, sort: 1 });
  let a = await get(A);
  ok('workday math: Fri + 3 workdays ends Tue',
     iso(a.start_date) === friday && iso(a.end_date) === addDays(friday, 4),
     `start ${iso(a.start_date)} end ${iso(a.end_date)}, expected ${friday}..${addDays(friday, 4)}`);

  // ---------------------------------------------------------------
  // 2. Excluded date: the Monday inside A becomes a holiday → ends Wed.
  // ---------------------------------------------------------------
  const holidayMon = addDays(friday, 3);
  await db.query(`insert into org_excluded_dates (org_id, day, label) values ($1,$2,'Smoke holiday')`, [ORG, holidayMon]);
  await db.query(`select recalc_schedule($1)`, [JOB]);
  a = await get(A);
  ok('excluded date pushes the end (Mon holiday → ends Wed)',
     iso(a.end_date) === addDays(friday, 5),
     `end ${iso(a.end_date)}, expected ${addDays(friday, 5)}`);
  await db.query(`delete from org_excluded_dates where org_id = $1`, [ORG]);
  await db.query(`select recalc_schedule($1)`, [JOB]);

  // ---------------------------------------------------------------
  // 3. FS chain + lag: A → B (lag 0) → C (lag 2). Shift A, all cascade.
  // ---------------------------------------------------------------
  const B = await item('B foundation', { duration: 2, sort: 2 });
  const C = await item('C framing', { duration: 4, sort: 3 });
  await dep(B, A, 0);
  await dep(C, B, 2);
  a = await get(A);
  let b = await get(B), c = await get(C);
  const wd = async (from, n) =>
    iso((await db.query(`select add_workdays($1,$2::date,$3) d`, [ORG, from, n])).rows[0].d);
  ok('FS chain: B starts next workday after A ends',
     iso(b.start_date) === await wd(iso(a.end_date), 1),
     `B start ${iso(b.start_date)}`);
  ok('FS lag: C starts 3 workdays after B ends (lag 2)',
     iso(c.start_date) === await wd(iso(b.end_date), 3),
     `C start ${iso(c.start_date)}`);

  const newStart = await wd(friday, 5);
  await db.query(`select shift_schedule_item($1, $2::date, 'Smoke: shifted A')`, [A, newStart]);
  a = await get(A); b = await get(B); c = await get(C);
  ok('cascade on shift: A moved and B/C followed',
     iso(a.start_date) === newStart
       && iso(b.start_date) === await wd(iso(a.end_date), 1)
       && iso(c.start_date) === await wd(iso(b.end_date), 3),
     `A ${iso(a.start_date)} B ${iso(b.start_date)} C ${iso(c.start_date)}`);
  const { rows: shiftEv } = await db.query(
    `select * from schedule_events where job_id = $1 and kind = 'shift' and reason = 'Smoke: shifted A'`, [JOB]);
  ok('one change, one reason: shift event recorded', shiftEv.length === 1);

  // ---------------------------------------------------------------
  // 4. Diamond: A→B2, A→C2, B2→D, C2→D — D waits for the LATER of B2/C2.
  // ---------------------------------------------------------------
  const B2 = await item('B2 electrical rough', { duration: 2, sort: 4 });
  const C2 = await item('C2 plumbing rough', { duration: 5, sort: 5 });
  const D = await item('D insulation', { duration: 1, sort: 6 });
  await dep(B2, A, 0); await dep(C2, A, 0);
  await dep(D, B2, 0); await dep(D, C2, 0);
  const b2 = await get(B2), c2 = await get(C2);
  let d = await get(D);
  const laterEnd = iso(c2.end_date) > iso(b2.end_date) ? iso(c2.end_date) : iso(b2.end_date);
  ok('diamond resolves topologically: D starts after max(B2, C2)',
     iso(d.start_date) === await wd(laterEnd, 1),
     `D ${iso(d.start_date)}, expected after ${laterEnd}`);

  // ---------------------------------------------------------------
  // 5. Dependent drag = start-no-earlier-than; deps still win leftward.
  // ---------------------------------------------------------------
  const pushed = await wd(iso(d.start_date), 4);
  await db.query(`select shift_schedule_item($1, $2::date, 'Smoke: push D right')`, [D, pushed]);
  d = await get(D);
  ok('dependent drag right: manual_start honored', iso(d.start_date) === pushed,
     `D ${iso(d.start_date)}, expected ${pushed}`);
  await db.query(`select shift_schedule_item($1, $2::date, 'Smoke: try D left past deps')`, [D, friday]);
  d = await get(D);
  ok('dependent drag left past deps: deps win (no earlier than computed floor)',
     iso(d.start_date) === await wd(laterEnd, 1),
     `D ${iso(d.start_date)}`);

  // ---------------------------------------------------------------
  // 6. Publish stamps baselines; a later shift moves current only.
  // ---------------------------------------------------------------
  const { rows: [{ publish_schedule: pubN }] } =
    await db.query(`select publish_schedule($1)`, [JOB]);
  const { rows: [{ schedule_status: jstat }] } =
    await db.query(`select schedule_status from jobs where id = $1`, [JOB]);
  a = await get(A);
  ok('publish: all items stamped + job gate flips',
     Number(pubN) === 6 && jstat === 'published'
       && iso(a.baseline_start) === iso(a.start_date) && iso(a.baseline_end) === iso(a.end_date));
  const preBaseline = iso(a.baseline_start);
  const bump = await wd(iso(a.start_date), 2);
  await db.query(`select shift_schedule_item($1, $2::date, 'Smoke: post-publish slip')`, [A, bump]);
  a = await get(A);
  ok('baseline survives the slip: current moved, baseline did not',
     iso(a.start_date) === bump && iso(a.baseline_start) === preBaseline,
     `start ${iso(a.start_date)} baseline ${iso(a.baseline_start)}`);

  // ---------------------------------------------------------------
  // 7. The field advances the schedule: WO completion → actual_end →
  //    successors follow the actual finish.
  // ---------------------------------------------------------------
  const { rows: [wo] } = await db.query(
    `insert into work_orders (org_id, job_id, title, assignee_kind, discipline, schedule_item_id, created_by, status)
     values ($1,$2,'Smoke framing WO','discipline','framing',$3,$4,'in_progress') returning id, planned_start, planned_end`,
    [ORG, JOB, B, PERSON]);
  b = await get(B);
  ok('WO inherits item dates on insert',
     iso(wo.planned_start) === iso(b.start_date) && iso(wo.planned_end) === iso(b.end_date));
  await db.query(`update work_orders set status = 'complete' where id = $1`, [wo.id]);
  b = await get(B); c = await get(C);
  const today = iso(new Date());
  ok('WO completion completes the item with actual_end = today',
     b.status === 'complete' && iso(b.actual_end) === today);
  ok('successors follow actual_end (field-driven cascade)',
     iso(c.start_date) === await wd(today, 3),   // lag 2 → 3 workdays after actual end
     `C ${iso(c.start_date)}, expected ${await wd(today, 3)}`);
  const { rows: fieldEv } = await db.query(
    `select * from schedule_events where job_id = $1 and kind = 'status' and item_id = $2`, [JOB, B]);
  ok('field advancement logged as a schedule event', fieldEv.length === 1);

  // ---------------------------------------------------------------
  // 8. Selection decision deadline moves with the schedule.
  // ---------------------------------------------------------------
  const { rows: [sel] } = await db.query(
    `insert into selections (org_id, job_id, title, schedule_item_id, deadline_lag_days, created_by)
     values ($1,$2,'Smoke paint colors',$3,5,$4) returning id`, [ORG, JOB, C, PERSON]);
  await db.query(`select recalc_schedule($1)`, [JOB]);
  c = await get(C);
  const sub = async (from, n) =>
    iso((await db.query(`select sub_workdays($1,$2::date,$3) d`, [ORG, from, n])).rows[0].d);
  let { rows: [s] } = await db.query(`select decision_deadline from selections where id = $1`, [sel.id]);
  ok('selection deadline = item start − 5 workdays',
     iso(s.decision_deadline) === await sub(iso(c.start_date), 5),
     `deadline ${iso(s.decision_deadline)}`);
  // shift C's remaining predecessor chain: push C directly
  const cPush = await wd(iso(c.start_date), 3);
  await db.query(`select shift_schedule_item($1, $2::date, 'Smoke: push C for deadline test')`, [C, cPush]);
  c = await get(C);
  ({ rows: [s] } = await db.query(`select decision_deadline from selections where id = $1`, [sel.id]));
  ok('deadline MOVES when the schedule moves',
     iso(s.decision_deadline) === await sub(iso(c.start_date), 5),
     `deadline ${iso(s.decision_deadline)} vs start ${iso(c.start_date)}`);

  // ---------------------------------------------------------------
  // 9. Cycles raise — never silently dropped.
  // ---------------------------------------------------------------
  let cycleRaised = false;
  try {
    await db.query('begin');
    await db.query(`insert into schedule_deps (successor_id, predecessor_id) values ($1,$2)`, [A, C]); // C→A closes A→B→C
    await db.query('commit');
  } catch (e) {
    cycleRaised = /cycle/i.test(e.message);
    await db.query('rollback');
  }
  ok('dependency cycle raises an exception', cycleRaised);

  // ---------------------------------------------------------------
  // 10. ignore_workdays: a weekend pour runs straight through.
  // ---------------------------------------------------------------
  const P = await item('P weekend pour', { duration: 3, start: friday, ignore: true, sort: 9 });
  const p = await get(P);
  ok('ignore_workdays: Fri + 3 calendar days ends Sun',
     iso(p.start_date) === friday && iso(p.end_date) === addDays(friday, 2),
     `end ${iso(p.end_date)}, expected ${addDays(friday, 2)}`);

  await db.end();
  console.log(`\nrecalc smoke: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('recalc smoke crashed:', e); process.exit(1); });
