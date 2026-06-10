import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch, apiFetchBlob } from "../lib/api";
import BulletedTextArea from "../components/BulletedTextArea";
import Notification from "../components/Notification";
import {
  FileText,
  ChevronRight,
  Loader2,
  Eye,
  FileDown,
  Edit,
  Trash2,
  X,
  FileSignature
} from "lucide-react";
import * as docx from "docx-preview";

export default function BeritaAcaraPage() {
  const { user } = useAuth();
  const isPbj = user?.role === "PBJ";

  // Tab State: 'awal' (VISITASI_MONEV), 'akhir' (FINAL_MEETING), 'riwayat'
  const [activeTab, setActiveTab] = useState("awal");

  // Master Data
  const [faculties, setFaculties] = useState([]);
  const [reports, setReports] = useState([]);

  // Form states
  const initialFormState = {
    namaAuditor: "",
    jabatanAuditor: "",
    jenisAudit: "",
    tanggal: "",
    unitKerjaAuditi: "",
    lokasiPenandatanganan: "",
    tanggalPenandatanganan: "",
    namaPenandatanganAuditi: "",
    namaPenandatanganAuditor: "",
    paketPaket: "",
    sikap: "MENERIMA_SELURUH",
  };

  const [form, setForm] = useState({ ...initialFormState });

  // Detail & Edit states
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Preview state for docx-preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const previewContainerRef = useRef(null);

  // Loading & notification states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Fetch initial faculties
  const loadFaculties = async () => {
    try {
      const data = await apiFetch("/api/fakultas");
      setFaculties(data);
      if (data.length > 0) {
        setForm((prev) => ({ ...prev, unitKerjaAuditi: data[0].namaFakultas }));
      }
    } catch (err) {
      console.error("Gagal memuat daftar fakultas:", err);
    }
  };

  // Fetch all berita acara reports
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/api/berita-acara");
      setReports(data);
    } catch (err) {
      showNotification(err.message || "Gagal memuat riwayat berita acara", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFaculties();
    loadReports();
  }, []);

  // Sync default unitKerja when faculties load
  useEffect(() => {
    if (faculties.length > 0 && !form.unitKerjaAuditi) {
      setForm((prev) => ({ ...prev, unitKerjaAuditi: faculties[0].namaFakultas }));
    }
  }, [faculties]);

  // Handle report creation submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const typeMap = {
        awal: "VISITASI_MONEV",
        akhir: "FINAL_MEETING",
      };

      const payload = {
        tipe: typeMap[activeTab],
        namaAuditor: form.namaAuditor,
        jabatanAuditor: form.jabatanAuditor,
        jenisAudit: form.jenisAudit,
        tanggal: new Date(form.tanggal).toISOString(),
        unitKerjaAuditi: form.unitKerjaAuditi,
        lokasiPenandatanganan: form.lokasiPenandatanganan,
        tanggalPenandatanganan: new Date(form.tanggalPenandatanganan).toISOString(),
        namaPenandatanganAuditi: form.namaPenandatanganAuditi,
        namaPenandatanganAuditor: form.namaPenandatanganAuditor,
      };

      if (isPbj) {
        payload.paketPaket = form.paketPaket;
      }

      if (activeTab === "akhir") {
        payload.sikap = form.sikap;
      }

      await apiFetch("/api/berita-acara", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showNotification(`Berita acara ${activeTab === "awal" ? "visitasi monev" : "final meeting"} berhasil dibuat`);
      
      // Reset form and switch tab to riwayat
      setForm({
        ...initialFormState,
        unitKerjaAuditi: faculties.length > 0 ? faculties[0].namaFakultas : "",
      });
      loadReports();
      setActiveTab("riwayat");
    } catch (err) {
      showNotification(err.message || "Gagal menyimpan berita acara", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Open detail modal
  const handleOpenDetail = (report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
    setIsEditing(false);
  };

  // Switch to edit mode in modal
  const handleStartEdit = () => {
    setEditForm({
      ...selectedReport,
      tanggal: selectedReport.tanggal ? selectedReport.tanggal.split("T")[0] : "",
      tanggalPenandatanganan: selectedReport.tanggalPenandatanganan ? selectedReport.tanggalPenandatanganan.split("T")[0] : "",
    });
    setIsEditing(true);
  };

  // Submit report update
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        tipe: selectedReport.tipe,
        namaAuditor: editForm.namaAuditor,
        jabatanAuditor: editForm.jabatanAuditor,
        jenisAudit: editForm.jenisAudit,
        tanggal: new Date(editForm.tanggal).toISOString(),
        unitKerjaAuditi: editForm.unitKerjaAuditi,
        lokasiPenandatanganan: editForm.lokasiPenandatanganan,
        tanggalPenandatanganan: new Date(editForm.tanggalPenandatanganan).toISOString(),
        namaPenandatanganAuditi: editForm.namaPenandatanganAuditi,
        namaPenandatanganAuditor: editForm.namaPenandatanganAuditor,
      };

      if (isPbj) {
        payload.paketPaket = editForm.paketPaket;
      }

      if (selectedReport.tipe === "FINAL_MEETING") {
        payload.sikap = editForm.sikap;
      }

      await apiFetch(`/api/berita-acara/${selectedReport.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      showNotification("Berita acara berhasil diperbarui");
      setIsEditing(false);
      
      // Reload updated details and list
      const updatedReport = await apiFetch(`/api/berita-acara/${selectedReport.id}`);
      setSelectedReport(updatedReport);
      loadReports();
    } catch (err) {
      showNotification("Gagal memperbarui berita acara: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle report deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus Berita Acara ini?")) {
      return;
    }
    
    setIsSaving(true);
    try {
      await apiFetch(`/api/berita-acara/${id}`, {
        method: "DELETE",
      });
      showNotification("Berita acara berhasil dihapus");
      setIsDetailModalOpen(false);
      setSelectedReport(null);
      loadReports();
    } catch (err) {
      showNotification("Gagal menghapus berita acara: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Export Word (DOCX)
  const handleExportDocx = async (report) => {
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob(`/api/berita-acara/${report.id}/export`, {
        method: "POST",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const typeLabel = report.tipe === "VISITASI_MONEV" ? "Visitasi" : "Final_Meeting";
      a.download = `Berita_Acara_${typeLabel}_${report.unitKerjaAuditi}_${report.divisi}.docx`;
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

  // Handle Preview Word (DOCX)
  const handlePreviewDocx = async (report) => {
    setIsSaving(true);
    try {
      const typeLabel = report.tipe === "VISITASI_MONEV" ? "Visitasi" : "Final Meeting";
      setPreviewTitle(`Pratinjau Berita Acara ${typeLabel} - ${report.unitKerjaAuditi}`);

      const blob = await apiFetchBlob(`/api/berita-acara/${report.id}/export`, {
        method: "POST",
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
            previewContainerRef.current.innerHTML = `<div class="p-4 text-xs text-red-500 font-semibold">Gagal merender pratinjau dokumen: ${err.message}</div>`;
          }
        });
    }
  }, [isPreviewOpen, previewBlob]);

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (_) {
      return dateStr;
    }
  };

  // Helper stance mapping
  const formatSikap = (sikap) => {
    const maps = {
      MENERIMA_SELURUH: "Menerima Seluruh",
      MENERIMA_SEBAGIAN: "Menerima Sebagian",
      MENOLAK: "Menolak",
    };
    return maps[sikap] || sikap || "-";
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
            <FileSignature className="w-6 h-6 text-gray-700" />
            Berita Acara {user ? `(${user.role})` : ""}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Buat, kelola, pratinjau, dan ekspor berita acara visitasi monev serta final meeting.
          </p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("awal")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === "awal"
              ? "border-gray-800 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Awal (Visitasi Monev)
        </button>
        <button
          onClick={() => setActiveTab("akhir")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === "akhir"
              ? "border-gray-800 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Akhir (Final Meeting)
        </button>
        <button
          onClick={() => setActiveTab("riwayat")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            activeTab === "riwayat"
              ? "border-gray-800 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Riwayat
        </button>
      </div>

      {/* TAB CONTENTS */}
      <div className="bg-white border border-gray-300 rounded p-6 shadow-sm">
        {(activeTab === "awal" || activeTab === "akhir") && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-bold text-gray-900 pb-2 border-b">
              {activeTab === "awal"
                ? "Form Pembuatan Berita Acara Visitasi Monev"
                : "Form Pembuatan Berita Acara Final Meeting"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Auditor
                  </label>
                  <input
                    type="text"
                    required
                    value={form.namaAuditor}
                    onChange={(e) => setForm({ ...form, namaAuditor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Nama lengkap auditor"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jabatan Auditor
                  </label>
                  <input
                    type="text"
                    required
                    value={form.jabatanAuditor}
                    onChange={(e) => setForm({ ...form, jabatanAuditor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Contoh: Ka. Divisi Audit PBJ"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jenis Audit
                  </label>
                  <input
                    type="text"
                    required
                    value={form.jenisAudit}
                    onChange={(e) => setForm({ ...form, jenisAudit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Contoh: Pengadaan Barang dan Jasa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Visitasi / Rapat
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unit Kerja Auditi
                  </label>
                  <select
                    value={form.unitKerjaAuditi}
                    onChange={(e) => setForm({ ...form, unitKerjaAuditi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    {faculties.map((f) => (
                      <option key={f.id} value={f.namaFakultas}>
                        {f.namaFakultas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Lokasi Penandatanganan
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lokasiPenandatanganan}
                    onChange={(e) => setForm({ ...form, lokasiPenandatanganan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Contoh: Jember"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Penandatanganan
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tanggalPenandatanganan}
                    onChange={(e) => setForm({ ...form, tanggalPenandatanganan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Penandatangan Auditi
                  </label>
                  <input
                    type="text"
                    required
                    value={form.namaPenandatanganAuditi}
                    onChange={(e) => setForm({ ...form, namaPenandatanganAuditi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Nama perwakilan auditi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Penandatangan Auditor
                  </label>
                  <input
                    type="text"
                    required
                    value={form.namaPenandatanganAuditor}
                    onChange={(e) => setForm({ ...form, namaPenandatanganAuditor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Nama perwakilan auditor"
                  />
                </div>

                {activeTab === "akhir" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sikap Auditi
                    </label>
                    <select
                      value={form.sikap}
                      onChange={(e) => setForm({ ...form, sikap: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="MENERIMA_SELURUH">Menerima Seluruh</option>
                      <option value="MENERIMA_SEBAGIAN">Menerima Sebagian</option>
                      <option value="MENOLAK">Menolak</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Special field for PBJ */}
            {(isPbj && activeTab === "awal") && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Daftar Paket Pengadaan (Khusus Divisi PBJ)
                </label>
                <BulletedTextArea
                  value={form.paketPaket}
                  onChange={(val) => setForm({ ...form, paketPaket: val })}
                  placeholder="Tulis baris baru untuk setiap nama paket pengadaan yang ditinjau..."
                />
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-250">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Menyimpan..." : "Simpan Berita Acara"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "riwayat" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="text-xs font-semibold">Memuat riwayat...</span>
              </div>
            ) : reports.length > 0 ? (
              <div className="divide-y divide-gray-200 border border-gray-300 rounded overflow-hidden">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => handleOpenDetail(report)}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors bg-white group"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-black transition-colors">
                        {report.tipe === "VISITASI_MONEV"
                          ? "Berita Acara Visitasi"
                          : "Berita Acara Final Meeting"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 font-medium">
                        <span>Divisi: {report.divisi}</span>
                        <span className="text-gray-300">•</span>
                        <span>Unit Kerja: {report.unitKerjaAuditi}</span>
                        <span className="text-gray-300">•</span>
                        <span>Tanggal: {formatDate(report.tanggal)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-gray-200 rounded p-12 text-center bg-gray-50/50">
                <span className="text-xs text-gray-400 font-semibold">
                  Belum ada berita acara yang pernah dibuat.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL AND EDIT MODAL */}
      {isDetailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-45 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                {isEditing ? "Edit Berita Acara" : "Detail Berita Acara"}
              </h3>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsEditing(false);
                  setEditForm(null);
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditing ? (
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Edit Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Nama Auditor
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.namaAuditor}
                          onChange={(e) => setEditForm({ ...editForm, namaAuditor: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Jabatan Auditor
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.jabatanAuditor}
                          onChange={(e) => setEditForm({ ...editForm, jabatanAuditor: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Jenis Audit
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.jenisAudit}
                          onChange={(e) => setEditForm({ ...editForm, jenisAudit: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Tanggal Visitasi / Rapat
                        </label>
                        <input
                          type="date"
                          required
                          value={editForm.tanggal}
                          onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Unit Kerja Auditi
                        </label>
                        <select
                          value={editForm.unitKerjaAuditi}
                          onChange={(e) => setEditForm({ ...editForm, unitKerjaAuditi: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs focus:outline-none"
                        >
                          {faculties.map((f) => (
                            <option key={f.id} value={f.namaFakultas}>
                              {f.namaFakultas}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Edit Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Lokasi Penandatanganan
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.lokasiPenandatanganan}
                          onChange={(e) => setEditForm({ ...editForm, lokasiPenandatanganan: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Tanggal Penandatanganan
                        </label>
                        <input
                          type="date"
                          required
                          value={editForm.tanggalPenandatanganan}
                          onChange={(e) => setEditForm({ ...editForm, tanggalPenandatanganan: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Nama Penandatangan Auditi
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.namaPenandatanganAuditi}
                          onChange={(e) => setEditForm({ ...editForm, namaPenandatanganAuditi: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Nama Penandatangan Auditor
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.namaPenandatanganAuditor}
                          onChange={(e) => setEditForm({ ...editForm, namaPenandatanganAuditor: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none"
                        />
                      </div>

                      {selectedReport.tipe === "FINAL_MEETING" && (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Sikap Auditi
                          </label>
                          <select
                            value={editForm.sikap}
                            onChange={(e) => setEditForm({ ...editForm, sikap: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-xs focus:outline-none"
                          >
                            <option value="MENERIMA_SELURUH">Menerima Seluruh</option>
                            <option value="MENERIMA_SEBAGIAN">Menerima Sebagian</option>
                            <option value="MENOLAK">Menolak</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {isPbj && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Daftar Paket Pengadaan (Khusus Divisi PBJ)
                      </label>
                      <BulletedTextArea
                        value={editForm.paketPaket || ""}
                        onChange={(val) => setEditForm({ ...editForm, paketPaket: val })}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Summary header */}
                  <div className="bg-gray-50 border p-4 rounded text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block">Tipe Berita Acara</span>
                        <span className="font-bold text-gray-900">
                          {selectedReport.tipe === "VISITASI_MONEV"
                            ? "Visitasi Monev (Awal)"
                            : "Final Meeting (Akhir)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Divisi Pembuat</span>
                        <span className="font-bold text-gray-900">{selectedReport.divisi}</span>
                      </div>
                    </div>
                  </div>

                  {/* Two column layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 uppercase border-b pb-1 text-[11px]">
                        Informasi Audit
                      </h4>
                      <div>
                        <span className="text-gray-500 block">Nama Auditor</span>
                        <span className="font-semibold text-gray-900">{selectedReport.namaAuditor}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Jabatan Auditor</span>
                        <span className="font-semibold text-gray-900">{selectedReport.jabatanAuditor}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Jenis Audit</span>
                        <span className="font-semibold text-gray-900">{selectedReport.jenisAudit}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Tanggal Visitasi/Rapat</span>
                        <span className="font-semibold text-gray-900">{formatDate(selectedReport.tanggal)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Unit Kerja Auditi</span>
                        <span className="font-semibold text-gray-900">{selectedReport.unitKerjaAuditi}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 uppercase border-b pb-1 text-[11px]">
                        Tanda Tangan & Lokasi
                      </h4>
                      <div>
                        <span className="text-gray-500 block">Lokasi Penandatanganan</span>
                        <span className="font-semibold text-gray-900">{selectedReport.lokasiPenandatanganan}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Tanggal Penandatanganan</span>
                        <span className="font-semibold text-gray-900">
                          {formatDate(selectedReport.tanggalPenandatanganan)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Nama Penandatangan Auditi</span>
                        <span className="font-semibold text-gray-900">
                          {selectedReport.namaPenandatanganAuditi}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Nama Penandatangan Auditor</span>
                        <span className="font-semibold text-gray-900">
                          {selectedReport.namaPenandatanganAuditor}
                        </span>
                      </div>
                      {selectedReport.tipe === "FINAL_MEETING" && (
                        <div>
                          <span className="text-gray-500 block">Sikap Auditi</span>
                          <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block mt-0.5">
                            {formatSikap(selectedReport.sikap)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multiline/Bulleted package list for PBJ */}
                  {selectedReport.paketPaket && (
                    <div className="text-xs space-y-2 border-t pt-4">
                      <h4 className="font-bold text-gray-900 uppercase text-[11px]">
                        Daftar Paket Pengadaan
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-800 bg-gray-50 border rounded p-4 font-medium">
                        {selectedReport.paketPaket.split("\n").map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center justify-between pt-6 border-t gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreviewDocx(selectedReport)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Pratinjau Word
                      </button>
                      <button
                        onClick={() => handleExportDocx(selectedReport)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Ekspor Word
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStartEdit}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedReport.id)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCX PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">{previewTitle}</h3>
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
