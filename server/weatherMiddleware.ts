import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  WEATHER_MAX_STALE_MS,
  WEATHER_MIN_SPACING_MS,
  WEATHER_REFRESH_MS,
  WEATHER_SERVER_CACHE_SIZE,
  WEATHER_UPSTREAM_TIMEOUT_MS,
  WeatherData,
  WeatherResponse,
  getAreaKey,
  isValidCoordinate,
  parseOpenWeatherResponse,
  snapCoordinate,
} from '../src/weather/weatherDomain.js';

type FetchImpl = typeof fetch;

export type WeatherMiddlewareOptions = {
  apiKey?: string;
  fetchImpl?: FetchImpl;
  now?: () => number;
};

type CacheEntry = {
  data: WeatherData;
  fetchedAt: number;
};

class LRUCache<K, V> {
  private max: number;
  private items = new Map<K, V>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: K): V | undefined {
    const item = this.items.get(key);
    if (item !== undefined) {
      // Refresh key position for LRU
      this.items.delete(key);
      this.items.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    if (this.items.has(key)) {
      this.items.delete(key);
    } else if (this.items.size >= this.max) {
      // Evict oldest item
      const oldestKey = this.items.keys().next().value;
      if (oldestKey !== undefined) {
        this.items.delete(oldestKey);
      }
    }
    this.items.set(key, value);
  }

  clear(): void {
    this.items.clear();
  }
}

