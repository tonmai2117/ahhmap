# สเปกเว็บทดสอบและเกณฑ์รับงาน AahhMap

ใช้คู่กับ [แผนหลัก](MAP_NAVIGATION_PLAN.md) — demo ถูก implement ใน local workspace แล้ว เอกสารนี้เป็นเกณฑ์ตรวจรับและ regression test

## 1. ลิงก์ที่ต้องเปิดได้หลัง implement

| URL | ผลที่ต้องได้ |
| --- | --- |
| `/map?demo=1` | โหมดทดสอบ, GPS จำลองกรุงเทพฯ, walking default, จุดทดสอบ A, ปุ่มเริ่ม/พัก/รีเซ็ตการจำลอง |
| `/map` | Map ปกติพร้อม theme/travel/navigation; GPS Bangkok ตาม baseline; ไม่มีปุ่มเดินจำลองหรือจุดทดสอบ A |
| `/map?gps=real` | ใช้พิกัดเครื่องจริง ขอสิทธิ์ location และรองรับ error เดิม |
| `/map?demo=1&gps=real` | แสดงจุดทดสอบ แต่ใช้ GPS จริง; ปิดปุ่มจำลองพร้อมเหตุผล “ใช้ GPS จริงอยู่” เพื่อไม่ผสมตำแหน่ง |
| `/map?campaign=abc&host=xyz&demo=1` | รักษา campaign/host; controlsไม่ทับ banner และเปลี่ยนธีมไม่ล้าง query |

ใช้ port เดิมที่ dev server พิมพ์ เช่น `http://127.0.0.1:5173/map?demo=1`; ถ้ามี server เดิมให้ใช้ต่อ ไม่เปิดหลาย instance
light/dark เป็น localStorage preference ไม่ต้องมี theme query; travel mode กลับ walking เมื่อ reload
ต้องแสดงข้อความสั้น “โหมดทดสอบ • GPS จำลอง กรุงเทพฯ” ใน demo และบอก GPS จำลองใน navigation panel ปกติเมื่อไม่ได้ใช้ `gps=real`

## 2. ข้อมูลทดสอบที่กำหนด

Origin ใช้ของเดิม `13.7466,100.5285`, accuracy 10 ม. ทุกส่วนรับจาก effectivePosition เดียวกัน
เก็บ destination นี้ใน `src/map/demoDestinations.ts` ไม่เพิ่มลง `src/data/map.json`:

```ts
export const DEMO_DESTINATIONS = [{
  id: 'bangkok-test-a',
  name: 'จุดทดสอบ A (กรุงเทพฯ)',
  lat: 13.7460,
  lng: 100.5303,
  source: 'demo' as const,
}]
```

นี่เป็นจุดพิกัดสำหรับทดสอบ ไม่อ้างชื่อร้าน/สถานที่จริงและไม่ใช่ Portal รับเหรียญ
origin→A ได้ walking ~219 ม. และ driving ~2.71 กม. ณ วันที่ตรวจแผน; live data อาจเปลี่ยน ห้าม assert เลขเป๊ะใน network tests

## 3. วิธีทดสอบที่ผู้ใช้ต้องทำได้เอง

1. เปิด `/map?demo=1` → เห็นตัวเองอยู่กรุงเทพฯ, walking ถูกเลือก, ไม่มีคำขอ routing จนกดดูเส้นทาง
2. เปิด `นำทางไป…`, เลือก `จุดทดสอบ A (กรุงเทพฯ)`, กด `ดูเส้นทาง`
3. เห็นเส้นตามเครือข่ายทางจริง, ระยะ/เวลา, ขั้นตอนภาษาไทย; กด `เริ่มนำทาง`
4. กด `เริ่มจำลอง` → marker เดินตามเส้น, ระยะคงเหลือลดและคำแนะนำเปลี่ยน; ใช้เวลาประมาณ 30 วินาทีถึงปลายทาง
5. `พัก` หยุดตำแหน่งไว้จริง; `เริ่มจำลอง` เดินต่อจากจุดเดิม; `รีเซ็ต` คืน origin ของ route และ progress เริ่มต้นโดยไม่ยิง routing ใหม่
6. ถึงปลายทางแล้วเห็น “ถึงปลายทางแล้ว”; กดปิดคืน sheet เดิม
7. ทดลอง origin→A อีกครั้ง เลือก `รถ` → ขอคนละ endpoint และคำนวณใหม่ ห้ามใช้ route เดิมพร้อมเปลี่ยนแค่ label
8. สลับ Dark/Light ระหว่างมีเส้นทาง → tilesและ UI เปลี่ยน แต่เส้น/หมุด/zoom/ปลายทาง/โหมดเดินทาง/การจำลองไม่หาย
9. เลือกปลายทางอื่นด้วย `เลือกบนแผนที่` แล้ว tap → pinเปลี่ยน, preview แสดงพิกัดใหม่; การลากแผนที่ไม่ตั้ง pin ใหม่เอง

