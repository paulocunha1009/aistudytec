import { requireSupabase } from '../../lib/supabase';

const normalizeEmail = value => value.trim().toLowerCase();

export const listAccessGrants = async () => {
  const { data, error } = await requireSupabase()
    .from('access_grants')
    .select('id, email, role, status, expires_at, created_at, consumed_at, revoked_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar as autorizações.');
  return data || [];
};

export const createAccessGrant = async ({ email, role, grantedBy, expiresAt }) => {
  const { data, error } = await requireSupabase()
    .from('access_grants')
    .insert({
      email: normalizeEmail(email),
      role,
      granted_by: grantedBy,
      expires_at: expiresAt,
    })
    .select('id, email, role, status, expires_at, created_at, consumed_at, revoked_at')
    .single();

  if (error?.code === '23505') throw new Error('Já existe uma autorização pendente para este e-mail.');
  if (error) throw new Error('Não foi possível criar a autorização.');
  return data;
};

export const revokeAccessGrant = async id => {
  const { data, error } = await requireSupabase()
    .from('access_grants')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error) throw new Error('Não foi possível revogar esta autorização.');
  return data;
};
