/**
 * inbound-log — the comms rail's ears (BOARD-007).
 * Copy-adapt from MyRealtyVault inbound-log.mjs (JSH PATTERNS §1).
 *
 * Resend Inbound (catch-all on log.mybuildervault.com) delivers here.
 * Security: shared-secret in the webhook URL (?k=INBOUND_LOG_KEY — plain
 * alphanumeric, DOCTRINE §4). Always 200: inbound providers retry on
 * non-2xx and we never want a retry storm. Unmatched mail is ignored
 * silently.
 *
 * REPLY RELAY branch: mail to reply+<contactId>@log.mybuildervault.com is
 * a client/sub replying to a platform send. Runs BEFORE sender attribution
 * (a replying client is not a platform login): log INBOUND comm_event on
 * that contact, then forward the full message to the org's owner/admin
 * inboxes with reply-to the sender so a natural inbox Reply reaches them.
 *
 * BCC CAPTURE branch: staff BCC bcc@log.mybuildervault.com on any email
 * (or set a one-time auto-BCC rule); we attribute the ORG by the sender's
 * seat email and file the message on each matched contact as an outbound
 * comm_event. Zero customer DNS — the inbound domain is OURS.
 * (AI quote-splitting of the client's quoted message is a follow-up tier,
 * best-effort by doctrine; v1 records the outbound.)
 */
import { parseRelayAddress, contactByMemberEmail, logCommEvent, emailShell, escHtml } from './_relay.mjs';

