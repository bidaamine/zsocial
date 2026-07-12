// Read-only extractor for the ZSocial(Nexus) project in DigiSprint.
// Usage: node extract-tasks.js [baseUrl]
//   local: node extract-tasks.js http://localhost:3000
//   vps:   node extract-tasks.js http://37.59.205.27
// Writes a full JSON snapshot (project, statuses, sprints, tasks, tags) to ./snapshots/.
// Makes NO changes — pure GET.

const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || process.env.DIGISPRINT_URL || 'http://localhost:3000').replace(/\/$/, '');
const PROJECT_ID = process.env.ZSO_PROJECT_ID || 'cmr5hxyti015pjn7wxd0fdhqm';

async function get(pathname) {
  try {
    const r = await fetch(BASE + pathname, { headers: { Accept: 'application/json' } });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) return { __error: r.status, url: pathname };
    if (!ct.includes('application/json')) return { __nonjson: true, url: pathname };
    return await r.json();
  } catch (e) {
    return { __fetchError: e.message, url: pathname };
  }
}

(async () => {
  const outDir = path.join(__dirname, 'snapshots');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const host = BASE.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '_');

  const project = await get(`/api/admin/projects/${PROJECT_ID}`);
  const tasks = await get(`/api/admin/tasks?projectId=${PROJECT_ID}`);
  let sprints = await get(`/api/admin/sprints?projectId=${PROJECT_ID}`);
  const tags = await get('/api/admin/tags');

  // Fallback: derive sprint list from task.sprint if the sprints admin API isn't
  // deployed on this host yet (e.g. the VPS before we push the new endpoint).
  let sprintsSource = 'api';
  if (!Array.isArray(sprints)) {
    sprintsSource = 'derived-from-tasks';
    const m = new Map();
    (Array.isArray(tasks) ? tasks : []).forEach((t) => {
      if (t.sprint && t.sprint.id) m.set(t.sprint.id, t.sprint);
    });
    sprints = [...m.values()];
  }

  const taskArr = Array.isArray(tasks) ? tasks : [];
  const snapshot = {
    extractedAt: new Date().toISOString(),
    source: BASE,
    projectId: PROJECT_ID,
    sprintsSource,
    counts: {
      tasks: taskArr.length,
      sprints: Array.isArray(sprints) ? sprints.length : 0,
      statuses: project && project.statuses ? project.statuses.length : 0,
      tags: Array.isArray(tags) ? tags.length : 0,
    },
    project: project && !project.__error
      ? { id: project.id, name: project.name, prefix: project.prefix, startDate: project.startDate, deadline: project.deadline, ownerId: project.ownerId, statuses: project.statuses }
      : project,
    sprints,
    tasks: taskArr,
    tags,
  };

  const file = path.join(outDir, `zso-${host}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(path.join(outDir, `zso-${host}-latest.json`), JSON.stringify(snapshot, null, 2));

  console.log(`Extracted ZSocial(Nexus) from ${BASE}`);
  console.log(`  tasks:    ${snapshot.counts.tasks}`);
  console.log(`  sprints:  ${snapshot.counts.sprints} (${sprintsSource})`);
  console.log(`  statuses: ${snapshot.counts.statuses}`);
  console.log(`  tags:     ${snapshot.counts.tags}`);
  console.log(`  saved ->  ${path.relative(process.cwd(), file)}`);

  // Surface any endpoint errors so we notice missing APIs on the VPS.
  for (const [k, v] of Object.entries({ project, tasks, tags })) {
    if (v && (v.__error || v.__fetchError || v.__nonjson)) {
      console.log(`  WARN ${k}: ${JSON.stringify(v)}`);
    }
  }
})();
