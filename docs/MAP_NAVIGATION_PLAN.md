# แผนส่งต่อ: AahhMap — ธีมและการนำทาง

สถานะ: Implement ใน local workspace แล้วเมื่อ 10 กันยายน 2026; ใช้เอกสารนี้เป็นขอบเขตและรายการตรวจรับ
จัดทำ: 9 กันยายน 2026
Workspace: `C:\Users\uSeR\Desktop\linemap`
อ่านคู่กับ [สเปกทดสอบ](MAP_TEST_SPEC.md) และ [คำสั่งส่งต่อ](NEXT_MODEL_PROMPT.md)

## 1. ผลลัพธ์ที่ผู้ใช้ต้องการ

ต่อยอดเว็บ Map ปัจจุบันให้ทำครบ 4 อย่าง:

1. มีปุ่ม Light / Dark และเปลี่ยนทั้งภาพแผนที่กับสี UI
2. คำนวณเส้นทางแบบ **เดินเท้าเป็นค่าเริ่มต้น** มีปุ่มเปลี่ยนเป็น **รถ/ถนน**
3. ผู้ใช้เลือกปลายทาง แล้วดูเส้นทางจากตำแหน่งตนเอง พร้อมระยะทาง เวลาโดยประมาณ และคำแนะนำการเดินทาง
4. มีเว็บโหมดทดสอบในกรุงเทพฯ ที่กดเลือกจุดทดสอบและจำลองการเดินทางได้ ไม่ต้องออกไปเดินจริง

ผู้ใช้ยืนยันให้ implement งานตามแผนนี้แล้วในรอบถัดมา เว็บทดสอบอยู่ที่ `/map?demo=1`

## 2. สภาพโค้ดที่ต้องรักษา

- Clone ต้นทาง: https://github.com/aahhtechlab-bit/AahhMap.git
- HEAD ตอนเขียนแผน: `df506677ddc4c62ac55a0a395fd80a817fd0113d`
- **Working tree มีงาน GPS ที่ยังไม่ commit และต้องเก็บไว้**: `README.md`, `src/hooks/useGeolocation.ts`, `src/standalone/map.test.tsx`, `src/standalone/geolocation.test.ts` อย่า reset/checkout ทับ
- Entry จริงคือ `src/main.tsx → src/App.tsx → src/pages/Map.tsx` ภายใต้ BrowserRouter และ React.StrictMode
- `/` และ `/map` เปิด Map; route อื่น redirect กลับ Map โดยรักษา query parameters
- `src/Root.tsx` เป็น entry เก่าของ LINE ไม่ได้ใช้งาน ห้ามนำกลับมา
- `src/data/map.json` มี `coin_balance: null`, `treasures: []` โดยตั้งใจ ไม่มี backend/บัญชี/ระบบรับรางวัลจริง
- GPS ค่าเริ่มต้นเป็น Bangkok จำลอง `lat=13.7466, lng=100.5285, accuracy=10`; `?gps=real` ใช้เครื่องจริง ห้ามทำงานนี้หาย
- `MapMode = 'daily' | 'event'` คือโหมด Portal ไม่ใช่ชนิดการเดินทาง
- เส้นทางเดิมอยู่ใน `Map.tsx`: `L.Routing.control` สำหรับ Event ผ่าน Portal ตามลำดับ nearest-neighbor; อัปเดตเมื่อ GPS ห่างจาก origin เดิมเกิน 30 ม.
- ต้นฉบับใช้ CARTO Voyager, สีแบรนด์ `#ef5128`, UI tokens ใน `src/theme.css`, Leaflet และ inline styles
- ล่าสุดก่อนเขียนแผน `npm test` ผ่าน 11 tests และ `npm run build` ผ่าน ไม่ได้รันทดสอบใหม่ในรอบเขียนเอกสาร
- Public Site เดิมยังไม่รวมงาน GPS ล่าสุด; อย่าอ้างว่า local กับออนไลน์เหมือนกัน

## 3. ขอบเขตที่ล็อกไว้

ทำบน React/Vite/Leaflet เดิม ไม่สร้างโปรเจกต์ใหม่ ไม่เปลี่ยน dependency/lockfileเพื่อจัดธีมหรือ routing
ปรับ `Map.tsx` ได้เฉพาะ wiring ที่จำเป็นต่อฟีเจอร์ใหม่ และคงพฤติกรรม Portal เดิม

