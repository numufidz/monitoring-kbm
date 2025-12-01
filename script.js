const spreadsheetID = '1LgqAr0L66JLtygqTqZRXOMKT06_IMopYlsEGc5nVp4I';
const sheetDatabase = 'DATABASE';
const sheetBel = 'PERIODE BEL';
const sheetBelKhusus = 'BEL KHUSUS'; // Tambahkan sheet BEL KHUSUS
const sheetPiket = 'PIKET'; // Tambahkan sheet PIKET

const endpointDatabase = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDatabase}`;
const endpointBel = `https://opensheet.elk.sh/${spreadsheetID}/${sheetBel}`;
const endpointBelKhusus = `https://opensheet.elk.sh/${spreadsheetID}/${sheetBelKhusus}`; // Tambahkan endpoint BEL KHUSUS
const endpointPiket = `https://opensheet.elk.sh/${spreadsheetID}/${sheetPiket}`; // Tambahkan endpoint PIKET

const clock = document.getElementById("clock");
const dayDate = document.getElementById("dayDate");
const shiftKBM = document.getElementById("shiftKBM");
const jamKBM = document.getElementById("jamKBM");
const dataTabel = document.getElementById("dataTabel");
const guruPiket = document.getElementById("guruPiket"); // Tambahkan elemen guru piket

let timeOffset = 0;
let dayOffset = 0;
let currentScheduleData = []; // Store current schedule for reporting

const themes = [
  "#0f2027", "#1e1e2f", "#2c3e50", "#3d3d3d", "#1a1a1a",
  "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
  "linear-gradient(to right, #2c3e50, #4ca1af)",
  "linear-gradient(to right, #141E30, #243B55)",
  "linear-gradient(to right, #232526, #414345)",
  "linear-gradient(to right, #373B44, #4286f4)"
];

let currentTheme = 0;
function nextTheme() {
  const theme = themes[currentTheme];
  document.body.style.background = theme;
  currentTheme = (currentTheme + 1) % themes.length;
}

function updateClock() {
  const now = new Date();
  now.setHours(now.getHours() + timeOffset);
  now.setDate(now.getDate() + dayOffset);
  clock.textContent = now.toLocaleTimeString('id-ID', { hour12: false });

  // Ambil tanggal dengan format lengkap
  let dateString = now.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Ganti "Minggu" dengan "Ahad" untuk tampilan
  dateString = dateString.replace(/^Minggu,/, 'Ahad,');

  dayDate.textContent = dateString;
}

setInterval(updateClock, 1000);
updateClock();

