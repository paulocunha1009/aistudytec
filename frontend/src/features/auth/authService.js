import { requireSupabase } from '../../lib/supabase';

const errorMessages = {
  invalid_credentials: 'E-mail ou senha inválidos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos.',
  same_password: 'Escolha uma senha diferente da atual.',
};

export const authErrorMessage = (error, fallback = 'Não foi possível concluir a autenticação.') => {
  if (!error) return fallback;
  return errorMessages[error.code] || fallback;
};

export const loadIdentity = async (session) => {
  if (!session?.user) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, role, status, name, email, grade_year')
    .eq('id', session.user.id)
    .single();

  if (error) throw new Error('Não foi possível carregar o perfil desta conta.');
  return {
    id: data.id,
    type: data.role,
    role: data.role,
    status: data.status,
    name: data.name,
    email: data.email || session.user.email,
    gradeYear: data.grade_year,
  };
};

export const signIn = async ({ email, password }) => {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authErrorMessage(error, 'E-mail ou senha inválidos.'));
  const identity = await loadIdentity(data.session);
  if (identity.status !== 'active') {
    await client.auth.signOut({ scope: 'local' });
    throw new Error('Esta conta ainda não está ativa. Solicite liberação ao responsável.');
  }
  return { session: data.session, identity };
};

export const requestPasswordRecovery = async (email) => {
  const client = requireSupabase();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new Error(authErrorMessage(error, 'Não foi possível enviar as instruções.'));
};

export const updatePassword = async (password) => {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(authErrorMessage(error, 'Não foi possível alterar a senha.'));
};

export const signOut = async (scope = 'local') => {
  const { error } = await requireSupabase().auth.signOut({ scope });
  if (error) throw new Error('Não foi possível encerrar a sessão.');
};

export const getMfaState = async () => {
  const client = requireSupabase();
  const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] = await Promise.all([
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
    client.auth.mfa.listFactors(),
  ]);
  if (assuranceError || factorsError) throw new Error('Não foi possível verificar a segurança da sessão.');
  return {
    currentLevel: assurance.currentLevel,
    nextLevel: assurance.nextLevel,
    factors: factors.totp || [],
  };
};

export const enrollTotp = async () => {
  const { data, error } = await requireSupabase().auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'AISTUDYTEC',
  });
  if (error) throw new Error('Não foi possível iniciar a proteção por aplicativo autenticador.');
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
};

export const verifyTotp = async ({ factorId, code }) => {
  const client = requireSupabase();
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
  if (challengeError) throw new Error('Não foi possível iniciar a verificação do código.');
  const { error } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (error) throw new Error('Código inválido ou expirado. Confira o aplicativo e tente novamente.');
};

