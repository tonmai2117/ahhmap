import {
  WEATHER_REFRESH_MS,
  WeatherData,
  WeatherResponse,
  getAreaKey,
} from './weatherDomain.js';

type ClientCacheEntry = {
  data: WeatherData;
  fetchedAt: number;
};

const clientCache = new Map<string, ClientCacheEntry>();
const clientInFlight = new Map<string, Promise<WeatherResponse>>();

export function resetWeatherClientCache(): void {
  clientCache.clear();
  clientInFlight.clear();
}

export async function fetchWeather(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<WeatherResponse> {
  const areaKey = getAreaKey(lat, lon);
  const nowMs = Date.now();

  // Check client fresh cache
  const cached = clientCache.get(areaKey);
  if (cached && nowMs - cached.fetchedAt < WEATHER_REFRESH_MS) {
    return { ok: true, data: { ...cached.data, stale: false } };
  }

  // Check client in-flight
  const pending = clientInFlight.get(areaKey);
  if (pending) {
    return pending;
  }

  const promise = (async (): Promise<WeatherResponse> => {
    try {
      const url = `/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const res = await fetchImpl(url, { method: 'GET' });
      const json = await res.json();

      if (res.ok && json.ok && json.data) {
        const data: WeatherData = json.data;
        clientCache.set(areaKey, { data, fetchedAt: Date.now() });
        return { ok: true, data };
      }

      if (json.ok === false) {
        return json as WeatherResponse;
      }

      return { ok: false, code: 'WEATHER_UNAVAILABLE' };
    } catch (err) {
      return { ok: false, code: 'WEATHER_UNAVAILABLE' };
    }
  })();

  clientInFlight.set(areaKey, promise);

  try {
    return await promise;
  } finally {
    clientInFlight.delete(areaKey);
  }
}