คง layout หลัก: แผนที่เต็มจอ, player/coin HUD, mission chips, campaign banner, ปุ่ม recenter, bottom sheet และการลาก/ย่อขยาย
Light Mode ต้องใช้ค่าสีเดิมทุกค่า คง font, ขนาดตัวอักษรเดิม, spacing, radius, icons/marker/tier colors และสีแบรนด์
พื้นที่ใหม่ใช้ tokens และรูปแบบปุ่มเดิม เพิ่มเท่าที่จำเป็น ไม่เพิ่ม sidebar/หน้า landing/หน้า login

ไม่ทำในงานนี้: ค้นหาสถานที่ทั่วโลก/geocoding, เสียงนำทาง, background navigation เมื่อปิดหน้าจอ, offline maps, traffic, ระบบบัญชี/LINE/AR/reward, backend ใหม่, ระบบรองรับผู้ใช้จำนวนมาก
การเลือกปลายทางเฟสนี้ใช้ **แตะบนแผนที่**, **Portal ที่มีอยู่** หรือ **จุดทดสอบ** ไม่อ้างว่ามี search แบบ Google

คำว่า “ถนน” ในคำขอหมายถึง **driving/car routing** ไม่ใช่เปลี่ยนภาพแผนที่เป็นอีกแบบ และ walking ก็อาจผ่านถนนที่อนุญาตคนเดินได้

## 4. UI และค่าเริ่มต้นที่ต้องทำตาม

| ส่วน | พฤติกรรมที่กำหนด |
| --- | --- |
| Theme | สองปุ่ม `Light` / `Dark`; ใช้ `aria-pressed`; เริ่ม light ถ้าไม่มีค่าที่เคยเลือก |
| จดจำ theme | localStorage key `aahhmap-theme`; รับเฉพาะ `light` / `dark`; storage ใช้ไม่ได้ให้ทำงานต่อด้วย state |
| Travel mode | สองปุ่ม `เดิน` / `รถ`; เริ่ม walking **ทุกครั้งที่เปิดหน้าใหม่** ไม่จดจำรถข้าม reload |
| Map mode | daily/event เหมือนเดิม แยก state จาก travel mode |
| เปิดนำทาง | ปุ่ม `นำทางไป…` ใน bottom sheet เปิดเนื้อหานำทางภายใน sheet เดียวกัน |
| เลือกปลายทาง | ปุ่ม `เลือกบนแผนที่` เข้าโหมดเลือกอย่างชัดเจน; tap ครั้งถัดไปบนพื้นแผนที่ตั้ง pin และแสดงพิกัด; drag ไม่ตั้งปลายทาง |
| Portal | เพิ่ม action นำทางไป Portal แยกจาก `เข้า Portal`; ห้ามเปลี่ยนการ pan/เลือก Portal/รับรางวัลเดิม และห้ามซ้อน button ใน button |
| ขอเส้นทาง | เลือกปลายทางแล้วกด `ดูเส้นทาง`; การเปิดแผง/โหลดหน้า/เปลี่ยน theme ไม่ยิง routing |
| Preview | แสดงชื่อ/พิกัดปลายทาง, เดินหรือรถ, ระยะตามเส้นทาง, นาทีโดยประมาณ, รายการคำแนะนำ และ `เริ่มนำทาง` |
| Navigating | แสดงคำแนะนำปัจจุบัน/ถัดไป, ระยะคงเหลือ, เปิดดูทุกขั้นตอนได้ และมี `หยุดนำทาง` |
| ยกเลิก | หยุดงานค้าง ลบ destination route/pin/steps คืน sheet เดิม; ถ้าเดิมอยู่ Event ให้กลับเส้น Event |

วางแถวเครื่องมือใหม่ **ใต้ header/title เดิมของ bottom sheet** เพื่อคงตำแหน่ง HUD และ recenter; ตอน sheet ย่อยังคงส่วนหัวเดิมประมาณ 64px ไม่เปลี่ยนเป็น toolbar
รองรับแถวปุ่ม wrap บนมือถือ ให้พื้นที่แตะอย่างน้อย 44px และ focus ที่มองเห็นได้; ไม่ใช้ hover เป็นวิธีเดียว
เนื้อหา sheet scroll ภายใน และต้องเหลือพื้นที่เหนือ sheet สำหรับ recenter โดยไม่ทับ mission/campaign HUD
เมื่อแสดง NavigationPanel ให้ใช้ shell/handle/การย่อขยายของ sheet เดิม ไม่สร้าง bottom sheet ซ้อนกันสองตัว
ปุ่มใหม่/รายการข้อความต้องไม่ส่ง click ต่อไปตั้งหมุดบนแผนที่

