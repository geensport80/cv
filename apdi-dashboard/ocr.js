/* อ่านไฟล์ PDF รายงานเข้าออก/บันทึกการลา แล้วแปลงเป็นข้อมูล
   ขั้นตอน: เรนเดอร์หน้า PDF -> หาเส้นตาราง -> แยกช่อง -> OCR ทีละช่อง (Tesseract, ภาษาไทย)
   ไฟล์ที่มีข้อความจริง (ไม่ใช่รูป) ก็ใช้วิธีเดียวกันได้ เพราะทำงานจากภาพที่เรนเดอร์ */
(function () {
  const base = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;
  const V = (p) => new URL('vendor/' + p, base).href;
  const SCALE = 2.5;
  const LEAVE_TYPES = ['ลาป่วย', 'ลากิจ', 'BL', 'สลับวันหยุด', 'ลาอื่นๆ', 'ลาพักร้อน', 'ลาบวช', 'ลาคลอด'];

  let workers = null;
  async function getWorkers(log) {
    if (workers) return workers;
    log && log('กำลังโหลดตัวอ่านภาษาไทย (ครั้งแรกอาจใช้เวลาสักครู่)…');
    const opts = { workerPath: V('worker.min.js'), corePath: V(''), langPath: V('lang'), gzip: false, workerBlobURL: false, cacheMethod: 'none' };
    const text = await Tesseract.createWorker('tha+eng', 1, opts);
    await text.setParameters({ tessedit_pageseg_mode: '7', preserve_interword_spaces: '1' });
    const digit = await Tesseract.createWorker('eng', 1, opts);
    await digit.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789:-/. ' });
    workers = { text, digit };
    return workers;
  }

  /* ---------- ภาพและเส้นตาราง ---------- */
  function isDark(d, i) { return d[i] < 110 && d[i + 1] < 110 && d[i + 2] < 110; }

  function findHLines(img) {
    const { width: W, height: H, data: d } = img;
    const rows = [];
    for (let y = 0; y < H; y++) {
      let best = 0, bx0 = 0, run = 0, rx0 = 0;
      for (let x = 0; x < W; x++) {
        if (isDark(d, (y * W + x) * 4)) { if (!run) rx0 = x; run++; if (run > best) { best = run; bx0 = rx0; } }
        else run = 0;
      }
      if (best >= W * 0.3) rows.push({ y, x0: bx0, x1: bx0 + best });
    }
    const lines = [];
    for (const r of rows) {
      const last = lines[lines.length - 1];
      if (last && r.y - last.y1 <= 2 && Math.abs(r.x0 - last.x0) < W * 0.03) { last.y1 = r.y; last.x0 = Math.min(last.x0, r.x0); last.x1 = Math.max(last.x1, r.x1); }
      else lines.push({ y0: r.y, y1: r.y, x0: r.x0, x1: r.x1 });
    }
    return lines;
  }

  function groupTables(lines, W) {
    const tables = [];
    let cur = null;
    for (const l of lines) {
      const same = cur && Math.abs(l.x0 - cur.x0) < W * 0.02 && Math.abs(l.x1 - cur.x1) < W * 0.02 && (l.y0 - cur.lines[cur.lines.length - 1].y1) < W * 0.09;
      if (same) cur.lines.push(l);
      else { cur = { x0: l.x0, x1: l.x1, lines: [l] }; tables.push(cur); }
    }
    return tables.filter((t) => t.lines.length >= 2);
  }

  function vSeparators(img, x0, x1, y0, y1) {
    const { width: W, data: d } = img;
    const h = y1 - y0;
    if (h < 4) return [];
    const cols = [];
    for (let x = Math.max(0, x0 - 3); x <= Math.min(W - 1, x1 + 3); x++) {
      let n = 0;
      for (let y = y0; y < y1; y++) if (isDark(d, (y * W + x) * 4)) n++;
      if (n / h >= 0.85) cols.push(x);
    }
    const seps = [];
    for (const x of cols) { const l = seps[seps.length - 1]; if (l && x - l[1] <= 2) l[1] = x; else seps.push([x, x]); }
    return seps;
  }

  function bandCells(img, t) {
    const bands = [];
    for (let i = 0; i < t.lines.length - 1; i++) {
      const y0 = t.lines[i].y1 + 1, y1 = t.lines[i + 1].y0;
      if (y1 - y0 < 8) continue;
      const seps = vSeparators(img, t.x0, t.x1, y0 + 2, y1 - 2);
      const cells = [];
      for (let k = 0; k < seps.length - 1; k++) {
        const cx0 = seps[k][1] + 1, cx1 = seps[k + 1][0];
        if (cx1 - cx0 > 6) cells.push({ x0: cx0, x1: cx1, y0, y1 });
      }
      bands.push({ y0, y1, cells });
    }
    return bands;
  }

  /* สีพื้นช่อง: แดง = วันอาทิตย์, เหลือง = วันหยุด */
  function cellColor(img, c) {
    const { width: W, data: d } = img;
    let red = 0, yel = 0, n = 0;
    for (let y = c.y0 + 3; y < c.y1 - 3; y += 2) for (let x = c.x0 + 3; x < c.x1 - 3; x += 2) {
      const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      if (isDark(d, i)) continue;
      n++;
      if (r > 190 && g < 90 && b < 90) red++;
      else if (r > 200 && g > 190 && b < 120) yel++;
    }
    if (!n) return 'n';
    if (red / n > 0.5) return 's';
    if (yel / n > 0.5) return 'h';
    return 'n';
  }

  function inkCount(img, c) {
    const { width: W, data: d } = img;
    let n = 0;
    for (let y = c.y0 + 2; y < c.y1 - 2; y++) for (let x = c.x0 + 2; x < c.x1 - 2; x++) if (isDark(d, (y * W + x) * 4)) n++;
    return n;
  }

  /* ตัดช่อง ทำเป็นขาวดำ ขยาย 2 เท่า เติมขอบขาว */
  function cellCanvas(img, c, pad = 2, S = 3, thr = 170) {
    const { width: W, data: d } = img;
    const w = c.x1 - c.x0 - pad * 2, h = c.y1 - c.y0 - pad * 2, M = 16;
    const cv = document.createElement('canvas');
    cv.width = w * S + M * 2; cv.height = h * S + M * 2;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    const out = ctx.getImageData(0, 0, cv.width, cv.height);
    for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) {
      const si = ((c.y0 + pad + (y / S | 0)) * W + (c.x0 + pad + (x / S | 0))) * 4;
      const lum = Math.max(d[si], d[si + 1], d[si + 2]);
      const v = lum < thr ? 0 : 255;
      const oi = ((y + M) * cv.width + (x + M)) * 4;
      out.data[oi] = out.data[oi + 1] = out.data[oi + 2] = v; out.data[oi + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    return cv;
  }

  function cropCanvas(img, x0, y0, x1, y1) {
    const cv = document.createElement('canvas');
    cv.width = x1 - x0; cv.height = y1 - y0;
    const ctx = cv.getContext('2d');
    const part = new ImageData(cv.width, cv.height);
    for (let y = 0; y < cv.height; y++) part.data.set(img.data.subarray(((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x1) * 4), y * cv.width * 4);
    ctx.putImageData(part, 0, 0);
    return cv;
  }

  async function ocrBlock(worker, canvas) {
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    try { return await ocr(worker, canvas); } finally { await worker.setParameters({ tessedit_pageseg_mode: '7' }); }
  }

  async function ocr(worker, canvas) { const r = await worker.recognize(canvas); return (r.data.text || '').trim(); }

  /* ---------- ตีความข้อความ ---------- */
  const THAI_FIX = [[/\u0e4d\u0e32/g, 'ำ'], [/แจ[๋่]ง/g, 'แจ้ง'], [/(^|\s|แจ้ง)[สฉฆ]า(ป่วย|กิจ|ก็จ|กัจ)/g, '$1ลา$2'], [/ลาก[็ั]จ/g, 'ลากิจ'], [/ลาปวย/g, 'ลาป่วย'], [/\[(ช่วง[^\]\)]*)[\]\)ว]?$/, '($1)'], [/ช่วงเข[้่]า/g, 'ช่วงเช้า'], [/ข่วง/g, 'ช่วง']];
  const fixThai = (s) => THAI_FIX.reduce((a, [re, to]) => a.replace(re, to), s);

  const norm = (s) => s.replace(/[๐-๙]/g, (c) => '๐๑๒๓๔๕๖๗๘๙'.indexOf(c)).replace(/[Oo]/g, '0').replace(/[lI|]/g, '1');

  /* "จาก 01/01/2025 ถึง 31/01/2025" — รายงานเป็นรายเดือนเสมอ อ่านได้วันใดวันหนึ่งก็พอ */
  function parseRange(txt) {
    const t = norm(txt);
    const votes = {};
    const add = (mo, y, w) => {
      if (y > 2400) y -= 543;
      if (mo >= 1 && mo <= 12 && y >= 2000 && y < 2100) { const k = `${y}-${String(mo).padStart(2, '0')}`; votes[k] = (votes[k] || 0) + w; }
    };
    let m;
    const strict = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*((?:20|25)\d{2})/g;
    while ((m = strict.exec(t))) add(+m[2], +m[3], 2);
    const loose = /(\d{2})\D?(\d{2})\D?((?:20|25)\d{2})/g;
    while ((m = loose.exec(t))) add(+m[2], +m[3], 1);
    const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    const [y, mo] = best[0].split('-').map(Number);
    return { from: `${best[0]}-01`, to: `${best[0]}-${new Date(Date.UTC(y, mo, 0)).getUTCDate()}` };
  }

  function fixTime(h, m) {
    h = +h; m = +m;
    if (h > 23 || m > 59) return null;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  /* อ่านเวลา 1 ค่า: รองรับ "08:45" "0845" "08745" (โคลอนถูกอ่านเป็นตัวเลข) "08/45" */
  function readTime(part) {
    const t = part.replace(/[^0-9:\/.]/g, '');
    let m = t.match(/(\d{1,2})[:\/.](\d{2})/) || t.match(/^(\d{2})\d(\d{2})$/) || t.match(/^(\d{1,2})(\d{2})$/);
    return m ? fixTime(m[1], m[2]) : null;
  }

  function parseTimeCell(raw) {
    const t = norm(raw).replace(/\s+/g, '');
    if (!t) return null;
    const dash = t.search(/[-–—~]/);
    let a = dash >= 0 ? t.slice(0, dash) : t, b = dash >= 0 ? t.slice(dash + 1) : '';
    let vin = readTime(a), vout = readTime(b);
    if (dash < 0 && vin && vin >= '12:00') { vout = vin; vin = null; }
    let sure = /^\d{2}:\d{2}$/.test(a.replace(/[^0-9:]/g, '') || '00:00') || !a;
    if (vin && vin.startsWith('06')) { vin = '08' + vin.slice(2); sure = false; }
    if (!vin && !vout) return dash >= 0 ? { in: '', out: '', dash: true, sure: true } : null;
    if ((a && !vin) || (b && !vout)) sure = false;
    return { in: vin || '', out: vout || '', sure };
  }

  function lev(a, b) {
    const m = a.length, n = b.length, dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[m][n];
  }
  function matchType(raw) {
    const s = raw.replace(/\s+/g, '');
    if (!s) return '';
    if (/^[A-Za-z0-9]{1,3}$/.test(s) || /B|L/.test(s)) return 'BL';
    let best = '', bd = 99;
    for (const t of LEAVE_TYPES) { const d = lev(s, t) / Math.max(t.length, 1); if (d < bd) { bd = d; best = t; } }
    if (bd <= 0.6) return best;
    return s.length <= 4 ? 'BL' : s;
  }

  /* ช่องวันที่ลา "dd/mm/yyyy hh:mm" — ปี/เดือนเอาจากหัวตารางเมื่ออ่านไม่ชัด */
  function parseLeaveCell(raw, ym) {
    const t = norm(raw).replace(/\s+/g, ' ').trim();
    const tm = t.match(/(\d{1,2})\s*[:.\/]?\s*(\d{2})$/);
    const time = tm ? fixTime(tm[1], tm[2]) : null;
    const rest = tm ? t.slice(0, tm.index) : t;
    const dm = rest.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\//) || rest.match(/^(\d{1,2})\s*\/\s*(\d{2})/);
    let day = dm ? +dm[1] : 0;
    const [yy, mm] = (ym || '2000-01').split('-').map(Number);
    const maxD = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    if (day < 1 || day > maxD) day = 0;
    return { day, time, date: day ? `${ym}-${String(day).padStart(2, '0')}` : '' };
  }

  function diffHM(a, b) {
    const m = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
    const d = Math.max(0, m(b) - m(a));
    return String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
  }

  function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  /* ---------- ประมวลผลทั้งไฟล์ ---------- */
  async function processPdf(file, onProgress) {
    const log = (msg, frac) => onProgress && onProgress(msg, frac);
    if (typeof pdfjsLib === 'undefined' || typeof Tesseract === 'undefined') throw new Error('โหลดไลบรารีอ่าน PDF/OCR ไม่สำเร็จ ตรวจสอบว่าโฟลเดอร์ vendor อยู่ข้างไฟล์หน้านี้');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const { text, digit } = await getWorkers(log);
    const result = { name: '', id: '', dept: '', months: [], attendance: [], leaves: [], warnings: [] };

    for (let p = 1; p <= pdf.numPages; p++) {
      log(`หน้า ${p}/${pdf.numPages}: กำลังเรนเดอร์`, (p - 1) / pdf.numPages);
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: SCALE });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const tables = groupTables(findHLines(img), img.width);

      let prevBottom = 0;
      for (let ti = 0; ti < tables.length; ti++) {
        const t = tables[ti];
        const top = t.lines[0].y0, bottom = t.lines[t.lines.length - 1].y1;
        const bands = bandCells(img, t);
        const counts = bands.map((b) => b.cells.length);
        const kind = counts.filter((c) => c >= 9).length >= 2 ? 'att' : counts.some((c) => c === 5) ? 'leave' : null;
        const hdrTop = Math.max(0, prevBottom + 1, top - Math.round(img.width * 0.16));
        prevBottom = bottom;
        if (!kind) continue;

        // หัวรายงาน: ช่วงวันที่ และชื่อ
        let hdrText = '', range = null;
        if (top - hdrTop > 10) {
          const hc = cropCanvas(img, Math.max(0, t.x0 - 40), hdrTop, Math.min(img.width, t.x1 + 40), top);
          range = parseRange(await ocrBlock(digit, hc));
          hdrText = await ocrBlock(text, hc);
          if (!range) range = parseRange(hdrText);
        }
        const nm = hdrText.match(/ชื่อ\s*[:：]?\s*([^\n]+?)(?:\s{2,}|รหัส|$)/m);
        if (nm && !result.name) result.name = nm[1].trim();
        const idm = norm(hdrText).match(/รหัส[^\d\n]{0,12}(\d{2,6})/);
        if (idm && !result.id) result.id = idm[1];

        if (kind === 'att') {
          const first = bands[0];
          if (first && first.cells.length < 9) {
            const ht = await ocr(text, cropCanvas(img, first.cells[0].x0, first.y0, first.cells[first.cells.length - 1].x1, first.y1));
            const m2 = ht.match(/ชื่อ\s*([^\n]+)$/m); if (m2 && !result.name) result.name = m2[1].trim();
            const m3 = norm(ht).match(/เครื่อง\s*(\d{2,6})/) || norm(ht).match(/(\d{3,6})/); if (m3 && !result.id) result.id = m3[1];
            const m4 = ht.match(/แผนก\s*(\S+)/); if (m4 && !result.dept) result.dept = m4[1];
          }
          if (!range) { result.warnings.push(`หน้า ${p}: อ่านช่วงวันที่ของตารางเข้าออกไม่ได้ ข้ามตารางนี้`); continue; }
          const grid = bands.filter((b) => b.cells.length >= 9);
          const month = range.from.slice(0, 7);
          if (!result.months.includes(month)) result.months.push(month);
          let k = 0;
          for (let r = 0; r + 1 < grid.length; r += 2) {
            const timeRow = grid[r + 1];
            for (let c = 0; c < timeRow.cells.length; c++, k++) {
              const date = addDays(range.from, k);
              if (date > range.to) continue;
              const cell = timeRow.cells[c];
              const color = cellColor(img, cell);
              let parsed = null, raw = '';
              if (inkCount(img, cell) > 12) { raw = await ocr(digit, cellCanvas(img, cell, 2, 1)); parsed = parseTimeCell(raw); }
              if (color !== 'n' || parsed || raw) result.attendance.push({ date, cell: color, in: parsed ? parsed.in : '', out: parsed ? parsed.out : '', dash: !!(parsed && parsed.dash), sure: parsed ? parsed.sure : !raw, raw });
            }
            log(`หน้า ${p}/${pdf.numPages}: ตารางเข้าออก ${month}`, (p - 1 + (r + 2) / grid.length) / pdf.numPages);
          }
        } else {
          const rows = bands.filter((b) => b.cells.length === 5);
          const ym = range ? range.from.slice(0, 7) : '';
          for (const b of rows) {
            const c = b.cells;
            const r0 = await ocr(digit, cellCanvas(img, c[0], 3, 1, 170)), r1 = await ocr(digit, cellCanvas(img, c[1], 3, 1, 170));
            if (!/\d{3}/.test(r0 + r1)) continue; // แถวหัวตาราง
            const head = await ocr(text, cellCanvas(img, c[3], 3, 1));
            const reason = fixThai((await ocr(text, cellCanvas(img, c[4], 3, 1, 170))).replace(/\s+/g, ' ').trim());
            const s0 = parseLeaveCell(r0, ym), e0 = parseLeaveCell(r1, ym);
            const day = s0.day || e0.day;
            const sd = s0.day ? s0.date : (day ? e0.date : '');
            const ed = e0.day ? e0.date : sd;
            let st = s0.time || '08:45', et = e0.time || '16:15';
            if (et < st && /^0\d/.test(et)) et = '1' + et.slice(1);
            const sure = !!(s0.day && e0.day && s0.time && e0.time);
            result.leaves.push({ sd, st, ed, et, hours: sd === ed ? diffHM(st, et) : '', type: matchType(head), reason, sure });
          }
          log(`หน้า ${p}/${pdf.numPages}: ตารางการลา`, p / pdf.numPages);
          if (range) { const mm = range.from.slice(0, 7); if (!result.months.includes(mm)) result.months.push(mm); }
        }
      }
    }
    result.months.sort();
    log('เสร็จแล้ว', 1);
    return result;
  }

  window.APDI_OCR = { processPdf, parseTimeCell, matchType, LEAVE_TYPES };
})();
