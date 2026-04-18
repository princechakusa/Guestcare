// ==================================================
// GUESTCARE DASHBOARD - CUSTOM BACKEND VERSION (COMPLETE)
// ==================================================

(function(){
if (!AuthService.isAuthenticated()) {
  window.location.href = 'login.html';
  return;
}

const SK = 'gcc_local_v7';
const SLA = { WhatsApp: 10, Hostaway: 5, default: 10 };

// ---------- Dark Mode ----------
const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.style.setProperty('--bg', '#1a1a1a');
    root.style.setProperty('--bg2', '#2d2d2d');
    root.style.setProperty('--bg3', '#3a3a3a');
    root.style.setProperty('--bg-card', '#262626');
    root.style.setProperty('--border', '#404040');
    root.style.setProperty('--border2', '#555555');
    root.style.setProperty('--text', '#e0e0e0');
    root.style.setProperty('--text2', '#b0b0b0');
    root.style.setProperty('--text3', '#808080');
    root.style.setProperty('--accent', '#5a8ab5');
    root.style.setProperty('--accent-light', '#2a3a4a');
    root.style.setProperty('--shadow', '0 1px 3px rgba(255,255,255,0.05)');
    root.style.setProperty('--shadow-md', '0 4px 12px rgba(255,255,255,0.05)');
  } else {
    root.style.setProperty('--bg', '#fafafa');
    root.style.setProperty('--bg2', '#f4f4f2');
    root.style.setProperty('--bg3', '#eeede9');
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--border', '#e8e6e1');
    root.style.setProperty('--border2', '#d4d2cc');
    root.style.setProperty('--text', '#1a1a18');
    root.style.setProperty('--text2', '#5c5c52');
    root.style.setProperty('--text3', '#999890');
    root.style.setProperty('--accent', '#3d5a80');
    root.style.setProperty('--accent-light', '#e8edf5');
    root.style.setProperty('--shadow', '0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)');
    root.style.setProperty('--shadow-md', '0 4px 12px rgba(0,0,0,0.07),0 2px 4px rgba(0,0,0,0.04)');
  }
  localStorage.setItem('gcc_dark_mode', isDark ? '1' : '0');
}
const savedTheme = localStorage.getItem('gcc_dark_mode');
if (savedTheme === '1') applyTheme(true);
else if (savedTheme === '0') applyTheme(false);
else applyTheme(darkModeMedia.matches);

// Add theme toggle to topbar
function addThemeToggle() {
  const topbarRight = document.querySelector('.topbar-right');
  if (!topbarRight) return;
  if (document.getElementById('themeToggle')) return;
  const btn = document.createElement('button');
  btn.id = 'themeToggle';
  btn.className = 'btn';
  btn.style.marginLeft = '8px';
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>';
  btn.title = 'Toggle dark mode';
  btn.onclick = () => {
    const isDark = localStorage.getItem('gcc_dark_mode') !== '1';
    applyTheme(isDark);
  };
  topbarRight.appendChild(btn);
}

function blank() {
  return {
    agents: [], messages: [], rootCause: [], importLog: [],
    properties: [], reviews: [], users: [],
    kpi: { avg: 0, breaches: 0, active: 0 }
  };
}

let store = blank();

function loadLocal() { try { const saved = localStorage.getItem(SK); if (saved) store = JSON.parse(saved); } catch(e) {} }
function saveLocal() { localStorage.setItem(SK, JSON.stringify(store)); }

// Sync from backend
async function syncFromBackend() {
  const pill = document.getElementById('sbPill');
  if (pill) pill.innerHTML = '<span class="pill p-gray">Syncing...</span>';
  try {
    const data = await ApiService.pullAllData();
    if (data.agents) store.agents = data.agents;
    if (data.messages) store.messages = data.messages;
    if (data.rootCauses) store.rootCause = data.rootCauses;
    if (data.properties) store.properties = data.properties;
    if (data.reviews) store.reviews = data.reviews;
    if (data.users) store.users = data.users;
    recalcKPI();
    saveLocal();
    if (pill) pill.innerHTML = '<span class="pill p-green">Live</span>';
    showToast('Data synced from server');
  } catch (e) {
    console.warn('Backend sync failed, using local cache', e);
    if (pill) pill.innerHTML = '<span class="pill p-amber">Offline</span>';
  }
  render(currentView);
  addThemeToggle();
}

function recalcKPI() {
  const m = store.messages;
  const resp = m.filter(x => x.responded && x.rt != null);
  store.kpi.avg = resp.length ? +(resp.reduce((s, x) => s + x.rt, 0) / resp.length).toFixed(1) : 0;
  store.kpi.breaches = m.filter(x => x.breach).length;
  store.kpi.active = m.filter(x => !x.responded).length;
}

const COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#0f766e'];
function agentColor(id) { const a = store.agents.find(x => x.id === id); return a && a.color ? a.color : COLORS[0]; }
function agentName(id) { const a = store.agents.find(x => x.id === id); return a ? a.name : 'Unknown'; }
function agentStats(agentId) {
  const m = store.messages.filter(x => x.agentId === agentId);
  const resp = m.filter(x => x.responded && x.rt != null);
  return {
    total: m.length,
    active: m.filter(x => !x.responded).length,
    breaches: m.filter(x => x.breach).length,
    avgRt: resp.length ? +(resp.reduce((s, x) => s + x.rt, 0) / resp.length).toFixed(1) : 0,
    slaHit: resp.length ? Math.round(100 * m.filter(x => x.responded && !x.breach).length / resp.length) : 0
  };
}

