const spreadsheetID = '1LgqAr0L66JLtygqTqZRXOMKT06_IMopYlsEGc5nVp4I';

// v2.0: DB_ASC (WIDE format) + DB_GURU_MAPEL (master guru data) + KELAS_SHIFT (mapping)
const sheetDbAsc = 'DB_ASC';
const sheetDbGuruMapel = 'DB_GURU_MAPEL';
const sheetKelasShift = 'KELAS_SHIFT';
const sheetBel = 'PERIODE BEL';
const sheetBelKhusus = 'BEL KHUSUS';
const sheetPiket = 'PIKET';

const endpointDbAsc = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDbAsc}`;
const endpointDbGuruMapel = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDbGuruMapel}`;
const endpointKelasShift = `https://opensheet.elk.sh/${spreadsheetID}/${sheetKelasShift}`;
const endpointBel = `https://opensheet.elk.sh/${spreadsheetID}/${sheetBel}`;
const endpointBelKhusus = `https://opensheet.elk.sh/${spreadsheetID}/${sheetBelKhusus}`;
const endpointPiket = `https://opensheet.elk.sh/${spreadsheetID}/${sheetPiket}`;

// ─── Cache Offline — Konfigurasi ─────────────────────────────────────────────
const CACHE_KEY_DB_ASC       = 'kbm_cache_db_asc';
const CACHE_KEY_GURU_MAPEL   = 'kbm_cache_guru_mapel';
const CACHE_KEY_KELAS_SHIFT  = 'kbm_cache_kelas_shift';
const CACHE_KEY_BEL          = 'kbm_cache_bel';
const CACHE_KEY_BEL_KHUSUS   = 'kbm_cache_bel_khusus';
const CACHE_KEY_PIKET        = 'kbm_cache_piket';
const CACHE_KEY_TIMESTAMP    = 'kbm_cache_timestamp';
const CACHE_EXPIRY_HOURS     = 24; // Data cache berlaku 24 jam

/**
 * Simpan data JSON ke localStorage dengan key tertentu
 */
function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[Cache] Gagal menyimpan cache:', key, e);
  }
}

/**
 * Baca data JSON dari localStorage
 */
function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[Cache] Gagal membaca cache:', key, e);
    return null;
  }
}

/**
 * Cek apakah cache masih valid (belum kadaluarsa)
 */
function isCacheValid() {
  const ts = localStorage.getItem(CACHE_KEY_TIMESTAMP);
  if (!ts) return false;
  const ageMs = Date.now() - parseInt(ts, 10);
  return ageMs < CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
}

/**
 * Perbarui indikator status koneksi di UI
 * @param {'online'|'offline'|'loading'} status
 */
