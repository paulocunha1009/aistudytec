import { enrollStudent, listClassStudents, removeStudent } from './classRosterService';
import { requireSupabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  requireSupabase: jest.fn(),
}));

describe('classRosterService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lista apenas matrículas ativas da turma', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ joined_at: '2026-07-23T00:00:00Z', profiles: { id: 'student-1', name: 'Aluno' } }],
        error: null,
      }),
    };
    requireSupabase.mockReturnValue({ from: jest.fn(() => query) });

    await expect(listClassStudents('class-1')).resolves.toEqual([{
      id: 'student-1',
      name: 'Aluno',
      joinedAt: '2026-07-23T00:00:00Z',
    }]);
    expect(query.eq).toHaveBeenCalledWith('class_id', 'class-1');
    expect(query.is).toHaveBeenCalledWith('left_at', null);
  });

  test('normaliza e-mail antes da matrícula', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ id: 'student-1' }], error: null });
    requireSupabase.mockReturnValue({ rpc });

    await enrollStudent({ classId: 'class-1', email: '  ALUNO@EXEMPLO.COM  ' });

    expect(rpc).toHaveBeenCalledWith('enroll_student_by_email', {
      p_class_id: 'class-1',
      p_email: 'aluno@exemplo.com',
    });
  });

  test('remove matrícula por função protegida', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ rpc });

    await removeStudent({ classId: 'class-1', studentId: 'student-1' });

    expect(rpc).toHaveBeenCalledWith('remove_student_from_class', {
      p_class_id: 'class-1',
      p_student_id: 'student-1',
    });
  });
});
