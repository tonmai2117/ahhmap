import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeather } from '../hooks/useWeather.js';
import { fetchWeather, resetWeatherClientCache } from '../weather/weatherClient.js';

describe('weatherClient and useWeather hook', () => {
  beforeEach(() => {
    resetWeatherClientCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches weather for initial position and caches results', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          source: 'openweather',
          areaKey: '13.74,100.52',
          lat: 13.7466,
          lon: 100.5285,
          observedAt: Date.now(),
          fetchedAt: Date.now(),
          conditionIds: [800],
          kind: 'clear',
          label: 'ท้องฟ้าโปร่ง',
          cloudPercent: 0,
          rainMmPerHour: null,
          isDay: true,
          stale: false,
        },
      }),
    });

    const res1 = await fetchWeather(13.7466, 100.5285, mockFetch as any);
    expect(res1.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 2nd fetch for same area grid uses client cache
    const res2 = await fetchWeather(13.7411, 100.5299, mockFetch as any);
    expect(res2.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not issue network requests when fixture param is active in demo mode', async () => {
    const mockFetch = vi.fn();
    (globalThis as any).fetch = mockFetch;

    const pos = { lat: 13.7466, lng: 100.5285 };
    const { result } = renderHook(() => useWeather(pos, 'thunderstorm', true));

    expect(result.current.weather).not.toBeNull();
    expect(result.current.weather?.kind).toBe('thunderstorm');
    expect(result.current.weather?.source).toBe('demo');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('ignores fixture param when demo=false (isDemo=false)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          source: 'openweather',
          areaKey: '13.74,100.52',
          lat: 13.7466,
          lon: 100.5285,
          observedAt: Date.now(),
          fetchedAt: Date.now(),
          conditionIds: [800],
          kind: 'clear',
          label: 'ท้องฟ้าโปร่ง',
          cloudPercent: 0,
          rainMmPerHour: null,
          isDay: true,
          stale: false,
        },
      }),
    });
    (globalThis as any).fetch = mockFetch;

    const pos = { lat: 13.7466, lng: 100.5285 };
    // demo is false, weather query is heavy-rain -> should fetch live weather
    renderHook(() => useWeather(pos, 'heavy-rain', false));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/weather?lat=13.7466&lon=100.5285',
      expect.anything()
    );
  });
});
