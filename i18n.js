const EN = {
  "HeatVision — Deteksi Asap Real-time": "HeatVision — Real-time Smoke Detection",
  "HeatVision beranda": "HeatVision home", "Simpan tangkapan layar": "Save screenshot", "Layar penuh": "Fullscreen",
  "Bersihkan pratinjau": "Clear preview", "Pratinjau kamera": "Camera preview", "Gambar yang diuji": "Tested image", "Metrik": "Metrics",
  "Bahasa": "Language", "Ganti tema": "Toggle theme", "Bukti kejadian": "Event evidence",
  "Model belum dimuat": "Model not loaded", "Model siap": "Model ready", "Memuat model": "Loading model", "Model gagal": "Model failed",
  "Siaga": "Standby", "Aman": "Safe", "Waspada": "Caution", "Bahaya": "Danger",
  "Muat model lalu nyalakan kamera untuk mulai memantau.": "Load a model, then turn on the camera to start monitoring.",
  "Tidak ada asap atau api terdeteksi.": "No smoke or fire detected.",
  "Ada indikasi asap atau api. Menunggu konfirmasi beberapa frame.": "Possible smoke or fire. Waiting for confirmation over several frames.",
  "Asap atau api terkonfirmasi. Periksa lokasi sekarang.": "Smoke or fire confirmed. Check the location now.",
  "Matikan alarm": "Silence alarm", "% tingkat risiko": "% risk level", "Menunggu model dimuat": "Waiting for the model to load",
  "Pantauan langsung": "Live monitor", "Belum ada gambar": "No image yet",
  "Muat model, lalu nyalakan kamera atau unggah gambar uji.": "Load a model, then turn on the camera or upload a test image.",
  "Semua pemrosesan berjalan di browser Anda. Tidak ada gambar yang dikirim keluar.": "All processing runs in your browser. No images leave your device.",
  "Semua pemrosesan berjalan di browser Anda.": "All processing runs in your browser.",
  "Hentikan kamera": "Stop camera", "Mulai pantau": "Start monitoring",
  "Objek terdeteksi": "Objects detected", "Inferensi": "Inference", "Kecepatan": "Speed", "Puncak keyakinan": "Peak confidence",
  "Total peringatan": "Total alerts", "Waktu pantau": "Uptime", "Tren risiko (60 frame terakhir)": "Risk trend (last 60 frames)",
  "Lokasi model default": "Default model path", "Folder model:": "Model folder:",
  ". Atau pilih file lokal. Isi dengan model ONNX hasil latihan asap/api.": ". Or choose a local file. Use an ONNX model trained for smoke/fire.",
  "Pakai model lain (opsional)": "Use another model (optional)", "Pilih file .onnx": "Choose .onnx file",
  "Muat model": "Load model", "Muat ulang model": "Reload model", "Memuat model…": "Loading model…",
  "Sensitivitas": "Sensitivity", "Ambang deteksi": "Detection threshold", "Ambang alarm": "Alarm threshold",
  "Konfirmasi (frame beruntun)": "Confirmation (consecutive frames)",
  "Makin besar konfirmasi, makin sedikit alarm palsu, tapi respons sedikit lebih lambat.": "Higher confirmation means fewer false alarms but a slightly slower response.",
  "Kelas berbahaya (pisahkan koma)": "Hazard classes (comma-separated)", "Sumber kamera": "Camera source",
  "Kamera belakang": "Back camera", "Kamera depan": "Front camera", "Peringatan": "Alerts", "Alarm suara": "Sound alarm",
  "Getar (ponsel)": "Vibration (phone)", "Notifikasi browser": "Browser notifications", "Simpan foto saat bahaya": "Save photo on danger",
  "Uji alarm": "Test alarm", "Uji gambar": "Image test", "Pilih gambar": "Choose image", "Deteksi saat ini": "Current detections",
  "Riwayat kejadian": "Event history", "Ekspor CSV": "Export CSV", "Hapus": "Clear", "Unduh": "Download",
  "HeatVision berjalan sepenuhnya di perangkat Anda. Bukan pengganti alat deteksi kebakaran resmi.": "HeatVision runs entirely on your device. It is not a replacement for certified fire detection equipment.",
  "Kelas berbahaya": "Hazard class", "Hasil prediksi akan muncul di sini.": "Predictions will appear here.",
  "Tidak ada objek di atas ambang deteksi.": "No objects above the detection threshold.",
  "Belum ada kejadian tercatat.": "No events recorded yet.", "Belum ada kejadian untuk diekspor.": "No events to export yet.",
  "Memuat model dan menyiapkan runtime…": "Loading model and preparing runtime…",
  "Model siap. Mulai pantau dengan kamera atau uji sebuah gambar.": "Model ready. Start monitoring with the camera or test an image.",
  "Model termuat. Pilih kamera atau gambar untuk memulai.": "Model loaded. Choose a camera or an image to begin.",
  "Gagal memuat model. Periksa file model lalu coba lagi.": "Model load failed. Check the model file and try again.",
  "Muat model sebelum menyalakan kamera.": "Load a model before turning on the camera.",
  "Kamera tidak tersedia. Gunakan HTTPS atau localhost, atau uji dengan gambar.": "Camera unavailable. Use HTTPS or localhost, or test with an image.",
  "Meminta izin kamera…": "Requesting camera permission…", "Frame diproses lokal di browser ini.": "Frames are processed locally in this browser.",
  "Kamera aktif": "Camera active", "Pemantauan berjalan…": "Monitoring…", "Menunggu prediksi pertama…": "Waiting for the first prediction…",
  "Izin kamera ditolak. Izinkan akses kamera atau uji dengan gambar.": "Camera permission denied. Allow camera access or test with an image.",
  "Kamera error": "Camera error", "Pilih file gambar yang didukung.": "Choose a supported image file.",
  "Menganalisis gambar…": "Analyzing image…", "Memuat gambar…": "Loading image…", "Analisis gambar selesai.": "Image analysis complete.",
  "Inferensi gambar gagal.": "Image inference failed.", "Gambar tidak dapat dibaca oleh browser ini.": "This browser could not read the image.",
  "Kamera dihentikan. Model tetap dimuat.": "Camera stopped. Model stays loaded.",
  "Kamera mati. Model siap untuk input lain.": "Camera is off. Model is ready for another input.",
  "Model siap. Menunggu input.": "Model ready. Waiting for input.", "Browser ini tidak mendukung notifikasi.": "This browser does not support notifications.",
  "Izin notifikasi ditolak.": "Notification permission denied.",
};
const PATTERNS = [
  [/^Gagal memuat model: (.*)$/, "Model load failed: $1"], [/^Inferensi berhenti: (.*)$/, "Inference stopped: $1"],
  [/^Inferensi gambar gagal: (.*)$/, "Image inference failed: $1"], [/^Kamera tidak bisa dinyalakan: (.*)$/, "Could not start the camera: $1"],
  [/^Gambar lokal: (.*)$/, "Local image: $1"], [/^Perangkat (.*)$/, "Device $1"],
  [/^(.+) terdeteksi dengan keyakinan (\d+)%\.$/, "$1 detected with $2% confidence."],
  [/^(.+) terdeteksi \((\d+)%\)\. Konfirmasi (\d+\/\d+) frame\.$/, "$1 detected ($2%). Confirming $3 frames."],
  [/^Kelas (.*)$/, "Class $1"],
];
const REV = Object.fromEntries(Object.entries(EN).map(([k, v]) => [v.trim(), k]));
const ATTRS = ["title", "aria-label", "alt"];
let lang = "id";
try { lang = localStorage.getItem("hv-lang") || "id"; } catch {}

