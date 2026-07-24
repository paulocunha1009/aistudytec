import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const levels = ['simple', 'technical', 'advanced'];
const trustedSource = (domain: string) => /(^|\.)(gov\.br|edu\.br|usp\.br|unicamp\.br|ufsc\.br|ufrj\.br|ufmg\.br|rnp\.br|fiocruz\.br|ibm\.com|microsoft\.com|mozilla\.org|w3\.org|ieee\.org|acm\.org|nature\.com|science\.org|reuters\.com|bbc\.com|bbc\.co\.uk|apnews\.com|nytimes\.com|theguardian\.com|folha\.uol\.com\.br|estadao\.com\.br|oglobo\.globo\.com)$/.test(domain);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const geminiRequest = async (apiKey: string, body: unknown) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!response.ok) throw new Error(`Gemini respondeu ${response.status}`);
  return response.json();
};

const parseDuration = (value: string) => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || '');
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
};

const tokens = (value: string) => new Set(
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(token => token.length > 2 && !['para', 'como', 'uma', 'das', 'dos', 'que', 'curso', 'aula'].includes(token)) || [],
);

const institutionalChannel = (value: string) =>
  /(universidade|instituto federal|uf[a-z]{2,}|if[a-z]{2,}|nic\.?br|cert\.?br|anpd|gov\.?br|senai|senac|fundação|fundacao|fiocruz|rnp|canal oficial)/i
    .test(value || '');

