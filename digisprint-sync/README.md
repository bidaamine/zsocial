# digisprint-sync

Automation for the **ZSocial(Nexus)** project board in DigiSprint (the JIRA-clone). Each
script talks to DigiSprint's admin API and takes a base URL, so the same scripts run against
local (`http://localhost:3000`) and the VPS (`http://37.59.205.27`).

Project id: `cmr5hxyti015pjn7wxd0fdhqm` (override with `ZSO_PROJECT_ID`).

## Scripts

| Script | What it does |
|---|---|
| `extract-tasks.js [url]` | **Read-only.** Snapshots project + sprints + tasks + tags to `snapshots/` (rollback baseline). Falls back to deriving sprints from tasks if the host lacks the sprints API. |
| `generate-tasks.js [url] [--apply]` | Authors the full plan (epics + Conception + 16 sprints + service stories with nested subtasks) from the PDF + what's really built. Dry-run by default; `--apply` **deletes existing tasks/sprints then bulk-imports**. One dev per story; status reflects reality. |
| `reconcile-sprints.js [url] [--apply]` | Re-dates + re-statuses existing sprints (Conception Jun 1–20, weekly from Sun Jun 21; today = Sprint 4 active). |
| `reconcile-task-status.js [url] [--apply]` | Sets task status from a service-level "what's built" allowlist (built → Done, frontend/UI + unbuilt → To Do). Never downgrades. |
| `update-status-colors.js [url]` | Writes the Flat UI Colors 2 palette into the project's task statuses. |

## Typical flow

```bash
# 1) snapshot the source of truth first (VPS holds the latest)
node extract-tasks.js http://37.59.205.27

# 2) build + review on LOCAL
node generate-tasks.js http://localhost:3000            # dry-run
node generate-tasks.js http://localhost:3000 --apply
node update-status-colors.js http://localhost:3000

# 3) once happy AND the DigiSprint API/UI changes are deployed, run against the VPS
node generate-tasks.js http://37.59.205.27 --apply
node update-status-colors.js http://37.59.205.27
```

## DigiSprint-side changes these rely on
The DigiSprint app must have (deploy to the VPS before running there):
- `src/pages/api/admin/sprints/{index,[id]}.ts` — sprints admin CRUD API
- `src/pages/api/admin/bulk-import.ts` — nested `subtasks` support (sets `parentId`)
- status badge colours driven by the DB (`src/pages/{index,stats}.tsx`, `projects/[id].tsx`)
- sprint "Completed partially (x/y)" badge (`projects/[id].tsx`)
