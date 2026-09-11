import type L from 'leaflet';
import { WeatherData } from '../weather/weatherDomain.js';

export type CloudVariantOptions = {
  scale?: number;
  delayMs?: number;
  opacity?: number;
};

export function createWeatherSVGMarkup(weather: WeatherData, options: CloudVariantOptions = {}): string {
  const { kind, stale } = weather;
  const isNight = weather.isDay === false;
  const { scale = 1.0, delayMs = 0, opacity = 1.0 } = options;

  const cloudColor =
    kind === 'heavy-rain' || kind === 'thunderstorm'
      ? '#4a5568'
      : kind === 'rain'
      ? '#718096'
      : '#cbd5e0';

  const secondaryCloudColor = isNight ? '#4a5568' : '#e2e8f0';
  const sunOrMoonColor = isNight ? '#cbd5e0' : '#f6ad55';

  const staleClass = stale ? 'aahh-weather-stale' : '';
  const rainClass =
    kind === 'heavy-rain' || kind === 'thunderstorm'
      ? 'aahh-weather-rain-heavy'
      : kind === 'rain' || kind === 'drizzle'
      ? 'aahh-weather-rain-drizzle'
      : '';

  const delaySec = (delayMs / 1000).toFixed(1);

  let rainElements = '';
  if (kind === 'drizzle') {
    rainElements = `
      <g class="aahh-weather-drop" style="animation-delay: ${delaySec}s"><line x1="26" y1="46" x2="24" y2="52" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 400) / 1000}s"><line x1="42" y1="46" x2="40" y2="52" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 800) / 1000}s"><line x1="58" y1="46" x2="56" y2="52" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" /></g>
    `;
  } else if (kind === 'rain') {
    rainElements = `
      <g class="aahh-weather-drop" style="animation-delay: ${delaySec}s"><line x1="22" y1="46" x2="19" y2="54" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 300) / 1000}s"><line x1="36" y1="46" x2="33" y2="54" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 600) / 1000}s"><line x1="50" y1="46" x2="47" y2="54" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 900) / 1000}s"><line x1="64" y1="46" x2="61" y2="54" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" /></g>
    `;
  } else if (kind === 'heavy-rain' || kind === 'thunderstorm') {
    rainElements = `
      <g class="aahh-weather-drop" style="animation-delay: ${delaySec}s"><line x1="18" y1="46" x2="14" y2="56" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 200) / 1000}s"><line x1="30" y1="46" x2="26" y2="56" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 400) / 1000}s"><line x1="42" y1="46" x2="38" y2="56" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 600) / 1000}s"><line x1="54" y1="46" x2="50" y2="56" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" /></g>
      <g class="aahh-weather-drop" style="animation-delay: ${(delayMs + 800) / 1000}s"><line x1="66" y1="46" x2="62" y2="56" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" /></g>
    `;
  }

  let lightningElement = '';
  if (kind === 'thunderstorm') {
    lightningElement = `
      <polygon class="aahh-weather-lightning" style="animation-delay: ${delaySec}s" points="44,40 34,54 42,54 36,66 50,48 42,48" fill="#fbbf24" stroke="#f59e0b" stroke-width="1" />
    `;
  }

  let sunOrMoonElement = '';
  if (kind === 'clear' || kind === 'partly-cloudy') {
    if (isNight) {
      sunOrMoonElement = `
        <path d="M 28 14 A 12 12 0 1 0 42 28 A 10 10 0 1 1 28 14 Z" fill="${sunOrMoonColor}" />
      `;
    } else {
      sunOrMoonElement = `
        <circle cx="28" cy="22" r="10" fill="${sunOrMoonColor}" />
        <g stroke="${sunOrMoonColor}" stroke-width="2" stroke-linecap="round">
          <line x1="28" y1="8" x2="28" y2="4" />
          <line x1="28" y1="36" x2="28" y2="40" />
          <line x1="14" y1="22" x2="10" y2="22" />
          <line x1="42" y1="22" x2="46" y2="22" />
          <line x1="18" y1="12" x2="15" y2="9" />
          <line x1="38" y1="32" x2="41" y2="35" />
        </g>
      `;
    }
  }

  const width = Math.round(88 * scale);
  const height = Math.round(72 * scale);

  return `
    <div class="aahh-weather-container ${staleClass} ${rainClass}" style="opacity: ${opacity}; transform: scale(${scale});">
      <svg width="${width}" height="${height}" viewBox="0 0 88 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">
        ${sunOrMoonElement}
        <g class="aahh-weather-cloud-g" style="animation-delay: ${delaySec}s">
          ${
            kind === 'partly-cloudy' || kind === 'cloudy'
              ? `<path d="M 20 38 a 10 10 0 0 1 18 -6 a 12 12 0 0 1 20 2 a 9 9 0 0 1 2 18 h -40 a 8 8 0 0 1 0 -14 z" fill="${secondaryCloudColor}" opacity="0.75" />`
              : ''
          }
          ${
            kind !== 'clear'
              ? `<path d="M 24 42 a 12 12 0 0 1 22 -6 a 14 14 0 0 1 24 2 a 11 11 0 0 1 2 22 h -48 a 10 10 0 0 1 0 -18 z" fill="${cloudColor}" />`
              : ''
          }
        </g>
        ${rainElements}
        ${lightningElement}
      </svg>
    </div>
  `;
}

