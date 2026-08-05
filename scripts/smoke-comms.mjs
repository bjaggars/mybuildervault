/**
 * Comms rail behavioral smoke (BOARD-007) — mocked-network tests through
 * the REAL handlers (DOCTRINE §3 tier 2). New paths get new scenarios
 * BEFORE the push. Exercises auth rejection, config fallback, the happy
 * send (relay reply-to + comm_event log), party fan-out, the inbound relay
 * and BCC branches, and ticket auto-ack idempotence.
 *
 *   node scripts/smoke-comms.mjs
 */
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://smoke.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'smoke-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'smoke-service';
process.env.RESEND_API_KEY = 'smoke-resend';
process.env.INBOUND_LOG_KEY = 'smokekey123';

const SUPA = process.env.VITE_SUPABASE_URL;

// ---- fetch mock -----------------------------------------------------------
let routes = [];
let calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  calls.push({ url: u, method: opts.method ?? 'GET', body: opts.body ? JSON.parse(opts.body) : null });
  for (const [pattern, responder] of routes) {
    if (u.includes(pattern)) {
      const r = typeof responder === 'function' ? responder(u, opts) : responder;
      return new Response(JSON.stringify(r.body ?? r), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
    }
  }
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};

const req = (path, { method = 'POST', headers = {}, body, query = '' } = {}) =>
  new Request(`https://smoke.test/.netlify/functions/${path}${query}`, {
    method, headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const sent = () => calls.filter((c) => c.url.includes('api.resend.com/emails') && c.method === 'POST');
const logged = () => calls.filter((c) => c.url.includes('/rest/v1/comm_events') && c.method === 'POST');

const CONTACT = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const JOB = '33333333-3333-4333-8333-333333333333';
const TICKET = '44444444-4444-4444-8444-444444444444';
const USER = '55555555-5555-4555-8555-555555555555';

const authRoutes = () => [['auth/v1/user', { body: { id: USER, email: 'staff@brije.com' } }]];

let pass = 0; const fail = [];
const scenario = async (name, fn) => {
  routes = []; calls = [];
  try { await fn(); pass += 1; console.log(`  ✔ ${name}`); }
  catch (e) { fail.push(name); console.error(`  ✘ ${name}: ${e.message}`); }
};

// ---- send-email -----------------------------------------------------------
const { default: sendEmail } = await import('../netlify/functions/send-email.mjs');
console.log('send-email');

await scenario('rejects unauthenticated (401)', async () => {
  routes = [];
  const r = await sendEmail(req('send-email', { body: { contactId: CONTACT, subject: 's', message: 'm' } }));
  assert.equal(r.status, 401);
});

await scenario('503 when env not configured (pre-DNS graceful state)', async () => {
  const k = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const r = await sendEmail(req('send-email', { body: {} }));
  process.env.RESEND_API_KEY = k;
  assert.equal(r.status, 503);
});

await scenario('happy path: party fan-out, relay reply-to, comm_event logged', async () => {
  routes = [
    ...authRoutes(),
    ['rest/v1/contacts?', { body: [{ id: CONTACT, org_id: ORG, kind: 'household', display_name: 'Anderson Family', email: 'a@x.com', builder_orgs: { name: 'Brije LLC' } }] }],
    ['rest/v1/org_members?', { body: [{ role: 'admin' }] }],
    ['rest/v1/contact_members?', { body: [
      { email: 'dan@anderson.com', full_name: 'Dan Anderson', is_primary: true },
      { email: 'meg@anderson.com', full_name: 'Meg Anderson', is_primary: false },
    ] }],
    ['api.resend.com/emails', { body: { id: 'em_1' } }],
    ['rest/v1/comm_events', { status: 201, body: {} }],
  ];
  const r = await sendEmail(req('send-email', {
    headers: { authorization: 'Bearer jwt' },
    body: { contactId: CONTACT, subject: 'Framing update', message: 'Roof dry-in done.' },
  }));
  assert.equal(r.status, 200);
  const s = sent(); assert.equal(s.length, 1);
  assert.deepEqual(s[0].body.to, ['dan@anderson.com', 'meg@anderson.com']);
  assert.match(s[0].body.reply_to[0], new RegExp(`reply\\+${CONTACT}@log\\.mybuildervault\\.com`));
  assert.match(s[0].body.from, /Brije LLC via MyBuilderVault <share@mybuildervault\.com>/);
  assert.match(s[0].body.html, /Hi Dan &amp; Meg/);
  const l = logged(); assert.equal(l.length, 1);
  assert.equal(l[0].body.direction, 'outbound');
  assert.equal(l[0].body.org_id, ORG);
  assert.equal(l[0].body.sent_by, USER);
});

await scenario('409 when the card has no email anywhere', async () => {
  routes = [
    ...authRoutes(),
    ['rest/v1/contacts?', { body: [{ id: CONTACT, org_id: ORG, kind: 'person', display_name: 'No Mail', email: null, builder_orgs: { name: 'Brije LLC' } }] }],
    ['rest/v1/org_members?', { body: [{ role: 'admin' }] }],
    ['rest/v1/contact_members?', { body: [] }],
  ];
  const r = await sendEmail(req('send-email', {
    headers: { authorization: 'Bearer jwt' },
    body: { contactId: CONTACT, subject: 's', message: 'm' },
  }));
  assert.equal(r.status, 409);
  assert.equal(sent().length, 0);
});

await scenario('400 when jobId given but contact is not a participant', async () => {
  routes = [
    ...authRoutes(),
    ['rest/v1/contacts?', { body: [{ id: CONTACT, org_id: ORG, kind: 'person', display_name: 'X', email: 'x@x.com', builder_orgs: { name: 'Brije LLC' } }] }],
    ['rest/v1/org_members?', { body: [{ role: 'admin' }] }],
    ['rest/v1/job_participants?', { body: [] }],
  ];
  const r = await sendEmail(req('send-email', {
    headers: { authorization: 'Bearer jwt' },
    body: { contactId: CONTACT, jobId: JOB, subject: 's', message: 'm' },
  }));
  assert.equal(r.status, 400);
});

await scenario('forbidden when caller holds no seat in the org (403)', async () => {
  routes = [
    ...authRoutes(),
    ['rest/v1/contacts?', { body: [{ id: CONTACT, org_id: ORG, kind: 'person', display_name: 'X', email: 'x@x.com' }] }],
    ['rest/v1/org_members?', { body: [] }],
  ];
  const r = await sendEmail(req('send-email', {
    headers: { authorization: 'Bearer jwt' },
    body: { contactId: CONTACT, subject: 's', message: 'm' },
  }));
  assert.equal(r.status, 403);
});

// ---- inbound-log ----------------------------------------------------------
const { default: inboundLog } = await import('../netlify/functions/inbound-log.mjs');
console.log('inbound-log');

await scenario('rejects a bad shared key (403)', async () => {
  const r = await inboundLog(req('inbound-log', { query: '?k=wrong', body: {} }));
  assert.equal(r.status, 403);
});

await scenario('relay branch: logs INBOUND and forwards to owner/admin seats', async () => {
  routes = [
    ['rest/v1/contacts?', { body: [{ id: CONTACT, org_id: ORG, display_name: 'Anderson Family', email: 'dan@anderson.com' }] }],
    ['rest/v1/comm_events', { status: 201, body: {} }],
    ['rest/v1/org_members?', { body: [{ people: { email: 'brice@brije.com' } }, { people: { email: 'eric@brije.com' } }] }],
    ['api.resend.com/emails', { body: { id: 'em_2' } }],
  ];
  const r = await inboundLog(req('inbound-log', {
    query: '?k=smokekey123',
    body: { from: 'Meg <meg@anderson.com>', to: [`reply+${CONTACT}@log.mybuildervault.com`], subject: 'Re: Framing update', text: 'Looks great, thank you!' },
  }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).relay, 1);
  const l = logged(); assert.equal(l.length, 1);
  assert.equal(l[0].body.direction, 'inbound');
  assert.match(l[0].body.body, /From: meg@anderson\.com/);
  const s = sent(); assert.equal(s.length, 1);
  assert.deepEqual(s[0].body.to, ['brice@brije.com', 'eric@brije.com']);
  assert.deepEqual(s[0].body.reply_to, ['meg@anderson.com']);
});

await scenario('BCC branch: attributes org by seat, files on the matched card', async () => {
  routes = [
    ['rest/v1/people?', { body: [{ id: USER, org_members: [{ org_id: ORG }] }] }],
    ['rest/v1/contact_members?', { body: [{ contact_id: CONTACT, contacts: { id: CONTACT, org_id: ORG } }] }],
    ['rest/v1/comm_events', { status: 201, body: {} }],
  ];
  const r = await inboundLog(req('inbound-log', {
    query: '?k=smokekey123',
    body: { from: 'brice@brije.com', to: ['dan@anderson.com'], bcc: ['bcc@log.mybuildervault.com'], subject: 'Quick note', text: 'See you Tuesday.' },
  }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).logged, 1);
  const l = logged(); assert.equal(l.length, 1);
  assert.equal(l[0].body.direction, 'outbound');
  assert.equal(l[0].body.sent_by, USER);
});

await scenario('unmatched sender is ignored silently (200, retry-storm proof)', async () => {
  routes = [['rest/v1/people?', { body: [] }]];
  const r = await inboundLog(req('inbound-log', {
    query: '?k=smokekey123',
    body: { from: 'stranger@nowhere.com', to: ['dan@anderson.com'], subject: 'spam', text: 'hi' },
  }));
  assert.equal(r.status, 200);
  assert.equal(logged().length, 0);
});

// ---- ticket-notify --------------------------------------------------------
const { default: ticketNotify } = await import('../netlify/functions/ticket-notify.mjs');
console.log('ticket-notify');

const ticketRoutes = () => [
  ...authRoutes(),
  ['rest/v1/tickets?', { body: [{ id: TICKET, org_id: ORG, opened_by: USER, subject: 'Gantt is blank', status: 'open', people: { email: 'staff@brije.com', full_name: 'Staff' } }] }],
];

await scenario('creation ack: actor-less auto_response event + rail email + comm_event', async () => {
  routes = [
    ...ticketRoutes(),
    ['rest/v1/ticket_events?', { body: [] }],           // no prior ack (GET)
    ['rest/v1/ticket_events', { status: 201, body: {} }], // insert (POST)
    ['api.resend.com/emails', { body: { id: 'em_3' } }],
    ['rest/v1/comm_events', { status: 201, body: {} }],
  ];
  const r = await ticketNotify(req('ticket-notify', {
    headers: { authorization: 'Bearer jwt' },
    body: { ticketId: TICKET, event: 'created' },
  }));
  assert.equal(r.status, 200);
  const out = await r.json();
  assert.equal(out.emailed, true);
  const ev = calls.find((c) => c.url.endsWith('/rest/v1/ticket_events') && c.method === 'POST');
  assert.ok(ev, 'auto_response event inserted');
  assert.equal(ev.body.kind, 'auto_response');
  assert.equal(ev.body.actor, undefined); // actor-less by construction
  assert.match(ev.body.body, /\[auto:created\]/);
  const l = logged(); assert.equal(l.length, 1);
  assert.equal(l[0].body.ticket_id, TICKET);
});

await scenario('idempotent: a second creation ack is a no-op', async () => {
  routes = [
    ...ticketRoutes(),
    ['rest/v1/ticket_events?', { body: [{ id: 'prior' }] }],
  ];
  const r = await ticketNotify(req('ticket-notify', {
    headers: { authorization: 'Bearer jwt' },
    body: { ticketId: TICKET, event: 'created' },
  }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).duplicate, true);
  assert.equal(sent().length, 0);
});

await scenario('no Resend key: ack event still lands, emailed=false (fallback path)', async () => {
  const k = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  routes = [
    ...ticketRoutes(),
    ['rest/v1/ticket_events?', { body: [] }],
    ['rest/v1/ticket_events', { status: 201, body: {} }],
  ];
  const r = await ticketNotify(req('ticket-notify', {
    headers: { authorization: 'Bearer jwt' },
    body: { ticketId: TICKET, event: 'resolved' },
  }));
  process.env.RESEND_API_KEY = k;
  assert.equal(r.status, 200);
  const out = await r.json();
  assert.equal(out.emailed, false);
  assert.equal(sent().length, 0);
});

await scenario('rejects a stranger to the ticket (403)', async () => {
  routes = [
    ...authRoutes(),
    ['rest/v1/tickets?', { body: [{ id: TICKET, org_id: ORG, opened_by: '99999999-9999-4999-8999-999999999999', subject: 'x', people: {} }] }],
    ['rest/v1/org_members?', { body: [] }],
  ];
  const r = await ticketNotify(req('ticket-notify', {
    headers: { authorization: 'Bearer jwt' },
    body: { ticketId: TICKET, event: 'created' },
  }));
  assert.equal(r.status, 403);
});

globalThis.fetch = realFetch;
console.log(`\ncomms smoke: ${pass} passed, ${fail.length} failed`);
if (fail.length) { console.error('FAILED:', fail.join(' · ')); process.exit(1); }
