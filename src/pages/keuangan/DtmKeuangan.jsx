import { useState, useEffect, useRef } from "react";
import * as docx from "docx-preview";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  FileText,
  Trash2,
  Plus,
  Save,
  ChevronRight,
  Eye,
  FileDown,
  ArrowRight,
  Edit,
  Check,
  ClipboardList
} from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import BulletedTextArea from "../../components/BulletedTextArea";
import Table from "../../components/Table";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";

export default function DtmKeuangan() {
  const confirm = useConfirm();
  
  const [selectedYear, setSelectedYear] = useState("2026");
  const [facultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected DTM states
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [activeTab, setActiveTab] = useState("kelola-temuan"); // "kelola-temuan" | "detail" | "kriteria"

  // Findings lists
  const [temuanSebelum, setTemuanSebelum] = useState([]);
  const [temuanSetelah, setTemuanSetelah] = useState([]);

  // Form states
  const [newSebelumForm, setNewSebelumForm] = useState(false);
  const [newSetelahForm, setNewSetelahForm] = useState(false);

  // Form input states (Untuk tambah manual setelah visitasi)
  const [formNoBuku, setFormNoBuku] = useState("");
  const [formUraian, setFormUraian] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formKategori, setFormKategori] = useState("DITEMUKAN");
  const [formKode, setFormKode] = useState("");

  // Edit Finding State
  const [editingFinding, setEditingFinding] = useState(null);
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [editKategori, setEditKategori] = useState("DITEMUKAN");
  const [editKode, setEditKode] = useState("");
  const [editUraian, setEditUraian] = useState("");
  const [editNoBuku, setEditNoBuku] = useState("");

  // DTM detail form state
  const [detailFormState, setDetailFormState] = useState({
    inputUnitKerja: "",
    inputAspekAudit: "",
    inputMasaAudit: "",
    inputTanggalAudit: "",
    inputAuditor: "",
    kriteria: "",
    tipeMonitoring: "POST",
    inputAkarPenyebab: "",
    inputAkibat: "",
    inputRekomendasi: "",
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
        apiFetch(`/api/keuangan/dtm/${selectedYear}`)
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

  const loadFindingsForDtm = async (dtmId) => {
    try {
      const data = await apiFetch(`/api/keuangan/temuan/dtm/${dtmId}`);
      const sebelum = (data || []).filter(f => f.statusTemuan === "SEBELUM_VISITASI");
      const setelah = (data || []).filter(f => f.statusTemuan === "SETELAH_VISITASI");
      setTemuanSebelum(sebelum);
      setTemuanSetelah(setelah);
    } catch (err) {
      console.error("Gagal memuat temuan DTM:", err);
    }
  };

  // Switch to detail view
  const handleBukaDtm = async (fakultas, dtm) => {
    if (!dtm) return;
    setIsLoading(true);
    setSelectedFakultas(fakultas);
    setSelectedDtm(dtm);
    setActiveTab("kelola-temuan");
    setEditingFinding(null);
    setNewSetelahForm(false);

    // Populate DTM detail form
    setDetailFormState({
      inputUnitKerja: dtm.inputUnitKerja || fakultas.namaFakultas || "",
      inputAspekAudit: dtm.inputAspekAudit || "",
      inputMasaAudit: dtm.inputMasaAudit || "",
      inputTanggalAudit: dtm.inputTanggalAudit ? dtm.inputTanggalAudit.split("T")[0] : "",
      inputAuditor: dtm.inputAuditor || "",
      kriteria: dtm.kriteria || "",
      tipeMonitoring: dtm.tipeMonitoring || "POST",
      inputAkarPenyebab: dtm.inputAkarPenyebab || "",
      inputAkibat: dtm.inputAkibat || "",
      inputRekomendasi: dtm.inputRekomendasi || "",
      inputKetuaAuditor: dtm.inputKetuaAuditor || "",
      inputKetuaSpi: dtm.inputKetuaSpi || "",
      inputPimpinanAuditi: dtm.inputPimpinanAuditi || ""
    });

    try {
      await loadFindingsForDtm(dtm.id);
      setViewMode("detail");
    } catch (err) {
      showNotification("Gagal memuat temuan DTM: " + err.message, "error");
    } finally {
      setIsLoading(false);
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
      const updated = await apiFetch(`/api/keuangan/dtm/${dtm.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });

      confirm({
        title: "",
        message: `Status DTM berhasil diubah menjadi ${
          nextStatus === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"
        }`,
        type: "info"
      });

      if (selectedDtm && selectedDtm.id === dtm.id) {
        setSelectedDtm(updated.data);
      }

      setDtmList((prev) =>
        prev.map((item) => (item.id === dtm.id ? updated.data : item))
      );
    } catch (err) {
      showNotification("Gagal memperbarui status DTM: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy temporary finding to final finding
  const handleCopySebelumKeSetelah = async (finding) => {
    setIsSaving(true);
    try {
      await apiFetch("/api/keuangan/temuan/setelah-visitasi", {
        method: "POST",
        body: JSON.stringify({
          fakultas: selectedFakultas.namaFakultas,
          tahunAnggaran: selectedYear,
          noBuku: finding.noBuku,
          uraianTransaksi: finding.uraianTransaksi,
          deskripsiTemuan: finding.deskripsiTemuan,
          kategoriTemuan: finding.kategoriTemuan,
          kodeTemuan: finding.kodeTemuan,
        }),
      });

      confirm({
        title: "",
        message: "Temuan sementara berhasil disalin menjadi temuan final",
        type: "info"
      });
      await loadFindingsForDtm(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal menyalin temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Create manual final finding
  const handleAddSetelah = async (e) => {
    e.preventDefault();
    if (!formNoBuku || !formDeskripsi) {
      showNotification("Nomor Buku dan Deskripsi Temuan wajib diisi", "error");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch("/api/keuangan/temuan/setelah-visitasi", {
        method: "POST",
        body: JSON.stringify({
          fakultas: selectedFakultas.namaFakultas,
          tahunAnggaran: selectedYear,
          noBuku: parseInt(formNoBuku, 10),
          uraianTransaksi: formUraian,
          deskripsiTemuan: formDeskripsi,
          kategoriTemuan: formKategori,
          kodeTemuan: formKode,
        }),
      });

      confirm({
        title: "",
        message: "Temuan setelah visitasi (final) berhasil ditambahkan",
        type: "info"
      });
      setNewSetelahForm(false);
      setFormNoBuku("");
      setFormUraian("");
      setFormDeskripsi("");
      setFormKode("");
      await loadFindingsForDtm(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal menyimpan temuan final: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Start edit finding
  const handleStartEdit = (finding) => {
    setEditingFinding(finding);
    setEditDeskripsi(finding.deskripsiTemuan || "");
    setEditKategori(finding.kategoriTemuan || "DITEMUKAN");
    setEditKode(finding.kodeTemuan || "");
    setEditUraian(finding.uraianTransaksi || "");
    setEditNoBuku(finding.noBuku || "");
  };

  // Update Finding
  const handleUpdateFinding = async (e) => {
    e.preventDefault();
    if (!editingFinding) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/keuangan/temuan/${editingFinding.id}`, {
        method: "PUT",
        body: JSON.stringify({
          noBuku: parseInt(editNoBuku, 10),
          uraianTransaksi: editUraian,
          deskripsiTemuan: editDeskripsi,
          kategoriTemuan: editKategori,
          kodeTemuan: editKode,
          statusTemuan: editingFinding.statusTemuan,
        }),
      });

      confirm({
        title: "",
        message: "Temuan berhasil diperbarui",
        type: "info"
      });
      setEditingFinding(null);
      await loadFindingsForDtm(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal memperbarui temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Finding
  const handleDeleteFinding = async (id) => {
    const confirmed = await confirm({
      title: "",
      message: "Apakah Anda yakin ingin menghapus temuan ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/keuangan/temuan/${id}`, {
        method: "DELETE"
      });
      confirm({
        title: "",
        message: "Temuan berhasil dihapus",
        type: "info"
      });
      await loadFindingsForDtm(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal menghapus temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save DTM Details (Metada)
  const handleSaveDetails = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/keuangan/dtm/${selectedDtm.id}/detail`, {
        method: "PATCH",
        body: JSON.stringify({
          inputUnitKerja: detailFormState.inputUnitKerja,
          inputAspekAudit: detailFormState.inputAspekAudit,
          inputMasaAudit: detailFormState.inputMasaAudit,
          inputTanggalAudit: detailFormState.inputTanggalAudit ? new Date(detailFormState.inputTanggalAudit).toISOString() : null,
          inputAuditor: detailFormState.inputAuditor,
          kriteria: detailFormState.kriteria,
          tipeMonitoring: detailFormState.tipeMonitoring,
          inputAkarPenyebab: detailFormState.inputAkarPenyebab,
          inputAkibat: detailFormState.inputAkibat,
          inputRekomendasi: detailFormState.inputRekomendasi,
          inputKetuaAuditor: detailFormState.inputKetuaAuditor,
          inputKetuaSpi: detailFormState.inputKetuaSpi,
          inputPimpinanAuditi: detailFormState.inputPimpinanAuditi
        })
      });
      setSelectedDtm(updated.data);
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
      const blob = await apiFetchBlob("/api/keuangan/office/export-docx/setelah", {
        method: "POST",
        body: JSON.stringify({ dtmKeuanganId: selectedDtm.id })
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_Keuangan_${
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
      const blob = await apiFetchBlob("/api/keuangan/office/export-docx/setelah", {
        method: "POST",
        body: JSON.stringify({ dtmKeuanganId: selectedDtm.id })
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
    setTemuanSebelum([]);
    setTemuanSetelah([]);
    loadInitialData(); // Sync list table status
  };

  // Check if a sebelum visitasi finding is already copied (exists in setelah visitasi)
  const isCopiedToSetelah = (sebelumFinding) => {
    return temuanSetelah.some(f => f.noBuku === sebelumFinding.noBuku);
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
            DTM Keuangan
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Kelola detail audit keuangan, temuan audit (sebelum & setelah visitasi), dan status penyelesaian DTM."
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
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-55 rounded disabled:opacity-50 transition-colors"
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
                  <Table.HeaderCell className="text-center w-48">Status DTM</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-48">Temuan Sementara</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-48">Temuan Final</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-60">Aksi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {facultasList.map((fak) => {
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
                            Belum pernah membuat temuan
                          </span>
                        )}
                      </Table.Cell>

                      {/* SEBELUM VISITASI COUNT */}
                      <Table.Cell className="text-center font-bold font-mono">
                        {isCreated ? dtm._count?.TemuanKeuangan.sebelumVisitasi ?? 0 : 0}
                      </Table.Cell>

                      {/* SETELAH VISITASI COUNT */}
                      <Table.Cell className="text-center font-bold font-mono">
                        {isCreated ? dtm._count?.TemuanKeuangan.setelahVisitasi ?? 0 : 0}
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
              onClick={() => { setActiveTab("kelola-temuan"); setEditingFinding(null); }}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "kelola-temuan"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Kelola Temuan DTM
            </button>
            <button
              onClick={() => { setActiveTab("detail"); setEditingFinding(null); }}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "detail"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Detail DTM
            </button>
            <button
              onClick={() => { setActiveTab("kriteria"); setEditingFinding(null); }}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none -mb-px border-b-2 transition-colors ${
                activeTab === "kriteria"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Kriteria Audit DTM
            </button>
          </div>

          {/* TAB 1: KELOLA TEMUAN (SEBELUM VS SETELAH) */}
          {activeTab === "kelola-temuan" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT PANEL: TEMUAN SEBELUM VISITASI (span 6) */}
              <div className="lg:col-span-6 border border-gray-300 rounded p-4 bg-white space-y-4 shadow-sm min-h-[500px]">
                <div>
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-indigo-700" />
                    Temuan Sebelum Visitasi (Sementara)
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Temuan awal dari jurnal kas yang dimasukkan sebelum rapat lapangan dilakukan.
                  </p>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {temuanSebelum.length > 0 ? (
                    temuanSebelum.map((item) => {
                      const isCopied = isCopiedToSetelah(item);
                      return (
                        <div
                          key={item.id}
                          className={`border rounded p-3 space-y-2 relative shadow-2xs group transition-colors ${
                            isCopied ? "bg-green-50 border-green-300" : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="px-2 py-0.5 border text-[9px] font-bold rounded font-mono bg-indigo-50 border-indigo-200 text-indigo-700">
                              Buku: {item.noBuku || "-"}
                            </span>
                            
                            {isCopied ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-green-150 text-green-800 border border-green-300">
                                <Check className="w-2.5 h-2.5" /> Sudah Final
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCopySebelumKeSetelah(item)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-0.5 px-2.5 py-1 text-[9px] font-bold bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
                                title="Salin temuan ini ke temuan setelah visitasi (final)"
                              >
                                Salin ke Final
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-gray-800 space-y-1">
                            <div>
                              <strong className="text-gray-900">Uraian Transaksi:</strong>{" "}
                              {item.uraianTransaksi || "-"}
                            </div>
                            <div>
                              <strong className="text-gray-900">Temuan Audit:</strong>{" "}
                              {item.deskripsiTemuan}
                            </div>
                            {item.kodeTemuan && (
                              <div className="text-[9px] text-gray-400 font-mono">
                                Kode: {item.kodeTemuan}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center border border-dashed border-gray-200 rounded text-xs text-gray-400 italic">
                      Belum ada temuan sementara yang dibuat untuk DTM ini.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: TEMUAN SETELAH VISITASI (FINAL) (span 6) */}
              <div className="lg:col-span-6 border border-gray-300 rounded p-4 bg-white space-y-4 shadow-sm min-h-[500px]">
                <div className="flex justify-between items-center border-b pb-2">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Temuan Setelah Visitasi (Final)
                    </h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Temuan resmi/akhir yang disepakati setelah proses visitasi lapangan.
                    </p>
                  </div>
                  
                  {!newSetelahForm && !editingFinding && (
                    <button
                      onClick={() => {
                        setNewSetelahForm(true);
                        setFormNoBuku("");
                        setFormUraian("");
                        setFormDeskripsi("");
                        setFormKode("");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 text-white rounded text-[10px] font-bold hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Manual
                    </button>
                  )}
                </div>

                {/* EDIT FORM VIEW */}
                {editingFinding && (
                  <div className="border border-gray-300 rounded p-4 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-gray-900">Ubah Temuan Final</h3>
                    <form onSubmit={handleUpdateFinding} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nomor Buku</label>
                        <input
                          type="number"
                          required
                          value={editNoBuku}
                          onChange={(e) => setEditNoBuku(e.target.value)}
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none bg-white font-mono"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Uraian Transaksi</label>
                        <textarea
                          rows="2"
                          value={editUraian}
                          onChange={(e) => setEditUraian(e.target.value)}
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                          placeholder="Masukkan uraian transaksi..."
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Deskripsi Temuan</label>
                        <textarea
                          rows="3"
                          required
                          value={editDeskripsi}
                          onChange={(e) => setEditDeskripsi(e.target.value)}
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                          placeholder="Tuliskan detail temuan..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kategori</label>
                          <select
                            value={editKategori}
                            onChange={(e) => setEditKategori(e.target.value)}
                            className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                          >
                            <option value="DITEMUKAN">Ditemukan</option>
                            <option value="PERLU_KONFIRMASI">Perlu Konfirmasi</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kode Temuan</label>
                          <input
                            type="text"
                            value={editKode}
                            onChange={(e) => setEditKode(e.target.value)}
                            placeholder="Kode temuan..."
                            className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingFinding(null)}
                          className="px-3 py-1.5 border border-gray-300 text-[10px] font-bold rounded hover:bg-gray-100"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded"
                        >
                          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ADD NEW MANUAL FINAL FORM */}
                {newSetelahForm && (
                  <div className="border border-gray-350 rounded p-4 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-gray-900">Tambah Temuan Final</h3>
                    <form onSubmit={handleAddSetelah} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nomor Buku</label>
                        <input
                          type="number"
                          required
                          value={formNoBuku}
                          onChange={(e) => setFormNoBuku(e.target.value)}
                          placeholder="Nomor kuitansi/buku..."
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none bg-white font-mono"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Uraian Transaksi</label>
                        <textarea
                          rows="2"
                          value={formUraian}
                          onChange={(e) => setFormUraian(e.target.value)}
                          placeholder="Deskripsi uraian jurnal kas..."
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Deskripsi Temuan</label>
                        <textarea
                          rows="3"
                          required
                          value={formDeskripsi}
                          onChange={(e) => setFormDeskripsi(e.target.value)}
                          placeholder="Catatan temuan penyimpangan..."
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kategori</label>
                          <select
                            value={formKategori}
                            onChange={(e) => setFormKategori(e.target.value)}
                            className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                          >
                            <option value="DITEMUKAN">Ditemukan</option>
                            <option value="PERLU_KONFIRMASI">Perlu Konfirmasi</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kode Temuan</label>
                          <input
                            type="text"
                            value={formKode}
                            onChange={(e) => setFormKode(e.target.value)}
                            placeholder="Contoh: KEU-02"
                            className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setNewSetelahForm(false)}
                          className="px-3 py-1.5 border border-gray-300 text-[10px] font-bold rounded hover:bg-gray-100"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded"
                        >
                          {isSaving ? "Menyimpan..." : "Simpan"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* LIST OF FINAL FINDINGS */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {temuanSetelah.length > 0 ? (
                    temuanSetelah.map((item) => {
                      return (
                        <div
                        key={item.id}
                        className="border border-gray-200 hover:border-gray-300 rounded p-3 bg-white space-y-2 relative shadow-2xs group"
                      >
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 border text-[9px] font-bold rounded font-mono bg-emerald-50 border-emerald-250 text-emerald-700">
                            Buku: {item.noBuku || "-"}
                          </span>
                          <span
                            className={`px-2 py-0.5 border text-[9px] font-bold rounded ${
                              item.kategoriTemuan === "DITEMUKAN"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {item.kategoriTemuan === "DITEMUKAN" ? "Ditemukan" : "Perlu Konfirmasi"}
                          </span>
                        </div>
                        
                        <div className="text-[10px] text-gray-800 space-y-1">
                          <div>
                            <strong className="text-gray-900">Uraian Transaksi:</strong>{" "}
                            {item.uraianTransaksi || "-"}
                          </div>
                          <div>
                            <strong className="text-gray-900">Temuan Audit:</strong>{" "}
                            {item.deskripsiTemuan}
                          </div>
                          {item.kodeTemuan && (
                            <div className="text-[9px] text-gray-400 font-mono">
                              Kode: {item.kodeTemuan}
                            </div>
                          )}
                        </div>

                        {/* HOVER ACTIONS */}
                        <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-[9px] border border-gray-350 bg-white hover:bg-gray-100 text-gray-700 rounded font-bold transition-colors"
                          >
                            <Edit className="w-2.5 h-2.5" />
                            Ubah
                          </button>
                          <button
                            onClick={() => handleDeleteFinding(item.id)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-[9px] border border-transparent bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })
                  ) : (
                    <div className="p-12 text-center border border-dashed border-gray-200 rounded text-xs text-gray-400 italic">
                      Belum ada temuan final. Klik "Salin ke Final" di sisi kiri untuk memindahkan temuan sementara, atau klik "Tambah Manual" di atas.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DETAIL DTM FORM */}
          {activeTab === "detail" && (
            <div className="bg-white border border-gray-300 rounded p-6 shadow-sm max-w-4xl">
              <form onSubmit={handleSaveDetails} className="space-y-6">
                <h2 className="text-xs font-bold text-gray-900 pb-2 border-b uppercase tracking-wider">
                  Informasi Pelaporan Audit Keuangan
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Unit Kerja Auditi
                      </label>
                      <input
                        type="text"
                        required
                        value={detailFormState.inputUnitKerja}
                        onChange={(e) => setDetailFormState({ ...detailFormState, inputUnitKerja: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                        placeholder="Nama Unit Kerja"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Masa Audit
                      </label>
                      <input
                        type="text"
                        required
                        value={detailFormState.inputMasaAudit}
                        onChange={(e) => setDetailFormState({ ...detailFormState, inputMasaAudit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none bg-white"
                        placeholder="Contoh: Januari – Juni 2026"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tanggal Audit
                      </label>
                      <input
                        type="date"
                        required
                        value={detailFormState.inputTanggalAudit}
                        onChange={(e) => setDetailFormState({ ...detailFormState, inputTanggalAudit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none bg-white"
                      />
                    </div>

                    <div>
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

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tipe Monitoring
                      </label>
                      <select
                        value={detailFormState.tipeMonitoring}
                        onChange={(e) => setDetailFormState({ ...detailFormState, tipeMonitoring: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs focus:outline-none"
                      >
                        <option value="POST">POST (Setelah Kejadian)</option>
                        <option value="ON_GOING">ON GOING (Sedang Berjalan)</option>
                        <option value="PERENCANAAN">PERENCANAAN (Awal)</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ketua Auditor Divisi
                      </label>
                      <input
                        type="text"
                        value={detailFormState.inputKetuaAuditor}
                        onChange={(e) => setDetailFormState({ ...detailFormState, inputKetuaAuditor: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none bg-white"
                        placeholder="Nama Ketua Auditor Keuangan"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ketua SPI
                      </label>
                      <input
                        type="text"
                        value={detailFormState.inputKetuaSpi}
                        onChange={(e) => setDetailFormState({ ...detailFormState, inputKetuaSpi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none bg-white"
                        placeholder="Nama Ketua SPI"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Pimpinan Auditi (Unit Kerja)
                      </label>
                      <input
                        type="text"
                        value={detailFormState.inputPimpinanAuditi}
                        onChange={(e) => setDetailFormState({ ...detailFormState, inputPimpinanAuditi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none bg-white"
                        placeholder="Nama Dekan / Kepala Unit Kerja"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Akar Penyebab</label>
                    <BulletedTextArea
                      value={detailFormState.inputAkarPenyebab}
                      onChange={(val) => setDetailFormState({ ...detailFormState, inputAkarPenyebab: val })}
                      placeholder="Masukkan akar penyebab terjadinya ketidaksesuaian keuangan..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Akibat</label>
                    <BulletedTextArea
                      value={detailFormState.inputAkibat}
                      onChange={(val) => setDetailFormState({ ...detailFormState, inputAkibat: val })}
                      placeholder="Dampak/akibat dari temuan ini..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Rekomendasi Tindak Lanjut</label>
                    <BulletedTextArea
                      value={detailFormState.inputRekomendasi}
                      onChange={(val) => setDetailFormState({ ...detailFormState, inputRekomendasi: val })}
                      placeholder="Rekomendasi perbaikan tata kelola kas..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-250">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? "Menyimpan..." : "Simpan Detail DTM"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: KRITERIA FORM */}
          {activeTab === "kriteria" && (
            <div className="bg-white border border-gray-300 rounded p-6 shadow-sm max-w-4xl">
              <form onSubmit={handleSaveDetails} className="space-y-6">
                <div>
                  <h2 className="text-xs font-bold text-gray-900 pb-2 border-b uppercase tracking-wider mb-4">
                    Kriteria Audit DTM Keuangan
                  </h2>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Kriteria Hukum / Dasar Hukum untuk Unit Kerja Ini
                  </label>
                  <BulletedTextArea
                    value={detailFormState.kriteria}
                    onChange={(val) => setDetailFormState({ ...detailFormState, kriteria: val })}
                    placeholder="Contoh: Peraturan Rektor No 5 Tahun 2024 tentang SPJ Keuangan..."
                  />
                  <p className="text-[10px] text-gray-400 mt-2">
                    Kriteria hukum di atas berlaku khusus untuk Unit Kerja ini. Klik "Simpan Kriteria" untuk menyimpan perubahan.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
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
                Pratinjau DTM Keuangan - {selectedFakultas?.namaFakultas}
              </h3>
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
                className="bg-white shadow p-8 max-w-[800px] w-full min-h-[500px] h-fit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
