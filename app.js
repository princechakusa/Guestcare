// ==================================================
// GUESTCARE DASHBOARD — FULLY FIXED (app.js)
// ==================================================
(function () {
let currentView = 'overview';

  if (!AuthService.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }


  
  // ── CONFIG ──────────────────────────────────────
  const SK  = 'gcc_local_v9';
  const SLA = { WhatsApp: 10, Hostaway: 5, default: 10 };

  // ── DARK MODE ────────────────────────────────────
  const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(isDark) {
    const r = document.documentElement;
    if (isDark) {
      r.style.setProperty('--bg',          '#141417');
      r.style.setProperty('--bg2',         '#1e1e23');
      r.style.setProperty('--bg3',         '#28282f');
      r.style.setProperty('--bg-card',     '#1a1a20');
      r.style.setProperty('--border',      '#2d2d38');
      r.style.setProperty('--border2',     '#3a3a48');
      r.style.setProperty('--text',        '#e8e8f0');
      r.style.setProperty('--text2',       '#9090a8');
      r.style.setProperty('--text3',       '#5a5a70');
      r.style.setProperty('--accent',      '#4f8ef7');
      r.style.setProperty('--accent-d',    '#3b7af5');
      r.style.setProperty('--accent-light','#1a2540');
      r.style.setProperty('--green-light', '#0a2016');
      r.style.setProperty('--red-light',   '#250a0a');
      r.style.setProperty('--amber-light', '#241a06');
    } else {
      r.style.setProperty('--bg',          '#f7f8fa');
      r.style.setProperty('--bg2',         '#f0f1f5');
      r.style.setProperty('--bg3',         '#e8eaf0');
      r.style.setProperty('--bg-card',     '#ffffff');
      r.style.setProperty('--border',      '#e2e4ec');
      r.style.setProperty('--border2',     '#cdd0dc');
      r.style.setProperty('--text',        '#1a1d2e');
      r.style.setProperty('--text2',       '#5a5f7a');
      r.style.setProperty('--text3',       '#9296aa');
      r.style.setProperty('--accent',      '#2563eb');
      r.style.setProperty('--accent-d',    '#1d4ed8');
      r.style.setProperty('--accent-light','#eff4ff');
      r.style.setProperty('--green-light', '#f0fdf4');
      r.style.setProperty('--red-light',   '#fef2f2');
      r.style.setProperty('--amber-light', '#fffbeb');
    }
    localStorage.setItem('gcc_dark', isDark ? '1' : '0');
  }
  const savedTheme = localStorage.getItem('gcc_dark');
  if      (savedTheme === '1') applyTheme(true);
  else if (savedTheme === '0') applyTheme(false);
  else                          applyTheme(darkModeMedia.matches);
  window.applyTheme = applyTheme;

  function addThemeToggle() {
    if (document.getElementById('themeToggle')) return;
    const tr = document.querySelector('.topbar-right');
    if (!tr) return;
    const btn = document.createElement('button');
    btn.id = 'themeToggle';
    btn.className = 'btn';
    btn.style.marginLeft = '6px';
    btn.title = 'Toggle dark mode';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>';
    btn.onclick = () => applyTheme(localStorage.getItem('gcc_dark') !== '1');
    tr.appendChild(btn);
  }

  // ── STORE ────────────────────────────────────────
  function blank() {
    return {
      agents: [], messages: [], rootCause: [], importLog: [],
      properties: [], reviews: [], users: [],
      tickets: [], complaints: [], nps: [], prearrival: [], midstay: [],
      kpi: { avg: 0, breaches: 0, active: 0 }
    };
  }
  let store = blank();
  function loadLocal()  { try { const s = localStorage.getItem(SK); if (s) store = Object.assign(blank(), JSON.parse(s)); } catch (e) {} }
  function saveLocal()  { localStorage.setItem(SK, JSON.stringify(store)); }

  async function syncFromBackend() {
    const pill = document.getElementById('sbPill');
    if (pill) pill.innerHTML = '<span class="pill p-amber">Syncing…</span>';
    try {
      const data = await ApiService.pullAllData();
      if (data.agents)     store.agents     = data.agents;
      if (data.messages)   store.messages   = data.messages;
      if (data.rootCauses) store.rootCause  = data.rootCauses;
      if (data.properties) store.properties = data.properties;
      if (data.reviews)    store.reviews    = data.reviews;
      if (data.users)      store.users      = data.users;
      recalcKPI(); saveLocal();
      if (pill) pill.innerHTML = '<span class="pill p-green">● Live</span>';
      showToast('Synced from server');
    } catch (e) {
      if (pill) pill.innerHTML = '<span class="pill p-amber">● Offline</span>';
    }
    render(currentView);
    addThemeToggle();
  }

  function recalcKPI() {
    const m   = store.messages;
    const res = m.filter(x => x.responded && x.rt != null);
    store.kpi.avg     = res.length ? +(res.reduce((s, x) => s + x.rt, 0) / res.length).toFixed(1) : 0;
    store.kpi.breaches = m.filter(x => x.breach).length;
    store.kpi.active   = m.filter(x => !x.responded).length;
  }

  // ── HELPERS ──────────────────────────────────────
  const COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#0f766e'];

  function agentColor(id) { const a = store.agents.find(x => x.id === id); return a?.color || COLORS[0]; }
  function agentName(id)  { const a = store.agents.find(x => x.id === id); return a ? a.name : 'Unknown'; }

  function agentStats(agentId) {
    const m    = store.messages.filter(x => x.agentId === agentId);
    const resp = m.filter(x => x.responded && x.rt != null);
    return {
      total:    m.length,
      active:   m.filter(x => !x.responded).length,
      breaches: m.filter(x => x.breach).length,
      avgRt:    resp.length ? +(resp.reduce((s, x) => s + x.rt, 0) / resp.length).toFixed(1) : 0,
      slaHit:   resp.length ? Math.round(100 * m.filter(x => x.responded && !x.breach).length / resp.length) : 0
    };
  }

  function starsHTML(score) {
    const full = Math.round((score || 0) / 2);
    return Array(5).fill(0).map((_, i) => i < full ? '★' : '☆').join('');
  }
  function scoreClass(s)     { return s >= 8 ? 'score-great' : s >= 6 ? 'score-good' : 'score-bad'; }
  function propAvgScore(pid) {
    const r = store.reviews.filter(r => r.propertyId === pid && r.score != null);
    return r.length ? +(r.reduce((s, r) => s + r.score, 0) / r.length).toFixed(2) : null;
  }
  function propReviewCount(pid)  { return store.reviews.filter(r => r.propertyId === pid).length; }
  function propMonthlyScores(pid) {
    const revs = store.reviews.filter(r => r.propertyId === pid && r.score != null);
    const byM  = {};
    revs.forEach(r => {
      const d = new Date(r.ts), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!byM[k]) byM[k] = { sum: 0, count: 0 };
      byM[k].sum += r.score; byM[k].count++;
    });
    return Object.entries(byM).sort().map(([m, v]) => ({ month: m, avg: +(v.sum / v.count).toFixed(2) }));
  }
  function propName(id) { const p = store.properties.find(x => x.id === id); return p ? p.name : '—'; }

  function urgencyPill(u) {
    if (u === 'high')   return '<span class="pill p-red"><span class="dot d-red"></span>High</span>';
    if (u === 'medium') return '<span class="pill p-amber"><span class="dot d-amber"></span>Med</span>';
    return '<span class="pill p-green"><span class="dot d-green"></span>Low</span>';
  }
  function statusPill(s) {
    const map = { Open:'p-amber','In Progress':'p-blue', Closed:'p-green', Escalated:'p-red', Resolved:'p-green' };
    return `<span class="pill ${map[s] || 'p-gray'}">${s}</span>`;
  }
  function severityPill(s) {
    const map = { Critical:'p-red', High:'p-amber', Medium:'p-blue', Low:'p-gray' };
    return `<span class="pill ${map[s] || 'p-gray'}">${s}</span>`;
  }
  function emptyState(icon, title, sub, action = '') {
    return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div>${action}</div>`;
  }
  function agentSelectHTML(id, placeholder = 'Select agent') {
    if (!store.agents.length)
      return `<select class="select" id="${id}" disabled><option>No agents yet</option></select><div class="select-note">Add an agent first</div>`;
    return `<select class="select" id="${id}"><option value="">— ${placeholder} —</option>${store.agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select>`;
  }
  function propOptionsHTML(selected = '') {
    return `<option value="">— None —</option>` + store.properties.map(p => `<option value="${p.id}"${p.id === selected ? ' selected' : ''}>${p.name}</option>`).join('');
  }
  function fmtDate(ts)  { return ts ? new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
  function fmtMon(m)    { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1).toLocaleString([], { month: 'short', year: '2-digit' }); }
  function fmtRT(rt)    { if (rt == null) return '—'; if (rt < 1) return '<1m'; return rt + 'm'; }
  function fmtTs(ts)    { return ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; }

  // ── CHARTS ───────────────────────────────────────
  const charts = {};
  function mkChart(id, cfg) {
    if (charts[id]) { try { charts[id].destroy(); } catch (e) {} delete charts[id]; }
    const el = document.getElementById(id);
    if (!el) return;
    charts[id] = new Chart(el.getContext('2d'), cfg);
  }
  function killCharts() {
    Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch (e) {} delete charts[k]; });
  }
  const CD = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9296aa' }, border: { display: false } },
      y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 }, color: '#9296aa' }, border: { display: false } }
    },
    elements: { bar: { borderRadius: 3 }, line: { tension: 0.35, borderWidth: 2 }, point: { radius: 2, hoverRadius: 4 } }
  };
  const CDL = { ...CD, plugins: { ...CD.plugins, legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 12 } } } };

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ── WHATSAPP PARSER ──────────────────────────────
  function parseWhatsApp(text, agentWaName, agentId, channel) {
    const patterns = [
      /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:AM|PM)?\]\s*([^:]+):\s*(.+)$/i,
      /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:AM|PM)?\s*-\s*([^:]+):\s*(.+)$/i
    ];
    const threads = {};
    let matched = 0;
    text.split('\n').forEach(line => {
      let m = null;
      for (const p of patterns) { m = line.match(p); if (m) break; }
      if (!m) return;
      const [, dateStr, timeStr, rawSender, body] = m;
      const sender = rawSender.trim().replace(/^[~\u200e]/, '').trim();
      if (!sender || body.trim() === '<Media omitted>' || body.trim() === 'This message was deleted') return;
      const pts = dateStr.split('/');
      let d, mo, y;
      if (parseInt(pts[0]) > 12) { [d, mo, y] = pts; } else { [mo, d, y] = pts; }
      const fy = y.length === 2 ? '20' + y : y;
      const tf = timeStr.split(':').length === 2 ? timeStr + ':00' : timeStr;
      const ts = new Date(`${fy}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${tf}`).getTime();
      if (isNaN(ts)) return;
      matched++;
      const agentNames = agentWaName.toLowerCase().split(',').map(s => s.trim());
      const isAgent = agentNames.some(n => sender.toLowerCase().includes(n));
      if (!isAgent) {
        if (!threads[sender]) threads[sender] = { msgs: [], guestName: sender };
        threads[sender].msgs.push({ ts, body, role: 'guest' });
      } else {
        Object.values(threads).forEach(t => t.msgs.push({ ts, body, role: 'agent' }));
      }
    });
    if (matched === 0) return { error: 'No messages matched. Check the file format.' };
    const result = [];
    Object.values(threads).forEach(th => {
      if (!th.msgs.length) return;
      let lastGuestTs = null, firstAgentTs = null, guestBlock = false;
      th.msgs.sort((a, b) => a.ts - b.ts);
      for (const msg of th.msgs) {
        if (msg.role === 'guest')                                    { lastGuestTs = msg.ts; guestBlock = true; firstAgentTs = null; }
        else if (guestBlock && lastGuestTs && !firstAgentTs)         { firstAgentTs = msg.ts; guestBlock = false; }
      }
      const rt    = firstAgentTs ? +((firstAgentTs - lastGuestTs) / 60000).toFixed(1) : null;
      const breach = rt != null ? rt > SLA[channel] : !firstAgentTs;
      const lastG  = th.msgs.filter(m => m.role === 'guest').slice(-1)[0];
      result.push({
        id: 'wa_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        agentId, channel, guest: th.guestName,
        message: lastG ? lastG.body : '', ts: lastG ? lastG.ts : Date.now(),
        intent: 'WhatsApp', urgency: breach ? 'high' : 'low',
        responded: firstAgentTs != null, rt, breach
      });
    });
    return { messages: result, matched, threads: Object.keys(threads).length };
  }

  // ── HOSTAWAY PARSER ──────────────────────────────
  function parseHostaway(csvText, agentId, channel) {
    const res = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (!res.data.length) return { error: 'CSV empty' };
    const threads = {};
    res.data.forEach(row => {
      const tid  = row.thread_id || row['Thread ID'] || row.ThreadId || Object.values(row)[0] || '';
      const tsRaw = row.timestamp || row.Timestamp  || row.Date     || row.date    || Object.values(row)[1] || '';
      const dirRaw = (row.direction || row.Direction || row.dir || '').toLowerCase();
      const body   = row.message || row.Message || row.body || row.Body || Object.values(row)[3] || '';
      const guest  = row.guest   || row.Guest   || row.guest_name || row.GuestName || 'Guest-' + tid;
      const ts = new Date(tsRaw).getTime();
      if (!tid || isNaN(ts)) return;
      if (!threads[tid]) threads[tid] = { msgs: [], guest: String(guest).trim() };
      threads[tid].msgs.push({ ts, body, role: dirRaw.includes('out') ? 'agent' : 'guest' });
    });
    if (!Object.keys(threads).length) return { error: 'No threads found.' };
    const result = [];
    Object.entries(threads).forEach(([tid, th]) => {
      th.msgs.sort((a, b) => a.ts - b.ts);
      let lastGuestTs = null, firstAgentTs = null, guestBlock = false;
      for (const msg of th.msgs) {
        if (msg.role === 'guest')                               { lastGuestTs = msg.ts; guestBlock = true; firstAgentTs = null; }
        else if (guestBlock && lastGuestTs && !firstAgentTs)   { firstAgentTs = msg.ts; guestBlock = false; }
      }
      const rt     = firstAgentTs ? +((firstAgentTs - lastGuestTs) / 60000).toFixed(1) : null;
      const breach = rt != null ? rt > SLA.Hostaway : !firstAgentTs;
      const lastG  = th.msgs.filter(m => m.role === 'guest').slice(-1)[0];
      result.push({
        id: 'ha_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        agentId, channel: 'Hostaway', guest: th.guest,
        message: lastG ? lastG.body : '', ts: lastG ? lastG.ts : Date.now(),
        intent: 'Hostaway', urgency: breach ? 'high' : 'low',
        responded: firstAgentTs != null, rt, breach
      });
    });
    return { messages: result, matched: res.data.length, threads: Object.keys(threads).length };
  }

  async function syncAll(parsed, agentId, fileName, channel) {
    const newMsgs = [], newBreaches = [];
    parsed.forEach(pm => {
      if (!store.messages.find(m => m.id === pm.id)) { store.messages.push(pm); newMsgs.push(pm); }
    });
    newMsgs.filter(m => m.breach).forEach(b => {
      const entry = { agentId, agentName: agentName(agentId), guest: b.guest, channel: b.channel, msg: b.message, ts: b.ts, rt: b.rt, reason: b.rt != null ? b.rt + 'm > ' + SLA[b.channel] + 'm SLA' : 'No response' };
      if (!store.rootCause.find(r => r.guest === b.guest && Math.abs(r.ts - b.ts) < 60000)) { store.rootCause.push(entry); newBreaches.push(entry); }
    });
    recalcKPI(); saveLocal();
    try {
      for (const msg of newMsgs)    await ApiService.syncMessage(msg);
      for (const rc of newBreaches) await ApiService.createRootCause(rc);
      showToast('Import synced to server');
    } catch (e) { showToast('Saved locally (offline mode)'); }
    store.importLog.unshift(new Date().toLocaleString() + ' — ' + channel + ' for ' + agentName(agentId) + ': ' + parsed.length + ' conversations from ' + fileName);
    render(currentView);
  }

  function parseReviewCSV(csvText) {
    const res = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (!res.data.length) return { error: 'CSV empty' };
    const imported = [], skipped = [];
    res.data.forEach((row, i) => {
      const propName = (row.property_name || row.Property || row.property || '').trim();
      const guest    = (row.guest_name    || row.Guest    || row.guest    || '').trim();
      const score    = parseFloat(row.overall_score || row.score || row.rating || '');
      if (!propName || !guest || isNaN(score)) { skipped.push(i + 2); return; }
      let prop = store.properties.find(p => p.name.toLowerCase() === propName.toLowerCase());
      if (!prop) {
        prop = { id: 'prop_' + Date.now() + '_' + i, name: propName, type: 'Apartment', location: '', beds: 0, hostawayId: '', status: 'Active', notes: 'Auto-created' };
        store.properties.push(prop);
      }
      const review = { id: 'csv_' + Date.now() + '_' + i, propertyId: prop.id, score, guest, ts: new Date(row.date || row.Date || Date.now()).getTime(), channel: row.channel || 'Hostaway', text: row.review_text || '' };
      if (!store.reviews.find(r => r.propertyId === review.propertyId && r.guest === review.guest && r.ts === review.ts)) { store.reviews.push(review); imported.push(review); }
    });
    saveLocal();
    return { imported: imported.length, skipped: skipped.length, total: res.data.length };
  }

  window.downloadSampleCSV = function () {
    const csv = `property_name,guest_name,date,overall_score,review_text,channel\nOcean Suite,Maria G.,2024-03-15,9.2,"Beautiful apartment, great location",Airbnb\nMarina Heights,John D.,2024-04-01,7.8,"Good stay, minor issues",Booking.com`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'sample_reviews.csv'; a.click();
  };

  // ─────────────────────────────────────────────────
  // ── MODALS (all created dynamically — no HTML needed)
  // ─────────────────────────────────────────────────
  function showModal(id, html) {
    removeModal(id);
    const div = document.createElement('div');
    div.id = id; div.className = 'modal-wrap';
    div.innerHTML = `<div class="modal-box wide">${html}</div>`;
    div.addEventListener('click', e => { if (e.target === div) removeModal(id); });
    document.body.appendChild(div);
  }
  function removeModal(id) { const el = document.getElementById(id); if (el) el.remove(); }

  // ── AGENT MODAL ──────────────────────────────────
  let agentEditId = null;
  function openAgentModal(agent = {}) {
    agentEditId = agent.id || null;
    showModal('agentModal', `
      <div class="modal-title">${agentEditId ? 'Edit agent' : 'Add agent'}</div>
      <div class="form-group"><label class="field-label">Full name</label>
        <input class="input" id="ag_name" value="${agent.name || ''}" placeholder="e.g. Kudzanayi Moyo"></div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Role</label>
          <select class="select" id="ag_role">
            ${['Guest Agent','Senior Agent','Team Lead','Manager'].map(r => `<option${(agent.role||'Guest Agent')===r?' selected':''}>${r}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="field-label">Colour</label>
          <input class="input" id="ag_color" type="color" value="${agent.color || '#2563eb'}" style="height:35px;padding:2px 4px;cursor:pointer"></div>
      </div>
      <div class="form-group"><label class="field-label">WhatsApp display name(s) <span style="font-weight:400;color:var(--text3)">(comma-separated, as it appears in chat exports)</span></label>
        <input class="input" id="ag_waname" value="${agent.waName || ''}" placeholder="e.g. Kudzy, K. Moyo"></div>
      <div class="form-group"><label class="field-label">Email</label>
        <input class="input" id="ag_email" type="email" value="${agent.email || ''}" placeholder="agent@homevy.ae"></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('agentModal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveAgent()">Save agent</button>
      </div>`);
  }
  window.saveAgent = async function () {
    const name = document.getElementById('ag_name')?.value.trim();
    if (!name) { showToast('Name is required'); return; }
    const agent = {
      id:     agentEditId || 'ag_' + Date.now(),
      name,
      role:   document.getElementById('ag_role').value,
      color:  document.getElementById('ag_color').value,
      waName: document.getElementById('ag_waname').value.trim(),
      email:  document.getElementById('ag_email').value.trim()
    };
    const idx = store.agents.findIndex(a => a.id === agent.id);
    if (idx >= 0) store.agents[idx] = agent; else store.agents.push(agent);
    saveLocal(); removeModal('agentModal'); render('agents');
    try { await ApiService.syncAgent(agent); showToast('Agent saved'); } catch (e) { showToast('Saved locally'); }
  };
  window.editAgent = function (id) { const a = store.agents.find(x => x.id === id); if (a) openAgentModal(a); };
  window.deleteAgent = async function (id) {
    if (!confirm('Delete this agent and their data?')) return;
    store.agents = store.agents.filter(a => a.id !== id);
    saveLocal(); render('agents');
    try { await ApiService.deleteAgent(id); } catch (e) {}
    showToast('Agent deleted');
  };

  // ── PROPERTY MODAL ───────────────────────────────
  let propEditId = null;
  window.grOpenAddProperty = function () { propEditId = null; openPropertyModal({}); };
  window.grOpenEditProperty = function (id) {
    const p = store.properties.find(x => x.id === id);
    if (!p) return; propEditId = id; openPropertyModal(p);
  };
  function openPropertyModal(p) {
    showModal('grPropModal', `
      <div class="modal-title">${propEditId ? 'Edit property' : 'Add property'}</div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Property name</label>
          <input class="input" id="gp_name" value="${p.name || ''}" placeholder="e.g. Marina Heights Studio"></div>
        <div class="form-group"><label class="field-label">Type</label>
          <select class="select" id="gp_type">${['Apartment','Villa','Studio','Penthouse','Townhouse'].map(t => `<option${(p.type||'Apartment')===t?' selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Location / Area</label>
          <input class="input" id="gp_location" value="${p.location || ''}" placeholder="e.g. Dubai Marina"></div>
        <div class="form-group"><label class="field-label">Bedrooms</label>
          <input class="input" id="gp_beds" type="number" min="0" value="${p.beds || 0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Hostaway ID</label>
          <input class="input" id="gp_hostaway_id" value="${p.hostawayId || ''}" placeholder="Optional"></div>
        <div class="form-group"><label class="field-label">Status</label>
          <select class="select" id="gp_status">${['Active','Inactive','Under Maintenance'].map(s => `<option${(p.status||'Active')===s?' selected':''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="field-label">Notes</label>
        <input class="input" id="gp_notes" value="${p.notes || ''}" placeholder="Any additional notes"></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('grPropModal')">Cancel</button>
        <button class="btn btn-primary" onclick="grSaveProperty()">Save property</button>
      </div>`);
  }
  window.grSaveProperty = async function () {
    const name = document.getElementById('gp_name')?.value.trim();
    if (!name) { showToast('Name is required'); return; }
    const prop = {
      id:         propEditId || 'prop_' + Date.now(), name,
      type:       document.getElementById('gp_type').value,
      location:   document.getElementById('gp_location').value.trim(),
      beds:       parseInt(document.getElementById('gp_beds').value) || 0,
      hostawayId: document.getElementById('gp_hostaway_id').value.trim(),
      status:     document.getElementById('gp_status').value,
      notes:      document.getElementById('gp_notes').value.trim()
    };
    const idx = store.properties.findIndex(x => x.id === prop.id);
    if (idx >= 0) store.properties[idx] = prop; else store.properties.push(prop);
    saveLocal(); removeModal('grPropModal'); render('gr-properties');
    try { await ApiService.syncProperty(prop); showToast('Property saved'); } catch (e) { showToast('Saved locally'); }
  };
  window.grDeleteProperty = async function (id) {
    if (!confirm('Delete this property and all its reviews?')) return;
    store.properties = store.properties.filter(x => x.id !== id);
    store.reviews    = store.reviews.filter(r => r.propertyId !== id);
    saveLocal(); render('gr-properties');
    try { await ApiService.deleteProperty(id); } catch (e) {}
    showToast('Property deleted');
  };

  // ── REVIEW MODAL ─────────────────────────────────
  let reviewEditId = null;
  window.grOpenAddReview = function (propId) { reviewEditId = null; openReviewModal({ propertyId: propId || '' }); };
  window.grOpenEditReview = function (id) {
    const r = store.reviews.find(x => x.id === id);
    if (!r) return; reviewEditId = id; openReviewModal(r);
  };
  function openReviewModal(r) {
    if (!store.properties.length) { showToast('Add a property first'); render('gr-properties'); return; }
    showModal('grRevModal', `
      <div class="modal-title">${reviewEditId ? 'Edit review' : 'Add review'}</div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Property</label>
          <select class="select" id="gr_prop">${store.properties.map(p => `<option value="${p.id}"${p.id===(r.propertyId||'')?' selected':''}>${p.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="field-label">Score (1–10)</label>
          <input class="input" id="gr_score" type="number" min="1" max="10" step="0.1" value="${r.score || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Guest name</label>
          <input class="input" id="gr_guest" value="${r.guest || ''}" placeholder="Guest name"></div>
        <div class="form-group"><label class="field-label">Channel</label>
          <select class="select" id="gr_channel">${['Airbnb','Booking.com','Direct','Hostaway'].map(c => `<option${(r.channel||'Airbnb')===c?' selected':''}>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="field-label">Review date</label>
        <input class="input" id="gr_date" type="date" value="${r.ts ? new Date(r.ts).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="field-label">Review text</label>
        <textarea class="input" id="gr_text" rows="3" style="resize:vertical">${r.text || ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('grRevModal')">Cancel</button>
        <button class="btn btn-primary" onclick="grSaveReview()">Save review</button>
      </div>`);
  }
  window.grSaveReview = async function () {
    const score = parseFloat(document.getElementById('gr_score')?.value);
    const propId = document.getElementById('gr_prop')?.value;
    if (!propId)             { showToast('Select a property'); return; }
    if (isNaN(score) || score < 1 || score > 10) { showToast('Enter a score between 1 and 10'); return; }
    const review = {
      id:         reviewEditId || 'rev_' + Date.now(), propertyId: propId, score,
      guest:      document.getElementById('gr_guest').value.trim(),
      channel:    document.getElementById('gr_channel').value,
      ts:         new Date(document.getElementById('gr_date').value).getTime(),
      text:       document.getElementById('gr_text').value.trim()
    };
    const idx = store.reviews.findIndex(r => r.id === review.id);
    if (idx >= 0) store.reviews[idx] = review; else store.reviews.push(review);
    saveLocal(); removeModal('grRevModal'); render('gr-reviews');
    try { await ApiService.syncReview(review); showToast('Review saved'); } catch (e) { showToast('Saved locally'); }
  };
  window.grDeleteReview = async function (id) {
    if (!confirm('Delete this review?')) return;
    store.reviews = store.reviews.filter(r => r.id !== id);
    saveLocal(); render('gr-reviews');
    try { await ApiService.deleteReview(id); } catch (e) {}
    showToast('Review deleted');
  };
  window.grAddReviewClick = function (propId) {
    if (!store.properties.length) { showToast('Add a property first'); render('gr-properties'); return; }
    grOpenAddReview(propId || store.properties[0].id);
  };

  // ── TICKET MODAL ─────────────────────────────────
  let ticketEditId = null;
  function openTicketModal(defaults = {}) {
    ticketEditId = defaults.id || null;
    showModal('ticketModal', `
      <div class="modal-title">${ticketEditId ? 'Edit ticket' : 'New ticket'}</div>
      <div class="form-group"><label class="field-label">Title</label>
        <input class="input" id="tk_title" value="${defaults.title || ''}" placeholder="Brief description of the issue"></div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Type</label>
          <select class="select" id="tk_type">${['Issue','Maintenance','Inspection','Deep Clean','Escalation'].map(t => `<option${(defaults.type||'Issue')===t?' selected':''}>${t}</option>`).join('')}</select></div>
        <div class="form-group"><label class="field-label">Priority</label>
          <select class="select" id="tk_priority">${['Low','Medium','High','Urgent'].map(t => `<option${(defaults.priority||'Medium')===t?' selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Property</label>
          <select class="select" id="tk_prop">${propOptionsHTML(defaults.propId)}</select></div>
        <div class="form-group"><label class="field-label">Status</label>
          <select class="select" id="tk_status">${['Open','In Progress','Closed','Escalated'].map(t => `<option${(defaults.status||'Open')===t?' selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="field-label">Notes</label>
        <textarea class="input" id="tk_notes" rows="3" style="resize:vertical">${defaults.notes || ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('ticketModal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveTicket()">Save ticket</button>
      </div>`);
  }
  window.openTicketModal = function (defaults) { openTicketModal(defaults || {}); };
  window.editTicket = function (id) { const tk = store.tickets.find(t => t.id === id); if (tk) openTicketModal(tk); };
  window.saveTicket = function () {
    const title = document.getElementById('tk_title')?.value.trim();
    if (!title) { showToast('Title is required'); return; }
    const tk = {
      id:       ticketEditId || 'tk_' + Date.now(), title,
      type:     document.getElementById('tk_type').value,
      priority: document.getElementById('tk_priority').value,
      propId:   document.getElementById('tk_prop').value,
      status:   document.getElementById('tk_status').value,
      notes:    document.getElementById('tk_notes').value.trim(),
      ts:       ticketEditId ? store.tickets.find(t => t.id === ticketEditId)?.ts || Date.now() : Date.now()
    };
    const idx = store.tickets.findIndex(t => t.id === tk.id);
    if (idx >= 0) store.tickets[idx] = tk; else store.tickets.push(tk);
    saveLocal(); removeModal('ticketModal'); render(currentView); showToast('Ticket saved');
  };
  window.deleteTicket = function (id) {
    if (!confirm('Delete this ticket?')) return;
    store.tickets = store.tickets.filter(t => t.id !== id);
    saveLocal(); render(currentView); showToast('Deleted');
  };
  window.closeTicket = function (id) {
    const tk = store.tickets.find(t => t.id === id);
    if (tk) { tk.status = 'Closed'; saveLocal(); render(currentView); showToast('Ticket closed'); }
  };

  // ── COMPLAINT MODAL ──────────────────────────────
  let complaintEditId = null;
  window.addComplaintModal = function () { complaintEditId = null; openComplaintModal({}); };
  window.editComplaint = function (id) { const c = store.complaints.find(x => x.id === id); if (c) { complaintEditId = id; openComplaintModal(c); } };
  function openComplaintModal(c) {
    showModal('complaintModal', `
      <div class="modal-title">${complaintEditId ? 'Edit complaint' : 'Log complaint'}</div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Guest name</label>
          <input class="input" id="cp_guest" value="${c.guest || ''}" placeholder="Guest name"></div>
        <div class="form-group"><label class="field-label">Property</label>
          <select class="select" id="cp_prop">${propOptionsHTML(c.propId)}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Category</label>
          <select class="select" id="cp_cat">${['Cleanliness','Noise','Maintenance','Check-in/out','Communication','Amenities','Other'].map(x=>`<option${(c.category||'Cleanliness')===x?' selected':''}>${x}</option>`).join('')}</select></div>
        <div class="form-group"><label class="field-label">Severity</label>
          <select class="select" id="cp_sev">${['Low','Medium','High','Critical'].map(x=>`<option${(c.severity||'Medium')===x?' selected':''}>${x}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="field-label">Description</label>
        <textarea class="input" id="cp_desc" rows="3" style="resize:vertical">${c.description || ''}</textarea></div>
      <div class="form-group"><label class="field-label">Status</label>
        <select class="select" id="cp_status">${['Open','In Progress','Resolved'].map(x=>`<option${(c.status||'Open')===x?' selected':''}>${x}</option>`).join('')}</select></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('complaintModal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveComplaint()">Save</button>
      </div>`);
  }
  window.saveComplaint = function () {
    const guest = document.getElementById('cp_guest')?.value.trim();
    const desc  = document.getElementById('cp_desc')?.value.trim();
    if (!guest || !desc) { showToast('Guest name and description required'); return; }
    const c = {
      id:          complaintEditId || 'cp_' + Date.now(), guest,
      propId:      document.getElementById('cp_prop').value,
      category:    document.getElementById('cp_cat').value,
      severity:    document.getElementById('cp_sev').value,
      description: desc,
      status:      document.getElementById('cp_status').value,
      ts:          complaintEditId ? store.complaints.find(x => x.id === complaintEditId)?.ts || Date.now() : Date.now()
    };
    const idx = store.complaints.findIndex(x => x.id === c.id);
    if (idx >= 0) store.complaints[idx] = c; else store.complaints.push(c);
    saveLocal(); removeModal('complaintModal'); render(currentView); showToast('Complaint saved');
  };
  window.deleteComplaint = function (id) {
    if (!confirm('Delete?')) return;
    store.complaints = store.complaints.filter(x => x.id !== id);
    saveLocal(); render(currentView);
  };
  window.resolveComplaint = function (id) {
    const c = store.complaints.find(x => x.id === id);
    if (c) { c.status = 'Resolved'; saveLocal(); render(currentView); showToast('Marked resolved'); }
  };

  // ── NPS MODAL ────────────────────────────────────
  window.openNpsModal = function () {
    showModal('npsModal', `
      <div class="modal-title">Log NPS score</div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Month</label>
          <input class="input" id="nps_month" type="month" value="${new Date().toISOString().slice(0,7)}"></div>
        <div class="form-group"><label class="field-label">NPS Score (−100 to 100)</label>
          <input class="input" id="nps_score" type="number" min="-100" max="100" placeholder="e.g. 72"></div>
      </div>
      <div class="form-group"><label class="field-label">Number of responses</label>
        <input class="input" id="nps_responses" type="number" min="0" placeholder="e.g. 48"></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('npsModal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveNps()">Save</button>
      </div>`);
  };
  window.saveNps = function () {
    const month = document.getElementById('nps_month')?.value;
    const score = parseInt(document.getElementById('nps_score')?.value);
    if (!month || isNaN(score)) { showToast('Month and score required'); return; }
    const idx = store.nps.findIndex(n => n.month === month);
    const entry = { month, score, responses: parseInt(document.getElementById('nps_responses')?.value) || 0 };
    if (idx >= 0) store.nps[idx] = entry; else store.nps.push(entry);
    store.nps.sort((a, b) => a.month.localeCompare(b.month));
    saveLocal(); removeModal('npsModal'); render(currentView); showToast('NPS logged');
  };
  window.deleteNps = function (month) {
    store.nps = store.nps.filter(n => n.month !== month);
    saveLocal(); render(currentView);
  };

  // ── PROACTIVE MODAL ──────────────────────────────
  window.addProactiveModal = function (type) {
    showModal('proModal', `
      <div class="modal-title">${type === 'prearrival' ? 'Log pre-arrival check' : 'Log mid-stay check-in'}</div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">Guest name</label>
          <input class="input" id="pro_guest" placeholder="Guest name"></div>
        <div class="form-group"><label class="field-label">Property</label>
          <select class="select" id="pro_prop">${propOptionsHTML()}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="field-label">${type === 'prearrival' ? 'Check-in date' : 'Stay date'}</label>
          <input class="input" id="pro_date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label class="field-label">Status</label>
          <select class="select" id="pro_status"><option>Sent</option><option>Acknowledged</option><option>No response</option><option>Skipped</option></select></div>
      </div>
      <div class="form-group"><label class="field-label">Notes</label>
        <input class="input" id="pro_notes" placeholder="Optional notes"></div>
      <div class="modal-actions">
        <button class="btn" onclick="removeModal('proModal')">Cancel</button>
        <button class="btn btn-primary" onclick="saveProactive('${type}')">Save</button>
      </div>`);
  };
  window.saveProactive = function (type) {
    const guest = document.getElementById('pro_guest')?.value.trim();
    if (!guest) { showToast('Guest name required'); return; }
    const entry = {
      id: 'pro_' + Date.now(), guest,
      propId:  document.getElementById('pro_prop').value,
      date:    document.getElementById('pro_date').value,
      status:  document.getElementById('pro_status').value,
      notes:   document.getElementById('pro_notes').value.trim(),
      ts:      Date.now()
    };
    if (type === 'prearrival') store.prearrival.push(entry);
    else                        store.midstay.push(entry);
    saveLocal(); removeModal('proModal'); render(currentView); showToast('Logged successfully');
  };
  window.deleteProactive = function (type, id) {
    if (type === 'prearrival') store.prearrival = store.prearrival.filter(x => x.id !== id);
    else                        store.midstay    = store.midstay.filter(x => x.id !== id);
    saveLocal(); render(currentView);
  };

  // ─────────────────────────────────────────────────
  // ── ALL VIEWS
  // ─────────────────────────────────────────────────
  const VIEWS = {

    // ── OVERVIEW ─────────────────────────────────
    overview() {
      const msgs = store.messages;
      const allRevs = store.reviews.filter(r => r.score != null);
      const avgScore = allRevs.length ? +(allRevs.reduce((s, r) => s + r.score, 0) / allRevs.length).toFixed(2) : null;
      const openTks  = store.tickets.filter(t => t.status !== 'Closed').length;
      const openCps  = store.complaints.filter(c => c.status !== 'Resolved').length;
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-card-accent"></div><div class="stat-label">Active messages</div><div class="stat-val">${store.kpi.active}</div></div>
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--red)"></div><div class="stat-label">SLA breaches</div><div class="stat-val ${store.kpi.breaches>0?'down':''}">${store.kpi.breaches}</div></div>
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--green)"></div><div class="stat-label">Avg response</div><div class="stat-val">${store.kpi.avg||'—'}${store.kpi.avg?'m':''}</div></div>
        <div class="stat-card"><div class="stat-label">Avg review score</div><div class="stat-val ${avgScore>=8?'up':avgScore&&avgScore<7?'down':''}">${avgScore||'—'}${avgScore?'/10':''}</div></div>
        <div class="stat-card"><div class="stat-label">Open tickets</div><div class="stat-val ${openTks>0?'down':''}">${openTks}</div></div>
        <div class="stat-card"><div class="stat-label">Open complaints</div><div class="stat-val ${openCps>0?'down':''}">${openCps}</div></div>
      </div>
      ${store.agents.length ? `
      <div class="panel"><div class="ph"><span class="pt">Agent performance</span><span class="ps">${msgs.length} total messages</span></div>
      <div class="tw"><table><thead><tr><th>Agent</th><th>Total</th><th>Active</th><th>Avg RT</th><th>Breaches</th><th>SLA hit</th></tr></thead><tbody>
      ${store.agents.map(a => { const s = agentStats(a.id); return `<tr>
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${a.color||'#2563eb'};margin-right:6px"></span>${a.name}</td>
        <td>${s.total}</td><td>${s.active}</td><td>${fmtRT(s.avgRt)}</td>
        <td>${s.breaches>0?`<span class="pill p-red">${s.breaches}</span>`:'<span class="pill p-green">0</span>'}</td>
        <td>${s.slaHit?s.slaHit+'%':'—'}</td></tr>`;}).join('')}
      </tbody></table></div></div>` : ''}
      ${msgs.length ? `<div class="panel"><div class="ph"><span class="pt">Recent messages</span></div>
      ${msgs.slice(0,8).map(m => `<div class="msg-item">
        <div><div style="font-weight:500;font-size:12px">${m.guest}</div><div style="font-size:10px;color:var(--text3)">${(m.message||'').slice(0,60)}…</div></div>
        <div style="display:flex;gap:5px;align-items:center;flex-shrink:0">${urgencyPill(m.urgency)}<span class="pill p-gray">${m.channel}</span></div></div>`).join('')}</div>` : ''}
      ${!msgs.length&&!store.agents.length ? `<div class="panel">${emptyState('📊','Welcome to GuestCare Command','Add your agents, then import WhatsApp or Hostaway chats to get started.','<button class="btn btn-primary" onclick="render(\'import\')">Import data</button>')}</div>` : ''}`;
    },

    // ── AGENTS ───────────────────────────────────
    agents() {
      return `<div class="panel"><div class="ph"><span class="pt">Agents (${store.agents.length})</span>
        <button class="btn btn-primary" onclick="openAgentModal({})">+ Add agent</button></div>
        ${!store.agents.length ? emptyState('👤','No agents yet','Add your guest care team members.','<button class="btn btn-primary" onclick="openAgentModal({})">+ Add first agent</button>') :
        `<div class="agent-grid">${store.agents.map(a => {
          const s = agentStats(a.id);
          return `<div class="agent-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="width:34px;height:34px;border-radius:50%;background:${a.color||'#2563eb'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">${a.name.slice(0,2).toUpperCase()}</div>
              <div><div style="font-weight:600;font-size:12px">${a.name}</div><div style="font-size:10px;color:var(--text3)">${a.role}</div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
              <div style="background:var(--bg2);border-radius:4px;padding:7px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Messages</div><div style="font-size:18px;font-weight:600">${s.total}</div></div>
              <div style="background:var(--bg2);border-radius:4px;padding:7px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Avg RT</div><div style="font-size:18px;font-weight:600">${fmtRT(s.avgRt)}</div></div>
              <div style="background:var(--bg2);border-radius:4px;padding:7px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">Breaches</div><div style="font-size:18px;font-weight:600;color:${s.breaches>0?'var(--red)':'var(--green)'}">${s.breaches}</div></div>
              <div style="background:var(--bg2);border-radius:4px;padding:7px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">SLA hit</div><div style="font-size:18px;font-weight:600">${s.slaHit?s.slaHit+'%':'—'}</div></div>
            </div>
            ${a.email?`<div style="font-size:10px;color:var(--text3);margin-bottom:8px">${a.email}</div>`:''}
            <div class="btn-group">
              <button class="btn btn-sm" onclick="editAgent('${a.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteAgent('${a.id}')">Delete</button>
            </div></div>`;}).join('')}</div>`}</div>`;
    },

    // ── IMPORT ────────────────────────────────────
    import() {
      return `
      <div class="panel"><div class="ph"><span class="pt">Import WhatsApp chat</span><span class="ps">SLA: ${SLA.WhatsApp}min</span></div>
      <div class="pp">
        ${agentSelectHTML('wa_agent','Select agent')}
        <div style="margin:10px 0"><label class="field-label">WhatsApp chat export (.txt)</label>
        <input type="file" id="waFile" accept=".txt" style="margin-top:4px;font-size:12px;color:var(--text2)"></div>
        <button class="btn btn-primary" id="waParseBtn">Parse & import</button>
        <div id="waResult" style="margin-top:10px"></div>
      </div></div>
      <div class="panel"><div class="ph"><span class="pt">Import Hostaway CSV</span><span class="ps">SLA: ${SLA.Hostaway}min</span></div>
      <div class="pp">
        ${agentSelectHTML('ha_agent','Select agent')}
        <div style="margin:10px 0"><label class="field-label">Hostaway conversation export (.csv)</label>
        <input type="file" id="haFile" accept=".csv" style="margin-top:4px;font-size:12px;color:var(--text2)"></div>
        <button class="btn btn-primary" id="haParseBtn">Parse & import</button>
        <div id="haResult" style="margin-top:10px"></div>
      </div></div>
      ${store.importLog.length ? `<div class="panel"><div class="ph"><span class="pt">Import history</span></div><div class="pp">${store.importLog.slice(0,10).map(l => `<div style="font-size:11px;color:var(--text2);padding:4px 0;border-bottom:1px solid var(--border)">${l}</div>`).join('')}</div></div>` : ''}`;
    },

    // ── ROOT CAUSE ────────────────────────────────
    'root-cause'() {
      const rc = store.rootCause;
      return !rc.length ? `<div class="panel">${emptyState('✅','No SLA breaches','Import conversation data to track SLA compliance.')}</div>` :
      `<div class="panel"><div class="ph"><span class="pt">SLA breaches (${rc.length})</span></div>
      <div class="tw"><table><thead><tr><th>Guest</th><th>Agent</th><th>Channel</th><th>Response time</th><th>SLA limit</th><th>Reason</th><th>Date</th></tr></thead>
      <tbody>${rc.map(r => `<tr>
        <td>${r.guest}</td><td>${r.agentName}</td>
        <td><span class="pill p-gray">${r.channel}</span></td>
        <td><span style="color:var(--red);font-weight:600">${r.rt != null ? r.rt + 'm' : 'No response'}</span></td>
        <td>${SLA[r.channel] || SLA.default}m</td>
        <td>${r.reason}</td>
        <td style="color:var(--text3);font-size:11px">${fmtDate(r.ts)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    },

    // ── RESPONSE TIMES: FIRST ─────────────────────
    'r-first'() {
      const msgs = store.messages.filter(m => m.responded && m.rt != null);
      if (!msgs.length) return `<div class="panel">${emptyState('⏱','No response data','Import conversation exports to track first response times.')}</div>`;
      const byAgent = store.agents.map(a => {
        const am = msgs.filter(m => m.agentId === a.id);
        const avg = am.length ? +(am.reduce((s, m) => s + m.rt, 0) / am.length).toFixed(1) : 0;
        return { name: a.name, avg, count: am.length, color: a.color || COLORS[0] };
      }).filter(a => a.count > 0);
      const whMsg = msgs.filter(m => m.channel === 'WhatsApp');
      const haMsg = msgs.filter(m => m.channel === 'Hostaway');
      const whAvg = whMsg.length ? +(whMsg.reduce((s, m) => s + m.rt, 0) / whMsg.length).toFixed(1) : null;
      const haAvg = haMsg.length ? +(haMsg.reduce((s, m) => s + m.rt, 0) / haMsg.length).toFixed(1) : null;
      setTimeout(() => {
        mkChart('firstRespChart', { type: 'bar', data: { labels: byAgent.map(a => a.name), datasets: [{ label: 'Avg first response (min)', data: byAgent.map(a => a.avg), backgroundColor: byAgent.map(a => a.color + '99'), borderColor: byAgent.map(a => a.color), borderWidth: 1 }] }, options: { ...CD, plugins: { ...CD.plugins, legend: { display: false } } } });
      }, 50);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Responded messages</div><div class="stat-val">${msgs.length}</div></div>
        <div class="stat-card"><div class="stat-label">Overall avg RT</div><div class="stat-val">${store.kpi.avg||'—'}${store.kpi.avg?'m':''}</div></div>
        <div class="stat-card"><div class="stat-label">WhatsApp avg RT</div><div class="stat-val ${whAvg&&whAvg>SLA.WhatsApp?'down':'up'}">${whAvg||'—'}${whAvg?'m':''}</div><div class="stat-sub">SLA: ${SLA.WhatsApp}m</div></div>
        <div class="stat-card"><div class="stat-label">Hostaway avg RT</div><div class="stat-val ${haAvg&&haAvg>SLA.Hostaway?'down':'up'}">${haAvg||'—'}${haAvg?'m':''}</div><div class="stat-sub">SLA: ${SLA.Hostaway}m</div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">First response time by agent</span></div><div class="chart-wrap"><canvas id="firstRespChart"></canvas></div></div>
      <div class="panel"><div class="ph"><span class="pt">Agent breakdown</span></div>
      <div class="tw"><table><thead><tr><th>Agent</th><th>Responses</th><th>Avg RT</th><th>vs SLA (WhatsApp)</th><th>vs SLA (Hostaway)</th></tr></thead>
      <tbody>${byAgent.map(a => `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${a.color};margin-right:6px"></span>${a.name}</td><td>${a.count}</td><td><b>${a.avg}m</b></td>
        <td>${a.avg<=SLA.WhatsApp?'<span class="pill p-green">✓ Within</span>':'<span class="pill p-red">✗ Over</span>'}</td>
        <td>${a.avg<=SLA.Hostaway?'<span class="pill p-green">✓ Within</span>':'<span class="pill p-red">✗ Over</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    },

    // ── RESPONSE TIMES: AVG ───────────────────────
    'r-avg'() {
      const msgs = store.messages.filter(m => m.responded && m.rt != null);
      if (!msgs.length) return `<div class="panel">${emptyState('📈','No data yet','Import conversation data to see response time trends.')}</div>`;
      const byDay = {};
      msgs.forEach(m => {
        const d = new Date(m.ts).toISOString().slice(0, 10);
        if (!byDay[d]) byDay[d] = { sum: 0, count: 0 };
        byDay[d].sum += m.rt; byDay[d].count++;
      });
      const days    = Object.keys(byDay).sort().slice(-30);
      const avgByDay = days.map(d => +(byDay[d].sum / byDay[d].count).toFixed(1));
      const best  = Math.min(...avgByDay);
      const worst = Math.max(...avgByDay);
      setTimeout(() => {
        mkChart('avgRtChart', { type: 'line', data: { labels: days.map(d => { const dt = new Date(d); return dt.toLocaleString([],{month:'short',day:'numeric'}); }), datasets: [
          { label: 'Avg RT (min)', data: avgByDay, borderColor: '#2563eb', backgroundColor: '#2563eb15', fill: true },
          { label: 'WhatsApp SLA', data: days.map(() => SLA.WhatsApp), borderColor: '#dc2626', borderDash: [4, 4], borderWidth: 1, pointRadius: 0 },
          { label: 'Hostaway SLA', data: days.map(() => SLA.Hostaway), borderColor: '#d97706', borderDash: [4, 4], borderWidth: 1, pointRadius: 0 }
        ] }, options: CDL });
      }, 50);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Best avg day</div><div class="stat-val up">${best}m</div></div>
        <div class="stat-card"><div class="stat-label">Worst avg day</div><div class="stat-val down">${worst}m</div></div>
        <div class="stat-card"><div class="stat-label">Overall avg</div><div class="stat-val">${store.kpi.avg}m</div></div>
        <div class="stat-card"><div class="stat-label">Days tracked</div><div class="stat-val">${days.length}</div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">Average response time trend (last 30 days)</span></div><div class="chart-wrap-tall"><canvas id="avgRtChart"></canvas></div></div>`;
    },

    // ── RESPONSE TIMES: DELAYS ────────────────────
    'r-delays'() {
      const delayed = store.messages.filter(m => m.breach && m.responded && m.rt != null).sort((a, b) => b.rt - a.rt);
      return !delayed.length ? `<div class="panel">${emptyState('✅','No delayed responses','All responses are within SLA thresholds.')}</div>` :
      `<div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total delays</div><div class="stat-val down">${delayed.length}</div></div>
        <div class="stat-card"><div class="stat-label">Longest delay</div><div class="stat-val down">${delayed[0].rt}m</div></div>
        <div class="stat-card"><div class="stat-label">Avg delay RT</div><div class="stat-val">${+(delayed.reduce((s,m)=>s+m.rt,0)/delayed.length).toFixed(1)}m</div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">Delayed responses — responded but over SLA (${delayed.length})</span></div>
      <div class="tw"><table><thead><tr><th>Guest</th><th>Agent</th><th>Channel</th><th>Response time</th><th>Over SLA by</th><th>Date</th></tr></thead>
      <tbody>${delayed.map(m => {
        const limit = SLA[m.channel] || SLA.default;
        const over  = (m.rt - limit).toFixed(1);
        return `<tr><td>${m.guest}</td><td>${agentName(m.agentId)}</td>
          <td><span class="pill p-gray">${m.channel}</span></td>
          <td><span style="color:var(--amber);font-weight:600">${m.rt}m</span></td>
          <td><span class="pill p-red">+${over}m</span></td>
          <td style="font-size:11px;color:var(--text3)">${fmtDate(m.ts)}</td></tr>`;}).join('')}
      </tbody></table></div></div>`;
    },

    // ── RESPONSE TIMES: MISSED ────────────────────
    'r-missed'() {
      const missed = store.messages.filter(m => !m.responded).sort((a, b) => b.ts - a.ts);
      return !missed.length ? `<div class="panel">${emptyState('✅','No missed messages','All messages have received a response.')}</div>` :
      `<div class="panel"><div class="ph"><span class="pt">Missed / unanswered messages (${missed.length})</span></div>
      <div class="tw"><table><thead><tr><th>Guest</th><th>Agent</th><th>Channel</th><th>Message</th><th>Date</th></tr></thead>
      <tbody>${missed.map(m => `<tr>
        <td>${m.guest}</td><td>${agentName(m.agentId)}</td>
        <td><span class="pill p-gray">${m.channel}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text2)">${m.message||''}</td>
        <td style="font-size:11px;color:var(--text3)">${fmtDate(m.ts)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    },

    // ── SATISFACTION: REVIEWS ─────────────────────
    'sat-reviews'() {
      const revs = store.reviews.filter(r => r.score != null);
      if (!revs.length) return `<div class="panel">${emptyState('⭐','No review data','Add reviews manually or import a CSV file.','<button class="btn btn-primary" onclick="render(\'gr-import\')">Import reviews</button>')}</div>`;
      const avg      = +(revs.reduce((s, r) => s + r.score, 0) / revs.length).toFixed(2);
      const great    = revs.filter(r => r.score >= 9).length;
      const good     = revs.filter(r => r.score >= 7 && r.score < 9).length;
      const poor     = revs.filter(r => r.score < 7).length;
      const dist     = [1,2,3,4,5].reverse().map(star => {
        const count = revs.filter(r => Math.round(r.score/2) === star).length;
        return { star, count, pct: Math.round(100*count/revs.length) };
      });
      const propsRanked = store.properties.map(p => ({ p, avg: propAvgScore(p.id), cnt: propReviewCount(p.id) })).filter(x => x.avg != null).sort((a, b) => b.avg - a.avg);
      setTimeout(() => {
        mkChart('satScoreChart', { type: 'doughnut', data: { labels: ['9-10 Excellent', '7-8 Good', '<7 Poor'], datasets: [{ data: [great, good, poor], backgroundColor: ['#16a34a','#d97706','#dc2626'], borderWidth: 0 }] }, options: { ...CD, plugins: { ...CD.plugins, legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 12 } } }, scales: {} } });
      }, 50);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total reviews</div><div class="stat-val">${revs.length}</div></div>
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--green)"></div><div class="stat-label">Average score</div><div class="stat-val ${avg>=8?'up':avg<7?'down':''}">${avg}/10</div></div>
        <div class="stat-card"><div class="stat-label">Excellent (9-10)</div><div class="stat-val up">${great}</div><div class="stat-sub">${Math.round(100*great/revs.length)}%</div></div>
        <div class="stat-card"><div class="stat-label">Poor (&lt;7)</div><div class="stat-val ${poor>0?'down':''}">${poor}</div><div class="stat-sub">${Math.round(100*poor/revs.length)}%</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="panel"><div class="ph"><span class="pt">Score distribution</span></div><div class="chart-wrap"><canvas id="satScoreChart"></canvas></div></div>
        <div class="panel"><div class="ph"><span class="pt">Star breakdown</span></div><div class="pp">
          ${dist.map(d => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="font-size:11px;width:14px;text-align:right;color:var(--amber)">${d.star}★</div>
            <div style="flex:1;background:var(--bg3);border-radius:3px;height:8px"><div style="width:${d.pct}%;background:var(--amber);border-radius:3px;height:100%;transition:width .3s"></div></div>
            <div style="font-size:10px;color:var(--text3);width:30px">${d.pct}%</div>
            <div style="font-size:10px;color:var(--text3);width:20px">${d.count}</div>
          </div>`).join('')}
        </div></div>
      </div>
      ${propsRanked.length ? `<div class="panel"><div class="ph"><span class="pt">Properties ranked by score</span></div>
      <div class="tw"><table><thead><tr><th>Property</th><th>Reviews</th><th>Avg score</th><th>Stars</th><th>Status</th></tr></thead>
      <tbody>${propsRanked.map(({p, avg, cnt}) => `<tr>
        <td><b>${p.name}</b><br><span style="font-size:10px;color:var(--text3)">${p.location||''}</span></td>
        <td>${cnt}</td>
        <td><span class="${scoreClass(avg)}" style="font-weight:700;font-size:14px">${avg}</span>/10</td>
        <td style="color:var(--amber)">${starsHTML(avg)}</td>
        <td><span class="pill ${p.status==='Active'?'p-green':'p-gray'}">${p.status}</span></td></tr>`).join('')}
      </tbody></table></div></div>` : ''}`;
    },

    // ── SATISFACTION: COMPLAINTS ──────────────────
    'sat-complaints'() {
      const open     = store.complaints.filter(c => c.status !== 'Resolved');
      const resolved = store.complaints.filter(c => c.status === 'Resolved');
      const byCat    = {};
      store.complaints.forEach(c => { byCat[c.category] = (byCat[c.category]||0)+1; });
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total complaints</div><div class="stat-val">${store.complaints.length}</div></div>
        <div class="stat-card"><div class="stat-label">Open</div><div class="stat-val ${open.length?'down':''}">${open.length}</div></div>
        <div class="stat-card"><div class="stat-label">Resolved</div><div class="stat-val up">${resolved.length}</div></div>
        <div class="stat-card"><div class="stat-label">Resolution rate</div><div class="stat-val">${store.complaints.length?Math.round(100*resolved.length/store.complaints.length)+'%':'—'}</div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">Complaints log</span><button class="btn btn-primary" onclick="addComplaintModal()">+ Log complaint</button></div>
      ${!store.complaints.length ? emptyState('📋','No complaints logged','Use the button above to log guest complaints.') :
      `<div class="tw"><table><thead><tr><th>Guest</th><th>Property</th><th>Category</th><th>Severity</th><th>Status</th><th>Date</th><th></th></tr></thead>
      <tbody>${store.complaints.slice().sort((a,b)=>b.ts-a.ts).map(c => `<tr>
        <td><b>${c.guest}</b><br><span style="font-size:10px;color:var(--text3)">${c.description.slice(0,40)}…</span></td>
        <td style="font-size:11px">${propName(c.propId)}</td>
        <td><span class="pill p-gray">${c.category}</span></td>
        <td>${severityPill(c.severity)}</td>
        <td>${statusPill(c.status)}</td>
        <td style="font-size:11px;color:var(--text3)">${fmtDate(c.ts)}</td>
        <td><div class="btn-group">
          ${c.status!=='Resolved'?`<button class="btn btn-sm" onclick="resolveComplaint('${c.id}')">Resolve</button>`:''}
          <button class="btn btn-sm" onclick="editComplaint('${c.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteComplaint('${c.id}')">✕</button>
        </div></td></tr>`).join('')}
      </tbody></table></div>`}</div>
      ${Object.keys(byCat).length ? `<div class="panel"><div class="ph"><span class="pt">Complaints by category</span></div><div class="pp">
        ${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,cnt]) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">${cat}</span><span class="pill p-gray">${cnt}</span></div>`).join('')}
      </div></div>` : ''}`;
    },

    // ── SATISFACTION: NPS ─────────────────────────
    'sat-nps'() {
      const latest = store.nps.length ? store.nps[store.nps.length - 1] : null;
      const npsClass = s => s >= 50 ? 'up' : s >= 0 ? '' : 'down';
      setTimeout(() => {
        if (store.nps.length > 1) {
          mkChart('npsChart', { type: 'bar', data: { labels: store.nps.map(n => fmtMon(n.month)), datasets: [{ label: 'NPS', data: store.nps.map(n => n.score), backgroundColor: store.nps.map(n => n.score >= 50 ? '#16a34a99' : n.score >= 0 ? '#d9770699' : '#dc262699'), borderColor: store.nps.map(n => n.score >= 50 ? '#16a34a' : n.score >= 0 ? '#d97706' : '#dc2626'), borderWidth: 1 }] }, options: { ...CD, scales: { ...CD.scales, y: { ...CD.scales.y, min: -100, max: 100 } } } });
        }
      }, 50);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Latest NPS</div><div class="stat-val ${latest?npsClass(latest.score):''}">${latest?latest.score:'—'}</div>${latest?`<div class="stat-sub">${fmtMon(latest.month)}</div>`:''}</div>
        <div class="stat-card"><div class="stat-label">Months tracked</div><div class="stat-val">${store.nps.length}</div></div>
        <div class="stat-card"><div class="stat-label">Best NPS</div><div class="stat-val up">${store.nps.length?Math.max(...store.nps.map(n=>n.score)):'—'}</div></div>
        <div class="stat-card"><div class="stat-label">Avg NPS</div><div class="stat-val">${store.nps.length?+(store.nps.reduce((s,n)=>s+n.score,0)/store.nps.length).toFixed(0):'—'}</div></div>
      </div>
      ${store.nps.length > 1 ? `<div class="panel"><div class="ph"><span class="pt">NPS trend</span></div><div class="chart-wrap"><canvas id="npsChart"></canvas></div></div>` : ''}
      <div class="panel"><div class="ph"><span class="pt">NPS log</span><button class="btn btn-primary" onclick="openNpsModal()">+ Log NPS</button></div>
      ${!store.nps.length ? emptyState('📊','No NPS data','Log your monthly NPS scores to track guest satisfaction over time.','<button class="btn btn-primary" onclick="openNpsModal()">+ Log first score</button>') :
      `<div class="tw"><table><thead><tr><th>Month</th><th>NPS Score</th><th>Responses</th><th>Rating</th><th></th></tr></thead>
      <tbody>${store.nps.slice().reverse().map(n => `<tr>
        <td>${fmtMon(n.month)}</td>
        <td><span style="font-size:16px;font-weight:700;color:${n.score>=50?'var(--green)':n.score>=0?'var(--amber)':'var(--red)'}">${n.score}</span></td>
        <td>${n.responses||'—'}</td>
        <td>${n.score>=50?'<span class="pill p-green">Excellent</span>':n.score>=20?'<span class="pill p-blue">Good</span>':n.score>=0?'<span class="pill p-amber">Neutral</span>':'<span class="pill p-red">Poor</span>'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteNps('${n.month}')">✕</button></td></tr>`).join('')}
      </tbody></table></div>`}</div>
      <div class="panel"><div class="ph"><span class="pt">NPS scale guide</span></div><div class="pp" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:11px">
        <div style="background:var(--red-light);border-radius:6px;padding:10px;text-align:center"><div style="font-weight:700;color:var(--red);font-size:16px">-100–0</div><div style="color:var(--text2);margin-top:4px">Detractors</div></div>
        <div style="background:var(--amber-light);border-radius:6px;padding:10px;text-align:center"><div style="font-weight:700;color:var(--amber);font-size:16px">0–30</div><div style="color:var(--text2);margin-top:4px">Neutral</div></div>
        <div style="background:var(--accent-light);border-radius:6px;padding:10px;text-align:center"><div style="font-weight:700;color:var(--accent);font-size:16px">31–70</div><div style="color:var(--text2);margin-top:4px">Good</div></div>
        <div style="background:var(--green-light);border-radius:6px;padding:10px;text-align:center"><div style="font-weight:700;color:var(--green);font-size:16px">71–100</div><div style="color:var(--text2);margin-top:4px">Excellent</div></div>
      </div></div>`;
    },

    // ── SATISFACTION: REPEAT GUESTS ───────────────
    'sat-repeat'() {
      const guestCount = {};
      store.reviews.forEach(r => { if (r.guest) guestCount[r.guest] = (guestCount[r.guest]||0)+1; });
      const repeats = Object.entries(guestCount).filter(([,c]) => c > 1).sort((a,b)=>b[1]-a[1]);
      const total   = Object.keys(guestCount).length;
      const pct     = total ? Math.round(100*repeats.length/total) : 0;
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Unique guests</div><div class="stat-val">${total}</div></div>
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--green)"></div><div class="stat-label">Repeat guests</div><div class="stat-val up">${repeats.length}</div></div>
        <div class="stat-card"><div class="stat-label">Repeat rate</div><div class="stat-val">${pct}%</div></div>
        <div class="stat-card"><div class="stat-label">Max visits</div><div class="stat-val">${repeats.length?repeats[0][1]:'—'}</div></div>
      </div>
      ${!repeats.length ? `<div class="panel">${emptyState('🔄','No repeat guests detected','Repeat guests are identified from review data. Add more reviews to see patterns.')}</div>` :
      `<div class="panel"><div class="ph"><span class="pt">Repeat guests (${repeats.length})</span></div>
      <div class="tw"><table><thead><tr><th>Guest name</th><th>Total stays</th><th>Loyalty</th></tr></thead>
      <tbody>${repeats.map(([name, count]) => `<tr>
        <td><b>${name}</b></td><td>${count}</td>
        <td>${count>=5?'<span class="pill p-green">VIP</span>':count>=3?'<span class="pill p-blue">Loyal</span>':'<span class="pill p-gray">Returning</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>`}`;
    },

    // ── SATISFACTION: RESOLUTION ──────────────────
    'sat-resolution'() {
      const msgs     = store.messages;
      const responded = msgs.filter(m => m.responded).length;
      const total     = msgs.length;
      const rate      = total ? Math.round(100*responded/total) : 0;
      const cpTotal   = store.complaints.length;
      const cpRes     = store.complaints.filter(c => c.status === 'Resolved').length;
      const cpRate    = cpTotal ? Math.round(100*cpRes/cpTotal) : 0;
      setTimeout(() => {
        mkChart('resRateChart', { type: 'doughnut', data: { labels: ['Responded','Missed'], datasets: [{ data: [responded, total-responded], backgroundColor: ['#16a34a','#dc2626'], borderWidth: 0 }] }, options: { ...CD, plugins: { ...CD.plugins, legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } } }, scales: {} } });
        mkChart('cpResChart', { type: 'doughnut', data: { labels: ['Resolved','Open'], datasets: [{ data: [cpRes, cpTotal-cpRes], backgroundColor: ['#16a34a','#d97706'], borderWidth: 0 }] }, options: { ...CD, plugins: { ...CD.plugins, legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } } }, scales: {} } });
      }, 50);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--green)"></div><div class="stat-label">Message resolution</div><div class="stat-val ${rate>=90?'up':rate<70?'down':''}">${rate}%</div></div>
        <div class="stat-card"><div class="stat-label">Messages responded</div><div class="stat-val">${responded} / ${total}</div></div>
        <div class="stat-card"><div class="stat-label">Complaint resolution</div><div class="stat-val ${cpRate>=80?'up':cpRate<50?'down':''}">${cpRate}%</div></div>
        <div class="stat-card"><div class="stat-label">Complaints resolved</div><div class="stat-val">${cpRes} / ${cpTotal}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="panel"><div class="ph"><span class="pt">Message response rate</span></div><div class="chart-wrap"><canvas id="resRateChart"></canvas></div></div>
        <div class="panel"><div class="ph"><span class="pt">Complaint resolution rate</span></div><div class="chart-wrap"><canvas id="cpResChart"></canvas></div></div>
      </div>`;
    },

    // ── OPERATIONS: TICKETS VIEW (shared logic) ───
    _ticketView(filter, title, addType, addStatus) {
      const tks = store.tickets.filter(filter).sort((a,b)=>b.ts-a.ts);
      return `<div class="panel"><div class="ph"><span class="pt">${title} (${tks.length})</span>
        <button class="btn btn-primary" onclick="openTicketModal({type:'${addType||'Issue'}',status:'${addStatus||'Open'}'})">+ New ticket</button></div>
        ${!tks.length ? emptyState('🎉',`No ${title.toLowerCase()}`,`Use the button above to log a new ticket.`) :
        tks.map(t => `<div class="ticket-item">
          <div style="flex:0 0 auto;margin-top:2px">${statusPill(t.status)}</div>
          <div style="flex:1">
            <div class="ticket-title">${t.title}</div>
            <div class="ticket-meta">${t.type} · ${propName(t.propId)||'No property'} · ${fmtDate(t.ts)}</div>
            ${t.notes?`<div style="font-size:11px;color:var(--text2);margin-top:3px">${t.notes}</div>`:''}
          </div>
          <div style="display:flex;gap:5px;align-items:center;flex-shrink:0">
            ${['Low','Medium','High','Urgent'].find(p=>p===t.priority)?`<span class="pill ${{Urgent:'p-red',High:'p-amber',Medium:'p-blue',Low:'p-gray'}[t.priority]}">${t.priority}</span>`:''}
            <button class="btn btn-sm" onclick="editTicket('${t.id}')">Edit</button>
            ${t.status!=='Closed'?`<button class="btn btn-sm" onclick="closeTicket('${t.id}')">Close</button>`:''}
            <button class="btn btn-sm btn-danger" onclick="deleteTicket('${t.id}')">✕</button>
          </div></div>`).join('')}</div>`;
    },

    'ops-closed'()       { return this._ticketView(t => t.status === 'Closed',     'Closed tickets', 'Issue', 'Closed'); },
    'ops-active'()       { return this._ticketView(t => ['Open','In Progress'].includes(t.status), 'Active issues', 'Issue', 'Open'); },
    'ops-escalations'()  { return this._ticketView(t => t.status === 'Escalated',  'Escalations',   'Issue', 'Escalated'); },
    'ops-maintenance'()  { return this._ticketView(t => t.type  === 'Maintenance', 'Maintenance requests', 'Maintenance', 'Open'); },
    'ops-inspections'()  { return this._ticketView(t => t.type  === 'Inspection',  'Property inspections', 'Inspection', 'Open'); },
    'ops-deepclean'()    { return this._ticketView(t => t.type  === 'Deep Clean',  'Deep clean schedule',  'Deep Clean', 'Open'); },

    // ── GUEST REVIEWS: PROPERTIES ─────────────────
    'gr-properties'() {
      const q = (document.getElementById('grPropSearch')?.value || '').toLowerCase();
      const props = store.properties.filter(p => !q || p.name.toLowerCase().includes(q) || (p.location||'').toLowerCase().includes(q));
      return `<div class="panel">
        <div class="gr-toolbar">
          <div class="gr-search">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
            <input class="input" id="grPropSearch" placeholder="Search properties…" value="${q}" oninput="render('gr-properties')" style="border:none;background:transparent;padding:0">
          </div>
          <button class="btn btn-primary" onclick="grOpenAddProperty()">+ Add property</button>
          <span class="text-muted">${props.length} propert${props.length===1?'y':'ies'}</span>
        </div>
        ${!store.properties.length ? emptyState('🏠','No properties yet','Add your first property to start tracking reviews.','<button class="btn btn-primary" onclick="grOpenAddProperty()">Add property</button>') :
        !props.length ? emptyState('🔍','No results','Try a different search term.') :
        `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;padding:14px">
          ${props.map(p => {
            const avg = propAvgScore(p.id), cnt = propReviewCount(p.id);
            return `<div class="prop-card">
              <div class="prop-card-top">
                <div><div class="prop-name">${p.name}</div>
                <div class="prop-meta">${p.type}${p.location?' · '+p.location:''}${p.beds>0?' · '+p.beds+' bed'+(p.beds===1?'':'s'):''}</div>
                <div style="margin-top:4px"><span class="pill ${p.status==='Active'?'p-green':'p-gray'}">${p.status}</span>${p.hostawayId?`<span class="pill p-gray" style="margin-left:4px">ID: ${p.hostawayId}</span>`:''}</div></div>
                <div style="text-align:right">
                  ${avg!=null?`<div class="prop-score ${scoreClass(avg)}" style="padding:4px 8px;border-radius:6px;display:inline-block">${avg}</div><div class="stars">${starsHTML(avg)}</div>`:
                  '<div style="color:var(--text3);font-size:11px">No reviews</div>'}
                  <div style="font-size:10px;color:var(--text3);margin-top:2px">${cnt} review${cnt===1?'':'s'}</div>
                </div>
              </div>
              <div class="prop-actions">
                <button class="btn btn-sm" onclick="grOpenEditProperty('${p.id}')">Edit</button>
                <button class="btn btn-sm" onclick="grOpenAddReview('${p.id}')">+ Review</button>
                <button class="btn btn-sm btn-danger" onclick="grDeleteProperty('${p.id}')">Delete</button>
              </div></div>`;}).join('')}
        </div>`}</div>`;
    },

    // ── GUEST REVIEWS: REVIEWS LIST ───────────────
    'gr-reviews'() {
      const propFilter = document.getElementById('grRevPropFilter')?.value || '';
      const q          = (document.getElementById('grRevSearch')?.value || '').toLowerCase();
      const sortBy     = document.getElementById('grRevSort')?.value || 'newest';
      let revs = store.reviews.slice();
      if (propFilter) revs = revs.filter(r => r.propertyId === propFilter);
      if (q)          revs = revs.filter(r => (r.guest||'').toLowerCase().includes(q) || (r.text||'').toLowerCase().includes(q));
      if (sortBy === 'newest')  revs.sort((a,b) => b.ts - a.ts);
      if (sortBy === 'oldest')  revs.sort((a,b) => a.ts - b.ts);
      if (sortBy === 'highest') revs.sort((a,b) => (b.score||0) - (a.score||0));
      if (sortBy === 'lowest')  revs.sort((a,b) => (a.score||10) - (b.score||10));
      return `<div class="panel">
        <div class="gr-toolbar">
          <div class="gr-search">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
            <input class="input" id="grRevSearch" placeholder="Search…" value="${q}" oninput="render('gr-reviews')" style="border:none;background:transparent;padding:0">
          </div>
          <select class="select" id="grRevPropFilter" style="width:auto" onchange="render('gr-reviews')">
            <option value="">All properties</option>
            ${store.properties.map(p => `<option value="${p.id}"${p.id===propFilter?' selected':''}>${p.name}</option>`).join('')}
          </select>
          <select class="select" id="grRevSort" style="width:auto" onchange="render('gr-reviews')">
            <option value="newest"${sortBy==='newest'?' selected':''}>Newest</option>
            <option value="oldest"${sortBy==='oldest'?' selected':''}>Oldest</option>
            <option value="highest"${sortBy==='highest'?' selected':''}>Highest score</option>
            <option value="lowest"${sortBy==='lowest'?' selected':''}>Lowest score</option>
          </select>
          <button class="btn btn-primary" onclick="grAddReviewClick(${propFilter?`'${propFilter}'`:'null'})">+ Add review</button>
          <span class="text-muted">${revs.length} review${revs.length===1?'':'s'}</span>
        </div>
        ${!store.reviews.length ? emptyState('⭐','No reviews yet','Add reviews manually or import a CSV.','<button class="btn btn-primary" onclick="render(\'gr-import\')">Import CSV</button>') :
        !revs.length ? emptyState('🔍','No results','Adjust filters or search term.') :
        revs.map(r => {
          const sc = r.score;
          return `<div class="review-row">
            <div class="review-score-badge ${sc?scoreClass(sc):''}">${sc||'—'}</div>
            <div class="review-body">
              <div class="review-top">
                <span class="review-guest">${r.guest||'Anonymous'} <span class="prop-tag">${propName(r.propertyId)}</span> <span class="pill p-gray" style="font-size:9px">${r.channel||''}</span></span>
                <span class="review-date">${fmtDate(r.ts)}</span>
              </div>
              ${r.text?`<div class="review-text">"${r.text}"</div>`:''}
              <div class="review-footer">
                <button class="btn btn-sm" onclick="grOpenEditReview('${r.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="grDeleteReview('${r.id}')">Delete</button>
              </div>
            </div></div>`;}).join('')}
      </div>`;
    },

    // ── GUEST REVIEWS: ANALYSIS ───────────────────
    'gr-analysis'() {
      if (!store.properties.length) return `<div class="panel">${emptyState('📊','No properties','Add properties and reviews to see analysis.')}</div>`;
      const propsWithRevs = store.properties.filter(p => propReviewCount(p.id) > 0);
      const attention = [], good = [];
      propsWithRevs.forEach(p => {
        const avg     = propAvgScore(p.id);
        const monthly = propMonthlyScores(p.id);
        const trend   = monthly.length >= 2 ? monthly[monthly.length-1].avg - monthly[monthly.length-2].avg : 0;
        if (avg < 8.0 || trend < -0.5) attention.push({ ...p, avg, trend });
        else                            good.push({ ...p, avg, trend });
      });
      const allMonthly = {};
      store.reviews.filter(r => r.score != null).forEach(r => {
        const k = new Date(r.ts).toISOString().slice(0,7);
        if (!allMonthly[k]) allMonthly[k] = { sum:0, count:0 };
        allMonthly[k].sum += r.score; allMonthly[k].count++;
      });
      const months   = Object.keys(allMonthly).sort();
      const avgByMon = months.map(m => +(allMonthly[m].sum/allMonthly[m].count).toFixed(2));
      setTimeout(() => {
        if (months.length > 1) {
          mkChart('overallTrendChart', { type: 'line', data: { labels: months.map(fmtMon), datasets: [{ label: 'Avg score', data: avgByMon, borderColor: '#2563eb', backgroundColor: '#2563eb12', fill: true }] }, options: CD });
        }
        if (propsWithRevs.length) {
          mkChart('propBarChart', { type: 'bar', data: { labels: propsWithRevs.map(p => p.name.slice(0,20)), datasets: [{ label: 'Avg score', data: propsWithRevs.map(p => propAvgScore(p.id)), backgroundColor: propsWithRevs.map(p => { const s = propAvgScore(p.id); return s>=8?'#16a34a99':s>=6?'#d9770699':'#dc262699'; }), borderWidth: 0 }] }, options: { ...CD, indexAxis: 'y', scales: { ...CD.scales, x: { ...CD.scales.x, min: 0, max: 10 } } } });
        }
      }, 50);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total properties</div><div class="stat-val">${store.properties.length}</div></div>
        <div class="stat-card"><div class="stat-label">With reviews</div><div class="stat-val">${propsWithRevs.length}</div></div>
        <div class="stat-card"><div class="stat-label">Need attention</div><div class="stat-val ${attention.length?'down':''}">${attention.length}</div></div>
        <div class="stat-card"><div class="stat-label">Performing well</div><div class="stat-val up">${good.length}</div></div>
      </div>
      ${months.length > 1 ? `<div class="panel"><div class="ph"><span class="pt">Portfolio score trend</span></div><div class="chart-wrap"><canvas id="overallTrendChart"></canvas></div></div>` : ''}
      ${propsWithRevs.length ? `<div class="panel"><div class="ph"><span class="pt">Score by property</span></div><div class="chart-wrap-tall"><canvas id="propBarChart"></canvas></div></div>` : ''}
      ${attention.length ? `<div class="panel"><div class="ph"><span class="pt" style="color:var(--red)">⚠ Needs attention</span></div><div class="analysis-grid">
        ${attention.map(p => `<div class="analysis-card attention"><div style="font-weight:600;font-size:12px">${p.name}</div><div style="font-size:11px;margin-top:4px">Score: <b>${p.avg}/10</b></div><div style="font-size:10px;color:var(--red);margin-top:2px">${p.trend<0?'↓ Declining trend':p.avg<8?'Below 8.0 threshold':''}</div></div>`).join('')}
      </div></div>` : ''}
      ${good.length ? `<div class="panel"><div class="ph"><span class="pt" style="color:var(--green)">✓ Performing well</span></div><div class="analysis-grid">
        ${good.map(p => `<div class="analysis-card good"><div style="font-weight:600;font-size:12px">${p.name}</div><div style="font-size:11px;margin-top:4px">Score: <b>${p.avg}/10</b></div></div>`).join('')}
      </div></div>` : ''}`;
    },

    // ── GUEST REVIEWS: IMPORT CSV ─────────────────
    'gr-import'() {
      return `<div class="panel"><div class="ph"><span class="pt">Import reviews from CSV</span></div><div class="pp">
        <label class="upload-zone" id="revCsvZone" style="cursor:pointer">
          <input type="file" id="revCsvFile" accept=".csv" style="position:absolute;opacity:0;width:0;height:0">
          <div class="upload-icon">CSV</div>
          <div class="upload-lbl">Drop CSV file here or click to browse</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px">Required columns: property_name, guest_name, date, overall_score</div>
        </label>
        <div id="revCsvResult"></div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary" id="revCsvParseBtn">Parse & import</button>
          <button class="btn" onclick="downloadSampleCSV()">Download sample CSV</button>
        </div>
      </div></div>`;
    },

    // ── CHANNEL: shared helper ────────────────────
    _channelView(channel, label) {
      const revs = store.reviews.filter(r => r.channel === channel);
      const msgs = store.messages.filter(m => (m.channel||'').toLowerCase().includes(channel.toLowerCase()));
      const avg  = revs.filter(r=>r.score!=null).length ? +(revs.filter(r=>r.score!=null).reduce((s,r)=>s+r.score,0)/revs.filter(r=>r.score!=null).length).toFixed(2) : null;
      const recent = revs.slice().sort((a,b)=>b.ts-a.ts).slice(0,5);
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">${label} reviews</div><div class="stat-val">${revs.length}</div></div>
        <div class="stat-card"><div class="stat-label">Avg score</div><div class="stat-val ${avg>=8?'up':avg&&avg<7?'down':''}">${avg||'—'}${avg?'/10':''}</div></div>
        <div class="stat-card"><div class="stat-label">Messages</div><div class="stat-val">${msgs.length}</div></div>
        <div class="stat-card"><div class="stat-label">Breaches</div><div class="stat-val ${msgs.filter(m=>m.breach).length?'down':''}">${msgs.filter(m=>m.breach).length}</div></div>
      </div>
      ${!revs.length ? `<div class="panel">${emptyState('📦',`No ${label} data`,'Import reviews tagged with this channel to see stats here.')}</div>` :
      `<div class="panel"><div class="ph"><span class="pt">Recent ${label} reviews</span></div>
      ${recent.map(r => `<div class="review-row">
        <div class="review-score-badge ${r.score?scoreClass(r.score):''}">${r.score||'—'}</div>
        <div class="review-body">
          <div class="review-top"><span class="review-guest">${r.guest} <span class="prop-tag">${propName(r.propertyId)}</span></span><span class="review-date">${fmtDate(r.ts)}</span></div>
          ${r.text?`<div class="review-text">"${r.text}"</div>`:''}
        </div></div>`).join('')}</div>`}`;
    },

    'chan-airbnb'()  { return this._channelView('Airbnb',      'Airbnb'); },
    'chan-booking'() { return this._channelView('Booking.com', 'Booking.com'); },
    'chan-direct'()  { return this._channelView('Direct',      'Direct'); },

    // ── PROACTIVE: shared helper ──────────────────
    _proView(type, label, items) {
      const sent = items.filter(x => x.status === 'Sent' || x.status === 'Acknowledged').length;
      const missed = items.filter(x => x.status === 'No response' || x.status === 'Skipped').length;
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total logged</div><div class="stat-val">${items.length}</div></div>
        <div class="stat-card"><div class="stat-label">Sent / Acknowledged</div><div class="stat-val up">${sent}</div></div>
        <div class="stat-card"><div class="stat-label">No response / Skipped</div><div class="stat-val ${missed?'down':''}">${missed}</div></div>
        <div class="stat-card"><div class="stat-label">Completion rate</div><div class="stat-val">${items.length?Math.round(100*sent/items.length)+'%':'—'}</div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">${label} log (${items.length})</span>
        <button class="btn btn-primary" onclick="addProactiveModal('${type}')">+ Log entry</button></div>
        ${!items.length ? emptyState('💬',`No ${label} logged yet`,'Use the button above to log each proactive communication.','<button class="btn btn-primary" onclick="addProactiveModal(\''+type+'\')">+ Log first entry</button>') :
        `<div class="tw"><table><thead><tr><th>Guest</th><th>Property</th><th>Date</th><th>Status</th><th>Notes</th><th></th></tr></thead>
        <tbody>${items.slice().sort((a,b)=>b.ts-a.ts).map(x => `<tr>
          <td><b>${x.guest}</b></td>
          <td style="font-size:11px">${propName(x.propId)}</td>
          <td style="font-size:11px">${x.date}</td>
          <td>${statusPill(x.status)}</td>
          <td style="font-size:11px;color:var(--text2)">${x.notes||'—'}</td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteProactive('${type}','${x.id}')">✕</button></td></tr>`).join('')}
        </tbody></table></div>`}
      </div>`;
    },

    'pro-prearrival'() { return this._proView('prearrival', 'Pre-arrival checks', store.prearrival); },
    'pro-midstay'()    { return this._proView('midstay',    'Mid-stay check-ins', store.midstay);    },

    // ── HEATMAP ───────────────────────────────────
    heatmap() {
      const msgs = store.messages;
      if (!msgs.length) return `<div class="panel">${emptyState('🗓','No message data','Import conversations to see the response heatmap.')}</div>`;
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const matrix = Array(7).fill(null).map(() => Array(24).fill(0));
      msgs.forEach(m => {
        const d = new Date(m.ts);
        matrix[d.getDay()][d.getHours()]++;
      });
      const maxVal = Math.max(...matrix.flat()) || 1;
      function heatColor(v) {
        const t = v / maxVal;
        if (t === 0) return 'var(--bg3)';
        const r = Math.round(37 + (220-37)*t), g = Math.round(99 + (38-99)*t), b = Math.round(235 + (38-235)*t);
        return `rgb(${r},${g},${b})`;
      }
      const hours = Array.from({length:24},(_,i)=>{
        const h = i % 12 || 12, am = i < 12;
        return i === 0 ? '12a' : i === 12 ? '12p' : (i%6===0 ? h+(am?'a':'p') : '');
      });
      const totalByHour = Array(24).fill(0);
      const totalByDay  = Array(7).fill(0);
      matrix.forEach((row,d)=>row.forEach((v,h)=>{totalByHour[h]+=v;totalByDay[d]+=v;}));
      const peakHour = totalByHour.indexOf(Math.max(...totalByHour));
      const peakDay  = totalByDay.indexOf(Math.max(...totalByDay));
      const ph = peakHour%12||12, pam = peakHour<12;
      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total messages</div><div class="stat-val">${msgs.length}</div></div>
        <div class="stat-card"><div class="stat-label">Peak hour</div><div class="stat-val">${ph}${pam?'am':'pm'}</div></div>
        <div class="stat-card"><div class="stat-label">Busiest day</div><div class="stat-val">${days[peakDay]}</div></div>
        <div class="stat-card"><div class="stat-label">Off-hours msgs</div><div class="stat-val">${msgs.filter(m=>{const h=new Date(m.ts).getHours();return h<8||h>22;}).length}</div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">Message volume by day × hour</span><span class="ps">Darker = more messages</span></div>
      <div style="padding:14px;overflow-x:auto">
        <div style="display:grid;grid-template-columns:36px repeat(24,1fr);gap:2px;min-width:600px">
          <div></div>
          ${hours.map(h=>`<div style="font-size:9px;color:var(--text3);text-align:center;padding-bottom:3px">${h}</div>`).join('')}
          ${matrix.map((row,di)=>`
            <div style="font-size:9px;color:var(--text3);display:flex;align-items:center;padding-right:6px">${days[di]}</div>
            ${row.map(v=>`<div title="${v} messages" style="height:20px;border-radius:2px;background:${heatColor(v)};cursor:default"></div>`).join('')}`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:10px;color:var(--text3)">
          <span>Low</span>
          <div style="display:flex;gap:2px">${[0,.2,.4,.6,.8,1].map(t=>{const v=Math.round(t*maxVal);const r=Math.round(37+(220-37)*t),g=Math.round(99+(38-99)*t),b=Math.round(235+(38-235)*t);return`<div style="width:20px;height:10px;border-radius:2px;background:${t===0?'var(--bg3)':`rgb(${r},${g},${b})`}"></div>`;}).join('')}</div>
          <span>High</span>
        </div>
      </div></div>
      <div class="panel"><div class="ph"><span class="pt">Volume by day of week</span></div>
      <div style="padding:14px;display:flex;gap:8px;align-items:flex-end;height:100px">
        ${totalByDay.map((v,i)=>{const h=Math.round(70*v/Math.max(...totalByDay,1));return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="font-size:9px;color:var(--text3)">${v}</div>
          <div style="width:100%;height:${h}px;background:var(--accent);border-radius:3px 3px 0 0;min-height:2px"></div>
          <div style="font-size:9px;color:var(--text3)">${days[i]}</div>
        </div>`;}).join('')}
      </div></div>`;
    },

    // ── SENTIMENT ─────────────────────────────────
    sentiment() {
      const revs = store.reviews.filter(r => r.text && r.text.trim().length > 0);
      if (!revs.length) return `<div class="panel">${emptyState('💭','No review text','Add reviews with text content to see sentiment analysis.')}</div>`;

      const posWords = ['great','excellent','amazing','fantastic','perfect','wonderful','love','beautiful','clean','comfortable','friendly','helpful','recommend','outstanding','superb','lovely','spacious','quiet','convenient','stunning'];
      const negWords = ['dirty','noisy','small','disappointing','broken','issue','problem','bad','terrible','awful','poor','smelly','cold','slow','rude','unclean','uncomfortable','difficult','unresponsive','worst'];
      const tagMap   = {};

      let posCount=0, negCount=0, neutCount=0;
      const tagged = revs.map(r => {
        const lower = r.text.toLowerCase();
        const posHits = posWords.filter(w => lower.includes(w));
        const negHits = negWords.filter(w => lower.includes(w));
        posHits.forEach(w => { tagMap[w] = (tagMap[w]||0)+1; });
        negHits.forEach(w => { tagMap[w] = (tagMap[w]||0)+1; });
        const sentiment = posHits.length > negHits.length ? 'positive' : negHits.length > posHits.length ? 'negative' : 'neutral';
        if (sentiment==='positive') posCount++;
        else if (sentiment==='negative') negCount++;
        else neutCount++;
        return { ...r, sentiment, posHits, negHits };
      });

      const posKeywords = Object.entries(tagMap).filter(([w]) => posWords.includes(w)).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const negKeywords = Object.entries(tagMap).filter(([w]) => negWords.includes(w)).sort((a,b)=>b[1]-a[1]).slice(0,8);

      setTimeout(() => {
        mkChart('sentimentChart', { type:'doughnut', data:{ labels:['Positive','Neutral','Negative'], datasets:[{ data:[posCount,neutCount,negCount], backgroundColor:['#16a34a','#9296aa','#dc2626'], borderWidth:0 }] }, options:{...CD,plugins:{...CD.plugins,legend:{display:true,position:'bottom',labels:{font:{size:11},boxWidth:10,padding:12}}},scales:{}} });
      }, 50);

      return `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Reviews analysed</div><div class="stat-val">${revs.length}</div></div>
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--green)"></div><div class="stat-label">Positive</div><div class="stat-val up">${posCount}</div><div class="stat-sub">${Math.round(100*posCount/revs.length)}%</div></div>
        <div class="stat-card"><div class="stat-label">Neutral</div><div class="stat-val">${neutCount}</div></div>
        <div class="stat-card"><div class="stat-card-accent" style="background:var(--red)"></div><div class="stat-label">Negative</div><div class="stat-val ${negCount?'down':''}">${negCount}</div><div class="stat-sub">${Math.round(100*negCount/revs.length)}%</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="panel"><div class="ph"><span class="pt">Sentiment breakdown</span></div><div class="chart-wrap"><canvas id="sentimentChart"></canvas></div></div>
        <div class="panel"><div class="ph"><span class="pt">Top keywords</span></div><div class="pp">
          ${posKeywords.length?`<div style="font-size:10px;font-weight:600;color:var(--green);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Positive mentions</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">${posKeywords.map(([w,c])=>`<span class="pill p-green">${w} <b>${c}</b></span>`).join('')}</div>`:''}
          ${negKeywords.length?`<div style="font-size:10px;font-weight:600;color:var(--red);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Negative mentions</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${negKeywords.map(([w,c])=>`<span class="pill p-red">${w} <b>${c}</b></span>`).join('')}</div>`:''}
          ${!posKeywords.length&&!negKeywords.length?'<div class="text-muted">No keywords detected in current reviews.</div>':''}
        </div></div>
      </div>
      <div class="panel"><div class="ph"><span class="pt">Review sentiment detail</span></div>
      ${tagged.map(r => `<div class="review-row">
        <div class="review-score-badge ${r.score?scoreClass(r.score):''}">${r.score||'—'}</div>
        <div class="review-body">
          <div class="review-top">
            <span class="review-guest">${r.guest} <span class="prop-tag">${propName(r.propertyId)}</span>
              <span class="pill ${r.sentiment==='positive'?'p-green':r.sentiment==='negative'?'p-red':'p-gray'}">${r.sentiment}</span>
            </span>
            <span class="review-date">${fmtDate(r.ts)}</span>
          </div>
          <div class="review-text">"${r.text}"</div>
          ${r.posHits.length||r.negHits.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
            ${r.posHits.map(w=>`<span class="pill p-green" style="font-size:9px">${w}</span>`).join('')}
            ${r.negHits.map(w=>`<span class="pill p-red" style="font-size:9px">${w}</span>`).join('')}
          </div>`:''}
        </div></div>`).join('')}
      </div>`;
    },

    // ── INTEGRATIONS ──────────────────────────────
    integrations() {
      const endpoints = [
        { name:'Agents',      count:store.agents.length },
        { name:'Properties',  count:store.properties.length },
        { name:'Reviews',     count:store.reviews.length },
        { name:'Messages',    count:store.messages.length },
        { name:'Root Causes', count:store.rootCause.length },
        { name:'Tickets',     count:store.tickets.length },
        { name:'Complaints',  count:store.complaints.length }
      ];
      return `<div class="panel"><div class="ph"><span class="pt">Backend integration status</span></div><div class="pp">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="pill p-green">● Connected</span><span style="font-size:12px;color:var(--text2)">guestcare.onrender.com/api</span></div>
        ${endpoints.map(ep=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">${ep.name}</span><span class="pill p-green">${ep.count} records</span></div>`).join('')}
        <div style="margin-top:14px"><button class="btn btn-primary" onclick="syncFromBackend()">Force sync now</button></div>
      </div></div>`;
    },

    // ── ADMIN ─────────────────────────────────────
    admin() {
      return `<div class="panel"><div class="ph"><span class="pt">System administration</span></div><div class="pp">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="openUserMgmt()">Manage users</button>
          <button class="btn" onclick="applyTheme(localStorage.getItem('gcc_dark')!=='1')">Toggle dark / light</button>
          <button class="btn btn-danger" id="clearDataBtn">Clear all data</button>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
        <div style="font-size:12px;color:var(--text2)"><b>Storage key:</b> ${SK}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px"><b>Messages:</b> ${store.messages.length} · <b>Reviews:</b> ${store.reviews.length} · <b>Properties:</b> ${store.properties.length}</div>
      </div></div>`;
    },

    // ── HELP ─────────────────────────────────────
    help() {
      return `<div class="panel"><div class="ph"><span class="pt">Help & documentation</span></div><div class="pp">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">Quick start</div>
        <ol style="padding-left:16px;font-size:12px;color:var(--text2);line-height:1.8">
          <li>Go to <b>Agents</b> and add your guest care team members with their WhatsApp display names.</li>
          <li>Go to <b>Import</b> and upload WhatsApp chat exports (.txt) or Hostaway exports (.csv).</li>
          <li>Check <b>SLA Breaches</b> and <b>Response Times</b> to see performance.</li>
          <li>Add properties under <b>Guest Reviews → Properties</b>, then import or add reviews.</li>
        </ol>
        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">SLA thresholds</div>
        <div style="font-size:12px;color:var(--text2)">WhatsApp: <b>${SLA.WhatsApp} minutes</b> · Hostaway: <b>${SLA.Hostaway} minutes</b></div>
        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">Data storage</div>
        <div style="font-size:12px;color:var(--text2)">Backend: PostgreSQL on Render · Local cache: localStorage<br>All data is saved locally and synced to the server when online.</div>
        <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
        <div style="font-size:12px;color:var(--text3)">Version 2.1.0 · GuestCare Command</div>
      </div></div>`;
    }
  };

  // ── LABELS MAP ───────────────────────────────────
  const LBL = {
    overview:'Overview', agents:'Agents', import:'Import', 'root-cause':'SLA Breaches',
    'r-first':'First Response', 'r-avg':'Avg Response', 'r-delays':'Delays', 'r-missed':'Missed',
    'sat-reviews':'Reviews', 'sat-complaints':'Complaints', 'sat-nps':'NPS', 'sat-repeat':'Repeat Guests', 'sat-resolution':'Resolution',
    'ops-closed':'Closed Tickets', 'ops-active':'Active Issues', 'ops-escalations':'Escalations',
    'ops-maintenance':'Maintenance', 'ops-inspections':'Inspections', 'ops-deepclean':'Deep Clean',
    'gr-properties':'Properties', 'gr-reviews':'Reviews', 'gr-analysis':'Analysis', 'gr-import':'Import CSV',
    'chan-airbnb':'Airbnb', 'chan-booking':'Booking.com', 'chan-direct':'Direct',
    'pro-prearrival':'Pre-arrival', 'pro-midstay':'Mid-stay',
    heatmap:'Response Heatmap', sentiment:'Guest Sentiment',
    integrations:'Integrations', admin:'Admin', help:'Help'
  };

  // ── RENDER ───────────────────────────────────────
  function render(v) {
    killCharts();
    currentView = v;
    const lbl = LBL[v] || v;
    const titleEl = document.getElementById('topTitle');
    const mobTitle = document.getElementById('mobTitle');
    if (titleEl)  titleEl.textContent = lbl;
    if (mobTitle) mobTitle.textContent = lbl;

    const content = document.getElementById('content');
    if (content) {
      try {
        content.innerHTML = VIEWS[v] ? VIEWS[v].call(VIEWS) : `<div class="panel"><div class="ph"><span class="pt">${lbl}</span></div><div class="pp">No view defined for "${v}".</div></div>`;
      } catch (err) {
        content.innerHTML = `<div class="panel"><div class="pp" style="color:var(--red)">Error rendering view: ${err.message}</div></div>`;
        console.error('Render error:', err);
      }
    }

    // Active nav
    document.querySelectorAll('.sb-item,.sb-kid').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`.sb-kid[data-view="${v}"]`) || document.querySelector(`.sb-item[data-view="${v}"]`);
    if (active) active.classList.add('active');

    wireImport();
    wireAdmin();
    wireReviewImport();
    closeSb();
  }
  window.render = render;
  window.syncFromBackend = syncFromBackend;
  window.removeModal = removeModal;
  window.openAgentModal = openAgentModal;

  // ── WIRE: IMPORT ──────────────────────────────────
  function wireImport() {
    const waBtn = document.getElementById('waParseBtn');
    if (waBtn) waBtn.onclick = () => {
      const agentId = document.getElementById('wa_agent')?.value;
      const file    = document.getElementById('waFile')?.files[0];
      const res     = document.getElementById('waResult');
      if (!agentId) { showToast('Select an agent first'); return; }
      if (!file)    { showToast('Select a WhatsApp export file'); return; }
      const agent = store.agents.find(a => a.id === agentId);
      if (!agent.waName) { showToast('This agent has no WhatsApp name set — go to Agents and edit.'); return; }
      const rd = new FileReader();
      rd.onload = e => {
        const result = parseWhatsApp(e.target.result, agent.waName, agentId, 'WhatsApp');
        if (result.error) { if (res) res.innerHTML = `<div class="import-result err">${result.error}</div>`; return; }
        if (res) res.innerHTML = `<div class="import-result ok">✓ Found ${result.threads} conversations, ${result.matched} messages</div>`;
        syncAll(result.messages, agentId, file.name, 'WhatsApp');
      };
      rd.readAsText(file);
    };

    const haBtn = document.getElementById('haParseBtn');
    if (haBtn) haBtn.onclick = () => {
      const agentId = document.getElementById('ha_agent')?.value;
      const file    = document.getElementById('haFile')?.files[0];
      const res     = document.getElementById('haResult');
      if (!agentId) { showToast('Select an agent first'); return; }
      if (!file)    { showToast('Select a Hostaway CSV file'); return; }
      const rd = new FileReader();
      rd.onload = e => {
        const result = parseHostaway(e.target.result, agentId, 'Hostaway');
        if (result.error) { if (res) res.innerHTML = `<div class="import-result err">${result.error}</div>`; return; }
        if (res) res.innerHTML = `<div class="import-result ok">✓ Found ${result.threads} threads, ${result.matched} rows</div>`;
        syncAll(result.messages, agentId, file.name, 'Hostaway');
      };
      rd.readAsText(file);
    };
  }

  // ── WIRE: ADMIN ───────────────────────────────────
  function wireAdmin() {
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) clearBtn.onclick = () => {
      if (confirm('This will delete all local data. Are you sure?')) {
        store = blank(); saveLocal(); render(currentView); showToast('All data cleared');
      }
    };
  }

  // ── WIRE: REVIEW CSV IMPORT ───────────────────────
  function wireReviewImport() {
    const zone = document.getElementById('revCsvZone');
    if (!zone) return;
    zone.addEventListener('click', () => document.getElementById('revCsvFile')?.click());
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); const inp = document.getElementById('revCsvFile'); if (inp && e.dataTransfer.files.length) { Object.defineProperty(inp, 'files', { value: e.dataTransfer.files, configurable: true }); } });

    const btn = document.getElementById('revCsvParseBtn');
    if (!btn) return;
    btn.onclick = () => {
      const file   = document.getElementById('revCsvFile')?.files[0];
      const resDiv = document.getElementById('revCsvResult');
      if (!file) { showToast('Select a CSV file first'); return; }
      const rd = new FileReader();
      rd.onload = e => {
        const result = parseReviewCSV(e.target.result);
        if (result.error) { if (resDiv) resDiv.innerHTML = `<div class="import-result err">${result.error}</div>`; return; }
        if (resDiv) resDiv.innerHTML = `<div class="import-result ok">✓ Imported ${result.imported} reviews${result.skipped?' · '+result.skipped+' skipped':''}</div>`;
        setTimeout(() => render('gr-reviews'), 400);
      };
      rd.readAsText(file);
    };
  }

  // ── SIDEBAR NAV ───────────────────────────────────
  const sidebar   = document.getElementById('sidebar');
  const sbOverlay = document.getElementById('sbOverlay');
  function openSb()  { sidebar?.classList.add('open');    sbOverlay?.classList.add('open'); }
  function closeSb() { sidebar?.classList.remove('open'); sbOverlay?.classList.remove('open'); }

  document.getElementById('mobMenu')?.addEventListener('click', openSb);
  document.getElementById('sbClose')?.addEventListener('click', closeSb);
  document.getElementById('topMenu')?.addEventListener('click', openSb);
  sbOverlay?.addEventListener('click', closeSb);

  document.querySelectorAll('.sb-parent').forEach(btn => {
    btn.onclick = () => {
      const pid = btn.dataset.parent;
      const ch  = document.getElementById('ch-' + pid);
      const open = ch?.classList.contains('open');
      document.querySelectorAll('.sb-kids').forEach(c => c.classList.remove('open'));
      const chevron = btn.querySelector('.sb-chevron');
      document.querySelectorAll('.sb-chevron').forEach(c => c.style.transform = '');
      if (!open && ch) { ch.classList.add('open'); if (chevron) chevron.style.transform = 'rotate(180deg)'; }
    };
  });
  document.querySelectorAll('.sb-kid[data-view]').forEach(b  => b.addEventListener('click', () => render(b.dataset.view)));
  document.querySelectorAll('.sb-item[data-view]').forEach(b => b.addEventListener('click', () => render(b.dataset.view)));

  // ── SYNC BUTTON ───────────────────────────────────
  document.getElementById('syncBtn')?.addEventListener('click', syncFromBackend);

  // ── AUTH UI ───────────────────────────────────────
  function updateUIForUser() {
    const user = AuthService.getUser();
    const avatarEl = document.getElementById('userAvatar');
    const nameEl   = document.getElementById('userDisplayName');
    const roleEl   = document.getElementById('userDisplayRole');
    const sbPill   = document.getElementById('sbPill');
    if (user?.name) {
      if (avatarEl) avatarEl.textContent = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      if (nameEl)   nameEl.textContent   = user.name;
      if (roleEl)   roleEl.textContent   = user.role || 'Agent';
      if (sbPill)   sbPill.innerHTML     = '<span class="pill p-green">● Logged in</span>';
    } else {
      if (avatarEl) avatarEl.textContent = 'GC';
      if (nameEl)   nameEl.textContent   = 'Not signed in';
      if (roleEl)   roleEl.textContent   = 'Click to sign in';
      if (sbPill)   sbPill.innerHTML     = '<span class="pill p-gray">Not logged in</span>';
    }
  }

  function showLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.style.display = 'flex';
    document.getElementById('loginEmail')?.focus();
  }
  function hideLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.style.display = 'none';
  }

  // ── USER MANAGEMENT ───────────────────────────────
  window.openUserMgmt = function () {
    const currentUser = AuthService.getUser();
    const allUsers = [currentUser, ...store.users.filter(u => u.id !== currentUser?.id)].filter(Boolean);
    showModal('userModal', `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="modal-title" style="margin:0">Team members</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" onclick="showAddUserForm()">+ Add user</button>
          <button class="btn btn-sm" onclick="AuthService.logout();updateUIForUser();removeModal('userModal');showToast('Logged out')">Log out</button>
          <button class="btn btn-sm" onclick="removeModal('userModal')">✕</button>
        </div>
      </div>
      <div id="userList">
        ${allUsers.map(u => `<div class="user-row">
          <div class="user-ava">${u.name.slice(0,2).toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name">${u.name} <span class="pill ${u.role==='Manager'?'p-red':'p-gray'}">${u.role||'Agent'}</span></div>
            <div class="user-email">${u.email||''}</div>
          </div>
          <div class="user-acts">
            ${u.id!==currentUser?.id?`<button class="btn btn-sm" onclick="editUserInline('${u.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Delete</button>`:'<span class="text-muted" style="font-size:11px">You</span>'}
          </div></div>`).join('')}
      </div>
      <div id="userFormArea" style="margin-top:12px"></div>`);
  };

  window.showAddUserForm = function () {
    const area = document.getElementById('userFormArea');
    if (!area) return;
    area.innerHTML = `<hr style="border:none;border-top:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px">New user</div>
      <div class="form-row"><div class="form-group"><label class="field-label">Name</label><input class="input" id="nu_name"></div><div class="form-group"><label class="field-label">Username</label><input class="input" id="nu_user"></div></div>
      <div class="form-row"><div class="form-group"><label class="field-label">Email</label><input class="input" id="nu_email" type="email"></div><div class="form-group"><label class="field-label">Password</label><input class="input" id="nu_pass" type="password"></div></div>
      <div class="form-group"><label class="field-label">Role</label><select class="select" id="nu_role"><option>Agent</option><option>Manager</option></select></div>
      <div id="nuErr" style="font-size:11px;color:var(--red);min-height:14px"></div>
      <div style="display:flex;gap:6px"><button class="btn" onclick="document.getElementById('userFormArea').innerHTML=''">Cancel</button><button class="btn btn-primary" onclick="saveNewUser()">Save</button></div>`;
  };

  window.saveNewUser = async function () {
    const name = document.getElementById('nu_name')?.value.trim();
    const email = document.getElementById('nu_email')?.value.trim();
    const pass  = document.getElementById('nu_pass')?.value;
    const err   = document.getElementById('nuErr');
    if (!name || !email || !pass) { if (err) err.textContent = 'All fields required.'; return; }
    const newUser = { id:'u_'+Date.now(), name, username: document.getElementById('nu_user')?.value.trim(), email, role: document.getElementById('nu_role')?.value, passwordHash: btoa(pass) };
    store.users.push(newUser); saveLocal();
    try { await ApiService.createUser(newUser); } catch (e) {}
    removeModal('userModal'); openUserMgmt(); showToast('User added');
  };

  window.editUserInline = function (id) {
    const u = store.users.find(x => x.id === id);
    if (!u) return;
    const area = document.getElementById('userFormArea');
    if (!area) return;
    area.innerHTML = `<hr style="border:none;border-top:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px">Edit: ${u.name}</div>
      <div class="form-row"><div class="form-group"><label class="field-label">Name</label><input class="input" id="eu_name" value="${u.name}"></div><div class="form-group"><label class="field-label">Email</label><input class="input" id="eu_email" value="${u.email||''}"></div></div>
      <div class="form-row"><div class="form-group"><label class="field-label">New password</label><input class="input" id="eu_pass" type="password" placeholder="Leave blank to keep"></div><div class="form-group"><label class="field-label">Role</label><select class="select" id="eu_role"><option${u.role==='Agent'?' selected':''}>Agent</option><option${u.role==='Manager'?' selected':''}>Manager</option></select></div></div>
      <div style="display:flex;gap:6px"><button class="btn" onclick="document.getElementById('userFormArea').innerHTML=''">Cancel</button><button class="btn btn-primary" onclick="updateUser('${id}')">Update</button></div>`;
  };

  window.updateUser = async function (id) {
    const u = store.users.find(x => x.id === id); if (!u) return;
    u.name  = document.getElementById('eu_name')?.value.trim() || u.name;
    u.email = document.getElementById('eu_email')?.value.trim() || u.email;
    u.role  = document.getElementById('eu_role')?.value || u.role;
    const np = document.getElementById('eu_pass')?.value;
    if (np) u.passwordHash = btoa(np);
    saveLocal();
    try { await ApiService.updateUser(id, u); } catch (e) {}
    removeModal('userModal'); openUserMgmt(); showToast('User updated');
  };

  window.deleteUser = async function (id) {
    if (!confirm('Delete this user?')) return;
    store.users = store.users.filter(u => u.id !== id); saveLocal();
    try { await ApiService.deleteUser(id); } catch (e) {}
    removeModal('userModal'); openUserMgmt(); showToast('User deleted');
  };

  window.updateUIForUser = updateUIForUser;

  // ── LOGIN ─────────────────────────────────────────
  document.getElementById('profileBtn')?.addEventListener('click', () => {
    AuthService.isAuthenticated() ? openUserMgmt() : showLoginModal();
  });
  document.getElementById('loginCancel')?.addEventListener('click',  hideLoginModal);
  document.getElementById('loginSubmit')?.addEventListener('click',  async () => {
    const email = document.getElementById('loginEmail')?.value.trim();
    const pw    = document.getElementById('loginPassword')?.value;
    const errEl = document.getElementById('loginError');
    if (!email || !pw) { if (errEl) errEl.textContent = 'Email and password required.'; return; }
    try {
      if (errEl) errEl.textContent = '';
      await AuthService.login(email, pw);
      hideLoginModal();
      updateUIForUser();
      await syncFromBackend();
      showToast('Welcome, ' + AuthService.getUser()?.name);
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    }
  });

  // Enter key on login form
  document.getElementById('loginPassword')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginSubmit')?.click(); });

  // ── CLOCK ─────────────────────────────────────────
  function tickClock() {
    const el = document.getElementById('liveClock');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ── KEYBOARD: ESC closes modals ───────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modals = ['agentModal','grPropModal','grRevModal','ticketModal','complaintModal','npsModal','proModal','userModal','loginModal'];
      modals.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
      hideLoginModal();
    }
  });

  // ── INIT ─────────────────────────────────────────
  loadLocal();
  if (AuthService.isAuthenticated()) {
    updateUIForUser();
    syncFromBackend();
  } else {
    updateUIForUser();
    render('overview');
    addThemeToggle();
  }

})();