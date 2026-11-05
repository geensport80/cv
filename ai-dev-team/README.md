# AI Development Team v1.0 — คู่มือสร้างและใช้งานชุดไฟล์

ชุดไฟล์สำหรับให้ **Claude Code** (Extension ใน Cursor), **Cursor Agent**, **Antigravity** และ **Grok Bot** ทำงานร่วมกันในโปรเจกต์เดียว โดยลดการใช้ Token ซ้ำซ้อนและควบคุมงบได้

## แนวคิดหลัก 3 ข้อ

1. **หนึ่ง Task มีผู้เขียน Code คนเดียว** ตัวอื่นเป็นผู้ตรวจหรือไม่ถูกเรียกเลย
2. **AI คุยกันผ่านไฟล์ ไม่ใช่ผ่านแชท** ทุก Task มีไฟล์ `.ai/tasks/TASK-XXX.md` เป็นสัญญากลาง ตัวถัดไปอ่านไฟล์นี้แทนการวิเคราะห์ Codebase ใหม่
3. **กฎร่วมอยู่ที่เดียว** `AGENTS.md` คือแหล่งความจริง ไฟล์ของแต่ละเครื่องมือแค่ import แล้วเพิ่มบทบาทของตัวเอง

## เอกสาร

| ไฟล์ | เนื้อหา |
|---|---|
| [docs/01-structure-review.md](docs/01-structure-review.md) | ทบทวนโครงสร้างทีมที่ร่างไว้ จุดที่ควรปรับ 7 ข้อ และตารางบทบาทฉบับปรับปรุง |
| [docs/02-workflow.md](docs/02-workflow.md) | Workflow 5 ขั้นตอน แยกตามระดับงาน S/M/L พร้อม Prompt ที่ใช้ในแต่ละขั้น และกฎประหยัด Token |

## โครงสร้างชุดไฟล์

```
ai-dev-team/
├── README.md                  ← คู่มือนี้
├── docs/                      ← เอกสารอธิบาย (ไม่ต้องคัดลอกไปโปรเจกต์)
├── scripts/
│   ├── install.sh             ← ติดตั้งชุดไฟล์ลงโปรเจกต์
│   ├── new-task.sh            ← สร้าง TASK file ใหม่
│   └── run-checks.sh          ← รัน Lint/Test/Build โดยไม่ใช้ AI
└── templates/                 ← ไฟล์ที่จะถูกคัดลอกไปที่ root ของโปรเจกต์
    ├── AGENTS.md              ← กฎร่วม (ทุก AI อ่าน)
    ├── CLAUDE.md              ← Claude Code: import AGENTS.md + บทบาท Lead Engineer
    ├── GEMINI.md              ← Antigravity: import AGENTS.md + บทบาท QA
    ├── .cursor/rules/
    │   ├── 00-team-workflow.mdc   ← Cursor Agent: บทบาท (โหลดทุกครั้ง)
    │   ├── 10-frontend.mdc        ← โหลดเฉพาะตอนแก้ CSS/JS/HTML
    │   └── 20-wordpress-php.mdc   ← โหลดเฉพาะตอนแก้ PHP
    └── .ai/
        ├── tasks/_TEMPLATE.md         ← แม่แบบ Task (โจทย์ → แผน → ส่งงาน → ทดสอบ → รีวิว → อนุมัติ)
        ├── handoffs/_TEMPLATE.md      ← แม่แบบส่งงานกลางคันระหว่าง AI
        ├── reviews/grok-review-prompt.md  ← Prompt สำเร็จรูปสำหรับ Grok 3 แบบ
        └── reports/budget-log.md      ← บันทึกงบต่อ Task และรายเดือน
```

## วิธีติดตั้ง (5 นาที)

### 1. คัดลอกชุดไฟล์ลงโปรเจกต์

```bash
# จาก repo นี้
./ai-dev-team/scripts/install.sh /path/to/your-project
```

สคริปต์จะ **ไม่เขียนทับ** ไฟล์ที่มีอยู่แล้ว ถ้าโปรเจกต์มี `CLAUDE.md` อยู่แล้ว จะแจ้งให้รวมเนื้อหาเอง

### 2. กรอกข้อมูลโปรเจกต์ใน `AGENTS.md`