type OffsetDef = {
  dLat: number;
  dLng: number;
  iconAnchor: [number, number];
  scale: number;
  delayMs: number;
  opacity: number;
};

const AREA_CLOUD_OFFSETS: OffsetDef[] = [
  // Center (Player Area)
  { dLat: 0, dLng: 0, iconAnchor: [-12, 80], scale: 1.0, delayMs: 0, opacity: 1.0 },
  // North-East Bangkok
  { dLat: 0.0055, dLng: 0.0075, iconAnchor: [44, 36], scale: 0.85, delayMs: 1400, opacity: 0.9 },
  // North-West Bangkok
  { dLat: 0.0065, dLng: -0.0065, iconAnchor: [44, 36], scale: 0.75, delayMs: 2800, opacity: 0.85 },
  // South-East Bangkok
  { dLat: -0.005, dLng: 0.006, iconAnchor: [44, 36], scale: 0.8, delayMs: 4200, opacity: 0.9 },
  // South-West Bangkok
  { dLat: -0.0045, dLng: -0.0055, iconAnchor: [44, 36], scale: 0.7, delayMs: 2100, opacity: 0.8 },
];

export class WeatherMarkerManager {
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private currentKey: string = '';

  public update(map: L.Map, weather: WeatherData | null, pos: { lat: number; lng: number } | null): void {
    const L = (window as any).L;
    if (!L || !map) return;

    this.map = map;

    // Ensure pane exists
    if (!map.getPane('aahh-weather')) {
      const pane = map.createPane('aahh-weather');
      pane.style.zIndex = '350';
      pane.style.pointerEvents = 'none';
    }

    if (!weather || !pos) {
      this.remove();
      return;
    }

    const key = `${weather.kind}-${weather.stale}-${weather.isDay}`;
    const needsIconRebuild = this.currentKey !== key || this.markers.length === 0;

    if (needsIconRebuild) {
      this.remove();
      this.currentKey = key;

      AREA_CLOUD_OFFSETS.forEach((offset) => {
        const latLng = L.latLng(pos.lat + offset.dLat, pos.lng + offset.dLng);
        const svgHtml = createWeatherSVGMarkup(weather, {
          scale: offset.scale,
          delayMs: offset.delayMs,
          opacity: offset.opacity,
        });

        const iconSize: [number, number] = [Math.round(88 * offset.scale), Math.round(72 * offset.scale)];
        const icon = L.divIcon({
          className: 'aahh-weather-marker',
          html: svgHtml,
          iconSize,
          iconAnchor: offset.iconAnchor,
        });

        const marker = L.marker(latLng, {
          icon,
          pane: 'aahh-weather',
          interactive: false,
          keyboard: false,
        }).addTo(map);

        this.markers.push(marker);
      });
    } else {
      // Just update positions of existing markers smoothly
      AREA_CLOUD_OFFSETS.forEach((offset, idx) => {
        if (this.markers[idx]) {
          const latLng = L.latLng(pos.lat + offset.dLat, pos.lng + offset.dLng);
          this.markers[idx].setLatLng(latLng);
        }
      });
    }
  }

  public remove(): void {
    if (this.map) {
      this.markers.forEach((m) => m.remove());
      this.markers = [];
      this.currentKey = '';
    }
  }
}
