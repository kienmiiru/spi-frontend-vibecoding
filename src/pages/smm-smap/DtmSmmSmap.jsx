import { useState, useEffect, useRef } from "react";
import * as docx from "docx-preview";
import { Loader2, FolderKanban, CheckCircle } from "lucide-react";

import Notification from "../../components/Notification";
import BulletedTextArea from "../../components/BulletedTextArea";
import { apiFetch, apiFetchBlob } from "../../lib/api";

export default function DtmSmmSmap() {
  // Main states
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected DTM states
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [activeTab, setActiveTab] = useState("detail"); // "detail" | "kriteria"

  // Detail & Kriteria Form state
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

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Load initial faculties and DTM lists
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch("/api/smm-smap/dtm"),
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
  }, []);

  // Switch to detail view
  const handleBukaDtm = (dtm) => {
    if (!dtm) return;
    const resolvedFakultas = dtm.fakultas || fakultasList.find((f) => f.id === dtm.fakultasId) || null;
    setSelectedFakultas(resolvedFakultas);
    setSelectedDtm(dtm);
    setActiveTab("detail");

    // Populate detail values
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

    setViewMode("detail");
  };

  // Toggle status BELUM_DITERUSKAN / SUDAH_DITERUSKAN
  const handleToggleStatus = async (dtm) => {
    if (!dtm) return;
    const currentStatus = dtm.statusDtm;
    const nextStatus = currentStatus === "SUDAH_DITERUSKAN" ? "BELUM_DITERUSKAN" : "SUDAH_DITERUSKAN";

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/smm-smap/dtm/${dtm.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusDtm: nextStatus }),
      });

      showNotification(
        `Status DTM berhasil diubah menjadi ${nextStatus === "SUDAH_DITERUSKAN" ? "Sudah Selesai" : "Belum Selesai"}`
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

  // Save DTM details & criteria
  const handleSaveDetails = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/smm-smap/dtm/${selectedDtm.id}/detail`, {
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
      });
      setSelectedDtm(updated);
      showNotification("Detail DTM berhasil diperbarui");
    } catch (err) {
      showNotification("Gagal memperbarui detail DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Export to DOCX
  const handleExportDocx = async (dtm = selectedDtm) => {
    if (!dtm) return;
    setIsSaving(true);
    try {
      const unitKerjaName = dtm.fakultas?.namaFakultas || fakultasList.find((f) => f.id === dtm.fakultasId)?.namaFakultas || dtm.inputUnitKerja || "Unit_Kerja";
      const yearStr = dtm.tahunAnggaran || "";
      const blob = await apiFetchBlob("/api/smm-smap/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: dtm.id }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_SMM_SMAP_${unitKerjaName}_${yearStr}.docx`;
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
  const handlePreviewDocx = async (dtm = selectedDtm) => {
    if (!dtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/smm-smap/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: dtm.id }),
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
      previewContainerRef.current.innerHTML = '<div class="text-xs text-gray-500 text-center py-8">Merender dokumen...</div>';

      docx.renderAsync(previewBlob, previewContainerRef.current, null, {
        className: "docx",
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        experimental: false
      }).then(() => {
        previewContainerRef.current.querySelectorAll('iframe').forEach(iframe => {
          iframe.style.width = '100%';
          iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 50 + 'px';
        });
      }).catch((err) => {
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
    loadInitialData(); // Sync list status
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
            DTM SMM-SMAP
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Daftar monitoring, kriteria audit, dan status persetujuan DTM SMM-SMAP dari seluruh tahun anggaran."
              : `Kelola DTM: ${selectedFakultas?.namaFakultas || selectedDtm?.inputUnitKerja}`}
          </p>
        </div>

        {viewMode !== "list" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePreviewDocx(selectedDtm)}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-55 rounded disabled:opacity-50 transition-colors"
            >
              Pratinjau
            </button>
            <button
              onClick={() => handleExportDocx(selectedDtm)}
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
              {selectedDtm?.statusDtm === "SUDAH_DITERUSKAN" ? "Batal Selesai" : "Tandai Selesai"}
            </button>
            <button
              onClick={handleBackToList}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-55 transition-colors"
            >
              Kembali
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE: LIST CARDS */}
      {viewMode === "list" ? (
        isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white border border-gray-200 rounded-xl shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-sm font-semibold">Memuat berkas DTM SMM-SMAP...</span>
          </div>
        ) : dtmList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {dtmList.map((dtm) => {
              const isCompleted = dtm.statusDtm === "SUDAH_DITERUSKAN";
              const unitKerjaName = dtm.fakultas?.namaFakultas || fakultasList.find((f) => f.id === dtm.fakultasId)?.namaFakultas || dtm.inputUnitKerja || "Unit Kerja Tidak Diketahui";
              const shouldUseCreamCard = !isCompleted;

              return (
                <div
                  key={dtm.id}
                  onClick={() => handleBukaDtm(dtm)}
                  className={`rounded-2xl shadow-sm border p-5 cursor-pointer hover:shadow-md transition ${
                    shouldUseCreamCard
                      ? "bg-[#F8EEDF] border-[#e6d6b9]"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: "#5A0D08" }}
                    >
                      📋
                    </div>
                  </div>

                  {!isCompleted && (
                    <div className="mb-2">
                      <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2 py-1 text-[11px] font-semibold">
                        Belum Selesai
                      </span>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="mb-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-1 text-[11px] font-semibold">
                        Selesai
                      </span>
                    </div>
                  )}

                  <h3 className="font-bold text-sm text-gray-800 mb-1">
                    {unitKerjaName}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Tahun Anggaran: {dtm.tahunAnggaran}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tanggal: {formatDate(dtm.tanggalDtm)}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        Klik untuk lihat detail
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "#5A0D08" }}
                      >
                        →
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleStatus(dtm);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: isCompleted ? "#d32f2f" : "#2e7d32" }}
                      >
                        {isCompleted ? "Batal Selesai" : "Selesai"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePreviewDocx(dtm);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition border border-gray-200"
                      >
                        Pratinjau
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleExportDocx(dtm);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: "#5A0D08" }}
                      >
                        Ekspor
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-gray-255 rounded-xl shadow-xs">
            <FolderKanban className="w-12 h-12 text-gray-300 stroke-1 mb-2" />
            <span className="text-xs font-semibold text-gray-400">Belum ada data DTM SMM-SMAP yang dibuat.</span>
          </div>
        )
      ) : (
        /* DETAIL WORKSPACE */
        <div className="space-y-6">
          {/* TAB HEADERS */}
          <div className="flex border-b border-gray-300">
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
              Kriteria Audit SMM-SMAP
            </button>
          </div>

          {/* TAB 1: DETAIL DTM */}
          {activeTab === "detail" && (
            <div className="border border-gray-300 rounded p-5 bg-white shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Informasi Detail DTM SMM-SMAP
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
                        setDetailFormState({ ...detailFormState, inputAuditor: e.target.value })
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
                        setDetailFormState({ ...detailFormState, tipeMonitoring: e.target.value })
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
                        setDetailFormState({ ...detailFormState, inputAspekMonitoring: e.target.value })
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
                        setDetailFormState({ ...detailFormState, inputUnitKerja: e.target.value })
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
                        setDetailFormState({ ...detailFormState, inputMasaMonitoring: e.target.value })
                      }
                      placeholder="Contoh: Januari - April 2026"
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
                        setDetailFormState({ ...detailFormState, inputTanggalMonitoring: e.target.value })
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
                        setDetailFormState({ ...detailFormState, inputAkarPenyebab: val })
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
                        setDetailFormState({ ...detailFormState, inputAkibat: val })
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
                        setDetailFormState({ ...detailFormState, inputRekomendasi: val })
                      }
                      placeholder="Tulis butir-butir rekomendasi penyelesaian..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-250">
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

          {/* TAB 2: KRITERIA AUDIT */}
          {activeTab === "kriteria" && (
            <div className="border border-gray-300 rounded p-5 bg-white shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Kriteria Audit SMM-SMAP
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
                    placeholder="Tulis peraturan/klausul ISO (misal: Klausul 8 ISO 37001:2016) yang dilanggar..."
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
              <h3 className="text-sm font-bold text-gray-900">Pratinjau Dokumen SMM-SMAP (.docx)</h3>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewBlob(null);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-750 focus:outline-none"
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