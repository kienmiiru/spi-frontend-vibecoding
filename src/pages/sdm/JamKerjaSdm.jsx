import { useState, useEffect } from "react";
import {
  Loader2,
  Calendar,
  Upload,
  Trash2,
  User,
  FileSpreadsheet,
  Clock,
  Edit2,
  Check,
  X,
} from "lucide-react";

import Notification from "../../components/Notification";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { parsePresensiExcel, calculateJamKerja } from "../../utils/excelParser";

export default function JamKerjaSdm() {
  // Main states
  const [selectedYear, setSelectedYear] = useState("");
  const [fakultasList, setFakultasList] = useState([]);
  const [selectedFakultasId, setSelectedFakultasId] = useState("");
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

  // Edit filename states
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileName, setEditingFileName] = useState("");

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Determine selected Fakultas object
  const selectedFakultas =
    fakultasList.find((f) => f.id === Number(selectedFakultasId)) || null;

  // Generate years list (from 2023 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2023 + 1 },
    (_, i) => (2023 + i).toString()
  );

  // 1. Fetch Fakultas list on mount
  useEffect(() => {
    const fetchFakultas = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch("/api/fakultas");
        setFakultasList(Array.isArray(data) ? data : []);
      } catch (err) {
        showNotification(err.message || "Gagal mengambil data unit kerja", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFakultas();
  }, []);

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

  // 3. Reactive Fetch or Create DTM on dropdown selection change
  useEffect(() => {
    if (selectedFakultas && selectedYear) {
      const initDtm = async () => {
        setIsLoadingDtm(true);
        try {
          const dtm = await apiFetch("/api/sdm/select-or-create", {
            method: "POST",
            body: JSON.stringify({
              namaFakultas: selectedFakultas.namaFakultas,
              tahunAnggaran: selectedYear,
            }),
          });
          setSelectedDtm(dtm);
          setParsedData(null);
          setSelectedPresensiFile(null);
          await loadPresensiFiles(dtm.id);
        } catch (err) {
          showNotification("Gagal memproses DTM SDM: " + err.message, "error");
          setSelectedDtm(null);
        } finally {
          setIsLoadingDtm(false);
        }
      };
      initDtm();
    } else {
      setSelectedDtm(null);
      setPresensiFiles([]);
      setParsedData(null);
      setSelectedPresensiFile(null);
    }
  }, [selectedFakultasId, selectedYear]);

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
    if (!window.confirm("Apakah Anda yakin ingin menghapus berkas presensi ini?")) {
      return;
    }
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

  // 5.5. Save presensi employee name
  const handleSavePresensiName = async (id) => {
    if (!editingFileName.trim()) {
      showNotification("Nama pegawai tidak boleh kosong", "error");
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch(`/api/sdm/presensi/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ nama: editingFileName.trim() }),
      });
      showNotification("Nama pegawai berhasil diperbarui");
      setEditingFileId(null);
      setEditingFileName("");

      // Refresh list
      await loadPresensiFiles(selectedDtm.id);

      // Sync preview metadata if the current file is edited
      if (selectedPresensiFile && selectedPresensiFile.id === id) {
        setSelectedPresensiFile((prev) => ({ ...prev, nama: editingFileName.trim() }));
      }
    } catch (err) {
      showNotification("Gagal memperbarui nama pegawai: " + err.message, "error");
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
            <Clock className="w-6 h-6 text-gray-700" />
            Audit Jam Kerja & Presensi SDM
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Pilih unit kerja dan tahun anggaran untuk mengelola berkas rekapitulasi kehadiran Excel dan memantau kepatuhan jam kerja.
          </p>
        </div>
      </div>

      {/* DROPDOWN SELECTORS SIDE-BY-SIDE */}
      <div className="bg-white rounded-xl border border-gray-250 shadow-sm p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-2 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="text-xs font-medium">Memuat daftar unit kerja...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unit Kerja Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Unit Kerja
              </label>
              <select
                value={selectedFakultasId}
                onChange={(e) => setSelectedFakultasId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-800 shadow-xs"
              >
                <option value="">-- Pilih Unit Kerja --</option>
                {fakultasList.map((fak) => (
                  <option key={fak.id} value={fak.id}>
                    {fak.namaFakultas}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Anggaran Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tahun Anggaran
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-800 shadow-xs"
              >
                <option value="">-- Pilih Tahun Anggaran --</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL WORKSPACE VIEW */}
      {selectedFakultas && selectedYear ? (
        isLoadingDtm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white rounded-xl border border-gray-250 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-sm font-medium">Memuat data presensi...</span>
          </div>
        ) : selectedDtm ? (
          <div className="space-y-6">
            {/* DTM STATUS BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-xs gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Daftar Berkas Presensi: {selectedFakultas.namaFakultas}
                </h3>
                <p className="text-xs text-gray-500">
                  Tahun Anggaran: {selectedYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-650">Status DTM:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    selectedDtm.statusDtm === "SUDAH_DITERUSKAN"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedDtm.statusDtm === "SUDAH_DITERUSKAN"
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                  ></span>
                  {selectedDtm.statusDtm === "SUDAH_DITERUSKAN"
                    ? "Sudah Diteruskan (Selesai)"
                    : "Belum Diteruskan"}
                </span>
              </div>
            </div>

            {/* DETAIL COLUMNS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: UPLOAD PRESENSI & UPLOADED FILES LIST (span 4) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* UPLOAD FORM */}
                <div className="bg-white border border-gray-250 rounded-xl p-4 shadow-xs">
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
                <div className="bg-white border border-gray-250 rounded-xl p-4 shadow-xs">
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
                                {editingFileId === file.id ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleSavePresensiName(file.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 w-full mr-2"
                                  >
                                    <input
                                      type="text"
                                      value={editingFileName}
                                      onChange={(e) => setEditingFileName(e.target.value)}
                                      className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-gray-500 bg-white w-full"
                                      autoFocus
                                      required
                                      disabled={isSaving}
                                    />
                                    <button
                                      type="submit"
                                      disabled={isSaving}
                                      className="p-1 border border-transparent rounded hover:bg-green-50 hover:border-green-200 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                                      title="Simpan"
                                    >
                                      {isSaving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingFileId(null);
                                        setEditingFileName("");
                                      }}
                                      className="p-1 border border-transparent rounded hover:bg-gray-100 hover:border-gray-200 text-gray-500 hover:text-gray-650 transition-colors"
                                      title="Batal"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </form>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                              
                              {editingFileId !== file.id && (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingFileId(file.id);
                                      setEditingFileName(file.nama);
                                    }}
                                    className="p-1 border border-transparent rounded hover:bg-gray-100 hover:border-gray-200 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                                    title="Ubah Nama Pegawai"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
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
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                      Belum ada berkas presensi yang diunggah untuk unit kerja ini.
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: PARSED EXCEL COMPLIANCE SUMMARY (span 8) */}
              <div className="lg:col-span-8">
                <div className="bg-white border border-gray-255 rounded-xl p-5 shadow-xs min-h-[465px]">
                  
                  {isParsingExcel ? (
                    <div className="flex flex-col items-center justify-center py-36 gap-3 text-gray-500 bg-white">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      <span className="text-xs font-semibold">Mengunduh & menganalisis berkas Excel...</span>
                    </div>
                  ) : parsedData ? (
                    <div className="space-y-6 animate-fadeIn">
                      {/* EXCEL FILE & EMPLOYEE INFO METADATA */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
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
                            Pegawai: {selectedPresensiFile?.nama}
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
                            <div key={m.monthKey} className="border border-gray-300 rounded-lg p-3 bg-white shadow-xs">
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

                        <div className="overflow-x-auto border border-gray-300 rounded-lg">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-bold text-gray-600 uppercase">
                                <th className="px-4 py-2 border-r border-gray-200 text-center w-12">No</th>
                                <th className="px-4 py-2 border-r border-gray-200">Tanggal</th>
                                <th className="px-4 py-2 border-r border-gray-200">Hari</th>
                                <th className="px-4 py-2 border-r border-gray-200 text-center">Jam Masuk (Awal)</th>
                                <th className="px-4 py-2 border-r border-gray-200 text-center">Jam Pulang (Akhir)</th>
                                <th className="px-4 py-2 text-center w-28">Total Durasi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs text-gray-800 bg-white">
                              {parsedData.days.map((day, index) => (
                                <tr key={day.dateStr} className="hover:bg-gray-55 transition-colors">
                                  <td className="px-4 py-2 border-r border-gray-200 text-center font-medium text-gray-400">
                                    {index + 1}
                                  </td>
                                  <td className="px-4 py-2 border-r border-gray-200 font-semibold text-gray-905">
                                    {day.dateStr}
                                  </td>
                                  <td className="px-4 py-2 border-r border-gray-200 capitalize">
                                    {day.dayName}
                                  </td>
                                  <td className="px-4 py-2 border-r border-gray-200 text-center font-medium text-emerald-700 bg-emerald-50/10">
                                    {day.hadirTime}
                                  </td>
                                  <td className="px-4 py-2 border-r border-gray-200 text-center font-medium text-amber-700 bg-amber-50/10">
                                    {day.pulangTime}
                                  </td>
                                  <td className="px-4 py-2 text-center font-bold text-gray-900 bg-gray-50/50">
                                    {day.totalHours} jam
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
          </div>
        ) : null
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-xl border border-gray-200 shadow-sm animate-fadeIn">
          <Clock className="w-16 h-16 text-gray-300 mb-4 stroke-1" />
          <h2 className="text-lg font-bold text-gray-800">Kelola Presensi SDM</h2>
          <p className="text-sm text-gray-500 max-w-md mt-2">
            Silakan pilih unit kerja dan tahun anggaran terlebih dahulu pada dropdown di atas untuk memuat berkas presensi.
          </p>
        </div>
      )}
    </div>
  );
}