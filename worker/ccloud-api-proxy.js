const API_KEY = '4F5A9C3D9A86FA54EACEDDD635185';
const UPSTREAMS = [
  'https://server-hi-speed-iran.info',
  'https://hostinnegar.com',
  'https://windowsdiba.info'
];
const ALLOWED_ORIGINS = new Set([
  'https://azer1la.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function isAllowedApiPath(path) {
  const key = API_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const routes = [
    new RegExp(`^/api/genre/all/${key}/?$`),
    new RegExp(`^/api/(?:movie|serie)/by/filtres/\\d+/(?:created|year|imdb)/\\d+/${key}/?$`),
    new RegExp(`^/api/search/[^/]+/${key}/?$`),
    new RegExp(`^/api/season/by/serie/\\d+/${key}/?$`)
  ];
  return routes.some((route) => route.test(path));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return new Response('Origin not allowed', { status: 403 });
    }
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }
    if (!isAllowedApiPath(url.pathname)) {
      return jsonResponse({ error: 'API route not allowed' }, 404, origin);
    }

    let lastFailure = 'No upstream returned JSON';
    for (const upstream of UPSTREAMS) {
      try {
        const response = await fetch(`${upstream}${url.pathname}${url.search}`, {
          headers: { Accept: 'application/json' },
          redirect: 'follow'
        });
        if (!response.ok) {
          lastFailure = `Upstream returned HTTP ${response.status}`;
          continue;
        }
        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          lastFailure = `Upstream returned ${contentType || 'an unknown content type'}, not JSON`;
          continue;
        }
        const body = await response.text();
        try {
          JSON.parse(body);
        } catch {
          lastFailure = 'Upstream response was not valid JSON';
          continue;
        }
        return new Response(body, {
          status: 200,
          headers: {
            ...cors,
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : 'Upstream request failed';
      }
    }
    return jsonResponse({ error: 'All CCloud API hosts failed', detail: lastFailure }, 502, origin);
  }
};
