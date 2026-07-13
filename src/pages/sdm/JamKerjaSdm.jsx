import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Upload,
  Trash2,
  User,
  FileSpreadsheet,
  Clock,
  ChevronRight,
} from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import Table from "../../components/Table";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { parsePresensiExcel, calculateJamKerja } from "../../utils/excelParser";
import { useConfirm } from "../../context/ConfirmContext";

// Helper to check compliance for TENDIK
const checkTendikCompliance = (day, tipe) => {
  if (tipe !== "TENDIK") return { isOut: false, isHadirOut: false, isPulangOut: false };

  const date = day.dateObj instanceof Date ? day.dateObj : new Date(day.dateStr);
  const isFriday = date.getDay() === 5;

  const parseToSeconds = (timeStr) => {
    if (!timeStr) return -1;
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    return h * 3600 + m * 60 + s;
  };

  const hadirSec = parseToSeconds(day.hadirTime);
  const pulangSec = parseToSeconds(day.pulangTime);

  // Jam masuk: 07:00-07:30
  const masukStart = parseToSeconds("07:00:00");
  const masukEnd = parseToSeconds("07:30:00");

  // Jam pulang:
  // Jumat: 16:30-17:30
  // Lainnya: 16:00-17:00
  const pulangStart = isFriday ? parseToSeconds("16:30:00") : parseToSeconds("16:00:00");
  const pulangEnd = isFriday ? parseToSeconds("17:30:00") : parseToSeconds("17:00:00");

  const isHadirOut = hadirSec < masukStart || hadirSec > masukEnd;
  const isPulangOut = pulangSec < pulangStart || pulangSec > pulangEnd;

  return {
    isOut: isHadirOut || isPulangOut,
    isHadirOut,
    isPulangOut,
  };
};

