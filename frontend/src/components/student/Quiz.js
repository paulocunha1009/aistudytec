import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, ArrowRight, BarChart3, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { Badge, Button, Card, Progress } from '../../design-system';

const optionLetter = (opt) => opt.trim().charAt(0);

const Quiz = ({ topic, currentUser, apiUrl, onFinish, onClose, addToast }) => {
  const questions = topic.questions || [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const question = questions[index];

  const pickOption = (opt) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
  };

  const next = async () => {
    const newAnswers = [...answers, { questionId: question.id, selectedOption: optionLetter(selected) }];
    setAnswers(newAnswers);
    setSelected(null);
    setAnswered(false);

    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitQuizAttempt(apiUrl, {
        topicId: topic.id,
        userId: currentUser?.data?.id,
        studentName: currentUser?.data?.name,
        classId: currentUser?.data?.classId,
        answers: newAnswers,
      });
      setResult(result);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#eef3f8] p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="relative overflow-hidden rounded-[2rem] bg-[#07111f] p-6 text-white sm:p-8">
            <div className="home-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Evidência registrada</p><h2 id="result-title" className="mt-2 text-3xl font-black">Quiz concluído</h2><p className="mt-2 text-slate-300">Veja o que esta tentativa acrescentou ao seu mapa.</p></div><Sparkles className="text-lime-300" size={30} /></div><div className="mt-7 flex items-end gap-3"><strong className="text-6xl font-black text-white">{result.percentage}%</strong><span className="pb-2 text-sm text-slate-400">{result.score} de {result.total} respostas</span></div></div>
          </header>

          <section aria-labelledby="skill-result-title"><h3 id="skill-result-title" className="mb-3 flex items-center gap-2 text-xl font-black"><BarChart3 className="text-blue-600" /> Evidência por habilidade</h3><div className="grid gap-3">{(result.skillResults || []).map(skill => <Card key={skill.skill} className="border-0 shadow-md"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-slate-900">{skill.skill}</h4><p className="mt-1 text-sm text-slate-500">Nesta tentativa: {skill.correct}/{skill.total} acertos</p></div><Badge tone={skill.status === 'mastered' ? 'success' : 'warning'}>{skill.status === 'mastered' ? 'Consistente' : 'Em prática'}</Badge></div><Progress value={skill.masteryPct} label="Domínio acumulado" className="mt-4" /></Card>)}</div></section>

          {(result.completedReviews || []).length > 0 && <Card className="border-emerald-200 bg-emerald-50"><div className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-700" /><div><h3 className="font-black text-emerald-950">Revisão concluída com evidência</h3><p className="mt-1 text-sm text-emerald-800">{result.completedReviews.join(', ')}. Se ainda precisar reforçar, uma nova revisão foi programada.</p></div></div></Card>}
          {(result.weakSkills || []).length > 0 && <Card className="border-amber-200 bg-amber-50"><div className="flex gap-3"><RefreshCw className="shrink-0 text-amber-700" /><div><h3 className="font-black text-amber-950">Próximo ciclo de prática</h3><p className="mt-1 text-sm text-amber-800">Vamos retomar: {result.weakSkills.join(', ')}.</p></div></div></Card>}

          <div className="grid gap-3 sm:grid-cols-2"><Button variant="secondary" size="lg" onClick={() => onFinish(result, 'explore')}>Voltar a explorar</Button><Button size="lg" onClick={() => onFinish(result, 'progress')}>Ver meu plano <ArrowRight size={18} /></Button></div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-white p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="empty-quiz-title">
        <h2 id="empty-quiz-title" className="text-xl font-bold">Quiz indisponível</h2>
        <p className="text-slate-500">Este tópico ainda não tem questões.</p>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    );
  }

  const isCorrect = answered && optionLetter(selected) === question.correct_option;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <div className="border-b p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span id="quiz-title" className="min-w-0 truncate font-bold">Quiz: {topic.title}</span>
          <button type="button" aria-label="Fechar quiz" onClick={onClose} className="shrink-0 rounded-lg p-2 hover:bg-slate-100"><X /></button>
        </div>
        <Progress value={index + 1} max={questions.length} label={`Questão ${index + 1} de ${questions.length}`} />
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-8">
        <div className="max-w-2xl w-full">
          <h2 className="text-2xl font-bold mb-8 text-center">{question.question}</h2>
          <div className="grid gap-4">
            {question.options.map((opt, i) => {
              const letter = optionLetter(opt);
              const isSelected = selected === opt;
              let style = 'border hover:bg-blue-50';
              if (answered) {
                if (letter === question.correct_option) style = 'border-green-500 bg-green-50';
                else if (isSelected) style = 'border-red-500 bg-red-50';
                else style = 'border opacity-50';
              }
              return (
                <button key={i} disabled={answered} aria-pressed={isSelected} onClick={() => pickOption(opt)} className={`min-h-12 rounded-xl p-4 text-left transition-colors ${style}`}>
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`mt-6 p-4 rounded-xl flex gap-3 ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {isCorrect ? <CheckCircle2 className="shrink-0" /> : <XCircle className="shrink-0" />}
              <div>
                <p className="font-bold">{isCorrect ? 'Certo!' : 'Não foi dessa vez.'}</p>
                {question.explanation && <p className="text-sm mt-1">{question.explanation}</p>}
              </div>
            </div>
          )}

          {answered && (
            <Button onClick={next} loading={submitting} className="mt-6 w-full" size="lg">
              {submitting ? 'Salvando...' : index < questions.length - 1 ? 'Próxima' : 'Finalizar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