## 5. Theme: เปลี่ยนสีโดยไม่สร้างแผนที่ใหม่

- เก็บ `:root` Light tokens เดิม เพิ่ม `:root[data-theme="dark"]` และตั้ง `document.documentElement.dataset.theme`
- Dark palette ตั้งต้น: background `#121416`, secondary `#171a1e`, surface `#20242a`, surface-sunken `#191d22`, surface-pressed `#2b3038`; text `#f3f4f6` / `#c3c9d2` / `#9da7b5`; border `#424a57`, divider `#343b46`, fills `#292f38` / `#343c48` / `#465161`
- เติม placeholder/disabled/shadow overrides ให้สอดคล้อง; คง primary/LINE green/tier colors เดิม และ `--on-primary: #fff`
- ตั้ง `color-scheme` ให้ตรง theme; ไม่เพิ่มโหมด auto/system ในงานนี้
- Light tiles คง `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- Dark tiles ใช้ `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- เพิ่ม `tileLayerRef`; เปลี่ยนด้วย `tileLayer.setUrl(...)`; **ห้าม destroy/recreate L.Map หรือใส่ theme ลง dependency ของ effect สร้าง map**
- การสลับ theme ต้องไม่เปลี่ยน zoom, center, marker, destination, route, travel mode, simulation หรือยิง routing เพิ่ม
- แต่ง Leaflet popup/tip/attribution และข้อความใหม่ด้วย theme tokens ไม่ใช้ filter invert ทั้งหน้า และไม่เปิด `.leaflet-routing-container` เพื่อใช้หน้าตา default ของไลบรารี
- CARTO แสดง watermark ขอ API key อยู่แล้ว ผู้ใช้ยอมรับให้คงไว้ อย่าขอ key/เปลี่ยนผู้ให้บริการ/ซ่อน watermark ในงานนี้
- Dark basemap ยังอาจมี watermark เช่นกัน หากบริการไม่คืน tiles จริงให้รายงานแยก ห้ามอ้าง visual ผ่านเพียงเพราะปุ่มเปลี่ยนสี

## 6. Routing provider ที่ตรวจแล้ว

ใช้ FOSSGIS/OSRM สำหรับเว็บทดสอบ ไม่ใช้ API key:

```ts
type TravelMode = 'walking' | 'driving'
const ROUTING_ENDPOINTS = {
  walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
  driving: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
} satisfies Record<TravelMode, string>
```

รูปแบบ request: `{endpoint}/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson&steps=true&alternatives=false`
Event หลายจุดใช้ origin + ordered portals ใน request เดียว ไม่ยิงหนึ่ง request ต่อ Portal
**ห้ามเปลี่ยนแค่คำ driving เป็น walking บน server เดิม** ชุดข้อมูลของ `/routed-foot` กับ `/routed-car` เป็นตัวเลือกพฤติกรรมจริง

ผลตรวจจากเครื่องนี้เมื่อ 9 ก.ย. 2026 สำหรับ origin `13.7466,100.5285` → destination `13.7460,100.5303`:

| Mode | HTTP / code | ระยะ ณ เวลาตรวจ | เวลา / steps | CORS |
| --- | --- | --- | --- | --- |
| walking | 200 / Ok | 218.9 ม. | 175.2 วินาที / 5 | `*` |
| driving | 200 / Ok | 2712.7 ม. | 228.9 วินาที / 6 | `*` |

ตัวเลขเป็นหลักฐานว่า provider ใช้งานได้และสอง mode ต่างกัน ไม่ใช่ expected value ตายตัวของ live test
PowerShell Invoke-WebRequest เคยเจอ TLS HandshakeFailure แต่ Node fetch สำเร็จทั้งสอง endpoint; อย่าปิด TLS verification หรือสรุปว่า browser ใช้ไม่ได้จาก error ของ PowerShell เพียงอย่างเดียว