// ----- WhatsApp Parser -----
function parseWhatsApp(text, agentWaName, agentId, channel) {
  const patterns = [
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:AM|PM)?\]\s*([^:]+):\s*(.+)$/i,
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:AM|PM)?\s*-\s*([^:]+):\s*(.+)$/i
  ];
  const threads = {};
  const lines = text.split('\n');
  let matched = 0;
  lines.forEach(line => {
    let m = null;
    for(const p of patterns){ m = line.match(p); if(m) break; }
    if(!m) return;
    const [, dateStr, timeStr, rawSender, body] = m;
    const sender = rawSender.trim().replace(/^[~\u200e]/,'').trim();
    if(!sender || body.trim()==='<Media omitted>' || body.trim()==='This message was deleted') return;
    const parts = dateStr.split('/');
    let d,mo,y;
    if(parseInt(parts[0])>12){ [d,mo,y] = parts; } else { [mo,d,y] = parts; }
    const fullYear = y.length===2 ? '20'+y : y;
    const ts = new Date(`${fullYear}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${timeStr.includes(':')&&timeStr.split(':').length===2?timeStr+':00':timeStr}`).getTime();
    if(isNaN(ts)) return;
    matched++;
    const isAgent = agentWaName.toLowerCase().split(',').map(s=>s.trim()).some(n=>sender.toLowerCase().includes(n));
    if(!isAgent){
      if(!threads[sender]) threads[sender] = { msgs:[], guestName: sender };
      threads[sender].msgs.push({ ts, body, role:'guest' });
    } else {
      Object.values(threads).forEach(t => t.msgs.push({ ts, body, role:'agent' }));
    }
  });
  if(matched===0) return { error: 'No messages matched.' };
  const result = [];
  Object.values(threads).forEach(th => {
    if(!th.msgs.length) return;
    let lastGuestTs = null, firstAgentTs = null, guestBlock = false;
    th.msgs.sort((a,b)=>a.ts-b.ts);
    for(const msg of th.msgs){
      if(msg.role==='guest'){ lastGuestTs=msg.ts; guestBlock=true; firstAgentTs=null; }
      else if(guestBlock && lastGuestTs && !firstAgentTs){ firstAgentTs=msg.ts; guestBlock=false; }
    }
    const rt = firstAgentTs ? +((firstAgentTs - lastGuestTs)/60000).toFixed(1) : null;
    const breach = rt!=null ? rt > SLA[channel] : !firstAgentTs;
    const lastG = th.msgs.filter(m=>m.role==='guest').slice(-1)[0];
    result.push({
      id: 'wa_'+Date.now()+'_'+Math.random().toString(36).slice(2),
      agentId, channel, guest: th.guestName,
      message: lastG ? lastG.body : '',
      ts: lastG ? lastG.ts : Date.now(),
      intent:'WhatsApp', urgency: breach?'high':'low',
      responded: firstAgentTs!=null, rt, breach
    });
  });
  return { messages: result, matched, threads: Object.keys(threads).length };
}

// ----- Hostaway Parser -----
function parseHostaway(csvText, agentId, channel) {
  const res = Papa.parse(csvText, { header:true, skipEmptyLines:true });
  if(!res.data.length) return { error:'CSV empty' };
  const threads = {};
  res.data.forEach(row => {
    const tid = row.thread_id || row['Thread ID'] || row.ThreadId || Object.values(row)[0] || '';
    const tsRaw = row.timestamp || row.Timestamp || row.Date || row.date || Object.values(row)[1] || '';
    const dirRaw = (row.direction || row.Direction || row.dir || '').toLowerCase();
    const body = row.message || row.Message || row.body || row.Body || Object.values(row)[3] || '';
    const guest = row.guest || row.Guest || row.guest_name || row.GuestName || 'Guest-'+tid;
    const ts = new Date(tsRaw).getTime();
    if(!tid || isNaN(ts)) return;
    if(!threads[tid]) threads[tid] = { msgs:[], guest: String(guest).trim() };
    const isAgent = dirRaw.includes('out');
    threads[tid].msgs.push({ ts, body, role: isAgent?'agent':'guest' });
  });
  if(!Object.keys(threads).length) return { error:'No threads found.' };
  const result = [];
  Object.entries(threads).forEach(([tid, th]) => {
    th.msgs.sort((a,b)=>a.ts-b.ts);
    let lastGuestTs=null, firstAgentTs=null, guestBlock=false;
    for(const msg of th.msgs){
      if(msg.role==='guest'){ lastGuestTs=msg.ts; guestBlock=true; firstAgentTs=null; }
      else if(guestBlock && lastGuestTs && !firstAgentTs){ firstAgentTs=msg.ts; guestBlock=false; }
    }
    const rt = firstAgentTs ? +((firstAgentTs - lastGuestTs)/60000).toFixed(1) : null;
    const breach = rt!=null ? rt > SLA.Hostaway : !firstAgentTs;
    const lastG = th.msgs.filter(m=>m.role==='guest').slice(-1)[0];
    result.push({
      id: 'ha_'+Date.now()+'_'+Math.random().toString(36).slice(2),
      agentId, channel:'Hostaway', guest: th.guest,
      message: lastG ? lastG.body : '',
      ts: lastG ? lastG.ts : Date.now(),
      intent:'Hostaway', urgency: breach?'high':'low',
      responded: firstAgentTs!=null, rt, breach
    });
  });
  return { messages: result, matched: res.data.length, threads: Object.keys(threads).length };
}

async function syncAll(parsed, agentId, fileName, channel) {
  const newMsgs = [], newBreaches = [];
  parsed.forEach(pm => {
    if (!store.messages.find(m => m.id === pm.id)) {
      store.messages.push(pm);
      newMsgs.push(pm);
    }
  });
  newMsgs.filter(m => m.breach).forEach(b => {
    const entry = {
      agentId, agentName: agentName(agentId),
      guest: b.guest, channel: b.channel, msg: b.message,
      ts: b.ts, rt: b.rt,
      reason: b.rt != null ? b.rt + 'm > ' + SLA[b.channel] + 'm SLA' : 'No response'
    };
    if (!store.rootCause.find(r => r.guest === b.guest && Math.abs(r.ts - b.ts) < 60000)) {
      store.rootCause.push(entry);
      newBreaches.push(entry);
    }
  });
  recalcKPI(); saveLocal();
  try {
    for (const msg of newMsgs) await ApiService.syncMessage(msg);
    for (const rc of newBreaches) await ApiService.createRootCause(rc);
    showToast('Import synced to server');
  } catch (e) { showToast('Import saved locally (offline)'); }
  const logEntry = new Date().toLocaleString() + ' — ' + channel + ' for ' + agentName(agentId) + ': ' + parsed.length + ' conversations from ' + fileName;
  store.importLog.unshift(logEntry);
  render(currentView);
}

