
import { buildURI, downloadFile, osProfile, qs, applyQS, tryRun } from "./helpers.js";

const state = {
  templates: [],
  filteredTemplates: [],
  actions: [],
  shortcuts: [],
};

async function loadTemplates() {
  const res = await fetch("data/templates.json");
  const templates = await res.json();
  state.templates = templates;
  const os = osProfile();

  // Build actions list from templates
  const actions = [...new Set(templates.map(t => t.action))].sort();
  state.actions = actions;

  // Filter by OS if template lists platforms
  state.filteredTemplates = templates.filter(t => {
    if (!t.platforms || !t.platforms.length) return true;
    return t.platforms.includes(os) || t.platforms.includes("any");
  });

  renderActions();
  renderTemplates();
  restoreShortcuts();
  applyQSParams();
  rebuild();
}

function el(id) { return document.getElementById(id); }

function renderActions() {
  const sel = el("actionSelect");
  sel.innerHTML = state.actions.map(a => `<option value="${a}">${a}</option>`).join("");
  sel.addEventListener("change", () => {
    renderTemplates();
    rebuild();
    updatePermalink();
  });
}

function renderTemplates() {
  const action = el("actionSelect").value || state.actions[0];
  const sel = el("templateSelect");
  const options = state.filteredTemplates
    .filter(t => t.action === action)
    .map(t => `<option value="${t.id}">${t.name}</option>`)
    .join("");
  sel.innerHTML = options;

  sel.onchange = () => {
    showTemplateInfo();
    rebuild();
    updatePermalink();
  };

  showTemplateInfo();
}

function getSelectedTemplate() {
  const id = el("templateSelect").value;
  const tpl = state.filteredTemplates.find(t => t.id === id) || state.templates.find(t => t.id === id);
  return tpl || null;
}

function showTemplateInfo() {
  const tpl = getSelectedTemplate();
  const info = el("templateInfo");
  if (!tpl) { info.textContent = "Ingen mal valgt."; return; }
  info.innerHTML = `
    <div><strong>${tpl.name}</strong></div>
    <div>${tpl.description || ""}</div>
    <div><small>URI‑mal:</small> <code>${tpl.uri}</code></div>
    ${tpl.fallback ? `<div><small>Fallback:</small> <code>${tpl.fallback}</code></div>` : ""}
  `;
}

function collectedValues() {
  return {
    payload: el("payload").value.trim(),
    subject: el("subject").value,
    body: el("body").value,
    cc: el("cc").value,
    bcc: el("bcc").value,
    query: el("query").value,
    lat: el("lat").value,
    lng: el("lng").value,
    label: el("label").value,
  };
}

function activeTemplateForBuild() {
  const base = getSelectedTemplate();
  const custom = el("customScheme").value.trim();
  const name = el("customName").value.trim();
  if (!custom) return base;
  // If a custom scheme is provided, create an ad-hoc template
  return {
    id: "custom",
    name: name || "Custom",
    action: base ? base.action : "Custom",
    uri: custom,
    description: "Egendefinert schema",
    platforms: ["any"]
  };
}

function rebuild() {
  const encodeParams = el("encodeParams").checked;
  const tpl = activeTemplateForBuild();
  if (!tpl) { el("builtUri").value = ""; return; }
  const uri = buildURI(tpl, collectedValues(), encodeParams);
  el("builtUri").value = uri;

  const hint = el("hint");
  if (!uri) {
    hint.textContent = "Fyll inn felter for å bygge en gyldig URI.";
  } else {
    hint.textContent = "Kjør-knappen forsøker å åpne appen i samme fane for å unngå popup-blokkering.";
  }
}

function copyBuilt() {
  const v = el("builtUri").value;
  if (!v) return;
  navigator.clipboard.writeText(v);
}

function runBuilt() {
  const v = el("builtUri").value;
  if (!v) return;
  tryRun(v);
}

function updatePermalink() {
  const params = {
    action: el("actionSelect").value,
    template: el("templateSelect").value,
    customName: el("customName").value,
    customScheme: el("customScheme").value,
    encode: el("encodeParams").checked ? "1" : "0",
    autorun: el("autorun").checked ? "1" : "0",
    ...collectedValues(),
  };
  const link = applyQS(params);
  el("permalink").value = link;
}

function copyPermalink() {
  const v = el("permalink").value;
  if (!v) return;
  navigator.clipboard.writeText(v);
}

