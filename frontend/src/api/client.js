const request = async (apiUrl, path, options = {}) => {
  const controller = new AbortController();
  const { timeoutMs = 30000, ...fetchOptions } = options;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      ...fetchOptions,
      credentials: 'include',
      signal: fetchOptions.signal || controller.signal,
      headers: { 'Content-Type': 'application/json', ...(fetchOptions.headers || {}) },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('A solicitação demorou demais. Tente novamente.');
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || data.error || 'Erro na requisição');
    err.code = data.error?.code;
    err.missing = data.missing;
    throw err;
  }
  return data;
};

const buildQuery = (params) => {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const api = {
  login: (apiUrl, body) => request(apiUrl, '/api/login', { method: 'POST', body: JSON.stringify(body) }),
  session: (apiUrl) => request(apiUrl, '/api/session'),
  logout: (apiUrl) => request(apiUrl, '/api/logout', { method: 'POST' }),
  register: (apiUrl, body) => request(apiUrl, '/api/register', { method: 'POST', body: JSON.stringify(body) }),
  joinClass: (apiUrl, code) => request(apiUrl, '/api/join-class', { method: 'POST', body: JSON.stringify({ code }) }),

  createClass: (apiUrl, body) => request(apiUrl, '/api/classes', { method: 'POST', body: JSON.stringify(body) }),
  listClasses: (apiUrl, teacherId) => request(apiUrl, `/api/classes${buildQuery({ teacherId })}`),
  classStudents: (apiUrl, classId) => request(apiUrl, `/api/classes/${classId}/students`),

  listTopics: (apiUrl, params) => request(apiUrl, `/api/topics${buildQuery(params)}`),
  createTopic: (apiUrl, body) => request(apiUrl, '/api/topics', { method: 'POST', body: JSON.stringify(body) }),
  getTopic: (apiUrl, id) => request(apiUrl, `/api/topics/${id}`),
  updateTopic: (apiUrl, id, body) => request(apiUrl, `/api/topics/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  generateTopic: (apiUrl, id) => request(apiUrl, `/api/topics/${id}/generate`, { method: 'POST', timeoutMs: 180000 }),
  regenerateTopic: (apiUrl, id, part) => request(apiUrl, `/api/topics/${id}/regenerate${buildQuery({ part })}`, { method: 'POST', timeoutMs: 180000 }),
  updateExplanation: (apiUrl, id, level, content) =>
    request(apiUrl, `/api/topics/${id}/explanations/${level}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  updateQuestion: (apiUrl, id, qid, body) =>
    request(apiUrl, `/api/topics/${id}/questions/${qid}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteQuestion: (apiUrl, id, qid) => request(apiUrl, `/api/topics/${id}/questions/${qid}`, { method: 'DELETE' }),
  approveVideo: (apiUrl, id, vid, approved) =>
    request(apiUrl, `/api/topics/${id}/videos/${vid}`, { method: 'PATCH', body: JSON.stringify({ approved }) }),
  publishTopic: (apiUrl, id) => request(apiUrl, `/api/topics/${id}/publish`, { method: 'POST' }),
  freetextTopic: (apiUrl, body) => request(apiUrl, '/api/topics/freetext', { method: 'POST', body: JSON.stringify(body), timeoutMs: 180000 }),
  createGenerationJob: (apiUrl, body, idempotencyKey) => request(apiUrl, '/api/generation-jobs', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': idempotencyKey },
  }),
  generationJob: (apiUrl, id) => request(apiUrl, `/api/generation-jobs/${id}`),

  submitQuizAttempt: (apiUrl, body) => request(apiUrl, '/api/quiz-attempts', { method: 'POST', body: JSON.stringify(body) }),

  skillMastery: (apiUrl, userId) => request(apiUrl, `/api/skill-mastery${buildQuery({ userId })}`),
  reviewQueue: (apiUrl, userId, dueOnly) =>
    request(apiUrl, `/api/review-queue${buildQuery({ userId, due: dueOnly ? 'today' : undefined })}`),
  history: (apiUrl, params) => request(apiUrl, `/api/history${buildQuery(params)}`),
  classDashboard: (apiUrl, classId) => request(apiUrl, `/api/dashboard/class/${classId}`),
};
