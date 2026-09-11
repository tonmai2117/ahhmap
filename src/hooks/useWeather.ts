import { useEffect, useRef, useState } from 'react';
import { fetchWeather } from '../weather/weatherClient.js';
import {
  getFixtureWeather,
  isValidWeatherFixture,
  WeatherFixtureKey,
} from '../weather/weatherFixtures.js';
import {
  WEATHER_MIN_REQUEST_MS,
  WEATHER_MOVE_METERS,
  WEATHER_REFRESH_MS,
  WeatherData,
  WeatherResponse,
  getAreaKey,
  getDistanceMeters,
} from '../weather/weatherDomain.js';

export type UseWeatherResult = {
  weather: WeatherData | null;
  loading: boolean;
  error: WeatherResponse | null;
  refetch: () => void;
};

export function useWeather(
  pos: { lat: number; lng: number } | null,
  fixtureParam?: string | null,
  isDemo: boolean = false
): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<WeatherResponse | null>(null);

  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const requestSeqRef = useRef<number>(0);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFixtureActive =
    Boolean(isDemo) &&
    isValidWeatherFixture(fixtureParam) &&
    fixtureParam !== 'live';

  const activeFixtureKey = isFixtureActive ? (fixtureParam as WeatherFixtureKey) : null;

  useEffect(() => {
    // 1. Fixture mode
    if (activeFixtureKey) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      setLoading(false);
      const lat = pos ? pos.lat : 13.7466;
      const lon = pos ? pos.lng : 100.5285;
      const fixtureRes = getFixtureWeather(activeFixtureKey, lat, lon);

      if (fixtureRes.ok) {
        setWeather(fixtureRes.data);
        setError(null);
      } else {
        setWeather(null);
        setError(fixtureRes);
      }
      return;
    }

    // 2. Live mode without position
    if (!pos) {
      setWeather(null);
      setLoading(false);
      setError(null);
      return;
    }

    // 3. Live mode with position
    const currentSeq = ++requestSeqRef.current;

    const performFetch = async (force: boolean = false) => {
      const now = Date.now();
      const areaChanged =
        !lastPosRef.current ||
        getAreaKey(pos.lat, pos.lng) !== getAreaKey(lastPosRef.current.lat, lastPosRef.current.lng);
      const distance = lastPosRef.current
        ? getDistanceMeters(pos.lat, pos.lng, lastPosRef.current.lat, lastPosRef.current.lng)
        : Infinity;

      const timeSinceLast = now - lastRequestTimeRef.current;

      // Check throttles unless forced or initial
      if (!force && lastPosRef.current) {
        const movedEnough = distance >= WEATHER_MOVE_METERS && areaChanged;
        const ttlExpired = timeSinceLast >= WEATHER_REFRESH_MS;
        if (!movedEnough && !ttlExpired) {
          return;
        }
        if (timeSinceLast < WEATHER_MIN_REQUEST_MS) {
          return;
        }
      }

      setLoading(true);
      lastRequestTimeRef.current = now;
      lastPosRef.current = { lat: pos.lat, lng: pos.lng };

      const res = await fetchWeather(pos.lat, pos.lng);

      if (requestSeqRef.current !== currentSeq) {
        return; // Stale request response
      }

      setLoading(false);
      if (res.ok) {
        setWeather(res.data);
        setError(null);
      } else {
        setError(res);
        // Retain stale weather if available, otherwise clear
        setWeather((prev) => (prev && prev.areaKey === getAreaKey(pos.lat, pos.lng) ? prev : null));
      }
    };

    performFetch();

    // Schedule 15-min periodic refresh
    const scheduleNextRefresh = () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          performFetch(true);
        }
        scheduleNextRefresh();
      }, WEATHER_REFRESH_MS);
    };

    scheduleNextRefresh();

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSince = Date.now() - lastRequestTimeRef.current;
        if (timeSince >= WEATHER_REFRESH_MS) {
          performFetch(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pos?.lat, pos?.lng, activeFixtureKey, isDemo]);

  const refetch = () => {
    if (pos && !activeFixtureKey) {
      lastRequestTimeRef.current = 0; // bypass cooldown
      fetchWeather(pos.lat, pos.lng).then((res) => {
        if (res.ok) {
          setWeather(res.data);
          setError(null);
        } else {
          setError(res);
        }
      });
    }
  };

  return { weather, loading, error, refetch };
}
