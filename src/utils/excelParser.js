import * as XLSX from "xlsx";

/**
 * Parses the Excel ArrayBuffer into structured presence records.
 * Skips rows dynamically until finding the header with 'PRESENSI' and 'NOMOR PEGAWAI' or 'NAMA'.
 * 
 * @param {ArrayBuffer} arrayBuffer The binary data of the Excel file
 * @returns {Array} List of raw presence records
 */
export function parsePresensiExcel(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIndex = -1;
  let headers = [];

  // Find the row containing 'PRESENSI' and ('NOMOR PEGAWAI' or 'NAMA')
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (Array.isArray(row)) {
      const hasPresensi = row.some(
        (cell) => cell && cell.toString().toUpperCase().trim() === "PRESENSI"
      );
      const hasNoPegawai = row.some(
        (cell) => cell && cell.toString().toUpperCase().trim() === "NOMOR PEGAWAI"
      );
      const hasNama = row.some(
        (cell) => cell && cell.toString().toUpperCase().trim() === "NAMA"
      );

      if (hasPresensi && (hasNoPegawai || hasNama)) {
        headerRowIndex = i;
        headers = row.map((cell) =>
          cell ? cell.toString().toUpperCase().trim() : ""
        );
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "Format berkas Excel tidak sesuai. Baris header dengan kolom 'PRESENSI' dan 'NOMOR PEGAWAI' tidak ditemukan."
    );
  }

  const presensiColIdx = headers.indexOf("PRESENSI");
  const namaColIdx = headers.indexOf("NAMA");
  const noPegawaiColIdx = headers.indexOf("NOMOR PEGAWAI");
  const keteranganColIdx = headers.indexOf("KETERANGAN");
  const unitKerjaColIdx = headers.indexOf("NAMA UNIT KERJA");

  const records = [];
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (Array.isArray(row) && row[presensiColIdx]) {
      const presensiRaw = row[presensiColIdx];
      const namaVal =
        namaColIdx !== -1 && row[namaColIdx]
          ? row[namaColIdx].toString().trim()
          : "";
      const noPegawaiVal =
        noPegawaiColIdx !== -1 && row[noPegawaiColIdx]
          ? row[noPegawaiColIdx].toString().trim()
          : "";
      const keteranganVal =
        keteranganColIdx !== -1 && row[keteranganColIdx]
          ? row[keteranganColIdx].toString().trim()
          : "";
      const unitKerjaVal =
        unitKerjaColIdx !== -1 && row[unitKerjaColIdx]
          ? row[unitKerjaColIdx].toString().trim()
          : "";

      records.push({
        noPegawai: noPegawaiVal,
        nama: namaVal,
        presensi: presensiRaw,
        keterangan: keteranganVal,
        unitKerja: unitKerjaVal,
      });
    }
  }

  return records;
}

/**
 * Parses a cell value into a valid JS Date object.
 * Handles Excel serial numbers, ISO strings, standard date strings, 
 * and custom sub-second space-separated timestamps.
 * 
 * @param {any} val The value to parse
 * @returns {Date|null} Valid Date object or null
 */
export function parsePresensiDate(val) {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) return val;

  if (typeof val === "number") {
    // Excel serial date to JS Date
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const str = val.toString().trim();

  // Try direct parsing
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Try replacing space with T for ISO format
  d = new Date(str.replace(" ", "T"));
  if (!isNaN(d.getTime())) return d;

  // Manual fallback parsing
  try {
    const parts = str.split(/\s+/);
    const dateParts = parts[0].split("-");
    const timeParts = parts[1] ? parts[1].split(":") : ["00", "00", "00"];
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const secondParts = timeParts[2] ? timeParts[2].split(".") : ["00"];
    const second = parseInt(secondParts[0], 10);
    const ms = secondParts[1]
      ? parseInt(secondParts[1].substring(0, 3).padEnd(3, "0"), 10)
      : 0;

    const parsedDate = new Date(year, month, day, hour, minute, second, ms);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    // Ignore error
  }

  return null;
}

/**
 * Groups presence records by date and calculates daily presence, daily clock-out, 
 * total daily working hours, and monthly summaries.
 * 
 * @param {Array} records Processed presence records
 * @returns {Object} Calculated details (employeeName, employeeId, unitKerja, days, months)
 */
export function calculateJamKerja(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      employeeName: "",
      employeeId: "",
      unitKerja: "",
      days: [],
      months: [],
    };
  }

  let employeeName = "";
  let employeeId = "";
  let unitKerja = "";

  const recordsByDate = {}; // dateStr -> Array of Date objects

  records.forEach((r) => {
    const d = parsePresensiDate(r.presensi);
    if (d && !isNaN(d.getTime())) {
      if (!employeeName && r.nama) employeeName = r.nama;
      if (!employeeId && r.noPegawai) employeeId = r.noPegawai;
      if (!unitKerja && r.unitKerja) unitKerja = r.unitKerja;

      // Extract date string YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${date}`;

      if (!recordsByDate[dateStr]) {
        recordsByDate[dateStr] = [];
      }
      recordsByDate[dateStr].push(d);
    }
  });

  // Calculate day details
  const days = Object.keys(recordsByDate)
    .map((dateStr) => {
      const dates = recordsByDate[dateStr].sort((a, b) => a.getTime() - b.getTime());
      const hadir = dates[0];
      const pulang = dates[dates.length - 1];

      const formatTime = (dateObj) => {
        const h = String(dateObj.getHours()).padStart(2, "0");
        const m = String(dateObj.getMinutes()).padStart(2, "0");
        const s = String(dateObj.getSeconds()).padStart(2, "0");
        return `${h}:${m}:${s}`;
      };

      const diffMs = pulang.getTime() - hadir.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);

      const monthName = hadir.toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });
      const monthKey = `${hadir.getFullYear()}-${String(
        hadir.getMonth() + 1
      ).padStart(2, "0")}`;
      const dayName = hadir.toLocaleString("id-ID", { weekday: "long" });

      return {
        dateStr,
        dayName,
        hadirTime: formatTime(hadir),
        pulangTime: formatTime(pulang),
        totalHours: Number(totalHours.toFixed(2)),
        monthKey,
        monthName,
        dateObj: hadir,
      };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Aggregate monthly totals
  const monthsMap = {};
  days.forEach((day) => {
    if (!monthsMap[day.monthKey]) {
      monthsMap[day.monthKey] = {
        monthKey: day.monthKey,
        monthName: day.monthName,
        totalHours: 0,
        daysCount: 0,
      };
    }
    monthsMap[day.monthKey].totalHours += day.totalHours;
    monthsMap[day.monthKey].daysCount += 1;
  });

  const months = Object.values(monthsMap)
    .map((m) => ({
      ...m,
      totalHours: Number(m.totalHours.toFixed(2)),
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return {
    employeeName,
    employeeId,
    unitKerja,
    days,
    months,
  };
}