function applyQSParams() {
  const p = qs();
  const set = (id, val) => { if (val !== undefined) el(id).value = val; };

  if (p.action) {
    const idx = state.actions.indexOf(p.action);
    if (idx >= 0) el("actionSelect").value = p.action;
  }
  renderTemplates();
  if (p.template && el("templateSelect").querySelector(`option[value="${p.template}"]`)) {
    el("templateSelect").value = p.template;
  }

  set("customName", p.customName);
  set("customScheme", p.customScheme);
  set("payload", p.payload);
  set("subject", p.subject);
  set("body", p.body);
  set("cc", p.cc);
  set("bcc", p.bcc);
  set("query", p.query);
  set("lat", p.lat);
  set("lng", p.lng);
  set("label", p.label);

  if (p.encode === "0") el("encodeParams").checked = false;
  if (p.autorun === "1") el("autorun").checked = true;

  rebuild();
  updatePermalink();

  if (el("autorun").checked && p.autorun === "1") {
    // autorun only if a user gesture has happened before? Browsers vary;
    // here we attempt after a minimal delay.
    const uri = el("builtUri").value;
    if (uri) setTimeout(() => tryRun(uri), 250);
  }
}

// --------- Shortcuts ---------
function restoreShortcuts() {
  try {
    state.shortcuts = JSON.parse(localStorage.getItem("uv_shortcuts") || "[]");
  } catch (_) { state.shortcuts = []; }
  renderShortcuts();
}

function persistShortcuts() {
  localStorage.setItem("uv_shortcuts", JSON.stringify(state.shortcuts));
}

function addShortcut() {
  const tpl = activeTemplateForBuild();
  if (!tpl) return;
  const values = collectedValues();
  const name = (el("customName").value.trim()) || tpl.name || "Shortcut";

  state.shortcuts.push({
    name,
    templateId: tpl.id,
    templateUri: tpl.uri, // snapshot custom or base
    action: tpl.action,
    values,
    encodeParams: el("encodeParams").checked
  });
  persistShortcuts();
  renderShortcuts();
}

function clearShortcuts() {
  state.shortcuts = [];
  persistShortcuts();
  renderShortcuts();
}

function renderShortcuts() {
  const box = document.getElementById("shortcuts");
  if (!state.shortcuts.length) {
    box.innerHTML = `<div class="muted">Ingen snarveier enda. Lag én med “Legg til …”.</div>`;
    return;
  }
  box.innerHTML = "";
  state.shortcuts.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "shortcut";
    div.innerHTML = `
      <span class="shortcut-name">${s.name}</span>
      <small>(${s.action})</small>
      <button data-i="${i}" data-cmd="run">Kjør</button>
      <button data-i="${i}" data-cmd="copy">Kopier URI</button>
      <button data-i="${i}" data-cmd="del">Slett</button>
    `;
    div.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const idx = Number(btn.dataset.i);
      const item = state.shortcuts[idx];
      if (!item) return;

      if (btn.dataset.cmd === "run") {
        const uri = buildURI({ uri: item.templateUri }, item.values, item.encodeParams);
        tryRun(uri);
      } else if (btn.dataset.cmd === "copy") {
        const uri = buildURI({ uri: item.templateUri }, item.values, item.encodeParams);
        navigator.clipboard.writeText(uri);
      } else if (btn.dataset.cmd === "del") {
        state.shortcuts.splice(idx, 1);
        persistShortcuts();
        renderShortcuts();
      }
    });
    box.appendChild(div);
  });
}

// --------- Export ---------
function exportHTML() {
  if (!state.shortcuts.length) {
    alert("Lag minst én snarvei før eksport.");
    return;
  }
  const mode = document.querySelector('input[name="exportMode"]:checked').value;

  const exported = generateExportPage(state.shortcuts, mode);
  const fileName = `uri-verksted-export-${Date.now()}.html`;
  const banner = "<!-- Generert av URI‑Verksted -->\n";
  const content = banner + exported;
  downloadFile(fileName, content);
}

