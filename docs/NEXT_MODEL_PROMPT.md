# คำสั่งส่งต่อให้โมเดลถัดไป

> สถานะ: คำสั่งนี้ถูกนำไป implement ใน local workspace แล้วเมื่อ 10 กันยายน 2026 เก็บไว้เป็นบันทึกขอบเขตงาน ไม่ใช่งานที่ยังค้าง

คัดลอกข้อความต่อไปนี้เป็นคำสั่งเริ่มงาน:

```text
ทำงานต่อใน C:\Users\uSeR\Desktop\linemap ไม่ clone/scaffold ใหม่
อ่าน docs/MAP_NAVIGATION_PLAN.md และ docs/MAP_TEST_SPEC.md ให้ครบก่อนแก้โค้ด
ทำตามสเปกที่ล็อกไว้: Light/Dark, walking default+driving switch, เลือกปลายทางจากตำแหน่งผู้ใช้แล้วนำทางพร้อมขั้นตอนภาษาไทย, และ demo กรุงเทพฯ ที่จำลองการเดินทางได้
เก็บดีไซน์ Light เดิมและพฤติกรรม Portal/route/query/GPS เดิม งาน GPS ยังมี uncommitted changes ต้องรักษาไว้ ห้าม reset/revert
ใช้ FOSSGIS routed-foot/routed-car ที่ระบุ ไม่ต้องใช้ API key; ไม่แก้ CARTO watermarkและไม่เปลี่ยน providerภาพแผนที่
เปลี่ยน route control เดิมให้มีเจ้าของ route และ rate limiter เดียว; อย่าให้ Event กับ destinationยิง requestซ้อนกัน
ไม่มี global place search, backend, LINE login, AR/rewards หรือเสียงนำทางในงานนี้ อย่าเพิ่มเอง
สร้าง local test version ตาม /map?demo=1 และเปิดให้ฉันทดลอง; รอบนี้ยังไม่ต้อง publish/updateเว็บออนไลน์
ตรวจ baselineก่อนแล้วลงมือเป็นขั้นตามแผน ไม่วางแผนใหม่ ไม่สร้างหลายตัวเลือก ไม่เพิ่ม dependencyหากโค้ดเดิมทำได้
ใช้ testsที่จับพฤติกรรมสำคัญ รัน npm test และ npm run build; browser smokeตามสเปกพอ ไม่ยิงpublic routingซ้ำบ่อยหรือทดสอบกว้างเกินงาน
หากพบข้อมูลในแผนต่างจากโค้ดปัจจุบันให้เก็บงานผู้ใช้ไว้และปรับเฉพาะที่จำเป็น หากproviderล่มให้รายงานจริง ไม่ปลอมเส้นทางหรือสลับเดินเป็นรถเงียบๆ
ส่งลิงก์เว็บทดสอบ วิธีลอง และผลตรวจจริงเมื่อครบทุกข้อ
```

แผนนี้ไม่ให้สิทธิ์เพิ่มค่าใช้จ่าย สมัครบริการ ขอ API key เปลี่ยนสิทธิ์เว็บไซต์ หรือนำงานขึ้น public
