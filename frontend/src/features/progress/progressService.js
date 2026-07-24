import { requireSupabase } from '../../lib/supabase';
import { getPublishedTopic } from '../student/studentTopicService';

const formatAttemptDate = value => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value)).replace(',', '');

export const loadStudentProgress = async studentId => {
  if (!studentId) return { mastery: [], reviews: [], history: [], interventions: [] };
  const client = requireSupabase();
  const now = new Date().toISOString();
  const [masteryResult, reviewResult, attemptResult, interventionResult] = await Promise.all([
    client.from('skill_mastery')
      .select('id, skill, topic_id, correct_count, total_count, mastery_pct, last_practiced_at')
      .eq('student_id', studentId)
      .order('mastery_pct', { ascending: true }),
    client.from('review_queue')
      .select('id, skill, topic_id, due_at, topics(title, status)')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .lte('due_at', now)
      .order('due_at', { ascending: true }),
    client.from('quiz_attempts')
      .select('id, topic_id, score, total, percentage, completed_at, topics(title, status)')
      .eq('student_id', studentId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20),
    client.from('learning_interventions')
      .select('id, topic_id, title, instructions, skills, created_at, topics(title, status)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);
  const error = [masteryResult, reviewResult, attemptResult, interventionResult].find(result => result.error)?.error;
  if (error) throw new Error('Não foi possível carregar seu progresso.');

  return {
    mastery: masteryResult.data || [],
    reviews: (reviewResult.data || []).map(item => ({
      ...item,
      topic_title: item.topics?.title,
      topic_available: item.topics?.status === 'published',
      due_date: item.due_at?.slice(0, 10),
    })),
    history: (attemptResult.data || []).map(item => ({
      id: item.id,
      type: 'quiz',
      topic_id: item.topic_id,
      theme: item.topics?.title,
      topic_available: item.topics?.status === 'published',
      score: item.score,
      total: item.total,
      percentage: item.percentage,
      date: formatAttemptDate(item.completed_at),
    })),
    interventions: (interventionResult.data || []).map(item => ({
      ...item,
      topic_title: item.topics?.title,
      topic_available: item.topics?.status === 'published',
    })),
  };
};

export const openProgressTopic = topicId => getPublishedTopic(topicId);
