import { useState, useEffect, useRef } from "react";
import * as docx from "docx-preview";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  FileText,
  Trash2,
  Upload,
  Plus,
  Image as ImageIcon,
  Save,
  ChevronRight,
  Eye,
  FileDown
} from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import BulletedTextArea from "../../components/BulletedTextArea";
import Table from "../../components/Table";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";

export default function DtmPbj() {
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected DTM states
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [activeTab, setActiveTab] = useState("kelola-paket"); // "kelola-paket" | "detail" | "kriteria"

  // Packets and details associated with selected DTM
  const [packetList, setPacketList] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [kelengkapanList, setKelengkapanList] = useState([]);

  // Packet findings and attachments
  const [findings, setFindings] = useState({
    desk: null, // { id, uraian, jenisTemuan: 'DESK_DOKUMEN' }
    visit: null // { id, ... }
  });
  const [deskFindingText, setDeskFindingText] = useState("");
  const [visitFindingText, setVisitFindingText] = useState("");
  
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [newAttachmentDesc, setNewAttachmentDesc] = useState("");
  const [newAttachmentFile, setNewAttachmentFile] = useState(null);

  // DTM detail form state
  const [detailFormState, setDetailFormState] = useState({
    inputAuditor: "",
    tipeMonitoring: "POST",
    inputAkarPenyebab: "",
    inputAkibat: "",
    inputRekomendasi: "",
    kriteria: "",
    inputUnitKerja: "",
    inputMasaMonitoring: "",
    inputTanggalMonitoring: "",
    inputKetuaAuditor: "",
    inputKetuaSpi: "",
    inputPimpinanAuditi: ""
  });

  // Preview state for docx-preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const previewContainerRef = useRef(null);

  // Loading & Notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPackets, setIsLoadingPackets] = useState(false);
  const [isLoadingPacketDetails, setIsLoadingPacketDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Load initial faculties and DTM lists
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/pbj/dtm?tahunAnggaran=${selectedYear}`)
      ]);
      setFakultasList(fakData || []);
      setDtmList(dtmData || []);
    } catch (err) {
      showNotification(err.message || "Gagal mengambil data awal", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [selectedYear]);

  // Find DTM for a faculty
  const findDtm = (fakultasId) => {
    return dtmList.find((d) => d.fakultasId === fakultasId);
  };

  // Switch to detail view
  const handleBukaDtm = async (fakultas, dtm) => {
    if (!dtm) return;
    setIsLoading(true);
    setSelectedFakultas(fakultas);
    setSelectedDtm(dtm);
    setActiveTab("kelola-paket");
    setSelectedPacket(null);
    setFindings({ desk: null, visit: null });
    setDeskFindingText("");
    setVisitFindingText("");
    setAttachmentsList([]);
    setKelengkapanList([]);

    // Populate DTM detail form
    setDetailFormState({
      inputAuditor: dtm.inputAuditor || "",
      tipeMonitoring: dtm.tipeMonitoring || "POST",
      inputAkarPenyebab: dtm.inputAkarPenyebab || "",
      inputAkibat: dtm.inputAkibat || "",
      inputRekomendasi: dtm.inputRekomendasi || "",
      kriteria: dtm.kriteria || "",
      inputUnitKerja: dtm.inputUnitKerja || "",
      inputMasaMonitoring: dtm.inputMasaMonitoring || "",
      inputTanggalMonitoring: dtm.inputTanggalMonitoring || "",
      inputKetuaAuditor: dtm.inputKetuaAuditor || "",
      inputKetuaSpi: dtm.inputKetuaSpi || "",
      inputPimpinanAuditi: dtm.inputPimpinanAuditi || ""
    });

    try {
      // Load packets for this DTM
      const packets = await apiFetch(`/api/pbj/paket/dtm/${dtm.id}`);
      setPacketList(packets || []);
      setViewMode("detail");
    } catch (err) {
      showNotification("Gagal memuat paket pengadaan DTM: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load findings and attachments for the selected packet
  const handleSelectPacket = async (packet) => {
    if (!packet) {
      setSelectedPacket(null);
      setFindings({ desk: null, visit: null });
      setDeskFindingText("");
      setVisitFindingText("");
      setAttachmentsList([]);
      setKelengkapanList([]);
      return;
    }
    
    setSelectedPacket(packet);
    setIsLoadingPacketDetails(true);
    try {
      const [findingsData, attachmentsData, kelengkapanData] = await Promise.all([
        apiFetch(`/api/pbj/temuan/paket/${packet.id}`),
        apiFetch(`/api/pbj/lampiran/paket/${packet.id}`),
        apiFetch(`/api/pbj/kelengkapan/paket/${packet.id}`)
      ]);

      const deskF = findingsData?.find((f) => f.jenisTemuan === "DESK_DOKUMEN") || null;
      const visitF = findingsData?.find((f) => f.jenisTemuan === "VISIT_LAPANG") || null;

      setFindings({ desk: deskF, visit: visitF });
      setDeskFindingText(deskF ? deskF.uraian : "");
      setVisitFindingText(visitF ? visitF.uraian : "");
      setAttachmentsList(attachmentsData || []);
      setKelengkapanList(kelengkapanData || []);
    } catch (err) {
      showNotification("Gagal memuat detail temuan/lampiran paket: " + err.message, "error");
    } finally {
      setIsLoadingPacketDetails(false);
    }
  };

  // Toggle DTM Status (Completed / In Progress)
  const handleToggleStatus = async (dtm) => {
    if (!dtm) return;
    const nextStatus =
      dtm.statusDtm === "SUDAH_DITERUSKAN"
        ? "BELUM_DITERUSKAN"
        : "SUDAH_DITERUSKAN";

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/pbj/dtm/${dtm.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusDtm: nextStatus })
      });

      confirm({
        title: "",
        message: `Status DTM berhasil diubah menjadi ${
          nextStatus === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"
        }`,
        type: "info"
      });

      if (selectedDtm && selectedDtm.id === dtm.id) {
        setSelectedDtm(updated);
      }

      setDtmList((prev) =>
        prev.map((item) => (item.id === dtm.id ? updated : item))
      );
    } catch (err) {
      showNotification("Gagal memperbarui status DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Findings
  const handleSaveFindings = async (e) => {
    e.preventDefault();
    if (!selectedPacket) return;

    setIsSaving(true);
    try {
      // 1. Save Desk Finding if modified & exists
      if (findings.desk) {
        await apiFetch(`/api/pbj/temuan/${findings.desk.id}`, {
          method: "PUT",
          body: JSON.stringify({ uraian: deskFindingText })
        });
      }

      // 2. Save Visit Finding
      if (findings.visit) {
        // Edit existing
        await apiFetch(`/api/pbj/temuan/${findings.visit.id}`, {
          method: "PUT",
          body: JSON.stringify({ uraian: visitFindingText })
        });
      } else if (visitFindingText.trim()) {
        // Create new
        await apiFetch("/api/pbj/temuan/visit-lapang", {
          method: "POST",
          body: JSON.stringify({
            paketPbjId: selectedPacket.id,
            uraian: visitFindingText
          })
        });
      }

      confirm({
        title: "",
        message: "Temuan paket berhasil disimpan",
        type: "info"
      });
      // Reload findings
      await handleSelectPacket(selectedPacket);
    } catch (err) {
      showNotification("Gagal menyimpan temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Attachment
  const handleAddAttachmentSubmit = async (e) => {
    e.preventDefault();
    if (!newAttachmentFile || !selectedPacket) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", newAttachmentFile);
      formData.append("keterangan", newAttachmentDesc);
      formData.append("paketPbjId", selectedPacket.id);

      await apiFetch("/api/pbj/lampiran", {
        method: "POST",
        body: formData
      });

      showNotification("Foto lampiran berhasil ditambahkan");
      setNewAttachmentDesc("");
      setNewAttachmentFile(null);
      // Reset input element
      const fileInput = document.getElementById("attachment-file-input");
      if (fileInput) fileInput.value = "";

      // Refresh attachments list
      const updatedAttachments = await apiFetch(`/api/pbj/lampiran/paket/${selectedPacket.id}`);
      setAttachmentsList(updatedAttachments || []);
    } catch (err) {
      showNotification("Gagal mengunggah lampiran: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (attachmentId) => {
    const confirmed = await confirm({
      title: "",
      message: "Apakah Anda yakin ingin menghapus foto lampiran ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/pbj/lampiran/${attachmentId}`, {
        method: "DELETE"
      });
      showNotification("Lampiran berhasil dihapus");
      
      // Refresh list
      const updatedAttachments = await apiFetch(`/api/pbj/lampiran/paket/${selectedPacket.id}`);
      setAttachmentsList(updatedAttachments || []);
    } catch (err) {
      showNotification("Gagal menghapus lampiran: " + err.message, "error");
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
      const updated = await apiFetch(`/api/pbj/dtm/${selectedDtm.id}/detail`, {
        method: "PATCH",
        body: JSON.stringify({
          inputAuditor: detailFormState.inputAuditor || "",
          tipeMonitoring: detailFormState.tipeMonitoring || "POST",
          inputAkarPenyebab: detailFormState.inputAkarPenyebab || "",
          inputAkibat: detailFormState.inputAkibat || "",
          inputRekomendasi: detailFormState.inputRekomendasi || "",
          kriteria: detailFormState.kriteria || "",
          inputUnitKerja: detailFormState.inputUnitKerja || "",
          inputMasaMonitoring: detailFormState.inputMasaMonitoring || "",
          inputTanggalMonitoring: detailFormState.inputTanggalMonitoring || "",
          inputKetuaAuditor: detailFormState.inputKetuaAuditor || "",
          inputKetuaSpi: detailFormState.inputKetuaSpi || "",
          inputPimpinanAuditi: detailFormState.inputPimpinanAuditi || ""
        })
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

  // Action: Export DOCX
  const handleExportDocx = async () => {
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/pbj/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: selectedDtm.id })
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_PBJ_${
        selectedFakultas?.namaFakultas || "Unit_Kerja"
      }_${selectedYear}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("Berkas Word (DOCX) berhasil diekspor");
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
      const blob = await apiFetchBlob("/api/pbj/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: selectedDtm.id })
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
          experimental: false
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
            previewContainerRef.current.innerHTML = `<div class="p-4 text-xs text-red-500 font-semibold">Gagal merender pratinjau dokumen: ${err.message}</div>`;
          }
        });
    }
  }, [isPreviewOpen, previewBlob]);

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDtm(null);
    setSelectedFakultas(null);
    setPacketList([]);
    setSelectedPacket(null);
    setKelengkapanList([]);
    loadInitialData(); // Sync list table status
  };

  // Group kelengkapan by category
  const getGroupedKelengkapan = () => {
    return kelengkapanList.reduce((acc, item) => {
      const cat = item.checklistPbj?.kategori || "Umum";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  };

  const grouped = getGroupedKelengkapan();

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
            DTM PBJ
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Kelola detail monitoring, temuan per paket, kriteria audit, dan status penyelesaian DTM PBJ."
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
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Pratinjau
            </button>
            <button
              onClick={handleExportDocx}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-800 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Ekspor Word
            </button>
            <button
              onClick={() => handleToggleStatus(selectedDtm)}
              disabled={isSaving}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded disabled:opacity-50 transition-colors ${
                selectedDtm?.statusDtm === "SUDAH_DITERUSKAN"
                  ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  : "bg-green-50 border-green-300 text-green-800 hover:bg-green-100"
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {selectedDtm?.statusDtm === "SUDAH_DITERUSKAN"
                ? "Batal Selesai"
                : "Tandai Selesai"}
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

      {/* VIEW MODE: LIST TABLE */}
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
                  <Table.HeaderCell>Unit Kerja</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-64">Status DTM</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-64">Perubahan Desk Terakhir</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-60">Aksi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fakultasList.map((fak) => {
                  const dtm = findDtm(fak.id);
                  const isCreated = !!dtm;

                  return (
                    <Table.Row key={fak.id}>
                      <Table.Cell className="font-semibold text-sm text-gray-900">
                        {fak.namaFakultas}
                      </Table.Cell>

                      {/* STATUS DTM */}
                      <Table.Cell className="text-center">
                        {isCreated ? (
                          <span
                            className={`inline-block border px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                              dtm.statusDtm === "SUDAH_DITERUSKAN"
                                ? "bg-green-50 border-green-300 text-green-800"
                                : "bg-gray-50 border-gray-300 text-gray-800"
                            }`}
                          >
                            {dtm.statusDtm === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            Belum ada berkas paket diunggah
                          </span>
                        )}
                      </Table.Cell>

                      {/* PERUBAHAN DESK TERAKHIR */}
                      <Table.Cell className="text-center">
                        {isCreated ? (
                          <span>
                            {
                              new Date(dtm.tanggalDtm).toLocaleString('id-ID', {
                                timeStyle: "medium",
                                dateStyle: "medium",
                              })
                            }
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            -
                          </span>
                        )}
                      </Table.Cell>

                      {/* ACTIONS */}
                      <Table.Cell className="text-center">
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
                          <span className="text-[10px] text-gray-400 font-semibold">-</span>
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
              onClick={() => setActiveTab("kelola-paket")}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "kelola-paket"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Input Temuan & Lampiran
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
              Kriteria Audit DTM
            </button>
          </div>

          {/* TAB 1: KELOLA PAKET (TEMUAN & LAMPIRAN) */}
          {activeTab === "kelola-paket" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: SELECT PACKET & IMAGES (span 4) */}
              <div className="lg:col-span-4 border border-gray-300 rounded p-4 bg-white space-y-4 shadow-sm min-h-[500px]">
                <div>
                  <h2 className="text-xs font-bold text-gray-900">
                    1. Rujukan Paket Pengadaan
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Pilih paket pengadaan untuk mengelola temuan dan lampiran pendukungnya.
                  </p>
                </div>

                {packetList.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-700 mb-1 uppercase tracking-wide">
                        Pilih Paket Pengadaan
                      </label>
                      <select
                        value={selectedPacket?.id || ""}
                        onChange={(e) => {
                          const packet = packetList.find(
                            (p) => p.id === parseInt(e.target.value, 10)
                          );
                          handleSelectPacket(packet);
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                      >
                        <option value="">-- Pilih Paket Pengadaan --</option>
                        {packetList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama || "Tanpa Nama"} ({p.tipeDokumen})
                          </option>
                        ))}
                      </select>
                    </div>

                    {isLoadingPacketDetails ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="text-[10px] font-semibold">Memuat rincian paket...</span>
                      </div>
                    ) : selectedPacket ? (
                      <div className="space-y-4 border-t pt-3">
                        {/* Selected Packet Info */}
                        <div className="text-[10px] bg-gray-50 border p-2.5 rounded text-gray-700 space-y-1">
                          <div>
                            <strong className="text-gray-900">Nama Paket:</strong>{" "}
                            {selectedPacket.nama || "-"}
                          </div>
                          <div>
                            <strong className="text-gray-900">Nomor Paket:</strong>{" "}
                            {selectedPacket.nomor || "-"}
                          </div>
                          <div>
                            <strong className="text-gray-900">Kategori:</strong>{" "}
                            {selectedPacket.tipeDokumen || "-"}
                          </div>
                        </div>

                        {/* Lampiran List & Upload */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
                            Dokumentasi Lampiran Foto ({attachmentsList.length})
                          </h3>

                          {attachmentsList.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                              {attachmentsList.map((photo) => (
                                <div key={photo.id} className="border border-gray-250 rounded p-1.5 bg-white relative group">
                                  {photo.link_foto && (
                                    <img
                                      src={photo.link_foto}
                                      alt={photo.keterangan || "Lampiran"}
                                      className="w-full h-24 object-cover rounded"
                                    />
                                  )}
                                  <div className="text-[9px] text-gray-500 font-semibold truncate mt-1 text-center" title={photo.keterangan}>
                                    {photo.keterangan || "Tidak ada keterangan"}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteAttachment(photo.id)}
                                    className="absolute top-1.5 right-1.5 p-1 border border-transparent rounded bg-white/90 text-red-500 hover:text-red-600 transition-colors shadow-xs"
                                    title="Hapus Lampiran"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 border border-dashed border-gray-200 rounded text-center text-[10px] text-gray-400">
                              Belum ada lampiran foto untuk paket ini.
                            </div>
                          )}

                          {/* Upload Attachment form */}
                          <form onSubmit={handleAddAttachmentSubmit} className="space-y-2 border-t pt-3">
                            <div className="text-[10px] font-bold text-gray-800">Unggah Lampiran Baru:</div>
                            
                            <input
                              id="attachment-file-input"
                              type="file"
                              required
                              accept="image/*"
                              onChange={(e) => setNewAttachmentFile(e.target.files[0])}
                              className="w-full text-[10px] text-gray-600 border border-gray-300 rounded p-0.5 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer bg-white"
                            />

                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                required
                                value={newAttachmentDesc}
                                onChange={(e) => setNewAttachmentDesc(e.target.value)}
                                placeholder="Keterangan foto..."
                                className="flex-1 text-[10px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-500 bg-white"
                              />
                              <button
                                type="submit"
                                disabled={isSaving || !newAttachmentFile}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded text-[10px] font-semibold hover:bg-gray-700 disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                                Unggah
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <div className="p-10 border border-dashed border-gray-200 rounded text-center text-xs text-gray-400">
                        Pilih salah satu paket pengadaan di atas untuk mengelola rincian temuan dan lampirannya.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center border border-dashed border-gray-200 rounded text-xs text-gray-400">
                    Belum ada paket pengadaan yang diunggah untuk DTM ini. Silakan unggah terlebih dahulu di menu Desk PBJ.
                  </div>
                )}
              </div>

              {/* MIDDLE COLUMN: CHECKLIST REQUIREMENTS RESULTS (span 4) */}
              <div className="lg:col-span-4 border border-gray-300 rounded p-4 bg-white shadow-sm min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-4">
                  <h2 className="text-xs font-bold text-gray-900">
                    2. Hasil Kelengkapan Checklist
                  </h2>
                </div>

                {isLoadingPacketDetails ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500 my-auto">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="text-[10px] font-semibold">Memuat kelengkapan checklist...</span>
                  </div>
                ) : selectedPacket ? (
                  kelengkapanList.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {Object.keys(grouped).map((kategori) => (
                        <div key={kategori} className="space-y-1.5">
                          <h3 className="text-[10px] font-extrabold text-gray-950 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded border border-gray-200">
                            {kategori}
                          </h3>
                          <div className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden bg-white">
                            {grouped[kategori].map((item) => (
                              <div key={item.id} className="p-2.5 hover:bg-gray-55 space-y-1">
                                <div className="text-xs font-semibold text-gray-900 leading-relaxed">
                                  {item.checklistPbj?.uraian}
                                  {item.checklistPbj?.namaSingkat && (
                                    <span className="ml-1 text-[9px] text-gray-400 font-bold">
                                      ({item.checklistPbj.namaSingkat})
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] pt-1">
                                  <span className={`px-1.5 py-0.5 rounded font-bold border ${
                                    item.ada
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                      : "bg-rose-50 border-rose-200 text-rose-700"
                                  }`}>
                                    {item.ada ? "Ada" : "Tidak Ada"}
                                  </span>
                                  {item.ada && (
                                    <span className={`px-1.5 py-0.5 rounded font-bold border ${
                                      item.sesuai
                                        ? "bg-teal-50 border-teal-200 text-teal-700"
                                        : "bg-amber-50 border-amber-200 text-amber-700"
                                    }`}>
                                      {item.sesuai ? "Sesuai" : "Tidak Sesuai"}
                                    </span>
                                  )}
                                  {item.catatan && (
                                    <div className="text-[9px] text-gray-500 italic mt-0.5 w-full">
                                      Catatan: {item.catatan}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-gray-400 py-20 my-auto">
                      Belum ada hasil checklist diisi untuk paket ini.
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-36 gap-2 text-center text-gray-400 text-xs my-auto">
                    <CheckCircle className="w-12 h-12 text-gray-300 stroke-1" />
                    Pilih paket pengadaan di panel kiri untuk melihat hasil checklist kelengkapan.
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: FINDINGS AREA (span 4) */}
              <div className="lg:col-span-4 border border-gray-300 rounded p-4 bg-white shadow-sm min-h-[500px]">
                <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-4">
                  <h2 className="text-xs font-bold text-gray-900">
                    3. Pengisian Temuan Paket
                  </h2>
                  {selectedPacket && (
                    <button
                      onClick={handleSaveFindings}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-800 text-white text-xs font-bold rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan Temuan
                    </button>
                  )}
                </div>

                {selectedPacket ? (
                  <form onSubmit={handleSaveFindings} className="space-y-5">
                    {/* DESK DOKUMEN FINDING */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700">
                          Temuan Desk
                        </label>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          Dibuat Sistem Dari Checklist
                        </span>
                      </div>
                      <BulletedTextArea
                        value={deskFindingText}
                        onChange={setDeskFindingText}
                        placeholder="Detail temuan desk dokumen pengadaan..."
                        height="150px"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Catatan: Hasil di atas dirangkum otomatis dari checklist Desk. Anda tetap dapat mengedit deskripsi ini secara manual.
                      </p>
                    </div>

                    {/* VISIT LAPANG FINDING */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700">
                          Temuan Visit Lapang
                        </label>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          Auditor Manual Input
                        </span>
                      </div>
                      <BulletedTextArea
                        value={visitFindingText}
                        onChange={setVisitFindingText}
                        placeholder="Tulis butir-butir temuan hasil visit lapangan/fisik di sini..."
                        height="150px"
                      />
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col items-center justify-center py-36 gap-2 text-center text-gray-400 text-xs">
                    <FileText className="w-12 h-12 text-gray-300 stroke-1" />
                    Silakan pilih paket pengadaan di panel kiri terlebih dahulu untuk melihat dan mengedit temuan desk/lapangan.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: DETAIL DTM */}
          {activeTab === "detail" && (
            <div className="border border-gray-300 rounded p-5 bg-white shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Informasi Detail DTM PBJ
              </h2>

              <form onSubmit={handleSaveDetails} className="space-y-4 max-w-4xl">
                {/* ROW 1: NAMA-NAMA AUDITOR */}
                <div className="border-t border-gray-150 pt-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Auditor (Satu per baris)
                  </label>
                  <BulletedTextArea
                    value={detailFormState.inputAuditor || ""}
                    onChange={(val) =>
                      setDetailFormState({ ...detailFormState, inputAuditor: val })
                    }
                    placeholder="Tulis nama-nama auditor, satu per baris..."
                  />
                </div>

                {/* ROW 2: TIPE MONITORING & TANGGAL MONITORING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tipe Monitoring
                    </label>
                    <select
                      value={detailFormState.tipeMonitoring}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          tipeMonitoring: e.target.value
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                    >
                      <option value="POST">POST</option>
                      <option value="ON_GOING">ON_GOING</option>
                      <option value="PERENCANAAN">PERENCANAAN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tanggal Monitoring
                    </label>
                    <input
                      type="date"
                      value={detailFormState.inputTanggalMonitoring ? detailFormState.inputTanggalMonitoring.split("T")[0] : ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputTanggalMonitoring: e.target.value
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                    />
                  </div>
                </div>

                {/* ROW 3: UNIT KERJA INPUT & MASA MONITORING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit Kerja Auditi
                    </label>
                    <input
                      type="text"
                      value={detailFormState.inputUnitKerja || ""}
                      onChange={(e) =>
                        setDetailFormState({
                          ...detailFormState,
                          inputUnitKerja: e.target.value
                        })
                      }
                      placeholder="Masukkan unit kerja..."
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                    />
                  </div>

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
                          inputMasaMonitoring: e.target.value
                        })
                      }
                      placeholder="Contoh: Januari - Juni 2026"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                    />
                  </div>
                </div>

                {/* ROW 4: AKAR PENYEBAB & AKIBAT & REKOMENDASI */}
                <div className="space-y-4 border-t pt-3">
                  <div className="text-xs font-bold text-gray-800">Analisis Temuan DTM:</div>

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
                      placeholder="Tulis butir-butir dampak/akibat dari masalah..."
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
                      placeholder="Tulis butir-butir rekomendasi perbaikan..."
                    />
                  </div>
                </div>

                {/* ROW 5: PENANDATANGAN / AUTHORITIES */}
                <div className="space-y-4 border-t pt-3">
                  <div className="text-xs font-bold text-gray-800">Verifikator & Tanda Tangan:</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ketua Auditor
                      </label>
                      <input
                        type="text"
                        value={detailFormState.inputKetuaAuditor || ""}
                        onChange={(e) =>
                          setDetailFormState({
                            ...detailFormState,
                            inputKetuaAuditor: e.target.value
                          })
                        }
                        placeholder="Nama Ketua Auditor..."
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ketua SPI
                      </label>
                      <input
                        type="text"
                        value={detailFormState.inputKetuaSpi || ""}
                        onChange={(e) =>
                          setDetailFormState({
                            ...detailFormState,
                            inputKetuaSpi: e.target.value
                          })
                        }
                        placeholder="Nama Ketua SPI..."
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Pimpinan Auditi
                      </label>
                      <input
                        type="text"
                        value={detailFormState.inputPimpinanAuditi || ""}
                        onChange={(e) =>
                          setDetailFormState({
                            ...detailFormState,
                            inputPimpinanAuditi: e.target.value
                          })
                        }
                        placeholder="Nama Pimpinan Auditi..."
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Simpan Detail DTM
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: KRITERIA AUDIT DTM */}
          {activeTab === "kriteria" && (
            <div className="border border-gray-300 rounded p-5 bg-white shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Kriteria Khusus Audit DTM PBJ
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveDetails();
                }}
                className="space-y-4 max-w-4xl"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Butir-Butir Kriteria Hukum / Peraturan
                  </label>
                  <BulletedTextArea
                    value={detailFormState.kriteria || ""}
                    onChange={(val) =>
                      setDetailFormState({ ...detailFormState, kriteria: val })
                    }
                    placeholder="Tulis butir-butir peraturan yang relevan untuk unit kerja ini..."
                  />
                  <p className="text-[10px] text-gray-400 mt-2">
                    Kriteria di atas diwarisi dari pengaturan default, namun Anda dapat memodifikasinya khusus untuk audit unit kerja ini tanpa mempengaruhi setelan default global.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Simpan Kriteria
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* DOCX PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                Pratinjau DTM PBJ - {selectedFakultas?.namaFakultas}
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
                className="bg-white shadow p-8 max-w-[800px] w-full min-h-[500px] h-fit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

