import { loadClassLearningDashboard } from './teacherDashboardService';
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
