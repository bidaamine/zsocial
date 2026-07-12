// Reconcile ZSocial(Nexus) task statuses to what is ACTUALLY built in the monorepo.
// Usage: node reconcile-task-status.js [baseUrl] [--apply]
//   Dry-run (default) prints proposed changes; --apply PATCHes task.statusId.
//
// Classification is SERVICE-LEVEL (by the parent user-story title), against an explicit
// allowlist of services that genuinely have real code. Rules:
//   - Sprint 0 (conception) -> Done (the design/planning phase is complete)
//   - frontend / UI subtasks -> To Do (no web/mobile/admin frontend exists yet)
//   - a subtask/story of a BUILT service -> Done; everything else -> To Do
//   - never downgrade an already-advanced status.

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.DIGISPRINT_URL || 'http://localhost:3000').replace(/\/$/, '');
const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.ZSO_PROJECT_ID || 'cmr5hxyti015pjn7wxd0fdhqm';

// Services with real, committed code in the zsocial monorepo (normalised titles).
const BUILT_SERVICES = new Set([
  'auth service', 'infrastructure setup',
  'consent service', 'privacy engine',
  'content service', 'llm router', 'media file service',
  'social graph service', 'user profile service', 'user preference service',
  'messaging service', 'notification service', 'notification intelligence service',
  'api gateway & edge intelligence service',
  'child safety service', 'family service',
  'audit observability service', 'security agent', 'corporate profile pages service',
  'audit compliance service', 'company service',
  'ai life orchestrator', 'ai branding + marketing', 'ai hr + talent intelligence',
]);

function normalize(t) {
  return (t || '').toLowerCase().replace(/\bimplementation\b/g, '').replace(/\s+/g, ' ').trim();
}
function sprintNum(name) { const m = /(\d+)/.exec(name || ''); return m ? parseInt(m[1], 10) : null; }
function bracketService(title) { const m = /^\[([^\]]+)\]/.exec(title || ''); return m ? m[1] : null; }

const RANK = { Backlog: 0, 'To Do': 1, 'In Progress': 2, Review: 3, Testing: 4, QA: 5, Done: 6 };

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: r.ok, status: r.status, json };
}

(async () => {
  console.log(`Target: ${BASE}  (${APPLY ? 'APPLY' : 'DRY-RUN'})\n`);
  const proj = await api('GET', `/api/admin/projects/${PROJECT_ID}`);
  const statusIdByName = Object.fromEntries((proj.json.statuses || []).map((s) => [s.name, s.id]));
  const tasks = (await api('GET', `/api/admin/tasks?projectId=${PROJECT_ID}`)).json;
  const sprintNumById = Object.fromEntries(((await api('GET', `/api/admin/sprints?projectId=${PROJECT_ID}`)).json || []).map((s) => [s.id, sprintNum(s.name)]));
  const storyTitleById = Object.fromEntries(tasks.filter((t) => t.type === 'USER_STORY' || t.type === 'EPIC').map((t) => [t.id, t.title]));

  function serviceTitleOf(t) {
    if (t.type === 'USER_STORY' || t.type === 'EPIC') return t.title;
    return storyTitleById[t.parentId] || bracketService(t.title) || t.title;
  }
  function target(t) {
    const num = sprintNumById[t.sprintId];
    const cur = (t.status && t.status.name) || 'To Do';
    if (num === 0) return 'Done';
    if (num == null) return cur;
    const cat = (t.category || '').toLowerCase();
    if (cat === 'frontend' || cat === 'ui') return 'To Do';
    return BUILT_SERVICES.has(normalize(serviceTitleOf(t))) ? 'Done' : 'To Do';
  }

  const perSprint = {}; let changes = 0; const toDone = []; const toTodo = [];
  for (const t of tasks) {
    const cur = (t.status && t.status.name) || 'To Do';
    let tgt = target(t);
    if ((RANK[tgt] ?? 1) < (RANK[cur] ?? 1)) tgt = cur; // never downgrade
    const num = sprintNumById[t.sprintId];
    const key = num == null ? 'backlog' : `S${String(num).padStart(2, '0')}`;
    perSprint[key] = perSprint[key] || { total: 0, done: 0 };
    perSprint[key].total++;
    const willBeDone = tgt === 'Done';
    if (willBeDone) perSprint[key].done++;
    if (tgt !== cur) {
      changes++;
      (tgt === 'Done' ? toDone : toTodo).push(`  ${t.ticketId} [${key} ${t.category || '-'}] ${cur}->${tgt}: ${serviceTitleOf(t).slice(0, 40)}`);
      if (APPLY && statusIdByName[tgt]) {
        const r = await api('PATCH', `/api/admin/tasks/${t.id}`, { statusId: statusIdByName[tgt] });
        if (!r.ok) console.log(`   ! ${t.ticketId} PATCH failed ${r.status}`);
      }
    }
  }

  console.log('=== Final Done-count per sprint (after) ===');
  for (const k of Object.keys(perSprint).sort()) console.log(`  ${k}: ${perSprint[k].done}/${perSprint[k].total} Done`);
  console.log(`\nTotal status changes: ${changes} of ${tasks.length}`);
  console.log(`\nSample -> Done (${toDone.length}):`); toDone.slice(0, 14).forEach((s) => console.log(s));
  console.log(`\nSample -> To Do (${toTodo.length}):`); toTodo.slice(0, 8).forEach((s) => console.log(s));
  console.log(`\n${APPLY ? 'Applied.' : 'Dry-run only. Re-run with --apply to write.'}`);
})();
