import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './auth/Login.jsx';
import AcceptInvite from './auth/AcceptInvite.jsx';
import AppShell from './shell/AppShell.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [memberships, setMemberships] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMemberships(null); setActiveOrgId(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('org_members')
        .select('org_id, role, builder_orgs ( id, name, slug, palette )')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      const rows = error ? [] : (data ?? []);
      setMemberships(rows);
      setActiveOrgId((cur) => cur ?? rows[0]?.org_id ?? null);
    })();
    return () => { cancelled = true; };
  }, [session]);

  if (session === undefined) return null;

  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInvite session={session} />} />
      <Route
        path="/*"
        element={
          session
            ? <AppShell
                session={session}
                memberships={memberships}
                activeOrgId={activeOrgId}
                onSelectOrg={setActiveOrgId}
              />
            : <Login />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