ทำ provider adapter ไว้จุดเดียวเพื่อเปลี่ยนเซิร์ฟเวอร์ภายหลัง ทุก route request ผ่าน adapter นี้
เงื่อนไขบริการ: จำกัด 1 request/วินาที และไม่ให้ใช้งานหนัก; ใส่ attribution/link ผู้ให้บริการและลิงก์ “แก้ไขแผนที่” ตาม policy โดยคง CARTO/OSM attribution เดิม
URL แก้ไขแผนที่ใช้ `https://www.openstreetmap.org/fixthemap` ตรวจให้ใช้ได้ในงานทดสอบจริง
การคุมคำขอในหนึ่ง browser ไม่ใช่หลักประกันรองรับผู้ใช้จำนวนมาก ห้ามอ้างว่า production-ready

### สัญญาการส่งคำขอ

- Shared scheduler หนึ่งตัวระดับ module ต่อหน้าเว็บสำหรับทั้ง Event และ destination; เริ่ม request ห่างกันอย่างน้อย **1100ms** และมี in-flight ได้ครั้งเดียว
- rapid changes ใช้ latest-wins: รวมงานที่ยังรอ ส่งเฉพาะ target/mode ล่าสุด; debounce 300ms; ยกเลิกงานเก่าด้วย AbortController และตรวจ generation/requestId ก่อนแก้ state
- module scheduler ต้องคง rate spacing ผ่าน StrictMode mount/cleanup/remount; clear เฉพาะ subscriber/งานของ hook นั้น ไม่ทำให้ timer/request ของงานใหม่เสีย
- timeout 15 วินาที; ไม่ retry วนเอง; 429 ใช้ Retry-After ถ้ามี มิฉะนั้นพัก 60 วินาทีและให้ผู้ใช้กด retry
- real GPS reroute เมื่อห่างจาก origin ที่ใช้คำนวณครั้งล่าสุดอย่างน้อย 30 ม. และเว้นอย่างน้อย 15 วินาที; ใช้ตำแหน่งล่าสุดเมื่อส่งจริง ไม่เก็บ queue ทุก GPS tick
- ระหว่างเลือก mode ใหม่/target ใหม่ ล้างหรือระบุ route เก่าว่ากำลังคำนวณใหม่ ห้ามแสดงเส้นรถพร้อม label ว่าเดิน
- HTTP ไม่สำเร็จ, `NoRoute`, `NoSegment`, routes ว่าง, JSON ไม่ถูกต้อง, network error ต้องเข้าสู่ error; ไม่มีการสลับเดินเป็นรถอัตโนมัติ และไม่มีเส้นตรงปลอมแทนเส้นทาง
- network/GPS ยังไม่พร้อม: คงปลายทางให้แก้หรือ retry ได้; ปุ่มดูเส้นทาง disabled เมื่อไม่มีพิกัดต้นทาง

## 7. Architecture ที่ให้ใช้เพื่อลดความผิดพลาด

เปลี่ยน route orchestration เดิมให้มีเจ้าของเดียว: fetch OSRM ผ่าน adapter แล้ววาด GeoJSON ด้วย Leaflet; ไม่ปล่อย `L.Routing.control` เดิมยิง request คู่กับระบบใหม่
ถอด block เก่า `spliceWaypoints`, effect สร้าง routing control และ types/refs ที่ไม่ใช้; คงส่วน GPS marker/accuracy/proximity เดิมไว้
ไม่ต้อง uninstall leaflet-routing-machine หรือแก้ chunk config เพื่อ cleanup; ไม่แตะ `leafletGlobal.ts`/ลำดับ initialization โดยไม่จำเป็น

ข้อมูลหลัก:

```ts
type MapTheme = 'light' | 'dark'
type Destination = {
  id: string; name: string; lat: number; lng: number
  source: 'map' | 'portal' | 'demo'
}
type RouteStep = {
  id: string; instruction: string; distanceM: number; durationS: number
  geometry: [number, number][] // GeoJSON [lng, lat]
  maneuver: { type: string; modifier?: string; exit?: number; location: [number, number] }
}
type RouteResult = {
  mode: TravelMode; geometry: [number, number][]
  distanceM: number; durationS: number; steps: RouteStep[]
}
// สถานะปลายทาง แยกจาก mapMode และ fetchStatus:
type NavigationPhase = 'idle' | 'selecting' | 'preview' | 'navigating' | 'arrived'
type FetchStatus = 'idle' | 'loading' | 'ready' | 'error'
```

