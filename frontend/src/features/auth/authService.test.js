import {
  getMfaState,
  loadIdentity,
  oauthRedirectError,
  requestPasswordRecovery,
  signIn,
  signInWithGoogle,
  verifyTotp,
} from './authService';
import { requireSupabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  requireSupabase: jest.fn(),
}));

const profileQuery = data => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error: null }),
});

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('traduz bloqueio OAuth de cadastro não autorizado', () => {
    expect(oauthRedirectError({
      search: '?error=access_denied&error_description=Seu+acesso+ainda+n%C3%A3o+foi+autorizado+pelo+administrador.',
      hash: '',
    })).toBe('Seu e-mail não possui uma autorização ativa. Solicite a liberação ao administrador.');
  });

  test('carrega identidade pelo perfil protegido', async () => {
    const query = profileQuery({ id: 'user-1', role: 'teacher', status: 'active', name: 'Professora', email: 'p@test.invalid', grade_year: null });
    requireSupabase.mockReturnValue({ from: jest.fn(() => query) });

    await expect(loadIdentity({ user: { id: 'user-1', email: 'p@test.invalid' } })).resolves.toMatchObject({
      id: 'user-1',
      type: 'teacher',
      status: 'active',
    });
  });

  test('login ativo usa Supabase e não depende do Flask', async () => {
    const query = profileQuery({ id: 'user-1', role: 'student', status: 'active', name: 'Ana', email: 'ana@test.invalid', grade_year: '1' });
    const signInWithPassword = jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'ana@test.invalid' } } }, error: null });
    requireSupabase.mockReturnValue({ auth: { signInWithPassword }, from: jest.fn(() => query) });

    const result = await signIn({ email: ' ana@test.invalid ', password: 'segredo-seguro' });

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'ana@test.invalid', password: 'segredo-seguro' });
    expect(result.identity.type).toBe('student');
  });

  test('conta não ativa é desconectada localmente', async () => {
    const query = profileQuery({ id: 'user-1', role: 'student', status: 'invited', name: 'Ana', email: 'ana@test.invalid', grade_year: '1' });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
        signOut,
      },
      from: jest.fn(() => query),
    });

    await expect(signIn({ email: 'ana@test.invalid', password: 'segredo-seguro' })).rejects.toThrow('ainda não está ativa');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  test('Google OAuth retorna à origem e exige seleção explícita da conta', async () => {
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: { provider: 'google' }, error: null });
    requireSupabase.mockReturnValue({ auth: { signInWithOAuth } });

    await signInWithGoogle();

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining(window.location.origin),
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      }),
    });
  });

  test('recuperação usa retorno na própria origem', async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ auth: { resetPasswordForEmail } });

    await requestPasswordRecovery('ana@test.invalid');

    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@test.invalid', expect.objectContaining({
      redirectTo: expect.stringContaining(window.location.origin),
    }));
  });

  test('estado MFA combina AAL e fatores TOTP', async () => {
    requireSupabase.mockReturnValue({
      auth: {
        mfa: {
          getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null }),
          listFactors: jest.fn().mockResolvedValue({ data: { totp: [{ id: 'factor-1', status: 'verified' }] }, error: null }),
        },
      },
    });

    await expect(getMfaState()).resolves.toEqual({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      factors: [{ id: 'factor-1', status: 'verified' }],
    });
  });

  test('verificação TOTP cria desafio antes de validar', async () => {
    const challenge = jest.fn().mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    const verify = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ auth: { mfa: { challenge, verify } } });

    await verifyTotp({ factorId: 'factor-1', code: '123456' });

    expect(challenge).toHaveBeenCalledWith({ factorId: 'factor-1' });
    expect(verify).toHaveBeenCalledWith({ factorId: 'factor-1', challengeId: 'challenge-1', code: '123456' });
  });
});
