// Recolour the ZSocial(Nexus) task statuses using the Flat UI Colors 2 palette
// (the colours from the reference image). Usage: node update-status-colors.js [baseUrl]
const BASE = (process.argv[2] || process.env.DIGISPRINT_URL || 'http://localhost:3000').replace(/\/$/, '');
const PROJECT_ID = process.env.ZSO_PROJECT_ID || 'cmr5hxyti015pjn7wxd0fdhqm';

// status name -> hex (palette: Mint Leaf, Green Darner Tail, Bright Yarrow, Shy Moment,
// Pico-8 Pink, Robin's Egg Blue, Chi-Gong, American River, Soothing Breeze)
const COLORS = {
  'Backlog': '#b2bec3',      // Soothing Breeze
  'To Do': '#74b9ff',        // Green Darner Tail
  'In Progress': '#fdcb6e',  // Bright Yarrow
  'Review': '#a29bfe',       // Shy Moment
  'Testing': '#fd79a8',      // Pico-8 Pink
  'QA': '#00cec9',           // Robin's Egg Blue
  'Done': '#00b894',         // Mint Leaf
  'Blocked': '#d63031',      // Chi-Gong
  'Cancelled': '#636e72',    // American River
};

async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: r.ok, status: r.status, json };
}

(async () => {
  const statuses = (await api('GET', `/api/admin/statuses?projectId=${PROJECT_ID}`)).json || [];
  for (const s of statuses) {
    const color = COLORS[s.name];
    if (!color || color === s.color) { console.log(`  ${s.name}: ${s.color} (unchanged)`); continue; }
    const r = await api('PATCH', `/api/admin/statuses/${s.id}`, { color });
    console.log(`  ${s.name}: ${s.color} -> ${color} ${r.ok ? 'OK' : 'FAIL ' + r.status}`);
  }
})();
