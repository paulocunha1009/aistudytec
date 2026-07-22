export const buildInterventions = (students = []) => {
  const interventions = [];

  students.forEach(student => {
    if (student.dueReviews?.length) {
      interventions.push({
        id: `due-${student.userId}`,
        priority: 0,
        type: 'due-review',
        student,
        title: `${student.dueReviews.length} revisão${student.dueReviews.length > 1 ? 'ões' : ''} vencida${student.dueReviews.length > 1 ? 's' : ''}`,
        evidence: student.dueReviews.map(item => item.skill).join(', '),
        topicId: student.dueReviews.find(item => item.topic_id)?.topic_id,
      });
    }

    if (student.attempts === 0) {
      interventions.push({
        id: `no-attempt-${student.userId}`,
        priority: 1,
        type: 'no-attempt',
        student,
        title: 'Sem tentativa registrada',
        evidence: 'Não há quiz concluído nesta turma.',
      });
      return;
    }

    const repeatedWeak = (student.skills || []).filter(skill => skill.status === 'reforcar' && skill.totalCount > 1);
    if (repeatedWeak.length) {
      interventions.push({
        id: `weak-${student.userId}`,
        priority: 1,
        type: 'weak-skill',
        student,
        title: `${repeatedWeak.length} habilidade${repeatedWeak.length > 1 ? 's' : ''} para reforçar`,
        evidence: repeatedWeak.map(skill => `${skill.skill} (${skill.masteryPct}%, ${skill.totalCount} respostas)`).join('; '),
      });
    }

    const lowEvidence = (student.skills || []).filter(skill => skill.totalCount <= 1);
    if (lowEvidence.length) {
      interventions.push({
        id: `evidence-${student.userId}`,
        priority: 2,
        type: 'low-evidence',
        student,
        title: 'Evidência ainda insuficiente',
        evidence: lowEvidence.map(skill => `${skill.skill}: ${skill.totalCount} resposta`).join('; '),
      });
    }
  });

  return interventions.sort((a, b) => a.priority - b.priority || a.student.name.localeCompare(b.student.name, 'pt-BR'));
};

export const INTERVENTION_META = {
  'due-review': { label: 'Revisão vencida', tone: 'danger', action: 'Retomar a habilidade e orientar uma nova tentativa.' },
  'no-attempt': { label: 'Sem atividade', tone: 'warning', action: 'Verificar acesso e indicar o primeiro tópico.' },
  'weak-skill': { label: 'Reforço', tone: 'warning', action: 'Revisar a explicação e observar a próxima tentativa.' },
  'low-evidence': { label: 'Pouca evidência', tone: 'info', action: 'Coletar mais respostas antes de concluir domínio.' },
};
