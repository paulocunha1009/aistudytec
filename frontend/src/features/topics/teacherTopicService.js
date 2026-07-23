import { requireSupabase } from '../../lib/supabase';

const mapTopic = topic => ({
  ...topic,
  descriptors: (topic.topic_curriculum_descriptors || [])
    .map(link => link.curriculum_descriptors)
    .filter(Boolean)
    .sort((left, right) => left.code.localeCompare(right.code)),
});

export const listTeacherTopics = async classId => {
  const { data, error } = await requireSupabase()
    .from('topics')
    .select(`
      id,
      class_id,
      title,
      target_grade,
      status,
      created_at,
      topic_curriculum_descriptors(
        curriculum_descriptors(id, code, level, description)
      )
    `)
    .eq('class_id', classId)
    .eq('origin', 'teacher')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar os tópicos.');
  return (data || []).map(mapTopic);
};

export const listClassBlueprintDescriptors = async classId => {
  const { data, error } = await requireSupabase()
    .from('class_curriculum_descriptors')
    .select('curriculum_descriptors(id, code, level, description)')
    .eq('class_id', classId);

  if (error) throw new Error('Não foi possível carregar o blueprint da turma.');
  return (data || [])
    .map(link => link.curriculum_descriptors)
    .filter(Boolean)
    .sort((left, right) => left.code.localeCompare(right.code));
};

export const createTeacherTopic = async ({ classId, title, targetGrade, descriptorIds }) => {
  const { data, error } = await requireSupabase().rpc('create_teacher_topic', {
    p_class_id: classId,
    p_title: title.trim(),
    p_target_grade: targetGrade,
    p_descriptor_ids: descriptorIds,
  });

  if (error?.code === '42501') throw new Error('Você não pode criar tópicos nesta turma.');
  if (error) throw new Error(error.message || 'Não foi possível criar o tópico.');
  return data;
};
