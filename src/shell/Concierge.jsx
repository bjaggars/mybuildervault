import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// Concierge intake stub (thesis 8, script 003 contract):
//   how_to  -> AI answers FIRST in a later release; until then it files a
//              how_to ticket a human answers.
//   defect  -> ticket type 'defect'.
//   feature -> ticket type 'feature_request'; triage may CONVERT it to a
//              feature_requests row (+ GitHub Issue dual-write, app-side).
// Every intake here carries channel='concierge'. Inserts use a client-side
// crypto.randomUUID() and NO returning — the RLS INSERT…RETURNING trap.
const INTENTS = [
  { key: 'how_to', label: 'How do I…?', hint: 'Ask a how-to question. The AI concierge answers these directly in an upcoming release — for now a human replies to your ticket.' },
  { key: 'defect', label: 'Report a problem', hint: 'Something broken or behaving wrong. Goes straight to the support queue.' },
  { key: 'feature_request', label: 'Request a feature', hint: 'An idea or improvement. Triage can promote it onto the product roadmap.' },
];

export default function Concierge({ orgId, personId }) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => { setIntent(null); setSubject(''); setBody(''); setDone(false); setErr(''); };

  const file = async () => {
    if (!subject.trim()) { setErr('A short subject is required.'); return; }
    setErr(''); setBusy(true);
    const ticketId = crypto.randomUUID();
    const { error } = await supabase.from('tickets').insert({
      id: ticketId,
      org_id: orgId,
      opened_by: personId,
      subject: subject.trim(),
      body: body.trim() || null,
      type: intent,
      channel: 'concierge',
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    // System auto-ack rides the comms rail (BOARD-007) — best-effort by
    // doctrine: an ack failure never blocks or un-does the filing.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      fetch('/.netlify/functions/ticket-notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ ticketId, event: 'created' }),
      }).catch(() => {});
    } catch { /* best-effort */ }
  };

  const bubble = {
    position: 'fixed', right: 22, bottom: 22, width: 52, height: 52, borderRadius: '50%',
    background: 'var(--gold)', color: 'var(--navy-deep)', border: 'none', fontSize: 24,
    fontWeight: 800, boxShadow: 'var(--shadow)', zIndex: 40,
  };
  const panel = {
    position: 'fixed', right: 22, bottom: 84, width: 340, maxWidth: '92vw',
    background: 'var(--cream-panel)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    border: '1px solid var(--line)', padding: 18, zIndex: 40,
  };
  const input = { width: '100%', padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', marginTop: 8 };

  return (
    <>
      {open && (
        <div style={panel} data-testid="concierge-panel">
          <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>Concierge</div>
          {!intent && !done && (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>What do you need?</div>
              {INTENTS.map((i) => (
                <button key={i.key} data-testid={`concierge-${i.key}`} onClick={() => setIntent(i.key)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 6, borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontWeight: 600, color: 'var(--navy)' }}>
                  {i.label}
                </button>
              ))}
            </>
          )}
          {intent && !done && (
            <>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{INTENTS.find((i) => i.key === intent)?.hint}</div>
              <input data-testid="concierge-subject" style={input} placeholder="Subject"
                value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea data-testid="concierge-body" style={{ ...input, height: 84, resize: 'none' }} placeholder="Details (optional)"
                value={body} onChange={(e) => setBody(e.target.value)} />
              {err && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--bad)' }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={reset} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)' }}>Back</button>
                <button data-testid="concierge-submit" disabled={busy} onClick={file}
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--gold)', color: 'var(--navy-deep)', fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Filing…' : 'File it'}
                </button>
              </div>
            </>
          )}
          {done && (
            <>
              <div data-testid="concierge-done" style={{ fontSize: 14, color: 'var(--ok)', fontWeight: 700, margin: '8px 0' }}>Filed. You&rsquo;ll hear back on this ticket.</div>
              <button onClick={reset} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }}>File another</button>
            </>
          )}
        </div>
      )}
      <button style={bubble} data-testid="concierge-bubble" aria-label="Concierge"
        onClick={() => { setOpen((v) => !v); if (open) reset(); }}>?</button>
    </>
  );
}
