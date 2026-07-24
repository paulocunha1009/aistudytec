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