function updateConnectionStatus(status) {
  const el = document.getElementById('connectionStatus');
  if (!el) return;
  const ts = localStorage.getItem(CACHE_KEY_TIMESTAMP);
  let timeStr = '';
  if (ts) {
    const d = new Date(parseInt(ts, 10));
    timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  if (status === 'online') {
    el.innerHTML = '🟢 <span>Data real-time</span>';
    el.className = 'status-online';
  } else if (status === 'offline') {
    el.innerHTML = `🟡 <span>Data dari cache${timeStr ? ' (diperbarui ' + timeStr + ')' : ''}</span>`;
    el.className = 'status-offline';
  } else {
    el.innerHTML = '⚪ <span>Memuat data...</span>';
    el.className = 'status-loading';
  }
}

const clock = document.getElementById("clock");
const dayDate = document.getElementById("dayDate");
const shiftKBM = document.getElementById("shiftKBM");
const jamKBM = document.getElementById("jamKBM");
const dataTabel = document.getElementById("dataTabel");
const guruPiket = document.getElementById("guruPiket");

let timeOffset = 0;
let dayOffset = 0;
let currentScheduleData = [];

// v2.0: New data structures
let globalDbAscData = null;
let globalDbGuruMapelData = null;
let globalKelasShiftData = null;
let globalKelasShiftMap = null;
let globalGuruLookupMap = null;

const themes = [
  // Deep Ocean Blue - menenangkan dan profesional
  "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  // Midnight Navy - elegan dan tidak menyilaukan
  "linear-gradient(135deg, #141E30, #243B55)",
  // Charcoal Gray - netral dan modern
  "linear-gradient(135deg, #232526, #414345)",
  // Dark Slate - hangat dan nyaman
  "linear-gradient(135deg, #2c3e50, #34495e)",
  // Dusty Blue - profesional dan sejuk
  "linear-gradient(135deg, #2c3e50, #4ca1af)",
  // Purple Dusk - unik dan menenangkan
  "linear-gradient(135deg, #2b1055, #7597de)",
  // Forest Night - natural dan fresh
  "linear-gradient(135deg, #0f2027, #1a4731, #2c5364)",
  // Deep Space - futuristik dan fokus
  "linear-gradient(135deg, #000428, #004e92)",
  // Warm Charcoal - arang hangat dengan aksen biru
  "linear-gradient(135deg, #373B44, #4286f4)",
  // Soft Teal - menyegarkan tanpa terang
  "linear-gradient(135deg, #134E5E, #71B280)",
  // Arctic Night - sejuk dan fokus
  "linear-gradient(135deg, #1e3c72, #2a5298)",
  // Deep Teal - tenang dan produktif
  "linear-gradient(135deg, #0f4c75, #3282b8)"
];

let currentTheme = (() => {
  const saved = localStorage.getItem('kbm_theme');
  return saved !== null ? parseInt(saved, 10) : Math.floor(Math.random() * themes.length);
})();

function nextTheme() {
  const theme = themes[currentTheme];
  document.documentElement.style.setProperty('--bg', theme);
  document.body.style.background = '';
  localStorage.setItem('kbm_theme', currentTheme);
  currentTheme = (currentTheme + 1) % themes.length;
}

// Apply saved or random theme on load
nextTheme();

/**
 * Open WhatsApp link using window.location to bypass Android encoding issues
 */
function openWhatsApp(element) {
  const url = element.getAttribute('data-url');
  if (url) {
    window.location.href = url;
  }
}

/**
 * Build guru lookup map dari DB_GURU_MAPEL
 * Maps KODE_DB_ASC → {nama_guru, mapel, no_wa}
 */
function createGuruLookupMap(dbGuruMapelData) {
  const map = new Map();
  if (!dbGuruMapelData || !Array.isArray(dbGuruMapelData)) return map;

  dbGuruMapelData.forEach(row => {
    const kode = row['KODE_DB_ASC'];
    if (kode && kode.trim()) {
      // Try different column name variations
      const noWa = row['NO. WA'] || row['No. WA'] || row['NO WA'] || row['No WA'] || row['NO.WA'] || '';

      map.set(kode.trim(), {
        nama_guru: row['NAMA GURU'] || '',
        mapel: row['MAPEL_LONG'] || row['MAPEL_SHORT'] || '',
        no_wa: noWa
      });
    }
  });

  return map;
}

/**
 * Build kelas to shift mapping dari KELAS_SHIFT sheet
 * Maps Kelas (e.g., "7A") → Shift (e.g., "PUTRA")
 */
function createKelasShiftMap(kelasShiftData) {
  const map = new Map();
  if (!kelasShiftData || !Array.isArray(kelasShiftData)) return map;

  kelasShiftData.forEach(row => {
    const kelas = row['KELAS'];
    const shift = row['SHIFT'];
    if (kelas && shift) {
      map.set(kelas.trim(), shift.trim());
    }
  });

  return map;
}

/**
 * Transform DB_ASC WIDE format → LONG format
 * WIDE: {HARI: "SABTU", "Jam Ke-": "1", "7A": "BAR.23", "7B": "ASW.37", ..., "7D": "THI.40", ...}
 * LONG: [{Hari: "SABTU", "Jam Ke-": "1", Shift: "PUTRA", Kelas: "7A", KODE_DB_ASC: "BAR.23", nama_guru: "...", mapel: "...", no_wa: "..."}, ...]
 */
function transformDbAscWideToLong(dbAscWideData, guruLookupMap, kelasShiftMap) {
  if (!dbAscWideData || !Array.isArray(dbAscWideData)) return [];

  const result = [];

  // Get all class keys from kelasShiftMap (dynamic from KELAS_SHIFT sheet)
  const allClasses = Array.from(kelasShiftMap.keys()).sort();

  // Process each row
  dbAscWideData.forEach((row) => {
    const hari = row['HARI'];
    const jamKe = row['Jam Ke-'];

    // Skip rows without HARI or Jam Ke-
    if (!hari || !jamKe) return;

    // Process each class column
    allClasses.forEach(kelas => {
      const kode = row[kelas];

      // Skip empty codes
      if (!kode || !kode.trim()) return;

      const kodeTrim = kode.trim();
      const guruInfo = guruLookupMap.get(kodeTrim) || { nama_guru: '', mapel: '', no_wa: '' };
      const shift = kelasShiftMap.get(kelas) || 'UNKNOWN';

      result.push({
        Hari: hari,
        'Jam Ke-': jamKe.toString(),
        Shift: shift,
        Kelas: kelas,
        KODE_DB_ASC: kodeTrim,
        'Nama Mapel': guruInfo.mapel,
        'Nama Lengkap Guru': guruInfo.nama_guru,
        'NO. WA': guruInfo.no_wa
      });
    });
  });

  return result;
}

function updateClock() {
  const now = new Date();
  now.setHours(now.getHours() + timeOffset);
  now.setDate(now.getDate() + dayOffset);
  clock.textContent = now.toLocaleTimeString('id-ID', { hour12: false });

  let dateString = now.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  dateString = dateString.replace(/^Minggu,/, 'Ahad,');
  dayDate.textContent = dateString;
}

setInterval(updateClock, 1000);
updateClock();

async function updateGuruPiket(hari, jam, isInKBMPeriod = false, cachedPiketData = null) {
  try {
    if (!isInKBMPeriod) {
      guruPiket.textContent = 'Tidak ada data piket';
      return;
    }

    // Gunakan data yang sudah di-cache dari fetchData() jika tersedia
    const dataPiket = cachedPiketData;

    if (!dataPiket || !Array.isArray(dataPiket) || dataPiket.length === 0) {
      guruPiket.textContent = 'Tidak ada data piket';
      return;
    }

    const shift = jam < 12 ? 'PAGI' : 'SIANG';
    const shiftColumn = shift === 'PAGI' ? 'PIKET SHIFT PAGI' : 'PIKET SHIFT SIANG';
    const waColumn = shift === 'PAGI' ? 'WA PIKET SHIFT PAGI' : 'WA PIKET SHIFT SIANG';

    const piketHariIni = dataPiket.filter(p => p.HARI && p.HARI.toUpperCase() === hari);

    if (piketHariIni.length === 0) {
      guruPiket.textContent = 'Tidak ada data piket';
      return;
    }

    const daftarPiketData = piketHariIni
      .filter(p => p[shiftColumn] && p[shiftColumn].trim() !== '')
      .map(p => ({
        nama: p[shiftColumn].trim(),
        wa: p[waColumn] ? p[waColumn].replace(/\D/g, '') : null
      }));

    if (daftarPiketData.length === 0) {
      guruPiket.textContent = 'Tidak ada piket';
      return;
    }

    guruPiket.innerHTML = '';
    daftarPiketData.forEach(piket => {
      const div = document.createElement('div');
      if (piket.wa) {
        div.innerHTML = `<a href="https://api.whatsapp.com/send?phone=${piket.wa}">${piket.nama}</a>`;
      } else {
        div.textContent = piket.nama;
      }
      guruPiket.appendChild(div);
    });

  } catch (err) {
    console.error("Gagal memuat data piket:", err);
    guruPiket.textContent = 'Error loading piket data';
  }
}

/**
 * Render jadwal ke tabel dari data array yang diberikan
 */
function renderJadwal(sortedJadwal, jamKeNow, isKamis) {
  dataTabel.innerHTML = "";
  sortedJadwal.forEach((row) => {
    const kelas = row.Kelas;
    const mapel = row['Nama Mapel'];
    const kodeGuru = row.KODE_DB_ASC ? row.KODE_DB_ASC.replace(/\D/g, '') : '';
    const mapelDisplay = kodeGuru ? `${mapel} (${kodeGuru})` : mapel;
    const guru = row['Nama Lengkap Guru'];
    const noWaRaw = row['NO. WA'] || row['No. WA'] || '';

    const digits = noWaRaw ? noWaRaw.replace(/\D/g, '') : '';
    const noWa = digits.startsWith('62') ? digits : (digits.startsWith('0') ? '62' + digits.substring(1) : (digits ? '62' + digits : ''));

    let guruDisplay = guru;
    if (digits && noWa) {
      let jadwalInfo = isKamis ? " (Jadwal Khusus Hari Kamis)" : "";
      const pesan = `📢 *Assalamualaikum Wr. Wb.*

📝 Mohon izin untuk menginformasikan bahwa *Ust. ${guru}* pada hari ini memiliki jadwal mengajar di *kelas ${kelas}* untuk mapel *${mapel}* pada *Jam ke-${jamKeNow}*${jadwalInfo}.

🙏🏻 Atas perhatian dan kerjasamanya diucapkan terima kasih.

📢 *Wassalamu'alaikum Wr. Wb.*`;
      const urlWa = `https://api.whatsapp.com/send?phone=${noWa}&text=${encodeURIComponent(pesan)}`;
      guruDisplay = `<span class="guru-link" data-url="${urlWa}" onclick="openWhatsApp(this)">${guru}</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${kelas}</td>
      <td>${mapelDisplay}</td>
      <td><strong>${guruDisplay}</strong></td>
    `;
    dataTabel.appendChild(tr);
  });
}

/**
 * Proses dan tampilkan data dari sumber manapun (online/offline)
 */
function processAndDisplay(dataDbAsc, dataDbGuruMapel, dataKelasShift, dataBel, dataBelKhusus, dataPiket, hari, jam, shift, timeNow, isKamis) {
  // Store raw data in globals
  globalDbAscData = dataDbAsc;
  globalDbGuruMapelData = dataDbGuruMapel;
  globalKelasShiftData = dataKelasShift;
  // Simpan data bel untuk fitur jadwal guru
  globalBelData = dataBel;
  globalBelKhususData = dataBelKhusus;

  globalGuruLookupMap = createGuruLookupMap(dataDbGuruMapel);
  globalKelasShiftMap = createKelasShiftMap(dataKelasShift);
  const dataJadwal = transformDbAscWideToLong(dataDbAsc, globalGuruLookupMap, globalKelasShiftMap);

  const belData = isKamis ? dataBelKhusus : dataBel;
  const jadwalShift = belData.filter(p => p.Shift === shift);
  let periodeSekarang = null;

  for (let p of jadwalShift) {
    if (timeNow >= p['Jam Mulai'] && timeNow <= p['Jam Selesai']) {
      periodeSekarang = p;
      break;
    }
  }

  const isInKBMPeriod = periodeSekarang && periodeSekarang['Jam Ke-'] !== 'IST';

  // Panggil updateGuruPiket dengan data yang sudah ada (tidak fetch lagi)
  updateGuruPiket(hari, jam, isInKBMPeriod, dataPiket);

  shiftKBM.textContent = `Jadwal KBM ${shift}`;

  if (!periodeSekarang) {
    jamKBM.textContent = `Di luar jam KBM`;
    dataTabel.innerHTML = `<tr><td colspan="3">Tidak ada KBM saat ini</td></tr>`;
    currentScheduleData = [];
    return;
  }

  if (periodeSekarang['Jam Ke-'] === 'IST') {
    jamKBM.textContent = `Jam ISTIRAHAT`;
    dataTabel.innerHTML = `<tr><td colspan="3">Sedang istirahat</td></tr>`;
    currentScheduleData = [];
    return;
  }

  const jamKeNow = periodeSekarang['Jam Ke-'];
  const jamMulai = periodeSekarang['Jam Mulai'];
  const jamSelesai = periodeSekarang['Jam Selesai'];

  jamKBM.textContent = `Jam ke-${jamKeNow} (${jamMulai} - ${jamSelesai})`;

  const jadwalSekarang = dataJadwal.filter(row =>
    row.Hari.toUpperCase() === hari &&
    row['Jam Ke-'] === jamKeNow &&
    row.Shift === shift
  );

  if (jadwalSekarang.length === 0) {
    dataTabel.innerHTML = `<tr><td colspan="3">Tidak ada data jadwal untuk jam ini</td></tr>`;
    currentScheduleData = [];
    return;
  }

  const sortedJadwal = jadwalSekarang.sort((a, b) => {
    const regex = /^(\d+)([A-Z]*)$/i;
    const [, levelA, subA] = a.Kelas.match(regex) || [null, 0, ""];
    const [, levelB, subB] = b.Kelas.match(regex) || [null, 0, ""];
    const numA = parseInt(levelA);
    const numB = parseInt(levelB);
    if (numA !== numB) return numA - numB;
    return subA.localeCompare(subB);
  });

  currentScheduleData = sortedJadwal;
  renderJadwal(sortedJadwal, jamKeNow, isKamis);
}

async function fetchData() {
  const now = new Date();
  now.setHours(now.getHours() + timeOffset);
  now.setDate(now.getDate() + dayOffset);
  const jam = now.getHours();
  const menit = now.getMinutes();

  let hari = now.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
  if (hari === 'MINGGU') hari = 'AHAD';

  const shift = jam < 12 ? 'PUTRA' : 'PUTRI';
  const timeNow = `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;
  const isKamis = hari === 'KAMIS';

  updateConnectionStatus('loading');

  try {
    console.log("[Online] Fetching data v2.0 dari server...");

    const [dataDbAsc, dataDbGuruMapel, dataKelasShift, dataBel, dataBelKhusus, dataPiket] = await Promise.all([
      fetch(endpointDbAsc).then(r => r.json()),
      fetch(endpointDbGuruMapel).then(r => r.json()),
      fetch(endpointKelasShift).then(r => r.json()),
      fetch(endpointBel).then(r => r.json()),
      fetch(endpointBelKhusus).then(r => r.json()),
      fetch(endpointPiket).then(r => r.json())
    ]);

    // Simpan semua data ke localStorage sebagai cache offline
    saveCache(CACHE_KEY_DB_ASC, dataDbAsc);
    saveCache(CACHE_KEY_GURU_MAPEL, dataDbGuruMapel);
    saveCache(CACHE_KEY_KELAS_SHIFT, dataKelasShift);
    saveCache(CACHE_KEY_BEL, dataBel);
    saveCache(CACHE_KEY_BEL_KHUSUS, dataBelKhusus);
    saveCache(CACHE_KEY_PIKET, dataPiket);
    localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());

    updateConnectionStatus('online');
    processAndDisplay(dataDbAsc, dataDbGuruMapel, dataKelasShift, dataBel, dataBelKhusus, dataPiket, hari, jam, shift, timeNow, isKamis);

  } catch (err) {
    console.warn("[Offline] Fetch gagal, mencoba data cache:", err);

    // Coba baca dari cache localStorage
    const cachedDbAsc      = loadCache(CACHE_KEY_DB_ASC);
    const cachedGuruMapel  = loadCache(CACHE_KEY_GURU_MAPEL);
    const cachedKelasShift = loadCache(CACHE_KEY_KELAS_SHIFT);
    const cachedBel        = loadCache(CACHE_KEY_BEL);
    const cachedBelKhusus  = loadCache(CACHE_KEY_BEL_KHUSUS);
    const cachedPiket      = loadCache(CACHE_KEY_PIKET);

    const hasCacheData = cachedDbAsc && cachedGuruMapel && cachedKelasShift && cachedBel && cachedBelKhusus;

    if (hasCacheData) {
      console.log("[Offline] Menggunakan data cache.");
      updateConnectionStatus('offline');
      processAndDisplay(cachedDbAsc, cachedGuruMapel, cachedKelasShift, cachedBel, cachedBelKhusus, cachedPiket, hari, jam, shift, timeNow, isKamis);
    } else {
      console.error("[Offline] Tidak ada cache tersedia.");
      updateConnectionStatus('offline');
      dataTabel.innerHTML = `<tr><td colspan="3">⚠️ Tidak ada koneksi & belum ada cache data.<br>Hubungkan internet dan refresh halaman.</td></tr>`;
      guruPiket.textContent = 'Tidak ada data';
    }
  }
}

setInterval(fetchData, 15000);
fetchData();

const fonts = ['Roboto', 'Arial', 'Courier New', 'Verdana'];

// Restore saved font on load
(() => {
  const savedFont = localStorage.getItem('kbm_font');
  if (savedFont) document.body.style.fontFamily = savedFont;
})();

function toggleFont() {
  const body = document.body;
  let index = fonts.indexOf(body.style.fontFamily);
  index = (index + 1) % fonts.length;
  body.style.fontFamily = fonts[index];
  localStorage.setItem('kbm_font', fonts[index]);
}

let currentFontSize = (() => {
  const saved = localStorage.getItem('kbm_fontSize');
  return saved !== null ? parseFloat(saved) : 0.85;
})();

// Restore saved font size on load
(() => {
  const table = document.querySelector("table");
  if (table) table.style.fontSize = `${currentFontSize}rem`;
})();

function adjustFont(change) {
  currentFontSize += change;
  document.querySelector("table").style.fontSize = `${currentFontSize}rem`;
  localStorage.setItem('kbm_fontSize', currentFontSize);
}

function resetDefaults() {
  // Hapus semua pengaturan dari localStorage
  localStorage.removeItem('kbm_theme');
  localStorage.removeItem('kbm_font');
  localStorage.removeItem('kbm_fontSize');

  // Reset tema ke random
  currentTheme = Math.floor(Math.random() * themes.length);
  nextTheme();

  // Reset font ke default (Roboto)
  document.body.style.fontFamily = '';

  // Reset ukuran font tabel ke default (0.85rem)
  currentFontSize = 0.85;
  const table = document.querySelector("table");
  if (table) table.style.fontSize = `${currentFontSize}rem`;
}

function adjustTime(offset) {
  timeOffset += offset;
  updateClock();
  fetchData();
}

function adjustDay(offset) {
  dayOffset += offset;
  updateClock();
  fetchData();
}

// --- Report Modal Logic ---

const reportModal = document.getElementById('reportModal');
const reportTableBody = document.getElementById('reportTableBody');
const btnWa = document.querySelector('.btn-wa');

function openReportModal() {
  reportModal.style.display = 'flex';
  btnWa.disabled = true;

  // Isi info waktu di modal
  const timeInfoEl = document.getElementById('reportTimeInfo');
  if (timeInfoEl) {
    const dateText = dayDate.textContent || '';
    const shiftText = shiftKBM.textContent || '';
    const jamText = jamKBM.textContent || '';
    timeInfoEl.textContent = `${dateText} | ${shiftText} | ${jamText}`;
  }

  renderReportTable();
}

function closeReportModal() {
  reportModal.style.display = 'none';
}

reportModal.addEventListener('click', (e) => {
  if (e.target === reportModal) {
    closeReportModal();
  }
});

function renderReportTable() {
  reportTableBody.innerHTML = '';

  if (!currentScheduleData || currentScheduleData.length === 0) {
    reportTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Tidak ada data jadwal saat ini.</td></tr>';
    return;
  }

  currentScheduleData.forEach((row, index) => {
    const tr = document.createElement('tr');
    const safeId = index;

    tr.innerHTML = `
      <td>${row.Kelas}</td>
      <td>
        ${row['Nama Mapel']} <span class="teacher-name-small">${row['Nama Lengkap Guru']}</span>
        <div class="status-options">
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="✅" checked> ✅ Hadir
          </label>
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="⚠️"> ⚠️ Telat
          </label>
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="ℹ️"> ℹ️ Izin
          </label>
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="⛔"> ⛔ Absen
          </label>
        </div>
      </td>
    `;
    reportTableBody.appendChild(tr);
  });
}

function generateReportText() {
  const now = new Date();
  now.setHours(now.getHours() + timeOffset);
  now.setDate(now.getDate() + dayOffset);

  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  let dateString = now.toLocaleDateString('id-ID', dateOptions);
  dateString = dateString.replace(/^Minggu,/, 'Ahad,');

  const shiftText = shiftKBM.textContent.replace('Jadwal KBM ', '');
  const jamText = jamKBM.textContent;

  let piketNames = [];
  const piketElements = guruPiket.querySelectorAll('div');
  piketElements.forEach(el => {
    piketNames.push(`*${el.textContent.trim()}*`);
  });
  const piketString = piketNames.join('\n');

  let report = `*LAPORAN KBM*\n`;
  report += `${dateString}\n`;
  report += `${jamText}\n\n`;

  if (currentScheduleData && currentScheduleData.length > 0) {
    currentScheduleData.forEach((row, index) => {
      const status = document.querySelector(`input[name="status-${index}"]:checked`).value;
      const kodeAngka = row.KODE_DB_ASC.replace(/\D/g, '');
      report += `*${row.Kelas}* ${status} ${row['Nama Mapel']} _(${kodeAngka})_\n`;
    });
  } else {
    report += "Tidak ada jadwal aktif.\n";
  }

  report += `\nKeterangan:\n✅ : Hadir\n⚠️ : Telat\nℹ️ : Izin\n⛔ : Absen\n`;
  report += `\nGuru Piket:\n${piketString}\n`;
  report += `\n*Link E-Jadwal*: monitoring-kbm.netlify.app/`;

  return report;
}

async function copyReportText() {
  const text = generateReportText();
  try {
    await navigator.clipboard.writeText(text);
    alert('Laporan berhasil disalin! Silakan klik tombol "Laporkan ke WhatsApp" dan tempel (Paste) pesan di kolom chat.');
    btnWa.disabled = false;
  } catch (err) {
    console.error('Gagal menyalin:', err);
    alert('Gagal menyalin teks. Mohon salin manual.');
  }
}

async function sendToWhatsApp() {
  const text = generateReportText();
  try {
    await navigator.clipboard.writeText(text);
    window.open('https://chat.whatsapp.com/5vTwMCXv9ZY6pBA0aDIGB2', '_blank');
  } catch (err) {
    console.error('Gagal menyalin:', err);
    alert('Gagal menyalin teks laporan. Namun akan tetap membuka WhatsApp.');
    window.open('https://chat.whatsapp.com/5vTwMCXv9ZY6pBA0aDIGB2', '_blank');
  }
}

// ============================================================
// FITUR JADWAL GURU — Canvas / Wallpaper HP (Portrait)
// ============================================================

const HARI_LIST = ['SABTU', 'AHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS'];
const HARI_SHORT = { SABTU: 'Sbt', AHAD: 'Ahd', SENIN: 'Sen', SELASA: 'Sel', RABU: 'Rab', KAMIS: 'Kam' };

// Jam bel shift PAGI (1-7) dan SIANG (1-7) — diisi dari data global saat render
// Fallback jika data bel belum ada
const DEFAULT_BEL_PAGI = [
  { jam: '1', mulai: '06:45', selesai: '07:25' },
  { jam: '2', mulai: '07:25', selesai: '08:05' },
  { jam: '3', mulai: '08:05', selesai: '08:45' },
  { jam: '4', mulai: '08:45', selesai: '09:25' },
  { jam: '5', mulai: '09:45', selesai: '10:25' },
  { jam: '6', mulai: '10:25', selesai: '10:55' },
  { jam: '7', mulai: '10:55', selesai: '11:30' },
];
const DEFAULT_BEL_SIANG = [
  { jam: '1', mulai: '12:30', selesai: '13:05' },
  { jam: '2', mulai: '13:05', selesai: '13:40' },
  { jam: '3', mulai: '13:40', selesai: '14:15' },
  { jam: '4', mulai: '14:15', selesai: '14:50' },
  { jam: '5', mulai: '14:50', selesai: '15:25' },
  { jam: '6', mulai: '15:25', selesai: '16:00' },
  { jam: '7', mulai: '16:00', selesai: '16:35' },
];

// Simpan data bel dari fetch
let globalBelData = null;
let globalBelKhususData = null;

/**
 * Ambil periode bel pagi & siang dari dataBel (PERIODE BEL)
 * Return { pagi: [{jam, mulai, selesai}], siang: [...] }
 */
function parseBelPeriods(dataBel) {
  if (!dataBel || !Array.isArray(dataBel) || dataBel.length === 0) {
    return { pagi: DEFAULT_BEL_PAGI, siang: DEFAULT_BEL_SIANG };
  }
  const pagi = [];
  const siang = [];
  dataBel.forEach(row => {
    const shift = (row['Shift'] || row['SHIFT'] || '').toUpperCase();
    const jamKe = (row['Jam Ke-'] || row['JAM KE-'] || '').toString().trim();
    const mulai = row['Jam Mulai'] || row['JAM MULAI'] || '';
    const selesai = row['Jam Selesai'] || row['JAM SELESAI'] || '';
    if (!jamKe || jamKe === 'IST' || !mulai || !selesai) return;
    const entry = { jam: jamKe, mulai, selesai };
    if (shift === 'PUTRA') pagi.push(entry);
    else if (shift === 'PUTRI') siang.push(entry);
  });
  return {
    pagi: pagi.length > 0 ? pagi : DEFAULT_BEL_PAGI,
    siang: siang.length > 0 ? siang : DEFAULT_BEL_SIANG
  };
}

/**
 * Populate dropdown guru — deduplikasi per NAMA GURU (bukan per kode)
 */
function populateGuruDropdown() {
  const select = document.getElementById('guruSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Guru --</option>';

  if (!globalGuruLookupMap || globalGuruLookupMap.size === 0) {
    select.innerHTML += '<option disabled>Data guru belum tersedia</option>';
    return;
  }

  // Kumpulkan guru unik berdasarkan NAMA (bukan kode), gabungkan semua mapelnya
  const guruMap = new Map(); // nama_guru → Set<mapel>
  globalGuruLookupMap.forEach((info) => {
    const nama = (info.nama_guru || '').trim();
    if (!nama) return;
    if (!guruMap.has(nama)) guruMap.set(nama, new Set());
    if (info.mapel && info.mapel.trim()) guruMap.get(nama).add(info.mapel.trim());
  });

  // Sort A-Z lalu masukkan ke dropdown
  const sortedNames = Array.from(guruMap.keys()).sort((a, b) => a.localeCompare(b, 'id'));
  sortedNames.forEach(nama => {
    const opt = document.createElement('option');
    opt.value = nama; // value = nama guru (bukan kode)
    opt.textContent = nama;
    select.appendChild(opt);
  });
}

/**
 * Buka modal jadwal guru
 */
function openJadwalGuruModal() {
  const modal = document.getElementById('jadwalGuruModal');
  if (!modal) return;
  modal.style.display = 'flex';
  populateGuruDropdown();
  // Reset canvas
  document.getElementById('jadwalGuruCanvasWrap').style.display = 'none';
  document.getElementById('btnDownloadJadwalGuru').disabled = true;
}

function closeJadwalGuruModal() {
  const modal = document.getElementById('jadwalGuruModal');
  if (modal) modal.style.display = 'none';
}

document.getElementById('jadwalGuruModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('jadwalGuruModal')) closeJadwalGuruModal();
});

/**
 * Dapatkan jadwal seorang guru berdasarkan NAMA GURU (bukan kode)
 * Mencakup SEMUA kode yang dimiliki guru tersebut (multi-mapel)
 * Return: { [HARI]: { PUTRA: { [jamKe]: [{kelas, mapel}] }, PUTRI: { [jamKe]: [{kelas, mapel}] } } }
 */
function getJadwalGuru(namaGuru) {
  if (!globalDbAscData || !globalKelasShiftMap || !globalGuruLookupMap) return null;

  // Kumpulkan semua KODE milik guru ini (bisa lebih dari 1 jika multi-mapel)
  const kodeGuruMap = new Map(); // kode → mapel
  globalGuruLookupMap.forEach((info, kode) => {
    if ((info.nama_guru || '').trim() === namaGuru.trim()) {
      kodeGuruMap.set(kode, info.mapel || '');
    }
  });

  // Inisialisasi struktur jadwal
  const jadwal = {};
  HARI_LIST.forEach(h => { jadwal[h] = { PUTRA: {}, PUTRI: {} }; });

  const allClasses = Array.from(globalKelasShiftMap.keys());

  globalDbAscData.forEach(row => {
    const hari  = (row['HARI'] || '').toUpperCase().trim();
    const jamKe = (row['Jam Ke-'] || '').toString().trim();
    if (!hari || !jamKe) return;
    const hariKey = hari === 'MINGGU' ? 'AHAD' : hari;
    if (!HARI_LIST.includes(hariKey)) return;

    allClasses.forEach(kelas => {
      const kode = (row[kelas] || '').trim();
      if (!kodeGuruMap.has(kode)) return;

      const shift    = globalKelasShiftMap.get(kelas) || 'PUTRA';
      const shiftKey = shift === 'PUTRI' ? 'PUTRI' : 'PUTRA';
      const mapel    = kodeGuruMap.get(kode);

      if (!jadwal[hariKey][shiftKey][jamKe]) jadwal[hariKey][shiftKey][jamKe] = [];
      jadwal[hariKey][shiftKey][jamKe].push({ kelas, mapel });
    });
  });

  return jadwal;
}

/**
 * Render jadwal guru ke canvas ukuran 1080×1920 (portrait wallpaper HP)
 */
function renderJadwalGuruCanvas() {
  const select    = document.getElementById('guruSelect');
  const namaGuru  = select ? select.value : '';  // value sekarang = nama guru
  const canvasWrap = document.getElementById('jadwalGuruCanvasWrap');
  const loading   = document.getElementById('jadwalGuruLoading');
  const btnDl     = document.getElementById('btnDownloadJadwalGuru');

  if (!namaGuru) {
    canvasWrap.style.display = 'none';
    btnDl.disabled = true;
    return;
  }

  loading.style.display = 'block';
  canvasWrap.style.display = 'none';
  btnDl.disabled = true;

  // Render async agar UI tidak freeze
  setTimeout(() => {
    _drawJadwalGuruCanvas(namaGuru)
      .then(() => {
        canvasWrap.style.display = 'flex';
        btnDl.disabled = false;
      })
      .catch(e => {
        console.error('Gagal render canvas jadwal guru:', e);
        alert('Gagal membuat jadwal. Pastikan data sudah dimuat.');
      })
      .finally(() => {
        loading.style.display = 'none';
      });
  }, 50);
}

/**
 * Render canvas jadwal guru — async karena load logo.png
 * @param {string} namaGuru - Nama lengkap guru (bukan kode)
 */
function _drawJadwalGuruCanvas(namaGuru) {
  return new Promise((resolve) => {
    const canvas = document.getElementById('jadwalGuruCanvas');
    const ctx = canvas.getContext('2d');

    const W = 1080;
    const H = 1920;
    canvas.width  = W;
    canvas.height = H;

    const jadwal = getJadwalGuru(namaGuru);

    // Kumpulkan semua mapel milik guru ini
    const mapelSet = new Set();
    if (globalGuruLookupMap) {
      globalGuruLookupMap.forEach((info) => {
        if ((info.nama_guru || '').trim() === namaGuru.trim() && info.mapel) {
          mapelSet.add(info.mapel.trim());
        }
      });
    }
    const mapelStr = Array.from(mapelSet).join(' | ');

    const belPeriods = globalBelData
      ? parseBelPeriods(globalBelData)
      : { pagi: DEFAULT_BEL_PAGI, siang: DEFAULT_BEL_SIANG };

    const maxJamPagi  = belPeriods.pagi.length;
    const maxJamSiang = belPeriods.siang.length;

    // ── Layout ──
    const PAD         = 36;
    const LOGO_SIZE   = 100;
    // Header cukup besar untuk: logo+judul (118px) + garis (10px) + nama guru (max 60px) + mapel (40px) + margin (30px) = ~260px
    const HEADER_H    = 290;
    const FOOTER_H    = 60;
    const LABEL_COL_W = 148;

    const usableW  = W - PAD * 2;
    const usableH  = H - HEADER_H - FOOTER_H - PAD * 2;
    const hariColW = (usableW - LABEL_COL_W) / HARI_LIST.length;

    const HARI_ROW_H    = 76;
    const SHIFT_TITLE_H = 60;
    const JAM_ROW_H     = Math.floor(
      (usableH - HARI_ROW_H - SHIFT_TITLE_H * 2) / (maxJamPagi + maxJamSiang)
    );

    // ── Helper: drawCell dengan textLines array of {text, color?, size?, bold?} atau string ──
    function drawCell(x, y, w, h, bgColor, textLines, defaultColor, defaultSize, defaultBold, borderColor) {
      ctx.save();
      if (bgColor) { ctx.fillStyle = bgColor; ctx.fillRect(x, y, w, h); }
      ctx.strokeStyle = borderColor || 'rgba(255,255,255,0.22)';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x, y, w, h);

      if (textLines && textLines.length > 0) {
        const items = textLines.map(item =>
          typeof item === 'string'
            ? { text: item, color: defaultColor || '#fff', size: defaultSize || 26, bold: defaultBold || false }
            : { color: defaultColor || '#fff', size: defaultSize || 26, bold: defaultBold || false, ...item }
        );
        const lineHeights = items.map(it => it.size * 1.3);
        const totalH = lineHeights.reduce((a, b) => a + b, 0);
        let   lineY  = y + h / 2 - totalH / 2 + lineHeights[0] / 2;
        items.forEach((it, i) => {
          ctx.fillStyle    = it.color;
          ctx.font         = `${it.bold ? 'bold ' : ''}${it.size}px Arial`;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(it.text, x + w / 2, lineY, w - 8);
          lineY += lineHeights[i];
        });
      }
      ctx.restore();
    }

    // ── Render utama (dipanggil setelah logo siap) ──
    function doRender(logoImg) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0,   '#0f2027');
      grad.addColorStop(0.5, '#203a43');
      grad.addColorStop(1,   '#2c5364');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Watermark samar
      ctx.save();
      ctx.globalAlpha   = 0.03;
      ctx.fillStyle     = '#fff';
      ctx.font          = 'bold 400px Arial';
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('📅', W / 2, H / 2);
      ctx.restore();

      // ── HEADER ──
      const logoX = PAD;
      const logoY = PAD + 8;

      // Logo
      ctx.save();
      if (logoImg) {
        ctx.beginPath();
        ctx.arc(logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2, LOGO_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, LOGO_SIZE, LOGO_SIZE);
      } else {
        ctx.strokeStyle  = '#FFD700';
        ctx.lineWidth    = 3;
        ctx.beginPath();
        ctx.arc(logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2, LOGO_SIZE / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle    = '#FFD700';
        ctx.font         = 'bold 36px Arial';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏫', logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2);
      }
      ctx.restore();

      // Nama madrasah & tahun ajaran
      const textX = PAD + LOGO_SIZE + 24;
      ctx.save();
      ctx.fillStyle    = '#FFD700';
      ctx.font         = 'bold 44px Arial';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('MTs. An-Nur Bululawang', textX, PAD + 6);
      ctx.fillStyle = '#ccc';
      ctx.font      = '30px Arial';
      ctx.fillText('Jadwal Pelajaran TA. 2026-2027', textX, PAD + 58);
      ctx.restore();

      // Garis pemisah header
      const garisPemisahY = PAD + LOGO_SIZE + 18;
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, garisPemisahY);
      ctx.lineTo(W - PAD, garisPemisahY);
      ctx.stroke();
      ctx.restore();

      // Nama guru — font size dinamis agar muat lebar canvas
      ctx.save();
      let namaFontSize = 60;
      ctx.font = `bold ${namaFontSize}px Arial`;
      while (ctx.measureText(namaGuru).width > usableW - 20 && namaFontSize > 30) {
        namaFontSize -= 2;
        ctx.font = `bold ${namaFontSize}px Arial`;
      }
      const namaY = garisPemisahY + 18;
      ctx.fillStyle    = '#fff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(namaGuru, W / 2, namaY, usableW);

      // Mapel (di bawah nama guru, tidak overlap dengan tabel)
      const mapelY = namaY + namaFontSize * 1.2;
      ctx.fillStyle = '#00BFFF';
      ctx.font      = '32px Arial';
      ctx.fillText(mapelStr || '', W / 2, mapelY, usableW);
      ctx.restore();

      // ── TABEL ──
      const tableX = PAD;
      const tableY = HEADER_H;  // tabel mulai tepat setelah header
      const tableW = usableW;

      // Header hari
      drawCell(tableX, tableY, LABEL_COL_W, HARI_ROW_H,
        'rgba(0,0,80,0.7)', [
          { text: 'Hari →', size: 22, bold: true, color: '#FFD700' },
          { text: 'Jam ↓',  size: 22, bold: true, color: '#FFD700' }
        ], '#FFD700', 22, true, '#FFD700');

      HARI_LIST.forEach((hari, i) => {
        const cx = tableX + LABEL_COL_W + i * hariColW;
        drawCell(cx, tableY, hariColW, HARI_ROW_H,
          'rgba(0,0,80,0.7)',
          [{ text: HARI_SHORT[hari], size: 32, bold: true, color: '#FFD700' }],
          '#FFD700', 32, true, '#FFD700');
      });

      // ─ Shift PAGI ─
      let curY = tableY + HARI_ROW_H;
      drawCell(tableX, curY, tableW, SHIFT_TITLE_H,
        'rgba(0,100,160,0.85)',
        [{ text: '🌅  SHIFT PAGI (PUTRA)', size: 30, bold: true, color: '#fff' }],
        '#fff', 30, true, '#00BFFF');
      curY += SHIFT_TITLE_H;

      belPeriods.pagi.forEach((bel, idx) => {
        const rowY = curY + idx * JAM_ROW_H;
        // Kolom label jam
        drawCell(tableX, rowY, LABEL_COL_W, JAM_ROW_H,
          'rgba(0,50,110,0.55)', [
            { text: `Jam ${bel.jam}`, size: 22, bold: true,  color: '#00BFFF' },
            { text: bel.mulai,        size: 19, bold: false, color: '#aee' },
            { text: bel.selesai,      size: 19, bold: false, color: '#aee' }
          ], '#00BFFF', 22, false, 'rgba(255,255,255,0.15)');

        HARI_LIST.forEach((hari, hi) => {
          const cx      = tableX + LABEL_COL_W + hi * hariColW;
          const entries = jadwal?.[hari]?.['PUTRA']?.[bel.jam] || [];

          if (entries.length === 0) {
            drawCell(cx, rowY, hariColW, JAM_ROW_H, null, [], '#fff', 24, false, 'rgba(255,255,255,0.1)');
            return;
          }

          const tingkat = parseInt(entries[0].kelas);
          const bgCol = tingkat === 7 ? 'rgba(0,170,170,0.65)'
                      : tingkat === 8 ? 'rgba(0,150,70,0.65)'
                      : tingkat === 9 ? 'rgba(190,90,0,0.65)'
                      : 'rgba(80,80,180,0.65)';

          const nEntry    = entries.length;
          const kelasSize = nEntry > 1 ? 20 : 28;
          const mapelSize = nEntry > 1 ? 15 : 19;

          const lines = [];
          entries.forEach(e => {
            lines.push({ text: e.kelas, size: kelasSize, bold: true,  color: '#fff' });
            if (e.mapel) lines.push({ text: e.mapel, size: mapelSize, bold: false, color: '#ffe' });
          });

          drawCell(cx, rowY, hariColW, JAM_ROW_H, bgCol, lines, '#fff', kelasSize, true, 'rgba(255,255,255,0.15)');
        });
      });

      curY += maxJamPagi * JAM_ROW_H;

      // ─ Shift SIANG ─
      drawCell(tableX, curY, tableW, SHIFT_TITLE_H,
        'rgba(100,0,120,0.85)',
        [{ text: '🌇  SHIFT SIANG (PUTRI)', size: 30, bold: true, color: '#fff' }],
        '#fff', 30, true, '#FF69B4');
      curY += SHIFT_TITLE_H;

      belPeriods.siang.forEach((bel, idx) => {
        const rowY = curY + idx * JAM_ROW_H;
        drawCell(tableX, rowY, LABEL_COL_W, JAM_ROW_H,
          'rgba(70,0,80,0.5)', [
            { text: `Jam ${bel.jam}`, size: 22, bold: true,  color: '#FF69B4' },
            { text: bel.mulai,        size: 19, bold: false, color: '#fbb' },
            { text: bel.selesai,      size: 19, bold: false, color: '#fbb' }
          ], '#FF69B4', 22, false, 'rgba(255,255,255,0.15)');

        HARI_LIST.forEach((hari, hi) => {
          const cx      = tableX + LABEL_COL_W + hi * hariColW;
          const entries = jadwal?.[hari]?.['PUTRI']?.[bel.jam] || [];

          if (entries.length === 0) {
            drawCell(cx, rowY, hariColW, JAM_ROW_H, null, [], '#fff', 24, false, 'rgba(255,255,255,0.1)');
            return;
          }

          const tingkat = parseInt(entries[0].kelas);
          const bgCol = tingkat === 7 ? 'rgba(0,170,170,0.65)'
                      : tingkat === 8 ? 'rgba(0,150,70,0.65)'
                      : tingkat === 9 ? 'rgba(190,90,0,0.65)'
                      : 'rgba(80,80,180,0.65)';

          const nEntry    = entries.length;
          const kelasSize = nEntry > 1 ? 20 : 28;
          const mapelSize = nEntry > 1 ? 15 : 19;

          const lines = [];
          entries.forEach(e => {
            lines.push({ text: e.kelas, size: kelasSize, bold: true,  color: '#fff' });
            if (e.mapel) lines.push({ text: e.mapel, size: mapelSize, bold: false, color: '#ffe' });
          });

          drawCell(cx, rowY, hariColW, JAM_ROW_H, bgCol, lines, '#fff', kelasSize, true, 'rgba(255,255,255,0.15)');
        });
      });

      // ── LEGENDA WARNA ──
      const legendY   = curY + maxJamSiang * JAM_ROW_H + 10;
      const legColors = [
        { color: 'rgba(0,170,170,0.8)',  label: 'Kelas 7' },
        { color: 'rgba(0,150,70,0.8)',   label: 'Kelas 8' },
        { color: 'rgba(190,90,0,0.8)',   label: 'Kelas 9' },
      ];
      const legItemW = tableW / legColors.length;
      legColors.forEach((leg, i) => {
        drawCell(tableX + i * legItemW, legendY, legItemW, 48, leg.color,
          [{ text: leg.label, size: 26, bold: false, color: '#fff' }],
          '#fff', 26, false, 'rgba(255,255,255,0.1)');
      });

      // ── FOOTER ──
      const footerY = H - FOOTER_H;
      ctx.save();
      ctx.fillStyle    = 'rgba(255,255,255,0.07)';
      ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle    = '#999';
      ctx.font         = '26px Arial';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('monitoring-kbm.netlify.app  |  MTs. An-Nur Bululawang', W / 2, footerY + FOOTER_H / 2);
      ctx.restore();

      resolve();
    }

    // Load logo.png, fallback jika gagal
    const logoImg  = new Image();
    logoImg.onload  = () => doRender(logoImg);
    logoImg.onerror = () => doRender(null);
    logoImg.src     = '/logo.png';
  });
}

/**
 * Download canvas sebagai file JPG
 */
function downloadJadwalGuruJpg() {
  const canvas   = document.getElementById('jadwalGuruCanvas');
  if (!canvas) return;
  const select   = document.getElementById('guruSelect');
  const namaGuru = select ? select.value : 'guru';
  const namaFile = namaGuru.replace(/[^a-zA-Z0-9]/g, '_');

  const link    = document.createElement('a');
  link.download = `Jadwal_${namaFile}.jpg`;
  link.href     = canvas.toDataURL('image/jpeg', 0.92);
  link.click();
}
