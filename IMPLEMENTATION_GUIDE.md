# Implementation Guide - Guru Piket Migration v2.0

**Status:** Ready for implementation

---

## 📋 Quick Summary

Migrate `monitoring-kbm` from old `DATABASE` sheet to optimized v2.0 structure using:
- `DB_ASC` (WIDE format schedule)
- `DB_GURU_MAPEL` (guru master data)
- `KELAS_SHIFT` (class-to-shift mapping)

**Time Estimate:** 20-30 minutes

---

## 🚀 Implementation Steps

### Step 1: Update Sheet Constants (Lines 1-9)

**Current:**
```javascript
const sheetDatabase = 'DATABASE';
const endpointDatabase = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDatabase}`;
```

**Replace with:**
```javascript
const sheetDbAsc = 'DB_ASC';
const sheetDbGuruMapel = 'DB_GURU_MAPEL';
const sheetKelasShift = 'KELAS_SHIFT';

const endpointDbAsc = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDbAsc}`;
const endpointDbGuruMapel = `https://opensheet.elk.sh/${spreadsheetID}/${sheetDbGuruMapel}`;
const endpointKelasShift = `https://opensheet.elk.sh/${spreadsheetID}/${sheetKelasShift}`;
```

---

### Step 2: Add Global Variables

**Add after line ~20 (before `let currentScheduleData`):**

```javascript
// v2.0: New data structures
let globalDbAscData = null;
let globalDbGuruMapelData = null;
let globalKelasShiftData = null;
let globalKelasShiftMap = null;
let globalGuruLookupMap = null;
```

---

### Step 3: Add Transformation Functions

**Find the location:** Before `async function fetchData()`

**Copy entire content from `TRANSFORMATION_FUNCTIONS.js`** and paste here.

This adds 3 functions:
- `createGuruLookupMap()`
- `createKelasShiftMap()`
- `transformDbAscWideToLong()`

---

### Step 4: Update fetchData() Function

**Current fetch:**
```javascript
const [dataJadwal, dataBel, dataBelKhusus] = await Promise.all([
  fetch(endpointDatabase).then(r => r.json()),
  fetch(endpointBel).then(r => r.json()),
  fetch(endpointBelKhusus).then(r => r.json())
]);
```

**Replace with:**
```javascript
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

// Build lookup maps and transform
globalGuruLookupMap = createGuruLookupMap(dataDbGuruMapel);
globalKelasShiftMap = createKelasShiftMap(dataKelasShift);
const dataJadwal = transformDbAscWideToLong(dataDbAsc, globalGuruLookupMap, globalKelasShiftMap);
```

---

### Step 5: Verify No Other Changes Needed

✅ **No changes required for:**
- Filter logic (uses same Hari, Jam Ke-, Shift fields)
- Rendering logic (uses same Kelas, Nama Mapel, Nama Lengkap Guru)
- Guru piket display
- Report generation
- Approval system

All these will work with the transformed data automatically!

---

## 📝 Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| script.js | 1-9 | Update sheet names & endpoints |
| script.js | ~20 | Add global variables |
| script.js | ~150-220 | Add transformation functions |
| script.js | ~225-250 | Update fetchData() |

---

## ✅ Verification Checklist

After implementing:

- [ ] No JavaScript console errors
- [ ] Data fetches correctly (check Network tab in DevTools)
- [ ] currentScheduleData contains objects with correct fields
- [ ] Guru piket names display correctly
- [ ] Schedule filtering works by Hari/Jam Ke-
- [ ] Approval system shows correct class names and teachers
- [ ] Report generation works

---

## 🧪 Quick Testing

Open browser console (F12) and run:
```javascript
console.log('globalDbAscData:', globalDbAscData);
console.log('globalGuruLookupMap:', globalGuruLookupMap);
console.log('globalKelasShiftMap:', globalKelasShiftMap);
console.log('currentScheduleData:', currentScheduleData);
```

Expected:
- `globalDbAscData` - Array of objects with HARI, Jam Ke-, 7A-9H columns
- `globalGuruLookupMap` - Map with KODE_DB_ASC as keys
- `globalKelasShiftMap` - Map with class codes (7A, 7B, etc.) as keys
- `currentScheduleData` - Array of transformed objects with guru info joined

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| `undefined is not a function` | Check if transformation functions are pasted before fetchData() |
| `Cannot read property 'HARI'` | Verify DB_ASC sheet exists and has correct column names |
| `Map is empty` | Check if KELAS_SHIFT sheet exists with KELAS and SHIFT columns |
| `Guru names not showing` | Verify DB_GURU_MAPEL sheet exists and KODE_DB_ASC values match |

---

## 📚 Reference Files

- `TRANSFORMATION_FUNCTIONS.js` - Copy these 3 functions into script.js
- `MIGRATION_v2.0.md` - Full migration documentation

---

**Ready to implement? Let's do it!** 🚀
