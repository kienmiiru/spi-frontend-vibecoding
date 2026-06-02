import { useState, useEffect } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

import BulletedTextArea from "../../components/BulletedTextArea";
import Notification from "../../components/Notification";
import { apiFetch } from "../../lib/api";

export default function PeraturanBmn() {
  const [kriteriaText, setKriteriaText] = useState("");

  // Loading & notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Fetch initial kriteria
  const loadKriteria = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/api/bmn/kriteria");
      setKriteriaText(data.value || "");
    } catch (err) {
      showNotification(err.message || "Gagal memuat kriteria audit default", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKriteria();
  }, []);

  // Save updated kriteria
  const handleSaveKriteria = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await apiFetch("/api/bmn/kriteria", {
        method: "PUT",
        body: JSON.stringify({ value: kriteriaText }),
      });
      setKriteriaText(updated.value || "");
      showNotification("Kriteria default audit BMN berhasil diperbarui");
    } catch (err) {
      showNotification(err.message || "Gagal memperbarui kriteria audit", "error");
    } finally {
      setIsSaving(false);
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
            <ShieldCheck className="w-6 h-6 text-gray-700" />
            Peraturan & Kriteria BMN
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Konfigurasi kriteria default untuk audit Barang Milik Negara (BMN).
          </p>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="bg-white border border-gray-300 rounded p-6 shadow-sm max-w-3xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-xs font-semibold">Memuat kriteria default...</span>
          </div>
        ) : (
          <form onSubmit={handleSaveKriteria} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Kriteria Default Audit BMN
              </label>
              <BulletedTextArea
                value={kriteriaText}
                onChange={setKriteriaText}
                placeholder="Tulis butir-butir peraturan/kriteria hukum default yang berlaku untuk tahun anggaran ini..."
              />
              <p className="text-[10px] text-gray-450 mt-2">
                Kriteria di atas akan menjadi acuan dasar pada DTM baru di seluruh unit kerja, namun auditor tetap dapat menyesuaikannya per DTM secara mandiri jika diperlukan.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-250">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Menyimpan..." : "Simpan Peraturan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}