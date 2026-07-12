// Author a fresh, accurate ZSocial(Nexus) plan (epics + conception + 16 sprints + tasks)
// and load it into DigiSprint via the admin API.
//
// Usage:
//   node generate-tasks.js [baseUrl]            -> DRY-RUN (prints plan summary + payload stats)
//   node generate-tasks.js [baseUrl] --apply    -> deletes existing tasks/sprints, then bulk-imports
//
// Status reflects reality as of 2026-07-12: built services = Done (backend/db/doc/testing),
// their frontend/UI = To Do; unbuilt services/apps = To Do. Assignees per team rules.

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.DIGISPRINT_URL || 'http://localhost:3000').replace(/\/$/, '');
const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.ZSO_PROJECT_ID || 'cmr5hxyti015pjn7wxd0fdhqm';

// ── Team (assignee names must match DigiSprint users) ────────────────
const BACKEND = ['BIDA Mohamed Amine', 'Imene Saichi', 'Lydia Madoun'];
const AI = ['BIDA Mohamed Amine', 'Anis Oukid', 'ichrak benamara', 'Saad allah Bourzam'];

// ── Sprint calendar (Jun 21 anchor, weekly, tail clamped to Sep 30) ──
const TODAY = new Date('2026-07-12T12:00:00Z');
const DEADLINE = new Date('2026-09-30T18:00:00Z');
const S1 = new Date('2026-06-21T09:00:00Z');
function sprintDates(n) {
  if (n === 0) return { startDate: '2026-06-01T09:00:00Z', endDate: '2026-06-20T18:00:00Z' };
  const start = new Date(S1); start.setUTCDate(start.getUTCDate() + (n - 1) * 7);
  let end = new Date(start); end.setUTCDate(start.getUTCDate() + 6); end.setUTCHours(18, 0, 0, 0);
  if (start > DEADLINE) start.setTime(new Date('2026-09-29T09:00:00Z').getTime());
  if (end > DEADLINE) end = new Date(DEADLINE);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}
function sprintStatus(n) {
  const { startDate, endDate } = sprintDates(n);
  const s = new Date(startDate), e = new Date(endDate);
  if (e < TODAY) return 'COMPLETED'; if (s <= TODAY && TODAY <= e) return 'ACTIVE'; return 'PLANNED';
}

const SPRINT_META = {
  0: 'Conception & Design (source of truth, architecture, data & security design)',
  1: 'Identity & Infrastructure',
  2: 'Consent, Privacy & Profiles',
  3: 'Content, Media & LLM Router',
  4: 'Social Graph, Child Safety, Messaging & Notifications',
  5: 'Observability, Security, Compliance & API Gateway',
  6: 'Family Hub & Corporate Foundation',
  7: 'Corporate Marketing & HR Intelligence',
  8: 'AI Life Orchestrator',
  9: 'Search & Realtime',
  10: 'Billing & Analytics',
  11: 'Marketplace, Business Growth & Personal Finance',
  12: 'AI Emotional Intelligence & Digital Twin',
  13: 'AI Generational Memory & Predictive Crisis',
  14: 'AI Collective Intelligence & Universal Translator',
  15: 'AI Immersive Reality & Ops/Marketing AI',
  16: 'Client Apps (Web, Mobile, AR/VR) & Design System',
};

// ── Epics (PDF layers) ───────────────────────────────────────────────
const EPICS = [
  { title: 'Conception & Architecture', description: 'PDF vision analysis, system architecture, data & security design.' },
  { title: 'Platform Core Services', description: 'Identity, infrastructure, profiles.' },
  { title: 'Security, Privacy & Compliance', description: 'Zero-trust, consent, privacy engine, audit, compliance.' },
  { title: 'Data, Content & Social', description: 'Media, content, social graph, messaging, notifications.' },
  { title: 'Child Safety & Family', description: 'Safeguarding, family hub, harmony engine.' },
  { title: 'Corporate Suite', description: 'Companies, branding/marketing, HR/talent.' },
  { title: 'AI Orchestration Plane', description: 'LLM router and the AI Life Orchestrator.' },
  { title: 'AI Domain Agents', description: 'Health, education, emotion, twin, memory, crisis, translator, etc.' },
  { title: 'Growth, Ops & Marketplace', description: 'Search, billing, analytics, marketplace, ops, integrations.' },
  { title: 'Client Apps & UX', description: 'Web, mobile, admin, AR/VR, design system.' },
];

