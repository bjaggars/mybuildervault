/**
 * ticket-notify — system auto-acks on the comms rail (BOARD-007; closes the
 * STATE open item from scripts 003/004). Called by the app, best-effort,
 * after ticket creation and on resolution.
 *
 * Doctrine (jsh-brain, JSH Support Ticketing): acknowledgment on creation
 * and on resolution are ticket_events with kind='auto_response' and NULL
 * actor — the only actor-less kind. RLS requires human inserts to carry
 * actor=auth.uid(), so system messages can ONLY arrive via the service
 * role (this function) — humans cannot forge them. Templates live here in
 * function code, never the DB. Outbound email rides the rail and is logged
 * as a comm_event.
 *
 * Auth: caller's JWT must belong to the ticket's opener or a seat in the
 * ticket's org (a client filing via concierge is the opener). Idempotent
 * per (ticket, event): a second call for the same ack is a no-op.
 */
import { logCommEvent, emailShell, escHtml } from './_relay.mjs';

const COPY = {
  created: {
    subject: (t) => `We've got it — "${t.subject}" [#${t.id.slice(0, 8)}]`,
    note: 'Thanks — your request is logged and on the board. We\'ll follow up here and by email as it moves.',
  },
  resolved: {
    subject: (t) => `Resolved — "${t.subject}" [#${t.id.slice(0, 8)}]`,
    note: 'This one is marked resolved. If it isn\'t fixed for you, just reply or reopen it and it goes straight back on the board.',
  },
};

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SUPA = process.env.VITE_SUPABASE_URL;
  const ANON = process.env.VITE_SUPABASE_ANON_KEY;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA || !ANON || !SERVICE) return Response.json({ error: 'not_configured' }, { status: 503 });
  const svc = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' };

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const userRes = await fetch(`${SUPA}/auth/v1/user`, { headers: { apikey: ANON, authorization: `Bearer ${jwt}` } });
  if (!userRes.ok) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const user = await userRes.json();

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'bad_request' }, { status: 400 }); }
  const ticketId = String(body.ticketId ?? '');
  const event = String(body.event ?? '');
  if (!ticketId || !COPY[event]) return Response.json({ error: 'bad_request', message: 'ticketId and event (created|resolved) required.' }, { status: 400 });

  const [ticket] = await (await fetch(
    `${SUPA}/rest/v1/tickets?id=eq.${ticketId}&select=id,org_id,opened_by,subject,status,people:opened_by(email,full_name)`,
    { headers: svc },
  )).json().catch(() => []);
  if (!ticket) return Response.json({ error: 'not_found' }, { status: 404 });

  // Authorize: opener, or a seat in the ticket's org.
  if (ticket.opened_by !== user.id) {
    const seats = await (await fetch(
      `${SUPA}/rest/v1/org_members?org_id=eq.${ticket.org_id}&person_id=eq.${user.id}&select=role`,
      { headers: svc },
    )).json().catch(() => []);
    if (!Array.isArray(seats) || !seats.length) return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  // Idempotence: one auto-ack per (ticket, event).
  const marker = `[auto:${event}]`;
  const prior = await (await fetch(
    `${SUPA}/rest/v1/ticket_events?ticket_id=eq.${ticketId}&kind=eq.auto_response&body=like.${encodeURIComponent(`%${marker}%`)}&select=id&limit=1`,
    { headers: svc },
  )).json().catch(() => []);
  if (Array.isArray(prior) && prior.length) return Response.json({ ok: true, duplicate: true });

  const copy = COPY[event];
  const note = `${copy.note} ${marker}`;

  // The auto_response event — service role only; requester-visible.
  const evRes = await fetch(`${SUPA}/rest/v1/ticket_events`, {
    method: 'POST',
    headers: { ...svc, prefer: 'return=minimal' },
    body: JSON.stringify({
      ticket_id: ticketId, kind: 'auto_response', visibility: 'requester', body: note,
    }),
  });
  if (!evRes.ok) {
    const detail = await evRes.text().catch(() => '');
    return Response.json({ error: 'event_failed', message: detail.slice(0, 200) }, { status: 502 });
  }

  // Email the opener — rides the rail when Resend is configured; the ack
  // event above stands on its own when it isn't (graceful pre-DNS state).
  const RESEND = process.env.RESEND_API_KEY;
  const openerEmail = String(ticket.people?.email ?? '').toLowerCase();
  let emailed = false;
  if (RESEND && openerEmail) {
    const subject = copy.subject(ticket);
    const html = emailShell(
      `<h1 style="margin:0 0 12px;font-size:19px;font-weight:700;">${escHtml(event === 'created' ? 'We\'ve got it' : 'Resolved')}</h1>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${escHtml(copy.note)}</p>
       <p style="margin:0;font-size:13px;color:#8a8f9c;">Ticket: ${escHtml(ticket.subject)} · #${ticket.id.slice(0, 8)}</p>`,
    );
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'MyBuilderVault Support <support@mybuildervault.com>',
        to: [openerEmail], subject, html, text: copy.note,
      }),
    }).catch(() => null);
    emailed = Boolean(sendRes?.ok);
    if (emailed) {
      await logCommEvent(SUPA, svc, {
        org_id: ticket.org_id, ticket_id: ticketId,
        direction: 'outbound', kind: 'email', subject, body: copy.note,
        to_emails: [openerEmail], from_email: 'support@mybuildervault.com',
      });
    }
  }

  return Response.json({ ok: true, event, emailed });
};
