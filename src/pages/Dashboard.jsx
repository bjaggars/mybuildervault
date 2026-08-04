import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const cardStyle = {
  background: 'var(--cream-panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
  padding: '18px 20px', boxShadow: 'var(--shadow)',
};

function Stat({ label, value }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Dashboard({ orgId, orgName, role }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    supabase.from('v_ticket_stats').select('*').eq('org_id', orgId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setStats(data ?? {}); });
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <div style={{ flex: 1, padding: '26px 30px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20 }}>
        <div data-testid="dashboard-title" style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{orgName ?? 'Dashboard'}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Your seat: {role ?? '…'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <Stat label="Open tickets" value={stats?.open_tickets ?? 0} />
        <Stat label="New this week" value={stats?.new_7d ?? 0} />
        <Stat label="Feature requests" value={stats?.feature_requests ?? 0} />
        <Stat label="Avg hours to close" value={stats?.avg_hours_to_close ?? '—'} />
      </div>

      <div style={{ ...cardStyle, marginTop: 20, borderStyle: 'dashed', color: 'var(--ink-soft)', fontSize: 14 }}>
        Jobs, estimates, change orders, and allowances land here in Phase B — the financial
        spine. This dashboard grows stat cards as each surface ships; it will never grow a
        scrollbar it doesn&rsquo;t need.
      </div>
    </div>
  );
}