const youtubeVideos = async (apiKey: string | undefined, title: string, descriptorText = '') => {
  if (!apiKey) return [];
  const output: Record<string, unknown>[] = [];
  const topicTokens = tokens(`${title} ${descriptorText}`);
  const queryFocus: Record<string, string[]> = {
    simple: ['hardware componentes segurança digital explicação português'],
    technical: ['arquitetura de computadores segurança da informação aula português'],
    advanced: [
      'segurança da informação LGPD universidade federal aula',
      'segurança digital instituto federal aula',
      'CERT.br segurança da informação',
      'NIC.br segurança digital',
    ],
  };
  for (const level of levels) {
    const usedVideoIds = new Set<string>();
    const searches = await Promise.all(queryFocus[level].map(async focus => {
      const queryText = level === 'advanced' ? focus : `${title} ${focus}`;
      const query = encodeURIComponent(queryText);
      return fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=video&safeSearch=strict&relevanceLanguage=pt&regionCode=BR&videoEmbeddable=true&maxResults=20&q=${query}`).then(r => r.json());
    }));
    const ids = [...new Set(searches.flatMap(search =>
      (search.items || []).map((item: any) => item.id?.videoId).filter(Boolean)
    ))];
    if (!ids.length) continue;
    const idChunks = Array.from({ length: Math.ceil(ids.length / 50) }, (_, index) =>
      ids.slice(index * 50, index * 50 + 50)
    );
    const detailResponses = await Promise.all(idChunks.map(chunk =>
      fetch(`https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&part=snippet,contentDetails,statistics&id=${chunk.join(',')}`).then(r => r.json())
    ));
    const ranked = [];
    for (const item of detailResponses.flatMap(details => details.items || [])) {
      const duration = parseDuration(item.contentDetails?.duration);
      const maxDuration = level === 'advanced' ? 2700 : 1200;
      if (duration < 180 || duration > maxDuration) continue;
      if (usedVideoIds.has(item.id)) continue;
      const titleTokens = tokens(item.snippet.title);
      const overlap = [...topicTokens].filter(token => titleTokens.has(token)).length;
      if (overlap === 0) continue;
      const views = Number(item.statistics?.viewCount || 0);
      const searchPosition = Math.max(0, ids.indexOf(item.id));
      const institutionBoost = institutionalChannel(item.snippet.channelTitle) ? 700 : 0;
      if (level === 'advanced' && institutionBoost === 0) continue;
      const rankScore = overlap * 1000 + Math.log10(views + 1) * 45
        + institutionBoost - Math.abs(duration - 600) / 20 - searchPosition * 15;
      ranked.push({
        level,
        youtubeVideoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        durationSeconds: duration,
        viewCount: views,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url,
        rankScore,
      });
    }
    ranked.sort((left, right) => right.rankScore - left.rankScore);
    ranked.slice(0, 3).forEach((video, orderIndex) => {
      usedVideoIds.add(video.youtubeVideoId);
      output.push({ ...video, orderIndex });
    });
  }
  return output;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Sessão obrigatória' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) return json({ error: 'Gemini não configurado no servidor' }, 503);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, serviceKey);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Sessão inválida' }, 401);

    const { topicId, part = 'all' } = await req.json();
    if (!['all', 'explanations', 'questions', 'videos'].includes(part)) {
      return json({ error: 'Parte de geração inválida' }, 400);
    }
    const { data: topic, error: topicError } = await userClient.from('topics').select(`
      id, class_id, title, target_grade,
      topic_curriculum_descriptors(
        curriculum_descriptors(code, description, curriculum_competencies(code, description))
      )
    `).eq('id', topicId).single();
    if (topicError || !topic) return json({ error: 'Tópico não encontrado' }, 404);
    const { data: canManage } = await userClient.rpc('can_manage_class', { target_class_id: topic.class_id });
    if (!canManage) return json({ error: 'Sem permissão para gerar este tópico' }, 403);

    const descriptors = (topic.topic_curriculum_descriptors || [])
      .map((link: any) => link.curriculum_descriptors).filter(Boolean);
    const descriptorText = descriptors.map((item: any) =>
      `${item.code}: ${item.description} | competência ${item.curriculum_competencies?.code}: ${item.curriculum_competencies?.description}`
    ).join('\n');

    if (part === 'videos') {
      const videos = await youtubeVideos(Deno.env.get('YOUTUBE_API_KEY'), topic.title, descriptorText);
      if (!videos.length) throw new Error('Nenhum vídeo institucional incorporável foi encontrado');
      const { data: insertedCount, error: replaceError } = await admin
        .rpc('replace_topic_video_candidates', {
          p_topic_id: topicId,
          p_requested_by: authData.user.id,
          p_videos: videos,
        });
      if (replaceError) throw replaceError;
      return json({
        status: 'generated',
        part: 'videos',
        videoCount: insertedCount || 0,
      });
    }

    const research = await geminiRequest(geminiKey, {
      contents: [{ parts: [{ text: `Pesquise evidências verificáveis para produzir material didático sobre "${topic.title}", alinhado aos descritores abaixo.\n${descriptorText}\nPriorize universidades, institutos federais, órgãos públicos, documentação técnica primária e jornalismo de grande prestígio. Não invente fatos, números ou referências. Produza uma síntese factual em português.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 5000 },
    });
    const candidate = research.candidates?.[0];
    const researchText = candidate?.content?.parts?.map((part: any) => part.text || '').join('\n') || '';
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.map((chunk: any) => chunk.web).filter(Boolean).map((web: any) => {
      const parsed = new URL(web.uri);
      const title = web.title || parsed.hostname;
      const domain = String(title).trim().toLowerCase().replace(/^www\./, '');
      return { title, url: web.uri, domain };
    }).filter((item: any) => trustedSource(item.domain))
      .filter((item: any, index: number, list: any[]) => list.findIndex(other => other.url === item.url) === index);
    if (sources.length < 2) {
      throw new Error('Pesquisa não retornou ao menos duas fontes institucionais confiáveis');
    }

    const contentResponse = await geminiRequest(geminiKey, {
      contents: [{ parts: [{ text: `Você é especialista em educação profissional brasileira. Gere SOMENTE JSON válido para o tópico "${topic.title}", ano ${topic.target_grade}.
Use exclusivamente a pesquisa fundamentada abaixo como base factual:
${researchText}

Descritores obrigatórios:
${descriptorText}

Estrutura:
{"explanations":{"simple":"mínimo 500 caracteres","technical":"mínimo 700 caracteres","advanced":"mínimo 900 caracteres"},"learningPaths":{"simple":{},"technical":{},"advanced":{}},"questions":[]}

Cada learningPath deve conter: hook (string), objectives (2-4 strings), keyIdeas (3-5 strings), realWorldConnection (string), guidedInvestigation {question, steps com 3 itens, searchTerms com 2-4 itens}, watchMission {before,during,after}, handsOnChallenge {title,instructions,deliverable}, reflectionQuestions (2-3 strings), discussionPrompt (string).
Gere exatamente 9 questões com question, options (4 alternativas), correctOption (A-D), explanation (feedback detalhado), skill, difficulty (facil|medio|dificil) e descriptorCode. Cada descriptorCode deve ser um dos códigos fornecidos. Distribua as questões entre os descritores. Não invente fontes, links ou estatísticas.` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.35, maxOutputTokens: 20000 },
    });
    const text = contentResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    const content = JSON.parse(text);
    if (!content.questions || content.questions.length !== 9) throw new Error('Gemini retornou quantidade inválida de questões');
    const allowedCodes = new Set(descriptors.map((item: any) => item.code));
    if (content.questions.some((item: any) => !allowedCodes.has(item.descriptorCode))) {
      throw new Error('Gemini retornou descritor fora do tópico');
    }

    const videos = await youtubeVideos(Deno.env.get('YOUTUBE_API_KEY'), topic.title, descriptorText);
    const { error: storeError } = await admin.rpc('store_generated_topic_content', {
      p_topic_id: topicId,
      p_payload: { ...content, sources, videos },
    });
    if (storeError) throw storeError;
    return json({ status: 'generated', sourceCount: sources.length, videoCount: videos.length });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error
      ? error.message
      : (error && typeof error === 'object' && 'message' in error)
        ? String(error.message)
        : 'Falha na geração';
    return json({ error: message }, 500);
  }
});
