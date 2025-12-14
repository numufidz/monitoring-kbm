// Migrasi v2.0: Add these functions ke monitoring-kbm/script.js
// Insert ini sebelum async function fetchData()

/**
 * Build guru lookup map dari DB_GURU_MAPEL
 * Maps KODE_DB_ASC → {nama_guru, mapel}
 */
function createGuruLookupMap(dbGuruMapelData) {
  const map = new Map();
  if (!dbGuruMapelData || !Array.isArray(dbGuruMapelData)) return map;
  
  dbGuruMapelData.forEach(row => {
    const kode = row['KODE_DB_ASC'];
    if (kode && kode.trim()) {
      map.set(kode.trim(), {
        nama_guru: row['NAMA GURU'] || '',
        mapel: row['MAPEL_LONG'] || row['MAPEL_SHORT'] || ''
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
 * LONG: [{Hari: "SABTU", "Jam Ke-": "1", Shift: "PUTRA", Kelas: "7A", KODE_DB_ASC: "BAR.23", nama_guru: "...", mapel: "..."}, ...]
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
      const guruInfo = guruLookupMap.get(kodeTrim) || { nama_guru: '', mapel: '' };
      const shift = kelasShiftMap.get(kelas) || 'UNKNOWN';
      
      result.push({
        Hari: hari,
        'Jam Ke-': jamKe.toString(),
        Shift: shift,
        Kelas: kelas,
        KODE_DB_ASC: kodeTrim,
        'Nama Mapel': guruInfo.mapel,
        'Nama Lengkap Guru': guruInfo.nama_guru
      });
    });
  });
  
  return result;
}
