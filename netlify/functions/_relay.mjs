/**
 * Reply-relay helpers — comms rail shared module (BOARD-007).
 * Copy-adapt from MyRealtyVault _relay.mjs (JSH PATTERNS §1, Rule of Three).
 *
 * Platform sends set Reply-To to reply+<contactId>@log.mybuildervault.com.
 * When the recipient hits Reply, inbound-log's reply+ branch files an
 * INBOUND comm_event on that contact and forwards the full message to the
 * org's owner/admin inboxes (with reply-to the sender, so a natural inbox
 * reply reaches them directly). Party-aware by construction: the id
 * addresses the CONTACT card, so any member's reply lands in one thread.
 */

export const RELAY_DOMAIN = 'log.mybuildervault.com';

/** RFC 5322 formatted: '"Brije LLC" <reply+uuid@log...>' — mail clients
 *  display the name, hiding the plumbing. */
export const relayReplyTo = (contactId, displayName) => {
  if (!contactId) return undefined;
  const address = `reply+${contactId}@${RELAY_DOMAIN}`;
  const name = String(displayName ?? '').replace(/["<>]/g, '').trim();
  return [name ? `${name} <${address}>` : address];
};

/** Match an address like reply+<uuid>@log.mybuildervault.com → uuid | null */
export const parseRelayAddress = (email) => {
  const m = String(email ?? '')
    .toLowerCase()
    .match(/^reply\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@log\.mybuildervault\.com$/);
  return m ? m[1] : null;
};

/**
 * Party-aware reachability: every email on the card — all members' emails,
 * deduped, primary first — falling back to the contacts.email cache column.
 * "Same comms" doctrine: platform sends go To ALL members of the party.
 */
export const partyEmails = async (SUPA, svc, contact) => {
  const legacy = contact?.email ? [String(contact.email).toLowerCase()] : [];
  if (!contact?.id) return legacy;
  try {
    const rows = await (await fetch(
      `${SUPA}/rest/v1/contact_members?contact_id=eq.${contact.id}&select=email,is_primary&order=is_primary.desc`,
      { headers: svc },
    )).json();
    if (!Array.isArray(rows) || !rows.length) return legacy;
    const emails = [...new Set(rows.map((m) => String(m.email ?? '').trim().toLowerCase()).filter(Boolean))];
    return emails.length ? emails : legacy;
  } catch { return legacy; }
};

/**
 * Party-aware salutation: household → "Jordan & Casey" (member first names,
 * primary first); entity → the primary HUMAN's first name (never
 * "Sunshine Holdings LLC,"); person / no members → first word of the
 * display name.
 */
export const partySalutation = async (SUPA, svc, contact) => {
  const base = String(contact?.display_name ?? '').trim().split(/\s+/)[0] ?? '';
  if (contact?.kind !== 'household' && contact?.kind !== 'entity') return base;
  try {
    const rows = await (await fetch(
      `${SUPA}/rest/v1/contact_members?contact_id=eq.${contact.id}&select=full_name,is_primary&order=is_primary.desc`,
      { headers: svc },
    )).json();
    if (!Array.isArray(rows) || !rows.length) return base;
    const firsts = rows.map((m) => String(m.full_name ?? '').trim().split(/\s+/)[0]).filter(Boolean);
    if (!firsts.length) return base;
    return contact.kind === 'entity' ? firsts[0] : firsts.join(' & ');
  } catch { return base; }
};

/**
 * Match an inbound sender address to a card via ANY member (household
 * member 2's mail lands on the one card), org-scoped. Falls back to the
 * contacts.email cache column. Returns {id, org_id} | null.
 */
export const contactByMemberEmail = async (SUPA, svc, orgId, email) => {
  const e = String(email ?? '').trim().toLowerCase();
  if (!orgId || !e) return null;
  try {
    const rows = await (await fetch(
      `${SUPA}/rest/v1/contact_members?email=ilike.${encodeURIComponent(e)}&select=contact_id,contacts!inner(id,org_id)`,
      { headers: svc },
    )).json();
    const hit = Array.isArray(rows) ? rows.find((r) => r?.contacts?.org_id === orgId) : null;
    if (hit) return { id: hit.contacts.id, org_id: hit.contacts.org_id };
  } catch { /* fall through to cache column */ }
  try {
    const rows = await (await fetch(
      `${SUPA}/rest/v1/contacts?org_id=eq.${orgId}&email=ilike.${encodeURIComponent(e)}&select=id,org_id&limit=1`,
      { headers: svc },
    )).json();
    return rows?.[0] ? { id: rows[0].id, org_id: rows[0].org_id } : null;
  } catch { return null; }
};

/** Log a row on the comms rail record — service role, best-effort. */
export const logCommEvent = async (SUPA, svc, row) => {
  try {
    await fetch(`${SUPA}/rest/v1/comm_events`, {
      method: 'POST',
      headers: { ...svc, prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } catch { /* recording is best-effort; never block the send */ }
};

/** The branded white-card shell every rail email wears (navy/gold/cream). */
export const emailShell = (innerHtml, footerLine = 'MyBuilderVault · a Jaggars Software Holdings product · Ocala, Florida · mybuildervault.com') =>
  `<!doctype html><html><body style="margin:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#22293A;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;padding-bottom:18px;">
      <div style="display:inline-block;background:#1C2B4A;color:#F5F0E8;border-radius:12px;padding:10px 16px;font-size:18px;font-weight:700;letter-spacing:0.02em;">MyBuilderVault</div>
    </div>
    <div style="background:#FDFBF7;border:1px solid #E3DCCE;border-radius:14px;padding:26px;">
      ${innerHtml}
    </div>
    <p style="text-align:center;margin:18px 0 0;font-size:11.5px;color:#8a8f9c;line-height:1.6;">${footerLine}</p>
  </div></body></html>`;

export const escHtml = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export const paragraphs = (message) =>
  escHtml(message).split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${p.replaceAll('\n', '<br/>')}</p>`)
    .join('');
