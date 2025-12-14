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

let currentTheme = Math.floor(Math.random() * themes.length);
function nextTheme() {
  const theme = themes[currentTheme];
  document.documentElement.style.setProperty('--bg', theme);
  document.body.style.background = '';
  currentTheme = (currentTheme + 1) % themes.length;
}

// Apply initial random theme
nextTheme();

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
      const noWa = row['No. WA'] || row['NO. WA'] || row['NO WA'] || row['No WA'] || '';
      
      map.set(kode.trim(), {
        nama_guru: row['NAMA GURU'] || '',
        mapel: row['MAPEL_LONG'] || row['MAPEL_SHORT'] || '',
        no_wa: noWa
      });
    }
  });
  
  console.log('Guru Lookup Map created:', map.size, 'entries');
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
        'No. WA': guruInfo.no_wa
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

async function updateGuruPiket(hari, jam, isInKBMPeriod = false) {
  try {
    if (!isInKBMPeriod) {
      guruPiket.textContent = 'Tidak ada data piket';
      return;
    }

    const dataPiket = await fetch(endpointPiket).then(r => r.json());

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
        div.innerHTML = `<a href="https://wa.me/${piket.wa}" target="_blank">${piket.nama}</a>`;
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

async function fetchData() {
  const now = new Date();
  now.setHours(now.getHours() + timeOffset);
  now.setDate(now.getDate() + dayOffset);
  const jam = now.getHours();
  const menit = now.getMinutes();

  let hari = now.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();

  if (hari === 'MINGGU') {
    hari = 'AHAD';
  }

  const shift = jam < 12 ? 'PUTRA' : 'PUTRI';
  const timeNow = `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;

  const isKamis = hari === 'KAMIS';

  try {
    console.log("Fetching data v2.0 (DB_ASC + DB_GURU_MAPEL + KELAS_SHIFT)...");
    const [dataDbAsc, dataDbGuruMapel, dataKelasShift, dataBel, dataBelKhusus] = await Promise.all([
      fetch(endpointDbAsc).then(r => r.json()),
      fetch(endpointDbGuruMapel).then(r => r.json()),
      fetch(endpointKelasShift).then(r => r.json()),
      fetch(endpointBel).then(r => r.json()),
      fetch(endpointBelKhusus).then(r => r.json())
    ]);

    // Store raw data in globals
    globalDbAscData = dataDbAsc;
    globalDbGuruMapelData = dataDbGuruMapel;
    globalKelasShiftData = dataKelasShift;
    
    // Transform WIDE format → LONG format dan join dengan guru info
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

    await updateGuruPiket(hari, jam, isInKBMPeriod);

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

    dataTabel.innerHTML = "";
    sortedJadwal.forEach((row, idx) => {
      const kelas = row.Kelas;
      const mapel = row['Nama Mapel'];
      const guru = row['Nama Lengkap Guru'];
      // Handle both 'No. WA' and 'NO. WA' column names
      const noWaRaw = row['No. WA'] || row['NO. WA'] || '';
      
      // Log for debugging
      if (idx === 0) {
        console.log('First row data:', row);
        console.log('noWaRaw:', noWaRaw, 'Type:', typeof noWaRaw);
      }
      
      // Extract digits only
      const digits = noWaRaw ? noWaRaw.replace(/\D/g, '') : '';
      // Format to 62 prefix (Indonesia)
      const noWa = digits.startsWith('62') ? digits : (digits.startsWith('0') ? '62' + digits.substring(1) : (digits ? '62' + digits : ''));

      let guruDisplay = guru;
      if (digits) {
        let jadwalInfo = isKamis ? " (Jadwal Khusus Hari Kamis)" : "";

        const pesan = `📢 *Assalamualaikum Wr. Wb.*

📝 Mohon izin untuk menginformasikan bahwa *Ust. ${guru}* pada hari ini memiliki jadwal mengajar di *kelas ${kelas}* untuk mapel *${mapel}* pada *Jam ke-${jamKeNow}*${jadwalInfo}.
        
🙏🏻 Atas perhatian dan kerjasamanya diucapkan terima kasih.
        
📢 *Wassalamu'alaikum Wr. Wb.*`;

        const urlWa = `https://wa.me/${noWa}?text=${encodeURIComponent(pesan)}`;
        guruDisplay = `<a href="${urlWa}" target="_blank" class="guru-link">${guru}</a>`;
        console.log(`${guru}: ${noWaRaw} → ${noWa} → ${urlWa}`);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${kelas}</td>
        <td>${mapel}</td>
        <td><strong>${guruDisplay}</strong></td>
      `;
      dataTabel.appendChild(tr);
    });

  } catch (err) {
    console.error("Gagal memuat:", err);
    dataTabel.innerHTML = `<tr><td colspan="3">Gagal memuat data</td></tr>`;
    guruPiket.textContent = 'Tidak ada data piket';
  }
}

setInterval(fetchData, 15000);
fetchData();

function toggleFont() {
  const fonts = ['Roboto', 'Arial', 'Courier New', 'Verdana'];
  const body = document.body;
  let index = fonts.indexOf(body.style.fontFamily);
  index = (index + 1) % fonts.length;
  body.style.fontFamily = fonts[index];
}

let currentFontSize = 0.85;
function adjustFont(change) {
  currentFontSize += change;
  document.querySelector("table").style.fontSize = `${currentFontSize}rem`;
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
      report += `*${row.Kelas}* ${status} ${row['Nama Mapel']}\n`;
    });
  } else {
    report += "Tidak ada jadwal aktif.\n";
  }

  report += `\nKeterangan:\n✅ : Hadir\n⚠️ : Belum Datang\n⛔ : Absen\n`;
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