# AahhMap: แผนเพิ่ม OpenWeather และเมฆแอนิเมชัน

สถานะ: แผนส่งต่อ ยังไม่ได้ implement ระบบอากาศ
อัปเดต: 11 กันยายน 2026
Workspace: `C:\Users\uSeR\Desktop\linemap`
อ่านคู่กับ [สเปกทดสอบ](WEATHER_TEST_SPEC.md) และ [คำสั่งเริ่มงาน](WEATHER_NEXT_MODEL_PROMPT.md)

## 1. ผลลัพธ์และข้อสรุปที่ล็อกไว้

ผู้ใช้เลือก **OpenWeather / OpenWeatherMap** แล้ว ไม่ใช้ Open-Meteo หรือ WeatherAPI ในงานนี้

เพิ่มสภาพอากาศบริเวณตำแหน่งผู้เล่นบน Map เดิม พร้อมไอคอนเมฆที่เคลื่อนไหว:

- เมฆมาก: ก้อนเมฆเทาครึ้มลอยช้า ๆ
- ฝนปรอย/ฝนเบา: เมฆและหยดฝนบาง ๆ
- ฝนปานกลาง: เมฆกับฝนถี่กว่าแบบเบา
- ฝนหนัก: เมฆเข้มและฝนหนาแน่น
- ฟ้าคะนอง: เมฆกับสายฟ้าแวบเป็นช่วง ๆ และฝนเมื่อรหัสระบุว่ามีฝน
- ฟ้าโปร่ง/เมฆบางส่วน: สัญลักษณ์ฟ้าโปร่งหรือเมฆบางส่วน ไม่สร้างฝนขึ้นเอง

ทำด้วย functional SVG icons + CSS animation ให้เข้ากับ Light/Dark เดิม ไม่ใช่ภาพเต็มจอหรือเมฆสามมิติ
ใช้สายฟ้าเฉพาะรหัสฟ้าคะนอง ฝนหนักอย่างเดียวไม่เท่ากับฟ้าผ่า ตามคำแนะนำล่าสุดในบทสนทนา

รอบ implement ถัดไปส่งมอบ **local test** เป็นหลัก ไม่มี publish/deploy หรือเปลี่ยนแพ็กเกจเสียเงิน การเขียนแผนครั้งนี้ไม่ใช่คำสั่งให้เริ่ม implement ทันที

## 2. สภาพโปรเจกต์ที่ตรวจแล้ว

- Entry: `src/main.tsx` → `src/App.tsx` → `src/pages/Map.tsx`; React.StrictMode เปิดอยู่
- Stack: React + TypeScript + Vite + Leaflet; มี Vitest/Testing Library แล้ว ใช้ npm และ lockfile เดิม
- `/` และ `/map` เปิด Map; route อื่น redirect กลับ Map โดยรักษา query
- Light/Dark, walking default, driving switch, การเลือกปลายทาง และ demo navigation ทำแล้ว อย่าทำซ้ำหรือ scaffold ใหม่
- `useMapTheme.ts` ตั้ง `document.documentElement.dataset.theme`; preference คือ `aahhmap-theme`
- GPS default กรุงเทพฯ `13.7466,100.5285`; `?gps=real` ใช้เครื่องจริงผ่าน `useGeolocation.ts`
- `Map.tsx` มี `displayPos`, `posRef`, `handleMapPosition`, `handleSourcePosition`; simulation อัปเดตตำแหน่งทุก 500ms ใช้ `displayPos` เป็น input ของ weather hook ห้ามเปิด GPS watcher อีกชุด
- `src/api.ts` เป็น local adapter/stub ไม่ใช่ HTTP client รองรับเพียงข้อมูลผู้เล่นและ Portal ดังนั้นห้ามใช้ `api.get('/weather')`
- `vite.config.ts` มี `server.proxy['/api']` ไป `http://localhost:3000` แต่โปรเจกต์นี้ไม่มี weather backend ที่ port นั้น
- `.env.local` มีชื่อ `OPENWEATHER_API_KEY` และใส่ค่าตามที่ผู้ใช้ให้ไว้แล้ว **ยังไม่ได้ทดสอบ key** ห้ามคัดลอกค่าจริงลงแผน, source, test, log หรือคำตอบ
- `.gitignore` มี `.env*` อยู่แล้ว อย่า force-add ไฟล์ key และอย่าสร้างหน้าให้ผู้ใช้กรอก key ซ้ำ
- `.openai/hosting.json` ปัจจุบันเป็น static `dist` ไม่มี server runtime ที่จะรับ `/api/weather` บนเว็บออนไลน์
- Working tree มีงานเดิมค้างจำนวนมาก รวมทั้งไฟล์ untracked จาก navigation; รักษาทั้งหมด ห้าม reset/clean/checkout ทับ
- HEAD อ้างอิง `df506677ddc4c62ac55a0a395fd80a817fd0113d` แต่ **working tree คือ baseline จริง**
- ผลตรวจรอบ implementation ก่อนหน้า: 18 tests ผ่าน และ build ผ่าน ข้อมูลนี้เป็นผลเดิม ไม่ใช่การรันทดสอบใหม่ในรอบเขียนแผน

