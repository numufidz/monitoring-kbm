# Monitoring KBM - Guru Piket System

**Sistem monitoring real-time jadwal guru piket dan jadwal pelajaran**

---

## ✅ Status: Production Ready

**Version 2.0** | Last Updated: Desember 2025

- ✅ WhatsApp integration dengan emoji work sempurna
- ✅ Real-time monitoring jadwal
- ✅ Data sync otomatis dari Google Sheets
- ✅ Responsive mobile & desktop

---

## 🎯 Fitur

### 📱 WhatsApp Integration
- **Klik nama guru → buka WhatsApp langsung**
- Pesan otomatis dengan info jadwal
- Emoji work dengan sempurna (📢 📝 🙏🏻)
- Format professional dengan markdown

### 📊 Monitoring Real-Time
- Jadwal guru dan kelas per jam
- Update otomatis setiap 5 detik
- Filter by shift (Putra/Putri)
- Informasi lengkap: guru, mapel, jam

### 👥 Guru Piket
- Daftar guru piket per shift (PAGI/SIANG)
- Quick contact via WhatsApp
- Auto-update sesuai waktu & hari

### 🔄 Data Integration (v2.0)
- **Google Sheets DataSource:**
  - `DB_ASC` - Jadwal WIDE format (HARI, Jam Ke-, Kelas)
  - `DB_GURU_MAPEL` - Master guru (nama, mapel, No. WA)
  - `KELAS_SHIFT` - Class-to-shift mapping (7A=PUTRA, 7D=PUTRI)
  - `PERIODE BEL` - Bell schedule reguler
  - `BEL KHUSUS` - Bell schedule Kamis
  - `PIKET` - Guru piket roster

- **Transformasi:** WIDE format → LONG format on-the-fly
- **Real-time:** No pre-conversion needed
- **Auto-sync:** Data updated setiap fetch

---

## 🚀 Deployment

**Live:** [monitoring-kbm.netlify.app](https://monitoring-kbm.netlify.app)

Hosted di Netlify with auto-deploy from GitHub.

---

## 🔧 Technical Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Data:** Google Sheets (OpenSheet API)
- **Hosting:** Netlify (static site)
- **Mobile:** Responsive PWA-ready

---

## 📁 File Structure

```
monitoring-kbm/
├── index.html              # Main UI
├── script.js               # Logic & data handling
├── manifest.json           # PWA manifest
├── .netlify.toml          # Netlify config (UTF-8 headers)
├── README.md              # This file
└── [static assets]        # logo, icon, banner
```

---

## 🛠️ Development

### Local Testing
```bash
npx serve .
# Opens on http://localhost:3000 (or available port)
```

### Git Workflow
```bash
git add .
git commit -m "description"
git push origin main
```

Auto-deploy triggers on push to GitHub.

---

## 📝 Data Schema (Google Sheets)

### DB_ASC
WIDE format - columns: HARI, Jam Ke-, 7A, 7B, 7C, ... 9H (guru codes)

### DB_GURU_MAPEL
LONG format - columns: KODE_GURU, NAMA GURU, KODE_DB_ASC, MAPEL_LONG, MAPEL_SHORT, NO. WA

### KELAS_SHIFT
LONG format - columns: KELAS, SHIFT (PUTRA/PUTRI mapping)

### PERIODE BEL
Bell schedule - columns: Shift, Jam Ke-, Jam Mulai, Jam Selesai

### BEL KHUSUS
Thursday schedule - columns: Shift, Jam Ke-, Jam Mulai, Jam Selesai

### PIKET
Teacher roster - columns: HARI, PIKET SHIFT PAGI, WA PIKET SHIFT PAGI, PIKET SHIFT SIANG, WA PIKET SHIFT SIANG

---

## 🐛 Known Issues & Solutions

**Emoji corrupt on Android Chrome?**
- ✅ SOLVED: Use `window.location.href` instead of `<a href>` attribute
- Bypass Chrome URL encoding quirk

**Data tidak sync?**
- Check Google Sheets URL & sheet names
- Verify spreadsheet sharing permissions
- Check browser console for API errors

**WhatsApp link tidak trigger?**
- Install WhatsApp di device
- Check browser WhatsApp Web app compatibility

---

## 📞 Support

For issues or questions:
1. Check Google Sheets data validity
2. Verify OpenSheet API connectivity
3. Check browser console (F12) for errors
4. Test in desktop browser first

---

## 📄 License

Project for MTs. An-Nur Bululawang

---

**Last Commit:** 061d82b - v2.0 with working emoji + window.location WhatsApp handler
