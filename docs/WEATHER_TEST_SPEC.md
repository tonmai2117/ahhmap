# AahhMap: สเปกทดสอบ OpenWeather และเมฆแอนิเมชัน

สถานะ: เกณฑ์สำหรับ implementation ถัดไป ยังไม่มี weather demo ถูกสร้าง
อัปเดต: 11 กันยายน 2026
อ่าน [แผนหลัก](WEATHER_IMPLEMENTATION_PLAN.md) ก่อนทำงาน

## 1. URL และผลที่ต้องได้

| URL | ผลที่ต้องได้ |
|---|---|
| `/map` | สภาพอากาศตาม GPS จำลองกรุงเทพฯ มีเครดิต/เวลาข้อมูล ไม่มี fixture selector |
| `/map?demo=1` | default live weather + demo navigation เดิม + ส่วนทดสอบอากาศที่ย่อได้ |
| `/map?demo=1&weather=clear` | ฟ้าโปร่ง ไม่มีฝน/สายฟ้า แสดงว่าเป็นตัวอย่าง ไม่เรียก weather API |
| `/map?demo=1&weather=cloudy` | เมฆครึ้มลอยช้า ไม่มีฝน/สายฟ้า |
| `/map?demo=1&weather=light-rain` | เมฆและหยดฝนบาง ๆ |
| `/map?demo=1&weather=heavy-rain` | เมฆเข้มและฝนถี่ **ไม่มีสายฟ้า** |
| `/map?demo=1&weather=thunderstorm` | เมฆ ฝน และสายฟ้า fade เป็นช่วง ๆ |
| `/map?demo=1&weather=stale` | ข้อมูลตัวอย่างเก่า 30 นาที ข้อความข้อมูลเก่า เมฆหยุดนิ่ง |
| `/map?demo=1&weather=error` | ข้อความอากาศไม่พร้อม ไม่มีเมฆ แต่ map/navigation ยังใช้งานได้ |
| `/map?demo=1&weather=live` | กลับข้อมูล OpenWeather จริง ใช้ cache ถ้ายังสด |
| `/map?weather=heavy-rain` | ignore weather fixture เพราะไม่มี demo=1 |
| `/map?gps=real` | ใช้ GPS watcher เดิม; ถ้าไม่มีตำแหน่งต้องไม่ใช้กรุงเทพฯแทน |
| `/map?demo=1&gps=real&weather=heavy-rain` | อากาศตัวอย่างกับ GPS จริง แสดงแยกกัน; route simulation ยัง disabled |
| `/map?campaign=abc&host=xyz&demo=1&weather=cloudy` | campaign/host/gps/demo อยู่ครบเมื่อเปลี่ยน fixture, banner/controls ไม่ทับ |

ลิงก์ใช้ port ของ server เดิม เช่น `http://127.0.0.1:5173` ไม่สแกนหา port ไม่เปิด dev หลายตัว ถ้า key/config เปลี่ยนให้ restart เฉพาะ server ของโปรเจกต์ที่ระบุได้

## 2. Fixtures

เก็บ `src/weather/weatherFixtures.ts` ไม่เพิ่มใน Portal dataset, ไม่ใช้ค่าจริงจากบัญชี/ผู้ใช้
ตัว fixture response มี `source:'demo'`, พิกัดจาก displayPos/grid, เวลาสร้างจาก injectable clock เพื่อให้ deterministic tests

| Fixture | conditionIds | rainMmPerHour | cloudPercent |
|---|---|---|---|
| clear | [800] | null | 0 |
| cloudy | [804] | null | 100 |
| light-rain | [500] | 0.4 | 85 |
| heavy-rain | [502] | 10 | 100 |
| thunderstorm | [202] | 8 | 100 |
| stale | [500] | 0.4 | 85 |

stale: observedAt/fetchedAt = clock - 30 นาที, stale=true; error ไม่มี WeatherData เลย
ปุ่มเลือกตัวอย่างเปลี่ยนเฉพาะ weather query; refresh URL แล้วยังคง fixture ตาม query แต่ไม่ save preference นี้ใน localStorage
ไม่ใส่ key, appid หรือ URL ที่มี key ใน fixtures

## 3. Tests อัตโนมัติที่จำเป็น

ใช้ Vitest/Testing Library เดิม, ไม่ติดตั้ง test framework ใหม่, ไม่มี network จริงใน `npm test`
ไฟล์ server tests ใช้ `// @vitest-environment node` ส่วน UI ใช้ jsdom เดิม
คืนค่า mocks/timers/cache/visibility และ cleanup component ทุก test; ออกแบบ factory/reset เฉพาะสำหรับ state ของ tests ไม่ให้ test หนึ่งบังอีก test

### Domain/parser

