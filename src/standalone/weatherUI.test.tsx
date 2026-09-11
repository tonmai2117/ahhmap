import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WeatherDemoControls } from '../components/WeatherDemoControls';
import { WeatherStatus } from '../components/WeatherStatus';
import { WeatherData } from '../weather/weatherDomain';

describe('Weather UI Components', () => {
  const mockWeatherData: WeatherData = {
    source: 'openweather',
    areaKey: '13.74,100.52',
    lat: 13.7466,
    lon: 100.5285,
    observedAt: 1700000000000,
    fetchedAt: 1700000000000,
    conditionIds: [502],
    kind: 'heavy-rain',
    label: 'ฝนตกหนัก',
    cloudPercent: 100,
    rainMmPerHour: 10,
    isDay: true,
    stale: false,
  };

  describe('WeatherStatus', () => {
    it('renders live weather label, time, and OpenWeather attribution link', () => {
      render(<WeatherStatus weather={mockWeatherData} />);

      expect(screen.getByText('สภาพอากาศบริเวณนี้: ฝนตกหนัก')).toBeTruthy();
      expect(screen.getByText('ข้อมูล OpenWeather')).toBeTruthy();
      expect(screen.queryByText('ข้อมูลเก่า • อัปเดตไม่ได้')).toBeNull();
    });

    it('renders stale badge when weather is stale', () => {
      const staleData: WeatherData = { ...mockWeatherData, stale: true };
      render(<WeatherStatus weather={staleData} />);

      expect(screen.getByText('ข้อมูลเก่า • อัปเดตไม่ได้')).toBeTruthy();
    });

    it('renders demo fixture label when source is demo', () => {
      const demoData: WeatherData = { ...mockWeatherData, source: 'demo', label: 'ฝนฟ้าคะนอง' };
      render(<WeatherStatus weather={demoData} />);

      expect(screen.getByText('ตัวอย่างอากาศ: ฝนฟ้าคะนอง')).toBeTruthy();
    });

    it('renders error status message when error is passed', () => {
      render(
        <WeatherStatus
          weather={null}
          error={{ ok: false, code: 'WEATHER_NOT_CONFIGURED' }}
        />
      );

      expect(screen.getByText('ยังไม่ได้ตั้งค่า API Key')).toBeTruthy();
    });
  });

  describe('WeatherDemoControls', () => {
    function RouteProbe() {
      const [params] = useSearchParams();
      return <output data-testid="weather-param">{params.get('weather') || 'none'}</output>;
    }

    it('renders fixture selector buttons and updates query parameter when clicked', () => {
      render(
        <MemoryRouter initialEntries={['/map?demo=1']}>
          <WeatherDemoControls />
          <RouteProbe />
        </MemoryRouter>
      );

      // Expand panel
      const toggleBtn = screen.getByRole('button', { name: /ทดสอบสภาพอากาศ/ });
      fireEvent.click(toggleBtn);

      expect(screen.getByRole('button', { name: 'ฝนตกหนัก' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ฟ้าคะนอง' })).toBeTruthy();

      // Click heavy rain fixture
      fireEvent.click(screen.getByRole('button', { name: 'ฝนตกหนัก' }));

      expect(screen.getByTestId('weather-param').textContent).toBe('heavy-rain');
    });
  });
});
