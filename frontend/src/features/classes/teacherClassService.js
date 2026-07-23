import { requireSupabase } from '../../lib/supabase';

export const listOwnedClasses = async teacherId => {
  const { data, error } = await requireSupabase()
    .from('classes')
    .select(`
      id,
      name,
      code,
      theme,
      grade_year,
      teacher_id,
      created_at,
      updated_at,
      class_curriculum_components(
        curriculum_components(id, name)
      ),
      class_curriculum_descriptors(
        curriculum_descriptors(
          id,
          code,
          level,
          curriculum_competencies(code)
        )
      )
    `)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar suas turmas.');
  return (data || []).map(item => ({
    ...item,
    curriculumComponents: (item.class_curriculum_components || [])
      .map(link => link.curriculum_components)
      .filter(Boolean),
    curriculumDescriptors: (item.class_curriculum_descriptors || [])
      .map(link => link.curriculum_descriptors)
      .filter(Boolean)
      .sort((left, right) => left.code.localeCompare(right.code)),
  }));
};

export const createOwnedClass = async ({ name, theme, gradeYear, curriculumComponentIds, curriculumDescriptorIds }) => {
  const { data, error } = await requireSupabase().rpc('create_class', {
    p_name: name.trim(),
    p_theme: theme.trim() || null,
    p_grade_year: gradeYear,
    p_curriculum_component_ids: curriculumComponentIds || [],
    p_curriculum_descriptor_ids: curriculumDescriptorIds || [],
  });

  if (error?.code === '42501') throw new Error('Sua conta não possui permissão para criar turmas.');
  if (error) throw new Error(error.message || 'Não foi possível criar a turma.');
  return data;
};
