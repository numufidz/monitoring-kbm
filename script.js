const spreadsheetID = '1LgqAr0L66JLtygqTqZRXOMKT06_IMopYlsEGc5nVp4I';
const sheetDatabase = 'DATABASE';
const sheetBel = 'PERIODE BEL';
const sheetBelKhusus = 'BEL KHUSUS';
const sheetPiket = 'PIKET';

const endpointDatabase = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDatabase}`;
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

const themes = [
  "#0f2027", "#1e1e2f", "#2c3e50", "#3d3d3d", "#1a1a1a",
  "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
  "linear-gradient(to right, #2c3e50, #4ca1af)",
  "linear-gradient(to right, #141E30, #243B55)",
  "linear-gradient(to right, #232526, #414345)",
  "linear-gradient(to right, #373B44, #4286f4)"
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
    const [dataJadwal, dataBel, dataBelKhusus] = await Promise.all([
      fetch(endpointDatabase).then(r => r.json()),
      fetch(endpointBel).then(r => r.json()),
      fetch(endpointBelKhusus).then(r => r.json())
    ]);

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
    sortedJadwal.forEach(row => {
      const kelas = row.Kelas;
      const mapel = row['Nama Mapel'];
      const guru = row['Nama Lengkap Guru'];
      const noWa = row['No. WA']?.replace(/\D/g, '');

      let guruDisplay = guru;
      if (noWa) {
        let jadwalInfo = isKamis ? " (Jadwal Khusus Hari Kamis)" : "";

        const pesan = `📢 *Assalamualaikum Wr. Wb.*

📝 Mohon izin untuk menginformasikan bahwa *Ust. ${guru}* pada hari ini memiliki jadwal mengajar di *kelas ${kelas}* untuk mapel *${mapel}* pada *Jam ke-${jamKeNow}*${jadwalInfo}.
        
🙏🏻 Atas perhatian dan kerjasamanya diucapkan terima kasih.
        
📢 *Wassalamu'alaikum Wr. Wb.*`;

        const urlWa = `https://wa.me/${noWa}?text=${encodeURIComponent(pesan)}`;
        guruDisplay = `<a href="${urlWa}" target="_blank" style="color:#00ffff;">${guru}</a>`;
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
    piketNames.push(el.textContent.trim());
  });
  const piketString = piketNames.join('\n');

  let report = `*${dateString}*\n`;
  report += `*Jadwal KBM ${shiftText}*\n`;
  report += `*${jamText}*\n`;
  report += `*Guru Piket:*\n${piketString}\n\n`;

  if (currentScheduleData && currentScheduleData.length > 0) {
    currentScheduleData.forEach((row, index) => {
      const status = document.querySelector(`input[name="status-${index}"]:checked`).value;
      report += `*${row.Kelas}* ${status} ${row['Nama Mapel']}\n`;
    });
  } else {
    report += "Tidak ada jadwal aktif.\n";
  }

  report += `\nKeterangan:\n✅ : Hadir\n⚠️ : Belum Datang\n⛔ : Absen\n`;
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