import BulletedTextArea from "../../components/BulletedTextArea";

export default function DtmDetailTab({
  detailFormState,
  setDetailFormState,
  handleSaveDetails,
  isSaving
}) {
  return (
    <div className="border border-gray-300 rounded p-4 bg-white">
      <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
        Informasi Detail DTM
      </h2>

      <form onSubmit={handleSaveDetails} className="space-y-4 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ASPEK MONITORING */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Aspek Monitoring
            </label>
            <input
              type="text"
              value={detailFormState.inputAspekMonitoring || ""}
              onChange={(e) =>
                setDetailFormState({ ...detailFormState, inputAspekMonitoring: e.target.value })
              }
              placeholder="Masukkan aspek monitoring..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
            />
          </div>

          {/* TIPE MONITORING */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tipe Monitoring
            </label>
            <select
              value={detailFormState.tipeMonitoring || "POST"}
              onChange={(e) =>
                setDetailFormState({ ...detailFormState, tipeMonitoring: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
            >
              <option value="POST">POST (Setelah)</option>
              <option value="ON_GOING">ON GOING (Sedang Berjalan)</option>
              <option value="PERENCANAAN">PERENCANAAN (Sebelum)</option>
            </select>
          </div>
        </div>

        {/* TIM & PIMPINAN DTM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ketua Auditor
            </label>
            <input
              type="text"
              value={detailFormState.inputKetuaAuditor || ""}
              onChange={(e) =>
                setDetailFormState({ ...detailFormState, inputKetuaAuditor: e.target.value })
              }
              placeholder="Masukkan nama ketua auditor..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ketua SPI
            </label>
            <input
              type="text"
              value={detailFormState.inputKetuaSpi || ""}
              onChange={(e) =>
                setDetailFormState({ ...detailFormState, inputKetuaSpi: e.target.value })
              }
              placeholder="Masukkan nama ketua SPI..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pimpinan Auditi
            </label>
            <input
              type="text"
              value={detailFormState.inputPimpinanAuditi || ""}
              onChange={(e) =>
                setDetailFormState({ ...detailFormState, inputPimpinanAuditi: e.target.value })
              }
              placeholder="Masukkan nama pimpinan auditi..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
            />
          </div>
        </div>

        {/* NAMA-NAMA AUDITOR */}
        <div className="border-t border-gray-100 pt-4">
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

        {/* LIST FIELDS: AKAR PENYEBAB, AKIBAT, REKOMENDASI (BulletedTextArea) */}
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Akar Penyebab
            </label>
            <BulletedTextArea
              value={detailFormState.inputAkarPenyebab || ""}
              onChange={(val) =>
                setDetailFormState({ ...detailFormState, inputAkarPenyebab: val })
              }
              placeholder="Tulis butir-butir akar penyebab masalah..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Akibat
            </label>
            <BulletedTextArea
              value={detailFormState.inputAkibat || ""}
              onChange={(val) =>
                setDetailFormState({ ...detailFormState, inputAkibat: val })
              }
              placeholder="Tulis butir-butir akibat dari masalah..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Rekomendasi
            </label>
            <BulletedTextArea
              value={detailFormState.inputRekomendasi || ""}
              onChange={(val) =>
                setDetailFormState({ ...detailFormState, inputRekomendasi: val })
              }
              placeholder="Tulis butir-butir rekomendasi penyelesaian..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan Detail DTM"}
          </button>
        </div>
      </form>
    </div>
  );
}
