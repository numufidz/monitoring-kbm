# MIGRATION v2.0 - Guru Piket Monitoring System

**Status:** Implementation in progress

---

## 📋 Overview

This document outlines the migration of Guru Piket monitoring system from old DATABASE sheet to optimized v2.0 structure using:
- **DB_ASC** (WIDE format schedule)
- **DB_GURU_MAPEL** (guru master data)
- **KELAS_SHIFT** (class-to-shift mapping)

---

## ✅ Migration Steps

### Phase 1: Update Endpoints & Globals

**File:** `script.js`

**Changes:**
- Replace single `endpointDatabase` with three new endpoints:
  - `endpointDbAsc` - Schedule data (WIDE format)
  - `endpointDbGuruMapel` - Guru master data
  - `endpointKelasShift` - Class-to-shift mapping

- Add new global variables:
  - `globalDbAscData` - Raw WIDE format data
  - `globalDbGuruMapelData` - Raw guru data
  - `globalKelasShiftData` - Raw shift mapping data
  - `globalGuruLookupMap` - Map<KODE_DB_ASC, guru_info>
  - `globalKelasShiftMap` - Map<KELAS, SHIFT>

### Phase 2: Add Transformation Functions

**Functions to add:**

#### `createGuruLookupMap(dbGuruMapelData)`
- Builds Map<KODE_DB_ASC, {nama_guru, mapel}>
- Used for joining schedule data with guru information

#### `createKelasShiftMap(kelasShiftData)`
- Builds Map<KELAS, SHIFT>
- Maps class codes to their shift (PUTRA/PUTRI)

#### `transformDbAscWideToLong(dbAscWideData, guruLookupMap, kelasShiftMap)`
- Converts WIDE format to LONG format
- Input: WIDE format {HARI, Jam Ke-, 7A: code, 7B: code, ...}
- Output: Array of {Hari, Jam Ke-, Shift, Kelas, KODE_DB_ASC, guru_info...}
- Joins guru information via lookup map
- Gets shift from kelas-shift mapping

### Phase 3: Update Data Fetching

**Update `fetchData()` function to:**
- Fetch from `endpointDbAsc`, `endpointDbGuruMapel`, `endpointKelasShift` in parallel
- Build `globalGuruLookupMap` via `createGuruLookupMap()`
- Build `globalKelasShiftMap` via `createKelasShiftMap()`
- Transform WIDE → LONG via `transformDbAscWideToLong()`
- Store result in `currentScheduleData`

### Phase 4: Update UI Logic

**No changes needed for:**
- Filter logic (uses same Hari, Jam Ke-, Shift fields)
- Rendering logic (uses same Kelas, guru names, subjects)
- Guru piket display

---

## 📊 Data Structure Mapping

### Before (Old DATABASE)
```json
{
  "Hari": "SABTU",
  "Jam Ke-": "1",
  "7A": "BAR.23",
  "7B": "ASW.37",
  ...
}
```

### After (v2.0 Transformed)
```json
{
  "Hari": "SABTU",
  "Jam Ke-": "1",
  "Shift": "PUTRA",
  "Kelas": "7A",
  "KODE_DB_ASC": "BAR.23",
  "Nama Mapel": "Bahasa Inggris",
  "Nama Lengkap Guru": "Budi Raharjo"
}
```

---

## 🔄 Data Flow (v2.0)

```
Google Sheets (3 sheets)
├── DB_ASC (WIDE: HARI, Jam Ke-, 7A-9H)
├── DB_GURU_MAPEL (LONG: KODE_DB_ASC, nama, mapel)
└── KELAS_SHIFT (LONG: KELAS, SHIFT)

         ↓ fetch() parallel
         
script.js fetchData()
├── Create guru lookup: Map<KODE_DB_ASC, guru_info>
├── Create kelas-shift mapping: Map<KELAS, SHIFT>
├── Transform WIDE → LONG
├── Join guru info via KODE_DB_ASC
└── currentScheduleData (LONG format)

         ↓ filter by Hari/Jam Ke-
         
UI Rendering (unchanged)
├── Display guru piket
├── Show schedule for current time
└── Update every 15 seconds
```

---

## 🎯 Benefits

✅ **Single Source of Truth** - All data in Google Sheets, no hardcodes  
✅ **Flexible** - Change class assignments without code redeploy  
✅ **Maintainable** - Clear separation of concerns  
✅ **Scalable** - Easy to add new classes or modify assignments  
✅ **Reusable** - Same functions as TV monitoring system  

---

## 📝 Implementation Checklist

- [ ] Update endpoints (lines 1-7)
- [ ] Update global variables (lines 20-30)
- [ ] Add `createGuruLookupMap()` function
- [ ] Add `createKelasShiftMap()` function
- [ ] Add `transformDbAscWideToLong()` function
- [ ] Update `fetchData()` to use new functions
- [ ] Test with actual Google Sheets data
- [ ] Verify guru piket display works
- [ ] Commit & push to GitHub

---

## 🚀 Testing

**Manual testing:**
1. Open browser console (F12)
2. Check for fetch errors
3. Verify transformation creates correct data structure
4. Test filtering by Hari/Jam Ke-
5. Check guru piket names display correctly

---

**Last Updated:** December 14, 2024  
**Spreadsheet ID:** 1LgqAr0L66JLtygqTqZRXOMKT06_IMopYlsEGc5nVp4I  
**Status:** Ready for implementation
