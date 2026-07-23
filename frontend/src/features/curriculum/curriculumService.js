import { requireSupabase } from '../../lib/supabase';

export const listCurriculumComponents = async () => {
  const { data, error } = await requireSupabase()
    .from('curriculum_components')
    .select(`
      id,
      name,
      curriculum_catalogs!inner(code, course_name, source_kind),
      curriculum_component_descriptors(
        curriculum_descriptors(
          id,
          code,
          level,
          description,
          curriculum_competencies(code, description)
        )
      )
    `)
    .eq('curriculum_catalogs.code', 'SIDEP-CE-TI-2026')
    .order('name');

  if (error) throw new Error('Não foi possível carregar a referência curricular.');
  return (data || []).map(component => ({
    id: component.id,
    name: component.name,
    sourceKind: component.curriculum_catalogs?.source_kind,
    descriptors: (component.curriculum_component_descriptors || [])
      .map(link => link.curriculum_descriptors)
      .filter(Boolean)
      .sort((left, right) => left.code.localeCompare(right.code)),
  }));
};