// Standard subtask template. `done` marks built (backend/db/doc/testing) for built services.
function std(service, { db = 1, be = 1, fe = 1, ui = 1, doc = 1, test = 1 } = {}) {
  const t = [];
  if (db) t.push({ cat: 'database', title: `Schema & entities for ${service}`, backendish: true });
  if (be) t.push({ cat: 'backend', title: `Core logic, endpoints & guards for ${service}`, backendish: true });
  if (be > 1) t.push({ cat: 'backend', title: `Events, integrations & GDPR cascade for ${service}`, backendish: true });
  if (fe) t.push({ cat: 'frontend', title: `${service} UI integration`, backendish: false });
  if (ui) t.push({ cat: 'UI', title: `${service} screens & styling (design tokens)`, backendish: false });
  if (doc) t.push({ cat: 'documentation', title: `${service} README & API contracts`, backendish: true });
  if (test) t.push({ cat: 'documentation', title: `${service} unit/integration tests`, backendish: true });
  return t;
}

// ── Services (the plan). built: true|false. team: 'backend'|'ai'. ────
const SERVICES = [
  // Sprint 0 — Conception (COMPLETED)
  { s: 0, epic: 'Conception & Architecture', title: 'Product Source of Truth & Backlog', team: 'backend', built: true, custom: [
    { cat: 'documentation', title: 'Analyse PDF vision (15 AI modules) & derive product backlog', done: true },
    { cat: 'documentation', title: 'Define roadmap phases (MVP → full ecosystem) & success metrics', done: true },
  ] },
  { s: 0, epic: 'Conception & Architecture', title: 'System Architecture', team: 'backend', built: true, custom: [
    { cat: 'documentation', title: 'Design 7-layer topology (client→gateway→AI→data→security→cloud)', done: true },
    { cat: 'documentation', title: 'Choose tech stack (NestJS, FastAPI, polyglot persistence, Kafka)', done: true },
  ] },
  { s: 0, epic: 'Conception & Architecture', title: 'Data Architecture', team: 'backend', built: true, custom: [
    { cat: 'database', title: 'Design polyglot schema (Postgres/Timescale/Neo4j/Redis/Milvus/MinIO/ClickHouse)', done: true },
    { cat: 'database', title: 'Model core entities & event-contract topics', done: true },
  ] },
  { s: 0, epic: 'Conception & Architecture', title: 'Security & Privacy Framework Design', team: 'backend', built: true, custom: [
    { cat: 'documentation', title: 'Zero-trust RS256 model, child ZKP, GDPR/COPPA/HIPAA mapping', done: true },
  ] },
  { s: 0, epic: 'Client Apps & UX', title: 'Design System', team: 'backend', built: true, custom: [
    { cat: 'UI', title: 'Design tokens: colours, typography, domain colour-coding', done: true },
    { cat: 'documentation', title: 'Component library spec & accessibility (WCAG 2.1 AA) plan', done: true },
  ] },

  // Sprint 1 — Identity & Infrastructure (COMPLETED, built)
  { s: 1, epic: 'Platform Core Services', title: 'Auth Service', team: 'backend', built: true, custom: [
    { cat: 'database', title: 'TypeORM entities (User, MfaConfig, Passkey, OAuthProfile, RefreshToken, UserDevice)', done: true },
    { cat: 'backend', title: 'Credentials + bcrypt, RS256 KeysService, refresh-token rotation & sessions', done: true },
    { cat: 'backend', title: 'TOTP MFA, WebAuthn passkeys, Google OAuth, device anomaly Kafka alerts', done: true },
    { cat: 'frontend', title: 'Login / signup / MFA UI', done: false },
    { cat: 'documentation', title: 'Auth README & OpenAPI contracts', done: true },
    { cat: 'documentation', title: 'Auth unit/integration tests', done: false },
  ] },
  { s: 1, epic: 'Platform Core Services', title: 'Infrastructure Setup', team: 'backend', built: true, custom: [
    { cat: 'database', title: 'docker-compose: Postgres, TimescaleDB, Neo4j, Redis, Kafka, Milvus, MinIO, Flink, ClickHouse', done: true },
    { cat: 'backend', title: 'Shared core-infra package (Postgres/Redis/Kafka/Neo4j/MinIO modules)', done: true },
    { cat: 'documentation', title: 'Monorepo (pnpm/turbo) & shared packages scaffolding', done: true },
  ] },

  // Sprint 2 — Consent, Privacy & Profiles (COMPLETED, built)
  { s: 2, epic: 'Security, Privacy & Compliance', title: 'Consent Service', team: 'backend', built: true },
  { s: 2, epic: 'Security, Privacy & Compliance', title: 'Privacy Engine', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'PII anonymization + Laplace differential privacy', done: true },
    { cat: 'backend', title: 'Cascading GDPR deletion across backups/data-lake/model checkpoints', done: true },
    { cat: 'documentation', title: 'Privacy Engine README & tests', done: true },
  ] },
  { s: 2, epic: 'Platform Core Services', title: 'User Profile Service', team: 'backend', built: true },

  // Sprint 3 — Content, Media & LLM Router (COMPLETED, built)
  { s: 3, epic: 'Data, Content & Social', title: 'Media File Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'Presigned S3, EICAR malware scan, Jimp thumbnails, MP4 atom parsing', done: true },
    { cat: 'backend', title: 'Fail-closed downloads, list/delete, GDPR erasure cascade', done: true },
    { cat: 'documentation', title: 'Media README & tests', done: true },
  ] },
  { s: 3, epic: 'Data, Content & Social', title: 'Content Service', team: 'backend', built: true },
  { s: 3, epic: 'AI Orchestration Plane', title: 'LLM Router', team: 'ai', built: true, custom: [
    { cat: 'backend', title: '4-axis classifier (task/latency/privacy/cost) + configurable routing table', done: true },
    { cat: 'backend', title: 'Multi-provider (OpenAI/Anthropic/Gemini) with failover, cost accounting, chains', done: true },
    { cat: 'backend', title: 'Edge-model registry + EU-AI-Act audit logging', done: true },
    { cat: 'documentation', title: 'Router README, schemas & 21 tests', done: true },
  ] },

  // Sprint 4 — Social, Child Safety, Messaging, Notifications (ACTIVE, built)
  { s: 4, epic: 'Data, Content & Social', title: 'Social Graph Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'Neo4j sync + Cypher mutual-connections / friends-of-friends', done: true },
    { cat: 'backend', title: 'UserConnection persistence + GDPR graph prune', done: true },
    { cat: 'documentation', title: 'Social README & tests', done: true },
  ] },
  { s: 4, epic: 'Child Safety & Family', title: 'Child Safety Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: '@MinAge age-gate (fail-closed), grooming/cyberbullying scan, COPPA', done: true },
    { cat: 'backend', title: 'Longitudinal emotional wellbeing monitoring + parent alerts', done: true },
    { cat: 'documentation', title: 'Child-safety README & tests', done: true },
  ] },
  { s: 4, epic: 'Data, Content & Social', title: 'Messaging Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'AES-256-GCM direct messages + history', done: true },
    { cat: 'backend', title: 'AI Twin message drafting via ai-model-router (resilient fallback)', done: true },
    { cat: 'documentation', title: 'Messaging README & tests', done: true },
  ] },
  { s: 4, epic: 'Data, Content & Social', title: 'Notification Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'Template engine, channel routing, resilient retries (simulated transports)', done: true },
    { cat: 'backend', title: 'Notification Intelligence: priority/focus-mode filtering + health score', done: true },
    { cat: 'documentation', title: 'Notification README & tests', done: true },
  ] },

  // Sprint 5 — Observability, Security, Compliance, Gateway (built ahead → Done)
  { s: 5, epic: 'Security, Privacy & Compliance', title: 'Audit Observability Service', team: 'backend', built: true },
  { s: 5, epic: 'Security, Privacy & Compliance', title: 'Security Agent', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'RS256 zero-trust guard + threat scoring (Redis rate + impossible-travel)', done: true },
    { cat: 'backend', title: 'Child-data protection interceptor (AES-GCM) — registered globally', done: true },
    { cat: 'backend', title: 'Real GeoIP for impossible-travel (currently hardcoded)', done: false },
    { cat: 'documentation', title: 'Security-agent README & tests', done: true },
  ] },
  { s: 5, epic: 'Security, Privacy & Compliance', title: 'Audit Compliance Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'GDPR-SLA, HIPAA-WORM, PCI-DSS scanners (schema-aligned) + Article-30 ROPA', done: true },
    { cat: 'backend', title: 'CCPA/SOC2 scanners (inconclusive until marketing-activity/roles modelled)', done: false },
    { cat: 'documentation', title: 'Compliance README & tests', done: true },
  ] },
  { s: 5, epic: 'Platform Core Services', title: 'API Gateway & Edge Intelligence Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'Zero-trust reverse proxy registry (10 services) + rate limiter', done: true },
    { cat: 'backend', title: 'Full token-authenticated E2E verification vs real infra', done: true },
    { cat: 'documentation', title: 'Gateway README', done: true },
  ] },

  // Sprint 6 — Family Hub & Corporate Foundation (built ahead → Done)
  { s: 6, epic: 'Child Safety & Family', title: 'Family Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'Household management, roles/authority, milestones, dashboard', done: true },
    { cat: 'backend', title: 'Family Harmony Engine (family stress, communication, milestone alerts)', done: true },
    { cat: 'documentation', title: 'Family README & tests', done: true },
  ] },
  { s: 6, epic: 'Corporate Suite', title: 'Corporate Profile Pages Service', team: 'backend', built: true, custom: [
    { cat: 'backend', title: 'Multi-tenant companies, membership/roles, department org chart', done: true },
    { cat: 'documentation', title: 'Company README & tests', done: true },
  ] },

  // Sprint 7 — Corporate Marketing & HR (built ahead → Done)
  { s: 7, epic: 'Corporate Suite', title: 'AI Branding + Marketing', team: 'ai', built: true, custom: [
    { cat: 'backend', title: 'Brand kits + AI brand/campaign generation via model-router (fallback)', done: true },
    { cat: 'backend', title: 'Fail-closed company-membership isolation', done: true },
    { cat: 'documentation', title: 'Branding README & tests', done: true },
  ] },
  { s: 7, epic: 'Corporate Suite', title: 'AI HR + Talent Intelligence', team: 'ai', built: true, custom: [
    { cat: 'backend', title: 'Job postings + anonymised candidate pipeline', done: true },
    { cat: 'backend', title: 'Bias-mitigated, explainable screening (competency-only scoring)', done: true },
    { cat: 'documentation', title: 'HR README & tests', done: true },
  ] },

  // Sprint 8 — AI Life Orchestrator (built ahead → Done)
  { s: 8, epic: 'AI Orchestration Plane', title: 'AI Life Orchestrator', team: 'ai', built: true, custom: [
    { cat: 'backend', title: 'Real-time life-state model (6 probabilistic dimensions from signals)', done: true },
    { cat: 'backend', title: 'Priority engine, cross-domain conflict resolution, 3-horizon decisions', done: true },
    { cat: 'backend', title: 'Router-backed briefing, proactive action log + 24h override, 15-min loop', done: true },
    { cat: 'documentation', title: 'Orchestrator DOCS.md, Dockerfile & 16 tests', done: true },
  ] },

  // Sprints 9-16 — NOT yet built (To Do)
  { s: 9, epic: 'Growth, Ops & Marketplace', title: 'Search Service', team: 'backend', built: false },
  { s: 9, epic: 'Data, Content & Social', title: 'Realtime Service', team: 'backend', built: false },
  { s: 10, epic: 'Growth, Ops & Marketplace', title: 'Billing Service', team: 'backend', built: false },
  { s: 10, epic: 'Growth, Ops & Marketplace', title: 'Analytics Service', team: 'backend', built: false },
  { s: 11, epic: 'Growth, Ops & Marketplace', title: 'Marketplace Service', team: 'backend', built: false },
  { s: 11, epic: 'Growth, Ops & Marketplace', title: 'Business Growth Service', team: 'backend', built: false },
  { s: 11, epic: 'Growth, Ops & Marketplace', title: 'Personal Finance Service', team: 'backend', built: false },
  // AI Health / Education / Fitness were started in Sprint 3 by Ichrak / Saad / Anis
  // (in progress, not finished — so Sprint 3 completes only partially).
  { s: 3, epic: 'AI Domain Agents', title: 'AI Health + Wellness Advisor', team: 'ai', dev: 'ichrak benamara', custom: [
    { cat: 'database', title: 'Health signal model (HRV, symptoms, wearables)', done: true },
    { cat: 'backend', title: 'Service scaffold + model-router integration', done: false },
    { cat: 'backend', title: 'Symptom triage + multi-signal health modelling', done: false },
    { cat: 'documentation', title: 'Health AI README & tests', done: false },
  ] },
  { s: 3, epic: 'AI Domain Agents', title: 'AI Education Intelligence', team: 'ai', dev: 'Saad allah Bourzam', custom: [
    { cat: 'database', title: 'Learner profile & cognitive-fingerprint model', done: true },
    { cat: 'backend', title: 'Service scaffold + model-router integration', done: false },
    { cat: 'backend', title: 'Adaptive curriculum + Socratic tutor logic', done: false },
    { cat: 'documentation', title: 'Education AI README & tests', done: false },
  ] },
  { s: 3, epic: 'AI Domain Agents', title: 'AI Fitness + Daily Life Manager', team: 'ai', dev: 'Anis Oukid', custom: [
    { cat: 'database', title: 'Body metrics, recovery & training-load model', done: true },
    { cat: 'backend', title: 'Service scaffold + model-router integration', done: false },
    { cat: 'backend', title: 'Periodised training + readiness score engine', done: false },
    { cat: 'documentation', title: 'Fitness AI README & tests', done: false },
  ] },
  { s: 12, epic: 'AI Domain Agents', title: 'AI Emotional Intelligence', team: 'ai', built: false },
  { s: 12, epic: 'AI Domain Agents', title: 'AI Digital Twin System', team: 'ai', built: false },
  { s: 13, epic: 'AI Domain Agents', title: 'AI Generational Memory', team: 'ai', built: false },
  { s: 13, epic: 'AI Domain Agents', title: 'AI Predictive Crisis', team: 'ai', built: false },
  { s: 14, epic: 'AI Domain Agents', title: 'AI Collective Intelligence', team: 'ai', built: false },
  { s: 14, epic: 'AI Domain Agents', title: 'Universal AI Translator + Cultural Engine', team: 'ai', built: false },
  { s: 15, epic: 'AI Domain Agents', title: 'AI Immersive Reality Layer', team: 'ai', built: false },
  { s: 15, epic: 'AI Domain Agents', title: 'AI Operations + Marketing Command AI', team: 'ai', built: false },
  { s: 16, epic: 'Client Apps & UX', title: 'Web & Mobile Client Apps', team: 'backend', built: false, custom: [
    { cat: 'frontend', title: 'Web app (personal + corporate dashboards)', done: false },
    { cat: 'frontend', title: 'iOS/Android mobile app', done: false },
    { cat: 'UI', title: 'Child Safe Mode & AI Companion chat UI', done: false },
    { cat: 'frontend', title: 'AR/VR immersive layer (Phase 3)', done: false },
  ] },
];

