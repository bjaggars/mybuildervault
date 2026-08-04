import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { resolveEntitlement, canSeeTicketQueue } from '../lib/entitlements';
import Concierge from './Concierge.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Tickets from '../pages/Tickets.jsx';
import Settings from '../pages/Settings.jsx';
import MissionControl from '../pages/MissionControl.jsx';

// eslint-disable-next-line no-undef
const BUILD = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : { sha: 'dev', at: '' };

const navLink = ({ isActive }) => ({
  display: 'block', padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
  fontSize: 14, fontWeight: 600, marginBottom: 4,
  color: isActive ? 'var(--navy-deep)' : 'var(--cream)',
  background: isActive ? 'var(--gold)' : 'transparent',
});

export default function AppShell({ session, memberships, activeOrgId, onSelectOrg }) {
  const active = (memberships ?? []).find((m) => m.org_id === activeOrgId) ?? null;
  const org = active?.builder_orgs ?? null;
  const personId = session.user.id;

  // Surface gating — resolve_entitlement (002) for feature surfaces,
  // can_see_ticket_queue (003) for the queue. Loaded per active org.
  const [gates, setGates] = useState({ tickets: false, concierge: true, settings: true, missionControl: false });
  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    (async () => {
      const [tickets, concierge, settings, staffRow] = await Promise.all([
        canSeeTicketQueue(activeOrgId),
        resolveEntitlement(activeOrgId, personId, 'concierge.enabled'),
        resolveEntitlement(activeOrgId, personId, 'settings.members'),
        // platform_staff self-read is allowed by pstaff_select RLS; tenants get null.
        supabase.from('platform_staff').select('role').eq('person_id', personId).maybeSingle(),
      ]);
      if (!cancelled) setGates({ tickets, concierge, settings, missionControl: !!staffRow?.data });
    })();
    return () => { cancelled = true; };
  }, [activeOrgId, personId]);

  if (memberships === null) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>Loading…</div>;
  }
  if (memberships.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>No workspace yet</div>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
            Your account isn&rsquo;t a member of a builder organization. If you were invited,
            use the link in your invitation email; otherwise contact support@mybuildervault.com.
          </p>
          <button onClick={() => supabase.auth.signOut()}
            style={{ marginTop: 8, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, flexShrink: 0, background: 'var(--navy)', display: 'flex', flexDirection: 'column', padding: '18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--navy-deep)" />
            <path d="M16 7 5 16h3v9h6v-6h4v6h6v-9h3z" fill="var(--gold)" />
          </svg>
          <div style={{ color: 'var(--cream)', fontWeight: 800, fontSize: 15 }}>MyBuilderVault</div>
        </div>

        {memberships.length > 1 ? (
          <select
            value={activeOrgId ?? ''}
            onChange={(e) => onSelectOrg(e.target.value)}
            style={{ marginBottom: 16, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'var(--navy-soft)', color: 'var(--cream)', fontSize: 13 }}>
            {memberships.map((m) => (
              <option key={m.org_id} value={m.org_id}>{m.builder_orgs?.name ?? m.org_id}</option>
            ))}
          </select>
        ) : (
          <div data-testid="org-name" style={{ marginBottom: 16, padding: '8px 10px', borderRadius: 8, background: 'var(--navy-soft)', color: 'var(--cream)', fontSize: 13, fontWeight: 600 }}>
            {org?.name ?? '…'}
          </div>
        )}

        <nav style={{ flex: 1 }}>
          <NavLink to="/" end style={navLink} data-testid="nav-dashboard">Dashboard</NavLink>
          {gates.tickets && <NavLink to="/tickets" style={navLink} data-testid="nav-tickets">Tickets</NavLink>}
          {gates.settings && <NavLink to="/settings" style={navLink} data-testid="nav-settings">Settings</NavLink>}
          {gates.missionControl && <NavLink to="/mission-control" style={navLink} data-testid="nav-mission-control">Mission Control</NavLink>}
        </nav>

        <div style={{ color: 'var(--cream)', fontSize: 12, opacity: 0.85, padding: '0 4px' }}>
          <div style={{ marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.user.email}</div>
          <button onClick={() => supabase.auth.signOut()} data-testid="sign-out"
            style={{ width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid var(--navy-soft)', background: 'transparent', color: 'var(--cream)', fontSize: 12 }}>
            Sign out
          </button>
          <div data-testid="build-stamp" style={{ marginTop: 10, fontSize: 10, opacity: 0.6 }} title={BUILD.at}>build {BUILD.sha}</div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Dashboard orgId={activeOrgId} orgName={org?.name} role={active?.role} />} />
          <Route path="/tickets" element={gates.tickets ? <Tickets orgId={activeOrgId} /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={gates.settings ? <Settings orgId={activeOrgId} role={active?.role} session={session} /> : <Navigate to="/" replace />} />
          <Route path="/mission-control" element={gates.missionControl ? <MissionControl /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {gates.concierge && activeOrgId && <Concierge orgId={activeOrgId} personId={personId} />}
    </div>
  );
}