## 4. กติกาการจำลอง

- เปิดเฉพาะ `demo=1` และไม่ใช้ `gps=real`; ไม่เปิดจำลองอัตโนมัติ
- ใช้ geometry ของ route ที่ตอบสำเร็จจริง ทั้งเดินและรถ ไม่มี fallback เส้นตรง; ให้เริ่มได้เฉพาะ route พร้อมใช้งาน
- สร้าง cumulative segment lengths แล้ว interpolate ตามระยะ; ความเร็วจำลอง = totalDistance/30 เมตรต่อวินาที, timer 500ms, clamp ที่จุดสุดท้าย
- ใช้ route progress เริ่มจาก 0 ถึง totalDistance ภายในประมาณ 30 วินาที โดย pause ไม่นับเวลา
- marker, distance, instruction และ proximity ใช้ simulated effectivePosition เดียวกัน
- ระหว่างจำลอง ห้าม native/mock GPS callback ดึง marker กลับ origin; **paused ยังคงถือครองตำแหน่งจำลอง**
- ไม่เรียก routing ซ้ำทุก tick ขณะเดินตาม route; cancel/เปลี่ยนปลายทาง/เปลี่ยน travel mode ให้หยุดและ reset simulation ก่อนสร้าง route ใหม่
- ออกจาก demo/ปิดนำทางคืนตำแหน่งจาก GPS source; cleanup timer และ listeners เมื่อ unmount/StrictMode remount
- การ reset simulation ใช้ route เดิมและ origin ที่บันทึกตอนเริ่ม route; ไม่ใช้ destination เป็น origin โดยไม่ตั้งใจ
- อย่าให้ simulation เพิ่มเหรียญ, collect Portal, เปิด AR หรือสร้าง reward สำเร็จ

## 5. Automated acceptance tests

วาง tests ใต้ `src/standalone` ตาม Vitest/tsconfig ปัจจุบัน ใช้ mocked fetch และ fake timers ใน tests อัตโนมัติ ไม่ส่งคำขอไป public service ใน CI
Fixture responses อาจเป็นข้อมูลสังเคราะห์สำหรับ unit tests แต่ต้องระบุชัดว่าเป็น test fixture และห้ามนำไปแสดงเป็น live route ในแอป
assert ผลลัพธ์/พฤติกรรม ไม่ snapshot DOM/CSS ทั้งหน้าและไม่เขียน tests เพื่อสะท้อน implementation ทุกบรรทัด

| ID | กรณี | ผ่านเมื่อ |
| --- | --- | --- |
| T01 | Baseline | tests 11 รายการเดิมยังผ่าน; guest/no backend/ไม่มี rewards/GPSจริงcleanup/Portal sheet/query preservation ยังทำงาน |
| T02 | Theme/storage | เริ่ม light หากไม่มี preference; เลือก dark/reloadยังdark; invalid/blocked storage ไม่ crash; กลับ light tokens เดิม |
| T03 | Map lifecycle | themeเปลี่ยน setUrl อย่างเดียว; map instance/center/zoom/player/destination/route คงเดิม; routing call countไม่เพิ่ม |
| T04 | Default/mode | เริ่ม walking; รถเลือก routed-car; กลับเดินเลือก routed-foot; reloadกลับwalking; ไม่มี route request หากยังไม่ได้กดดูเส้นทาง |
| T05 | Coordinates | input lat/lng สร้าง URL lng,lat; GeoJSON renderถูกที่; route originมาจาก effectivePositionไม่ใช่ map center หลัง pan |
| T06 | Zero portals | `treasures=[]` ก็เลือกพิกัด/จุดทดสอบและนำทางได้; destinationไม่เพิ่มnearbyCountหรือเปิดรับรางวัล |
| T07 | Single owner | Event route หยุดเมื่อเปิด destination navigation; cancelคืน EventตามmapMode; ไม่มี LRM request ซ้ำ |
| T08 | UI/cancel | map tapเลือกเฉพาะpicking mode; control clickไม่ตกไปmap; dragไม่เลือก; cancelล้างpin/steps/requestsและคืนsheet |
| T09 | Provider parsing | distance/durationใช้ค่าตอบกลับ; flattenหลายlegs; turnซ้าย/ขวา/วงเวียน/arrive/unknownแปลงไทยอย่างปลอดภัย |
| T10 | Request races | เลือก A→B/เดิน→รถเร็วๆ หรือresponseสลับลำดับ ต้องแสดงผลล่าสุดเท่านั้น; Abortไม่ทำให้เกิดerror toastผิดงาน |
| T11 | Rate/timer | fake timersตรวจspacing≥1100ms และ latest-wins; StrictModeไม่สร้างrequestซ้ำ; real rerouteต้องทั้ง≥30ม.และ≥15วินาที |
| T12 | Error | 429/timeout/network/NoRoute/NoSegment/invalid JSON แสดงerror/retry ไม่สลับเป็นรถหรือเส้นตรง; 429เคารพcooldown |
| T13 | GPS | missing/error GPSจริงไม่ใช้กรุงเทพแทนเงียบๆ; accuracy>50ม.ไม่skipstep/arrive; mock modeไม่เรียกnativewatch |
| T14 | Progress | จุดบนsegmentระยะต่างกันให้remaining/stepถูก; ทางตัด/วนไม่jumpไปท้าย; rerouteใช้progressใหม่; arrivedต้องระยะและprogressถึงเกณฑ์ |
| T15 | Simulation | start/pause/resume/reset/end; pausedไม่snapกลับ; timercleanup; network countไม่เพิ่มทุกtick; disableเมื่อgps=real |
| T16 | Query/security | campaign/host/gps/demoไม่หาย; ชื่อปลายทางมี `<img onerror=…>` ถูกแสดงเป็นข้อความไม่รันHTML |

