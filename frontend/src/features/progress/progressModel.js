const parseBrazilianDate = (value) => {
  if (!value) return 0;
  const [datePart, timePart = '00:00'] = value.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};

export const buildProgressModel = ({ mastery = [], reviews = [], history = [], interventions = [] }) => {
  const dueSkills = new Set(reviews.map(item => item.skill));
  const skills = mastery.map(item => {
    let stage = 'em-pratica';
    if (dueSkills.has(item.skill)) stage = 'revisar';
    else if (item.mastery_pct >= 70) stage = 'consistente';
    else if (item.total_count <= 1) stage = 'comecando';
    return { ...item, stage };
  });

  const timeline = [...history]
    .filter(item => item.type === 'quiz')
    .sort((a, b) => parseBrazilianDate(b.date) - parseBrazilianDate(a.date));

  const plan = interventions.map(item => ({
    id: `intervention-${item.id}`,
    kind: 'intervention',
    title: item.title,
    context: `${item.instructions} Habilidades: ${(item.skills || []).join(', ')}.`,
    topicId: item.topic_available ? item.topic_id : null,
    actionLabel: item.topic_available ? 'Fazer reforço' : 'Explorar outro material',
  }));

  plan.push(...reviews.map(item => ({
    id: `review-${item.id}`,
    kind: 'review',
    title: `Revisar ${item.skill}`,
    context: item.topic_title || 'Revisão de habilidade',
    dueDate: item.due_date,
    topicId: item.topic_available ? item.topic_id : null,
    actionLabel: item.topic_available ? 'Começar agora' : 'Explorar outro material',
  })));

  const latestAvailableAttempt = timeline.find(item => item.topic_available);
  if (plan.length === 0 && latestAvailableAttempt) {
    plan.push({
      id: `continue-${latestAvailableAttempt.id}`,
      kind: 'continue',
      title: `Continuar em ${latestAvailableAttempt.theme || 'seus estudos'}`,
      context: `Último quiz: ${latestAvailableAttempt.percentage}%`,
      topicId: latestAvailableAttempt.topic_id,
      actionLabel: 'Começar agora',
    });
  }

  return {
    skills,
    timeline,
    plan,
    summary: {
      totalSkills: skills.length,
      consistent: skills.filter(item => item.stage === 'consistente').length,
      dueReviews: reviews.length,
      attempts: timeline.length,
    },
  };
};

export const STAGE_META = {
  comecando: { label: 'Começando', tone: 'info' },
  'em-pratica': { label: 'Em prática', tone: 'warning' },
  consistente: { label: 'Consistente', tone: 'success' },
  revisar: { label: 'Revisar', tone: 'danger' },
};