- Domain/Leaflet ใช้ `lat,lng`; URL และ GeoJSON ใช้ `lng,lat` แปลงที่ boundary ให้ชัดเจนครั้งเดียว
- `activeRouteTarget`: destination ที่ผู้ใช้ขอเส้นทางแล้วมี priority เหนือ Event; ถ้าไม่มี destination route และอยู่ Event ให้ใช้ origin+ordered portals; ถ้าไม่เข้าเงื่อนไขทั้งสอง ไม่ขอ route
- เมื่อผู้ใช้กด `นำทางไป…` ให้พัก Event ชั่วคราวตั้งแต่ selecting; cancel/close คืน Event ตาม mapMode เดิม
- mapMode อาจเปลี่ยนระหว่างนำทาง แต่ห้ามแย่ง destination route; ใช้ค่าปัจจุบันเมื่อ cancel เพื่อเลือกว่าจะคืน Event หรือไม่
- แสดง route layer ได้ชุดเดียว (outline + เส้นสีแบรนด์); destination pin แยกจาก player และ Portal layers
- fitBounds เฉพาะผลเส้นทางใหม่จากผู้ใช้เลือกปลายทาง/กด mode ใหม่ ไม่ fitBounds ทุก GPS tick/ทุก theme change; เคารพ userPannedRef และ recenter
- normalize `routes[0]`, รวม steps ของ legs ตามลำดับ; distanceM/durationS มาจาก provider ไม่ใช้ haversine แทนระยะตามทาง
- หาก provider snap จุดเลือกออกไปไกล ให้บอกระยะจากจุดที่เลือกถึงจุดสิ้นสุดเส้นทาง; ไม่วาดเส้นเชื่อมออกนอกทางแล้วอ้างว่าเดินได้

### คำแนะนำและความคืบหน้า

สร้าง formatter ไทยจาก maneuver จริง: depart → เริ่มเดินทาง, turn left/right → เลี้ยวซ้าย/ขวา, slight/sharp → เบี่ยง/เลี้ยวตาม modifier, continue/new name → ตรงต่อไป, roundabout → ใช้วงเวียนและ exit ถ้ามี, arrive → ถึงปลายทาง
รองรับ merge/fork/ramp/end of road สำหรับ driving; type ที่ไม่รู้จักใช้ “เดินทางต่อ” พร้อมชื่อทางถ้ามี ห้ามแต่งคำสั่งเลี้ยวเอง
ใช้ React text rendering/DOM textContent กับชื่อจากผู้ใช้/provider ไม่ใส่ชื่อดิบลง bindPopup HTML

วัด progress จาก GPS ที่ฉายลง route segments (ระยะเป็นเมตรด้วย local projection + cumulative segment lengths) ไม่เลือก step ด้วยชื่อถนนหรือระยะเส้นตรงอย่างเดียว
ค้นหา segment ใกล้ตำแหน่ง progress เดิมก่อน; ถ้าใกล้หลาย segment ของถนนวน/ตัดกัน ให้เลือก progress ต่อเนื่อง ไม่กระโดดไปท้าย route
step index คำนวณจาก cumulative geometry ของ steps; แสดง next maneuver และระยะไป maneuver; remaining distance = ระยะ polyline ที่เหลือ
เวลา remaining เป็นประมาณการตาม progress โดยอิง duration ของ provider ห้ามอ้างว่ารวม traffic
GPS accuracy >50 ม. ให้แจ้งรอสัญญาณที่แม่นขึ้น ไม่ข้าม step/ประกาศถึงปลายทางจาก fix นั้น
ประกาศ arrived เมื่อใกล้ endpoint ภายใน 25 ม. และ progress ผ่านอย่างน้อย 90%; stop simulation/rerouting แต่คงสรุปให้ผู้ใช้กดปิด
เมื่อ reroute สำเร็จให้ reset progress ให้สัมพันธ์กับ route geometry ใหม่ ไม่ใช้ step index เก่าต่อ