// ── Build the bulk-import payload ────────────────────────────────────
const pick = (arr, i) => arr[i % arr.length];
function buildPayload() {
  const sprintMap = {}; // n -> sprint obj
  for (let n = 0; n <= 16; n++) {
    const { startDate, endDate } = sprintDates(n);
    sprintMap[n] = {
      name: n === 0 ? 'Sprint 0: Conception & Design' : `Sprint ${n}: ${SPRINT_META[n]}`,
      goal: SPRINT_META[n], startDate, endDate, status: sprintStatus(n), tasks: [],
    };
  }
  // Category → title prefix.
  const CAT_PREFIX = { backend: 'BACKEND', frontend: 'FRONTEND', database: 'DB', UI: 'UI', documentation: 'DOC' };
  // Completed AI work was all done by Mohamed; the remaining AI agents are split
  // across Anis / Saad / Ichrak (with fitness=Anis, education=Saad, health=Ichrak fixed on the services).
  const AI_UNBUILT = ['Anis Oukid', 'Saad allah Bourzam', 'ichrak benamara'];
  const cursor = { backend: 0, aiUnbuilt: 0 };
  function assigneeFor(svc) {
    if (svc.dev) return svc.dev;                                   // forced owner
    if (svc.team === 'ai') return svc.built ? 'BIDA Mohamed Amine' // done AI = Mohamed only
      : pick(AI_UNBUILT, cursor.aiUnbuilt++);
    return pick(BACKEND, cursor.backend++);                        // backend round-robin
  }

  // One dev owns each whole story.
  for (const svc of SERVICES) {
    const assignee = assigneeFor(svc);

    const subsDef = svc.custom || std(svc.title);
    const subtasks = subsDef.map((sub) => {
      const isFe = sub.cat === 'frontend' || sub.cat === 'UI';
      const done = sub.done !== undefined ? sub.done : (svc.built && !isFe);
      const prefix = CAT_PREFIX[sub.cat] || sub.cat.toUpperCase();
      return {
        title: `[${prefix}] ${sub.title}`,
        type: 'TASK', category: sub.cat, epicTitle: svc.epic,
        status: done ? 'Done' : 'To Do',
        priority: svc.built ? 'HIGH' : 'MEDIUM', storyPoints: 3,
        assigneeName: assignee, // same dev as the story
      };
    });

    // Story status derived from its subtasks: all done -> Done, some done -> In Progress.
    const doneCount = subtasks.filter((t) => t.status === 'Done').length;
    const storyStatus = doneCount === 0 ? 'To Do' : (doneCount === subtasks.length ? 'Done' : 'In Progress');

    sprintMap[svc.s].tasks.push({
      title: `${svc.title} Implementation`, type: 'USER_STORY', epicTitle: svc.epic,
      status: storyStatus, priority: svc.built ? 'HIGH' : 'MEDIUM',
      storyPoints: 8, assigneeName: assignee,
      subtasks,
    });
  }
  return {
    projectId: PROJECT_ID,
    epics: EPICS.map((e) => ({ title: e.title, description: e.description, type: 'EPIC', status: 'To Do' })),
    sprints: Object.values(sprintMap),
  };
}

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: r.ok, status: r.status, json };
}

