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

export const authorizeOrEnrollStudent = async ({ classId, email, validDays = 7 }) => {
  const expiresAt = new Date(Date.now() + validDays * 86400000).toISOString();
  const { data, error } = await requireSupabase().rpc('authorize_or_enroll_class_student', {
    p_class_id: classId,
    p_email: email.trim().toLowerCase(),
    p_expires_at: expiresAt,
  });

  if (error?.code === '42501') throw new Error(error.message || 'Você não pode administrar esta turma.');
  if (error?.code === '23505') throw new Error('Já existe uma autorização pendente para este e-mail.');
  if (error?.code === '22023') throw new Error(error.message);
  if (error) throw new Error('Não foi possível cadastrar ou matricular o aluno.');
  return data;
};

export const listPendingStudentGrants = async classId => {
  const { data, error } = await requireSupabase()
    .from('access_grants')
    .select('id, email, expires_at, created_at')
    .eq('class_id', classId)
    .eq('role', 'student')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar as autorizações pendentes.');
  return data || [];
};

export const revokePendingStudentGrant = async grantId => {
  const { error } = await requireSupabase().rpc('revoke_teacher_student_grant', {
    p_grant_id: grantId,
  });

  if (error?.code === '42501') throw new Error('Você não pode revogar esta autorização.');
  if (error) throw new Error('Não foi possível revogar a autorização.');
};

export const removeStudent = async ({ classId, studentId }) => {
  const { error } = await requireSupabase().rpc('remove_student_from_class', {
    p_class_id: classId,
    p_student_id: studentId,
  });

  if (error?.code === '42501') throw new Error('Você não pode administrar esta turma.');
  if (error) throw new Error('Não foi possível remover o aluno da turma.');
};