export function createWeatherHandler(options: WeatherMiddlewareOptions = {}) {
  const { apiKey: rawApiKey, fetchImpl = globalThis.fetch, now = Date.now } = options;
  const apiKey = rawApiKey?.trim() || '';

  const cache = new LRUCache<string, CacheEntry>(WEATHER_SERVER_CACHE_SIZE);
  const inFlightPromises = new Map<string, Promise<WeatherResponse>>();

  let globalCooldownUntil = 0;
  let authFailed = false;
  let lastUpstreamTime = 0;

  function parseRetryAfter(headerValue: string | null): number {
    if (!headerValue) return 15 * 60; // default 15 minutes in seconds
    const seconds = parseInt(headerValue, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds;
    }
    // Check if it's HTTP date
    const dateMs = Date.parse(headerValue);
    if (!isNaN(dateMs)) {
      const diffSec = Math.ceil((dateMs - now()) / 1000);
      return diffSec > 0 ? diffSec : 15 * 60;
    }
    return 15 * 60;
  }

  async function handleRequest(reqUrl: string, method: string): Promise<{ status: number; body: WeatherResponse; headers: Record<string, string> }> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    };

    if (method !== 'GET') {
      return {
        status: 405,
        headers: { ...defaultHeaders, Allow: 'GET' },
        body: { ok: false, code: 'METHOD_NOT_ALLOWED' },
      };
    }

    // Parse lat and lon from URL
    const urlObj = new URL(reqUrl, 'http://localhost');
    const rawLat = urlObj.searchParams.get('lat');
    const rawLon = urlObj.searchParams.get('lon');

    if (rawLat === null || rawLon === null || rawLat.trim() === '' || rawLon.trim() === '') {
      return {
        status: 400,
        headers: defaultHeaders,
        body: { ok: false, code: 'BAD_REQUEST' },
      };
    }

    const lat = Number(rawLat);
    const lon = Number(rawLon);

    if (!isValidCoordinate(lat, lon)) {
      return {
        status: 400,
        headers: defaultHeaders,
        body: { ok: false, code: 'BAD_REQUEST' },
      };
    }

    if (!apiKey) {
      return {
        status: 503,
        headers: defaultHeaders,
        body: { ok: false, code: 'WEATHER_NOT_CONFIGURED' },
      };
    }

    if (authFailed) {
      return {
        status: 401,
        headers: defaultHeaders,
        body: { ok: false, code: 'WEATHER_AUTH' },
      };
    }

    const nowMs = now();
    const areaKey = getAreaKey(lat, lon);

    // 1. Check valid fresh cache (within 15 mins)
    const cached = cache.get(areaKey);
    if (cached && nowMs - cached.fetchedAt < WEATHER_REFRESH_MS) {
      return {
        status: 200,
        headers: defaultHeaders,
        body: { ok: true, data: { ...cached.data, stale: false } },
      };
    }

    // 2. Check global cooldown (e.g. from 429)
    if (nowMs < globalCooldownUntil) {
      const retryAfterSeconds = Math.ceil((globalCooldownUntil - nowMs) / 1000);
      return {
        status: 429,
        headers: defaultHeaders,
        body: { ok: false, code: 'WEATHER_RATE_LIMITED', retryAfterSeconds },
      };
    }

    // 3. Check in-flight promise for this areaKey
    const pendingPromise = inFlightPromises.get(areaKey);
    if (pendingPromise) {
      const res = await pendingPromise;
      return { status: res.ok ? 200 : 503, headers: defaultHeaders, body: res };
    }

    // 4. Check minimum process spacing (2 seconds between upstream calls)
    const timeSinceLastCall = nowMs - lastUpstreamTime;
    if (lastUpstreamTime > 0 && timeSinceLastCall < WEATHER_MIN_SPACING_MS) {
      const retryAfterSeconds = Math.ceil((WEATHER_MIN_SPACING_MS - timeSinceLastCall) / 1000);
      return {
        status: 429,
        headers: defaultHeaders,
        body: { ok: false, code: 'WEATHER_RATE_LIMITED', retryAfterSeconds },
      };
    }

    // 5. Execute upstream call with deduplication wrapper
    const fetchPromise = (async (): Promise<WeatherResponse> => {
      lastUpstreamTime = now();
      const snappedLat = snapCoordinate(lat);
      const snappedLon = snapCoordinate(lon);

      const upstreamUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
      upstreamUrl.searchParams.set('lat', String(snappedLat));
      upstreamUrl.searchParams.set('lon', String(snappedLon));
      upstreamUrl.searchParams.set('units', 'metric');
      upstreamUrl.searchParams.set('appid', apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEATHER_UPSTREAM_TIMEOUT_MS);

      try {
        const res = await fetchImpl(upstreamUrl.toString(), {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 401 || res.status === 403) {
          authFailed = true;
          return { ok: false, code: 'WEATHER_AUTH' };
        }

        if (res.status === 429) {
          const retryAfterSec = parseRetryAfter(res.headers.get('Retry-After'));
          globalCooldownUntil = now() + retryAfterSec * 1000;
          return { ok: false, code: 'WEATHER_RATE_LIMITED', retryAfterSeconds: retryAfterSec };
        }

        if (!res.ok) {
          throw new Error(`Upstream returned HTTP ${res.status}`);
        }

        const rawJson = await res.json();
        const parsedData = parseOpenWeatherResponse(rawJson, lat, lon, now());

        // Cache successful response
        cache.set(areaKey, { data: parsedData, fetchedAt: now() });

        return { ok: true, data: parsedData };
      } catch (err: any) {
        clearTimeout(timeoutId);

        // Fallback: check if we have stale cache within 60 minutes
        const existingStale = cache.get(areaKey);
        if (existingStale && now() - existingStale.fetchedAt < WEATHER_MAX_STALE_MS) {
          return {
            ok: true,
            data: { ...existingStale.data, stale: true },
          };
        }

        return { ok: false, code: 'WEATHER_UNAVAILABLE' };
      }
    })();

    inFlightPromises.set(areaKey, fetchPromise);

    try {
      const response = await fetchPromise;
      let statusCode = 200;
      if (!response.ok) {
        if (response.code === 'WEATHER_AUTH') statusCode = 401;
        else if (response.code === 'WEATHER_RATE_LIMITED') statusCode = 429;
        else statusCode = 503;
      }
      return { status: statusCode, headers: defaultHeaders, body: response };
    } finally {
      inFlightPromises.delete(areaKey);
    }
  }

  return { handleRequest, cache, resetState: () => { cache.clear(); authFailed = false; globalCooldownUntil = 0; lastUpstreamTime = 0; } };
}

export function createWeatherMiddleware(options: WeatherMiddlewareOptions = {}) {
  const handler = createWeatherHandler(options);

  return function weatherMiddleware(req: IncomingMessage, res: ServerResponse, next?: () => void) {
    const reqUrl = req.url || '';
    const parsedUrl = new URL(reqUrl, 'http://localhost');

    // Intercept exact pathname /api/weather
    if (parsedUrl.pathname !== '/api/weather') {
      if (next) next();
      return;
    }

    handler
      .handleRequest(reqUrl, req.method || 'GET')
      .then(({ status, headers, body }) => {
        res.statusCode = status;
        for (const [key, value] of Object.entries(headers)) {
          res.setHeader(key, value);
        }
        res.end(JSON.stringify(body));
      })
      .catch(() => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, code: 'WEATHER_UNAVAILABLE' }));
      });
  };
}
