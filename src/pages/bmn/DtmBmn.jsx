import { useState, useEffect, useRef } from "react";
import * as docx from "docx-preview";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import Table from "../../components/Table";
import { apiFetch, apiFetchBlob } from "../../lib/api";

// Import modular tab components
import DtmTemuanTab from "./DtmTemuanTab";
import DtmLampiranTab from "./DtmLampiranTab";
import DtmDetailTab from "./DtmDetailTab";
import DtmKriteriaTab from "./DtmKriteriaTab";
import { useConfirm } from "../../context/ConfirmContext";

export default function DtmBmn() {
  const confirm = useConfirm();
  // Main states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected state
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [selectedTipeBmn, setSelectedTipeBmn] = useState("");
  const [activeTab, setActiveTab] = useState("temuan"); // "temuan" | "lampiran" | "detail" | "kriteria"

  // Detail Substates
  // Tab 2a: Temuan
  const [samplings, setSamplings] = useState([]);
  const [selectedSampling, setSelectedSampling] = useState(null);
  const [temuanFormState, setTemuanFormState] = useState({
    detailTemuan: "",
    kodeTemuan: "",
  });

  // Tab 2b: Lampiran
  const [lampiranList, setLampiranList] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadKeterangan, setUploadKeterangan] = useState("");

  // Tab 2c & 2d: General Detail fields
  const [detailFormState, setDetailFormState] = useState({
    inputAspekMonitoring: "",
    inputAuditor: "",
    tipeMonitoring: "POST",
    inputAkarPenyebab: "",
    inputAkibat: "",
    inputRekomendasi: "",
    kriteria: "",
    inputKetuaAuditor: "",
    inputKetuaSpi: "",
    inputPimpinanAuditi: "",
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
    if (type === "success") {
      return confirm({
        title: "",
        message,
        type: "info"
      });
    }
    setNotification({ message, type });
  };

  // Load initial faculties and DTM lists
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/bmn/dtm?tahunAnggaran=${selectedYear}`),
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

  // Helper to find created DTM
  const findDtm = (fakultasId, tipeBmn) => {
    return dtmList.find(
      (d) => d.fakultasId === fakultasId && d.tipeBmn === tipeBmn
    );
  };

  // Handle back to list view
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDtm(null);
    setSelectedFakultas(null);
    setSelectedTipeBmn("");
    setSamplings([]);
    setSelectedSampling(null);
    setLampiranList([]);
    loadInitialData(); // Refresh list to get updated status
  };

  // Open existing DTM
  const handleBukaDtm = async (fakultas, tipeBmn, dtm) => {
    if (!dtm) return;
    setIsLoading(true);
    setSelectedFakultas(fakultas);
    setSelectedTipeBmn(tipeBmn);
    setSelectedDtm(dtm);
    setActiveTab("temuan");

    // Populate DTM values
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
      inputKetuaAuditor: dtm.inputKetuaAuditor || "",
      inputKetuaSpi: dtm.inputKetuaSpi || "",
      inputPimpinanAuditi: dtm.inputPimpinanAuditi || "",
    });

    try {
      // Parallel fetch DTM dependencies
      const [samplingsData, lampiranData] = await Promise.all([
        apiFetch(`/api/bmn/sampling/dtm/${dtm.id}`),
        apiFetch(`/api/bmn/lampiran/dtm/${dtm.id}`),
      ]);
      setSamplings(Array.isArray(samplingsData) ? samplingsData : []);
      setLampiranList(Array.isArray(lampiranData) ? lampiranData : (lampiranData ? [lampiranData] : []));
      setViewMode("detail");
    } catch (err) {
      showNotification("Gagal memuat detail data pendukung DTM: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle status BELUM_DITERUSKAN / SUDAH_DITERUSKAN
  const handleToggleStatus = async (dtm) => {
    if (!dtm) return;
    const currentStatus = dtm.statusDtm;
    const nextStatus = currentStatus === "SUDAH_DITERUSKAN" ? "BELUM_DITERUSKAN" : "SUDAH_DITERUSKAN";

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/bmn/dtm/${dtm.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusDtm: nextStatus }),
      });

      confirm({
        title: "",
        message: `Status DTM berhasil diubah menjadi ${nextStatus === "SUDAH_DITERUSKAN" ? "Sudah Selesai" : "Belum Selesai"}`,
        type: "info"
      });

      // Update selected state if currently in detail view
      if (selectedDtm && selectedDtm.id === dtm.id) {
        setSelectedDtm(updated);
      }

      // Update in initial list to sync lists without refetching immediately
      setDtmList((prev) =>
        prev.map((item) => (item.id === dtm.id ? updated : item))
      );
    } catch (err) {
      showNotification("Gagal memperbarui status DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 2a: Save Temuan (detailTemuan & kodeTemuan)
  const handleSaveTemuan = async (e) => {
    e.preventDefault();
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/bmn/dtm/${selectedDtm.id}/temuan`, {
        method: "PATCH",
        body: JSON.stringify({
          detailTemuan: temuanFormState.detailTemuan,
          kodeTemuan: temuanFormState.kodeTemuan,
        }),
      });
      setSelectedDtm(updated);
      confirm({
        title: "",
        message: "Data temuan dan kode temuan berhasil disimpan",
        type: "info"
      });
    } catch (err) {
      showNotification("Gagal menyimpan temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 2a: Auto-Insert formatted string into Quill editor
  const handleAutoInsertTemuan = (item) => {
    let kondisi = "baik";
    if (item.kondisiBarang === "RUSAK_RINGAN") kondisi = "rusak ringan";
    else if (item.kondisiBarang === "RUSAK_BERAT") kondisi = "rusak berat";
    else if (item.kondisiBarang === "HILANG") kondisi = "hilang";

    const sudahBelumDigunakan = item.penggunaan === "SUDAH_DIMANFAATKAN" ? "sudah" : "belum";
    const sudahBelumLabel = item.labelBarang === "SUDAH_DILABEL" ? "sudah" : "belum";

    const insertText = `${item.namaBarang || ""} ${item.merkAtauType || ""} ${item.jumlahBarang || 0} buah dalam keadaan ${kondisi} ${sudahBelumDigunakan} digunakan di ${item.lokasiPenempatan || "(lokasi belum diisi)"} dan ${sudahBelumLabel} dilabel.`;

    if (quillRef.current) {
      const quill = quillRef.current;
      quill.focus();
      const range = quill.getSelection();
      const position = range ? range.index : quill.getLength() - 1;

      // Insert new text on a new paragraph/newline
      quill.insertText(position, `${insertText}\n`);
      const delta = quill.getContents();
      setTemuanFormState((prev) => ({
        ...prev,
        detailTemuan: JSON.stringify(delta.ops),
      }));
      showNotification(`Temuan ${item.namaBarang} ditambahkan ke editor`);
    } else {
      // Fallback
      setTemuanFormState((prev) => {
        let currentOps = [];
        try {
          const parsed = JSON.parse(prev.detailTemuan);
          currentOps = parsed.ops || (Array.isArray(parsed) ? parsed : []);
        } catch (_) {
          if (prev.detailTemuan) {
            currentOps = [{ insert: prev.detailTemuan }];
          }
        }
        currentOps.push({ insert: `\n${insertText}\n` });
        return {
          ...prev,
          detailTemuan: JSON.stringify(currentOps),
        };
      });
      showNotification(`Temuan ${item.namaBarang} ditambahkan (Fallback)`);
    }
  };

  // Tab 2b: File upload handler (uses simplified apiFetch supporting FormData!)
  const handleUploadLampiran = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showNotification("Silakan pilih berkas gambar terlebih dahulu", "error");
      return;
    }
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("keterangan", uploadKeterangan);
      formData.append("dtmBmnId", selectedDtm.id);

      await apiFetch("/api/bmn/lampiran", {
        method: "POST",
        body: formData,
      });

      showNotification("Lampiran berhasil diunggah");
      setUploadFile(null);
      setUploadKeterangan("");

      // Clear file input manually
      const fileInput = document.getElementById("file-upload-input");
      if (fileInput) fileInput.value = "";

      // Refresh lampiran list
      const updatedLampiran = await apiFetch(`/api/bmn/lampiran/dtm/${selectedDtm.id}`);
      setLampiranList(Array.isArray(updatedLampiran) ? updatedLampiran : (updatedLampiran ? [updatedLampiran] : []));
    } catch (err) {
      showNotification("Gagal mengunggah lampiran: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 2b: Delete lampiran
  const handleDeleteLampiran = async (id) => {
    const confirmed = await confirm({
      title: "",
      message: "Apakah Anda yakin ingin menghapus lampiran ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/bmn/lampiran/${id}`, {
        method: "DELETE",
      });
      showNotification("Lampiran berhasil dihapus");
      setLampiranList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      showNotification("Gagal menghapus lampiran: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 2c & 2d: Save DTM details & criteria
  const handleSaveDetails = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/bmn/dtm/${selectedDtm.id}/detail`, {
        method: "PATCH",
        body: JSON.stringify({
          inputAspekMonitoring: detailFormState.inputAspekMonitoring || "",
          inputAuditor: detailFormState.inputAuditor || "",
          tipeMonitoring: detailFormState.tipeMonitoring || "POST",
          inputAkarPenyebab: detailFormState.inputAkarPenyebab || "",
          inputAkibat: detailFormState.inputAkibat || "",
          inputRekomendasi: detailFormState.inputRekomendasi || "",
          kriteria: detailFormState.kriteria || "",
          inputKetuaAuditor: detailFormState.inputKetuaAuditor || "",
          inputKetuaSpi: detailFormState.inputKetuaSpi || "",
          inputPimpinanAuditi: detailFormState.inputPimpinanAuditi || "",
        }),
      });
      setSelectedDtm(updated);
      confirm({
        title: "",
        message: "Detail DTM berhasil diperbarui",
        type: "info"
      });
    } catch (err) {
      showNotification("Gagal memperbarui detail DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Export to DOCX (Uses apiFetchBlob helper!)
  const handleExportDocx = async () => {
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/bmn/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: selectedDtm.id }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_BMN_${selectedFakultas?.namaFakultas || "Fakultas"}_${getTipeBmnLabel(selectedTipeBmn)}_${selectedYear}.docx`;
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

  // Action: Preview DOCX using docx-preview
  const handlePreviewDocx = async () => {
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/bmn/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: selectedDtm.id }),
      });
      setPreviewBlob(blob);
      setIsPreviewOpen(true);
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
          iframe.style.width = '100%'
          iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 50 + 'px';
        })
      }).catch((err) => {
        console.error("docx-preview error:", err);
        if (previewContainerRef.current) {
          previewContainerRef.current.innerHTML = `<div class="p-4 text-xs text-red-500 font-semibold">Gagal me-render pratinjau dokumen: ${err.message}</div>`;
        }
      });
    }
  }, [isPreviewOpen, previewBlob]);

  const getTipeBmnLabel = (tipe) => {
    switch (tipe) {
      case "BARANG_PERSEDIAAN":
        return "Barang Persediaan";
      case "PEMBELIAN_ASET":
        return "Pembelian Aset";
      case "GABUNGAN":
        return "Gabungan";
      default:
        return tipe;
    }
  };

  const isSamplingComplete = (item) => {
    return (
      item.kondisiBarang &&
      item.lokasiPenempatan &&
      item.penggunaan &&
      item.pengguna &&
      item.labelBarang
    );
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
          <h1 className="text-xl font-bold text-gray-900">DTM BMN</h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Input temuan, lampiran, detail, dan status deskripsi temuan monev."
              : `Kelola DTM: ${selectedFakultas?.namaFakultas} - ${getTipeBmnLabel(selectedTipeBmn)}`}
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
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Pratinjau
            </button>
            <button
              onClick={handleExportDocx}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium border border-gray-800 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Ekspor Word
            </button>
            <button
              onClick={() => handleToggleStatus(selectedDtm)}
              disabled={isSaving}
              className={`px-3 py-1.5 text-xs font-medium border rounded disabled:opacity-50 ${selectedDtm?.statusDtm === "SUDAH_DITERUSKAN"
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
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
            >
              Kembali
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE: LIST TABLE (Skeleton / Kerangka) */}
      {viewMode === "list" ? (
        <div>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-500 border border-gray-300 bg-white">
              Memuat data unit kerja...
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Nama Unit Kerja</Table.HeaderCell>
                  <Table.HeaderCell className="text-center">Barang Persediaan</Table.HeaderCell>
                  <Table.HeaderCell className="text-center">Pembelian Aset</Table.HeaderCell>
                  <Table.HeaderCell className="text-center">Gabungan</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fakultasList.map((fak) => {
                  const dtmPersediaan = findDtm(fak.id, "BARANG_PERSEDIAAN");
                  const dtmPembelian = findDtm(fak.id, "PEMBELIAN_ASET");
                  const dtmGabungan = findDtm(fak.id, "GABUNGAN");

                  return (
                    <Table.Row key={fak.id}>
                      <Table.Cell className="font-semibold">
                        {fak.namaFakultas}
                      </Table.Cell>

                      {/* TIPE 1: BARANG PERSEDIAAN */}
                      <Table.Cell className="text-center">
                        {dtmPersediaan ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`inline-block border px-2 py-0.5 rounded text-[10px] ${
                                dtmPersediaan.statusDtm === "SUDAH_DITERUSKAN"
                                  ? "bg-green-50 border-green-300 text-green-800"
                                  : "bg-gray-50 border-gray-300 text-gray-800"
                              }`}
                            >
                              {dtmPersediaan.statusDtm === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleBukaDtm(fak, "BARANG_PERSEDIAAN", dtmPersediaan)}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100"
                              >
                                Buka
                              </button>
                              <button
                                onClick={() => handleToggleStatus(dtmPersediaan)}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-300 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                              >
                                Ubah Status
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Belum dibuat</span>
                        )}
                      </Table.Cell>

                      {/* TIPE 2: PEMBELIAN ASET */}
                      <Table.Cell className="text-center">
                        {dtmPembelian ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`inline-block border px-2 py-0.5 rounded text-[10px] ${
                                dtmPembelian.statusDtm === "SUDAH_DITERUSKAN"
                                  ? "bg-green-50 border-green-300 text-green-800"
                                  : "bg-gray-50 border-gray-300 text-gray-800"
                              }`}
                            >
                              {dtmPembelian.statusDtm === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleBukaDtm(fak, "PEMBELIAN_ASET", dtmPembelian)}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100"
                              >
                                Buka
                              </button>
                              <button
                                onClick={() => handleToggleStatus(dtmPembelian)}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-300 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                              >
                                Ubah Status
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Belum dibuat</span>
                        )}
                      </Table.Cell>

                      {/* TIPE 3: GABUNGAN */}
                      <Table.Cell className="text-center">
                        {dtmGabungan ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`inline-block border px-2 py-0.5 rounded text-[10px] ${
                                dtmGabungan.statusDtm === "SUDAH_DITERUSKAN"
                                  ? "bg-green-50 border-green-300 text-green-800"
                                  : "bg-gray-50 border-gray-300 text-gray-800"
                              }`}
                            >
                              {dtmGabungan.statusDtm === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleBukaDtm(fak, "GABUNGAN", dtmGabungan)}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100"
                              >
                                Buka
                              </button>
                              <button
                                onClick={() => handleToggleStatus(dtmGabungan)}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-300 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                              >
                                Ubah Status
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Belum dibuat</span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      ) : (
        /* DETAIL WORKSPACE */
        <div className="space-y-6">
          {/* TAB HEADERS */}
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setActiveTab("temuan")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 ${activeTab === "temuan"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              Input Temuan
            </button>
            <button
              onClick={() => setActiveTab("lampiran")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 ${activeTab === "lampiran"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              Input Lampiran
            </button>
            <button
              onClick={() => setActiveTab("detail")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 ${activeTab === "detail"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              Detail DTM
            </button>
            <button
              onClick={() => setActiveTab("kriteria")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 ${activeTab === "kriteria"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              Edit Kriteria Audit
            </button>
          </div>

          {/* TAB CONTENTS (RENDERED BY MODULAR COMPONENTS) */}
          {activeTab === "temuan" && (
            <DtmTemuanTab
              samplings={samplings}
              selectedSampling={selectedSampling}
              setSelectedSampling={setSelectedSampling}
              temuanFormState={temuanFormState}
              setTemuanFormState={setTemuanFormState}
              handleSaveTemuan={handleSaveTemuan}
              isSaving={isSaving}
              quillRef={quillRef}
              handleAutoInsertTemuan={handleAutoInsertTemuan}
              isSamplingComplete={isSamplingComplete}
            />
          )}

          {activeTab === "lampiran" && (
            <DtmLampiranTab
              lampiranList={lampiranList}
              uploadFile={uploadFile}
              setUploadFile={setUploadFile}
              uploadKeterangan={uploadKeterangan}
              setUploadKeterangan={setUploadKeterangan}
              handleUploadLampiran={handleUploadLampiran}
              handleDeleteLampiran={handleDeleteLampiran}
              isSaving={isSaving}
            />
          )}

          {activeTab === "detail" && (
            <DtmDetailTab
              detailFormState={detailFormState}
              setDetailFormState={setDetailFormState}
              handleSaveDetails={handleSaveDetails}
              isSaving={isSaving}
            />
          )}

          {activeTab === "kriteria" && (
            <DtmKriteriaTab
              detailFormState={detailFormState}
              setDetailFormState={setDetailFormState}
              handleSaveDetails={handleSaveDetails}
              isSaving={isSaving}
            />
          )}
        </div>
      )}

      {/* DOCX PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Pratinjau Dokumen BMN (.docx)</h3>
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
                className="bg-white shadow p-8 max-w-[800px] w-full min-h-[500px] h-fit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}