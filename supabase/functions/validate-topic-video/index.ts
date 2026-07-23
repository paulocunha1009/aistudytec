import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const tokens = (value: string) => new Set(
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .match(/[a-z0-9]+/g)?.filter(token => token.length > 2) || [],
);
const videoIdFromUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
    }
  } catch (_) {
    return null;
  }
  return null;
};
const durationSeconds = (value: string) => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || '');
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Sessão obrigatória' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json({ error: 'Sessão inválida' }, 401);

    const { topicId, level, youtubeUrl } = await req.json();
    if (!['simple', 'technical', 'advanced'].includes(level)) return json({ error: 'Nível inválido' }, 400);
    const videoId = videoIdFromUrl(youtubeUrl);
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json({ error: 'Link do YouTube inválido' }, 400);

    const { data: topic, error: topicError } = await userClient.from('topics')
      .select('id, class_id, title').eq('id', topicId).single();
    if (topicError || !topic) return json({ error: 'Tópico não encontrado' }, 404);
    const { data: canManage } = await userClient.rpc('can_manage_class', { target_class_id: topic.class_id });
    if (!canManage) return json({ error: 'Sem permissão para revisar este tópico' }, 403);

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&part=snippet,contentDetails,statistics,status&id=${videoId}`);
    if (!response.ok) throw new Error('YouTube indisponível');
    const item = (await response.json()).items?.[0];
    if (!item || item.status?.privacyStatus !== 'public' || item.status?.embeddable === false) {
      return json({ error: 'O vídeo não está público e disponível para incorporação' }, 400);
    }
    const duration = durationSeconds(item.contentDetails?.duration);
    if (duration < 180 || duration > 1200) return json({ error: 'Escolha um vídeo entre 3 e 20 minutos' }, 400);
    const topicTokens = tokens(topic.title);
    const videoTokens = tokens(`${item.snippet.title} ${item.snippet.description || ''}`);
    const overlap = [...topicTokens].filter(token => videoTokens.has(token)).length;
    if (overlap === 0) return json({ error: 'O vídeo não apresenta relação textual suficiente com o tópico' }, 400);

    const video = {
      level,
      youtubeVideoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      durationSeconds: duration,
      viewCount: Number(item.statistics?.viewCount || 0),
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
      rankScore: overlap * 1000,
    };
    const { data, error } = await admin.rpc('store_validated_topic_video', {
      p_topic_id: topicId,
      p_video: video,
    });
    if (error) throw error;
    return json({ video: data });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Falha ao validar vídeo' }, 500);
  }
});
