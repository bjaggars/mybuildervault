// Mission Control reporter — the E2E robot posts its run summary here.
// Guarded by the E2E_REPORT_SECRET shared key; writes e2e_runs via the
// service role (Mission Control tables have no client INSERT policies).
import { createClient } from '@supabase/supabase-js';

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return ok({ error: 'POST only' }, 405);
  const secret = process.env.E2E_REPORT_SECRET;
  if (!secret || event.headers['x-e2e-secret'] !== secret) return ok({ error: 'Unauthorized' }, 401);

  let p;
  try { p = JSON.parse(event.body ?? '{}'); } catch { return ok({ error: 'Bad JSON' }, 400); }

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const status = (p.failed ?? 0) > 0 ? 'fail' : 'pass';
  const summary = JSON.stringify({
    passed: p.passed ?? 0, failed: p.failed ?? 0, flaky: p.flaky ?? 0,
    skipped: p.skipped ?? 0, duration_ms: p.duration_ms ?? 0,
    cases: (p.cases ?? []).slice(0, 50),
  });

  const { error } = await admin.from('e2e_runs').insert({
    branch: p.branch ?? 'unknown',
    sha: p.sha ?? 'unknown',
    status,
    summary,
    run_url: p.run_url ?? null,
  });
  if (error) return ok({ error: error.message }, 500);
  return ok({ ok: true, status });
};