## 8. ไฟล์ที่คาดว่าจะเปลี่ยน

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/pages/Map.tsx` | wiring state/GPS/selection, route target, tile/route refs, ใช้ panel และ hooks ใหม่ |
| `src/components/MapBottomSheet.tsx` | เพิ่ม toolbar และ navigation content slot ใน sheet shell เดิม; คง Portal behavior |
| `src/components/NavigationPanel.tsx` ใหม่ | destination, preview, text steps, current instruction, cancel/error; ใช้ ui.tsx เดิม |
| `src/hooks/useMapTheme.ts` ใหม่ | theme state/storage/data-theme |
| `src/theme.css` | dark overrides และ Leaflet styling; light เดิมไม่เปลี่ยน |
| `src/utils/mapDefaults.ts` | เพิ่ม dark tile URL/theme mapping; ไม่เปลี่ยน GPS origin |
| `src/map/routingClient.ts` ใหม่ | endpoints, scheduler, timeout, error, response normalization |
| `src/map/navigationDomain.ts` ใหม่ | types, Thai instructions, progress/distance helpers; pure functions |
| `src/hooks/useNavigation.ts` ใหม่ | route target lifecycle, request generation, progress, reroute gates |
| `src/hooks/useNavigationSimulation.ts` ใหม่ | demo position/timer/start/pause/reset/end; ไม่ส่ง network เอง |
| `src/map/demoDestinations.ts` ใหม่ | จุดทดสอบแยกจาก rewards/portals |
| `src/standalone/*.test.{ts,tsx}` | tests ใหม่; tests ที่อยู่นอกโฟลเดอร์นี้อาจไม่ถูกรันตาม config ปัจจุบัน |
| `README.md` | วิธีเปิด test, GPS จริง, ข้อจำกัด provider และวิธีทดสอบ |

ชื่อไฟล์ย่อยรวมกันได้หากเล็ก แต่ต้องแยก provider/pure logic ออกจาก UI และไม่ย้ายงานทั้งหมดไปกองใน Map.tsx
ไม่แก้ api.ts/map.json ให้มี Portal ปลอม และไม่แตะ source หน้าอื่นที่ไม่ได้อยู่ใน build

## 9. ลำดับลงมือพร้อมจุดตรวจ

1. **สำรวจเฉพาะ baseline**: git status/diff และไฟล์ที่ระบุ; รักษางาน GPS ค้างอยู่; บันทึก screenshot Light เดิมหากเครื่องมือ browser พร้อม ไม่ clone/install ใหม่ถ้า node_modules มีแล้ว
2. **Theme**: tokens + storage + two buttons + tile ref/setUrl; ตรวจกลับ Light แล้ว layoutเดิม และ navigation state ไม่ถูก reset
3. **Routing core**: types + provider adapter + scheduler + formatter + fixtures/tests; ใช้ endpoints ที่ยืนยันแล้ว; ยังไม่ทำ geocoding/backend
4. **Destination flow**: selection/preview/steps/start/cancel และ route owner เดียว; ย้าย Event มาใช้ adapter เดียวกัน แล้วตรวจว่าไม่มี legacy control ยิงซ้ำ
5. **Progress/GPS**: รวม native/simulated position เข้าทางเดียวกับ marker/proximity; real reroute gates และ cleanup; theme ไม่แตะ GPS
6. **Demo**: ทำตาม MAP_TEST_SPEC.md; จำลองตาม route geometry ที่ได้ ไม่สร้างเส้นทางปลอม; demo ปิดได้และไม่กระทบรางวัล
7. **ส่งมอบ**: tests ที่เกี่ยวข้อง + `npm test` + `npm run build`; ทำ browser smoke ตามตารางในสเปกและรายงานข้อจำกัดที่พบ

หลังผ่านแต่ละส่วนให้ทำส่วนถัดไป ไม่ทำ polish/เพิ่ม scope/รันทดสอบซ้ำโดยไม่มีเหตุผล
ไม่แก้ปัญหา CARTO watermark เป็นงานแถม; ไม่สร้าง/เผยแพร่ Site ใหม่หรือเปลี่ยน audience จากคำสั่งทำเว็บทดสอบ
รอบ implement ให้เปิด local demo ที่รันได้และคง server ให้ผู้ใช้ทดสอบ; ถ้าผู้ใช้สั่งเผยแพร่เพิ่ม ค่อยใช้ existing `.openai/hosting.json` และขั้นตอน Sites สำหรับ Site เดิม

## 10. แหล่งอ้างอิงและข้อจำกัด

- [FOSSGIS usage policy และ foot/car coverage](https://routing.openstreetmap.de/about.html)
- [OSRM route API: steps, geometry, coordinates](https://project-osrm.org/docs/v5.24.0/api/)
- [CARTO style URLs และข้อกำหนด API key](https://github.com/CartoDB/basemap-styles)

แผนนี้เป็นเว็บทดสอบการนำทาง ไม่ได้สัญญาความเทียบเท่า Google Navigation หรือความพร้อมรองรับคนจำนวนมาก
อย่าใช้ผล mocked tests เป็นหลักฐานว่า live provider หรือ dark tiles ใช้งานได้ ต้องแยกผลแต่ละส่วนในรายงานสุดท้าย
