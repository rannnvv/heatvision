let getLang = () => "id";
import("./i18n.js").then((m) => { getLang = m.getLang; }).catch(() => {});

const CONFIG = Object.freeze({
  defaultModelPath: "models/best.onnx",
  annotation: { lineWidth: 3, font: "600 14px Figtree, sans-serif", labels: true, keypoints: true },
  trendLength: 60,
  clearAfterMisses: 10,
  maxLog: 30,
});

let lib = null;
async function getLib() {
  if (lib) return lib;
  try {
    lib = await import("@ultralytics/yolo");
  } catch (error) {
    console.error("Library YOLO gagal dimuat:", error);
    throw new Error("library YOLO tidak bisa diunduh dari esm.sh. Periksa koneksi internet lalu muat ulang halaman.");
  }
  return lib;
}

const $ = (id) => document.getElementById(id);
const ids = ["webcam","image-preview","overlay","preview-stage","empty-state","status-indicator","status-text","model-state","device-state","preview-mode","preview-hint-text","model-path","model-file","model-file-label","load-model","start-camera","stop-camera","camera-facing","choose-image","image-file","clear-preview","confidence","confidence-value","detection-count","detection-badge","inference-time","fps-value","detection-list","risk-banner","risk-label","risk-sub","risk-score","needle","ack-alarm","snapshot","fullscreen","alert-conf","alert-conf-value","confirm-frames","confirm-frames-value","keywords","sound-toggle","vibrate-toggle","notify-toggle","autosnap-toggle","test-alarm","peak-conf","alert-count","uptime","trend","log-list","export-log","clear-log","clock"];
const el = Object.fromEntries(ids.map((i) => [i, $(i)]));

const state = {
  model: null, stream: null, running: false, frameRequest: 0, imageUrl: null, activeSource: null,
  lastFrameAt: 0, isLoading: false, risk: "idle", streak: 0, misses: 0, trend: [], peak: 0,
  alerts: 0, log: [], startedAt: 0, alarmTimer: 0, acked: false, audio: null, wakeLock: null,
};

const SETTINGS = ["confidence", "alert-conf", "confirm-frames", "keywords", "camera-facing"];
const TOGGLES = ["sound-toggle", "vibrate-toggle", "autosnap-toggle"];
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("heatvision") || "{}");
    for (const k of SETTINGS) if (s[k] !== undefined) el[k].value = s[k];
    for (const k of TOGGLES) if (s[k] !== undefined) el[k].checked = s[k];
  } catch {}
}
function saveSettings() {
  try {
    const s = {};
    for (const k of SETTINGS) s[k] = el[k].value;
    for (const k of TOGGLES) s[k] = el[k].checked;
    localStorage.setItem("heatvision", JSON.stringify(s));
  } catch {}
}
function syncReadouts() {
  el["confidence-value"].textContent = Number(el.confidence.value).toFixed(2);
  el["alert-conf-value"].textContent = Number(el["alert-conf"].value).toFixed(2);
  el["confirm-frames-value"].textContent = el["confirm-frames"].value;
}
const hazardWords = () => el.keywords.value.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const isHazard = (name) => { const n = String(name || "").toLowerCase(); return hazardWords().some((w) => n.includes(w)); };

