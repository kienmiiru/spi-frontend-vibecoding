import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, FileEdit, CheckCircle, HelpCircle } from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import QuillEditor from "../../components/QuillEditor";
import { apiFetch } from "../../lib/api";

export default function BerandaSmmSmap() {
  // Main states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "edit"

  // Selected DTM states
  const [selectedDtm, setSelectedDtm] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState(null);

  // Form states for temuan
  const [temuanFormState, setTemuanFormState] = useState({
    detailTemuan1: "",
    detailTemuan2: "",
    detailTemuan3: "",
    detailTemuan4: "",
    detailTemuan5: "",
    detailTemuan6: "",
    detailTemuan7: "",
    kodeTemuan: "",
  });

  // Loading & notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const quillRef = useRef(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // 1. Initial Data Fetching
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/smm-smap/dtm?tahunAnggaran=${selectedYear}`)
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
  const findDtm = (fakultasId) => {
    return dtmList.find((d) => d.fakultasId === fakultasId);
  };

  // 2. Select or Create DTM on Action Button Click
  const handleDtmAction = async (fakultas) => {
    setIsSaving(true);
    setSelectedFakultas(fakultas);
    try {
      const dtm = await apiFetch("/api/smm-smap/select-or-create", {
        method: "POST",
        body: JSON.stringify({
          namaFakultas: fakultas.namaFakultas,
          tahunAnggaran: selectedYear,
        })
      });
      setSelectedDtm(dtm);
      let detail1 = "";
      let detail2 = "";
      let detail3 = "";
      let detail4 = "";
      let detail5 = "";
      let detail6 = "";
      let detail7 = "";
      if (dtm.detailTemuan) {
        const lines = dtm.detailTemuan.split('\n');
        detail1 = lines[0] || "";
        detail2 = lines[1] || "";
        detail3 = lines[2] || "";
        detail4 = lines[3] || "";
        detail5 = lines[4] || "";
        detail6 = lines[5] || "";
        detail7 = lines[6] || "";
      }
      setTemuanFormState({
        detailTemuan1: detail1,
        detailTemuan2: detail2,
        detailTemuan3: detail3,
        detailTemuan4: detail4,
        detailTemuan5: detail5,
        detailTemuan6: detail6,
        detailTemuan7: detail7,
        kodeTemuan: dtm.kodeTemuan || "",
      });
      setViewMode("edit");
    } catch (err) {
      showNotification(err.message || "Gagal memproses DTM SMM-SMAP", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Save Temuan
  const handleSaveTemuan = async (e) => {
    e.preventDefault();
    if (!selectedDtm) return;

    const combinedDetailTemuan = [
      temuanFormState.detailTemuan1 || "",
      temuanFormState.detailTemuan2 || "",
      temuanFormState.detailTemuan3 || "",
      temuanFormState.detailTemuan4 || "",
      temuanFormState.detailTemuan5 || "",
      temuanFormState.detailTemuan6 || "",
      temuanFormState.detailTemuan7 || "",
    ].join('\n');

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/smm-smap/dtm/${selectedDtm.id}/temuan`, {
        method: "PATCH",
        body: JSON.stringify({
          detailTemuan: combinedDetailTemuan,
          kodeTemuan: temuanFormState.kodeTemuan,
        }),
      });
      setSelectedDtm(updated);
      showNotification("Data temuan dan kode temuan berhasil disimpan");
      
      // Update local item in list to reflect state immediately when going back
      setDtmList((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      showNotification("Gagal menyimpan temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDtm(null);
    setSelectedFakultas(null);
    loadInitialData(); // reload lists to sync status
  };

  const isTemuanFilled = (dtm) => {
    if (!dtm || !dtm.detailTemuan) return false;
    try {
      const lines = dtm.detailTemuan.split('\n');
      return lines.some(line => {
        if (!line.trim()) return false;
        try {
          const parsed = JSON.parse(line);
          const ops = parsed.ops || parsed;
          if (Array.isArray(ops)) {
            return ops.some(op => op.insert && op.insert.trim().length > 0);
          }
        } catch (_) {
          return line.trim().length > 0;
        }
        return false;
      });
    } catch (_) {
      return dtm.detailTemuan.trim().length > 0;
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
            <FileEdit className="w-6 h-6 text-gray-700" />
            Input Temuan SMM-SMAP
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list"
              ? "Kelola dan input detail uraian temuan audit di seluruh unit kerja."
              : `Edit Temuan: ${selectedFakultas?.namaFakultas}`}
          </p>
        </div>

        {viewMode === "list" ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Tahun Anggaran:</span>
            <YearDropdown value={selectedYear} onChange={setSelectedYear} />
          </div>
        ) : (
          <button
            onClick={handleBackToList}
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="text-sm font-medium">Memuat data unit kerja...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                    <th className="px-6 py-4 border-r border-gray-150">Unit Kerja</th>
                    <th className="px-6 py-4 text-center border-r border-gray-150">Status DTM</th>
                    <th className="px-6 py-4 text-center border-r border-gray-150">Status Input Temuan</th>
                    <th className="px-6 py-4 text-center w-40">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700 bg-white">
                  {fakultasList.map((fak) => {
                    const dtm = findDtm(fak.id);
                    const isCreated = !!dtm;
                    const isFilled = isCreated && isTemuanFilled(dtm);

                    return (
                      <tr key={fak.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800 border-r border-gray-150">
                          {fak.namaFakultas}
                        </td>

                        {/* STATUS DTM */}
                        <td className="px-6 py-4 border-r border-gray-150">
                          <div className="flex justify-center">
                            {isCreated ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Sudah Dibuat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Belum Dibuat
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STATUS INPUT TEMUAN */}
                        <td className="px-6 py-4 border-r border-gray-150">
                          <div className="flex justify-center">
                            {isFilled ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Sudah Diisi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Belum Diisi
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACTION */}
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              disabled={isSaving}
                              onClick={() => handleDtmAction(fak)}
                              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                                isCreated
                                  ? "bg-gray-800 text-white hover:bg-gray-700"
                                  : "bg-indigo-650 text-white hover:bg-indigo-700 bg-indigo-600"
                              }`}
                            >
                              {isCreated ? "Buka" : "Buat DTM"}
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

      {/* EDIT VIEW: QUILL EDITOR FORM */}
      {viewMode === "edit" && selectedDtm && (
        <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm space-y-6 max-w-4xl">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Input Temuan Masalah SMM-SMAP
              </h2>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Unit Kerja: {selectedFakultas?.namaFakultas} | Tahun Anggaran: {selectedYear}
              </p>
            </div>

            {selectedDtm.statusDtm === "SUDAH_DITERUSKAN" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-green-300 bg-green-50 text-green-800 text-[10px] font-semibold">
                <CheckCircle className="w-3 h-3" />
                Selesai (Read Only / Disarankan)
              </span>
            )}
          </div>

          {selectedDtm.statusDtm === "SUDAH_DITERUSKAN" && (
            <div className="p-3 border border-amber-200 bg-amber-50 text-amber-900 rounded text-xs">
              <strong>Info:</strong> DTM ini telah ditandai <strong>Selesai</strong>.
            </div>
          )}

          <form onSubmit={handleSaveTemuan} className="space-y-6">
            {/* KODE TEMUAN */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kode Temuan
              </label>
              <input
                type="text"
                value={temuanFormState.kodeTemuan}
                onChange={(e) =>
                  setTemuanFormState({ ...temuanFormState, kodeTemuan: e.target.value })
                }
                placeholder="Masukkan kode temuan (e.g., SMAP-01, SMAP-002)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-gray-800"
              />
            </div>

            {/* DETAIL TEMUAN (7 Quill Editors) */}
            <div className="space-y-6">
              {/* SECTION 1: SPIP */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <label className="block text-xs font-bold text-gray-800 mb-2">
                  Sistem Pengendalian Intern Pemerintah (SPIP)
                </label>
                <QuillEditor
                  value={temuanFormState.detailTemuan1}
                  onChange={(opsJson) =>
                    setTemuanFormState((prev) => ({ ...prev, detailTemuan1: opsJson }))
                  }
                />
              </div>

              {/* SECTION 2: ZI WBK/WBBM */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="border-b border-gray-200 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-indigo-900">
                    Zona Integritas menuju Wilayah Bebas Korupsi / Wilayah Birokrasi Bersih Melayani (ZI WBK/WBBM)
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      I. Manajemen Perubahan
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan2}
                      onChange={(opsJson) =>
                        setTemuanFormState((prev) => ({ ...prev, detailTemuan2: opsJson }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      II. Penataan Tatalaksana
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan3}
                      onChange={(opsJson) =>
                        setTemuanFormState((prev) => ({ ...prev, detailTemuan3: opsJson }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      III. Penataan Sistem Manajemen SDM
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan4}
                      onChange={(opsJson) =>
                        setTemuanFormState((prev) => ({ ...prev, detailTemuan4: opsJson }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      IV. Penguatan Akuntabilitas
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan5}
                      onChange={(opsJson) =>
                        setTemuanFormState((prev) => ({ ...prev, detailTemuan5: opsJson }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      V. Penguatan Pengawasan
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan6}
                      onChange={(opsJson) =>
                        setTemuanFormState((prev) => ({ ...prev, detailTemuan6: opsJson }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      VI. Peningkatan Kualitas Pelayanan Publik
                    </label>
                    <QuillEditor
                      value={temuanFormState.detailTemuan7}
                      onChange={(opsJson) =>
                        setTemuanFormState((prev) => ({ ...prev, detailTemuan7: opsJson }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-gray-850 hover:bg-gray-800 bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Temuan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}