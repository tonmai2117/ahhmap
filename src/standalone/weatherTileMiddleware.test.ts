/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';
import { createWeatherTileHandler } from '../../server/weatherTileMiddleware';

describe('weather precipitation tile proxy', () => {
  const fakeApiKey = 'test-only-not-a-real-key';

  it('proxies a valid precipitation tile without exposing the API key', async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => png.buffer,
    });
    const handler = createWeatherTileHandler({ apiKey: fakeApiKey, fetchImpl: mockFetch });

    const result = await handler.handleRequest('/api/weather-tile?z=10&x=799&y=471', 'GET');

    expect(result.status).toBe(200);
    expect(result.headers['Content-Type']).toBe('image/png');
    expect(result.body).toEqual(png);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://tile.openweathermap.org/map/precipitation_new/10/799/471.png?appid=${fakeApiKey}`,
      { method: 'GET' },
    );
    expect(JSON.stringify(result)).not.toContain(fakeApiKey);
  });

  it('rejects invalid coordinates before calling upstream', async () => {
    const mockFetch = vi.fn();
    const handler = createWeatherTileHandler({ apiKey: fakeApiKey, fetchImpl: mockFetch });

    const result = await handler.handleRequest('/api/weather-tile?z=10&x=1024&y=0', 'GET');

    expect(result.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requires server-side configuration and forwards safe auth errors', async () => {
    const noKey = createWeatherTileHandler({ apiKey: '', fetchImpl: vi.fn() });
    expect((await noKey.handleRequest('/api/weather-tile?z=1&x=1&y=1', 'GET')).status).toBe(503);

    const authFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const auth = createWeatherTileHandler({ apiKey: fakeApiKey, fetchImpl: authFetch });
    const result = await auth.handleRequest('/api/weather-tile?z=1&x=1&y=1', 'GET');
    expect(result.status).toBe(401);
    expect(result.body).toBe(JSON.stringify({ ok: false, code: 'WEATHER_AUTH' }));
  });
});
