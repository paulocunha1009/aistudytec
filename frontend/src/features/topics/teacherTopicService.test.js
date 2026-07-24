import {
  createTeacherTopic,
  listClassBlueprintDescriptors,
  listTeacherTopics,
} from './teacherTopicService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ requireSupabase: vi.fn() }));

describe('teacherTopicService', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lista tópicos apenas da turma e mapeia descritores', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'topic-1',
          topic_curriculum_descriptors: [
            { curriculum_descriptors: { id: 'd2', code: 'D02' } },
            { curriculum_descriptors: { id: 'd1', code: 'D01' } },
          ],
        }],
        error: null,
      }),
    };
    requireSupabase.mockReturnValue({ from: vi.fn(() => query) });
    const result = await listTeacherTopics('class-1');
    expect(query.eq).toHaveBeenCalledWith('class_id', 'class-1');
    expect(result[0].descriptors.map(item => item.code)).toEqual(['D01', 'D02']);
  });

  test('lista descritores do blueprint da turma', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ curriculum_descriptors: { id: 'd1', code: 'D01' } }],
        error: null,
      }),
    };
    requireSupabase.mockReturnValue({ from: vi.fn(() => query) });
    await expect(listClassBlueprintDescriptors('class-1')).resolves.toEqual([{ id: 'd1', code: 'D01' }]);
  });

  test('cria tópico somente por RPC com descritores', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'topic-1' }, error: null });
    requireSupabase.mockReturnValue({ rpc });
    await createTeacherTopic({
      classId: 'class-1',
      title: ' Hardware ',
      targetGrade: '1',
      descriptorIds: ['d1', 'd2'],
    });
    expect(rpc).toHaveBeenCalledWith('create_teacher_topic', {
      p_class_id: 'class-1',
      p_title: 'Hardware',
      p_target_grade: '1',
      p_descriptor_ids: ['d1', 'd2'],
    });
  });
});
