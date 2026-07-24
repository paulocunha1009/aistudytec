begin;

create or replace function public.get_class_learning_dashboard(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null or not public.can_manage_class(p_class_id) then
    raise exception using errcode = '42501', message = 'Você não pode consultar esta turma';
  end if;

  with active_students as (
    select profile.id, profile.name
    from public.class_memberships membership
    join public.profiles profile on profile.id = membership.student_id
    where membership.class_id = p_class_id
      and membership.left_at is null
      and profile.role = 'student'
      and profile.status = 'active'
  ),
  student_rows as (
    select
      student.id as student_id,
      student.name,
      coalesce(attempt_stats.attempts, 0) as attempts,
      coalesce(attempt_stats.avg_percentage, 0) as avg_percentage,
      attempt_stats.last_practiced_at,
      coalesce(skills.items, '[]'::jsonb) as skills,
      coalesce(reviews.items, '[]'::jsonb) as due_reviews
    from active_students student
    left join lateral (
      select count(*)::integer as attempts,
        round(avg(attempt.percentage))::integer as avg_percentage,
        max(attempt.completed_at) as last_practiced_at
      from public.quiz_attempts attempt
      where attempt.student_id = student.id
        and attempt.class_id = p_class_id
        and attempt.completed_at is not null
    ) attempt_stats on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'skill', mastery.skill,
        'masteryPct', mastery.mastery_pct,
        'totalCount', mastery.total_count,
        'status', case when mastery.mastery_pct >= 70 then 'mastered' else 'reforcar' end
      ) order by mastery.mastery_pct, mastery.skill) as items
      from public.skill_mastery mastery
      join public.topics topic on topic.id = mastery.topic_id
      where mastery.student_id = student.id and topic.class_id = p_class_id
    ) skills on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', queue.id,
        'skill', queue.skill,
        'topic_id', queue.topic_id,
        'due_at', queue.due_at
      ) order by queue.due_at) as items
      from public.review_queue queue
      join public.topics topic on topic.id = queue.topic_id
      where queue.student_id = student.id
        and topic.class_id = p_class_id
        and queue.status = 'pending'
        and queue.due_at <= now()
    ) reviews on true
  ),
  descriptor_rows as (
    select
      descriptor.id,
      descriptor.code,
      descriptor.description,
      count(answer.id)::integer as total_answers,
      count(answer.id) filter (where answer.is_correct)::integer as correct_answers,
      count(distinct attempt.student_id)::integer as students_with_evidence,
      round(
        100 * count(answer.id) filter (where answer.is_correct)::numeric
        / nullif(count(answer.id), 0)
      )::integer as evidence_pct
    from public.quiz_attempt_answers answer
    join public.quiz_attempts attempt on attempt.id = answer.attempt_id
    join public.quiz_question_descriptors question_descriptor
      on question_descriptor.question_id = answer.question_id
    join public.curriculum_descriptors descriptor
      on descriptor.id = question_descriptor.descriptor_id
    where attempt.class_id = p_class_id and attempt.completed_at is not null
    group by descriptor.id, descriptor.code, descriptor.description
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'students', (select count(*) from student_rows),
      'dueReviews', (
        select coalesce(sum(jsonb_array_length(student.due_reviews)), 0) from student_rows student
      ),
      'skillsToReinforce', (
        select count(*)
        from public.skill_mastery mastery
        join public.topics topic on topic.id = mastery.topic_id
        join active_students student on student.id = mastery.student_id
        where topic.class_id = p_class_id
          and mastery.mastery_pct < 70
          and mastery.total_count > 1
      ),
      'withoutAttempts', (
        select count(*) from student_rows where attempts = 0
      )
    ),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', student.student_id,
        'name', student.name,
        'attempts', student.attempts,
        'avgPercentage', student.avg_percentage,
        'lastPracticedAt', student.last_practiced_at,
        'skills', student.skills,
        'dueReviews', student.due_reviews
      ) order by student.name)
      from student_rows student
    ), '[]'::jsonb),
    'descriptors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', descriptor.id,
        'code', descriptor.code,
        'description', descriptor.description,
        'totalAnswers', descriptor.total_answers,
        'correctAnswers', descriptor.correct_answers,
        'studentsWithEvidence', descriptor.students_with_evidence,
        'evidencePct', descriptor.evidence_pct
      ) order by descriptor.evidence_pct, descriptor.code)
      from descriptor_rows descriptor
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_class_learning_dashboard(uuid) from public, anon;
grant execute on function public.get_class_learning_dashboard(uuid) to authenticated;

comment on function public.get_class_learning_dashboard(uuid) is
  'Indicadores pedagógicos agregados da turma; exige professor proprietário ou master em aal2.';

commit;
