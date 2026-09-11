import {
  WeatherData,
  WeatherResponse,
  getAreaKey,
  resolveConditions,
} from './weatherDomain.js';

export type WeatherFixtureKey =
  | 'live'
  | 'clear'
  | 'cloudy'
  | 'light-rain'
  | 'heavy-rain'
  | 'thunderstorm'
  | 'stale'
  | 'error';

export const VALID_WEATHER_FIXTURES: WeatherFixtureKey[] = [
  'live',
  'clear',
  'cloudy',
  'light-rain',
  'heavy-rain',
  'thunderstorm',
  'stale',
  'error',
];

export function isValidWeatherFixture(val: string | null | undefined): val is WeatherFixtureKey {
  if (!val) return false;
  return VALID_WEATHER_FIXTURES.includes(val as WeatherFixtureKey);
}

export function getFixtureWeather(
  fixtureKey: string,
  lat: number,
  lon: number,
  clockMs: number = Date.now()
): WeatherResponse {
  if (fixtureKey === 'error') {
    return { ok: false, code: 'WEATHER_UNAVAILABLE' };
  }

  const areaKey = getAreaKey(lat, lon);

  let conditionIds: number[] = [800];
  let rainMmPerHour: number | null = null;
  let cloudPercent: number | null = 0;
  let isStale = false;
  let timeOffset = 0;

  switch (fixtureKey) {
    case 'clear':
      conditionIds = [800];
      cloudPercent = 0;
      rainMmPerHour = null;
      break;
    case 'cloudy':
      conditionIds = [804];
      cloudPercent = 100;
      rainMmPerHour = null;
      break;
    case 'light-rain':
      conditionIds = [500];
      cloudPercent = 85;
      rainMmPerHour = 0.4;
      break;
    case 'heavy-rain':
      conditionIds = [502];
      cloudPercent = 100;
      rainMmPerHour = 10;
      break;
    case 'thunderstorm':
      conditionIds = [202];
      cloudPercent = 100;
      rainMmPerHour = 8;
      break;
    case 'stale':
      conditionIds = [500];
      cloudPercent = 85;
      rainMmPerHour = 0.4;
      isStale = true;
      timeOffset = 30 * 60 * 1000; // 30 minutes ago
      break;
    default:
      // Fallback if unknown fixture key passed
      conditionIds = [800];
      cloudPercent = 0;
      rainMmPerHour = null;
      break;
  }

  const { kind, label } = resolveConditions(conditionIds);
  const observedAt = clockMs - timeOffset;
  const fetchedAt = clockMs - timeOffset;

  const data: WeatherData = {
    source: 'demo',
    areaKey,
    lat,
    lon,
    observedAt,
    fetchedAt,
    conditionIds,
    kind,
    label,
    cloudPercent,
    rainMmPerHour,
    isDay: true,
    stale: isStale,
  };

  return { ok: true, data };
}
