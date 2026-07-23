begin;

create or replace function public.submit_published_topic_quiz(
  p_topic_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_topic public.topics%rowtype;
  created_attempt_id uuid;
  answer_item jsonb;
  target_question public.quiz_questions%rowtype;
  correct_option text;
  selected_option text;
  correct boolean;
  score_value integer := 0;
  total_value integer := 0;
  percentage_value integer;
  skill_results jsonb;
begin
  select * into target_topic
  from public.topics
  where id = p_topic_id and status = 'published';
  if not found then
    raise exception using errcode = 'P0002', message = 'Quiz publicado não encontrado';
  end if;
  if actor_id is null
    or public.current_profile_role() <> 'student'
    or not public.is_active_class_member(target_topic.class_id) then
    raise exception using errcode = '42501', message = 'Aluno não pertence à turma deste tópico';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception using errcode = '22023', message = 'Respostas inválidas';
  end if;

  total_value := (select count(*) from public.quiz_questions where topic_id = p_topic_id);
  if total_value = 0 or jsonb_array_length(p_answers) <> total_value then
    raise exception using errcode = '22023', message = 'Responda todas as questões do quiz';
  end if;

  insert into public.quiz_attempts (
    student_id, topic_id, class_id, total, completed_at
  ) values (
    actor_id, p_topic_id, target_topic.class_id, total_value, now()
  ) returning id into created_attempt_id;

  for answer_item in select * from jsonb_array_elements(p_answers) loop
    select * into target_question
    from public.quiz_questions
    where id = (answer_item ->> 'questionId')::uuid
      and topic_id = p_topic_id;
    if not found then
      raise exception using errcode = '22023', message = 'Questão não pertence ao tópico';
    end if;
    select answer.correct_option into correct_option
    from public.quiz_answer_keys answer
    where answer.question_id = target_question.id;
    selected_option := upper(btrim(answer_item ->> 'selectedOption'));
    correct := selected_option = upper(correct_option);
    if correct then score_value := score_value + 1; end if;

    insert into public.quiz_attempt_answers (
      attempt_id, question_id, skill, selected_option, is_correct
    ) values (
      created_attempt_id, target_question.id, target_question.skill, selected_option, correct
    );

    insert into public.skill_mastery (
      student_id, skill, topic_id, correct_count, total_count, mastery_pct, last_practiced_at
    ) values (
      actor_id, target_question.skill, p_topic_id,
      case when correct then 1 else 0 end, 1,
      case when correct then 100 else 0 end, now()
    )
    on conflict (student_id, skill)
    do update set
      topic_id = excluded.topic_id,
      correct_count = public.skill_mastery.correct_count + excluded.correct_count,
      total_count = public.skill_mastery.total_count + 1,
      mastery_pct = round(
        ((public.skill_mastery.correct_count + excluded.correct_count)::numeric
          / (public.skill_mastery.total_count + 1)) * 100
      ),
      last_practiced_at = now();
  end loop;

  percentage_value := round((score_value::numeric / total_value) * 100);
  update public.quiz_attempts
  set score = score_value, percentage = percentage_value
  where id = created_attempt_id;

  select jsonb_agg(jsonb_build_object(
    'skill', result.skill,
    'correct', result.correct,
    'total', result.total,
    'masteryPct', mastery.mastery_pct,
    'status', case when mastery.mastery_pct >= 70 then 'mastered' else 'practicing' end
  ) order by result.skill)
  into skill_results
  from (
    select answer.skill,
      count(*) filter (where answer.is_correct)::integer as correct,
      count(*)::integer as total
    from public.quiz_attempt_answers answer
    where answer.attempt_id = created_attempt_id
    group by answer.skill
  ) result
  join public.skill_mastery mastery
    on mastery.student_id = actor_id and mastery.skill = result.skill;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id, 'student', 'quiz.completed', 'quiz_attempt', created_attempt_id, 'success',
    jsonb_build_object('topicId', p_topic_id, 'score', score_value, 'total', total_value)
  );

  return jsonb_build_object(
    'attemptId', created_attempt_id,
    'score', score_value,
    'total', total_value,
    'percentage', percentage_value,
    'skillResults', coalesce(skill_results, '[]'::jsonb),
    'weakSkills', coalesce((
      select jsonb_agg(value ->> 'skill')
      from jsonb_array_elements(coalesce(skill_results, '[]'::jsonb)) value
      where (value ->> 'status') = 'practicing'
    ), '[]'::jsonb),
    'completedReviews', '[]'::jsonb
  );
end;
$$;

revoke all on function public.submit_published_topic_quiz(uuid, jsonb) from public, anon;
grant execute on function public.submit_published_topic_quiz(uuid, jsonb) to authenticated;

comment on function public.submit_published_topic_quiz(uuid, jsonb) is
  'Corrige quiz publicado no servidor sem expor quiz_answer_keys ao navegador do estudante.';

commit;
