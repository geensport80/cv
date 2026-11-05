#!/usr/bin/env bash
# รัน Lint / Test / Build โดยไม่ใช้ AI (ไม่เสีย Token)
# ถ้าล้ม จะตัดเฉพาะส่วนที่ผิดไว้ที่ .ai/reports/last-failure.log ให้ Antigravity อ่าน
#
# แก้คำสั่งในส่วน CHECKS ให้ตรงกับโปรเจกต์ ลบบรรทัดที่ไม่ใช้ได้
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
OUT="$ROOT/.ai/reports"
mkdir -p "$OUT"
FULL="$OUT/last-run.log"
FAIL="$OUT/last-failure.log"
: > "$FULL"; rm -f "$FAIL"

# ---- CHECKS: ชื่อ|คำสั่ง ----
CHECKS=()
[[ -f package.json ]]  && CHECKS+=("lint|npm run lint --if-present" "test|npm test --if-present" "build|npm run build --if-present")
[[ -f composer.json ]] && CHECKS+=("php-lint|find . -name '*.php' -not -path './vendor/*' -print0 | xargs -0 -n1 php -l > /dev/null")
[[ -x vendor/bin/phpunit ]] && CHECKS+=("phpunit|vendor/bin/phpunit")
# CHECKS+=("custom|<คำสั่งของคุณ>")
# ----------------------------

if [[ ${#CHECKS[@]} -eq 0 ]]; then
  echo "ยังไม่มีคำสั่งตรวจ แก้ส่วน CHECKS ใน $0"
  exit 0
fi

failed=0
for c in "${CHECKS[@]}"; do
  name="${c%%|*}"; cmd="${c#*|}"
  printf "%-10s " "$name"
  log=$(mktemp)
  if bash -c "$cmd" > "$log" 2>&1; then
    echo "ผ่าน"
  else
    echo "ล้ม"
    failed=1
    {
      echo "===== $name: $cmd ====="
      # เก็บเฉพาะบรรทัดที่น่าจะเป็นข้อผิดพลาด + บริบทเล็กน้อย จำกัด 150 บรรทัด
      grep -n -i -E -B2 -A6 'error|fail|exception|fatal|assert|expected|✗|✕' "$log" | head -150 \
        || tail -60 "$log"
      echo
    } >> "$FAIL"
  fi
  { echo "===== $name ====="; cat "$log"; echo; } >> "$FULL"
  rm -f "$log"
done

if [[ $failed -eq 1 ]]; then
  echo
  echo "มีบางขั้นล้ม ส่งให้ Antigravity อ่าน: .ai/reports/last-failure.log ($(wc -l < "$FAIL") บรรทัด)"
  exit 1
fi
echo
echo "ผ่านทั้งหมด ไม่ต้องเรียก AI ไปขั้นถัดไปได้เลย"
