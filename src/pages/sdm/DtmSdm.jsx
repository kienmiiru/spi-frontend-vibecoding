import { useState, useEffect, useRef } from "react";
import * as docx from "docx-preview";
import {
  ArrowLeft,
  Loader2,
  FolderKanban,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import BulletedTextArea from "../../components/BulletedTextArea";
import QuillEditor from "../../components/QuillEditor";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { parsePresensiExcel, calculateJamKerja } from "../../utils/excelParser";

export default function DtmSdm() {
  // Main states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected DTM states
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [activeTab, setActiveTab] = useState("temuan"); // "temuan" | "detail" | "kriteria"

  // Presence files associated with selected DTM
  const [presensiFiles, setPresensiFiles] = useState([]);
  const [selectedPresensiFile, setSelectedPresensiFile] = useState(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Form states
  const [temuanFormState, setTemuanFormState] = useState({
    detailTemuan: "",
    kodeTemuan: "",
  });

  const [detailFormState, setDetailFormState] = useState({
    inputAspekMonitoring: "",
    inputAuditor: "",
    tipeMonitoring: "POST",
    inputAkarPenyebab: "",
    inputAkibat: "",
    inputRekomendasi: "",
    kriteria: "",
    inputUnitKerja: "",
    inputMasaMonitoring: "",
    inputTanggalMonitoring: "",
  });

  // Preview state for docx-preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const previewContainerRef = useRef(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const quillRef = useRef(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Load initial faculties and DTM lists
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

  // Helper to find DTM for a fakultasId
  const findDtm = (fakultasId) => {
    return dtmList.find((d) => d.fakultasId === fakultasId);
  };

  // Load presence files for opened DTM
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

  // Switch to detail view
  const handleBukaDtm = async (fakultas, dtm) => {
    if (!dtm) return;
    setIsLoading(true);
    setSelectedFakultas(fakultas);
    setSelectedDtm(dtm);
    setActiveTab("temuan");

    // Populate form states
    setTemuanFormState({
      detailTemuan: dtm.detailTemuan || "",
      kodeTemuan: dtm.kodeTemuan || "",
    });

    setDetailFormState({
      inputAspekMonitoring: dtm.inputAspekMonitoring || "",
      inputAuditor: dtm.inputAuditor || "",
      tipeMonitoring: dtm.tipeMonitoring || "POST",
      inputAkarPenyebab: dtm.inputAkarPenyebab || "",
      inputAkibat: dtm.inputAkibat || "",
      inputRekomendasi: dtm.inputRekomendasi || "",
      kriteria: dtm.kriteria || "",
      inputUnitKerja: dtm.inputUnitKerja || "",
      inputMasaMonitoring: dtm.inputMasaMonitoring || "",
      inputTanggalMonitoring: dtm.inputTanggalMonitoring || "",
    });

    // Reset Excel parsed states
    setSelectedPresensiFile(null);
    setParsedData(null);

    try {
      await loadPresensiFiles(dtm.id);
      setViewMode("detail");
    } catch (err) {
      showNotification(
        "Gagal memuat data pendukung DTM: " + err.message,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Select presence file to download & parse locally inside DTM
  const handleSelectPresensiFile = async (fileObj) => {
    if (!fileObj) {
      setSelectedPresensiFile(null);
      setParsedData(null);
      return;
    }
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
          showNotification("Data kehadiran Excel berhasil dimuat");
        } catch (err) {
          showNotification(
            "Gagal mengurai isi berkas Excel: " + err.message,
            "error"
          );
        } finally {
          setIsParsingExcel(false);
        }
      };
      fileReader.readAsArrayBuffer(blob);
    } catch (err) {
      showNotification(
        "Gagal mengambil berkas presensi dari server: " + err.message,
        "error"
      );
      setIsParsingExcel(false);
    }
  };

  // Toggle status BELUM_DITERUSKAN / SUDAH_DITERUSKAN
  const handleToggleStatus = async (dtm) => {
    if (!dtm) return;
    const currentStatus = dtm.statusDtm;
    const nextStatus =
      currentStatus === "SUDAH_DITERUSKAN"
        ? "BELUM_DITERUSKAN"
        : "SUDAH_DITERUSKAN";

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/sdm/dtm/${dtm.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusDtm: nextStatus }),
      });

      showNotification(
        `Status DTM berhasil diubah menjadi ${
          nextStatus === "SUDAH_DITERUSKAN" ? "Sudah Selesai" : "Belum Selesai"
        }`
      );

      // Update selected state if currently in detail view
      if (selectedDtm && selectedDtm.id === dtm.id) {
        setSelectedDtm(updated);
      }

      // Update in local list to reflect instantly without page reload
      setDtmList((prev) =>
        prev.map((item) => (item.id === dtm.id ? updated : item))
      );
    } catch (err) {
      showNotification("Gagal memperbarui status DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save DTM Temuan (Quill & Kode Temuan)
  const handleSaveTemuan = async (e) => {
    e.preventDefault();
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch(
        `/api/sdm/dtm/${selectedDtm.id}/temuan`,
        {
          method: "PATCH",
          body: JSON.stringify({
            detailTemuan: temuanFormState.detailTemuan,
            kodeTemuan: temuanFormState.kodeTemuan,
          }),
        }
      );
      setSelectedDtm(updated);
      showNotification("Data temuan dan kode temuan berhasil disimpan");
    } catch (err) {
      showNotification("Gagal menyimpan temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save DTM details & criteria
  const handleSaveDetails = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch(
        `/api/sdm/dtm/${selectedDtm.id}/detail`,
        {
          method: "PATCH",
          body: JSON.stringify({
            inputAspekMonitoring: detailFormState.inputAspekMonitoring || null,
            inputAuditor: detailFormState.inputAuditor || null,
            tipeMonitoring: detailFormState.tipeMonitoring || "POST",
            inputAkarPenyebab: detailFormState.inputAkarPenyebab || null,
            inputAkibat: detailFormState.inputAkibat || null,
            inputRekomendasi: detailFormState.inputRekomendasi || null,
            kriteria: detailFormState.kriteria || null,
            inputUnitKerja: detailFormState.inputUnitKerja || null,
            inputMasaMonitoring: detailFormState.inputMasaMonitoring || null,
            inputTanggalMonitoring: detailFormState.inputTanggalMonitoring || null,
          }),
        }
      );
      setSelectedDtm(updated);
      showNotification("Detail DTM berhasil diperbarui");
    } catch (err) {
      showNotification("Gagal memperbarui detail DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Export to DOCX
  const handleExportDocx = async () => {
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/sdm/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: selectedDtm.id }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_SDM_${
        selectedFakultas?.namaFakultas || "Unit_Kerja"
      }_${selectedYear}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("Berkas Word (DOCX) berhasil diekspor dan diunduh");
    } catch (err) {
      showNotification("Gagal mengekspor dokumen Word: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Preview DOCX
  const handlePreviewDocx = async () => {
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/sdm/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: selectedDtm.id }),
      });
      setPreviewBlob(blob);
      setIsPreviewOpen(true);
      showNotification("Pratinjau dokumen siap ditampilkan");
    } catch (err) {
      showNotification("Gagal memuat pratinjau dokumen: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Render preview document on open
  useEffect(() => {
    if (isPreviewOpen && previewBlob && previewContainerRef.current) {
      previewContainerRef.current.innerHTML =
        '<div class="text-xs text-gray-500 text-center py-8">Merender dokumen...</div>';

      docx
        .renderAsync(previewBlob, previewContainerRef.current, null, {
          className: "docx",
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          experimental: false,
        })
        .then(() => {
          previewContainerRef.current
            .querySelectorAll("iframe")
            .forEach((iframe) => {
              iframe.style.width = "100%";
              iframe.style.height =
                iframe.contentWindow.document.body.scrollHeight + 50 + "px";
            });
        })
        .catch((err) => {
          console.error("docx-preview error:", err);
          if (previewContainerRef.current) {
            previewContainerRef.current.innerHTML = `<div class="p-4 text-xs text-red-500 font-semibold">Gagal me-render pratinjau dokumen: ${err.message}</div>`;
          }
        });
    }
  }, [isPreviewOpen, previewBlob]);

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDtm(null);
    setSelectedFakultas(null);
    setPresensiFiles([]);
    setSelectedPresensiFile(null);
    setParsedData(null);
    loadInitialData(); // Sync list table status
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
            <FolderKanban className="w-6 h-6 text-gray-700" />
            DTM SDM
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Kelola detail monitoring, kriteria audit, dan status persetujuan DTM SDM."
              : `Kelola DTM: ${selectedFakultas?.namaFakultas}`}
          </p>
        </div>

        {viewMode === "list" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Tahun Anggaran:</span>
            <YearDropdown value={selectedYear} onChange={setSelectedYear} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviewDocx}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50 transition-colors"
            >
              Pratinjau
            </button>
            <button
              onClick={handleExportDocx}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium border border-gray-800 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Ekspor Word
            </button>
            <button
              onClick={() => handleToggleStatus(selectedDtm)}
              disabled={isSaving}
              className={`px-3 py-1.5 text-xs font-medium border rounded disabled:opacity-50 transition-colors ${
                selectedDtm?.statusDtm === "SUDAH_DITERUSKAN"
                  ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  : "bg-green-50 border-green-300 text-green-800 hover:bg-green-100"
              }`}
            >
              {selectedDtm?.statusDtm === "SUDAH_DITERUSKAN"
                ? "Batal Selesai"
                : "Tandai Selesai"}
            </button>
            <button
              onClick={handleBackToList}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Kembali
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE: LIST TABLE */}
      {viewMode === "list" ? (
        <div className="border border-gray-300 rounded overflow-hidden bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-500">
              Memuat data unit kerja...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-xs font-semibold text-gray-700">
                  <th className="px-6 py-3 border-r border-gray-300">Unit Kerja</th>
                  <th className="px-6 py-3 text-center border-r border-gray-300 w-64">
                    Status DTM
                  </th>
                  <th className="px-6 py-3 text-center w-60">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs text-gray-800 bg-white">
                {fakultasList.map((fak) => {
                  const dtm = findDtm(fak.id);
                  const isCreated = !!dtm;

                  return (
                    <tr key={fak.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold border-r border-gray-300 text-sm text-gray-900">
                        {fak.namaFakultas}
                      </td>

                      {/* STATUS DTM */}
                      <td className="px-6 py-4 border-r border-gray-300 text-center">
                        {isCreated ? (
                          <span
                            className={`inline-block border px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                              dtm.statusDtm === "SUDAH_DITERUSKAN"
                                ? "bg-green-50 border-green-300 text-green-800"
                                : "bg-gray-50 border-gray-300 text-gray-800"
                            }`}
                          >
                            {dtm.statusDtm === "SUDAH_DITERUSKAN"
                              ? "Selesai"
                              : "Belum Selesai"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            Belum dibuat di Jam Kerja SDM
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-center">
                        {isCreated ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleBukaDtm(fak, dtm)}
                              className="px-3 py-1.5 text-[10px] font-semibold border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100 transition-colors"
                            >
                              Buka
                            </button>
                            <button
                              onClick={() => handleToggleStatus(dtm)}
                              className="px-3 py-1.5 text-[10px] font-semibold border border-gray-300 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                            >
                              Ubah Status
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* DETAIL WORKSPACE */
        <div className="space-y-6">
          {/* TAB HEADERS */}
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setActiveTab("temuan")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "temuan"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Input Temuan
            </button>
            <button
              onClick={() => setActiveTab("detail")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "detail"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Detail DTM
            </button>
            <button
              onClick={() => setActiveTab("kriteria")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "kriteria"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Kriteria Audit SDM
            </button>
          </div>

          {/* TAB 1: INPUT TEMUAN & COMPLIANCE SIDE-BY-SIDE */}
          {activeTab === "temuan" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT SIDE: PRESENSI FILES DROPDOWN & COMPACT VIEW (span 5) */}
              <div className="lg:col-span-5 border border-gray-300 rounded p-4 bg-white space-y-4 shadow-sm min-h-[400px]">
                <div>
                  <h2 className="text-xs font-bold text-gray-900">
                    1. Rujukan Rekap Kehadiran
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Pilih berkas presensi yang diunggah untuk unit kerja ini untuk melihat rincian pemenuhan jam kerja.
                  </p>
                </div>

                {presensiFiles.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-700 mb-1 uppercase tracking-wide">
                        Pilih Berkas Kehadiran
                      </label>
                      <select
                        value={selectedPresensiFile?.id || ""}
                        onChange={(e) => {
                          const fileObj = presensiFiles.find(
                            (f) => f.id === parseInt(e.target.value, 10)
                          );
                          handleSelectPresensiFile(fileObj);
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                      >
                        <option value="">-- Pilih Berkas Presensi --</option>
                        {presensiFiles.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nama} ({f.tipe})
                          </option>
                        ))}
                      </select>
                    </div>

                    {isParsingExcel ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="text-[10px] font-semibold">Mengurai data Excel...</span>
                      </div>
                    ) : parsedData ? (
                      <div className="space-y-4 border-t pt-3">
                        {/* Compact Employee Info */}
                        <div className="text-[10px] bg-gray-50 border p-2.5 rounded text-gray-700 space-y-1">
                          <div>
                            <strong className="text-gray-900">Nama Pegawai:</strong>{" "}
                            {parsedData.employeeName || "Tidak Diketahui"}
                          </div>
                          <div>
                            <strong className="text-gray-900">No. Pegawai:</strong>{" "}
                            {parsedData.employeeId || "-"}
                          </div>
                          <div>
                            <strong className="text-gray-900">Unit Kerja:</strong>{" "}
                            {parsedData.unitKerja || "-"}
                          </div>
                        </div>

                        {/* Monthly Summary */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-gray-800">
                            Akumulasi Jam Kerja Bulanan:
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {parsedData.months.map((m) => (
                              <div
                                key={m.monthKey}
                                className="border border-gray-200 p-2 rounded bg-white"
                              >
                                <div className="text-[9px] text-gray-400 font-semibold truncate">
                                  {m.monthName}
                                </div>
                                <div className="text-xs font-bold text-gray-900 mt-0.5">
                                  {m.totalHours} jam
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Compact Daily table */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-gray-800">
                            Rincian Harian (Kepatuhan):
                          </div>
                          
                          <div className="overflow-x-auto border rounded max-h-[220px] overflow-y-auto">
                            <table className="w-full text-left border-collapse text-[10px]">
                              <thead>
                                <tr className="bg-gray-150 bg-gray-50 border-b border-gray-200 text-[9px] font-bold text-gray-500">
                                  <th className="px-2.5 py-1.5 border-r border-gray-200">Tanggal</th>
                                  <th className="px-2.5 py-1.5 border-r border-gray-200 text-center">Masuk</th>
                                  <th className="px-2.5 py-1.5 border-r border-gray-200 text-center">Pulang</th>
                                  <th className="px-2.5 py-1.5 text-center">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 text-gray-700 bg-white">
                                {parsedData.days.map((day) => (
                                  <tr key={day.dateStr} className="hover:bg-gray-50">
                                    <td className="px-2.5 py-1.5 border-r border-gray-200 font-semibold">
                                      {day.dateStr}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-r border-gray-200 text-center text-emerald-600">
                                      {day.hadirTime}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-r border-gray-200 text-center text-amber-600">
                                      {day.pulangTime}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-semibold text-gray-900 bg-gray-55/30">
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
                      <div className="p-10 border border-dashed border-gray-200 rounded text-center text-xs text-gray-400">
                        Pilih salah satu berkas presensi terunggah di atas untuk menampilkan rincian kehadiran pegawai di sini.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center border border-dashed border-gray-200 rounded text-xs text-gray-400">
                    Belum ada berkas presensi Excel yang diunggah untuk DTM ini. Silakan unggah terlebih dahulu di menu Jam Kerja SDM.
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: QUILL & KODE TEMUAN (span 7) */}
              <div className="lg:col-span-7 border border-gray-300 rounded p-4 bg-white shadow-sm">
                <h2 className="text-xs font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
                  2. Input Detail Temuan SDM
                </h2>

                <form onSubmit={handleSaveTemuan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Kode Temuan
                    </label>
                    <input
                      type="text"
                      required
                      value={temuanFormState.kodeTemuan}
                      onChange={(e) =>
                        setTemuanFormState({
                          ...temuanFormState,
                          kodeTemuan: e.target.value,
                        })
                      }
                      placeholder="Masukkan kode temuan (e.g., SDM-01, SDM-002)"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Detail Temuan (Quill Editor)
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan}
                      onChange={(opsJson) =>
                        setTemuanFormState({
                          ...temuanFormState,
                          detailTemuan: opsJson,
                        })
                      }
                      quillInstanceRef={quillRef}
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isSaving ? "Menyimpan..." : "Simpan Temuan"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: DETAIL DTM */}
          {activeTab === "detail" && (
            <div className="border border-gray-300 rounded p-5 bg-white shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Informasi Detail DTM SDM
              </h2>

              <form onSubmit={handleSaveDetails} className="space-y-4 max-w-4xl">
                {/* ROW 1: AUDITOR & TIPE MONITORING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Auditor
                    </label>
                    <input
                      type="text"
                      value={detailFormState.inputAuditor || ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputAuditor: e.target.value,
                        })
                      }
                      placeholder="Masukkan nama auditor..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tipe Monitoring
                    </label>
                    <select
                      value={detailFormState.tipeMonitoring || "POST"}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          tipeMonitoring: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                    >
                      <option value="POST">POST (Setelah)</option>
                      <option value="ON_GOING">ON GOING (Sedang Berjalan)</option>
                      <option value="PERENCANAAN">PERENCANAAN (Sebelum)</option>
                    </select>
                  </div>
                </div>

                {/* ROW 2: ASPEK MONITORING & UNIT KERJA AUDIT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Aspek Monitoring
                    </label>
                    <input
                      type="text"
                      value={detailFormState.inputAspekMonitoring || ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputAspekMonitoring: e.target.value,
                        })
                      }
                      placeholder="Masukkan aspek monitoring..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit Kerja Yang Diaudit
                    </label>
                    <input
                      type="text"
                      value={detailFormState.inputUnitKerja || ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputUnitKerja: e.target.value,
                        })
                      }
                      placeholder="Masukkan nama unit kerja audit..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                    />
                  </div>
                </div>

                {/* ROW 3: MASA MONITORING & TANGGAL MONITORING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Masa Monitoring
                    </label>
                    <input
                      type="text"
                      value={detailFormState.inputMasaMonitoring || ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputMasaMonitoring: e.target.value,
                        })
                      }
                      placeholder="Contoh: Maret - Mei 2026"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tanggal Monitoring
                    </label>
                    <input
                      type="date"
                      value={detailFormState.inputTanggalMonitoring || ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputTanggalMonitoring: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                    />
                  </div>
                </div>

                {/* LIST FIELDS: AKAR PENYEBAB, AKIBAT, REKOMENDASI (BulletedTextArea) */}
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Akar Penyebab
                    </label>
                    <BulletedTextArea
                      value={detailFormState.inputAkarPenyebab || ""}
                      onChange={(val) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputAkarPenyebab: val,
                        })
                      }
                      placeholder="Tulis butir-butir akar penyebab masalah..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Akibat
                    </label>
                    <BulletedTextArea
                      value={detailFormState.inputAkibat || ""}
                      onChange={(val) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputAkibat: val,
                        })
                      }
                      placeholder="Tulis butir-butir akibat dari masalah..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Rekomendasi
                    </label>
                    <BulletedTextArea
                      value={detailFormState.inputRekomendasi || ""}
                      onChange={(val) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputRekomendasi: val,
                        })
                      }
                      placeholder="Tulis butir-butir rekomendasi penyelesaian..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Detail DTM"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: KRITERIA AUDIT */}
          {activeTab === "kriteria" && (
            <div className="border border-gray-300 rounded p-5 bg-white shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Kriteria Audit SDM
              </h2>
              <p className="text-[10px] text-gray-500 mb-4">
                Secara default kriteria mengikuti konfigurasi di menu Peraturan, namun dapat diubah apabila kriteria berubah di tengah tahun anggaran.
              </p>

              <form onSubmit={handleSaveDetails} className="space-y-4 max-w-4xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kriteria / Dasar Hukum Audit
                  </label>
                  <BulletedTextArea
                    value={detailFormState.kriteria || ""}
                    onChange={(val) =>
                      setDetailFormState({ ...detailFormState, kriteria: val })
                    }
                    placeholder="Tulis peraturan/undang-undang yang dilanggar (contoh: Peraturan Rektor No. 12 Tahun 2023)..."
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Kriteria"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* DOCX PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                Pratinjau Dokumen SDM (.docx)
              </h3>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewBlob(null);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-100 flex justify-center">
              <div
                ref={previewContainerRef}
                className="bg-white shadow p-8 max-w-[800px] w-full min-h-[500px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}