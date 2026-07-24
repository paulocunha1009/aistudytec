import { requireSupabase } from '../../lib/supabase';

export const loadClassLearningDashboard = async classId => {
  if (!classId) return null;
  const { data, error } = await requireSupabase().rpc('get_class_learning_dashboard', {
    p_class_id: classId,
  });
  if (error?.code === '42501') throw new Error('Você não possui acesso aos indicadores desta turma.');
  if (error) throw new Error('Não foi possível carregar os indicadores da turma.');
  return data;
};

export const createLearningIntervention = async ({ classId, studentId, skills, instructions }) => {
  const { data, error } = await requireSupabase().rpc('create_learning_intervention', {
    p_class_id: classId,
    p_student_id: studentId,
    p_skills: skills,
    p_instructions: instructions,
  });
  if (error?.code === '42501') throw new Error('Você não pode criar uma intervenção para este aluno.');
  if (error?.code === '22023') throw new Error(error.message || 'A intervenção não possui evidências suficientes.');
  if (error) throw new Error('Não foi possível enviar o reforço ao aluno.');
  return data;
};
