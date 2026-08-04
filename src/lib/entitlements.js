import { supabase } from './supabase';

// resolve_entitlement(p_org, p_person, p_feature) — script 002.
// Precedence person > group > org > platform > true. Fail-open matches the
// SQL default: an RPC hiccup must never lock a builder out of their shell.
export async function resolveEntitlement(orgId, personId, featureKey) {
  try {
    const { data, error } = await supabase.rpc('resolve_entitlement', {
      p_org: orgId, p_person: personId, p_feature: featureKey,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

// can_see_ticket_queue(p_org) — script 003. Governs the Tickets surface for
// owner/admin seats; platform staff always true. Fail-closed: the queue is a
// privileged surface, requesters still see their own tickets elsewhere.
export async function canSeeTicketQueue(orgId) {
  try {
    const { data, error } = await supabase.rpc('can_see_ticket_queue', { p_org: orgId });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
