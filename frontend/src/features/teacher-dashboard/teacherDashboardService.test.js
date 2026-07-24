import { createLearningIntervention, loadClassLearningDashboard } from './teacherDashboardService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ requireSupabase: vi.fn() }));

test('carrega painel agregado pelo contrato protegido do banco', async () => {
  const rpc = vi.fn().mockResolvedValue({
    data: { summary: { students: 2 }, students: [], descriptors: [] },
    error: null,
  });
  requireSupabase.mockReturnValue({ rpc });

  await expect(loadClassLearningDashboard('class-1'))
    .resolves.toMatchObject({ summary: { students: 2 } });
  expect(rpc).toHaveBeenCalledWith('get_class_learning_dashboard', {
    p_class_id: 'class-1',
  });
});

test('cria reforço com habilidades e orientação explícitas do professor', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { id: 'i1', status: 'active' }, error: null });
  requireSupabase.mockReturnValue({ rpc });

  await expect(createLearningIntervention({
    classId: 'class-1',
    studentId: 'student-1',
    skills: ['Hardware'],
    instructions: 'Revise os componentes e refaça os exemplos antes do quiz.',
  })).resolves.toMatchObject({ id: 'i1', status: 'active' });

  expect(rpc).toHaveBeenCalledWith('create_learning_intervention', {
    p_class_id: 'class-1',
    p_student_id: 'student-1',
    p_skills: ['Hardware'],
    p_instructions: 'Revise os componentes e refaça os exemplos antes do quiz.',
  });
});
