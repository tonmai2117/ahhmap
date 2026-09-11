import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WeatherFixtureKey } from '../weather/weatherFixtures.js';

const FIXTURE_OPTIONS: { key: WeatherFixtureKey; label: string }[] = [
  { key: 'live', label: 'สด (Live)' },
  { key: 'clear', label: 'ฟ้าโปร่ง' },
  { key: 'cloudy', label: 'เมฆมาก' },
  { key: 'light-rain', label: 'ฝนเบา' },
  { key: 'heavy-rain', label: 'ฝนตกหนัก' },
  { key: 'thunderstorm', label: 'ฟ้าคะนอง' },
  { key: 'stale', label: 'ข้อมูลเก่า (Stale)' },
  { key: 'error', label: 'ข้อผิดพลาด (Error)' },
];

export const WeatherDemoControls: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const currentFixture = searchParams.get('weather') || 'live';

  const handleSelectFixture = (key: WeatherFixtureKey) => {
    const newParams = new URLSearchParams(searchParams);
    if (key === 'live') {
      newParams.delete('weather');
    } else {
      newParams.set('weather', key);
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div
      className="aahh-weather-demo-controls"
      style={{
        marginTop: '10px',
        padding: '10px',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span>🧪 ทดสอบสภาพอากาศ (Demo Weather)</span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {isOpen ? '▲ ย่อ' : '▼ ขยาย'}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '10px',
          }}
        >
          {FIXTURE_OPTIONS.map((opt) => {
            const isSelected = currentFixture === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelectFixture(opt.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary)' : 'var(--surface)',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