- 202 เป็น thunderstorm; 502/522 เป็น heavy-rain โดยไม่มีฟ้าผ่า; 500 เป็น rain แบบเบา; 501 ปานกลาง; 3xx เป็น drizzle
- [800,202] เลือก thunderstorm; [804,502] เลือก heavy-rain ไม่ขึ้นกับลำดับ array
- 804 เมฆครึ้ม, 801/802 เมฆบางส่วน, 800 ฟ้าโปร่ง; 7xx/6xx/511 ไม่ถูกแปลงเป็นฝน/ฟ้าคะนองทั่วไป
- `rain` ไม่อยู่แต่ id=500 ยังแสดง rain; `clouds.all=100` กับ id=804 ไม่ถือว่าฝนตก
- id ไม่รู้จักเป็น unknown; missing weather ids/dt invalid เป็น parse error; optional values เป็น null ไม่ NaN/ศูนย์ปลอม
- dt วินาทีแปลงเป็น milliseconds ถูก; provider time ไม่ถูกแทนด้วย fetch time
- grid snapping: พิกัดใกล้กันได้ key เดียว, ต่าง grid ไม่ cache ปน, ค่าขอบโลก valid, lat/lon ไม่สลับ

### Middleware

- ทดสอบด้วย fake key `test-only-not-a-real-key` และ mock fetch; assert URL host/path/query ภายใน test ได้เพราะเป็น fake key เท่านั้น
- GET `/api/weather` intercept ก่อน proxy; path `/api/other` → next; `/api/weather-extra` ไม่ถูกจับ; POST →405; missing/blank/NaN/Infinity/out-of-range →400 ไม่มี upstream
- key ไม่มี →503, 401/403 →WEATHER_AUTH หยุด auto upstream, 429 →cooldown พร้อม Retry-After, timeout/5xx/invalid JSON →WEATHER_UNAVAILABLE
- valid request → normalized DTO ไม่มี key, appid, raw upstream body หรือ stack
- same grid ภายใน 15 นาทีและ concurrent requests → upstream ครั้งเดียว; หลัง TTL ขอใหม่; cache คนละพื้นที่ไม่ปน; จำกัด size
- failed refresh grid เดิมใช้ stale ภายใน60นาทีได้โดยคงเวลาข้อมูลเดิม, เกิน60นาทีไม่ใช้; พื้นที่ใหม่ไม่เอา stale คนละพื้นที่มาแสดง
- ค่า Retry-After ทั้งเลขและ HTTP-date; ระหว่าง cooldown ไม่มี upstream; ต่าง grid ที่เร็วกว่า2s ถูกจำกัดโดยไม่สร้างคิวยาว
- Abort/disconnect ของ client หนึ่งไม่ยกเลิก shared upstream ของ client อื่น

### Hook/client และ regression

- valid first position → request; null position →ไม่มี request
- StrictMode mount/cleanup/remount ทำให้ upstream งานเดียว ไม่เกิด duplicate และไม่ setState หลัง unmount
- polling 15 นาที; GPS/simulation หลาย tick ใน grid เดิม/ก่อน60s ไม่ขอเพิ่ม
- movement >=1km และเปลี่ยน grid →ใช้ตำแหน่งล่าสุดหลัง cooldown; response ของพื้นที่เก่ามาทีหลังไม่ทับข้อมูลใหม่
- hidden tab หยุด polling; visible ตรวจ TTL; unmount เก็บกวาด timer/listener
- เปลี่ยน Light/Dark, travelMode, pan, sheet ไม่ขอ weather เพิ่ม ไม่รีเซ็ต route
- fixture ทุกแบบรวม error/stale ตั้งแต่ initial mount → weather request=0; กลับ live ใช้ cache ตาม TTL
- ข้อมูลผิด/ล่มไม่ทำให้หมุด GPS, เดิน/รถ, destination, ปุ่ม recenter หรือ Portal หาย
- legacy `map.test.tsx` มี `expect(fetch).not.toHaveBeenCalled()` ให้ mock weatherClient/hook boundary ใน tests เดิมเพื่อคงความหมายว่าไม่เรียก backend/LINE โดยไม่ได้ตั้งใจ ห้ามลบ assertion เฉย ๆ
- navigationFlow/mapTheme tests ต้อง mock weather เพื่อไม่เผลอใช้ key/บริการจริง; เพิ่ม tests weather flow แยกอย่างน้อยหนึ่งกรณีของการทำงานร่วมกัน

### UI/animation

- WeatherStatus มี label ไทย, เวลาข้อมูล, เครดิต source; live data + GPS จำลอง ต้องไม่ติดป้ายว่าอากาศตัวอย่าง
- heavy-rain ไม่มี lightning element; thunderstorm มี; unknown/error ไม่มีภาพฝนหลอก
- fixture selectors มี label/keyboard access และอยู่เฉพาะ demo; query อื่นไม่ถูกล้าง
- marker มี pointer-events none, ไม่ keyboard-focusable; map click picking/drag ทำงานต่อ
- reduced motion และ stale ใช้สถานะหยุด animation; การเคลื่อนไหวใช้ wrapper ภายใน ไม่เขียนทับ transform ของ Leaflet

ไม่ทำ snapshot tests ของ CSS ทั้งไฟล์และไม่เพิ่ม tests ที่ตรวจ implementation ตรง ๆ โดยไม่จับพฤติกรรม

