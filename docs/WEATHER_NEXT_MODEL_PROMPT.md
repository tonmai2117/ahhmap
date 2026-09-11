# คำสั่งส่งต่อ: OpenWeather และเมฆแอนิเมชัน

อัปเดต: 11 กันยายน 2026
สถานะ: งานยังไม่ได้ implement มี key เก็บใน `.env.local` แล้ว แต่ยังไม่ยืนยันว่าใช้ได้

คัดลอกข้อความในกรอบนี้เป็นคำสั่งให้โมเดลถัดไป:

```text
ทำต่อใน C:\Users\uSeR\Desktop\linemap เพิ่ม OpenWeather และเมฆแอนิเมชันตามแผนที่ล็อกไว้
อ่าน docs/WEATHER_IMPLEMENTATION_PLAN.md และ docs/WEATHER_TEST_SPEC.md ให้ครบก่อนแก้โค้ด

งานเดิม Light/Dark, walking default/รถ, navigation, GPS กรุงเทพฯและdemo ทำแล้ว ห้ามสร้างใหม่หรือย้อนกลับตาม docs/NEXT_MODEL_PROMPT.md เก่า
ตรวจ git status/diff แล้วรักษางานค้างทั้งหมด รวม untracked files ห้าม reset/clean/checkout ทับ ไม่ clone/scaffold/install ใหม่ถ้าไม่จำเป็น

ใช้ OpenWeather Current Weather endpoint https://api.openweathermap.org/data/2.5/weather เท่านั้น ไม่ใช้ Open-Meteo/WeatherAPI/One Call/paid APIs
ใช้ OPENWEATHER_API_KEY ใน .env.local ฝั่ง server เท่านั้น มีค่าแล้ว ไม่ต้องให้ฉันส่งซ้ำ ห้ามพิมพ์/คัดลอกค่า key ลงแชต, logs, source, tests หรือ client bundle
เพิ่ม local Vite middleware /api/weather ทั้ง configureServer และ configurePreviewServer ก่อน existing /api proxy; weatherClient แยกจาก src/api.ts ซึ่งเป็น local stub
เพิ่ม cache15นาทีตามพื้นที่, in-flight dedupeที่ทนReact.StrictMode, cooldown/timeout และ latest-response protection ตามแผน ไม่ยิงทุก GPS/simulation tick และไม่แชร์ limiter กับ navigation

ใช้ตำแหน่ง displayPos ของผู้เล่น ไม่ใช้ map center/ปลายทางหรือเปิด GPS watcher เพิ่ม
แสดง WeatherStatus ใน bottom sheet และ functional SVG/CSS cloud marker ใกล้หมุด โดยไม่บัง/ยึดคลิกจาก route, marker, HUD, recenter, attribution หรือ campaign banner
เมฆครึ้มลอยช้า, ฝนเบาหยดบาง, ฝนหนักหยดถี่, ฟ้าคะนองมีสายฟ้าแวบอย่างนุ่มนวล ใช้สายฟ้าเฉพาะรหัส thunderstorm ฝนหนักอย่างเดียวไม่มีสายฟ้า
รองรับ Light/Dark, prefers-reduced-motion, hidden tab, stale/unavailable; ไม่วาดเมฆ/ฝนปลอมเมื่อไม่มีข้อมูล และไม่ใช้ข้อความดิบจาก provider เป็น HTML
แยก label GPSจำลอง ออกจาก อากาศตัวอย่าง; live คือข้อมูล OpenWeather สำหรับตำแหน่ง app ใช้อยู่ ส่วน fixtures ต้องแสดงว่าเป็นตัวอย่าง
เพิ่ม demo weather selectors ตาม query ในสเปก รวม cloudy/light-rain/heavy-rain/thunderstorm/clear/stale/error/live เฉพาะ demo=1; fixture ไม่เรียก API และต้องรักษาquery campaign/host/gps/demo

ทำ testsที่จับพฤติกรรมสำคัญโดยmock weatherและไม่ยิงบริการจริงในnpm test รักษาregression testsเดิม เพิ่มserver typecheckที่buildตรวจจริง
รัน npm test, npm run build, git diff --check และตรวจว่า key ไม่อยู่ใน outputสาธารณะด้วยวิธีที่รายงานเพียงPASS/FAIL
ทดสอบ browserเฉพาะตามสเปกที่ฉันมอบหมายในแผนนี้ ใช้server/tabเดิม ลองfixturesก่อนแล้วทำliveกรุงเทพฯหนึ่งคำขอผ่านlocal endpoint ไม่วาง URLที่มีkeyในbrowserหรือweb search
ถ้าkeyไม่ผ่าน/providerล่ม ให้คงerrorจริง ส่งdemo fixturesที่ใช้ได้และรายงานliveว่ายังไม่ผ่าน ไม่สมัครบริการ/ผูกบัตร/เปลี่ยนproviderเอง

รอบนี้ทำlocal testเท่านั้น ไม่publish/deploy ไม่แก้CARTO watermark ไม่เพิ่ม3D ไม่แก้LINE/AR/rewards ไม่เพิ่มฟีเจอร์นอกแผน
รักษา .openai/hosting.json และอธิบายว่า static dist ไม่มีserver middleware; ยังไม่ต้องทำproduction backend
ส่งลิงก์local demo วิธีลองสั้น ๆ ผลtests/build และผลliveตามจริง อัปเดตREADMEกับสถานะเอกสารเมื่อทำเสร็จ
ทำตามแผนได้เลย ไม่ต้องวางแผนใหม่หรือถามการตัดสินใจที่ล็อกไว้แล้ว
```

เอกสารนี้มีเฉพาะชื่อ environment variable ไม่มีค่าของ API key ถ้าเปลี่ยนเครื่องให้ผู้ใช้จัดเก็บ key ใน `.env.local` ของเครื่องนั้นเอง
