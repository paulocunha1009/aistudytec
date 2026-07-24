import {
  authorizeOrEnrollStudent,
  enrollStudent,
  listClassStudents,
  listPendingStudentGrants,
  removeStudent,
  revokePendingStudentGrant,
} from './classRosterService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  requireSupabase: vi.fn(),
}));

describe('classRosterService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lista apenas matrículas ativas da turma', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ joined_at: '2026-07-23T00:00:00Z', profiles: { id: 'student-1', name: 'Aluno' } }],
        error: null,
      }),
    };
    requireSupabase.mockReturnValue({ from: vi.fn(() => query) });

    await expect(listClassStudents('class-1')).resolves.toEqual([{
      id: 'student-1',
      name: 'Aluno',
      joinedAt: '2026-07-23T00:00:00Z',
    }]);
    expect(query.eq).toHaveBeenCalledWith('class_id', 'class-1');
    expect(query.is).toHaveBeenCalledWith('left_at', null);
  });

  test('normaliza e-mail antes da matrícula', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: 'student-1' }], error: null });
    requireSupabase.mockReturnValue({ rpc });

    await enrollStudent({ classId: 'class-1', email: '  ALUNO@EXEMPLO.COM  ' });

    expect(rpc).toHaveBeenCalledWith('enroll_student_by_email', {
      p_class_id: 'class-1',
      p_email: 'aluno@exemplo.com',
    });
  });

  test('remove matrícula por função protegida', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ rpc });

    await removeStudent({ classId: 'class-1', studentId: 'student-1' });

    expect(rpc).toHaveBeenCalledWith('remove_student_from_class', {
      p_class_id: 'class-1',
      p_student_id: 'student-1',
    });
  });

  test('professor autoriza ou matricula aluno sem escolher papel', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { status: 'authorized' }, error: null });
    requireSupabase.mockReturnValue({ rpc });

    await expect(authorizeOrEnrollStudent({
      classId: 'class-1',
      email: '  NOVO@EXEMPLO.COM ',
      validDays: 7,
    })).resolves.toEqual({ status: 'authorized' });

    expect(rpc).toHaveBeenCalledWith('authorize_or_enroll_class_student', expect.objectContaining({
      p_class_id: 'class-1',
      p_email: 'novo@exemplo.com',
    }));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('role');
  });

  test('lista somente autorizações pendentes de aluno da turma', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'grant-1' }], error: null }),
    };
    requireSupabase.mockReturnValue({ from: vi.fn(() => query) });
    await expect(listPendingStudentGrants('class-1')).resolves.toEqual([{ id: 'grant-1' }]);
    expect(query.eq).toHaveBeenCalledWith('class_id', 'class-1');
    expect(query.eq).toHaveBeenCalledWith('role', 'student');
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
  });

  test('revoga autorização por RPC protegida', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ rpc });
    await revokePendingStudentGrant('grant-1');
    expect(rpc).toHaveBeenCalledWith('revoke_teacher_student_grant', {
      p_grant_id: 'grant-1',
    });
  });
});
