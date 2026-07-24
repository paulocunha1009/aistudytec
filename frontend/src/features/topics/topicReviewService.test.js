import {
  addValidatedTopicVideo,
  buildTopicGate,
  generateTopicContent,
  publishTopic,
  setVideoApproval,
} from './topicReviewService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ requireSupabase: vi.fn() }));

describe('topicReviewService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('invoca geração somente pela Edge Function protegida', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { status: 'generated', sourceCount: 4 },
      error: null,
    });
    requireSupabase.mockReturnValue({ functions: { invoke } });

    await expect(generateTopicContent({ topicId: 'topic-1' }))
      .resolves.toMatchObject({ status: 'generated' });
    expect(invoke).toHaveBeenCalledWith('generate-topic', {
      body: { topicId: 'topic-1', part: 'all' },
    });
  });

  test('traduz detalhes do gate de publicação', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23514', details: 'mínimo de oito questões | um vídeo aprovado por nível' },
    });
    requireSupabase.mockReturnValue({ rpc });

    await expect(publishTopic('topic-1')).rejects.toMatchObject({
      missing: ['mínimo de oito questões', 'um vídeo aprovado por nível'],
    });
  });

  test('checklist exige conteúdo completo e aprovação humana dos vídeos', () => {
    const path = {
      hook: 'Pergunta', objectives: ['A'], keyIdeas: ['B'],
      realWorldConnection: 'C', guidedInvestigation: {}, watchMission: {},
      handsOnChallenge: {}, reflectionQuestions: ['D'], discussionPrompt: 'E',
    };
    const topic = {
      explanations: {
        simple: 'x'.repeat(120), technical: 'x'.repeat(120), advanced: 'x'.repeat(120),
      },
      learningPaths: { simple: path, technical: path, advanced: path },
      questions: Array.from({ length: 8 }, (_, index) => ({
        id: index, correct_option: 'A', explanation: 'feedback detalhado válido',
        descriptors: [{ code: 'D01' }],
      })),
      videos: {
        simple: [{ approved: true }],
        technical: [{ approved: true }],
        advanced: [{ approved: false }],
      },
    };

    const gate = buildTopicGate(topic);
    expect(gate.filter(item => item.ready)).toHaveLength(3);
    expect(gate.find(item => item.key === 'videos').ready).toBe(false);
  });

  test('aprovação de vídeo usa contrato auditado do banco', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    requireSupabase.mockReturnValue({ rpc });
    await setVideoApproval({ videoId: 'video-1', approved: true });
    expect(rpc).toHaveBeenCalledWith('set_topic_video_approval', {
      p_video_id: 'video-1',
      p_approved: true,
    });
  });

  test('envia vídeo escolhido para validação server-side', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { video: { id: 'video-2' } }, error: null });
    requireSupabase.mockReturnValue({ functions: { invoke } });
    await expect(addValidatedTopicVideo({
      topicId: 'topic-1',
      level: 'technical',
      youtubeUrl: ' https://youtube.com/watch?v=abcdefghijk ',
    })).resolves.toEqual({ id: 'video-2' });
    expect(invoke).toHaveBeenCalledWith('validate-topic-video', {
      body: {
        topicId: 'topic-1',
        level: 'technical',
        youtubeUrl: 'https://youtube.com/watch?v=abcdefghijk',
      },
    });
  });
});
