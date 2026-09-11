/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';
import { createWeatherHandler } from '../../server/weatherMiddleware';

describe('weatherMiddleware server handler', () => {
  const fakeApiKey = 'test-only-not-a-real-key';

  it('rejects non-GET requests with 405 Method Not Allowed', async () => {
    const handlerObj = createWeatherHandler({ apiKey: fakeApiKey });
    const res = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'POST');

    expect(res.status).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(res.body).toEqual({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  });

  it('validates lat and lon coordinates and returns 400 for invalid values', async () => {
    const mockFetch = vi.fn();
    const handlerObj = createWeatherHandler({ apiKey: fakeApiKey, fetchImpl: mockFetch as any });

    // Missing params
    let res = await handlerObj.handleRequest('/api/weather', 'GET');
    expect(res.status).toBe(400);

    // Empty params
    res = await handlerObj.handleRequest('/api/weather?lat=&lon=100.52', 'GET');
    expect(res.status).toBe(400);

    // Invalid numbers or out of range
    res = await handlerObj.handleRequest('/api/weather?lat=100&lon=100.52', 'GET');
    expect(res.status).toBe(400);

    res = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=abc', 'GET');
    expect(res.status).toBe(400);

    // Verify mockFetch was NEVER called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 503 WEATHER_NOT_CONFIGURED when API key is missing', async () => {
    const mockFetch = vi.fn();
    const handlerObj = createWeatherHandler({ apiKey: '', fetchImpl: mockFetch as any });

    const res = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'GET');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, code: 'WEATHER_NOT_CONFIGURED' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles valid upstream response and caches within 15 minutes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        dt: 1700000000,
        weather: [{ id: 500, main: 'Rain', icon: '10d' }],
        clouds: { all: 80 },
        rain: { '1h': 0.5 },
      }),
    });

    let currentTime = 1700000000000;
    const handlerObj = createWeatherHandler({
      apiKey: fakeApiKey,
      fetchImpl: mockFetch as any,
      now: () => currentTime,
    });

    // 1st request
    const res1 = await handlerObj.handleRequest('/api/weather?lat=13.7466&lon=100.5285', 'GET');
    expect(res1.status).toBe(200);
    expect(res1.body.ok).toBe(true);
    if (res1.body.ok) {
      expect(res1.body.data.kind).toBe('rain');
      expect(res1.body.data.cloudPercent).toBe(80);
      expect(res1.body.data.stale).toBe(false);
      // Key is NOT exposed in data DTO
      expect((res1.body.data as any).apiKey).toBeUndefined();
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 2nd request within 15 minutes (same grid) -> served from cache
    currentTime += 5 * 60 * 1000; // 5 mins later
    const res2 = await handlerObj.handleRequest('/api/weather?lat=13.7411&lon=100.5299', 'GET');
    expect(res2.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No new upstream call!
  });

  it('deduplicates concurrent upstream requests for the same area grid', async () => {
    let fetchResolve: any;
    const fetchPromise = new Promise((resolve) => {
      fetchResolve = resolve;
    });

    const mockFetch = vi.fn().mockImplementation(() => fetchPromise);

    const handlerObj = createWeatherHandler({
      apiKey: fakeApiKey,
      fetchImpl: mockFetch as any,
    });

    // Launch two requests concurrently
    const p1 = handlerObj.handleRequest('/api/weather?lat=13.7466&lon=100.5285', 'GET');
    const p2 = handlerObj.handleRequest('/api/weather?lat=13.7411&lon=100.5299', 'GET');

    // Resolve upstream fetch
    fetchResolve({
      ok: true,
      status: 200,
      json: async () => ({
        dt: 1700000000,
        weather: [{ id: 800, main: 'Clear', icon: '01d' }],
      }),
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Exactly 1 upstream call
  });

  it('handles 401/403 upstream auth errors safely without leaking keys', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const handlerObj = createWeatherHandler({
      apiKey: fakeApiKey,
      fetchImpl: mockFetch as any,
    });

    const res = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'GET');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, code: 'WEATHER_AUTH' });

    // Subsequent call should be blocked immediately without trying upstream again
    const res2 = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'GET');
    expect(res2.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles 429 upstream rate limit with Retry-After', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Map([['Retry-After', '60']]),
    });

    const handlerObj = createWeatherHandler({
      apiKey: fakeApiKey,
      fetchImpl: mockFetch as any,
    });

    const res = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'GET');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ ok: false, code: 'WEATHER_RATE_LIMITED', retryAfterSeconds: 60 });
  });

  it('returns stale cache up to 60 minutes if upstream fails', async () => {
    let currentTime = 1700000000000;
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          dt: 1700000000,
          weather: [{ id: 804, main: 'Clouds', icon: '04d' }],
        }),
      })
      .mockRejectedValueOnce(new Error('Network offline'));

    const handlerObj = createWeatherHandler({
      apiKey: fakeApiKey,
      fetchImpl: mockFetch as any,
      now: () => currentTime,
    });

    // 1. Initial success
    await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'GET');

    // 2. 20 minutes later (cache expired >15m), fetch fails
    currentTime += 20 * 60 * 1000;
    const res = await handlerObj.handleRequest('/api/weather?lat=13.74&lon=100.52', 'GET');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    if (res.body.ok) {
      expect(res.body.data.stale).toBe(true);
      expect(res.body.data.kind).toBe('cloudy');
    }
  });
});
