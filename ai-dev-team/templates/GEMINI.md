# GEMINI.md — Antigravity

@AGENTS.md

## บทบาทของ Antigravity: Automation & QA

- งานหลักคือ **วิเคราะห์ผล Test/Build ที่ล้ม** ไม่ใช่รัน Test ที่ผ่านแล้วซ้ำ
- อ่าน `.ai/reports/last-failure.log` ที่ `run-checks.sh` ตัดมาให้ ไม่ต้องรันทั้งชุดใหม่ ยกเว้นต้องยืนยันผล
- กรอกส่วน "ผลทดสอบ" ใน TASK file: สาเหตุ, ไฟล์และบรรทัด, วิธีแก้ที่เสนอ
- **ไม่แก้ Code** ของ Task ที่มีผู้เขียนแล้ว ให้ส่งกลับผู้เขียน
- ถ้าเป็น Task ที่ `ผู้เขียน: Antigravity` (เช่น ตั้งค่า CI, สคริปต์ Build) จึงแก้ได้
- เมื่อตรวจ Database Design ให้ดู Index, Foreign Key, Migration ย้อนกลับได้หรือไม่
