/**
 * send-email — the recorded lane for email (BOARD-007 comms rail).
 * Copy-adapt from MyRealtyVault send-email.mjs (JSH PATTERNS §1).
 *
 * An org staff member sends a note to a CONTACT (party card) through the
 * platform: white-card styling (reads as a note from a human, not a system
 * broadcast), From "<Org> via MyBuilderVault <share@mybuildervault.com>",
 * Reply-To the contact's relay address so the reply auto-files, and the
 * send is LOGGED as an outbound comm_event in the same breath — recording
 * is structural, not a checkbox. Optional jobId links the record to a job
 * (validated: the contact must be a participant on that job).
 */
import { relayReplyTo, partyEmails, partySalutation, logCommEvent, emailShell, escHtml, paragraphs } from './_relay.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SUPA = process.env.VITE_SUPABASE_URL;
  const ANON = process.env.VITE_SUPABASE_ANON_KEY;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  if (!SUPA || !ANON || !SERVICE || !RESEND) return Response.json({ error: 'not_configured' }, { status: 503 });
  const svc = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' };

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const userRes = await fetch(`${SUPA}/auth/v1/user`, { headers: { apikey: ANON, authorization: `Bearer ${jwt}` } });
  if (!userRes.ok) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const user = await userRes.json();

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'bad_request' }, { status: 400 }); }
  const contactId = String(body.contactId ?? '');
  const jobId = String(body.jobId ?? '');
  const subject = String(body.subject ?? '').trim().slice(0, 160);
  const message = String(body.message ?? '').trim().slice(0, 6000);
  if (!contactId || !subject || !message) {
    return Response.json({ error: 'bad_request', message: 'contactId, subject and message are required.' }, { status: 400 });
  }

  const [contact] = await (await fetch(
    `${SUPA}/rest/v1/contacts?id=eq.${contactId}&select=id,org_id,kind,display_name,email,builder_orgs:org_id(name)`,
    { headers: svc },
  )).json().catch(() => []);
  if (!contact) return Response.json({ error: 'not_found' }, { status: 404 });

  // Authorize: caller holds a seat in the contact's org.
  const seats = await (await fetch(
    `${SUPA}/rest/v1/org_members?org_id=eq.${contact.org_id}&person_id=eq.${user.id}&select=role`,
    { headers: svc },
  )).json().catch(() => []);
  if (!Array.isArray(seats) || !seats.length) return Response.json({ error: 'forbidden' }, { status: 403 });

  // Optional job link: validated — the contact must sit on that job.
  let linkedJobId = null;
  if (jobId) {
    const parts = await (await fetch(
      `${SUPA}/rest/v1/job_participants?job_id=eq.${jobId}&contact_id=eq.${contact.id}&select=id&limit=1`,
      { headers: svc },
    )).json().catch(() => []);
    if (!parts?.length) return Response.json({ error: 'bad_job', message: 'That contact is not a participant on this job.' }, { status: 400 });
    linkedJobId = jobId;
  }

  const to = await partyEmails(SUPA, svc, contact);
  if (!to.length) return Response.json({ error: 'no_email', message: 'No email address on file for this contact.' }, { status: 409 });

  const orgName = contact.builder_orgs?.name ?? 'Your builder';
  const salutation = await partySalutation(SUPA, svc, contact);
  const html = emailShell(
    `${salutation ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${escHtml(salutation)},</p>` : ''}
     ${paragraphs(message)}
     <p style="margin:18px 0 0;font-size:12px;color:#8a8f9c;border-top:1px solid #E3DCCE;padding-top:12px;">Sent by ${escHtml(orgName)} via MyBuilderVault — just hit reply to reach us.</p>`,
  );

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${orgName.replace(/["<>]/g, '')} via MyBuilderVault <share@mybuildervault.com>`,
      to,
      reply_to: relayReplyTo(contact.id, orgName) ?? (user.email ? [user.email] : undefined),
      subject, html, text: message,
    }),
  });
  if (!sendRes.ok) {
    const detail = await sendRes.text().catch(() => '');
    return Response.json({ error: 'email_failed', message: `Send failed (${sendRes.status}). ${detail.slice(0, 160)}` }, { status: 502 });
  }

  await logCommEvent(SUPA, svc, {
    org_id: contact.org_id, job_id: linkedJobId, contact_id: contact.id,
    direction: 'outbound', kind: 'email', subject, body: message,
    to_emails: to, from_email: 'share@mybuildervault.com', sent_by: user.id,
  });

  return Response.json({ ok: true, to });
};