export default function JamKerjaSdm() {
  const confirm = useConfirm();

  // Main states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected state
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [selectedDtm, setSelectedDtm] = useState(null);

  // Presence uploads
  const [presensiFiles, setPresensiFiles] = useState([]);
  const [uploadTipe, setUploadTipe] = useState("DOSEN");
  const [uploadFile, setUploadFile] = useState(null);

  // Parsing Excel states
  const [selectedPresensiFile, setSelectedPresensiFile] = useState(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Loading & UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDtm, setIsLoadingDtm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // 1. Initial Data Fetching
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/sdm/dtm?tahunAnggaran=${selectedYear}`),
      ]);
      setFakultasList(fakData);
      setDtmList(dtmData);
    } catch (err) {
      showNotification(err.message || "Gagal mengambil data awal", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [selectedYear]);

  // Find existing DTM helper
  const findDtm = (fakultasId) => {
    return dtmList.find((d) => d.fakultasId === fakultasId);
  };

  // 2. Fetch Presensi Files
  const loadPresensiFiles = async (dtmId) => {
    try {
      const files = await apiFetch(`/api/sdm/presensi/dtm/${dtmId}`);
      setPresensiFiles(Array.isArray(files) ? files : []);
    } catch (err) {
      showNotification(
        "Gagal memuat berkas presensi terunggah: " + err.message,
        "error"
      );
    }
  };

  // 3. Select or Create DTM on click
  const handleSelectUnitKerja = async (fakultas) => {
    setSelectedFakultas(fakultas);
    setIsLoadingDtm(true);
    try {
      const dtm = await apiFetch("/api/sdm/select-or-create", {
        method: "POST",
        body: JSON.stringify({
          namaFakultas: fakultas.namaFakultas,
          tahunAnggaran: selectedYear,
        }),
      });
      setSelectedDtm(dtm);
      setViewMode("detail");
      setParsedData(null);
      setSelectedPresensiFile(null);
      await loadPresensiFiles(dtm.id);
    } catch (err) {
      showNotification("Gagal memproses DTM SDM: " + err.message, "error");
    } finally {
      setIsLoadingDtm(false);
    }
  };

  // 4. File upload handler
  const handleUploadPresensi = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showNotification("Silakan pilih berkas Excel terlebih dahulu", "error");
      return;
    }
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("tipe", uploadTipe); // "DOSEN" or "TENDIK"
      formData.append("dtmId", selectedDtm.id);

      await apiFetch("/api/sdm/presensi", {
        method: "POST",
        body: formData,
      });

      showNotification("Berkas presensi berhasil diunggah");
      setUploadFile(null);

      // Clear file input manually
      const fileInput = document.getElementById("presensi-upload-input");
      if (fileInput) fileInput.value = "";

      // Refresh list
      await loadPresensiFiles(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal mengunggah berkas: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Delete presensi file
  const handleDeletePresensi = async (id) => {
    const confirmed = await confirm({
      title: "",
      message: "Apakah Anda yakin ingin menghapus berkas presensi ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;
    
    setIsSaving(true);
    try {
      await apiFetch(`/api/sdm/presensi/${id}`, {
        method: "DELETE",
      });
      showNotification("Berkas presensi berhasil dihapus");

      // Reset parsing data if deleted file is the selected one
      if (selectedPresensiFile && selectedPresensiFile.id === id) {
        setParsedData(null);
        setSelectedPresensiFile(null);
      }

      // Refresh list
      await loadPresensiFiles(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal menghapus berkas: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Select presence file to download & parse locally
  const handleSelectPresensiFile = async (fileObj) => {
    setSelectedPresensiFile(fileObj);
    setIsParsingExcel(true);
    setParsedData(null);
    try {
      let blob;
      if (fileObj.linkExcel.startsWith("http")) {
        const response = await fetch(fileObj.linkExcel);
        blob = await response.blob();
      } else {
        blob = await apiFetchBlob(fileObj.linkExcel);
      }

      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        try {
          const buffer = e.target.result;
          const rawRecords = parsePresensiExcel(buffer);
          const calculated = calculateJamKerja(rawRecords);
          setParsedData(calculated);
          showNotification("Data Excel berhasil didekode dan dianalisis");
        } catch (err) {
          showNotification("Gagal mengurai isi berkas Excel: " + err.message, "error");
        } finally {
          setIsParsingExcel(false);
        }
      };
      fileReader.readAsArrayBuffer(blob);
    } catch (err) {
      showNotification("Gagal mengambil berkas presensi dari server: " + err.message, "error");
      setIsParsingExcel(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDtm(null);
    setSelectedFakultas(null);
    setSelectedPresensiFile(null);
    setParsedData(null);
    setPresensiFiles([]);
    loadInitialData(); // Sync lists
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-gray-300 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Jam Kerja & Presensi SDM
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Unggah berkas rekapitulasi kehadiran Excel dan pantau kepatuhan jam kerja unit kerja."
              : `Kelola Berkas Kehadiran: ${selectedFakultas?.namaFakultas}`}
          </p>
        </div>

        {viewMode === "list" ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Tahun Anggaran:</span>
            <YearDropdown value={selectedYear} onChange={setSelectedYear} />
          </div>
        ) : (
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Unit Kerja
          </button>
        )}
      </div>

      {/* MAIN VIEW: LIST OF UNIT KERJA */}
      {viewMode === "list" && (
        <div>
          {isLoading || isLoadingDtm ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white border border-gray-300">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="text-sm font-medium">Memuat data unit kerja...</span>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Unit Kerja</Table.HeaderCell>
                  <Table.HeaderCell className="text-center">Status DTM</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-48">Aksi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fakultasList.map((fak) => {
                  const dtm = findDtm(fak.id);
                  const isCreated = !!dtm;

                  return (
                    <Table.Row key={fak.id}>
                      <Table.Cell className="font-semibold text-gray-800">
                        {fak.namaFakultas}
                      </Table.Cell>

                      {/* STATUS DTM */}
                      <Table.Cell className="text-center">
                        <div className="flex justify-center">
                          {isCreated ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                dtm.statusDtm === "SUDAH_DITERUSKAN"
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : "bg-amber-50 border-amber-200 text-amber-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dtm.statusDtm === "SUDAH_DITERUSKAN"
                                    ? "bg-green-500"
                                    : "bg-amber-500"
                                }`}
                              ></span>
                              {dtm.statusDtm === "SUDAH_DITERUSKAN"
                                ? "Sudah Ditandai Selesai"
                                : "Belum Ditandai Selesai"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Belum Dibuat
                            </span>
                          )}
                        </div>
                      </Table.Cell>

                      {/* ACTION */}
                      <Table.Cell className="text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleSelectUnitKerja(fak)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
                          >
                            Kelola Presensi
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      )}

      {/* DETAIL WORKSPACE VIEW: UPLOAD & PARSING INTERFACE */}
      {viewMode === "detail" && selectedDtm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: UPLOAD PRESENSI & UPLOADED FILES LIST (span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* UPLOAD FORM */}
            <div className="bg-white border border-gray-300 rounded p-4 shadow-sm">
              <h2 className="text-xs font-bold text-gray-900 border-b pb-2 mb-3 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-gray-600" />
                Unggah Presensi Baru
              </h2>
              
              <form onSubmit={handleUploadPresensi} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                    Jenis Pegawai
                  </label>
                  <select
                    value={uploadTipe}
                    onChange={(e) => setUploadTipe(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                  >
                    <option value="DOSEN">Dosen (DOSEN)</option>
                    <option value="TENDIK">Tenaga Kependidikan (TENDIK)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                    Berkas Rekap Excel (.xlsx)
                  </label>
                  <input
                    id="presensi-upload-input"
                    type="file"
                    required
                    accept=".xlsx, .xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full text-xs text-gray-600 border border-gray-300 rounded p-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSaving || !uploadFile}
                  className="w-full bg-gray-800 text-white hover:bg-gray-700 py-1.5 px-3 rounded text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Unggah Berkas
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* UPLOADED FILES LIST */}
            <div className="bg-white border border-gray-300 rounded p-4 shadow-sm">
              <h2 className="text-xs font-bold text-gray-900 border-b pb-2 mb-3 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-gray-600" />
                Daftar Berkas Presensi ({presensiFiles.length})
              </h2>

              {presensiFiles.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {presensiFiles.map((file) => {
                    const isSelected = selectedPresensiFile?.id === file.id;

                    return (
                      <div
                        key={file.id}
                        onClick={() => handleSelectPresensiFile(file)}
                        className={`p-2.5 border rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-gray-50 border-gray-900"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-gray-900 truncate">
                              {file.nama}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  file.tipe === "DOSEN"
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-teal-50 border-teal-200 text-teal-700"
                                }`}
                              >
                                {file.tipe}
                              </span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePresensi(file.id);
                            }}
                            className="p-1 border border-transparent rounded hover:bg-red-50 hover:border-red-200 text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Hapus Berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-gray-200 rounded text-xs text-gray-400">
                  Belum ada berkas presensi yang diunggah untuk unit kerja ini.
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: PARSED EXCEL COMPLIANCE SUMMARY (span 8) */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-300 rounded p-5 shadow-sm min-h-[465px]">
              
              {isParsingExcel ? (
                <div className="flex flex-col items-center justify-center py-36 gap-3 text-gray-500 bg-white">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  <span className="text-xs font-semibold">Mengunduh & menganalisis berkas Excel...</span>
                </div>
              ) : parsedData ? (
                <div className="space-y-6">
                  {/* EXCEL FILE & EMPLOYEE INFO METADATA */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-4 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-500" />
                        Informasi Pemegang Berkas
                      </h3>
                      <div className="text-xs text-gray-700 font-semibold mt-1">
                        Nama Pegawai: <span className="text-gray-900">{parsedData.employeeName || "Tidak Ditemukan"}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Nomor Pegawai: {parsedData.employeeId || "-"} | Unit: {parsedData.unitKerja || "-"}
                      </div>
                    </div>

                    <div className="space-y-1 md:text-right border-t md:border-t-0 pt-2 md:pt-0">
                      <h3 className="text-xs font-bold text-gray-800 flex items-center md:justify-end gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Tipe Rekapitulasi
                      </h3>
                      <div className="text-xs text-gray-700 font-semibold mt-1">
                        Jenis: <span className="text-gray-900 font-bold">{selectedPresensiFile?.tipe}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate max-w-xs">
                        Berkas: {selectedPresensiFile?.nama}
                      </div>
                    </div>
                  </div>

                  {/* MONTHLY SUMMARY CARD LIST */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-600" />
                      Akumulasi Jam Kerja Bulanan
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {parsedData.months.map((m) => (
                        <div key={m.monthKey} className="border border-gray-300 rounded p-3 bg-white shadow-xs">
                          <div className="text-[10px] text-gray-400 font-bold tracking-wide uppercase">
                            {m.monthName}
                          </div>
                          <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                            {m.totalHours} <span className="text-xs font-semibold text-gray-500">Jam</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">
                            Total Kehadiran: <span className="font-semibold">{m.daysCount} Hari</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DAILY DETAILED TABLE */}
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-gray-600" />
                      Detail Kepatuhan Jam Kerja Harian
                    </h3>

                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell className="px-4 py-2 text-center w-12">No</Table.HeaderCell>
                          <Table.HeaderCell className="px-4 py-2">Tanggal</Table.HeaderCell>
                          <Table.HeaderCell className="px-4 py-2">Hari</Table.HeaderCell>
                          <Table.HeaderCell className="px-4 py-2 text-center">Jam Masuk (Awal)</Table.HeaderCell>
                          <Table.HeaderCell className="px-4 py-2 text-center">Jam Pulang (Akhir)</Table.HeaderCell>
                          <Table.HeaderCell className="px-4 py-2 text-center w-28">Total Durasi</Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {parsedData.days.map((day, index) => {
                          const compliance = checkTendikCompliance(day, selectedPresensiFile?.tipe);
                          const rowClass = compliance.isOut ? "bg-red-50/80 hover:bg-red-100/80 text-red-950" : "";

                          return (
                            <Table.Row key={day.dateStr} className={rowClass}>
                              <Table.Cell className="px-4 py-2 text-center font-medium text-gray-400">
                                {index + 1}
                              </Table.Cell>
                              <Table.Cell className="px-4 py-2 font-semibold text-gray-900">
                                {day.dateStr}
                              </Table.Cell>
                              <Table.Cell className="px-4 py-2 capitalize">
                                {day.dayName}
                              </Table.Cell>
                              <Table.Cell className={`px-4 py-2 text-center font-medium ${compliance.isHadirOut && selectedPresensiFile?.tipe === "TENDIK" ? "text-red-700 bg-red-100/20 font-bold" : "text-emerald-700 bg-emerald-50/10"}`}>
                                {day.hadirTime}
                              </Table.Cell>
                              <Table.Cell className={`px-4 py-2 text-center font-medium ${compliance.isPulangOut && selectedPresensiFile?.tipe === "TENDIK" ? "text-red-700 bg-red-100/20 font-bold" : "text-amber-700 bg-amber-50/10"}`}>
                                {day.pulangTime}
                              </Table.Cell>
                              <Table.Cell className="px-4 py-2 text-center font-bold text-gray-900 bg-gray-50/50">
                                {day.totalHours} jam
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-36 gap-3 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-gray-300 stroke-1" />
                  <div className="text-xs font-semibold text-gray-500">Pilih Berkas Presensi</div>
                  <p className="text-[10px] text-gray-400 max-w-sm mt-1">
                    Silakan klik salah satu berkas presensi di sebelah kiri untuk melihat rekapitulasi serta rincian pemenuhan jam kerja pegawai secara detail di panel ini.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}