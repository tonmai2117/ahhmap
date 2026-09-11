export type WeatherKind =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'thunderstorm'
  | 'other'
  | 'unknown';

export type WeatherData = {
  source: 'openweather' | 'demo';
  areaKey: string;
  lat: number;
  lon: number;
  observedAt: number; // Unix ms from dt * 1000
  fetchedAt: number; // Unix ms when successfully fetched
  conditionIds: number[];
  kind: WeatherKind;
  label: string;
  cloudPercent: number | null;
  rainMmPerHour: number | null;
  isDay: boolean | null;
  stale: boolean;
};

export type WeatherErrorCode =
  | 'BAD_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'WEATHER_NOT_CONFIGURED'
  | 'WEATHER_AUTH'
  | 'WEATHER_RATE_LIMITED'
  | 'WEATHER_UNAVAILABLE';

export type WeatherResponse =
  | { ok: true; data: WeatherData }
  | { ok: false; code: WeatherErrorCode; retryAfterSeconds?: number };

export const WEATHER_GRID_DEGREES = 0.02;
export const WEATHER_REFRESH_MS = 15 * 60 * 1000; // 15 minutes
export const WEATHER_MIN_REQUEST_MS = 60 * 1000; // 60 seconds
export const WEATHER_MOVE_METERS = 1000; // 1 km
export const WEATHER_UPSTREAM_TIMEOUT_MS = 8000; // 8 seconds
export const WEATHER_MAX_STALE_MS = 60 * 60 * 1000; // 60 minutes
export const WEATHER_SERVER_CACHE_SIZE = 100;
export const WEATHER_MIN_SPACING_MS = 2000; // 2 seconds between process-wide upstream calls

export function snapCoordinate(val: number): number {
  const rounded = Math.round(val / WEATHER_GRID_DEGREES) * WEATHER_GRID_DEGREES;
  return Number(rounded.toFixed(4));
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lon === 'number' &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  );
}

export function getAreaKey(lat: number, lon: number): string {
  const sLat = snapCoordinate(lat);
  const sLon = snapCoordinate(lon);
  return `${sLat.toFixed(2)},${sLon.toFixed(2)}`;
}

export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type ConditionMeta = {
  kind: WeatherKind;
  label: string;
  priority: number; // lower number = higher priority
};

function getConditionMeta(id: number): ConditionMeta {
  // Priority 1: Thunderstorm (2xx)
  if (id >= 200 && id < 300) {
    const isNoRainThunder = [210, 211, 212, 221].includes(id);
    return {
      kind: 'thunderstorm',
      label: isNoRainThunder ? 'ฟ้าคะนอง' : 'ฝนฟ้าคะนอง',
      priority: 1,
    };
  }

  // Priority 2: Heavy rain (502, 503, 504, 522)
  if ([502, 503, 504, 522].includes(id)) {
    return { kind: 'heavy-rain', label: 'ฝนตกหนัก', priority: 2 };
  }

  // Priority 3: Rain (500, 501, 520, 521, 531)
  if ([500, 501, 520, 521, 531].includes(id)) {
    let label = 'ฝนตก';
    if (id === 500) label = 'ฝนเบา';
    else if (id === 501 || id === 520) label = 'ฝนปานกลาง';
    else if (id === 521 || id === 531) label = 'ฝนซู่';
    return { kind: 'rain', label, priority: 3 };
  }

  // Priority 4: Drizzle (3xx)
  if (id >= 300 && id < 400) {
    return { kind: 'drizzle', label: 'ฝนปรอย', priority: 4 };
  }

  // Priority 5: Other (511, 6xx, 7xx)
  if (id === 511 || (id >= 600 && id < 800)) {
    let label = 'สภาพอากาศอื่น ๆ';
    if (id === 511) label = 'ฝนเยือกแข็ง';
    else if (id >= 600 && id < 700) label = 'หิมะ';
    else if (id === 701 || id === 741) label = 'หมอก';
    else if (id === 711) label = 'ควัน';
    else if (id === 721) label = 'หมอกควัน';
    else if (id === 731 || id === 751 || id === 761) label = 'ฝุ่นผง';
    else if (id === 762) label = 'เถ้าภูเขาไฟ';
    else if (id === 771) label = 'ลมกระโชกแรง';
    else if (id === 781) label = 'พายุงวงช้าง';
    return { kind: 'other', label, priority: 5 };
  }

  // Priority 6: Cloudy (803, 804)
  if (id === 803 || id === 804) {
    return {
      kind: 'cloudy',
      label: id === 804 ? 'ท้องฟ้าครึ้ม' : 'เมฆมาก',
      priority: 6,
    };
  }

  // Priority 7: Partly cloudy (801, 802)
  if (id === 801 || id === 802) {
    return {
      kind: 'partly-cloudy',
      label: id === 801 ? 'มีเมฆบางส่วน' : 'เมฆปานกลาง',
      priority: 7,
    };
  }

  // Priority 8: Clear (800)
  if (id === 800) {
    return { kind: 'clear', label: 'ท้องฟ้าโปร่ง', priority: 8 };
  }

  // Unknown code
  return { kind: 'unknown', label: 'ไม่ทราบสภาพอากาศ', priority: 99 };
}

