#!/usr/bin/env bash
# สร้าง TASK file ใหม่จากแม่แบบ
# ใช้: ./ai-dev-team/scripts/new-task.sh "ชื่องาน" [S|M|L] [ผู้เขียน]
set -euo pipefail

TITLE="${1:-}"
LEVEL="${2:-S}"
OWNER="${3:-}"
if [[ -z "$TITLE" ]]; then
  echo "ใช้: $0 \"ชื่องาน\" [S|M|L] [ผู้เขียน]" >&2
  exit 1
fi
if [[ ! "$LEVEL" =~ ^[SML]$ ]]; then
  echo "ระดับต้องเป็น S, M หรือ L" >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DIR="$ROOT/.ai/tasks"
TPL="$DIR/_TEMPLATE.md"
[[ -f "$TPL" ]] || { echo "ไม่พบ $TPL — รัน install.sh ก่อน" >&2; exit 1; }

# ค่าเริ่มต้นของผู้เขียนตามระดับงาน
if [[ -z "$OWNER" ]]; then
  case "$LEVEL" in
    S) OWNER="Cursor Agent" ;;
    *) OWNER="(กำหนดหลังขั้น PLAN)" ;;
  esac
fi

LAST=$(find "$DIR" -maxdepth 1 -name 'TASK-[0-9][0-9][0-9]*.md' 2>/dev/null \
  | sed -E 's/.*TASK-([0-9]+).*/\1/' | sort -n | tail -1)
NUM=$(printf "%03d" $((10#${LAST:-0} + 1)))

SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-40)
[[ -n "$SLUG" ]] || SLUG="task"
FILE="$DIR/TASK-$NUM-$SLUG.md"

sed -e "s/TASK-XXX: <ชื่องาน>/TASK-$NUM: $TITLE/" \
    -e "s/^| ระดับ | S /| ระดับ | $LEVEL /" \
    -e "s/^| ผู้เขียน | /| ผู้เขียน | $OWNER /" \
    -e "s#task/XXX-<ชื่อสั้น>#task/$NUM-$SLUG#" \
    "$TPL" > "$FILE"

echo "สร้างแล้ว: ${FILE#$ROOT/}"
echo "Branch: git checkout -b task/$NUM-$SLUG"
case "$LEVEL" in
  S) echo "ขั้นถัดไป: เปิด Cursor Agent แล้วสั่ง 'ทำงานตาม ${FILE#$ROOT/}'" ;;
  *) echo "ขั้นถัดไป: เปิด Claude Code แล้วสั่ง 'อ่าน ${FILE#$ROOT/} แล้วกรอกส่วนแผน ห้ามแก้ Code'" ;;
esac
