import React from 'react';
import { WeatherData, WeatherResponse } from '../weather/weatherDomain.js';

type WeatherStatusProps = {
  weather: WeatherData | null;
  loading?: boolean;
  error?: WeatherResponse | null;
};

export const WeatherStatus: React.FC<WeatherStatusProps> = ({ weather, loading, error }) => {
  if (loading && !weather) {
    return (
      <div className="aahh-weather-status-bar" style={containerStyle}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          กำลังอัปเดตสภาพอากาศบริเวณนี้...
        </span>
      </div>
    );
  }

  if (error && error.ok === false && (!weather || error.ok === false)) {
    let msg = 'สภาพอากาศไม่พร้อมใช้งาน';
    if (error.code === 'WEATHER_NOT_CONFIGURED') {
      msg = 'ยังไม่ได้ตั้งค่า API Key';
    } else if (error.code === 'WEATHER_AUTH') {
      msg = 'API Key ไม่ถูกต้อง';
    } else if (error.code === 'WEATHER_RATE_LIMITED') {
      msg = 'จำกัดจำนวนคำขอแล้ว';
    }

    return (
      <div className="aahh-weather-status-bar" style={containerStyle}>
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {msg}
        </span>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="aahh-weather-status-bar" style={containerStyle}>
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          รอตำแหน่งเพื่อดูสภาพอากาศ
        </span>
      </div>
    );
  }

  const dateObj = new Date(weather.observedAt);
  const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(
    dateObj.getMinutes()
  ).padStart(2, '0')}`;

  const isDemoFixture = weather.source === 'demo';

  return (
    <div className="aahh-weather-status-bar" style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-primary)',
          }}
        >
          {isDemoFixture ? `ตัวอย่างอากาศ: ${weather.label}` : `สภาพอากาศบริเวณนี้: ${weather.label}`}
        </span>

        {weather.stale && (
          <span
            style={{
              fontSize: '12px',
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'var(--fill-strong)',
              color: 'var(--warning)',
              fontWeight: 500,
            }}
          >
            ข้อมูลเก่า • อัปเดตไม่ได้
          </span>
        )}

        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          เวลา {timeStr}
        </span>
      </div>

      <a
        href="https://openweathermap.org/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '11px',
          color: 'var(--primary)',
          textDecoration: 'none',
          opacity: 0.9,
        }}
      >
        ข้อมูล OpenWeather
      </a>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 12px',
  background: 'var(--fill-subtle)',
  borderRadius: 'var(--radius-md)',
  margin: '6px 0 10px 0',
  gap: '8px',
  lineHeight: '1.4',
};
