import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const badge = (text, bg, fg) => (
  <span style={{ background: bg, color: fg, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{text}</span>
);
const statusColors = {
  open: ['#EAF2FF', '#1D4E89'], in_progress: ['#FFF4DE', '#8A5A00'], waiting: ['#F3E8FF', '#6B21A8'],
  resolved: ['#E7F6EC', '#1F6B3A'], closed: ['#EEEEEA', '#5A6478'],
};
const typeLabels = { defect: 'Defect', feature_request: 'Feature', how_to: 'How-to', other: 'Other' };

export default function Tickets({ orgId }) {
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from('v_ticket_stats').select('*').eq('org_id', orgId).maybeSingle(),
        supabase.from('tickets')
          .select('id, subject, type, channel, status, priority, level, created_at')
          .eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      setStats(s ?? {});
      setRows(t ?? []);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div data-testid="tickets-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 14 }}>Tickets</div>

      <div style={{ display: 'flex', gap: 18, marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
        <span data-testid="stat-open"><b style={{ color: 'var(--navy)' }}>{stats?.open_tickets ?? 0}</b> open</span>
        <span><b style={{ color: 'var(--navy)' }}>{stats?.in_progress ?? 0}</b> in progress</span>
        <span><b style={{ color: 'var(--navy)' }}>{stats?.waiting ?? 0}</b> waiting</span>
        <span><b style={{ color: 'var(--navy)' }}>{stats?.resolved ?? 0}</b> resolved</span>
        <span><b style={{ color: 'var(--navy)' }}>{stats?.avg_hours_first_response ?? '—'}</b> avg hrs to first response</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
        {rows === null && <div style={{ padding: 18, color: 'var(--ink-soft)' }}>Loading…</div>}
        {rows?.length === 0 && (
          <div style={{ padding: 18, color: 'var(--ink-soft)', fontSize: 14 }}>
            No tickets yet. The <b>?</b> concierge bubble files how-tos, defects, and feature requests.
          </div>
        )}
        {rows?.map((t) => (
          <div key={t.id} data-testid="ticket-row"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                {typeLabels[t.type] ?? t.type} · via {t.channel} · L{t.level} · {new Date(t.created_at).toLocaleString()}
              </div>
            </div>
            {badge(t.status.replace('_', ' '), ...(statusColors[t.status] ?? statusColors.closed))}
            {t.priority !== 'normal' && badge(t.priority, '#FBE9E9', '#8F2730')}
          </div>
        ))}
      </div>
    </div>
  );
}