function setStatus(message, type = "idle") {
  el["status-text"].textContent = message;
  el["status-indicator"].className = "dot" + (type === "ready" || type === "running" ? " is-ready" : type === "loading" ? " is-loading" : type === "error" ? " is-error" : "");
}
function setPreviewMode(label, live = false) {
  el["preview-mode"].replaceChildren(document.createElement("span"), document.createTextNode(` ${label}`));
  el["preview-mode"].classList.toggle("is-live", live);
}
function setStageAspect(w, h) { if (w > 0 && h > 0) el["preview-stage"].style.aspectRatio = `${w} / ${h}`; }
function showSource(type) {
  state.activeSource = type;
  el.webcam.classList.toggle("is-visible", type === "camera");
  el["image-preview"].classList.toggle("is-visible", type === "image");
  el.overlay.classList.toggle("is-visible", type !== null);
  el["empty-state"].hidden = type !== null;
  el.snapshot.disabled = type === null;
  if (type === null) { el.overlay.width = 0; el.overlay.height = 0; el["preview-stage"].style.aspectRatio = "4 / 3"; }
}
const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function beep() {
  if (!el["sound-toggle"].checked) return;
  try {
    state.audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = state.audio, now = ctx.currentTime;
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.2 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.2 + 0.18);
      o.connect(g).connect(ctx.destination); o.start(now + i * 0.2); o.stop(now + i * 0.2 + 0.2);
    });
  } catch {}
  if (el["vibrate-toggle"].checked && navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
function startAlarm() {
  stopAlarm(); state.acked = false; el["ack-alarm"].hidden = false;
  beep(); state.alarmTimer = setInterval(() => { if (!state.acked) beep(); }, 1200);
}
function stopAlarm() { clearInterval(state.alarmTimer); state.alarmTimer = 0; el["ack-alarm"].hidden = true; navigator.vibrate?.(0); }

function captureFrame(maxWidth = 0) {
  const src = state.activeSource === "camera" ? el.webcam : state.activeSource === "image" ? el["image-preview"] : null;
  if (!src) return null;
  const w = src.videoWidth || src.naturalWidth, h = src.videoHeight || src.naturalHeight;
  if (!w || !h) return null;
  const scale = maxWidth ? Math.min(1, maxWidth / w) : 1;
  const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext("2d"); g.drawImage(src, 0, 0, c.width, c.height);
  if (el.overlay.width) g.drawImage(el.overlay, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
function download(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const RISK_TEXT = {
  idle: ["Siaga", "Muat model lalu nyalakan kamera untuk mulai memantau."],
  safe: ["Aman", "Tidak ada asap atau api terdeteksi."],
  warn: ["Waspada", "Ada indikasi asap atau api. Menunggu konfirmasi beberapa frame."],
  danger: ["Bahaya", "Asap atau api terkonfirmasi. Periksa lokasi sekarang."],
};
function setRisk(level, pct = 0, detail = "") {
  const prev = state.risk;
  state.risk = level;
  document.body.dataset.risk = level;
  el["risk-label"].textContent = RISK_TEXT[level][0];
  el["risk-sub"].textContent = detail || RISK_TEXT[level][1];
  el["risk-score"].textContent = Math.round(pct);
  el.needle.style.left = `${Math.min(100, Math.max(0, pct))}%`;
  if (level === "danger" && prev !== "danger") onDanger(pct, detail);
  if (prev === "danger" && level !== "danger") stopAlarm();
}
function onDanger(pct, name) {
  state.alerts++; el["alert-count"].textContent = state.alerts;
  const full = el["autosnap-toggle"].checked ? captureFrame() : null;
  const thumb = full ? captureFrame(160) : null;
  state.log.unshift({ time: new Date(), conf: pct, name: name || "asap/api", thumb, full });
  state.log.length = Math.min(state.log.length, CONFIG.maxLog);
  renderLog(); startAlarm();
  if (el["notify-toggle"].checked && "Notification" in window && Notification.permission === "granted") {
    new Notification((getLang() === "en" ? "HeatVision: danger" : "HeatVision: bahaya"), { body: `${getLang() === "en" ? "Detected" : "Terdeteksi"} ${name || "smoke/fire"} (${Math.round(pct)}%)` });
  }
}
function evaluate(boxes) {
  const detThr = Number(el.confidence.value), alertThr = Number(el["alert-conf"].value), need = Number(el["confirm-frames"].value);
  const hz = boxes.filter((b) => isHazard(b.name) && (b.conf ?? 0) >= detThr).sort((a, b) => b.conf - a.conf);
  const top = hz[0], pct = top ? top.conf * 100 : 0;
  state.trend.push(pct); if (state.trend.length > CONFIG.trendLength) state.trend.shift();
  drawTrend();
  if (pct > state.peak) { state.peak = pct; el["peak-conf"].textContent = pct.toFixed(0); }
  if (top && top.conf >= alertThr) { state.streak++; state.misses = 0; } else { state.streak = 0; state.misses++; }
  if (state.streak >= need) return setRisk("danger", pct, `${top.name} terdeteksi dengan keyakinan ${pct.toFixed(0)}%.`);
  if (state.risk === "danger" && state.misses < CONFIG.clearAfterMisses) return setRisk("danger", pct, el["risk-sub"].textContent);
  if (top) return setRisk("warn", pct, `${top.name} terdeteksi (${pct.toFixed(0)}%). Konfirmasi ${state.streak}/${need} frame.`);
  setRisk("safe", 0);
}

function drawTrend() {
  const c = el.trend, dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const thr = Number(el["alert-conf"].value) * 100, y = (v) => h - 6 - (v / 100) * (h - 12);
  g.strokeStyle = "rgba(255,61,110,.55)"; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(0, y(thr)); g.lineTo(w, y(thr)); g.stroke(); g.setLineDash([]);
  const t = state.trend; if (t.length < 2) return;
  const step = w / (CONFIG.trendLength - 1), x0 = w - (t.length - 1) * step;
  const grad = g.createLinearGradient(0, h, 0, 0); grad.addColorStop(0, "#5fd0e8"); grad.addColorStop(.6, "#ff7a2f"); grad.addColorStop(1, "#ff3d6e");
  g.beginPath(); t.forEach((v, i) => (i ? g.lineTo(x0 + i * step, y(v)) : g.moveTo(x0, y(v))));
  g.strokeStyle = grad; g.lineWidth = 2.5; g.lineJoin = "round"; g.stroke();
  g.lineTo(w, h); g.lineTo(x0, h); g.closePath(); g.globalAlpha = .18; g.fillStyle = grad; g.fill(); g.globalAlpha = 1;
}

function renderLog() {
  el["log-list"].replaceChildren();
  if (!state.log.length) { const e = document.createElement("div"); e.className = "empty-row"; e.textContent = "Belum ada kejadian tercatat."; el["log-list"].append(e); return; }
  for (const ev of state.log) {
    const row = document.createElement("div"); row.className = "lrow";
    if (ev.thumb) { const im = document.createElement("img"); im.src = ev.thumb; im.alt = "Bukti kejadian"; row.append(im); }
    const info = document.createElement("div"); info.className = "info";
    const b = document.createElement("b"); b.textContent = `${ev.name} · ${ev.conf.toFixed(0)}%`;
    const s = document.createElement("small"); s.textContent = `${ev.time.toLocaleDateString(getLang() === "en" ? "en-US" : "id-ID")} ${fmtTime(ev.time)}`;
    info.append(b, s); row.append(info);
    if (ev.full) { const a = document.createElement("a"); a.href = ev.full; a.download = `heatvision-${stamp()}.jpg`; a.textContent = "Unduh"; row.append(a); }
    el["log-list"].append(row);
  }
}
function exportCsv() {
  if (!state.log.length) { setStatus("Belum ada kejadian untuk diekspor.", "error"); return; }
  const rows = ["waktu,objek,keyakinan_persen", ...state.log.map((e) => `${e.time.toISOString()},${String(e.name).replaceAll(",", " ")},${e.conf.toFixed(1)}`)];
  download(URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" })), `heatvision-log-${stamp()}.csv`);
}

function emptyList(message) {
  el["detection-list"].replaceChildren();
  const e = document.createElement("div"); e.className = "empty-row"; e.textContent = message; el["detection-list"].append(e);
}
function clearDetections(message = "Hasil prediksi akan muncul di sini.") {
  el["detection-count"].textContent = "—"; el["detection-badge"].textContent = "0";
  el["inference-time"].textContent = "—"; el["fps-value"].textContent = "—"; emptyList(message);
}
function updateDetections(results, frameTime = null) {
  const boxes = Array.isArray(results?.boxes) ? results.boxes : [];
  el["detection-count"].textContent = String(boxes.length); el["detection-badge"].textContent = String(boxes.length);
  const inf = results?.speed?.inference;
  el["inference-time"].textContent = Number.isFinite(inf) ? inf.toFixed(1) : "—";
  if (frameTime !== null && state.lastFrameAt > 0) { const d = frameTime - state.lastFrameAt; if (d > 0) el["fps-value"].textContent = (1000 / d).toFixed(1); }
  if (frameTime !== null) state.lastFrameAt = frameTime;
  if (!boxes.length) return emptyList("Tidak ada objek di atas ambang deteksi.");
  el["detection-list"].replaceChildren();
  for (const box of [...boxes].sort((a, b) => (b.conf ?? 0) - (a.conf ?? 0))) {
    const row = document.createElement("div"); row.className = "drow" + (isHazard(box.name) ? " hazard" : "");
    const sw = document.createElement("span"); sw.className = "sw"; if (typeof box.color === "string") sw.style.setProperty("--c", box.color);
    const info = document.createElement("div"); info.className = "info";
    const n = document.createElement("b"); n.textContent = box.name || `Kelas ${box.cls ?? "?"}`;
    const m = document.createElement("small"); m.textContent = isHazard(box.name) ? "Kelas berbahaya" : `Kelas ${box.cls ?? "—"}`;
    info.append(n, m);
    const sc = document.createElement("span"); sc.className = "sc"; sc.textContent = Number.isFinite(box.conf) ? `${(box.conf * 100).toFixed(1)}%` : "—";
    row.append(sw, info, sc); el["detection-list"].append(row);
  }
}
const predictOptions = () => ({ conf: Number(el.confidence.value) });

async function loadModel() {
  if (state.isLoading) return;
  state.isLoading = true; el["load-model"].disabled = true; el["load-model"].textContent = "Memuat model…";
  setStatus("Memuat model dan menyiapkan runtime…", "loading"); el["model-state"].textContent = "Memuat model";
  try {
    const file = el["model-file"].files?.[0];
    const path = el["model-path"].value.trim() || CONFIG.defaultModelPath;
    const src = file || new URL(path.replace(/^\.\//, ""), import.meta.url).href;
    const { YOLO } = await getLib();
    state.model = await YOLO.load(src, { device: "auto" });
    el["model-state"].textContent = "Model siap";
    el["device-state"].textContent = `Perangkat ${String(state.model.device || "auto").toUpperCase()}`;
    el["start-camera"].disabled = false; el["choose-image"].disabled = false;
    el["load-model"].textContent = "Muat ulang model";
    setStatus("Model siap. Mulai pantau dengan kamera atau uji sebuah gambar.", "ready");
    el["preview-hint-text"].textContent = "Model termuat. Pilih kamera atau gambar untuk memulai.";
    saveSettings();
  } catch (error) {
    console.error("Gagal memuat model:", error);
    el["model-state"].textContent = "Model gagal";
    setStatus(error?.message ? `Gagal memuat model: ${error.message}` : "Gagal memuat model. Periksa file model lalu coba lagi.", "error");
    el["load-model"].textContent = "Muat model";
  } finally { state.isLoading = false; el["load-model"].disabled = false; }
}

async function lockScreen(on) {
  try {
    if (on && "wakeLock" in navigator) state.wakeLock = await navigator.wakeLock.request("screen");
    else { await state.wakeLock?.release(); state.wakeLock = null; }
  } catch {}
}
function stopCamera({ keepPreview = false } = {}) {
  state.running = false; cancelAnimationFrame(state.frameRequest); state.frameRequest = 0;
  state.stream?.getTracks().forEach((t) => t.stop()); state.stream = null;
  el.webcam.pause(); el.webcam.srcObject = null;
  el["stop-camera"].disabled = true; el["start-camera"].disabled = !state.model;
  lockScreen(false);
  if (!keepPreview && state.activeSource === "camera") { showSource(null); setPreviewMode("Standby"); }
  if (!keepPreview) { stopAlarm(); setRisk("idle", 0); }
}
async function startCamera() {
  if (!state.model) return setStatus("Muat model sebelum menyalakan kamera.", "error");
  if (!navigator.mediaDevices?.getUserMedia) return setStatus("Kamera tidak tersedia. Gunakan HTTPS atau localhost, atau uji dengan gambar.", "error");
  state.audio ??= new (window.AudioContext || window.webkitAudioContext)(); state.audio.resume?.();
  stopCamera({ keepPreview: true });
  if (state.imageUrl) { URL.revokeObjectURL(state.imageUrl); state.imageUrl = null; }
  try {
    setStatus("Meminta izin kamera…", "loading");
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: el["camera-facing"].value }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    el.webcam.srcObject = state.stream; await el.webcam.play();
    setStageAspect(el.webcam.videoWidth, el.webcam.videoHeight); showSource("camera");
    state.running = true; state.lastFrameAt = 0; state.startedAt = Date.now(); state.streak = 0; state.misses = 0; state.trend = [];
    el["stop-camera"].disabled = false; el["start-camera"].disabled = true;
    el["preview-hint-text"].textContent = "Frame diproses lokal di browser ini.";
    setPreviewMode("Kamera aktif", true); setStatus("Pemantauan berjalan…", "running");
    clearDetections("Menunggu prediksi pertama…"); setRisk("safe", 0); lockScreen(true); runCameraLoop();
  } catch (error) {
    console.error("Kamera gagal:", error); stopCamera({ keepPreview: true });
    setStatus(error?.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan akses kamera atau uji dengan gambar." : `Kamera tidak bisa dinyalakan: ${error?.message || "kesalahan tidak diketahui"}`, "error");
    setPreviewMode("Kamera error");
  }
}
async function runCameraLoop() {
  if (!state.running || !state.model) return;
  try {
    const results = await state.model.predict(el.webcam, predictOptions());
    await lib.annotate(el.overlay, el.webcam, results, CONFIG.annotation);
    updateDetections(results, performance.now());
    evaluate(Array.isArray(results?.boxes) ? results.boxes : []);
  } catch (error) {
    console.error("Inferensi gagal:", error); stopCamera(); setStatus(`Inferensi berhenti: ${error?.message || "kesalahan tidak diketahui"}`, "error"); return;
  }
  if (state.running) state.frameRequest = requestAnimationFrame(runCameraLoop);
}
function clearPreview() {
  stopCamera({ keepPreview: true });
  if (state.imageUrl) { URL.revokeObjectURL(state.imageUrl); state.imageUrl = null; }
  el["image-preview"].removeAttribute("src"); showSource(null); setPreviewMode("Standby");
  el["preview-hint-text"].textContent = state.model ? "Model termuat. Pilih kamera atau gambar untuk memulai." : "Semua pemrosesan berjalan di browser Anda.";
  clearDetections(); stopAlarm(); setRisk("idle", 0);
  setStatus(state.model ? "Model siap. Menunggu input." : "Menunggu model dimuat", state.model ? "ready" : "idle");
}
async function analyzeImage(file) {
  if (!file || !state.model) return;
  if (!file.type.startsWith("image/")) return setStatus("Pilih file gambar yang didukung.", "error");
  stopCamera({ keepPreview: true });
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = URL.createObjectURL(file);
  clearDetections("Menganalisis gambar…"); setStatus("Memuat gambar…", "loading"); setPreviewMode("Uji gambar");
  el["preview-hint-text"].textContent = `Gambar lokal: ${file.name}`;
  const image = new Image(); image.decoding = "async";
  image.onload = async () => {
    try {
      el["image-preview"].src = state.imageUrl; setStageAspect(image.naturalWidth, image.naturalHeight); showSource("image");
      const results = await state.model.predict(image, predictOptions());
      await lib.annotate(el.overlay, image, results, CONFIG.annotation);
      updateDetections(results);
      state.streak = Number(el["confirm-frames"].value) - 1; evaluate(Array.isArray(results?.boxes) ? results.boxes : []);
      setStatus("Analisis gambar selesai.", "ready");
    } catch (error) { console.error(error); setStatus(`Inferensi gambar gagal: ${error?.message || "kesalahan tidak diketahui"}`, "error"); clearDetections("Inferensi gambar gagal."); }
  };
  image.onerror = () => setStatus("Gambar tidak dapat dibaca oleh browser ini.", "error");
  image.src = state.imageUrl;
}

el["load-model"].addEventListener("click", loadModel);
el["start-camera"].addEventListener("click", startCamera);
el["stop-camera"].addEventListener("click", () => { stopCamera(); setStatus("Kamera dihentikan. Model tetap dimuat.", "ready"); el["preview-hint-text"].textContent = "Kamera mati. Model siap untuk input lain."; });
el["clear-preview"].addEventListener("click", clearPreview);
el["choose-image"].addEventListener("click", () => el["image-file"].click());
el["image-file"].addEventListener("change", (e) => { const f = e.target.files?.[0]; if (f) analyzeImage(f); e.target.value = ""; });
el["model-file"].addEventListener("change", (e) => { el["model-file-label"].textContent = e.target.files?.[0]?.name ?? "Pilih file .onnx"; });
el["camera-facing"].addEventListener("change", () => { saveSettings(); if (state.running) startCamera(); });
for (const k of ["confidence", "alert-conf", "confirm-frames"]) el[k].addEventListener("input", () => { syncReadouts(); saveSettings(); drawTrend(); });
for (const k of ["keywords", ...TOGGLES]) el[k].addEventListener("change", saveSettings);
el["notify-toggle"].addEventListener("change", async () => {
  if (!el["notify-toggle"].checked) return;
  if (!("Notification" in window)) { el["notify-toggle"].checked = false; return setStatus("Browser ini tidak mendukung notifikasi.", "error"); }
  if ((await Notification.requestPermission()) !== "granted") { el["notify-toggle"].checked = false; setStatus("Izin notifikasi ditolak.", "error"); }
});
el["test-alarm"].addEventListener("click", () => { state.audio ??= new (window.AudioContext || window.webkitAudioContext)(); state.audio.resume?.(); beep(); });
el["ack-alarm"].addEventListener("click", () => { state.acked = true; stopAlarm(); });
el.snapshot.addEventListener("click", () => { const u = captureFrame(); if (u) download(u, `heatvision-${stamp()}.jpg`); });
el.fullscreen.addEventListener("click", () => { document.fullscreenElement ? document.exitFullscreen() : el["preview-stage"].requestFullscreen?.(); });
el["export-log"].addEventListener("click", exportCsv);
el["clear-log"].addEventListener("click", () => { state.log = []; state.alerts = 0; state.peak = 0; el["alert-count"].textContent = "0"; el["peak-conf"].textContent = "—"; renderLog(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && state.running) lockScreen(true); });
addEventListener("resize", drawTrend);
addEventListener("hv-lang", () => { renderLog(); drawTrend(); });

setInterval(() => {
  el.clock.textContent = fmtTime(new Date());
  if (state.running) { const s = Math.floor((Date.now() - state.startedAt) / 1000); el.uptime.textContent = s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
}, 1000);

loadSettings(); syncReadouts(); clearDetections(); renderLog(); drawTrend(); setRisk("idle", 0);
