/**
 * MyBuilderVault Tier-1 API smoke — runs against a DEPLOYED site (test or prod).
 *   BASE_URL=https://... node scripts/smoke-api.mjs
 * Adapted from MyRealtyVault per the Rule of Three.
 *
 * Contract checks only, ZERO side effects:
 *  - pages serve (app shell, /privacy, /terms, /about — static, full text)
 *  - invite-member rejects the unauthenticated (401)
 *  - e2e-report and e2e-purge reject a bad shared key (401)
 *
 * Retries each check for up to RETRY_MINUTES (default 4) so a fresh deploy
 * has time to finish before we judge it.
 */

const BASE = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const RETRY_MS = (Number(process.env.RETRY_MINUTES ?? 4)) * 60000;
if (!BASE) { console.error('BASE_URL required'); process.exit(2); }

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

check('app shell serves', async () => {
  const r = await fetch(`${BASE}/`);
  if (!r.ok) throw new Error(`status ${r.status}`);
  const t = await r.text();
  if (!/<div id="root">/.test(t)) throw new Error('root div missing');
});

for (const page of ['privacy', 'terms', 'about']) {
  check(`${page} page serves static full text`, async () => {
    const r = await fetch(`${BASE}/${page}`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const t = await r.text();
    if (!/Jaggars Software Holdings/i.test(t)) throw new Error('expected business identity text missing');
  });
}

check('invite-member rejects unauthenticated', async () => {
  const r = await fetch(`${BASE}/.netlify/functions/invite-member`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orgId: 'x', email: 'smoke@example.com', role: 'pm' }),
  });
  if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
});

check('e2e-report rejects a bad shared key', async () => {
  const r = await fetch(`${BASE}/.netlify/functions/e2e-report`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-e2e-secret': 'smoke-wrong-key' },
    body: JSON.stringify({}),
  });
  if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
});

check('e2e-purge rejects a bad shared key', async () => {
  const r = await fetch(`${BASE}/.netlify/functions/e2e-purge`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-e2e-secret': 'smoke-wrong-key' },
    body: JSON.stringify({}),
  });
  if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
});

// Comms rail (BOARD-007): 503 is the legitimate pre-config state (env vars
// not yet installed on the site) — the contract is "never a 200 for an
// unauthorized/unkeyed caller."
check('send-email rejects unauthenticated (401 or 503 pre-config)', async () => {
  const r = await fetch(`${BASE}/.netlify/functions/send-email`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contactId: 'x', subject: 's', message: 'm' }),
  });
  if (![401, 503].includes(r.status)) throw new Error(`expected 401/503, got ${r.status}`);
});

check('inbound-log rejects a bad shared key (403 or 503 pre-config)', async () => {
  const r = await fetch(`${BASE}/.netlify/functions/inbound-log?k=smoke-wrong-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (![403, 503].includes(r.status)) throw new Error(`expected 403/503, got ${r.status}`);
});

check('ticket-notify rejects unauthenticated (401 or 503 pre-config)', async () => {
  const r = await fetch(`${BASE}/.netlify/functions/ticket-notify`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticketId: 'x', event: 'created' }),
  });
  if (![401, 503].includes(r.status)) throw new Error(`expected 401/503, got ${r.status}`);
});

const deadline = Date.now() + RETRY_MS;
const run = async () => {
  let failures = [];
  for (const c of checks) {
    let lastErr = null;
    while (true) {
      try { await c.fn(); console.log(`  \u2713 ${c.name}`); lastErr = null; break; }
      catch (e) {
        lastErr = e;
        if (Date.now() > deadline) break;
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
    if (lastErr) { console.error(`  \u2717 ${c.name}: ${lastErr.message}`); failures.push(c.name); }
  }
  if (failures.length) { console.error(`\nSMOKE FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
  console.log(`\nSMOKE PASSED \u2014 ${checks.length} checks green against ${BASE}`);
};
run();
