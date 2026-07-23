import { requireSupabase } from '../../lib/supabase';

const LEVELS = ['simple', 'technical', 'advanced'];

export const listStudentPublishedTopics = async () => {
  const client = requireSupabase();
  const { data: memberships, error: membershipError } = await client
    .from('class_memberships')
    .select('class_id, classes(name)')
    .is('left_at', null);
  if (membershipError) throw new Error('Não foi possível carregar suas turmas.');

  const classNames = new Map(
    (memberships || []).map(item => [item.class_id, item.classes?.name || 'Minha turma']),
  );
  const classIds = [...classNames.keys()];
  if (classIds.length === 0) return [];

  const { data, error } = await client.from('topics')
    .select('id, class_id, title, target_grade, published_at, version')
    .in('class_id', classIds)
    .eq('origin', 'teacher')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar os materiais da turma.');
  return (data || []).map(topic => ({ ...topic, className: classNames.get(topic.class_id) }));
};

export const getPublishedTopic = async topicId => {
  const client = requireSupabase();
  const [topicResult, explanationResult, pathResult, questionResult, videoResult, sourceResult] = await Promise.all([
    client.from('topics').select('id, title, origin, target_grade, status, version')
      .eq('id', topicId).eq('status', 'published').single(),
    client.from('topic_explanations').select('level, content').eq('topic_id', topicId),
    client.from('topic_learning_paths').select('level, content').eq('topic_id', topicId),
    client.from('quiz_questions').select(`
      id, question, options, explanation, skill, difficulty, order_index,
      quiz_question_descriptors(curriculum_descriptors(code, description))
    `).eq('topic_id', topicId).order('order_index'),
    client.from('topic_videos').select('id, level, youtube_video_id, title, channel_title, thumbnail_url, approved')
      .eq('topic_id', topicId).eq('approved', true),
    client.from('topic_sources').select('id, title, url, domain').eq('topic_id', topicId).order('domain'),
  ]);
  const error = [topicResult, explanationResult, pathResult, questionResult, videoResult, sourceResult]
    .find(result => result.error)?.error;
  if (error) throw new Error('Não foi possível abrir este material.');
  return {
    ...topicResult.data,
    explanations: Object.fromEntries((explanationResult.data || []).map(item => [item.level, item.content])),
    learningPaths: Object.fromEntries((pathResult.data || []).map(item => [item.level, item.content])),
    questions: questionResult.data || [],
    videos: Object.fromEntries(LEVELS.map(level => [
      level, (videoResult.data || []).filter(video => video.level === level),
    ])),
    sources: sourceResult.data || [],
  };
};

export const submitPublishedQuiz = async ({ topicId, answers }) => {
  const { data, error } = await requireSupabase().rpc('submit_published_topic_quiz', {
    p_topic_id: topicId,
    p_answers: answers,
  });
  if (error?.code === '42501') throw new Error('Você não possui acesso a este quiz.');
  if (error) throw new Error(error.message || 'Não foi possível registrar o quiz.');
  return data;
};