// Fungsi untuk mengambil dan menampilkan guru piket
async function updateGuruPiket(hari, jam, isInKBMPeriod = false) {
  try {
    // Jika tidak dalam periode KBM, tampilkan pesan "Tidak ada data piket"
    if (!isInKBMPeriod) {
      guruPiket.textContent = 'Tidak ada data piket';
      return;
    }

    const dataPiket = await fetch(endpointPiket).then(r => r.json());

    // Tentukan shift berdasarkan jam
    const shift = jam < 12 ? 'PAGI' : 'SIANG';
    const shiftColumn = shift === 'PAGI' ? 'PIKET SHIFT PAGI' : 'PIKET SHIFT SIANG';
    const waColumn = shift === 'PAGI' ? 'WA PIKET SHIFT PAGI' : 'WA PIKET SHIFT SIANG';

    // Cari data piket untuk hari ini
    const piketHariIni = dataPiket.filter(p => p.HARI && p.HARI.toUpperCase() === hari);

    if (piketHariIni.length === 0) {
      guruPiket.textContent = 'Tidak ada data piket';
      return;
    }

    // Ambil guru piket dan nomor WA untuk shift yang sesuai
    const daftarPiketData = piketHariIni
      .filter(p => p[shiftColumn] && p[shiftColumn].trim() !== '')
      .map(p => ({
        nama: p[shiftColumn].trim(),
        wa: p[waColumn] ? p[waColumn].replace(/\D/g, '') : null // ambil hanya angka
      }));

    if (daftarPiketData.length === 0) {
      guruPiket.textContent = 'Tidak ada piket';
      return;
    }

    // Buat HTML untuk menampilkan guru piket dengan link WA
    guruPiket.innerHTML = '';
    daftarPiketData.forEach(piket => {
      const div = document.createElement('div');
      if (piket.wa) {
        // Jika ada nomor WA, buat sebagai link
        div.innerHTML = `<a href="https://wa.me/${piket.wa}" target="_blank">${piket.nama}</a>`;
      } else {
        // Jika tidak ada nomor WA, tampilkan nama biasa
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

  // Ambil nama hari dalam bahasa Indonesia
  let hari = now.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();

  // Konversi MINGGU menjadi AHAD untuk menyesuaikan dengan spreadsheet
  if (hari === 'MINGGU') {
    hari = 'AHAD';
  }

  const shift = jam < 12 ? 'PUTRA' : 'PUTRI';
  const timeNow = `${jam.toString().padStart(2, '0')}:${menit.toString().padStart(2, '0')}`;

  // Cek apakah hari ini Kamis
  const isKamis = hari === 'KAMIS';

  try {
    const [dataJadwal, dataBel, dataBelKhusus] = await Promise.all([
      fetch(endpointDatabase).then(r => r.json()),
      fetch(endpointBel).then(r => r.json()),
      fetch(endpointBelKhusus).then(r => r.json()) // Tambahkan fetch untuk BEL KHUSUS
    ]);

    // Pilih data bel sesuai hari (Kamis gunakan BEL KHUSUS, lainnya gunakan PERIODE BEL)
    const belData = isKamis ? dataBelKhusus : dataBel;

    const jadwalShift = belData.filter(p => p.Shift === shift);
    let periodeSekarang = null;

    for (let p of jadwalShift) {
      if (timeNow >= p['Jam Mulai'] && timeNow <= p['Jam Selesai']) {
        periodeSekarang = p;
        break;
      }
    }

    // Cek apakah sedang dalam periode KBM (bukan istirahat dan ada periode)
    const isInKBMPeriod = periodeSekarang && periodeSekarang['Jam Ke-'] !== 'IST';

    // Update guru piket dengan parameter baru
    await updateGuruPiket(hari, jam, isInKBMPeriod);

    // Update tampilan shift KBM
    shiftKBM.textContent = `Jadwal KBM ${shift}`;

    if (!periodeSekarang) {
      jamKBM.textContent = `Di luar jam KBM`;
      dataTabel.innerHTML = `<tr><td colspan="3">Tidak ada KBM saat ini</td></tr>`;
      return;
    }

    if (periodeSekarang['Jam Ke-'] === 'IST') {
      jamKBM.textContent = `Jam ISTIRAHAT`;
      dataTabel.innerHTML = `<tr><td colspan="3">Sedang istirahat</td></tr>`;
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
      return;
    }

    // Urutkan jadwal berdasarkan nama kelas
    const sortedJadwal = jadwalSekarang.sort((a, b) => {
      const regex = /^(\d+)([A-Z]*)$/i;
      const [, levelA, subA] = a.Kelas.match(regex) || [null, 0, ""];
      const [, levelB, subB] = b.Kelas.match(regex) || [null, 0, ""];
      const numA = parseInt(levelA);
      const numB = parseInt(levelB);
      if (numA !== numB) return numA - numB;
      return subA.localeCompare(subB);
    });

    currentScheduleData = sortedJadwal; // Update global data

    dataTabel.innerHTML = "";
    sortedJadwal.forEach(row => {
      const kelas = row.Kelas;
      const mapel = row['Nama Mapel'];
      const guru = row['Nama Lengkap Guru'];
      const noWa = row['No. WA']?.replace(/\D/g, ''); // ambil hanya angka

      let guruDisplay = guru;
      if (noWa) {
        // Tambahkan informasi jadwal khusus ke pesan jika hari Kamis
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
    // Jika terjadi error, set guru piket ke "Tidak ada data piket"
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
const btnWa = document.querySelector('.btn-wa'); // Select WA button

function openReportModal() {
  reportModal.style.display = 'flex';
  btnWa.disabled = true; // Disable WA button initially
  renderReportTable();
}

function closeReportModal() {
  reportModal.style.display = 'none';
}

// Close modal when clicking outside
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
    const safeId = index; // Use index as unique ID part

    tr.innerHTML = `
      <td>${row.Kelas}</td>
      <td>
        ${row['Nama Mapel']}
        <span class="teacher-name-small">${row['Nama Lengkap Guru']}</span>
      </td>
      <td>
        <div class="status-options">
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="✅" checked> ✅ Hadir
          </label>
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="⚠️"> ⚠️ Telat
          </label>
          <label class="status-label">
            <input type="radio" name="status-${safeId}" value="⛔"> ⛔ Izin/Alfa
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

  // Format Date
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  let dateString = now.toLocaleDateString('id-ID', dateOptions);
  dateString = dateString.replace(/^Minggu,/, 'Ahad,');

  // Get Shift info from DOM
  const shiftText = shiftKBM.textContent.replace('Jadwal KBM ', '');
  const jamText = jamKBM.textContent;

  // Get Guru Piket info
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

  // Iterate rows to get status
  if (currentScheduleData && currentScheduleData.length > 0) {
    currentScheduleData.forEach((row, index) => {
      const status = document.querySelector(`input[name="status-${index}"]:checked`).value;
      report += `*${row.Kelas}* ${status} ${row['Nama Mapel']}\n`;
    });
  } else {
    report += "Tidak ada jadwal aktif.\n";
  }

  report += `\nKeterangan:\n✅ : Hadir\n⚠️ : Belum Datang\n⛔ : Izin/Alfa\n`;
  report += `\nLink Monitoring: https://monitoring-kbm.netlify.app/`;

  return report;
}

async function copyReportText() {
  const text = generateReportText();
  try {
    await navigator.clipboard.writeText(text);
    alert('Laporan berhasil disalin! Silakan klik tombol "Laporkan ke WhatsApp" dan tempel (Paste) pesan di kolom chat.');
    btnWa.disabled = false; // Enable WA button
  } catch (err) {
    console.error('Gagal menyalin:', err);
    alert('Gagal menyalin teks. Mohon salin manual.');
  }
}

async function sendToWhatsApp() {
  const text = generateReportText();
  try {
    await navigator.clipboard.writeText(text);
    // Open WhatsApp Group
    window.open('https://chat.whatsapp.com/5vTwMCXv9ZY6pBA0aDIGB2', '_blank');
  } catch (err) {
    console.error('Gagal menyalin:', err);
    alert('Gagal menyalin teks laporan. Namun akan tetap membuka WhatsApp.');
    window.open('https://chat.whatsapp.com/5vTwMCXv9ZY6pBA0aDIGB2', '_blank');
  }
}