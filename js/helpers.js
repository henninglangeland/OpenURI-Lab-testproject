
// Simple helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function encode(v) { return encodeURIComponent(v || ""); }

export function buildURI(tpl, values, encodeParams = true) {
  let uri = (tpl && tpl.uri) ? tpl.uri : "";
  if (!uri) return "";

  // Merge defaults
  const v = {
    payload: values.payload || "",
    subject: values.subject || "",
    body: values.body || "",
    cc: values.cc || "",
    bcc: values.bcc || "",
    query: values.query || "",
    lat: values.lat || "",
    lng: values.lng || "",
    label: values.label || ""
  };

  const enc = (x) => encodeParams ? encode(String(x)) : String(x || "");

  // Replace well-known placeholders
  uri = uri
    .replaceAll("{payload}", enc(v.payload))
    .replaceAll("{subject}", enc(v.subject))
    .replaceAll("{body}", enc(v.body))
    .replaceAll("{cc}", enc(v.cc))
    .replaceAll("{bcc}", enc(v.bcc))
    .replaceAll("{query}", enc(v.query))
    .replaceAll("{lat}", enc(v.lat))
    .replaceAll("{lng}", enc(v.lng))
    .replaceAll("{label}", enc(v.label));

  return uri;
}

export function downloadFile(filename, contents) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

export function osProfile() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/windows/i.test(ua)) return "windows";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod|ios/i.test(ua)) return "ios";
  if (/macintosh|mac os x/i.test(ua)) return "mac";
  return "web";
}

export function qs() {
  const p = new URLSearchParams(location.search);
  const o = {};
  for (const [k,v] of p) o[k] = v;
  return o;
}

export function applyQS(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k,v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  return url;
}

export function tryRun(uri) {
  if (!uri) return;
  // Prefer same-tab navigation to avoid popup-blockers
  window.location.href = uri;
}
