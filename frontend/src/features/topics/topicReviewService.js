import { requireSupabase } from '../../lib/supabase';

const LEVELS = ['simple', 'technical', 'advanced'];

export const getTopicReview = async topicId => {
  const client = requireSupabase();
  const [topicResult, explanationsResult, pathsResult, questionsResult, videosResult] = await Promise.all([
    client.from('topics').select(`
      id, title, status, target_grade, version, reviewed_at,
      topic_curriculum_descriptors(
        curriculum_descriptors(id, code, description)
      )
    `).eq('id', topicId).single(),
    client.from('topic_explanations').select('id, level, content, ai_generated').eq('topic_id', topicId),
    client.from('topic_learning_paths').select('id, level, content').eq('topic_id', topicId),
    client.from('quiz_questions').select(`
      id, question, options, explanation, skill, difficulty, target_grade, order_index,
      quiz_answer_keys(correct_option),
      quiz_question_descriptors(curriculum_descriptors(id, code, description))
    `).eq('topic_id', topicId).order('order_index'),
    client.from('topic_videos').select(`
      id, level, youtube_video_id, title, channel_title, thumbnail_url, approved, order_index
    `).eq('topic_id', topicId).order('order_index'),
  ]);

  const firstError = [topicResult, explanationsResult, pathsResult, questionsResult, videosResult]
    .find(result => result.error)?.error;
  if (firstError) throw new Error('Não foi possível carregar a revisão do tópico.');

  return {
    ...topicResult.data,
    descriptors: (topicResult.data.topic_curriculum_descriptors || [])
      .map(link => link.curriculum_descriptors).filter(Boolean),
    explanations: Object.fromEntries((explanationsResult.data || []).map(item => [item.level, item.content])),
    learningPaths: Object.fromEntries((pathsResult.data || []).map(item => [item.level, item.content])),
    questions: (questionsResult.data || []).map(item => ({
      ...item,
      correct_option: item.quiz_answer_keys?.correct_option,
      descriptors: (item.quiz_question_descriptors || [])
        .map(link => link.curriculum_descriptors).filter(Boolean),
    })),
    videos: Object.fromEntries(LEVELS.map(level => [
      level,
      (videosResult.data || []).filter(video => video.level === level),
    ])),
  };
};

export const saveTopicExplanation = async ({ topicId, level, content }) => {
  const { error } = await requireSupabase().from('topic_explanations').upsert({
    topic_id: topicId,
    level,
    content: content.trim(),
    ai_generated: false,
  }, { onConflict: 'topic_id,level' });
  if (error) throw new Error('Não foi possível salvar a explicação.');
};

export const setVideoApproval = async ({ videoId, approved }) => {
  const { error } = await requireSupabase().from('topic_videos')
    .update({ approved }).eq('id', videoId);
  if (error) throw new Error('Não foi possível atualizar o vídeo.');
};

export const saveTopicQuestion = async ({ questionId, patch }) => {
  const client = requireSupabase();
  const questionPatch = {};
  ['question', 'options', 'explanation', 'skill', 'difficulty'].forEach(field => {
    if (patch[field] !== undefined) questionPatch[field] = patch[field];
  });
  if (Object.keys(questionPatch).length) {
    const { error } = await client.from('quiz_questions').update(questionPatch).eq('id', questionId);
    if (error) throw new Error('Não foi possível salvar a questão.');
  }
  if (patch.correctOption !== undefined) {
    const { error } = await client.from('quiz_answer_keys').upsert({
      question_id: questionId,
      correct_option: patch.correctOption.trim().toUpperCase(),
    });
    if (error) throw new Error('Não foi possível salvar o gabarito.');
  }
};

export const deleteTopicQuestion = async questionId => {
  const { error } = await requireSupabase().from('quiz_questions').delete().eq('id', questionId);
  if (error) throw new Error('Não foi possível excluir a questão.');
};

export const generateTopicContent = async ({ topicId, part = 'all' }) => {
  const { data, error } = await requireSupabase().functions.invoke('generate-topic', {
    body: { topicId, part },
  });
  if (error) {
    let serverMessage;
    try {
      const details = await error.context?.json();
      serverMessage = details?.error;
    } catch (_) {
      // Resposta sem JSON: mantém mensagem segura e genérica.
    }
    throw new Error(serverMessage || error.message || 'A geração curricular não pôde ser concluída.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export const publishTopic = async topicId => {
  const { data, error } = await requireSupabase().rpc('publish_teacher_topic', {
    p_topic_id: topicId,
  });
  if (error?.code === '23514') {
    const details = (error.details || '').split(' | ').filter(Boolean);
    const gateError = new Error('O tópico ainda não atende aos critérios de publicação.');
    gateError.missing = details;
    throw gateError;
  }
  if (error) throw new Error(error.message || 'Não foi possível publicar o tópico.');
  return data;
};