async function resetProject() {
  console.log('Deleting existing tasks + sprints...');
  const tasks = (await api('GET', `/api/admin/tasks?projectId=${PROJECT_ID}`)).json || [];
  // Delete subtasks/children first is unnecessary (cascade), but delete leaf-first to be safe.
  const sorted = [...tasks].sort((a, b) => (a.type === 'EPIC' ? 1 : 0) - (b.type === 'EPIC' ? 1 : 0));
  let td = 0;
  for (const t of sorted) { const r = await api('DELETE', `/api/admin/tasks/${t.id}`); if (r.ok) td++; }
  const sprints = (await api('GET', `/api/admin/sprints?projectId=${PROJECT_ID}`)).json || [];
  let sd = 0;
  for (const s of sprints) { const r = await api('DELETE', `/api/admin/sprints/${s.id}`); if (r.ok) sd++; }
  console.log(`  deleted ${td} tasks, ${sd} sprints.`);
}

(async () => {
  const payload = buildPayload();
  const flat = (s) => s.tasks.flatMap((t) => [t, ...(t.subtasks || [])]);
  const allTasks = payload.sprints.flatMap(flat);
  const totalTasks = allTasks.length;
  const by = (st) => allTasks.filter((t) => t.status === st).length;
  console.log(`Target: ${BASE}  (${APPLY ? 'APPLY' : 'DRY-RUN'})\n`);
  console.log(`Plan: ${payload.epics.length} epics, ${payload.sprints.length} sprints, ${payload.sprints.reduce((a, s) => a + s.tasks.length, 0)} stories, ${totalTasks} tasks total`);
  console.log(`Status: Done ${by('Done')}, In Progress ${by('In Progress')}, To Do ${by('To Do')}\n`);
  for (const s of payload.sprints) {
    const items = flat(s);
    const d = items.filter((t) => t.status === 'Done').length;
    const ip = items.filter((t) => t.status === 'In Progress').length;
    console.log(`  ${s.name.slice(0, 48).padEnd(48)} ${String(s.startDate).slice(0, 10)} ${s.status.padEnd(9)} stories=${String(s.tasks.length).padStart(2)} tasks=${String(items.length).padStart(3)} done=${d} ip=${ip}`);
  }
  if (!APPLY) { console.log('\nDry-run only. Re-run with --apply to reset + import.'); return; }

  await resetProject();
  console.log('Bulk-importing new plan...');
  const r = await api('POST', '/api/admin/bulk-import', payload);
  console.log(r.ok ? `  ${JSON.stringify(r.json.results)}` : `  FAILED ${r.status}: ${JSON.stringify(r.json)}`);
})();
