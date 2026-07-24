import { listCurriculumComponents } from './curriculumService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  requireSupabase: vi.fn(),
}));

test('carrega componentes do catálogo técnico e normaliza a contagem', async () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [{
        id: 'component-1',
        name: 'Banco de Dados',
        curriculum_catalogs: { source_kind: 'internal_curated' },
        curriculum_component_descriptors: [{
          curriculum_descriptors: {
            id: 'descriptor-1',
            code: 'D20',
            level: 'basico',
            description: 'Modelar entidades.',
            curriculum_competencies: { code: 'C05', description: 'Modelar bancos.' },
          },
        }],
      }],
      error: null,
    }),
  };
  requireSupabase.mockReturnValue({ from: vi.fn(() => query) });

  await expect(listCurriculumComponents()).resolves.toEqual([{
    id: 'component-1',
    name: 'Banco de Dados',
    sourceKind: 'internal_curated',
    descriptors: [{
      id: 'descriptor-1',
      code: 'D20',
      level: 'basico',
      description: 'Modelar entidades.',
      curriculum_competencies: { code: 'C05', description: 'Modelar bancos.' },
    }],
  }]);
  expect(query.eq).toHaveBeenCalledWith('curriculum_catalogs.code', 'SIDEP-CE-TI-2026');
});