หากพบความต่างจาก snapshot นี้ ให้เก็บงานที่ใหม่กว่าและปรับจุดเชื่อมเฉพาะที่จำเป็น เอกสาร navigation เดิมเป็นประวัติของงานที่ทำแล้ว

## 3. API และขอบเขตฟรี

ใช้ endpoint เดียว:

```text
GET https://api.openweathermap.org/data/2.5/weather
    ?lat=<latitude>&lon=<longitude>&units=metric&appid=<server-side key>
```

ใช้พิกัดโดยตรง ไม่เพิ่ม geocoding, radar tiles, One Call 3.0/4.0, forecast, paid subscription หรือระบบเตือนพายุภายนอก
เอกสาร free access ที่ตรวจระบุ Current Weather: 60 calls/minute, 1,000,000 calls/month แต่ไม่ใช่คำยืนยันสิทธิ์ของ key ผู้ใช้ และโควตาอาจถูกใช้ร่วมกับแอปอื่นในบัญชี ต้องรายงานผลจริงเมื่อทดสอบ ห้ามอ้างว่ารองรับผู้ใช้ไม่จำกัด
แหล่งอ้างอิง: [OpenWeather Pricing](https://openweathermap.org/price), [Current Weather](https://openweathermap.org/api/current?collection=current_forecast)

ใช้ `weather[].id` เป็นหลักในการเลือกสัญลักษณ์ ไม่เทียบข้อความ `description`, ไม่ใช้รหัส WMO ของ Open-Meteo
อ่าน `dt` เป็นเวลาข้อมูล UTC วินาที, `clouds.all` เป็นเปอร์เซ็นต์ และ `rain['1h']` เป็น mm/h ถ้ามี; ค่า rain หายให้เก็บ `null` ไม่แสดงเป็นค่าที่วัดได้เท่ากับศูนย์
การเลือกเมฆเป็นการสรุปสภาพอากาศในบริเวณนั้น ไม่ใช่เรดาร์ขอบเขตเมฆหรือการยืนยันฝนตรงหมุดทุกวินาที
แสดงเครดิตลิงก์ `ข้อมูล OpenWeather` และเวลาข้อมูล โดยใช้ข้อความ “สภาพอากาศบริเวณนี้” ห้ามอ้างว่าระบบตรวจจับตำแหน่งฟ้าผ่า

## 4. สถาปัตยกรรมที่ให้ใช้

```text
displayPos → useWeather → weatherClient → GET /api/weather?lat=...&lon=...
                                            ↓
                                  Vite local middleware
                                  key + cache + rate guard
                                            ↓
                               OpenWeather Current Weather

normalized weather → WeatherStatus + weather marker (SVG/CSS)
demo fixture       → เส้นทางการแสดงผลเดียวกัน (ไม่เรียก upstream)
```

### 4.1 Server ใน local dev และ local preview

เพิ่ม `server/weatherMiddleware.ts` เป็น Node middleware ใช้ native fetch; ออกแบบ factory รับ `apiKey`, `fetchImpl`, `now` เพื่อ unit test ได้ ไม่เพิ่ม Express หรือ service ที่ port ใหม่

ใน `vite.config.ts` ใช้ `defineConfig(({ mode }) => ...)` และ `loadEnv(mode, process.cwd(), 'OPENWEATHER_')` ฝั่ง config เท่านั้น ส่งเฉพาะ key เข้า middleware closure ไม่ส่ง env ทั้งก้อนให้ React
ติดตั้ง middleware สำหรับ **exact pathname `/api/weather`** ในทั้ง `configureServer` และ `configurePreviewServer` โดย `server.middlewares.use(...)` ภายใน hook โดยตรง **ไม่ return post hook** เพื่อให้จับก่อน proxy และ SPA fallback
path อื่นต้อง `next()` ตามปกติ; weather error ต้องจบด้วย JSON ห้ามไหลไป `localhost:3000`
รักษา React plugin, manualChunks, test include, port และ proxy เดิม
อ้างอิง: [Vite plugin hooks](https://vite.dev/guide/api-plugin#configureserver), [Preview hook](https://vite.dev/guide/api-plugin#configurepreviewserver)

ข้อกำหนด:

1. รับ GET เท่านั้น method อื่นตอบ 405 พร้อม Allow: GET
2. ตรวจว่ามี lat/lon ไม่ว่าง แปลงแล้ว finite และอยู่ในช่วง [-90,90]/[-180,180]; invalid ตอบ 400 ไม่เรียก upstream ระวัง `Number('') === 0`
3. upstream URL/host/path ต้องเป็นค่าคงที่ สร้าง query ด้วย URLSearchParams รับจาก client แค่ lat/lon ไม่รับ key, URL ปลายทาง หรือ product name จาก client
4. key ว่างให้ตอบ 503 `WEATHER_NOT_CONFIGURED`; build ต้องยังผ่านแม้ไม่มี key
5. timeout upstream 8 วินาที; ตรวจ HTTP status, JSON และโครงสร้างก่อน normalize
6. 401/403 → JSON error `WEATHER_AUTH` แบบปลอดภัย ไม่ echo upstream body/URL; แจ้งว่าต้องตรวจ key/สิทธิ์ ไม่เดาว่า key ใช้ได้หรือสั่งสมัครแผนใหม่
7. 429 → `WEATHER_RATE_LIMITED` พร้อม `retryAfterSeconds`; เคารพ Retry-After ที่เป็นวินาทีหรือ HTTP-date ถ้าไม่มีใช้ 15 นาที หยุด upstream ทั้ง key ระหว่าง cooldown
8. timeout/offline/upstream 5xx/JSON ผิด → `WEATHER_UNAVAILABLE`; ไม่มี automatic immediate retry loop
9. response `Content-Type: application/json`; ใช้ HTTP `Cache-Control: no-store` และทำ cache ใน middleware เอง
10. ไม่ log URL ที่มี appid, ไม่ log env, ไม่คืน stack traces; logging จำกัด status/error code

**ห้ามเปลี่ยนชื่อ key เป็น `VITE_OPENWEATHER_API_KEY`, ใส่ใน `define`, localStorage หรือ client fetch URL** เพราะ Vite จะแถมค่า VITE_ ลง bundle
อ้างอิง: [Vite env and secrets](https://vite.dev/guide/env-and-mode)

### 4.2 Cache, polling และตำแหน่ง

กำหนดค่าคงที่ร่วมกัน ไม่กระจาย magic numbers:

| ค่า | ค่าเริ่มต้น |
|---|---|
| WEATHER_REFRESH_MS / server cache TTL | 15 นาที |
| WEATHER_MIN_REQUEST_MS ฝั่ง client | 60 วินาที |
| WEATHER_MOVE_METERS | 1,000 เมตร |
| WEATHER_GRID_DEGREES | 0.02 องศา |
| upstream timeout | 8 วินาที |
| stale สูงสุด | 60 นาทีจาก `observedAt` และ `fetchedAt` |
| server cache size | 100 พื้นที่ |
| min upstream spacing ของ process | 2 วินาที |

- Snap พิกัดสำหรับ request/cache: `round(value / 0.02) * 0.02` แล้ว format คงที่; แชร์ helper client/server และ clamp ขอบพิกัดให้ valid การทำ grid มีไว้ลดคำขอ ไม่ใช่การอ้างความละเอียดของข้อมูล
- โหลดครั้งแรกเมื่อมี displayPos; จากนั้น refresh เมื่อครบ 15 นาที หรือเมื่อขยับจากตำแหน่งที่ใช้ขอครั้งก่อน >=1km และเปลี่ยน grid โดยห่าง request ก่อน >=60 วินาที
- ถ้าตำแหน่งเปลี่ยนระหว่างรอ ให้จำเฉพาะตำแหน่งล่าสุดแล้วตรวจอีกครั้งเมื่อพ้น cooldown ไม่ตั้ง timer ตามทุก GPS tick
- Map pan/zoom, theme, เปิด/ย่อ sheet, เปลี่ยน travel mode, เลือก Portal และ animation frame **ไม่เป็น trigger** ของ network
- server cache แยกด้วย grid; คำขอพร้อมกันใน grid เดียวแชร์ in-flight Promise เดียว; cache ไม่สดจึงขอ upstream และจำกัดขนาดแบบ LRU
- สำหรับ grid อื่นที่เข้ามาเร็วกว่าช่วง 2 วินาที ให้ตอบ rate-limit แบบ retryAfter ที่เหลือ ไม่สร้างคิวไร้ขอบเขต
- client มี in-flight/cache ที่อยู่นอก component หรือ client singleton เพื่อรอด StrictMode mount-cleanup-remount; cleanup ถอด subscriber/timer และใช้ request generation ป้องกัน response เก่าทับตำแหน่งใหม่ ห้าม abort shared request จน subscriber อีกตัวเสียไปด้วย
- ซ่อนแท็บแล้วหยุด polling/animation; เมื่อกลับมา visible ตรวจ TTL/cooldown ก่อนดึง ไม่ดึงทุก visibility event
- ข้อมูล cache คนละ grid ห้ามเอามาแสดงเป็นข้อมูลของ grid ใหม่; ระหว่างรอพื้นที่ใหม่แสดง “กำลังอัปเดตสภาพอากาศบริเวณนี้” และซ่อนเมฆเดิม ข้อมูลที่ยังไม่ถึงเกณฑ์ย้ายพื้นที่ 1km ถือเป็นบริเวณเดิม
- failed refresh ใน grid เดิมใช้ cache เก่าได้ไม่เกิน 60 นาที พร้อมข้อความ “ข้อมูลเก่า • อัปเดตไม่ได้” และหยุดเมฆเคลื่อนไหว ถ้าเก่ากว่านั้นหรือไม่เคยมีข้อมูล ให้ซ่อนเมฆและแสดง unavailable; ห้ามเปลี่ยนเวลาข้อมูลเก่าเป็นเวลาปัจจุบัน
- ฝั่ง server cache stale ได้เฉพาะพื้นที่เดิมและส่ง `stale: true`; แยก `fetchedAt` (ดึงสำเร็จ) ออกจาก `observedAt` (`dt` ของ provider)
- 401/403 หยุดลอง key ซ้ำอัตโนมัติใน process นี้จน restart; ข้อผิดพลาดทั่วไป retry อัตโนมัติไม่เร็วกว่ารอบ 15 นาที ปุ่มลองใหม่ก็ต้องเคารพ cooldown
- ไม่ใช้ localStorage สำหรับประวัติอากาศ/พิกัด และไม่แชร์ rate limiter กับ routing เดิม

### 4.3 ข้อมูลกลางและการจำแนกอากาศ

เพิ่ม `src/weather/weatherDomain.ts`; DTO สาธารณะไม่มี key หรือ upstream URL:

```ts
type WeatherKind = 'clear' | 'partly-cloudy' | 'cloudy' | 'drizzle'
  | 'rain' | 'heavy-rain' | 'thunderstorm' | 'other' | 'unknown'

type WeatherData = {
  source: 'openweather' | 'demo'
  areaKey: string
  lat: number
  lon: number
  observedAt: number // Unix milliseconds: dt * 1000
  fetchedAt: number // Unix milliseconds, only on successful fetch
  conditionIds: number[]
  kind: WeatherKind
  label: string // คำไทยจาก mapping ของเรา
  cloudPercent: number | null
  rainMmPerHour: number | null
  isDay: boolean | null // suffix d/n จาก icon; ไม่อนุมานจาก Light/Dark
  stale: boolean
}

type WeatherResponse =
  | { ok: true; data: WeatherData }
  | { ok: false; code: 'BAD_REQUEST' | 'METHOD_NOT_ALLOWED'
      | 'WEATHER_NOT_CONFIGURED' | 'WEATHER_AUTH'
      | 'WEATHER_RATE_LIMITED' | 'WEATHER_UNAVAILABLE'; retryAfterSeconds?: number }
```

ใช้ชุดรหัสที่มีในเอกสาร [OpenWeather condition codes](https://openweathermap.org/api/weather-conditions) และจัด priority เมื่อมีหลายสภาพพร้อมกัน:

| ลำดับ | รหัส | kind / ข้อความไทย |
|---|---|---|
| 1 | รหัสกลุ่ม 2xx ที่ provider นิยาม | thunderstorm / ฝนฟ้าคะนอง หรือ ฟ้าคะนอง หากรหัสไม่มีฝน |
| 2 | 502,503,504,522 | heavy-rain / ฝนตกหนัก |
| 3 | 500,501,520,521,531 | rain / ฝนเบา หรือ ฝนปานกลาง/ฝนซู่ ตามรหัส |
| 4 | รหัสกลุ่ม 3xx ที่ provider นิยาม | drizzle / ฝนปรอย (ความหนาแน่นเพิ่มได้ตามระดับ แต่ไม่เกิดสายฟ้า) |
| 5 | 511, รหัส 6xx และ 7xx ที่ provider นิยาม | other / ข้อความไทยตรงสภาพ เช่น หมอก หิมะ หรือฝนเยือกแข็ง; ไม่แปลงเป็นฝนหนัก |
| 6 | 803,804 | cloudy / เมฆมาก หรือ ท้องฟ้าครึ้ม |
| 7 | 801,802 | partly-cloudy / มีเมฆบางส่วน |
| 8 | 800 | clear / ท้องฟ้าโปร่ง |
| 9 | รหัสไม่รู้จักหรือไม่มีรหัสที่แปลได้ | unknown / ไม่ทราบสภาพอากาศ |

ไม่ใช้ clouds.all สูงแทนว่าฝนตก ไม่ใช้ rainMmPerHour สูงสร้างสายฟ้า ถ้า rain หายแต่ weather.id ระบุฝน ให้ยังแสดงฝนตามรหัส
missing `weather`/ไม่มี id ตัวเลขเลย หรือ `dt` invalid ให้ parse fail; รหัสตัวเลขที่ใหม่แต่ไม่รู้จักให้ unknown โดยไม่ crash
field ตัวเลือกหายให้ null; อย่า parse เลขจาก null/empty ให้กลายเป็นศูนย์ ไม่ใส่ค่าปลอมใน live response

## 5. หน้าตา ตำแหน่ง และ animation

### องค์ประกอบที่เพิ่ม

1. **WeatherStatus** แถบเล็กภายใน bottom sheet ใต้ toolbar Light/Dark และก่อน navigation/portal content ใช้สีและ typography tokens เดิม แสดงสัญลักษณ์เล็ก + ข้อความไทย + “ข้อมูลเวลา HH:mm” + เครดิต OpenWeather ห่อบรรทัดได้ เมื่อ sheet ย่อให้ยังเห็นเมฆบนแผนที่ตามพื้นที่ที่มองเห็น
2. **Animated cloud marker** เพียงหนึ่งกลุ่มใกล้หมุดผู้เล่น ใช้ตำแหน่งเดียวกับ displayPos แล้ว offset ไปด้านข้าง/เหนือหมุดเล็กน้อย ไม่กระจายเมฆมั่วทั้งเมือง เพราะ API หนึ่งจุดไม่ได้บอกขอบเขตฝน
3. **WeatherDemoControls** เฉพาะ `demo=1` อยู่ในส่วน details “ทดสอบอากาศ” ใต้ WeatherStatus ให้ย่อได้ ไม่เพิ่มแผงลอยหลายชุด

Leaflet implementation:

- pane ใหม่ชื่อ `aahh-weather`, z-index 350 (เหนือ tiles แต่ใต้ route overlay 400 และ player/Portal markers 600)
- `pointer-events: none` ทั้ง pane/icon; marker `interactive: false`, `keyboard: false` ไม่รับคลิก/drag/focus
- icon footprint ประมาณ 88×72px; anchor เลื่อนกลุ่มเมฆออกจากจุด GPS เช่น `[-12, 100]`; ใน viewport แคบลดได้ถึง 64×56px แต่ไม่ขยายให้เต็มหน้าจอ
- อย่า animate transform ของ DOM ตัว marker ที่ Leaflet ใช้จัดตำแหน่ง ให้ animate `<g>`/wrapper ด้านในเท่านั้น
- สร้าง marker เมื่อมี map + weather + position; เปลี่ยนตำแหน่งด้วย setLatLng, เปลี่ยน icon เฉพาะ kind/day/stale ไม่สร้างใหม่ทุก tick
- อาจแยก helper/renderer ที่คืน DOM/SVG สำหรับ L.divIcon; สร้างจาก static markup และ enum ของเรา ห้าม interpolate ข้อความ provider เป็น HTML
- cleanup marker/pane ที่สร้างและ listener เมื่อ unmount; theme เปลี่ยนด้วย CSS vars ไม่สร้าง L.Map ใหม่และไม่รีเซ็ต route
- marker ถูกซ่อนเมื่อไม่มีข้อมูล, error ไม่มี cache, unknown หรือเกินอายุที่กำหนด; WeatherStatus ยังบอกสาเหตุได้

Animation spec:

| แบบ | การเคลื่อนไหว |
|---|---|
| เมฆ/เมฆบางส่วน | ลอยแนวตั้ง 3–5px ต่อรอบ 5–7 วินาที |
| ฝนปรอย/เบา | เมฆลอย + หยด 3–4 เส้น opacity ต่ำ รอบ 1.2–1.6 วินาที |
| ฝนปานกลาง/หนัก | เพิ่มเป็น 6–9 เส้นและรอบ 0.6–1 วินาที; เมฆหนักเข้มขึ้น |
| ฟ้าคะนอง | สายฟ้า fade เข้า/ออก 1 ครั้งต่อประมาณ 6–8 วินาที เฉพาะบริเวณไอคอน ไม่ flash ทั้งจอ; ไม่มีเสียง |
| stale/reduced motion/hidden tab | ภาพหยุดนิ่งทุกแบบ; สายฟ้าเป็นภาพนิ่งที่จางอ่านออก ไม่กระพริบ |

ใช้ CSS transform/opacity เป็นหลัก ไม่เพิ่ม animation library, Lottie, Canvas, WebGL หรือ image generation สำหรับ functional icon นี้
ใช้ prefix `.aahh-weather-*` และ keyframes ที่ไม่ชนของเดิม เพิ่ม `prefers-reduced-motion: reduce`; label อยู่ในข้อความข้างไอคอน SVG เป็น aria-hidden เพื่อไม่อ่านซ้ำ
ใส่ชื่อสภาพอากาศเป็น accessible text และ aria-live polite เฉพาะสถานะข้อมูล ไม่ประกาศทุกเฟรม

ระวัง sheet สูงขึ้น: MapBottomSheet มี ResizeObserver ส่ง sheetHeight แล้ว recenter/attribution ใช้ค่านี้ ต้องคงกลไกเดิม ถ้าเพิ่มแถบแล้วแผงบน 360×640 ล้น ให้จำกัดความสูงภายในและเลื่อนส่วนเนื้อหาได้ อย่าย้าย HUD/campaign/navigation ใหม่ทั้งหน้า

## 6. Demo และพิกัด

- `/map` และ `/map?demo=1` default เป็นข้อมูล OpenWeather ตามตำแหน่งที่ app ใช้ ซึ่งตอนนี้เป็น GPS จำลองกรุงเทพฯ; **GPS จำลองไม่เท่ากับอากาศจำลอง**
- `?gps=real` ใช้ displayPos จาก watcher เดิม; ไม่มีพิกัดให้แสดง “รอตำแหน่งเพื่อดูสภาพอากาศ” โดยไม่แอบ fallback กรุงเทพฯ
- พิกัดใช้ผู้เล่น ไม่ใช้ศูนย์กลางภาพแผนที่หรือปลายทาง navigation
- demo fixtures ต้องเริ่มก่อน live hook จะยิง request; ค่า query `weather` อ่านได้เฉพาะเมื่อ `demo=1`
- ค่า query: `live` (default), `clear`, `cloudy`, `light-rain`, `heavy-rain`, `thunderstorm`, `stale`, `error`
- fixture mode แสดง “ตัวอย่างอากาศ” ชัดเจน และไม่เรียก OpenWeather; `stale` เป็นฝนเบาเก่า 30 นาทีหยุดนิ่ง, `error` ไม่มีเมฆ
- กลับ `live` ใช้ cache เดิมถ้ายังสด ไม่ force upstream ทุกครั้ง
- กดเลือก fixture แล้ว update เฉพาะ query weather ด้วย setSearchParams แบบรักษา campaign/host/demo/gps และใช้ replace เพื่อไม่เพิ่ม history จำนวนมาก
- `/map?weather=heavy-rain` ที่ไม่มี demo=1 ต้อง ignore fixture ไม่เปลี่ยนค่าถาวร
- `/map?demo=1&gps=real&weather=heavy-rain`: อากาศตัวอย่างใช้ได้ แต่ต้องแยก label ว่า GPS จริง/อากาศตัวอย่าง; ข้อห้าม route simulation กับ GPS จริงของเดิมต้องคงอยู่
- ไม่เพิ่ม demo weather ลง `src/data/map.json` และไม่แก้ demo destination/navigation route เพื่อให้ฟีเจอร์นี้ดูเหมือนสำเร็จ

## 7. ไฟล์และลำดับงานของผู้ implement

| ไฟล์ | หน้าที่ |
|---|---|
| `src/weather/weatherDomain.ts` | DTO, constants, code mapping, coordinate/grid helpers, safe parse |
| `server/weatherMiddleware.ts` | fixed upstream, key, validation, timeout, cache, in-flight/cooldown, sanitized errors |
| `vite.config.ts` | load env + plugin ทั้ง dev/preview ก่อน proxy |
| `tsconfig.server.json` + scripts ที่จำเป็น | ตรวจ server/plugin TypeScript ด้วย Node types |
| `src/weather/weatherClient.ts` | เรียก /api/weather, client cache/in-flight, ไม่มี key |
| `src/hooks/useWeather.ts` | polling, latest position/result, visibility/cleanup, fixture bypass |
| `src/weather/weatherFixtures.ts` | ข้อมูลตัวอย่าง deterministic และ validation query |
| `src/map/weatherMarker.ts` | SVG renderer/Leaflet weather marker ตามข้อ 5 |
| `src/components/WeatherStatus.tsx` | แถบสถานะ/เครดิต/error/retry |
| `src/components/WeatherDemoControls.tsx` | selectors เฉพาะ demo |
| `src/pages/Map.tsx` | ต่อ hook/position/marker/status โดยไม่รื้อ navigation |
| `src/components/MapBottomSheet.tsx` | เพิ่ม optional weatherContent slot ใต้ toolbar |
| `src/theme.css` | weather variables Light/Dark + animation/reduced motion |
| `src/standalone/weather*.test.{ts,tsx}` | tests ตามสเปก |
| `README.md` | วิธีใช้ key ชื่อแปรเท่านั้น, demo, local proxy และข้อจำกัด static deploy |

ลำดับ implement:

1. อ่านแผน/สเปก/คำสั่งส่งต่อครบ ตรวจ git status และส่วนโค้ดที่เกี่ยวข้อง ไม่ clone ใหม่ ไม่เปิด/พิมพ์ key เพื่อตรวจด้วยตา
2. เพิ่ม domain/parser + fixtures และ tests พฤติกรรมแกนหลักก่อน
3. เพิ่ม server middleware + dev/preview plugin + tests ด้วย fake key/fetch; update typecheck ให้ server files อยู่ในขอบเขตจริง
4. เพิ่ม weatherClient/useWeather และ tests เรื่อง cache/StrictMode/ตำแหน่งโดยใช้ fake timer
5. ต่อ WeatherStatus/cloud/demo กับ Map และธีมเดิม; เมื่อ data error ต้องไม่กระทบ routing
6. ปรับ legacy Map/navigation tests ให้ mock weather boundary เท่านั้น รักษา assertions พฤติกรรมเดิม
7. รัน `npm test`, `npm run build` (รวม server typecheck) และ `git diff --check`; แก้ failure ที่เกี่ยวกับงานนี้
8. เปิด local demo ตามสเปก ลอง fixtures ก่อน แล้ว live **หนึ่งคำขอกรุงเทพฯ** ผ่าน endpoint local; อย่าทดสอบ key ด้วยการวาง URL ที่มี key ใน browser หรือส่งเข้า web search
9. ตรวจ dev และ preview ด้วยวิธีในสเปก บันทึกผลจริง/ส่วนที่ยังทดสอบไม่ได้ แล้วส่ง local demo, วิธีลอง และเอกสารอัปเดต

ถ้า Node types ไม่มีใน dependencies ที่ประกาศโดยตรง ให้เพิ่มเฉพาะ `@types/node` devDependency พร้อม lockfile; ไม่เปลี่ยน React/Vite/Leaflet หรือ package manager เพื่อทำ weather
`tsconfig.json` ปัจจุบันมี scope แคบ ห้ามถือว่า build ผ่านแปลว่าตรวจ server แล้ว อาจเพิ่ม `typecheck:server` และเรียกจาก build โดยคงขั้น `tsc && vite build` เดิมไว้

## 8. การส่งมอบและขอบเขตที่ต้องรักษา

- ส่ง URL local `/map?demo=1` และตัวอย่าง `/map?demo=1&weather=thunderstorm` ที่ผู้ใช้ลองได้
- ระบุ tests/build/live check แยกกัน ถ้า key ถูกปฏิเสธให้บอกตรง ๆ และยังส่ง fixture demo ที่ใช้งานได้ ห้ามอ้างว่าเชื่อมสดสำเร็จ
- งานอากาศไม่แก้ CARTO watermark, Light/Dark 2D, การนำทางเดิน/รถ, LINE/AR/reward หรือ backend Portal
- ไม่เพิ่มอุณหภูมิ/AQI/dashboard/ฝนตามเส้นทาง/การแจ้งเตือน background ซึ่งผู้ใช้ไม่ได้ขอ
- **Vite middleware ทำงานแค่ local dev/preview** การ upload `dist` ขึ้น static hosting จะไม่มี endpoint นี้ ต้องวาง server/Worker + runtime secret ใหม่เมื่อผู้ใช้สั่ง deploy ภายหลัง; ห้ามแก้โดยฝัง key ใน client
- ไม่เปลี่ยน `.openai/hosting.json`, publish, สมัครบริการ, ผูกบัตร, rotate key หรือเพิ่มค่าใช้จ่ายในงานนี้
- รอบเขียนแผนนี้ไม่ทดสอบ key จริง ไม่เปลี่ยน source code ไม่รัน build/browser QA ซ้ำโดยไม่จำเป็น

## 9. แหล่งอ้างอิงและจุดที่ยังไม่ยืนยัน

ตรวจเอกสารวันที่ 11 กันยายน 2026; บางหน้า OpenWeather แสดง landing page ต่อ web reader แต่ search index ของโดเมนทางการยังแสดงเนื้อหาเอกสาร ใช้ canonical docs และตรวจ response จริงเฉพาะตอน implement

- [OpenWeather Current Weather](https://openweathermap.org/api/current?collection=current_forecast): endpoint/fields/units
- [OpenWeather condition codes](https://openweathermap.org/api/weather-conditions): รหัสฝน/เมฆ/ฟ้าคะนอง
- [OpenWeather Pricing](https://openweathermap.org/price): free bundle ต่างจาก One Call
- [Vite plugin API](https://vite.dev/guide/api-plugin): pre middleware dev/preview
- [Vite env](https://vite.dev/guide/env-and-mode): key ฝั่ง server และการ restart หลังเปลี่ยน env

ยังไม่ยืนยัน: key นี้ active/สิทธิ์ถูกต้องหรือไม่, response สดที่กรุงเทพฯ, หน้าตา cloud จริงหลัง implement และการ deploy production ซึ่งอยู่นอกขอบเขตรอบนี้