const addr = (x) => {
  if (!x) return '';
  if (typeof x === 'string') {
    const m = x.match(/<([^>]+)>/);
    return (m ? m[1] : x).trim().toLowerCase();
  }
  return String(x.email ?? x.address ?? '').trim().toLowerCase();
};
const list = (x) => (Array.isArray(x) ? x : x ? [x] : []).map(addr).filter(Boolean);

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const SUPA = process.env.VITE_SUPABASE_URL;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const KEY = process.env.INBOUND_LOG_KEY;
  if (!SUPA || !SERVICE || !KEY) return Response.json({ error: 'not_configured' }, { status: 503 });
  if (new URL(req.url).searchParams.get('k') !== KEY) return Response.json({ error: 'forbidden' }, { status: 403 });
  const svc = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' };

  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: true, note: 'unparseable' }); }
  let d = body.data ?? body;

  // Resend's email.received event is METADATA ONLY — the real message must
  // be RETRIEVED by email_id with a full-access key (MRV 8/1/26 lesson).
  const RES_KEY = process.env.RESEND_API_KEY;
  if (d.email_id && RES_KEY) {
    for (const path of [`emails/${d.email_id}`, `emails/receiving/${d.email_id}`, `inbound/emails/${d.email_id}`]) {
      try {
        const r = await fetch(`https://api.resend.com/${path}`, { headers: { authorization: `Bearer ${RES_KEY}` } });
        if (r.ok) { d = { ...d, ...(await r.json()) }; break; }
        console.log('inbound-log retrieve miss', path, r.status);
      } catch (e) { console.log('inbound-log retrieve error', path, String(e).slice(0, 120)); }
    }
  }

  // Header fields arrive as strings, objects, or arrays; on BCC deliveries
  // the top-level `to` may be the ENVELOPE (our own address) while the human
  // recipients live only in the headers. Parse everything.
  const headerVal = (name) => {
    const h = d.headers;
    if (!h) return '';
    if (Array.isArray(h)) return h.find((x) => String(x?.name ?? '').toLowerCase() === name)?.value ?? '';
    return h[name] ?? h[name.charAt(0).toUpperCase() + name.slice(1)] ?? '';
  };
  const splitAddrs = (v) => String(v ?? '').split(',').map((x) => addr(x)).filter(Boolean);
  const sender = addr(d.from) || splitAddrs(headerVal('from'))[0] || '';
  const allRcpts = [...new Set([
    ...list(d.to), ...list(d.cc), ...list(d.bcc),
    ...splitAddrs(headerVal('to')), ...splitAddrs(headerVal('cc')),
  ])];
  const recipients = allRcpts.filter((e) => e && !e.endsWith('@log.mybuildervault.com') && e !== sender);
  const subject = String(d.subject ?? '(no subject)').slice(0, 300);
  const text = String(d.text ?? d.html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);

  // ---- Reply relay: a client/sub replying to a platform send --------------
  const relayContactId = allRcpts.map(parseRelayAddress).find(Boolean) ?? null;
  if (relayContactId) {
    const [contact] = await (await fetch(
      `${SUPA}/rest/v1/contacts?id=eq.${relayContactId}&select=id,org_id,display_name,email`,
      { headers: svc },
    )).json().catch(() => []);
    if (!contact) return Response.json({ ok: true, relay: 0, note: 'unknown relay contact' });

    const fromNote = sender && sender !== String(contact.email ?? '').toLowerCase() ? `From: ${sender}\n` : '';
    await logCommEvent(SUPA, svc, {
      org_id: contact.org_id, contact_id: contact.id,
      direction: 'inbound', kind: 'email', subject,
      body: `${fromNote}${text}\n\n[Reply — auto-logged]`,
      to_emails: allRcpts.filter((e) => e.endsWith('@log.mybuildervault.com')),
      from_email: sender || null,
    });

    // Forward to the org's owner/admin seats so a natural inbox reply works.
    const seats = await (await fetch(
      `${SUPA}/rest/v1/org_members?org_id=eq.${contact.org_id}&role=in.(owner,admin)&select=people:person_id(email)`,
      { headers: svc },
    )).json().catch(() => []);
    const staffTo = [...new Set((Array.isArray(seats) ? seats : [])
      .map((s) => String(s?.people?.email ?? '').toLowerCase()).filter(Boolean))];
    if (staffTo.length && RES_KEY) {
      const html = emailShell(
        `<p style="margin:0 0 10px;font-size:13px;color:#8a8f9c;">Reply from <b>${escHtml(contact.display_name ?? sender)}</b> — logged to their card. Reply from your inbox to reach them directly.</p>
         <h1 style="margin:0 0 12px;font-size:18px;font-weight:700;">${escHtml(subject)}</h1>
         <p style="margin:0;font-size:15px;line-height:1.6;">${escHtml(text)}</p>`,
      );
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${RES_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: 'MyBuilderVault <share@mybuildervault.com>',
          to: staffTo,
          reply_to: sender ? [sender] : undefined,
          subject: `Re: ${subject}`, html, text,
        }),
      }).catch(() => {});
    }
    return Response.json({ ok: true, relay: 1 });
  }

  // ---- BCC capture: attribute the org by the sender's seat email ----------
  if (!sender) return Response.json({ ok: true, note: 'no sender' });
  const seatRows = await (await fetch(
    `${SUPA}/rest/v1/people?email=ilike.${encodeURIComponent(sender)}&select=id,org_members(org_id)`,
    { headers: svc },
  )).json().catch(() => []);
  const person = Array.isArray(seatRows) ? seatRows[0] : null;
  const orgIds = [...new Set((person?.org_members ?? []).map((m) => m.org_id).filter(Boolean))];
  if (!person || !orgIds.length) return Response.json({ ok: true, note: 'sender not a seat' });

  let logged = 0;
  for (const orgId of orgIds) {
    for (const rcpt of recipients) {
      const card = await contactByMemberEmail(SUPA, svc, orgId, rcpt);
      if (!card) continue;
      await logCommEvent(SUPA, svc, {
        org_id: orgId, contact_id: card.id,
        direction: 'outbound', kind: 'email', subject,
        body: `${text}\n\n[BCC — auto-logged]`,
        to_emails: [rcpt], from_email: sender, sent_by: person.id,
      });
      logged += 1;
    }
  }
  return Response.json({ ok: true, logged });
};
