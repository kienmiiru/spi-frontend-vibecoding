import { useState, useEffect } from "react";
import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import { apiFetch } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";
import {
  ArrowLeft,
  UploadCloud,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  PlusCircle
} from "lucide-react";

export default function BerandaBmn() {
  const confirm = useConfirm();
  // Main states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected DTM & Samplings states
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [selectedTipeBmn, setSelectedTipeBmn] = useState("");
  const [samplings, setSamplings] = useState([]);

  // Loading & notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sampling modal & form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSampling, setEditingSampling] = useState(null);
  const [samplingForm, setSamplingForm] = useState({
    namaBarang: "",
    tahunPerolehan: "",
    merkAtauType: "",
    jumlahBarang: 1
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // 1. Initial Data Fetching
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/bmn/dtm?tahunAnggaran=${selectedYear}`)
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
  const findDtm = (fakultasId, tipeBmn) => {
    return dtmList.find(
      (d) => d.fakultasId === fakultasId && d.tipeBmn === tipeBmn
    );
  };

  // 2. Select or Create DTM on Action Button Click
  const handleDtmAction = async (fakultas, tipeBmn) => {
    setIsSaving(true);
    setSelectedFakultas(fakultas);
    setSelectedTipeBmn(tipeBmn);
    try {
      const dtm = await apiFetch("/api/bmn/dtm/select-or-create", {
        method: "POST",
        body: JSON.stringify({
          namaFakultas: fakultas.namaFakultas,
          tahunAnggaran: selectedYear,
          tipeBmn: tipeBmn
        })
      });
      setSelectedDtm(dtm);

      // Fetch samplings for this DTM
      await fetchSamplings(dtm.id);

      setViewMode("detail");
    } catch (err) {
      showNotification(err.message || "Gagal memproses DTM BMN", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch Samplings helper
  const fetchSamplings = async (dtmId) => {
    try {
      const data = await apiFetch(`/api/bmn/sampling/dtm/${dtmId}`);
      setSamplings(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotification("Gagal memuat barang sampling: " + err.message, "error");
    }
  };

  // 3. Upload/Replace PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showNotification("Berkas harus berupa format PDF", "error");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    setIsSaving(true);
    try {
      const updatedDtm = await apiFetch(`/api/bmn/populasi/dtm/${selectedDtm.id}`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData
      });

      setSelectedDtm(updatedDtm);
      showNotification("PDF Populasi berhasil diunggah", "success");

      // Refresh list to update status column in table
      const dtmData = await apiFetch(`/api/bmn/dtm?tahunAnggaran=${selectedYear}`);
      setDtmList(dtmData);
    } catch (err) {
      showNotification("Gagal mengunggah PDF: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Open Add/Edit Modal
  const openSamplingModal = (sampling = null) => {
    if (sampling) {
      setEditingSampling(sampling);
      setSamplingForm({
        namaBarang: sampling.namaBarang || "",
        tahunPerolehan: sampling.tahunPerolehan || "",
        merkAtauType: sampling.merkAtauType || "",
        jumlahBarang: sampling.jumlahBarang ?? 1
      });
    } else {
      setEditingSampling(null);
      setSamplingForm({
        namaBarang: "",
        tahunPerolehan: "",
        merkAtauType: "",
        jumlahBarang: 1
      });
    }
    setModalOpen(true);
  };

  // 5. Submit Sampling Add/Edit
  const handleSaveSampling = async (e) => {
    e.preventDefault();
    if (!samplingForm.namaBarang || !samplingForm.tahunPerolehan || !samplingForm.merkAtauType) {
      showNotification("Harap lengkapi semua kolom wajib!", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingSampling) {
        // Edit Existing
        await apiFetch(`/api/bmn/sampling/${editingSampling.id}`, {
          method: "PUT",
          body: JSON.stringify({
            namaBarang: samplingForm.namaBarang,
            tahunPerolehan: samplingForm.tahunPerolehan,
            merkAtauType: samplingForm.merkAtauType,
            jumlahBarang: parseInt(samplingForm.jumlahBarang)
          })
        });
        showNotification("Barang sampling berhasil diperbarui", "success");
      } else {
        // Create New
        await apiFetch("/api/bmn/sampling", {
          method: "POST",
          body: JSON.stringify({
            namaBarang: samplingForm.namaBarang,
            tahunPerolehan: samplingForm.tahunPerolehan,
            merkAtauType: samplingForm.merkAtauType,
            jumlahBarang: parseInt(samplingForm.jumlahBarang),
            dtmBmnId: selectedDtm.id
          })
        });
        showNotification("Barang sampling berhasil ditambahkan", "success");
      }
      setModalOpen(false);
      await fetchSamplings(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal menyimpan barang sampling: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Delete Sampling
  const handleDeleteSampling = async (id) => {
    const confirmed = await confirm({
      title: "Hapus Barang Sampling",
      message: "Apakah Anda yakin ingin menghapus barang sampling ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;
    setIsSaving(true);
    try {
      await apiFetch(`/api/bmn/sampling/${id}`, {
        method: "DELETE"
      });
      showNotification("Barang sampling berhasil dihapus", "success");
      await fetchSamplings(selectedDtm.id);
    } catch (err) {
      showNotification("Gagal menghapus barang sampling: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getFriendlyTypeName = (type) => {
    switch (type) {
      case "BARANG_PERSEDIAAN":
        return "Barang Persediaan";
      case "PEMBELIAN_ASET":
        return "Pembelian Aset";
      case "GABUNGAN":
        return "Gabungan";
      default:
        return type;
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
          <h1 className="text-xl font-bold text-gray-900">Data Aset</h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Ringkasan dan detail status data aset di seluruh fakultas."
              : `Lembar Kerja: ${selectedFakultas?.namaFakultas} - DTM ${getFriendlyTypeName(selectedTipeBmn)}`}
          </p>
        </div>

        {viewMode === "list" ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Tahun Anggaran:</span>
            <YearDropdown value={selectedYear} onChange={setSelectedYear} />
          </div>
        ) : (
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar
          </button>
        )}
      </div>

      {/* MAIN VIEW: LIST MODE */}
      {viewMode === "list" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="text-sm font-medium">Memuat data unit kerja...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                    <th className="px-6 py-4">Unit Kerja</th>
                    <th className="px-6 py-4 text-center">Barang Persediaan</th>
                    <th className="px-6 py-4 text-center">Pembelian Aset</th>
                    <th className="px-6 py-4 text-center">Gabungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {fakultasList.map((fak) => {
                    const dtmPersediaan = findDtm(fak.id, "BARANG_PERSEDIAAN");
                    const dtmPembelian = findDtm(fak.id, "PEMBELIAN_ASET");
                    const dtmGabungan = findDtm(fak.id, "GABUNGAN");

                    return (
                      <tr key={fak.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {fak.namaFakultas}
                        </td>

                        {/* 1. BARANG PERSEDIAAN */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-2">
                            {dtmPersediaan?.linkPdf ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Ada PDF
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Belum Upload
                              </span>
                            )}
                            <button
                              disabled={isSaving}
                              onClick={() => handleDtmAction(fak, "BARANG_PERSEDIAAN")}
                              className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              Buka
                            </button>
                          </div>
                        </td>

                        {/* 2. PEMBELIAN ASET */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-2">
                            {dtmPembelian?.linkPdf ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Ada PDF
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Belum Upload
                              </span>
                            )}
                            <button
                              disabled={isSaving}
                              onClick={() => handleDtmAction(fak, "PEMBELIAN_ASET")}
                              className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              Buka
                            </button>
                          </div>
                        </td>

                        {/* 3. GABUNGAN */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-2">
                            {dtmGabungan?.linkPdf ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Ada PDF
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Belum Upload
                              </span>
                            )}
                            <button
                              disabled={isSaving}
                              onClick={() => handleDtmAction(fak, "GABUNGAN")}
                              className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              Buka
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL WORKSPACE: SIDE-BY-SIDE MODE */}
      {viewMode === "detail" && selectedDtm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT SIDE: PDF POPULASI (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                PDF Populasi BMN
              </h2>
              {selectedDtm.linkPdf && (
                <a
                  href={selectedDtm.linkPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  Buka Tab Baru
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {selectedDtm.linkPdf ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-gray-50 relative group">
                  <iframe
                    src={selectedDtm.linkPdf}
                    title="PDF Populasi Viewer"
                    className="w-full h-[450px]"
                  />
                </div>

                {/* Change PDF control */}
                <div className="bg-gray-50 border rounded-lg p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-500 font-medium mb-2">
                    Ingin memperbarui berkas PDF Populasi?
                  </span>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                    <UploadCloud className="w-4 h-4" />
                    Ganti Berkas PDF
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  Belum Ada PDF Populasi
                </h3>
                <p className="text-xs text-gray-400 mb-4 max-w-xs">
                  Unggah berkas populasi awal untuk melakukan sampling.
                </p>
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2">
                  Pilih & Unggah PDF
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: SAMPLING BARANG LIST (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Barang Sampling BMN
              </h2>
              <button
                onClick={() => openSamplingModal(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Sampling
              </button>
            </div>

            {samplings.length > 0 ? (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <th className="px-4 py-3">Nama & Merk</th>
                      <th className="px-2 py-3 text-center">Tahun</th>
                      <th className="px-2 py-3 text-center">Jumlah</th>
                      <th className="px-4 py-3 text-center">Buka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {samplings.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{item.namaBarang}</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">{item.merkAtauType}</div>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">{item.tahunPerolehan}</td>
                        <td className="px-2 py-3 text-center font-medium text-gray-800">{item.jumlahBarang}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openSamplingModal(item)}
                              className="p-1 border border-gray-200 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit data"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSampling(item.id)}
                              className="p-1 border border-gray-200 rounded text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-lg p-10 flex flex-col items-center justify-center text-center bg-gray-50/50">
                <span className="text-xs text-gray-400">
                  Belum ada barang sampling yang ditambahkan.
                </span>
                <button
                  onClick={() => openSamplingModal(null)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <PlusCircle className="w-4 h-4" />
                  Tambah Barang Pertama
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DIALOG: ADD/EDIT SAMPLING */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border">

            {/* Modal Header */}
            <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                {editingSampling ? "Edit Barang Sampling" : "Tambah Barang Sampling BMN"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSampling} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Row 1: Nama Barang & Merk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Nama Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={samplingForm.namaBarang}
                    onChange={(e) => setSamplingForm({ ...samplingForm, namaBarang: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: Laptop"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Merk / Tipe <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={samplingForm.merkAtauType}
                    onChange={(e) => setSamplingForm({ ...samplingForm, merkAtauType: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: Asus Zenbook"
                  />
                </div>
              </div>

              {/* Row 2: Tahun Perolehan & Jumlah */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tahun Perolehan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={samplingForm.tahunPerolehan}
                    onChange={(e) => setSamplingForm({ ...samplingForm, tahunPerolehan: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: 2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Jumlah Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={samplingForm.jumlahBarang}
                    onChange={(e) => setSamplingForm({ ...samplingForm, jumlahBarang: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}