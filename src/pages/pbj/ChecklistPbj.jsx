import { useState, useEffect } from "react";
import {
  Loader2,
  Plus,
  Edit2,
  X,
  Search,
  Filter,
  Check,
  CheckSquare,
  AlertCircle
} from "lucide-react";

import Table from "../../components/Table";
import Notification from "../../components/Notification";
import { apiFetch } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";

export default function ChecklistPbj() {
  const confirm = useConfirm();

  // State data
  const [checklistItems, setChecklistItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("SEMUA"); // "SEMUA" | "BARANG" | "JASA" | "KONSTRUKSI"

  // Loading & Notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Forms state
  const [addForm, setAddForm] = useState({
    tipeDokumen: "BARANG",
    kategori: "",
    uraian: "",
    namaSingkat: "",
    formatDokumen: ""
  });

  const [editForm, setEditForm] = useState({
    id: null,
    kategori: "",
    uraian: "",
    namaSingkat: "",
    formatDokumen: "",
    enabled: true
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Fetch all checklist items
  const loadChecklistItems = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/api/pbj/checklist/");
      setChecklistItems(data || []);
    } catch (err) {
      showNotification(
        err.message || "Gagal memuat daftar checklist",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChecklistItems();
  }, []);

  // Handle Add Item
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.kategori.trim() || !addForm.uraian.trim() || !addForm.namaSingkat.trim()) {
      showNotification("Mohon lengkapi semua kolom wajib", "error");
      return;
    }

    setIsSaving(true);
    try {
      const newItem = await apiFetch("/api/pbj/checklist/", {
        method: "POST",
        body: JSON.stringify(addForm)
      });

      setChecklistItems((prev) => [newItem, ...prev]);
      setIsAddOpen(false);
      // Reset form
      setAddForm({
        tipeDokumen: "BARANG",
        kategori: "",
        uraian: "",
        namaSingkat: "",
        formatDokumen: ""
      });

      confirm({
        title: "",
        message: "Item checklist baru berhasil ditambahkan",
        type: "info"
      });
    } catch (err) {
      showNotification("Gagal menambahkan item: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditForm({
      id: item.id,
      kategori: item.kategori || "",
      uraian: item.uraian || "",
      namaSingkat: item.namaSingkat || "",
      formatDokumen: item.formatDokumen || "",
      enabled: item.enabled ?? true
    });
    setIsEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.kategori.trim() || !editForm.uraian.trim() || !editForm.namaSingkat.trim()) {
      showNotification("Mohon lengkapi semua kolom wajib", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updatedItem = await apiFetch(`/api/pbj/checklist/${editForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          kategori: editForm.kategori,
          uraian: editForm.uraian,
          namaSingkat: editForm.namaSingkat,
          formatDokumen: editForm.formatDokumen,
          enabled: editForm.enabled
        })
      });

      setChecklistItems((prev) =>
        prev.map((item) => (item.id === editForm.id ? updatedItem : item))
      );
      setIsEditOpen(false);

      confirm({
        title: "",
        message: "Item checklist berhasil diperbarui",
        type: "info"
      });
    } catch (err) {
      showNotification("Gagal memperbarui item: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (item) => {
    const newStatus = !item.enabled;
    const actionText = newStatus ? "mengaktifkan" : "menonaktifkan";

    const confirmed = await confirm({
      title: "Ubah Status Checklist",
      message: `Apakah Anda yakin ingin ${actionText} item checklist "${item.namaSingkat || item.id}"?`,
      type: "warning",
      confirmText: newStatus ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      cancelText: "Batal"
    });

    if (!confirmed) return;

    try {
      const updatedItem = await apiFetch(`/api/pbj/checklist/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          enabled: newStatus
        })
      });

      setChecklistItems((prev) =>
        prev.map((prevItem) => (prevItem.id === item.id ? updatedItem : prevItem))
      );
      showNotification(`Item checklist berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`, "success");
    } catch (err) {
      showNotification("Gagal mengubah status item: " + err.message, "error");
    }
  };

  // Filters logic
  const filteredItems = checklistItems.filter((item) => {
    // 1. Tab filter (tipeDokumen)
    if (activeTab !== "SEMUA" && item.tipeDokumen !== activeTab) {
      return false;
    }
    // 2. Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchKategori = item.kategori?.toLowerCase().includes(query);
      const matchUraian = item.uraian?.toLowerCase().includes(query);
      const matchNamaSingkat = item.namaSingkat?.toLowerCase().includes(query);
      const matchTipe = item.tipeDokumen?.toLowerCase().includes(query);
      return matchKategori || matchUraian || matchNamaSingkat || matchTipe;
    }
    return true;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-300 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-gray-800" />
            Checklist PBJ
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Konfigurasi dan kelola daftar checklist kelengkapan dokumen pengadaan (Barang, Jasa, Konstruksi).
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Checklist
          </button>
        </div>
      </div>

      {/* TABS & SEARCH SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-300">
          {["SEMUA", "BARANG", "JASA", "KONSTRUKSI"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-[2px] transition-colors cursor-pointer ${
                activeTab === tab
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari kategori, singkatan, uraian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-gray-500 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT TABLE */}
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white border border-gray-300">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-sm font-medium">Memuat data checklist...</span>
          </div>
        ) : filteredItems.length > 0 ? (
          <Table className="max-h-screen">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-16 text-center">No</Table.HeaderCell>
                <Table.HeaderCell className="w-36">Tipe Dokumen</Table.HeaderCell>
                <Table.HeaderCell className="w-48">Kategori</Table.HeaderCell>
                <Table.HeaderCell className="w-36">Singkatan</Table.HeaderCell>
                <Table.HeaderCell>Uraian Dokumen</Table.HeaderCell>
                <Table.HeaderCell className="w-28 text-center">Format</Table.HeaderCell>
                <Table.HeaderCell className="w-28 text-center">Status</Table.HeaderCell>
                <Table.HeaderCell className="w-24 text-center">Aksi</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredItems.map((item, index) => (
                <Table.Row key={item.id}>
                  <Table.Cell className="text-center font-medium text-gray-500">
                    {index + 1}
                  </Table.Cell>
                  <Table.Cell>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        item.tipeDokumen === "BARANG"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : item.tipeDokumen === "JASA"
                          ? "bg-teal-50 border-teal-200 text-teal-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}
                    >
                      {item.tipeDokumen}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="font-medium text-gray-800">
                    {item.kategori || "-"}
                  </Table.Cell>
                  <Table.Cell className="font-semibold text-gray-900">
                    {item.namaSingkat || "-"}
                  </Table.Cell>
                  <Table.Cell className="whitespace-normal leading-relaxed text-gray-700 pr-4">
                    {item.uraian}
                  </Table.Cell>
                  <Table.Cell className="text-center font-medium text-gray-500">
                    {item.formatDokumen || "-"}
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        item.enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                      }`}
                      title="Klik untuk mengubah status"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.enabled ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {item.enabled ? "Aktif" : "Nonaktif"}
                    </button>
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 bg-white text-gray-750 hover:bg-gray-55 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Ubah
                    </button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <div className="border border-gray-300 p-16 flex flex-col items-center justify-center text-center bg-gray-55/50 rounded">
            <AlertCircle className="w-12 h-12 text-gray-300 stroke-1 mb-2" />
            <span className="text-xs text-gray-400 font-semibold">
              Tidak ada item checklist yang ditemukan.
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs font-semibold text-gray-800 hover:underline cursor-pointer"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD NEW CHECKLIST */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-250 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Tambah Item Checklist Baru</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tipe Dokumen <span className="text-red-500">*</span>
                </label>
                <select
                  value={addForm.tipeDokumen}
                  onChange={(e) => setAddForm({ ...addForm, tipeDokumen: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                >
                  <option value="BARANG">BARANG</option>
                  <option value="JASA">JASA</option>
                  <option value="KONSTRUKSI">KONSTRUKSI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Kategori Kelompok <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.kategori}
                  onChange={(e) => setAddForm({ ...addForm, kategori: e.target.value })}
                  placeholder="Contoh: Dokumen Pemilihan, Jaminan, Dokumen Kontrak"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Singkatan / Nama Singkat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.namaSingkat}
                  onChange={(e) => setAddForm({ ...addForm, namaSingkat: e.target.value })}
                  placeholder="Contoh: HPS, SSKK, BA-HP"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Uraian Dokumen <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={addForm.uraian}
                  onChange={(e) => setAddForm({ ...addForm, uraian: e.target.value })}
                  placeholder="Tulis uraian lengkap dokumen persyaratan..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Format Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={addForm.formatDokumen}
                  onChange={(e) => setAddForm({ ...addForm, formatDokumen: e.target.value })}
                  placeholder="Contoh: PDF, Excel, Word"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CHECKLIST */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-250 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Ubah Item Checklist</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Kategori Kelompok <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.kategori}
                  onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                  placeholder="Contoh: Dokumen Pemilihan, Jaminan, Dokumen Kontrak"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Singkatan / Nama Singkat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.namaSingkat}
                  onChange={(e) => setEditForm({ ...editForm, namaSingkat: e.target.value })}
                  placeholder="Contoh: HPS, SSKK, BA-HP"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Uraian Dokumen <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={editForm.uraian}
                  onChange={(e) => setEditForm({ ...editForm, uraian: e.target.value })}
                  placeholder="Tulis uraian lengkap dokumen persyaratan..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Format Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editForm.formatDokumen}
                  onChange={(e) => setEditForm({ ...editForm, formatDokumen: e.target.value })}
                  placeholder="Contoh: PDF, Excel, Word"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="edit-enabled"
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                  className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500 cursor-pointer"
                />
                <label htmlFor="edit-enabled" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                  Item Checklist Aktif
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
