// Re-date + re-status the ZSocial(Nexus) sprints via the DigiSprint admin API.
// Usage: node reconcile-sprints.js [baseUrl] [--apply]
//   Dry-run (default): prints the planned changes, writes nothing.
//   --apply: PATCHes the sprints.
// Anchor: Conception (Sprint 0) = Jun 1-20; Sprint 1 starts Sun Jun 21; weekly.
// Status computed for TODAY = 2026-07-12 -> Conception+S1-3 COMPLETED, S4 ACTIVE, rest PLANNED.

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.DIGISPRINT_URL || 'http://localhost:3000').replace(/\/$/, '');
const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.ZSO_PROJECT_ID || 'cmr5hxyti015pjn7wxd0fdhqm';

const TODAY = new Date('2026-07-12T12:00:00.000Z');
const DEADLINE = new Date('2026-09-30T18:00:00.000Z');
const SPRINT1_START = new Date('2026-06-21T09:00:00.000Z'); // Sunday

function sprintNum(name) {
  const m = /(\d+)/.exec(name || '');
  return m ? parseInt(m[1], 10) : null;
}
function fmt(d) { return d.toISOString().slice(0, 10); }
function clampEnd(d) { return d > DEADLINE ? new Date(DEADLINE) : d; }

// Returns {startDate, endDate} for a given sprint number (0 = conception).
function datesFor(num) {
  if (num === 0) {
    return { startDate: new Date('2026-06-01T09:00:00.000Z'), endDate: new Date('2026-06-20T18:00:00.000Z') };
  }
  const start = new Date(SPRINT1_START);
  start.setUTCDate(start.getUTCDate() + (num - 1) * 7);
  let end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(18, 0, 0, 0);
  // Keep everything inside the Sep 30 deadline (tail AI sprints compress slightly).
  if (start > DEADLINE) start.setTime(new Date('2026-09-29T09:00:00.000Z').getTime());
  end = clampEnd(end);
  if (end < start) end = clampEnd(new Date(start.getTime() + 24 * 3600 * 1000));
  return { startDate: start, endDate: end };
}
function statusFor(startDate, endDate) {
  if (endDate < TODAY) return 'COMPLETED';
  if (startDate <= TODAY && TODAY <= endDate) return 'ACTIVE';
  return 'PLANNED';
}

async function api(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: r.ok, status: r.status, json };
}

(async () => {
  console.log(`Target: ${BASE}  (${APPLY ? 'APPLY' : 'DRY-RUN'})\n`);
  const list = await api('GET', `/api/admin/sprints?projectId=${PROJECT_ID}`);
  if (!Array.isArray(list.json)) {
    console.error('Could not list sprints (is the sprints API deployed here?):', list.status, list.json);
    process.exit(1);
  }
  const sprints = list.json.sort((a, b) => (sprintNum(a.name) ?? 999) - (sprintNum(b.name) ?? 999));

  for (const s of sprints) {
    const num = sprintNum(s.name);
    if (num === null) { console.log(`  SKIP (no number): ${s.name}`); continue; }
    const { startDate, endDate } = datesFor(num);
    const status = statusFor(startDate, endDate);
    const before = `${String(s.startDate).slice(0, 10)}->${String(s.endDate).slice(0, 10)} ${s.status}`;
    const after = `${fmt(startDate)}->${fmt(endDate)} ${status}`;
    const changed = before !== after;
    console.log(`  S${String(num).padStart(2)} ${s.name.slice(0, 40).padEnd(40)}  ${before}   =>   ${after}${changed ? '  *' : ''}`);
    if (APPLY && changed) {
      const r = await api('PATCH', `/api/admin/sprints/${s.id}`, {
        startDate: startDate.toISOString(), endDate: endDate.toISOString(), status,
      });
      if (!r.ok) console.log(`     ! PATCH failed: ${r.status} ${JSON.stringify(r.json)}`);
    }
  }
  console.log(`\n${APPLY ? 'Applied.' : 'Dry-run only. Re-run with --apply to write.'}`);
})();
