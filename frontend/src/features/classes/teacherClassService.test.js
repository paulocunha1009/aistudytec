import { createOwnedClass, listOwnedClasses } from './teacherClassService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  requireSupabase: vi.fn(),
}));

describe('teacherClassService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lista somente turmas vinculadas ao professor atual', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'class-1',
          class_curriculum_components: [{ curriculum_components: { id: 'component-1', name: 'Banco de Dados' } }],
          class_curriculum_descriptors: [{ curriculum_descriptors: { id: 'descriptor-1', code: 'D20', level: 'basico' } }],
        }],
        error: null,
      }),
    };
    requireSupabase.mockReturnValue({ from: vi.fn(() => query) });

    await expect(listOwnedClasses('teacher-1')).resolves.toEqual([expect.objectContaining({
      id: 'class-1',
      curriculumComponents: [{ id: 'component-1', name: 'Banco de Dados' }],
      curriculumDescriptors: [{ id: 'descriptor-1', code: 'D20', level: 'basico' }],
    })]);
    expect(query.eq).toHaveBeenCalledWith('teacher_id', 'teacher-1');
  });

  test('cria turma pelo contrato RPC sem aceitar teacherId do cliente', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'class-1', code: 'A1B2C3D4' }, error: null });
    requireSupabase.mockReturnValue({ rpc });

    await createOwnedClass({
      name: '  Robótica  ',
      theme: '  Tecnologia  ',
      gradeYear: '2',
      curriculumComponentIds: ['component-1'],
      curriculumDescriptorIds: ['descriptor-1'],
    });

    expect(rpc).toHaveBeenCalledWith('create_class', {
      p_name: 'Robótica',
      p_theme: 'Tecnologia',
      p_grade_year: '2',
      p_curriculum_component_ids: ['component-1'],
      p_curriculum_descriptor_ids: ['descriptor-1'],
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('teacher_id');
  });

  test('traduz negação de permissão do banco', async () => {
    requireSupabase.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } }),
    });

    await expect(createOwnedClass({
      name: 'Turma',
      theme: '',
      gradeYear: 'any',
      curriculumComponentIds: [],
      curriculumDescriptorIds: [],
    }))
      .rejects.toThrow('Sua conta não possui permissão para criar turmas.');
  });
});
