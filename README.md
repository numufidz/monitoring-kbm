# Guru Piket Monitoring System

**Sistem monitoring dan approval jadwal guru piket (jadwal KBM) real-time**

---

## 📖 Documentation

Dokumentasi proyek ini tersedia dalam bahasa Indonesia:

### Panduan Utama
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Step-by-step migration ke v2.0 (START HERE)
- **[MIGRATION_v2.0.md](MIGRATION_v2.0.md)** - Dokumentasi teknis lengkap
- **[TRANSFORMATION_FUNCTIONS.js](TRANSFORMATION_FUNCTIONS.js)** - Functions yang perlu ditambahkan ke script.js

---

## 🎯 Fitur Utama

### 1. **Monitoring Real-Time**
- Menampilkan guru dan jadwal pelajaran saat ini
- Update otomatis setiap 5 detik
- Informasi kelas, mata pelajaran, dan guru pengajar

### 2. **Sistem Approval**
- Guru piket dapat approve/reject jadwal
- Pilihan status: Hadir, Izin, Sakit, Tanpa Keterangan
- Catatan untuk setiap approval

### 3. **Laporan**
- Generate laporan kehadiran guru per periode
- Export data untuk analisis
- Tracking approval history

### 4. **Data Integration** (v2.0)
- Terintegrasi dengan Google Sheets
- Sheet: DB_ASC (jadwal), DB_GURU_MAPEL (master guru), KELAS_SHIFT (mapping)
- Auto-sync setiap fetch data
- No pre-conversion needed

---

## 🚀 Quick Start

### Prasyarat
- Google Sheets access (spreadsheet shared)
- Modern web browser
- Internet connection

### Setup
1. Buka `index.html` di browser
2. Lihat monitoring jadwal real-time
3. Approve/reject jadwal sesuai kebutuhan

### Spreadsheet Configuration
- **Spreadsheet ID:** `1LgqAr0L66JLtygqTqZRXOMKT06_IMopYlsEGc5nVp4I`
- **Sheets Required:**
  - `DB_ASC` - Schedule (WIDE format)
  - `DB_GURU_MAPEL` - Guru data
  - `KELAS_SHIFT` - Class to shift mapping
  - `PERIODE BEL` - Bell schedule
  - `BEL KHUSUS` - Thursday special schedule
  - `PIKET` - Duty roster

---

## 🔄 Migration Status

### Current Version: v2.0 (IN PROGRESS)

**What's New:**
- ✅ Dynamic data structure using DB_ASC (WIDE), DB_GURU_MAPEL, KELAS_SHIFT
- ✅ No hardcoded values for class-to-shift mapping
- ✅ Single source of truth for all data
- 🔄 Implementation: See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

**Timeline:**
1. Read `IMPLEMENTATION_GUIDE.md` (5 min)
2. Update script.js constants (5 min)
3. Add transformation functions (5 min)
4. Update fetchData() (5 min)
5. Test and verify (10 min)

---

## 📁 Project Structure

```
monitoring-kbm/
├── index.html                    # Main HTML file
├── script.js                     # Main application logic (398 lines)
├── manifest.json                 # PWA configuration
├── icon.png, banner.png, logo.png # Images
│
├── IMPLEMENTATION_GUIDE.md        # 🎯 START HERE for migration
├── MIGRATION_v2.0.md             # Full technical docs
├── TRANSFORMATION_FUNCTIONS.js   # Functions to copy-paste
└── README.md                     # This file
```

---

## 🛠️ Technical Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Data Source:** Google Sheets API (via OpenSheet)
- **Authentication:** None (public sheet access)
- **Deployment:** Static site hosting (Netlify, GitHub Pages, etc.)

---

## 📊 Data Structure (v2.0)

### Input: Google Sheets Sheets

**DB_ASC (WIDE Format):**
```
HARI   | Jam Ke- | 7A     | 7B     | ... | 7D     | ...
-------|---------|--------|--------|-----|--------|-----
SABTU  | 1       | BAR.23 | ASW.37 | ... | THI.40 | ...
```

**DB_GURU_MAPEL:**
```
KODE_DB_ASC | NAMA GURU       | MAPEL_LONG
------------|-----------------|----------
BAR.23      | Budi Raharjo    | Bahasa Inggris
```

**KELAS_SHIFT:**
```
KELAS | SHIFT
------|-------
7A    | PUTRA
7D    | PUTRI
```

### Output: currentScheduleData (LONG Format)
```javascript
[
  {
    Hari: "SABTU",
    "Jam Ke-": "1",
    Shift: "PUTRA",
    Kelas: "7A",
    KODE_DB_ASC: "BAR.23",
    "Nama Mapel": "Bahasa Inggris",
    "Nama Lengkap Guru": "Budi Raharjo"
  },
  ...
]
```

---

## 🔗 Related Projects

Proyek terkait yang menggunakan spreadsheet yang sama:
- **[tv-monitoring-kbm](../tv-monitoring-kbm)** - Monitoring untuk tampilan TV kantor guru (v2.0 completed)

---

## 📞 Support

### Dokumentasi
- Lihat `IMPLEMENTATION_GUIDE.md` untuk step-by-step migration
- Lihat `MIGRATION_v2.0.md` untuk technical details
- Check `TRANSFORMATION_FUNCTIONS.js` untuk code snippets

### Troubleshooting
- Buka browser console (F12) untuk error messages
- Check Network tab untuk verify data fetches
- Lihat ini untuk common issues: [MIGRATION_v2.0.md](MIGRATION_v2.0.md#troubleshooting)

---

## 📝 License

Same as parent project

---

## 🎯 Next Steps

1. **Read:** [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) (5 minutes)
2. **Implement:** Follow step-by-step guide in the file (20 minutes)
3. **Test:** Verify all features work (10 minutes)
4. **Done!** Ready to use v2.0

---

**Last Updated:** December 14, 2024  
**Version:** 2.0 (In Implementation)  
**Status:** Ready for Code Migration  

Spreadsheet masih belum punya KELAS_SHIFT sheet? Lihat `MIGRATION_v2.0.md` untuk struktur yang dibutuhkan.