export function resolveConditions(ids: number[]): { kind: WeatherKind; label: string } {
  if (!ids || ids.length === 0) {
    return { kind: 'unknown', label: 'ไม่ทราบสภาพอากาศ' };
  }

  let bestMeta: ConditionMeta = { kind: 'unknown', label: 'ไม่ทราบสภาพอากาศ', priority: 999 };

  for (const id of ids) {
    const meta = getConditionMeta(id);
    if (meta.priority < bestMeta.priority) {
      bestMeta = meta;
    }
  }

  return { kind: bestMeta.kind, label: bestMeta.label };
}

export function parseOpenWeatherResponse(
  rawJson: any,
  lat: number,
  lon: number,
  nowMs: number
): WeatherData {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Invalid OpenWeather JSON response');
  }

  const dt = rawJson.dt;
  if (typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0) {
    throw new Error('Invalid dt timestamp in OpenWeather response');
  }

  const weatherArr = rawJson.weather;
  if (!Array.isArray(weatherArr) || weatherArr.length === 0) {
    throw new Error('Missing or empty weather array in OpenWeather response');
  }

  const conditionIds: number[] = [];
  let iconString: string | null = null;

  for (const w of weatherArr) {
    if (w && typeof w.id === 'number' && Number.isFinite(w.id)) {
      conditionIds.push(w.id);
      if (!iconString && typeof w.icon === 'string') {
        iconString = w.icon;
      }
    }
  }

  if (conditionIds.length === 0) {
    throw new Error('No valid condition IDs in weather array');
  }

  const { kind, label } = resolveConditions(conditionIds);

  let cloudPercent: number | null = null;
  if (
    rawJson.clouds &&
    typeof rawJson.clouds.all === 'number' &&
    Number.isFinite(rawJson.clouds.all)
  ) {
    cloudPercent = rawJson.clouds.all;
  }

  let rainMmPerHour: number | null = null;
  if (
    rawJson.rain &&
    typeof rawJson.rain['1h'] === 'number' &&
    Number.isFinite(rawJson.rain['1h'])
  ) {
    rainMmPerHour = rawJson.rain['1h'];
  }

  let isDay: boolean | null = null;
  if (iconString) {
    if (iconString.endsWith('d')) isDay = true;
    else if (iconString.endsWith('n')) isDay = false;
  }

  const areaKey = getAreaKey(lat, lon);

  return {
    source: 'openweather',
    areaKey,
    lat,
    lon,
    observedAt: dt * 1000,
    fetchedAt: nowMs,
    conditionIds,
    kind,
    label,
    cloudPercent,
    rainMmPerHour,
    isDay,
    stale: false,
  };
}