jsdom ไม่มี layout/SVG detection ครบ: reuse `ResizeObserverStub`, `offsetHeight` stub และ `L.Browser.svg` restore pattern จาก `map.test.tsx`
Vitest เวอร์ชันนี้ไม่มี `vi.replaceProperty` อย่าใช้; query ใน `MemoryRouter` ไม่เปลี่ยน `window.location.search` ให้ตั้ง history ใน GPS/demo tests ให้ตรงด้วย

## 6. Browser smoke หลัง implement

ตรวจ browser เฉพาะรอบรับงานเว็บทดสอบที่ผู้ใช้สั่งให้ทำจริง ใช้ tab/server เดิม ไม่ต้องตรวจภาพในรอบเขียนแผนนี้

| Viewport | Theme / สถานะที่ต้องตรวจ |
| --- | --- |
| 390×844 | LightและDark; sheetเปิด/ย่อ; toolbar+recenterไม่ทับ; destination route+stepsอ่านได้ |
| 360×640 | sheetยาวและcampaignbanner; ปุ่ม/ข้อความไม่ล้น; controlsแตะได้และpanelเลื่อนภายใน |
| 1440×900 | LightและDark; mapเต็มพื้นที่; footer/attributionไม่ถูกบัง; ไม่มีpanelซ้อน |

- Live routing: ตรวจ origin→A แบบเดินหนึ่งครั้งและรถหนึ่งครั้ง เว้นอย่างน้อย 1100ms แล้วตรวจสถานะ CORS/JSON/route/steps จริง
- ยืนยันเดินกับรถใช้ endpoint ต่างกัน ไม่บังคับว่าระยะต้องต่างกันเสมอสำหรับปลายทางอื่น
- GPSจริง: ถ้าไม่มีสิทธิ์ทดสอบให้รายงานว่าไม่ได้ยืนยันพิกัดจริง ห้ามอ้างว่า simulationพิสูจน์ GPSเครื่องแล้ว
- Theme: ตรวจ tile URLและภาพจริง; CARTO watermarkที่ทราบอยู่แล้วไม่ใช่ความผิดพลาด routing และห้ามลบทิ้ง
- ดู network: สลับthemeไม่ยิงrouting, จำลองไม่ยิงทุกtick, ไม่มีloop/429จากแอปตัวเอง

## 7. รายงานส่งมอบของโมเดลถัดไป

ให้คืนลิงก์ local demo ที่รันอยู่, วิธีลองสั้นๆ (เลือก A → ดูเส้นทาง → เริ่มนำทาง → เริ่มจำลอง), ผล tests/build และผล live smoke แยกจาก mocked tests
บอกข้อจำกัดที่ยังมีจริง เช่น CARTO watermark/บริการสาธารณะ/GPSจริงยังไม่ได้อนุญาต
ห้ามบอกว่า “เสร็จ” ถ้าเดินยังใช้ endpointถนน, navigationใช้ได้เฉพาะเมื่อมีPortal, ปุ่มเปลี่ยนแค่สีแต่tilesไม่เปลี่ยน, หรือ live routingล้มเหลวโดยเอาfixtureมาแสดงแทน
