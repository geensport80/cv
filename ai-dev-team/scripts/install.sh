#!/usr/bin/env bash
# ติดตั้งชุด AI Development Team v1.0 ลงในโปรเจกต์เป้าหมาย
# ใช้: ./ai-dev-team/scripts/install.sh /path/to/project
# ไม่เขียนทับไฟล์ที่มีอยู่แล้ว (จะแจ้งให้รวมเอง)
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-}"
if [[ -z "$DEST" || ! -d "$DEST" ]]; then
  echo "ใช้: $0 /path/to/project" >&2
  exit 1
fi
DEST="$(cd "$DEST" && pwd)"

copy() {
  local rel="$1"
  local from="$SRC/templates/$rel" to="$DEST/$rel"
  mkdir -p "$(dirname "$to")"
  if [[ -e "$to" ]]; then
    echo "ข้าม (มีอยู่แล้ว): $rel  → รวมเนื้อหาจาก $from เอง"
  else
    cp "$from" "$to"
    echo "สร้าง: $rel"
  fi
}

cd "$SRC/templates"
while IFS= read -r f; do
  copy "${f#./}"
done < <(find . -type f | sort)

# คัดลอกสคริปต์ไปไว้ในโปรเจกต์ด้วย เพื่อให้ path ในเอกสารใช้ได้
mkdir -p "$DEST/ai-dev-team/scripts"
for s in new-task.sh run-checks.sh; do
  if [[ "$SRC/scripts/$s" -ef "$DEST/ai-dev-team/scripts/$s" ]]; then continue; fi
  [[ -e "$DEST/ai-dev-team/scripts/$s" ]] || cp "$SRC/scripts/$s" "$DEST/ai-dev-team/scripts/$s"
done
chmod +x "$DEST/ai-dev-team/scripts/"*.sh

echo
echo "เสร็จแล้ว ขั้นต่อไป:"
echo "  1. แก้ส่วน 'โปรเจกต์' ใน $DEST/AGENTS.md (ชื่อ, Stack)"
echo "  2. แก้คำสั่ง Lint/Test/Build ใน $DEST/ai-dev-team/scripts/run-checks.sh"
echo "  3. สร้างงานแรก: ./ai-dev-team/scripts/new-task.sh \"ชื่องาน\" S"
