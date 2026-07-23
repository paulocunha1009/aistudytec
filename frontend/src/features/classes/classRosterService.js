import { requireSupabase } from '../../lib/supabase';

export const listClassStudents = async classId => {
  const { data, error } = await requireSupabase()
    .from('class_memberships')
    .select(`
      joined_at,
      profiles!class_memberships_student_id_fkey(id, name, email, grade_year)
    `)
    .eq('class_id', classId)
    .is('left_at', null)
    .order('joined_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar os alunos da turma.');
  return (data || []).map(item => ({
    ...item.profiles,
    joinedAt: item.joined_at,
  }));
};

export const enrollStudent = async ({ classId, email }) => {
  const { data, error } = await requireSupabase().rpc('enroll_student_by_email', {
    p_class_id: classId,
    p_email: email.trim().toLowerCase(),
  });

  if (error?.code === '42501') throw new Error('Você não pode administrar esta turma.');
  if (error?.code === 'P0002') throw new Error('Não encontramos um aluno ativo com esse e-mail.');
  if (error) throw new Error('Não foi possível matricular o aluno.');
  return Array.isArray(data) ? data[0] : data;
};

export const removeStudent = async ({ classId, studentId }) => {
  const { error } = await requireSupabase().rpc('remove_student_from_class', {
    p_class_id: classId,
    p_student_id: studentId,
  });

  if (error?.code === '42501') throw new Error('Você não pode administrar esta turma.');
  if (error) throw new Error('Não foi possível remover o aluno da turma.');
};
