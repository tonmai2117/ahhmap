import type { IncomingMessage, ServerResponse } from 'node:http';

type FetchImpl = typeof fetch;

export type WeatherTileMiddlewareOptions = {
  apiKey?: string;
  fetchImpl?: FetchImpl;
};

type WeatherTileResult = {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
};

const TILE_PATH = /^\/api\/weather-tiles\/(\d+)\/(\d+)\/(\d+)$/;
const MAX_ZOOM = 18;

function jsonError(status: number, code: string): WeatherTileResult {
  return {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ ok: false, code }),
  };
}

export function createWeatherTileHandler(options: WeatherTileMiddlewareOptions = {}) {
  const apiKey = options.apiKey?.trim() || '';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  async function handleRequest(reqUrl: string, method: string): Promise<WeatherTileResult> {
    if (method !== 'GET') return jsonError(405, 'METHOD_NOT_ALLOWED');

    const pathname = new URL(reqUrl, 'http://localhost').pathname;
    const match = TILE_PATH.exec(pathname);
    if (!match) return jsonError(400, 'BAD_TILE_COORDINATES');

    const z = Number(match[1]);
    const x = Number(match[2]);
    const y = Number(match[3]);
    const tileCount = 2 ** z;
    if (
      !Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) ||
      z < 0 || z > MAX_ZOOM || x < 0 || y < 0 || x >= tileCount || y >= tileCount
    ) {
      return jsonError(400, 'BAD_TILE_COORDINATES');
    }

    if (!apiKey) return jsonError(503, 'WEATHER_NOT_CONFIGURED');

    const upstreamUrl = new URL(`https://tile.openweathermap.org/map/precipitation_new/${z}/${x}/${y}.png`);
    upstreamUrl.searchParams.set('appid', apiKey);

    try {
      const response = await fetchImpl(upstreamUrl.toString(), { method: 'GET' });
      if (response.status === 401 || response.status === 403) return jsonError(401, 'WEATHER_AUTH');
      if (response.status === 429) return jsonError(429, 'WEATHER_RATE_LIMITED');
      if (!response.ok) return jsonError(502, 'WEATHER_TILE_UNAVAILABLE');

      const body = new Uint8Array(await response.arrayBuffer());
      return {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=300',
        },
        body,
      };
    } catch {
      return jsonError(502, 'WEATHER_TILE_UNAVAILABLE');
    }
  }

  return { handleRequest };
}

export function createWeatherTileMiddleware(options: WeatherTileMiddlewareOptions = {}) {
  const handler = createWeatherTileHandler(options);

  return function weatherTileMiddleware(req: IncomingMessage, res: ServerResponse, next?: () => void) {
    const pathname = new URL(req.url || '', 'http://localhost').pathname;
    if (!pathname.startsWith('/api/weather-tiles/')) {
      next?.();
      return;
    }

    handler.handleRequest(req.url || '', req.method || 'GET').then(({ status, headers, body }) => {
      res.statusCode = status;
      for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
      res.end(body);
    }).catch(() => {
      const fallback = jsonError(500, 'WEATHER_TILE_UNAVAILABLE');
      res.statusCode = fallback.status;
      for (const [key, value] of Object.entries(fallback.headers)) res.setHeader(key, value);
      res.end(fallback.body);
    });
  };
}
