import { useState, useEffect } from "react";
import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import { apiFetch } from "../../lib/api";

export default function LembarKerjaBmn() {
  // Main states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail"

  // Selected DTM & Samplings
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [selectedTipeBmn, setSelectedTipeBmn] = useState("");
  const [samplings, setSamplings] = useState([]);
  const [selectedSampling, setSelectedSampling] = useState(null);

  // Form state
  const [formState, setFormState] = useState({
    kondisiBarang: "",
    lokasiPenempatan: "",
    penggunaan: "",
    pengguna: "",
    labelBarang: "",
    keteranganTambahan: ""
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Load Fakultat & DTM List
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

  // Handle Form state population on selected item change
  useEffect(() => {
    if (selectedSampling) {
      setFormState({
        kondisiBarang: selectedSampling.kondisiBarang || "",
        lokasiPenempatan: selectedSampling.lokasiPenempatan || "",
        penggunaan: selectedSampling.penggunaan || "",
        pengguna: selectedSampling.pengguna || "",
        labelBarang: selectedSampling.labelBarang || "",
        keteranganTambahan: selectedSampling.keteranganTambahan || ""
      });
    } else {
      setFormState({
        kondisiBarang: "",
        lokasiPenempatan: "",
        penggunaan: "",
        pengguna: "",
        labelBarang: "",
        keteranganTambahan: ""
      });
    }
  }, [selectedSampling]);

  // Helper to find existing DTM
  const findDtm = (fakultasId, tipeBmn) => {
    return dtmList.find(
      (d) => d.fakultasId === fakultasId && d.tipeBmn === tipeBmn
    );
  };

  // Open DTM
  const handleBukaDtm = async (fakultas, tipeBmn) => {
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
      await fetchSamplings(dtm.id);
      setViewMode("detail");
    } catch (err) {
      showNotification(err.message || "Gagal memproses DTM BMN", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch all samplings
  const fetchSamplings = async (dtmId) => {
    try {
      const data = await apiFetch(`/api/bmn/sampling/dtm/${dtmId}`);
      const list = Array.isArray(data) ? data : [];
      setSamplings(list);
      setSelectedSampling(null);
    } catch (err) {
      showNotification("Gagal memuat barang sampling: " + err.message, "error");
    }
  };

  // Submit Status patch
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedSampling) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/bmn/sampling/${selectedSampling.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          kondisiBarang: formState.kondisiBarang || null,
          lokasiPenempatan: formState.lokasiPenempatan || "",
          penggunaan: formState.penggunaan || null,
          pengguna: formState.pengguna || null,
          labelBarang: formState.labelBarang || null,
          keteranganTambahan: formState.keteranganTambahan || ""
        })
      });

      showNotification("Status barang sampling berhasil disimpan", "success");

      // Update local state
      setSamplings((prev) =>
        prev.map((item) => (item.id === selectedSampling.id ? updated : item))
      );
      setSelectedSampling(updated);
    } catch (err) {
      showNotification("Gagal memperbarui status: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDtm(null);
    setSelectedFakultas(null);
    setSelectedTipeBmn("");
    setSamplings([]);
    setSelectedSampling(null);
    loadInitialData(); // Refresh main lists
  };

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

  // Helper to check if a sampling item is fully audited
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

      {/* HEADER ROW */}
      <div className="flex items-center justify-between border-b border-gray-300 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lembar Kerja DTM</h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Daftar unit kerja dan data audit BMN."
              : `Audit Status Sampling: ${selectedFakultas?.namaFakultas} (${getTipeBmnLabel(selectedTipeBmn)})`}
          </p>
        </div>

        {viewMode === "list" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Tahun Anggaran:</span>
            <YearDropdown value={selectedYear} onChange={setSelectedYear} />
          </div>
        ) : (
          <button
            onClick={handleBackToList}
            className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
          >
            Kembali ke Daftar
          </button>
        )}
      </div>

      {/* VIEW MODE: LIST TABLE */}
      {viewMode === "list" ? (
        <div className="border border-gray-300 rounded overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-500">
              Memuat data...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-xs font-semibold text-gray-700">
                  <th className="px-4 py-2 border-r border-gray-300">Nama Unit Kerja</th>
                  <th className="px-4 py-2 text-center border-r border-gray-300">Barang Persediaan</th>
                  <th className="px-4 py-2 text-center border-r border-gray-300">Pembelian Aset</th>
                  <th className="px-4 py-2 text-center">Gabungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
                {fakultasList.map((fak) => {
                  const dtmPersediaan = findDtm(fak.id, "BARANG_PERSEDIAAN");
                  const dtmPembelian = findDtm(fak.id, "PEMBELIAN_ASET");
                  const dtmGabungan = findDtm(fak.id, "GABUNGAN");

                  return (
                    <tr key={fak.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold border-r border-gray-300">
                        {fak.namaFakultas}
                      </td>

                      {/* TIPE 1: BARANG PERSEDIAAN */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        <div className="flex flex-col items-center gap-1.5">
                          <div>
                            {dtmPersediaan ? (
                              <span className="inline-block border border-gray-400 bg-gray-50 text-gray-800 px-2 py-0.5 rounded text-[10px]">
                                Sudah Dibuat
                              </span>
                            ) : (
                              <span className="inline-block border border-gray-200 bg-white text-gray-400 px-2 py-0.5 rounded text-[10px]">
                                Belum Dibuat
                              </span>
                            )}
                          </div>
                          <button
                            disabled={isSaving}
                            onClick={() => handleBukaDtm(fak, "BARANG_PERSEDIAAN")}
                            className="px-2.5 py-1 text-[10px] font-medium border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            {dtmPersediaan ? 'Buka' : 'Buat'}
                          </button>
                        </div>
                      </td>

                      {/* TIPE 2: PEMBELIAN ASET */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        <div className="flex flex-col items-center gap-1.5">
                          <div>
                            {dtmPembelian ? (
                              <span className="inline-block border border-gray-400 bg-gray-50 text-gray-800 px-2 py-0.5 rounded text-[10px]">
                                Sudah Dibuat
                              </span>
                            ) : (
                              <span className="inline-block border border-gray-200 bg-white text-gray-400 px-2 py-0.5 rounded text-[10px]">
                                Belum Dibuat
                              </span>
                            )}
                          </div>
                          <button
                            disabled={isSaving}
                            onClick={() => handleBukaDtm(fak, "PEMBELIAN_ASET")}
                            className="px-2.5 py-1 text-[10px] font-medium border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            {dtmPembelian ? 'Buka' : 'Buat'}
                          </button>
                        </div>
                      </td>

                      {/* TIPE 3: GABUNGAN */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1.5">
                          <div>
                            {dtmGabungan ? (
                              <span className="inline-block border border-gray-400 bg-gray-50 text-gray-800 px-2 py-0.5 rounded text-[10px]">
                                Sudah Dibuat
                              </span>
                            ) : (
                              <span className="inline-block border border-gray-200 bg-white text-gray-400 px-2 py-0.5 rounded text-[10px]">
                                Belum Dibuat
                              </span>
                            )}
                          </div>
                          <button
                            disabled={isSaving}
                            onClick={() => handleBukaDtm(fak, "GABUNGAN")}
                            className="px-2.5 py-1 text-[10px] font-medium border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            {dtmGabungan ? 'Buka' : 'Buat'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* VIEW MODE: DETAIL WORKSPACE (SPLIT-SCREEN GRID) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: SAMPLINGS LIST (5 Columns) */}
          <div className="md:col-span-5 border border-gray-300 rounded p-4 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Daftar Barang Sampling</h2>
              <p className="text-[10px] text-gray-500">Pilih salah satu barang untuk memperbarui status audit.</p>
            </div>

            {samplings.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {samplings.map((item) => {
                  const isSelected = selectedSampling?.id === item.id;
                  const isComplete = isSamplingComplete(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedSampling(item)}
                      className={`p-3 border rounded cursor-pointer transition-colors ${isSelected
                        ? "bg-gray-100 border-gray-900"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-semibold text-xs text-gray-900">{item.namaBarang}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{item.merkAtauType}</div>
                          <div className="text-[10px] text-gray-500">
                            Thn: {item.tahunPerolehan} | Jml: {item.jumlahBarang}
                          </div>
                        </div>

                        <div>
                          {isComplete ? (
                            <span className="text-[9px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded">
                              Lengkap
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                              Belum Lengkap
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-gray-300 rounded text-xs text-gray-400">
                Belum ada barang sampling yang ditambahkan untuk DTM ini.
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: STATUS FORM (7 Columns) */}
          {selectedSampling ? (
            <div className="md:col-span-7 border border-gray-300 rounded p-4">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
                Formulir Audit Status: {selectedSampling.namaBarang}
              </h2>

              <form onSubmit={handleSaveStatus} className="space-y-4">
                {/* KONDISI BARANG */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kondisi Barang
                  </label>
                  <select
                    value={formState.kondisiBarang}
                    onChange={(e) =>
                      setFormState({ ...formState, kondisiBarang: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-gray-500 bg-white"
                  >
                    <option value="">-- Pilih Kondisi --</option>
                    <option value="BAIK">Baik</option>
                    <option value="RUSAK_RINGAN">Rusak Ringan</option>
                    <option value="RUSAK_BERAT">Rusak Berat</option>
                    <option value="HILANG">Hilang</option>
                  </select>
                </div>

                {/* LOKASI PENEMPATAN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Lokasi Penempatan
                  </label>
                  <input
                    type="text"
                    value={formState.lokasiPenempatan}
                    onChange={(e) =>
                      setFormState({ ...formState, lokasiPenempatan: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-gray-500"
                    placeholder="Masukkan lokasi penempatan barang"
                  />
                </div>

                {/* STATUS PENGGUNAAN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status Penggunaan
                  </label>
                  <select
                    value={formState.penggunaan}
                    onChange={(e) =>
                      setFormState({ ...formState, penggunaan: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-gray-500 bg-white"
                  >
                    <option value="">-- Pilih Status Penggunaan --</option>
                    <option value="SUDAH_DIMANFAATKAN">Sudah Dimanfaatkan</option>
                    <option value="BELUM_DIMANFAATKAN">Belum Dimanfaatkan</option>
                  </select>
                </div>

                {/* PENGGUNA */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pengguna Barang
                  </label>
                  <select
                    value={formState.pengguna}
                    onChange={(e) =>
                      setFormState({ ...formState, pengguna: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-gray-500 bg-white"
                  >
                    <option value="">-- Pilih Jenis Pengguna --</option>
                    <option value="INTERNAL">Internal</option>
                    <option value="EKSTERNAL">Eksternal</option>
                  </select>
                </div>

                {/* LABEL BARANG */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status Pelabelan
                  </label>
                  <select
                    value={formState.labelBarang}
                    onChange={(e) =>
                      setFormState({ ...formState, labelBarang: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-gray-500 bg-white"
                  >
                    <option value="">-- Pilih Status Label --</option>
                    <option value="SUDAH_DILABEL">Sudah Dilabel</option>
                    <option value="BELUM_DILABEL">Belum Dilabel</option>
                  </select>
                </div>

                {/* KETERANGAN TAMBAHAN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Keterangan Tambahan
                  </label>
                  <textarea
                    rows="3"
                    value={formState.keteranganTambahan}
                    onChange={(e) =>
                      setFormState({ ...formState, keteranganTambahan: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-gray-500"
                    placeholder="Keterangan atau temuan tambahan lainnya..."
                  />
                </div>

                {/* FORM ACTIONS */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Status"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="md:col-span-7 border border-gray-300 border-dashed rounded p-12 text-center text-xs text-gray-500">
              Pilih salah satu barang sampling di panel kiri untuk mengisi status audit.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
