import QuillEditor from "../../components/QuillEditor";

export default function DtmTemuanTab({
  samplings,
  selectedSampling,
  setSelectedSampling,
  temuanFormState,
  setTemuanFormState,
  handleSaveTemuan,
  isSaving,
  quillRef,
  handleAutoInsertTemuan,
  isSamplingComplete
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* LEFT SIDE: SAMPLING ITEMS */}
      <div className="md:col-span-5 border border-gray-300 rounded p-4 bg-white space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">1. Hasil Pengisian Lembar Kerja</h2>
          <p className="text-[10px] text-gray-500">Pilih barang untuk melihat data audit & memasukkan temuan secara otomatis.</p>
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
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-gray-50 border-gray-900"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold text-xs text-gray-900">{item.namaBarang}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{item.merkAtauType || "(Tidak ada merk)"}</div>
                      <div className="text-[10px] text-gray-500">
                        Thn: {item.tahunPerolehan || "-"} | Jml: {item.jumlahBarang || 0}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                        isComplete
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}
                    >
                      {isComplete ? "Lengkap" : "Belum Lengkap"}
                    </span>
                  </div>

                  {/* Render sheet fields detail on click */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-[10px] space-y-1 text-gray-700">
                      <div><strong className="text-gray-900">Kondisi:</strong> {item.kondisiBarang || "-"}</div>
                      <div><strong className="text-gray-900">Lokasi:</strong> {item.lokasiPenempatan || "-"}</div>
                      <div><strong className="text-gray-900">Penggunaan:</strong> {item.penggunaan || "-"}</div>
                      <div><strong className="text-gray-900">Pengguna:</strong> {item.pengguna || "-"}</div>
                      <div><strong className="text-gray-900">Pelabelan:</strong> {item.labelBarang || "-"}</div>
                      <div><strong className="text-gray-900">Ket:</strong> {item.keteranganTambahan || "-"}</div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoInsertTemuan(item);
                        }}
                        className="mt-2 w-full py-1 text-[10px] font-semibold text-center border border-gray-800 bg-gray-800 text-white rounded hover:bg-gray-700"
                      >
                        Auto-Insert Temuan
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-gray-300 rounded text-xs text-gray-400">
            Belum ada data barang sampling untuk DTM ini.
          </div>
        )}
      </div>

      {/* RIGHT SIDE: QUILL & KODE TEMUAN */}
      <div className="md:col-span-7 border border-gray-300 rounded p-4 bg-white">
        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
          2. Input Detail Temuan BMN
        </h2>

        <form onSubmit={handleSaveTemuan} className="space-y-4">
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
              placeholder="Masukkan kode temuan (e.g., 01, BMN-02)"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Detail Temuan
            </label>
            <QuillEditor
              value={temuanFormState.detailTemuan}
              onChange={(opsJson) =>
                setTemuanFormState({ ...temuanFormState, detailTemuan: opsJson })
              }
              quillInstanceRef={quillRef}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Temuan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
