import { describe, expect, it } from 'vitest';
import {
  getAreaKey,
  getDistanceMeters,
  isValidCoordinate,
  parseOpenWeatherResponse,
  resolveConditions,
  snapCoordinate,
} from '../weather/weatherDomain';

describe('weatherDomain', () => {
  describe('resolveConditions', () => {
    it('maps 202 to thunderstorm and 502/522 to heavy-rain', () => {
      expect(resolveConditions([202])).toEqual({
        kind: 'thunderstorm',
        label: 'ฝนฟ้าคะนอง',
      });
      expect(resolveConditions([502])).toEqual({
        kind: 'heavy-rain',
        label: 'ฝนตกหนัก',
      });
      expect(resolveConditions([522])).toEqual({
        kind: 'heavy-rain',
        label: 'ฝนตกหนัก',
      });
      expect(resolveConditions([500])).toEqual({
        kind: 'rain',
        label: 'ฝนเบา',
      });
      expect(resolveConditions([300])).toEqual({
        kind: 'drizzle',
        label: 'ฝนปรอย',
      });
    });

    it('prioritizes higher severity regardless of condition array order', () => {
      expect(resolveConditions([800, 202])).toEqual({
        kind: 'thunderstorm',
        label: 'ฝนฟ้าคะนอง',
      });
      expect(resolveConditions([202, 800])).toEqual({
        kind: 'thunderstorm',
        label: 'ฝนฟ้าคะนอง',
      });
      expect(resolveConditions([804, 502])).toEqual({
        kind: 'heavy-rain',
        label: 'ฝนตกหนัก',
      });
      expect(resolveConditions([502, 804])).toEqual({
        kind: 'heavy-rain',
        label: 'ฝนตกหนัก',
      });
    });

    it('handles cloud, clear, and other codes without converting them to rain', () => {
      expect(resolveConditions([804])).toEqual({
        kind: 'cloudy',
        label: 'ท้องฟ้าครึ้ม',
      });
      expect(resolveConditions([801])).toEqual({
        kind: 'partly-cloudy',
        label: 'มีเมฆบางส่วน',
      });
      expect(resolveConditions([800])).toEqual({
        kind: 'clear',
        label: 'ท้องฟ้าโปร่ง',
      });
      expect(resolveConditions([701])).toEqual({
        kind: 'other',
        label: 'หมอก',
      });
      expect(resolveConditions([600])).toEqual({
        kind: 'other',
        label: 'หิมะ',
      });
      expect(resolveConditions([511])).toEqual({
        kind: 'other',
        label: 'ฝนเยือกแข็ง',
      });
    });

    it('returns unknown for unmapped condition ids', () => {
      expect(resolveConditions([9999])).toEqual({
        kind: 'unknown',
        label: 'ไม่ทราบสภาพอากาศ',
      });
    });
  });

  describe('grid snapping and coordinates', () => {
    it('snaps coordinates to 0.02 degree grid', () => {
      expect(snapCoordinate(13.7466)).toBe(13.74);
      expect(snapCoordinate(100.5285)).toBe(100.52);

      // Nearby coordinates get the same grid areaKey
      const key1 = getAreaKey(13.7466, 100.5285);
      const key2 = getAreaKey(13.7411, 100.5299);
      expect(key1).toBe('13.74,100.52');
      expect(key2).toBe('13.74,100.52');
      expect(key1).toBe(key2);

      // Distant coordinate gets a different key
      const key3 = getAreaKey(13.80, 100.60);
      expect(key3).not.toBe(key1);
    });

    it('validates coordinate boundaries', () => {
      expect(isValidCoordinate(13.7466, 100.5285)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);

      expect(isValidCoordinate(91, 100)).toBe(false);
      expect(isValidCoordinate(13, 181)).toBe(false);
      expect(isValidCoordinate(NaN, 100)).toBe(false);
      expect(isValidCoordinate(13, Infinity)).toBe(false);
    });

    it('calculates distance in meters', () => {
      // Distance between 13.7466,100.5285 and 13.7566,100.5285 is approx ~1.1km (1110m)
      const dist = getDistanceMeters(13.7466, 100.5285, 13.7566, 100.5285);
      expect(dist).toBeGreaterThan(1000);
      expect(dist).toBeLessThan(1200);
    });
  });

  describe('parseOpenWeatherResponse', () => {
    const nowMs = 1700000000000;

    it('parses valid OpenWeather response correctly', () => {
      const raw = {
        dt: 1700000000,
        weather: [{ id: 500, main: 'Rain', icon: '10d' }],
        clouds: { all: 90 },
        rain: { '1h': 0.5 },
      };

      const result = parseOpenWeatherResponse(raw, 13.7466, 100.5285, nowMs);

      expect(result.source).toBe('openweather');
      expect(result.lat).toBe(13.7466);
      expect(result.lon).toBe(100.5285);
      expect(result.observedAt).toBe(1700000000000); // dt * 1000
      expect(result.fetchedAt).toBe(nowMs);
      expect(result.kind).toBe('rain');
      expect(result.cloudPercent).toBe(90);
      expect(result.rainMmPerHour).toBe(0.5);
      expect(result.isDay).toBe(true);
      expect(result.stale).toBe(false);
    });

    it('keeps optional values as null if missing in raw response', () => {
      const raw = {
        dt: 1700000000,
        weather: [{ id: 800, main: 'Clear', icon: '01n' }],
      };

      const result = parseOpenWeatherResponse(raw, 13.7466, 100.5285, nowMs);

      expect(result.kind).toBe('clear');
      expect(result.cloudPercent).toBeNull();
      expect(result.rainMmPerHour).toBeNull();
      expect(result.isDay).toBe(false);
    });

    it('throws when dt or weather array is missing or invalid', () => {
      expect(() => parseOpenWeatherResponse({}, 13.74, 100.52, nowMs)).toThrow();
      expect(() =>
        parseOpenWeatherResponse({ dt: 100, weather: [] }, 13.74, 100.52, nowMs)
      ).toThrow();
      expect(() =>
        parseOpenWeatherResponse({ weather: [{ id: 500 }] }, 13.74, 100.52, nowMs)
      ).toThrow();
    });
  });
});
