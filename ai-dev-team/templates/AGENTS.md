# AGENTS.md — กฎร่วมของ AI Development Team v1.0

> ไฟล์นี้เป็นแหล่งความจริงเดียว (Single Source of Truth) ของทุก AI ในโปรเจกต์
> CLAUDE.md และ GEMINI.md import ไฟล์นี้ ส่วน Cursor อ่านไฟล์นี้โดยตรง
> แก้กฎร่วมที่นี่ที่เดียว อย่าคัดลอกไปไว้หลายที่

## โปรเจกต์

- ชื่อ: <ชื่อโปรเจกต์>
- Stack: <เช่น WordPress 6.x, PHP 8.2, MySQL 8, Vanilla JS / React>
- คำสั่งตรวจ: `./ai-dev-team/scripts/run-checks.sh`
- ภาษาที่ใช้ตอบ: ไทย (ชื่อตัวแปร, Commit message และ Code comment เป็นภาษาอังกฤษ)

## ทีมและบทบาท

| AI | บทบาท | ทำ | ไม่ทำ |
|---|---|---|---|
| Claude Code | Lead Engineer | วางแผน, Backend/PHP, DB, Refactor หลายไฟล์, Security review | ไม่แก้ UI/CSS ในงานที่ Cursor เป็นผู้เขียน |
| Cursor Agent | Implementation | Frontend, UI, Component, CSS/Responsive, งาน 1–3 ไฟล์ | ไม่เปลี่ยน DB Schema หรือ Auth |
| Antigravity | Automation & QA | วิเคราะห์ Test/Build ที่ล้ม, Debug | ไม่แก้ Code ของ Task ที่มีผู้เขียนอยู่แล้ว |
| Grok Bot | Independent Reviewer | วิจารณ์ UX, คู่แข่ง, ไอเดีย Feature | ไม่เขียน Code หลัก, ไม่เห็น Secret |

## กฎที่ทุก AI ต้องทำตาม

1. **อ่าน TASK file ก่อนทำอะไร** งานทุกชิ้นมีไฟล์ `.ai/tasks/TASK-XXX.md` ถ้าไม่มีให้ถามก่อน
2. **ผู้เขียนคนเดียว** ถ้า `ผู้เขียน:` ใน TASK file ไม่ใช่คุณ ห้ามแก้ไฟล์ Code ใน Task นั้น ให้เขียนข้อเสนอลงใน TASK file แทน
3. **อยู่ในขอบเขต** แก้เฉพาะไฟล์ในส่วน "แผน" ถ้าต้องแก้เพิ่ม ให้เพิ่มรายการพร้อมเหตุผลก่อน
4. **ไม่วิเคราะห์ซ้ำ** ถ้า TASK file มีแผนและรายการไฟล์แล้ว ให้เชื่อแผนนั้น ไม่ต้องสำรวจ Codebase ใหม่ทั้งหมด
5. **ส่งงานผ่านไฟล์** จบงานแล้วกรอกส่วนของตัวเองใน TASK file ให้ครบ ตัวถัดไปต้องทำงานต่อได้โดยไม่ต้องอ่านแชทของคุณ
6. **วนแก้ไม่เกิน 2 รอบ** ถ้า Test ยังล้มหลังแก้ 2 รอบ ให้ตั้งสถานะ `BLOCKED` และอธิบายว่าติดอะไร
7. **ห้ามแตะ** `.env`, Secret, Credential, ไฟล์ข้อมูลส่วนบุคคล, `wp-config.php` และห้าม Commit สิ่งเหล่านี้
8. **ไม่ Merge เอง** ไม่ Push เข้า `main` การ Merge เป็นของผู้พัฒนาเท่านั้น
9. **ตอบสั้น** สรุปผลเป็นข้อ ไม่ต้องทวนคำสั่ง ไม่ต้องพิมพ์ Code ทั้งไฟล์ซ้ำในแชท

## Git

- Branch: `task/<เลข>-<ชื่อสั้น>` เช่น `task/012-safari-export`
- Commit: `<type>(TASK-XXX): <ข้อความ>` เช่น `fix(TASK-012): handle Safari blob download`
- 1 Task = 1 Branch = 1 PR

## Definition of Done

- `run-checks.sh` ผ่าน
- Test ของส่วนที่เปลี่ยนมีและผ่าน
- TASK file ทุกส่วนที่เกี่ยวข้องกรอกครบ
- ไม่มี Secret หรือข้อมูลบุคคลใน Diff