## 4. การตรวจ build และ key

1. `npm test` ไม่มี network จริงและผ่าน suite เดิมทั้งหมดพร้อม tests ใหม่
2. `npm run build` ผ่าน TypeScript ของ client + server/plugin แล้วจึง Vite build; ถ้าเพิ่ม `typecheck:server` ต้องตรวจจริง ไม่ปล่อยเป็น script ที่ไม่เคยเรียก
3. `git diff --check` ผ่าน
4. `git check-ignore -- .env.local` ต้องยัง match
5. ตรวจเฉพาะ output สาธารณะ `dist` ว่าไม่มีค่าจริงของ key: script อ่าน key ใน memory แล้วรายงานเพียง PASS/FAIL ห้ามใส่ key ใน command argument, grep output, screenshot หรือ report; ใช้ sentinel fake key ใน automated tests
6. client URL/network ต้องมีเพียง `/api/weather?lat=...&lon=...`; ไม่มี browser request ไป OpenWeather ที่มี appid

## 5. Local acceptance check หลัง implement

ตรวจเฉพาะขอบเขตนี้เมื่อผู้ใช้สั่งให้ทำตามแผน ไม่เปิด browser QA ในรอบเขียนแผน

| Viewport | สิ่งที่ต้องดู |
|---|---|
| 390×844 | Light/Dark, cloud animation ทั้ง4แบบ, แผงเปิด/ย่อและแถบข้อมูลอ่านได้ |
| 360×640 | campaign+demo, navigation steps ยาว, weather controls ย่อได้/เลื่อนภายใน, ปุ่มไม่หลุดจอ |
| 1440×900 | mapเต็มพื้นที่, เมฆไม่บังหมุด/route/recenter, attribution กับ sheet ไม่ซ้อน |

1. เริ่ม `/map?demo=1&weather=thunderstorm` → heavy-rain → light-rain → cloudy → stale/error; ยืนยัน source ตัวอย่างและไม่ยิง upstream
2. ตรวจเมฆเคลื่อนไหวจริงโดยดูสองจังหวะ; reduced motion เป็นภาพนิ่ง; อย่าสรุปว่า animate ผ่านจาก screenshot เดียว
3. ขณะ fixture แสดง ลองนำทาง A เดิน/รถหรือใช้ route mock ใน tests, เลื่อนแผนที่, recenter, ย่อ sheet; weather ไม่ยึดคลิกและ route ยังทำงาน
4. กลับ live แล้วทำ live request กรุงเทพฯหนึ่งครั้งผ่าน local endpoint; หากได้200ให้เช็ก field/timeและแสดงตามข้อมูลจริง ไม่บังคับว่ากรุงเทพฯต้องฝนตกในวันทดสอบ
5. รีเฟรชหรือเปลี่ยนธีมภายใน TTL ต้องไม่เพิ่ม upstream call; ใช้ injected-fetch spy ใน tests พิสูจน์จำนวน upstream เพราะ browser Network มองเห็นเพียง local request
6. ถ้า provider ปฏิเสธ key/ล่ม ให้รายงาน status แบบ sanitized หนึ่งครั้งและหยุดลองซ้ำถี่ ส่ง fixture demo พร้อมผลว่า live ยังไม่ผ่าน
7. ตรวจ `npm run preview` ด้วย fake upstream ใน integration test (เริ่ม `vite.preview` port0 ภายใน testแล้วปิดหลังเสร็จ) เพื่อพิสูจน์ว่า `/api/weather` ไม่ตก SPA/proxy และไม่ใช้ keyจริง; ถ้าทำ manual preview แทน ต้องระบุ portชัดเจน ไม่ยิง live ซ้ำโดยไม่จำเป็น และปิดเฉพาะ preview ที่ agent สร้าง
8. GPSจริง: อย่ากดให้สิทธิ์ location แทนผู้ใช้ ถ้ายังไม่ได้อนุญาตให้ทดสอบผ่าน mocked GPS และรายงานว่า device GPS ยังไม่ยืนยัน

## 6. รูปแบบรายงานรับงาน

- ฟีเจอร์ที่ทำเสร็จและ URL local demo
- วิธีเลือกตัวอย่างอากาศ/กลับข้อมูลจริง
- จำนวน tests และผล build พร้อมแยกว่าทดสอบ mock อะไรและ live อะไร
- สถานะ key/live ตามผลจริงเท่านั้น ไม่แสดง key และไม่สรุปว่าเป็นปัญหา key จาก offline อย่างเดียว
- ข้อจำกัดที่ยังมีจริง: ข้อมูลระดับพื้นที่, cache15นาที, CARTO watermarkเดิม, GPSจริงยังไม่ได้ทดสอบถ้าไม่มีสิทธิ์ และ local middleware ยังไม่ใช่ production backend
- งานขึ้นเว็บออนไลน์และค่าใช้จ่ายยังไม่ได้รับมอบหมาย ไม่เปลี่ยนขอบเขตเอง