export const getLang = () => lang;
export function t(s) { return lang === "en" ? conv(s, "en") : s; }
function conv(core, to) {
  if (to === "id") return REV[core] ?? core;
  if (EN[core] !== undefined) return EN[core];
  for (const [re, out] of PATTERNS) if (re.test(core)) return core.replace(re, out);
  return core;
}
function fixText(node) {
  const d = node.data, core = d.trim();
  if (!core) return;
  const out = conv(core, lang);
  if (out !== core) node.data = d.replace(core, () => out);
}
function walk(n) {
  if (n.nodeType === 3) return fixText(n);
  if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.tagName)) return;
  for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const o = conv(v, lang); if (o !== v) n.setAttribute(a, o); } }
  n.childNodes.forEach(walk);
}
new MutationObserver((ms) => {
  if (lang !== "en") return;
  for (const m of ms) m.type === "characterData" ? fixText(m.target) : m.addedNodes.forEach(walk);
}).observe(document.body, { childList: true, characterData: true, subtree: true });

export function setLang(next) {
  lang = next === "en" ? "en" : "id";
  try { localStorage.setItem("hv-lang", lang); } catch {}
  document.documentElement.lang = lang;
  document.title = conv("HeatVision — Deteksi Asap Real-time", lang);
  walk(document.body);
  dispatchEvent(new Event("hv-lang"));
}
export function setTheme(next) {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("hv-theme", next); } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#fbf5ef" : "#120d16");
}

const sel = document.getElementById("lang-select");
if (sel) { sel.value = lang; sel.addEventListener("change", () => setLang(sel.value)); }
document.getElementById("theme-toggle")?.addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
if (lang === "en") setLang("en");
