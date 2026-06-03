import { useState, useEffect, useRef } from "react";
import { Loader2, FileEdit, CheckCircle } from "lucide-react";

import Notification from "../../components/Notification";
import QuillEditor from "../../components/QuillEditor";
import { apiFetch } from "../../lib/api";

export default function BerandaSmmSmap() {
  // Main states
  const [selectedYear, setSelectedYear] = useState("");
  const [fakultasList, setFakultasList] = useState([]);
  const [selectedFakultasId, setSelectedFakultasId] = useState("");
  const [selectedDtm, setSelectedDtm] = useState(null);

  // Form states for temuan
  const [temuanFormState, setTemuanFormState] = useState({
    detailTemuan: "",
    kodeTemuan: "",
  });

  // Loading & notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDtm, setIsLoadingDtm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const quillRef = useRef(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Generate years list (from 2023 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2023 + 1 },
    (_, i) => (2023 + i).toString()
  );

  // Determine selected Fakultas object
  const selectedFakultas =
    fakultasList.find((f) => f.id === Number(selectedFakultasId)) || null;

  // 1. Fetch Fakultas list on mount
  useEffect(() => {
    const fetchFakultas = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch("/api/fakultas");
        setFakultasList(Array.isArray(data) ? data : []);
      } catch (err) {
        showNotification(err.message || "Gagal mengambil data unit kerja", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFakultas();
  }, []);

  // 2. Reactive Fetch or Create DTM on dropdown selection change
  useEffect(() => {
    if (selectedFakultas && selectedYear) {
      const initDtm = async () => {
        setIsLoadingDtm(true);
        try {
          const dtm = await apiFetch("/api/smm-smap/select-or-create", {
            method: "POST",
            body: JSON.stringify({
              namaFakultas: selectedFakultas.namaFakultas,
              tahunAnggaran: selectedYear,
            }),
          });
          setSelectedDtm(dtm);
          setTemuanFormState({
            detailTemuan: dtm.detailTemuan || "",
            kodeTemuan: dtm.kodeTemuan || "",
          });
        } catch (err) {
          showNotification("Gagal memproses DTM SMM-SMAP: " + err.message, "error");
          setSelectedDtm(null);
        } finally {
          setIsLoadingDtm(false);
        }
      };
      initDtm();
    } else {
      setSelectedDtm(null);
      setTemuanFormState({
        detailTemuan: "",
        kodeTemuan: "",
      });
    }
  }, [selectedFakultasId, selectedYear]);

  // 3. Save Temuan
  const handleSaveTemuan = async (e) => {
    e.preventDefault();
    if (!selectedDtm) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/smm-smap/dtm/${selectedDtm.id}/temuan`, {
        method: "PATCH",
        body: JSON.stringify({
          detailTemuan: temuanFormState.detailTemuan,
          kodeTemuan: temuanFormState.kodeTemuan,
        }),
      });
      setSelectedDtm(updated);
      showNotification("Data temuan dan kode temuan berhasil disimpan");
    } catch (err) {
      showNotification("Gagal menyimpan temuan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedFakultasId("");
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
            Pilih unit kerja dan tahun anggaran untuk mengelola detail uraian temuan audit di seluruh unit kerja.
          </p>
        </div>
      </div>

      {/* DROPDOWN SELECTORS SIDE-BY-SIDE */}
      <div className="bg-white rounded-xl border border-gray-250 shadow-sm p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-2 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="text-xs font-medium">Memuat daftar unit kerja...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unit Kerja Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Unit Kerja
              </label>
              <select
                value={selectedFakultasId}
                onChange={(e) => setSelectedFakultasId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-800 shadow-xs"
              >
                <option value="">-- Pilih Unit Kerja --</option>
                {fakultasList.map((fak) => (
                  <option key={fak.id} value={fak.id}>
                    {fak.namaFakultas}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Anggaran Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tahun Anggaran
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-800 shadow-xs"
              >
                <option value="">-- Pilih Tahun Anggaran --</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL WORKSPACE VIEW */}
      {selectedFakultas && selectedYear ? (
        isLoadingDtm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white rounded-xl border border-gray-250 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-sm font-medium">Memuat data DTM SMM-SMAP...</span>
          </div>
        ) : selectedDtm ? (
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
                   Kode Temuan <span className="text-rose-500">*</span>
                 </label>
                 <input
                   type="text"
                   required
                   value={temuanFormState.kodeTemuan}
                   onChange={(e) =>
                     setTemuanFormState({ ...temuanFormState, kodeTemuan: e.target.value })
                   }
                   placeholder="Masukkan kode temuan (e.g., SMAP-01, SMAP-002)"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-gray-800"
                 />
              </div>

              {/* DETAIL TEMUAN (Quill Editor) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Uraian Temuan (Quill Editor) <span className="text-rose-500">*</span>
                </label>
                <QuillEditor
                  value={temuanFormState.detailTemuan}
                  onChange={(opsJson) =>
                    setTemuanFormState({ ...temuanFormState, detailTemuan: opsJson })
                  }
                  quillInstanceRef={quillRef}
                />
                <p className="text-[10px] text-gray-400 mt-2">
                  Gunakan editor di atas untuk menyusun uraian temuan secara rapi (tebal, miring, daftar poin, dsb.).
                </p>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-55 transition-colors"
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
        ) : null
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-xl border border-gray-200 shadow-sm animate-fadeIn">
          <FileEdit className="w-16 h-16 text-gray-300 mb-4 stroke-1" />
          <h2 className="text-lg font-bold text-gray-800">Kelola Temuan SMM-SMAP</h2>
          <p className="text-sm text-gray-500 max-w-md mt-2">
            Silakan pilih unit kerja dan tahun anggaran terlebih dahulu pada dropdown di atas untuk memuat data DTM SMM-SMAP.
          </p>
        </div>
      )}
    </div>
  );
}