import BulletedTextArea from "../../components/BulletedTextArea";

export default function DtmKriteriaTab({
  detailFormState,
  setDetailFormState,
  handleSaveDetails,
  isSaving
}) {
  return (
    <div className="border border-gray-300 rounded p-4 bg-white">
      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
        Kriteria Audit BMN
      </h2>
      <p className="text-[10px] text-gray-500 mb-4">
        Secara default kriteria mengikuti konfigurasi di menu Peraturan, namun dapat diubah apabila kriteria berubah di tengah tahun.
      </p>

      <form onSubmit={handleSaveDetails} className="space-y-4 max-w-3xl">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Kriteria Audit
          </label>
          <BulletedTextArea
            value={detailFormState.kriteria || ""}
            onChange={(val) =>
              setDetailFormState({ ...detailFormState, kriteria: val })
            }
            placeholder="Tulis butir-butir peraturan/kriteria hukum yang berlaku untuk tahun anggaran ini..."
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan Kriteria"}
          </button>
        </div>
      </form>
    </div>
  );
}
