import { useState, useEffect } from "react";
import { Loader2, UserCheck, Save } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";
import Notification from "../components/Notification";

const DIVISION_MAP = {
  KEUANGAN: {
    apiPath: "keuangan",
    title: "Ketua Auditor Keuangan",
    description: "Konfigurasi nama Ketua Auditor Keuangan yang akan dicantumkan pada DTM divisi Keuangan.",
    placeholder: "Nama Ketua Auditor Keuangan...",
  },
  PBJ: {
    apiPath: "pbj",
    title: "Ketua Auditor PBJ",
    description: "Konfigurasi nama Ketua Auditor PBJ yang akan dicantumkan pada DTM divisi Pengadaan Barang dan Jasa.",
    placeholder: "Nama Ketua Auditor PBJ...",
  },
  BMN: {
    apiPath: "bmn",
    title: "Ketua Auditor BMN",
    description: "Konfigurasi nama Ketua Auditor BMN yang akan dicantumkan pada DTM divisi Barang Milik Negara.",
    placeholder: "Nama Ketua Auditor BMN...",
  },
  SMM_SMAP: {
    apiPath: "smm-smap",
    title: "Ketua Auditor SMM-SMAP",
    description: "Konfigurasi nama Ketua Auditor SMM-SMAP yang akan dicantumkan pada DTM divisi SMM-SMAP.",
    placeholder: "Nama Ketua Auditor SMM-SMAP...",
  },
  SDM: {
    apiPath: "sdm",
    title: "Ketua Auditor SDM",
    description: "Konfigurasi nama Ketua Auditor SDM yang akan dicantumkan pada DTM divisi Sumber Daya Manusia.",
    placeholder: "Nama Ketua Auditor SDM...",
  },
};

export default function KetuaAuditorPage() {
  const { user } = useAuth();
  const confirm = useConfirm();

  const divisionConfig = DIVISION_MAP[user?.role] || {
    apiPath: "keuangan",
    title: "Ketua Auditor",
    description: "Konfigurasi nama Ketua Auditor.",
    placeholder: "Masukkan nama ketua auditor...",
  };

  const [auditorName, setAuditorName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  const loadKetuaAuditor = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch(`/api/${divisionConfig.apiPath}/ketua-auditor`);
      setAuditorName(data.value || "");
    } catch (err) {
      showNotification(
        err.message || "Gagal memuat nama Ketua Auditor",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role) {
      loadKetuaAuditor();
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!auditorName.trim()) {
      showNotification("Nama Ketua Auditor tidak boleh kosong", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await apiFetch(`/api/${divisionConfig.apiPath}/ketua-auditor`, {
        method: "PUT",
        body: JSON.stringify({ value: auditorName }),
      });
      setAuditorName(updated.value || "");
      confirm({
        title: "",
        message: `Nama ${divisionConfig.title} berhasil diperbarui`,
        type: "info",
      });
    } catch (err) {
      showNotification(
        err.message || "Gagal memperbarui nama Ketua Auditor",
        "error"
      );
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
            <UserCheck className="w-6 h-6 text-c-maroon" />
            Konfigurasi {divisionConfig.title}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {divisionConfig.description}
          </p>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm max-w-3xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-c-maroon" />
            <span className="text-xs font-semibold">Memuat data Ketua Auditor...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Nama Ketua Auditor
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder={divisionConfig.placeholder}
                className="w-full border border-gray-300 focus:border-c-maroon focus:ring-1 focus:ring-c-maroon rounded-lg text-sm bg-white transition-all outline-none px-4 py-2.5"
              />
              <p className="text-[10px] text-gray-400">
                Nama yang diisi di sini akan otomatis digunakan sebagai Ketua Auditor default saat membuat DTM baru untuk divisi ini.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-150">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-c-maroon hover:bg-c-maroon-600 active:bg-c-maroon-700 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