แก้ส่วน "โปรเจกต์" ให้ตรงกับงานจริง เช่น Stack และคำสั่งตรวจ ส่วนนี้สำคัญเพราะทุก AI จะอ่าน

### 3. ตั้งคำสั่งตรวจใน `run-checks.sh`

สคริปต์ตรวจ `package.json`, `composer.json` และ `phpunit` ให้อัตโนมัติ ถ้าโปรเจกต์ใช้คำสั่งอื่นให้เพิ่มในส่วน `CHECKS`

### 4. ตรวจว่าแต่ละเครื่องมืออ่านกฎได้

| เครื่องมือ | วิธีตรวจ |
|---|---|
| Claude Code | เปิดแชทใหม่ ถาม "บทบาทของคุณในทีมคืออะไร" ต้องตอบว่า Lead Engineer |
| Cursor Agent | Settings → Rules ต้องเห็น `00-team-workflow` เป็น Always |
| Antigravity | ถาม "กฎข้อ 2 ใน AGENTS.md คืออะไร" ต้องตอบเรื่องผู้เขียนคนเดียว |
| Grok Bot | ไม่มีไฟล์ ใช้ Prompt จาก `.ai/reviews/grok-review-prompt.md` |

> ชื่อไฟล์กฎที่เครื่องมืออ่าน (`AGENTS.md`, `GEMINI.md`, `.cursor/rules/*.mdc`) อาจเปลี่ยนตามเวอร์ชัน ถ้าขั้นตอนนี้ไม่ผ่าน ให้ดูเอกสารของเวอร์ชันที่ใช้อยู่

### 5. Commit

```bash
git add AGENTS.md CLAUDE.md GEMINI.md .cursor .ai ai-dev-team
git commit -m "chore: add AI Development Team v1.0"
```

## การใช้งานประจำวัน

```bash
# 1. สร้างงาน (เลือกระดับ S / M / L)
./ai-dev-team/scripts/new-task.sh "แก้ปุ่ม Export บน Safari" S

# 2. กรอก "โจทย์" และ "เกณฑ์ผ่าน" ใน TASK file ที่ได้

# 3. ส่งให้ AI ตามระดับงาน
#    S → Cursor Agent:  "ทำงานตาม .ai/tasks/TASK-001-....md"
#    M/L → Claude Code: "อ่าน .ai/tasks/TASK-002-....md แล้วกรอกส่วนแผน ห้ามแก้ Code"

# 4. ตรวจโดยไม่ใช้ AI
./ai-dev-team/scripts/run-checks.sh
#    ล้ม → ส่ง .ai/reports/last-failure.log ให้ Antigravity

# 5. รีวิว (M/L) → อนุมัติ → Merge → บันทึกงบ
```

## เลือกใครเป็นผู้เขียน (สรุปเร็ว)

| ลักษณะงาน | ผู้เขียน | ผู้ตรวจ |
|---|---|---|
| 1–3 ไฟล์, UI, CSS, Component, Template | Cursor Agent | — (S) หรือ Claude Code ดู Diff (M) |
| หลายไฟล์, Backend, PHP Logic, DB, Refactor | Claude Code | Cursor Agent หรือ Claude เซสชันใหม่ |
| CI, สคริปต์ Build, แก้ Build พัง | Antigravity | Cursor Agent |
| Auth, ข้อมูลผู้ใช้, Upload, การจ่ายเงิน | Claude Code | Claude **เซสชันใหม่** ดู Diff + ผู้พัฒนา |
| ทิศทาง Feature, UX, คู่แข่ง | — | Grok Bot (ผ่านแม่แบบ Prompt) |

ตารางเต็มและเหตุผลอยู่ที่ [docs/01-structure-review.md](docs/01-structure-review.md)

## เมื่อไรควรปรับชุดไฟล์นี้

ดู `.ai/reports/budget-log.md` ทุกสิ้นเดือน ถ้างาน S ใช้เกิน 1 เซสชันบ่อย ให้ลดเกณฑ์ไฟล์ของ S ลง ถ้ารอบแก้ชนเพดาน 2 บ่อย แปลว่าขั้น PLAN ยังไม่ละเอียดพอ ปรับกฎใน `AGENTS.md` ที่เดียว แล้วทุก AI จะได้กฎใหม่พร้อมกัน
