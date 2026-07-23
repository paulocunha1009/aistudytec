import { requireSupabase } from '../../lib/supabase';
import { getPublishedTopic } from '../student/studentTopicService';

const formatAttemptDate = value => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value)).replace(',', '');

export const loadStudentProgress = async studentId => {
  if (!studentId) return { mastery: [], reviews: [], history: [] };
  const client = requireSupabase();
  const now = new Date().toISOString();
  const [masteryResult, reviewResult, attemptResult] = await Promise.all([
    client.from('skill_mastery')
      .select('id, skill, topic_id, correct_count, total_count, mastery_pct, last_practiced_at')
      .eq('student_id', studentId)
      .order('mastery_pct', { ascending: true }),
    client.from('review_queue')
      .select('id, skill, topic_id, due_at, topics(title)')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .lte('due_at', now)
      .order('due_at', { ascending: true }),
    client.from('quiz_attempts')
      .select('id, topic_id, score, total, percentage, completed_at, topics(title)')
      .eq('student_id', studentId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20),
  ]);
  const error = [masteryResult, reviewResult, attemptResult].find(result => result.error)?.error;
  if (error) throw new Error('Não foi possível carregar seu progresso.');

  return {
    mastery: masteryResult.data || [],
    reviews: (reviewResult.data || []).map(item => ({
      ...item,
      topic_title: item.topics?.title,
      due_date: item.due_at?.slice(0, 10),
    })),
    history: (attemptResult.data || []).map(item => ({
      id: item.id,
      type: 'quiz',
      topic_id: item.topic_id,
      theme: item.topics?.title,
      score: item.score,
      total: item.total,
      percentage: item.percentage,
      date: formatAttemptDate(item.completed_at),
    })),
  };
};

export const openProgressTopic = topicId => getPublishedTopic(topicId);
