import os
import re
import math
import unicodedata
import requests

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

LEVEL_KEYWORDS = {
    'simple': 'explicação simples resumo',
    'technical': 'aula completa explicação',
    'advanced': 'aprofundado avançado aplicações',
}

MIN_DURATION_SECONDS = 3 * 60
MAX_DURATION_SECONDS = 20 * 60
SWEET_SPOT_SECONDS = 8 * 60

_DURATION_RE = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
_STOPWORDS = {'a', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'o', 'os', 'que', 'um', 'uma', 'como', 'para', 'por', 'qual', 'quais', 'é'}


def _tokens(value):
    normalized = unicodedata.normalize('NFKD', (value or '').lower()).encode('ascii', 'ignore').decode('ascii')
    return {token for token in re.findall(r'[a-z0-9]+', normalized) if len(token) > 2 and token not in _STOPWORDS}

def _parse_iso8601_duration(duration):
    m = _DURATION_RE.fullmatch(duration or '')
    if not m or not any(m.groups()):
        return 0
    h, mnt, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mnt * 60 + s

def search_videos_for_level(topic_title, level, max_results=10):
    api_key = os.environ.get('YOUTUBE_API_KEY')
    if not api_key:
        return []

    query = f"{topic_title} {LEVEL_KEYWORDS.get(level, '')} ensino médio"
    search_resp = requests.get(SEARCH_URL, params={
        'key': api_key, 'part': 'snippet', 'type': 'video', 'q': query,
        'relevanceLanguage': 'pt', 'safeSearch': 'strict', 'maxResults': max_results,
    }, timeout=30)
    search_resp.raise_for_status()
    items = search_resp.json().get('items', [])
    video_ids = [it['id']['videoId'] for it in items if it.get('id', {}).get('videoId')]
    search_position = {video_id: index for index, video_id in enumerate(video_ids)}
    topic_tokens = _tokens(topic_title)
    if not video_ids:
        return []

    details_resp = requests.get(VIDEOS_URL, params={
        'key': api_key, 'part': 'contentDetails,statistics,snippet', 'id': ','.join(video_ids),
    }, timeout=30)
    details_resp.raise_for_status()
    details = details_resp.json().get('items', [])

    candidates = []
    for d in details:
        duration = _parse_iso8601_duration(d.get('contentDetails', {}).get('duration'))
        if duration < MIN_DURATION_SECONDS or duration > MAX_DURATION_SECONDS:
            continue
        view_count = int(d.get('statistics', {}).get('viewCount', 0))
        snippet = d.get('snippet', {})
        title_tokens = _tokens(snippet.get('title', ''))
        overlap = len(topic_tokens & title_tokens)
        if topic_tokens and overlap == 0:
            continue
        penalty = abs(duration - SWEET_SPOT_SECONDS)
        relevance_score = max_results - search_position.get(d['id'], max_results)
        rank_score = (relevance_score * 100) + (overlap * 80) + (math.log10(view_count + 1) * 8) - (penalty / 60)
        candidates.append({
            'youtube_video_id': d['id'],
            'title': snippet['title'],
            'channel_title': snippet['channelTitle'],
            'duration_seconds': duration,
            'view_count': view_count,
            'thumbnail_url': snippet.get('thumbnails', {}).get('medium', {}).get('url'),
            'rank_score': rank_score,
        })

    candidates.sort(key=lambda c: c['rank_score'], reverse=True)
    return candidates[:3]
