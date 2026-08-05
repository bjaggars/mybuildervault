// Clean-floor purge — deletes E2E-prefixed data inside the e2e-robot org
// ONLY, before each robot run. Guarded by the E2E_REPORT_SECRET shared key.
// Scoped twice (org slug AND E2E- prefix) so a misfire can never touch
// tenant data. ticket_events cascade with their tickets.
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

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org } = await admin.from('builder_orgs').select('id').eq('slug', 'e2e-robot').maybeSingle();
  if (!org) return ok({ ok: true, purged: 0, note: 'no e2e-robot org on this database' });

  const { data: gone, error: tErr } = await admin.from('tickets')
    .delete().eq('org_id', org.id).like('subject', 'E2E-%').select('id');
  if (tErr) return ok({ error: tErr.message }, 500);

  const { data: frGone, error: fErr } = await admin.from('feature_requests')
    .delete().eq('org_id', org.id).like('title', 'E2E-%').select('id');
  if (fErr) return ok({ error: fErr.message }, 500);

  // Jobs cascade their structures, events, estimates, COs, allowances,
  // selections, actuals, participants — one delete sweeps the spine.
  const { data: jGone, error: jErr } = await admin.from('jobs')
    .delete().eq('org_id', org.id).like('name', 'E2E-%').select('id');
  if (jErr) return ok({ error: jErr.message }, 500);

  const { data: cGone, error: cErr } = await admin.from('contacts')
    .delete().eq('org_id', org.id).like('display_name', 'E2E-%').select('id');
  if (cErr) return ok({ error: cErr.message }, 500);

  return ok({ ok: true, purged: (gone?.length ?? 0) + (frGone?.length ?? 0)
                              + (jGone?.length ?? 0) + (cGone?.length ?? 0) });
};
