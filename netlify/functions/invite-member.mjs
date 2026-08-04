// Staff magic-link invite. Caller must be owner/admin of the org (verified
// server-side via service role — never trust the client's claimed role).
// Path: auth.admin.inviteUserByEmail -> 001 trigger creates the people row
// -> org_members upsert. Existing users skip the invite email and get a
// membership + magic link note. Client (homeowner) invites are NOT this
// rail — they attach via job_participants in Phase B.
import { createClient } from '@supabase/supabase-js';

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const ROLES = new Set(['admin', 'pm', 'sales', 'super']); // 'owner' is never granted via invite

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return ok({ error: 'POST only' }, 405);

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Authenticate the caller -------------------------------------------
  const token = (event.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return ok({ error: 'Unauthorized' }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return ok({ error: 'Unauthorized' }, 401);
  const callerId = userData.user.id;

  // --- Validate input -----------------------------------------------------
  let body;
  try { body = JSON.parse(event.body ?? '{}'); } catch { return ok({ error: 'Bad JSON' }, 400); }
  const { orgId, email, fullName, role } = body;
  if (!orgId || !email || !ROLES.has(role)) return ok({ error: 'orgId, email, and a valid role are required' }, 400);

  // --- Authorize: caller must be owner/admin of THIS org ------------------
  const { data: callerSeat } = await admin.from('org_members')
    .select('role').eq('org_id', orgId).eq('person_id', callerId).maybeSingle();
  if (!callerSeat || !['owner', 'admin'].includes(callerSeat.role)) {
    return ok({ error: 'Only org owners and admins can invite members' }, 403);
  }

  const redirectTo = `${process.env.URL ?? 'https://mybuildervault.dev'}/accept-invite`;

  // --- Invite (new user) or attach (existing user) ------------------------
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: fullName ? { full_name: fullName } : undefined,
  });

  let personId = invited?.user?.id ?? null;
  let message = 'Invitation email sent.';

  if (invErr) {
    // Most common: user already registered. Attach membership instead.
    const { data: person } = await admin.from('people').select('id').eq('email', email).maybeSingle();
    if (!person) return ok({ error: `Invite failed: ${invErr.message}` }, 500);
    personId = person.id;
    message = 'Existing account added to the team — they can sign in as usual.';
  }

  const { error: memErr } = await admin.from('org_members')
    .upsert({ org_id: orgId, person_id: personId, role }, { onConflict: 'org_id,person_id' });
  if (memErr) return ok({ error: `Membership failed: ${memErr.message}` }, 500);

  return ok({ ok: true, message });
};
