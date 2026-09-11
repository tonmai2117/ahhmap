import { describe, expect, it } from 'vitest';
import { createWeatherSVGMarkup } from '../map/weatherMarker.js';
import { WeatherData } from '../weather/weatherDomain.js';

describe('weatherMarker SVG rendering', () => {
  const baseData: WeatherData = {
    source: 'demo',
    areaKey: '13.74,100.52',
    lat: 13.7466,
    lon: 100.5285,
    observedAt: Date.now(),
    fetchedAt: Date.now(),
    conditionIds: [502],
    kind: 'heavy-rain',
    label: 'ฝนตกหนัก',
    cloudPercent: 100,
    rainMmPerHour: 10,
    isDay: true,
    stale: false,
  };

  it('renders heavy-rain with rain drops but NO lightning element', () => {
    const svg = createWeatherSVGMarkup(baseData);

    expect(svg).toContain('aahh-weather-drop');
    expect(svg).not.toContain('aahh-weather-lightning');
  });

  it('renders thunderstorm with rain drops AND lightning element', () => {
    const thunderstormData: WeatherData = {
      ...baseData,
      kind: 'thunderstorm',
      conditionIds: [202],
      label: 'ฝนฟ้าคะนอง',
    };
    const svg = createWeatherSVGMarkup(thunderstormData);

    expect(svg).toContain('aahh-weather-drop');
    expect(svg).toContain('aahh-weather-lightning');
  });

  it('adds stale class when weather is marked stale', () => {
    const staleData: WeatherData = {
      ...baseData,
      stale: true,
    };
    const svg = createWeatherSVGMarkup(staleData);

    expect(svg).toContain('aahh-weather-stale');
  });
});