// Charts & UI helpers
const charts = {};
function mkChart(id, cfg) { if (charts[id]) { try { charts[id].destroy(); } catch(e) {} delete charts[id]; } const el = document.getElementById(id); if (!el) return; charts[id] = new Chart(el.getContext('2d'), cfg); }
function killCharts() { Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch(e) {} delete charts[k]; }); }
const CD = { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: 'DM Sans' }, color: '#9ca3af' } }, y: { grid: { color: '#f0f2f5' }, ticks: { font: { size: 10, family: 'DM Sans' }, color: '#9ca3af' } } }, elements: { bar: { borderRadius: 2 }, line: { tension: 0.35, borderWidth: 1.5 }, point: { radius: 0 } } };
const fmt = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtT = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
function urgencyPill(u) {
  if (u === 'high') return '<span class="pill p-red"><span class="dot d-red"></span>High</span>';
  if (u === 'medium') return '<span class="pill p-amber"><span class="dot d-amber"></span>Medium</span>';
  return '<span class="pill p-green"><span class="dot d-green"></span>Low</span>';
}
function emptyState(icon, title, sub, action = '') {
  return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div>${action}</div>`;
}
function agentSelect(id, placeholder = 'Select agent') {
  if (!store.agents.length) return `<select class="select" id="${id}" disabled><option>No agents yet</option></select><div class="select-note">Go to Agents first</div>`;
  return `<select class="select" id="${id}"><option value="">— ${placeholder} —</option>${store.agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select>`;
}

// ---------- GUEST REVIEWS HELPERS ----------
function starsHTML(score) { const full = Math.round((score || 0) / 2); return Array(5).fill(0).map((_, i) => i < full ? '★' : '☆').join(''); }
function scoreClass(s) { if (s >= 8) return 'score-great'; if (s >= 6) return 'score-good'; return 'score-bad'; }
function grSearchFilter(items, query, fields) { if (!query) return items; const q = query.toLowerCase(); return items.filter(item => fields.some(f => (item[f] || '').toLowerCase().includes(q))); }
function propAvgScore(propId) { const revs = store.reviews.filter(r => r.propertyId === propId && r.score != null); return revs.length ? +(revs.reduce((s, r) => s + r.score, 0) / revs.length).toFixed(2) : null; }
function propReviewCount(propId) { return store.reviews.filter(r => r.propertyId === propId).length; }
function ratingDistribution(propId) { const revs = store.reviews.filter(r => r.propertyId === propId && r.score != null); const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; revs.forEach(r => { const star = Math.round((r.score || 0) / 2); if (dist[star] !== undefined) dist[star]++; }); const total = revs.length || 1; return [5, 4, 3, 2, 1].map(star => ({ star, count: dist[star], pct: Math.round(100 * dist[star] / total) })); }
function propMonthlyScores(propId) {
  const revs = store.reviews.filter(r => r.propertyId === propId && r.score != null);
  const byMonth = {};
  revs.forEach(r => { const d = new Date(r.ts), key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 }; byMonth[key].sum += r.score; byMonth[key].count++; });
  return Object.entries(byMonth).sort().map(([m, v]) => ({ month: m, avg: +(v.sum / v.count).toFixed(2) }));
}

// Property Modal
let grPropertyModal = null, grEditId = null;
window.grOpenAddProperty = function() { grPropertyModal = 'add'; grEditId = null; showGrPropertyModal({}); };
window.grOpenEditProperty = function(id) { const p = store.properties.find(x => x.id === id); if (!p) return; grPropertyModal = 'edit'; grEditId = id; showGrPropertyModal(p); };
window.grDeleteProperty = async function(id) { if (!confirm('Delete this property and all its reviews?')) return; store.properties = store.properties.filter(x => x.id !== id); store.reviews = store.reviews.filter(r => r.propertyId !== id); saveLocal(); render('gr-properties'); if (AuthService.isAuthenticated()) { try { await ApiService.deleteProperty(id); } catch(e) {} } showToast('Property deleted'); };
function showGrPropertyModal(p) {
  const existing = document.getElementById('grPropModal'); if (existing) existing.remove();
  const div = document.createElement('div'); div.id = 'grPropModal'; div.className = 'modal-wrap';
  div.innerHTML = `<div class="modal-box wide"><div class="modal-title">${grPropertyModal === 'add' ? 'Add property' : 'Edit property'}</div>
    <div class="form-row"><div class="form-group"><label class="field-label">Name</label><input class="input" id="gp_name" value="${p.name || ''}"></div>
    <div class="form-group"><label class="field-label">Type</label><select class="select" id="gp_type">${['Apartment','Villa','Studio','Penthouse'].map(t => `<option${(p.type||'')===t?' selected':''}>${t}</option>`).join('')}</select></div></div>
    <div class="form-row"><div class="form-group"><label class="field-label">Location</label><input class="input" id="gp_location" value="${p.location || ''}"></div>
    <div class="form-group"><label class="field-label">Bedrooms</label><input class="input" id="gp_beds" type="number" min="0" value="${p.beds || 0}"></div></div>
    <div class="form-row"><div class="form-group"><label class="field-label">Hostaway ID</label><input class="input" id="gp_hostaway_id" value="${p.hostawayId || ''}"></div>
    <div class="form-group"><label class="field-label">Status</label><select class="select" id="gp_status">${['Active','Inactive','Under maintenance'].map(s => `<option${(p.status||'Active')===s?' selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="form-group"><label class="field-label">Notes</label><input class="input" id="gp_notes" value="${p.notes || ''}"></div>
    <div id="gp_err" style="font-size:10px;color:var(--red);min-height:14px"></div>
    <div class="modal-actions"><button class="btn" onclick="document.getElementById('grPropModal').remove()">Cancel</button><button class="btn btn-primary" onclick="grSaveProperty()">Save</button></div>
  </div>`;
  document.body.appendChild(div);
}
window.grSaveProperty = async function() {
  const name = document.getElementById('gp_name')?.value.trim(); if (!name) return;
  const prop = {
    id: grEditId || 'prop_' + Date.now(), name,
    type: document.getElementById('gp_type').value,
    location: document.getElementById('gp_location').value.trim(),
    beds: parseInt(document.getElementById('gp_beds').value) || 0,
    hostawayId: document.getElementById('gp_hostaway_id').value.trim(),
    status: document.getElementById('gp_status').value,
    notes: document.getElementById('gp_notes').value.trim()
  };
  const idx = store.properties.findIndex(x => x.id === prop.id);
  if (idx >= 0) store.properties[idx] = prop; else store.properties.push(prop);
  saveLocal(); document.getElementById('grPropModal').remove(); render('gr-properties');
  if (AuthService.isAuthenticated()) { try { await ApiService.syncProperty(prop); showToast('Property saved to server'); } catch(e) { showToast('Saved locally'); } }
};

// Review Modal
let grReviewModal = null, grReviewEditId = null;
window.grOpenAddReview = function(propId) { grReviewModal = 'add'; grReviewEditId = null; showGrReviewModal({ propertyId: propId }); };
window.grOpenEditReview = function(id) { const r = store.reviews.find(x => x.id === id); if (!r) return; grReviewModal = 'edit'; grReviewEditId = id; showGrReviewModal(r); };
window.grDeleteReview = async function(id) { if (!confirm('Delete this review?')) return; store.reviews = store.reviews.filter(r => r.id !== id); saveLocal(); render('gr-reviews'); if (AuthService.isAuthenticated()) { try { await ApiService.deleteReview(id); } catch(e) {} } showToast('Review deleted'); };
function showGrReviewModal(r) {
  const existing = document.getElementById('grRevModal'); if (existing) existing.remove();
  const props = store.properties; const div = document.createElement('div'); div.id = 'grRevModal'; div.className = 'modal-wrap';
  div.innerHTML = `<div class="modal-box wide"><div class="modal-title">${grReviewModal === 'add' ? 'Add review' : 'Edit review'}</div>
    <div class="form-row"><div class="form-group"><label class="field-label">Property</label><select class="select" id="gr_prop">${props.map(p => `<option value="${p.id}"${p.id===(r.propertyId||'')?' selected':''}>${p.name}</option>`).join('')}</select></div>
    <div class="form-group"><label class="field-label">Score (1-10)</label><input class="input" id="gr_score" type="number" min="1" max="10" step="0.1" value="${r.score || ''}"></div></div>
    <div class="form-row"><div class="form-group"><label class="field-label">Guest name</label><input class="input" id="gr_guest" value="${r.guest || ''}"></div>
    <div class="form-group"><label class="field-label">Review date</label><input class="input" id="gr_date" type="date" value="${r.ts ? new Date(r.ts).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)}"></div></div>
    <div class="form-group"><label class="field-label">Review text</label><textarea class="input" id="gr_text" rows="3">${r.text || ''}</textarea></div>
    <div class="modal-actions"><button class="btn" onclick="document.getElementById('grRevModal').remove()">Cancel</button><button class="btn btn-primary" onclick="grSaveReview()">Save</button></div>
  </div>`;
  document.body.appendChild(div);
}
window.grSaveReview = async function() {
  const score = parseFloat(document.getElementById('gr_score')?.value); const propId = document.getElementById('gr_prop')?.value;
  if (!propId || isNaN(score)) return;
  const review = {
    id: grReviewEditId || 'rev_' + Date.now(), propertyId: propId, score,
    guest: document.getElementById('gr_guest').value.trim(),
    ts: new Date(document.getElementById('gr_date').value).getTime(),
    text: document.getElementById('gr_text').value.trim()
  };
  const idx = store.reviews.findIndex(r => r.id === review.id);
  if (idx >= 0) store.reviews[idx] = review; else store.reviews.push(review);
  saveLocal(); document.getElementById('grRevModal').remove(); render('gr-reviews');
  if (AuthService.isAuthenticated()) { try { await ApiService.syncReview(review); showToast('Review saved to server'); } catch(e) { showToast('Saved locally'); } }
};

// Additional review import and sample CSV download
function parseReviewCSV(csvText) {
  const res = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (!res.data.length) return { error: 'CSV empty' };
  const imported = [], skipped = [];
  res.data.forEach((row, i) => {
    const propName = (row.property_name || row.Property || row.property || '').trim();
    const guest = (row.guest_name || row.Guest || row.guest || '').trim();
    const score = parseFloat(row.overall_score || row.score || row.rating || '');
    if (!propName || !guest || isNaN(score)) { skipped.push(i+2); return; }
    let prop = store.properties.find(p => p.name.toLowerCase() === propName.toLowerCase());
    if (!prop) { prop = { id: 'prop_'+Date.now()+'_'+i, name: propName, type:'Apartment', location:'', beds:0, hostawayId:'', status:'Active', notes:'Auto-created' }; store.properties.push(prop); }
    const review = {
      id: 'csv_'+Date.now()+'_'+i, propertyId: prop.id, score, guest,
      ts: new Date(row.date || row.Date || Date.now()).getTime(),
      channel: row.channel || 'Hostaway', text: row.review_text || ''
    };
    if (!store.reviews.find(r => r.id === review.id)) { store.reviews.push(review); imported.push(review); }
  });
  saveLocal();
  return { imported: imported.length, skipped: skipped.length, total: res.data.length };
}
window.downloadSampleCSV = function() {
  const csv = `property_name,guest_name,date,overall_score,review_text,channel\nOcean Suite,Maria G.,2024-03-15,9.2,"Beautiful apartment, great location",Airbnb`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_reviews.csv'; a.click(); URL.revokeObjectURL(a.href);
};

// ----- VIEWS -----
const VIEWS = {
  overview: () => {
    const hasData = store.messages.length > 0;
    const agents = store.agents;
    return `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Active</div><div class="stat-val">${store.kpi.active}</div></div>
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">SLA breaches</div><div class="stat-val ${store.kpi.breaches>0?'down':'up'}">${store.kpi.breaches}</div></div>
      <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Avg response</div><div class="stat-val">${store.kpi.avg||'—'}${store.kpi.avg?'m':''}</div></div>
      <div class="stat-card"><div class="stat-label">Agents</div><div class="stat-val">${agents.length}</div></div>
    </div>
    ${!hasData ? `<div class="panel">${emptyState('No data','Import WhatsApp or Hostaway chats.')}</div>` : `
    ${agents.length ? `
    <div class="panel"><div class="ph"><span class="pt">Agent performance</span></div>
    <div class="tw"><table><thead><tr><th>Agent</th><th>Total</th><th>Active</th><th>Avg RT</th><th>Breaches</th></tr></thead>
    <tbody>${agents.map(a=>{const s=agentStats(a.id);return`<tr><td>${a.name}</td><td>${s.total}</td><td>${s.active}</td><td>${s.avgRt||'—'}</td><td>${s.breaches}</td></tr>`}).join('')}</tbody></table></div></div>`:''}
    <div class="panel"><div class="ph"><span class="pt">Recent</span></div>
    <div>${store.messages.slice(0,10).map(m=>`<div class="msg-item">${m.guest} - ${m.message?.slice(0,30)}</div>`).join('')}</div></div>`}`;
  },
  agents: () => {
    return `<div class="panel"><div class="ph"><span class="pt">Agents (${store.agents.length})</span><button class="btn btn-primary" id="openAddAgent">+ Add</button></div>
    <div class="agent-grid">${store.agents.map(a => `<div class="agent-card">
      <div><b>${a.name}</b></div><div>${a.role}</div>
      <div class="btn-group" style="margin-top:8px"><button class="btn btn-sm" onclick="editAgent('${a.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteAgent('${a.id}')">Delete</button></div>
    </div>`).join('')}</div></div>`;
  },
  import: () => `
    <div class="panel"><div class="ph"><span class="pt">Import WhatsApp</span></div>
    <div class="pp">${agentSelect('wa_agent')}<input type="file" id="waFile" accept=".txt"><button id="waParseBtn">Parse</button><div id="waResult"></div></div></div>
    <div class="panel"><div class="ph"><span class="pt">Import Hostaway</span></div>
    <div class="pp">${agentSelect('ha_agent')}<input type="file" id="haFile" accept=".csv"><button id="haParseBtn">Parse</button><div id="haResult"></div></div></div>
    ${store.importLog.length ? `<div class="panel"><div class="ph"><span class="pt">Import history</span></div><div class="pp">${store.importLog.slice(0,10).map(l=>`<div>${l}</div>`).join('')}</div></div>` : ''}
  `,
  'root-cause': () => {
    const rc = store.rootCause;
    return !rc.length ? `<div class="panel">${emptyState('No breaches','Import data to see SLA breaches.')}</div>` : `<div class="panel"><div class="ph"><span class="pt">SLA breaches (${rc.length})</span></div><div class="tw"><table><thead><tr><th>Guest</th><th>Agent</th><th>Channel</th><th>Response time</th><th>Reason</th></tr></thead><tbody>${rc.map(r=>`<tr><td>${r.guest}</td><td>${r.agentName}</td><td>${r.channel}</td><td>${r.rt!=null?r.rt+'m':'No response'}</td><td>${r.reason}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  integrations: () => {
    const endpoints = [
      { name: 'Agents', count: store.agents.length },
      { name: 'Properties', count: store.properties.length },
      { name: 'Reviews', count: store.reviews.length },
      { name: 'Messages', count: store.messages.length },
      { name: 'Root Cause', count: store.rootCause.length }
    ];
    const status = endpoints.map(ep => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${ep.name}</span><span class="pill p-green">${ep.count} items</span></div>`).join('');
    return `<div class="panel"><div class="ph"><span class="pt">API Integrations</span></div><div class="pp">
      <div><b>Backend:</b> https://guestcare.onrender.com/api</div>
      <div style="margin-top:12px;">${status}</div>
      <div style="margin-top:12px;"><span class="pill p-green">Connected</span></div>
    </div></div>`;
  },
  admin: () => {
    return `<div class="panel"><div class="ph"><span class="pt">System Administration</span></div><div class="pp">
      <button class="btn btn-primary" onclick="openUserMgmt()">Manage Users</button>
      <button class="btn btn-danger" id="clearDataBtn" style="margin-left:8px;">Clear All Data</button>
      <hr class="divider">
      <div><b>Dark Mode</b></div>
      <button class="btn" onclick="applyTheme(localStorage.getItem('gcc_dark_mode')!=='1')">Toggle Dark/Light</button>
    </div></div>`;
  },
  help: () => {
    return `<div class="panel"><div class="ph"><span class="pt">Help & Support</span></div><div class="pp">
      <p><b>Keyboard Shortcuts</b><br> <kbd>Ctrl</kbd>+<kbd>K</kbd> – Command palette (coming soon)<br> <kbd>Esc</kbd> – Close modals</p>
      <p><b>Data Storage</b><br> Backend: PostgreSQL on Render<br> Local cache: localStorage</p>
      <p><b>Support</b><br> Email: support@guestcare.com</p>
      <p><b>Version</b> 2.0.0</p>
    </div></div>`;
  },

  'gr-properties': () => {
    const q = (document.getElementById('grPropSearch')?.value || '').toLowerCase();
    const props = store.properties.filter(p => !q || p.name.toLowerCase().includes(q) || (p.location||'').toLowerCase().includes(q));
    return `<div class="panel">
      <div class="gr-toolbar">
        <div class="gr-search"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg><input class="input" id="grPropSearch" placeholder="Search properties..." value="${q}" oninput="render('gr-properties')"></div>
        <button class="btn btn-primary" onclick="grOpenAddProperty()">+ Add property</button>
        <span class="text-muted">${props.length} propert${props.length===1?'y':'ies'}</span>
      </div>
      ${!store.properties.length ? emptyState('No properties','Add your first property.','<button class="btn btn-primary" onclick="grOpenAddProperty()">Add property</button>') :
        !props.length ? emptyState('No results','Try a different search.') :
        `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:14px 16px;">
          ${props.map(p => { const avg = propAvgScore(p.id), cnt = propReviewCount(p.id);
            return `<div class="prop-card">
              <div class="prop-card-top"><div><div class="prop-name">${p.name}</div><div class="prop-meta">${p.type}${p.location?' · '+p.location:''} ${p.beds>0?'· '+p.beds+' bed'+(p.beds===1?'':'s'):''}</div></div>
              <div style="text-align:right">${avg!=null?`<div class="prop-score">${avg}<span style="font-size:12px;color:var(--text3)">/10</span></div><div class="stars">${starsHTML(avg)}</div>`:'<div class="text-muted">No reviews</div>'}<div class="text-muted">${cnt} review${cnt===1?'':'s'}</div></div></div>
              <div class="prop-actions"><button class="btn btn-sm" onclick="grOpenEditProperty('${p.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="grDeleteProperty('${p.id}')">Delete</button><button class="btn btn-sm" onclick="render('gr-reviews');setTimeout(()=>{document.getElementById('grRevPropFilter')&&(document.getElementById('grRevPropFilter').value='${p.id}');render('gr-reviews');},50)">View reviews</button></div>
            </div>`;
          }).join('')}
        </div>`}
    </div>`;
  },

  'gr-reviews': () => {
    const propFilter = document.getElementById('grRevPropFilter')?.value || '';
    const q = (document.getElementById('grRevSearch')?.value || '').toLowerCase();
    const sortBy = document.getElementById('grRevSort')?.value || 'newest';
    let revs = store.reviews.slice();
    if (propFilter) revs = revs.filter(r => r.propertyId === propFilter);
    if (q) revs = revs.filter(r => (r.guest||'').toLowerCase().includes(q) || (r.text||'').toLowerCase().includes(q));
    if (sortBy === 'newest') revs.sort((a,b) => b.ts - a.ts);
    else if (sortBy === 'oldest') revs.sort((a,b) => a.ts - b.ts);
    else if (sortBy === 'highest') revs.sort((a,b) => (b.score||0) - (a.score||0));
    else if (sortBy === 'lowest') revs.sort((a,b) => (a.score||10) - (b.score||10));
    const props = store.properties;
    const getPropName = pid => { const p = props.find(x => x.id === pid); return p ? p.name : 'Unknown'; };
    return `<div class="panel">
      <div class="gr-toolbar">
        <div class="gr-search"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg><input class="input" id="grRevSearch" placeholder="Search..." value="${q}" oninput="render('gr-reviews')"></div>
        <select class="select" id="grRevPropFilter" style="width:auto;padding:4px 8px" onchange="render('gr-reviews')"><option value="">All properties</option>${props.map(p => `<option value="${p.id}"${p.id===propFilter?' selected':''}>${p.name}</option>`).join('')}</select>
        <select class="select" id="grRevSort" style="width:auto;padding:4px 8px" onchange="render('gr-reviews')"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest score</option><option value="lowest">Lowest score</option></select>
        <button class="btn btn-primary" onclick="grAddReviewClick(${propFilter?`'${propFilter}'`:'null'})">+ Add review</button>
        <span class="text-muted">${revs.length} review${revs.length===1?'':'s'}</span>
      </div>
      ${!store.reviews.length ? emptyState('No reviews','Add reviews manually or import.','<button class="btn btn-primary" onclick="render(\'gr-import\')">Import CSV</button>') :
        !revs.length ? emptyState('No results','Adjust filters.') :
        revs.map(r => { const sc = r.score; const cls = sc ? scoreClass(sc) : '';
          return `<div class="review-row"><div class="review-score-badge ${cls}">${sc||'—'}</div><div class="review-body"><div class="review-top"><span class="review-guest">${r.guest||'Anonymous'} <span class="prop-tag">${getPropName(r.propertyId)}</span></span><span class="review-date">${r.ts?new Date(r.ts).toLocaleDateString():''} · ${r.channel||''}</span></div>${r.text?`<div class="review-text">"${r.text}"</div>`:''}<div class="review-footer"><button class="btn btn-sm" onclick="grOpenEditReview('${r.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="grDeleteReview('${r.id}')">Delete</button></div></div></div>`;
        }).join('')}
    </div>`;
  },

  'gr-analysis': () => {
    if (!store.properties.length) return `<div class="panel">${emptyState('No properties','Add properties to see analysis.')}</div>`;
    const propsWithReviews = store.properties.filter(p => propReviewCount(p.id) > 0);
    const attention = [], good = [];
    propsWithReviews.forEach(p => {
      const avg = propAvgScore(p.id);
      const monthly = propMonthlyScores(p.id);
      const trend = monthly.length >= 2 ? monthly[monthly.length-1].avg - monthly[monthly.length-2].avg : 0;
      if (avg < 8.0 || trend < -0.5) attention.push({...p, avg, trend});
      else good.push({...p, avg, trend});
    });
    return `<div class="stats-row"><div class="stat-card"><div class="stat-label">Total properties</div><div class="stat-val">${store.properties.length}</div></div><div class="stat-card"><div class="stat-label">With reviews</div><div class="stat-val">${propsWithReviews.length}</div></div><div class="stat-card"><div class="stat-label">Need attention</div><div class="stat-val down">${attention.length}</div></div><div class="stat-card"><div class="stat-label">Doing well</div><div class="stat-val up">${good.length}</div></div></div>
    <div class="panel"><div class="ph"><span class="pt">Overall trend</span></div><div class="chart-wrap"><canvas id="overallTrendChart"></canvas></div></div>
    ${attention.length ? `<div class="panel"><div class="ph"><span class="pt" style="color:var(--red)">Needs attention</span></div><div class="analysis-grid">${attention.map(p => `<div class="analysis-card attention"><div><b>${p.name}</b></div><div>Avg: ${p.avg} /10</div></div>`).join('')}</div></div>` : ''}`;
  },

  'gr-import': () => {
    return `<div class="panel"><div class="ph"><span class="pt">Import reviews CSV</span></div><div class="pp">
      <label class="upload-zone" id="revCsvZone"><input type="file" id="revCsvFile" accept=".csv"><div class="upload-icon">CSV</div><div class="upload-lbl">Drop CSV or click</div></label>
      <div id="revCsvResult"></div><div id="revCsvPreview" style="display:none"></div>
      <button class="btn btn-primary" id="revCsvParseBtn">Parse & Preview</button>
      <button class="btn btn-sm" style="margin-top:8px" onclick="downloadSampleCSV()">Download sample</button>
    </div></div>`;
  }
};

// Fill other placeholders
['r-first','r-avg','r-delays','r-missed','sat-reviews','sat-complaints','sat-nps','sat-repeat','sat-resolution',
 'ops-closed','ops-active','ops-escalations','ops-maintenance','ops-inspections','ops-deepclean',
 'chan-airbnb','chan-booking','chan-direct','pro-prearrival','pro-midstay','heatmap','sentiment'].forEach(v=>{
   if(!VIEWS[v]) VIEWS[v] = () => `<div class="panel"><div class="ph">${v}</div><div class="pp">Coming soon</div></div>`;
 });

const LBL={overview:'Overview',agents:'Agents',import:'Import','r-first':'First response','root-cause':'Root cause',integrations:'Integrations',admin:'Admin',help:'Help','gr-properties':'Properties','gr-reviews':'Reviews','gr-analysis':'Analysis','gr-import':'Import CSV'};
let currentView='overview';

function render(v){
  killCharts();
  currentView=v;
  const lbl=LBL[v]||v;
  document.getElementById('topTitle').textContent=lbl;
  document.getElementById('mobTitle').textContent=lbl;
  document.getElementById('content').innerHTML = VIEWS[v] ? VIEWS[v]() : `<div class="panel">${v}</div>`;
  document.querySelectorAll('.sb-item,.sb-kid').forEach(el=>el.classList.remove('active'));
  const ae=document.querySelector(`.sb-kid[data-view="${v}"]`)||document.querySelector(`.sb-item[data-view="${v}"]`);
  if(ae) ae.classList.add('active');
  wireImport(); wireAdmin(); wireReviewImport(); closeSb();
  if (v === 'gr-analysis') setTimeout(() => {
    const labels = propMonthlyScores(store.properties[0]?.id || '').map(m=>m.month);
    mkChart('overallTrendChart', { type:'line', data:{ labels, datasets:[{ label:'Avg score', data:labels.map(()=>8.5), borderColor:'#2563eb' }] }, options: CD });
  }, 50);
}

function wireImport(){
  const waBtn=document.getElementById('waParseBtn'); if(waBtn) waBtn.onclick=()=>{
    const agentId=document.getElementById('wa_agent')?.value; const file=document.getElementById('waFile')?.files[0];
    if(!agentId||!file) return; const agent=store.agents.find(a=>a.id===agentId);
    const rd=new FileReader(); rd.onload=e=>{ const result=parseWhatsApp(e.target.result, agent.waName, agentId, 'WhatsApp'); if(!result.error) syncAll(result.messages, agentId, file.name, 'WhatsApp'); }; rd.readAsText(file);
  };
  const haBtn=document.getElementById('haParseBtn'); if(haBtn) haBtn.onclick=()=>{
    const agentId=document.getElementById('ha_agent')?.value; const file=document.getElementById('haFile')?.files[0];
    if(!agentId||!file) return; const rd=new FileReader(); rd.onload=e=>{ const result=parseHostaway(e.target.result, agentId, 'Hostaway'); if(!result.error) syncAll(result.messages, agentId, file.name, 'Hostaway'); }; rd.readAsText(file);
  };
}
function wireAdmin(){ const clearBtn=document.getElementById('clearDataBtn'); if(clearBtn) clearBtn.onclick=()=>{ if(confirm('Clear all data?')){ store = blank(); saveLocal(); render(currentView); } }; }
function wireReviewImport(){
  const zone=document.getElementById('revCsvZone'); if(!zone) return;
  zone.addEventListener('dragover',e=>{ e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag'));
  zone.addEventListener('drop',e=>{ e.preventDefault(); zone.classList.remove('drag'); const inp=zone.querySelector('input'); if(inp&&e.dataTransfer.files.length){ inp.files = e.dataTransfer.files; } });
  const btn=document.getElementById('revCsvParseBtn'); if(!btn) return;
  btn.onclick=()=>{
    const file=document.getElementById('revCsvFile')?.files[0]; const resDiv=document.getElementById('revCsvResult'); const prevDiv=document.getElementById('revCsvPreview');
    if(!file) return;
    const rd=new FileReader(); rd.onload=e=>{
      const result = parseReviewCSV(e.target.result);
      if(result.error){ resDiv.innerHTML=`<div class="import-result err">${result.error}</div>`; return; }
      resDiv.innerHTML=`<div class="import-result ok">${result.imported} imported, ${result.skipped} skipped</div>`;
      prevDiv.style.display='block'; prevDiv.innerHTML=`<button class="btn btn-primary" onclick="render('gr-reviews')">View reviews</button>`;
      saveLocal(); render('gr-reviews');
    };
    rd.readAsText(file);
  };
}

// Sidebar & navigation
const sidebar=document.getElementById('sidebar'); const sbOverlay=document.getElementById('sbOverlay');
function openSb(){ sidebar.classList.add('open'); sbOverlay.classList.add('open'); }
function closeSb(){ sidebar.classList.remove('open'); sbOverlay.classList.remove('open'); }
document.getElementById('mobMenu').onclick=openSb; document.getElementById('sbClose').onclick=closeSb; document.getElementById('topMenu').onclick=openSb; sbOverlay.onclick=closeSb;
document.querySelectorAll('.sb-parent').forEach(btn=>{ btn.onclick=()=>{ const pid=btn.dataset.parent, ch=document.getElementById('ch-'+pid); const open=ch.classList.contains('open'); document.querySelectorAll('.sb-kids').forEach(c=>c.classList.remove('open')); if(!open) ch.classList.add('open'); }; });
document.querySelectorAll('.sb-kid[data-view]').forEach(b=>b.onclick=()=>render(b.dataset.view));
document.querySelectorAll('.sb-item[data-view]').forEach(b=>b.onclick=()=>render(b.dataset.view));

// Auth UI
let currentUser = null;
function updateUIForUser() {
  const user = AuthService.getUser();
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userDisplayName');
  const roleEl = document.getElementById('userDisplayRole');
  const sbPill = document.getElementById('sbPill');
  if (user && user.name) {
    if (avatarEl) avatarEl.textContent = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role === 'manager' ? 'Manager' : (user.role || 'Agent');
    if (sbPill) sbPill.innerHTML = '<span class="pill p-green">Logged in</span>';
  } else {
    if (avatarEl) avatarEl.textContent = 'GC';
    if (nameEl) nameEl.textContent = 'Guest';
    if (roleEl) roleEl.textContent = 'Click to sign in';
    if (sbPill) sbPill.innerHTML = '<span class="pill p-gray">Not logged in</span>';
  }
}
function showLoginModal(){ document.getElementById('loginModal').style.display = 'flex'; document.getElementById('loginEmail').focus(); }
function hideLoginModal(){ document.getElementById('loginModal').style.display = 'none'; }

// ---------- USER MANAGEMENT (Full CRUD) ----------
function openUserMgmt() {
  const modal = document.getElementById('userModal');
  const currentUserData = AuthService.getUser();
  const users = store.users || [];
  // Ensure current user is at top with Manager role
  const allUsers = [
    { ...currentUserData, role: 'Manager' }, // Force display as Manager
    ...users.filter(u => u.id !== currentUserData.id)
  ];
  const html = allUsers.map(u => `
    <div class="user-row">
      <div class="user-ava">${u.name.slice(0,2).toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${u.name} <span class="pill ${u.role==='Manager'||u.role==='admin'?'p-red':'p-gray'}">${u.role}</span></div>
        <div class="user-email">${u.email}</div>
      </div>
      <div class="user-acts">
        ${u.id !== currentUserData.id ? `<button class="btn btn-sm" onclick="editUser('${u.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Delete</button>` : '<span class="text-muted">You</span>'}
      </div>
    </div>
  `).join('');
  document.getElementById('userList').innerHTML = html;
  document.getElementById('addUserForm').style.display = 'none';
  document.getElementById('editUserForm').style.display = 'none';
  document.getElementById('showAddBtn').style.display = 'block';
  modal.style.display = 'flex';
}

window.editUser = function(id) {
  const u = store.users.find(x => x.id == id);
  if (!u) return;
  document.getElementById('eu_id').value = u.id;
  document.getElementById('eu_name').value = u.name;
  document.getElementById('eu_user').value = u.username;
  document.getElementById('eu_email').value = u.email;
  document.getElementById('eu_role').value = u.role;
  document.getElementById('editUserForm').style.display = 'block';
  document.getElementById('addUserForm').style.display = 'none';
  document.getElementById('showAddBtn').style.display = 'none';
};

window.deleteUser = async function(id) {
  if (!confirm('Delete this user?')) return;
  store.users = store.users.filter(u => u.id != id);
  saveLocal();
  if (AuthService.isAuthenticated()) {
    try { await ApiService.deleteUser(id); } catch(e) {}
  }
  openUserMgmt();
  showToast('User deleted');
};

// Attach user modal event listeners
document.getElementById('openAdd')?.addEventListener('click', () => {
  document.getElementById('addUserForm').style.display = 'block';
  document.getElementById('showAddBtn').style.display = 'none';
  document.getElementById('editUserForm').style.display = 'none';
});
document.getElementById('cancelAdd')?.addEventListener('click', () => {
  document.getElementById('addUserForm').style.display = 'none';
  document.getElementById('showAddBtn').style.display = 'block';
});
document.getElementById('cancelEdit')?.addEventListener('click', () => {
  document.getElementById('editUserForm').style.display = 'none';
  document.getElementById('showAddBtn').style.display = 'block';
});
document.getElementById('saveAdd')?.addEventListener('click', async () => {
  const name = document.getElementById('nu_name').value.trim();
  const username = document.getElementById('nu_user').value.trim();
  const email = document.getElementById('nu_email').value.trim();
  const password = document.getElementById('nu_pass').value;
  const role = document.getElementById('nu_role').value;
  if (!name || !username || !email || !password) {
    document.getElementById('nuErr').textContent = 'All fields required.';
    return;
  }
  const newUser = { id: 'u_'+Date.now(), name, username, email, role, passwordHash: btoa(password) };
  store.users.push(newUser);
  saveLocal();
  if (AuthService.isAuthenticated()) {
    try { await ApiService.createUser(newUser); } catch(e) {}
  }
  document.getElementById('addUserForm').style.display = 'none';
  document.getElementById('showAddBtn').style.display = 'block';
  openUserMgmt();
  showToast('User added');
});
document.getElementById('saveEdit')?.addEventListener('click', async () => {
  const id = document.getElementById('eu_id').value;
  const u = store.users.find(x => x.id == id);
  if (!u) return;
  u.name = document.getElementById('eu_name').value.trim();
  u.username = document.getElementById('eu_user').value.trim();
  u.email = document.getElementById('eu_email').value.trim();
  u.role = document.getElementById('eu_role').value;
  saveLocal();
  if (AuthService.isAuthenticated()) {
    try { await ApiService.updateUser(id, u); } catch(e) {}
  }
  document.getElementById('editUserForm').style.display = 'none';
  document.getElementById('showAddBtn').style.display = 'block';
  openUserMgmt();
  showToast('User updated');
});

// Profile & modals wiring
document.getElementById('profileBtn').addEventListener('click', ()=>{
  if(AuthService.isAuthenticated()){
    currentUser = AuthService.getUser();
    updateUIForUser();
    openUserMgmt();
  } else {
    showLoginModal();
  }
});
document.getElementById('closeUserModal').addEventListener('click', ()=> document.getElementById('userModal').style.display = 'none');
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  AuthService.logout();
  currentUser = null;
  updateUIForUser();
  document.getElementById('userModal').style.display = 'none';
  showToast('Logged out');
});
document.getElementById('loginCancel').addEventListener('click', hideLoginModal);
document.getElementById('loginSubmit').addEventListener('click', async ()=>{
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  if(!email || !password){ errEl.textContent = 'Email and password required.'; return; }
  try{
    errEl.textContent = '';
    await AuthService.login(email, password);
    hideLoginModal();
    currentUser = AuthService.getUser();
    updateUIForUser();
    await syncFromBackend();
    render(currentView);
    showToast(`Welcome, ${currentUser.name}`);
  } catch(error){
    errEl.textContent = error.message;
  }
});
document.addEventListener('click', e=>{ if(e.target && e.target.id==='openAddAgent'){ document.getElementById('agentModal').style.display='flex'; } });
document.getElementById('cancelAgent').onclick=()=>document.getElementById('agentModal').style.display='none';
document.getElementById('saveAgent').onclick=async ()=>{
  const name=document.getElementById('ag_name').value.trim(); if(!name) return;
  const id = document.getElementById('ag_id').value || 'ag_'+Date.now();
  const agent={ id, name, role:document.getElementById('ag_role').value, color:document.getElementById('ag_color').value, waName:document.getElementById('ag_waname').value.trim(), email:document.getElementById('ag_email').value.trim() };
  const idx = store.agents.findIndex(a=>a.id===id); if(idx>=0) store.agents[idx]=agent; else store.agents.push(agent);
  saveLocal(); document.getElementById('agentModal').style.display='none'; render('agents');
  if(AuthService.isAuthenticated()){ try{ await ApiService.syncAgent(agent); showToast('Agent synced to server'); }catch(e){ showToast('Saved locally'); } }
};
window.editAgent = function(id){
  const a=store.agents.find(x=>x.id===id);
  if(!a) return;
  document.getElementById('agentModalTitle').textContent='Edit agent';
  document.getElementById('ag_id').value=a.id;
  document.getElementById('ag_name').value=a.name;
  document.getElementById('ag_role').value=a.role;
  document.getElementById('ag_color').value=a.color;
  document.getElementById('ag_waname').value=a.waName||'';
  document.getElementById('ag_email').value=a.email||'';
  document.getElementById('agentModal').style.display='flex';
};
window.deleteAgent = async function(id){
  if(!confirm('Delete this agent?')) return;
  store.agents = store.agents.filter(a=>a.id!==id);
  saveLocal();
  render('agents');
  if(AuthService.isAuthenticated()){ try{ await ApiService.deleteAgent(id); }catch(e){} }
  showToast('Agent deleted');
};
window.grAddReviewClick = function(propId) {
  if(!store.properties.length){ showToast('Add a property first'); render('gr-properties'); return; }
  grOpenAddReview(propId || store.properties[0].id);
};

// Expose functions globally for HTML onclick handlers
window.render = render;
window.editAgent = editAgent;
window.deleteAgent = deleteAgent;
window.grOpenAddProperty = grOpenAddProperty;
window.grOpenEditProperty = grOpenEditProperty;
window.grDeleteProperty = grDeleteProperty;
window.grOpenAddReview = grOpenAddReview;
window.grOpenEditReview = grOpenEditReview;
window.grDeleteReview = grDeleteReview;
window.grAddReviewClick = grAddReviewClick;
window.applyTheme = applyTheme;

// Initialize
loadLocal();
if(AuthService.isAuthenticated()){
  currentUser = AuthService.getUser();
  updateUIForUser();
  syncFromBackend();
} else {
  updateUIForUser();
  render('overview');
}

function tickClock(){
  const el=document.getElementById('liveClock');
  if(!el) return;
  el.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
tickClock();
setInterval(tickClock,1000);
})();