function generateExportPage(shortcuts, mode) {
  const now = new Date().toISOString();
  const items = JSON.stringify(shortcuts);

  // Minimal self-contained page
  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Launcher</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#111826; color:#f2f4f8; margin:0; padding:20px; }
    h1 { font-size:20px; margin:0 0 12px; }
    .card { background:#151a2c; border:1px solid #252b43; border-radius:12px; padding:16px; margin-bottom:12px; }
    .grid { display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); }
    label { display:grid; gap:6px; }
    input, select, button { padding:10px; border-radius:10px; border:1px solid #252b43; background:#0f1220; color:#f2f4f8; }
    button { background:#FFCD00; color:#1a1a1a; border:none; font-weight:700; }
    .item { display:flex; gap:8px; align-items:center; justify-content:space-between; padding:10px; border:1px solid #252b43; border-radius:10px; }
    .name { font-weight:700; }
    small { color:#a4adbf; }
  </style>
</head>
<body>
  <h1>Launcher</h1>
  <div class="card">
    <div>Generert: ${now}</div>
    ${mode === "editable" ? `
    <div class="grid" style="margin-top:10px;">
      <label>Payload <input id="payload" type="text" placeholder="telefon, e‑post, søk, ..." /></label>
      <label>Subject <input id="subject" type="text" /></label>
      <label>Body <input id="body" type="text" /></label>
      <label>CC <input id="cc" type="text" /></label>
      <label>BCC <input id="bcc" type="text" /></label>
      <label>Query <input id="query" type="text" /></label>
      <label>Lat <input id="lat" type="text" /></label>
      <label>Lng <input id="lng" type="text" /></label>
      <label>Label <input id="label" type="text" /></label>
      <label class="checkbox"><input id="encode" type="checkbox" checked /> URL‑encode parametere</label>
    </div>` : `<div style="margin-top:8px;"><small>Fastlåste verdier baked inn.</small></div>`}
  </div>

  <div id="list" class="grid"></div>

  <script>
    const shortcuts = ${items};
    const mode = ${JSON.stringify(mode)};

    function enc(v){return encodeURIComponent(v||"");}
    function buildURI(tplUri, values, encodeParams=true){
      const e = (x)=> encodeParams? enc(String(x)): String(x||"");
      return String(tplUri||"")
        .replaceAll("{payload}", e(values.payload))
        .replaceAll("{subject}", e(values.subject))
        .replaceAll("{body}", e(values.body))
        .replaceAll("{cc}", e(values.cc))
        .replaceAll("{bcc}", e(values.bcc))
        .replaceAll("{query}", e(values.query))
        .replaceAll("{lat}", e(values.lat))
        .replaceAll("{lng}", e(values.lng))
        .replaceAll("{label}", e(values.label));
    }
    function run(uri){ if(!uri) return; window.location.href = uri; }

    function values() {
      if (mode !== "editable") return {}; // will be ignored; fixed snapshot
      return {
        payload: document.getElementById("payload").value,
        subject: document.getElementById("subject").value,
        body: document.getElementById("body").value,
        cc: document.getElementById("cc").value,
        bcc: document.getElementById("bcc").value,
        query: document.getElementById("query").value,
        lat: document.getElementById("lat").value,
        lng: document.getElementById("lng").value,
        label: document.getElementById("label").value,
      };
    }

    function render(){
      const list = document.getElementById("list");
      list.innerHTML = "";
      shortcuts.forEach((s,i)=>{
        const div = document.createElement("div");
        div.className = "item";
        const btn = document.createElement("button");
        btn.textContent = "Åpne";
        btn.onclick = ()=>{
          const vals = (mode === "editable") ? { ...s.values, ...values() } : s.values;
          const uri = buildURI(s.templateUri, vals, s.encodeParams);
          run(uri);
        };
        const left = document.createElement("div");
        left.innerHTML = \`<div class="name">\${s.name}</div><small>\${s.action}</small>\`;
        div.appendChild(left);
        div.appendChild(btn);
        list.appendChild(div);
      });
    }

    render();
  </script>
</body>
</html>`;
}

// ---------- Wire UI ----------
function wire() {
  ["payload","subject","body","cc","bcc","query","lat","lng","label",
   "customName","customScheme","encodeParams","autorun"].forEach(id => {
    const n = el(id);
    if (!n) return;
    n.addEventListener("input", () => { rebuild(); updatePermalink(); });
    n.addEventListener("change", () => { rebuild(); updatePermalink(); });
  });

  el("copyBtn").onclick = copyBuilt;
  el("runBtn").onclick = runBuilt;
  el("copyPermalinkBtn").onclick = copyPermalink;
  el("addShortcutBtn").onclick = addShortcut;
  el("clearShortcutsBtn").onclick = clearShortcuts;
  el("exportBtn").onclick = exportHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  wire();
  loadTemplates();
});
