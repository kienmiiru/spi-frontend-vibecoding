export default function DtmLampiranTab({
  lampiranList,
  uploadFile,
  setUploadFile,
  uploadKeterangan,
  setUploadKeterangan,
  handleUploadLampiran,
  handleDeleteLampiran,
  isSaving
}) {
  return (
    <div className="space-y-6">
      {/* UPLOAD FORM */}
      <div className="border border-gray-300 rounded p-4 bg-white">
        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
          Unggah Lampiran Baru
        </h2>

        <form onSubmit={handleUploadLampiran} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pilih Foto Gambar (JPG/PNG)
            </label>
            <input
              id="file-upload-input"
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Keterangan Gambar
            </label>
            <input
              type="text"
              value={uploadKeterangan}
              onChange={(e) => setUploadKeterangan(e.target.value)}
              placeholder="Masukkan keterangan foto/penjelasan temuan barang..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isSaving ? "Mengunggah..." : "Upload Lampiran"}
          </button>
        </form>
      </div>

      {/* ATTACHMENT GALLERY */}
      <div className="border border-gray-300 rounded p-4 bg-white">
        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-2 mb-4">
          Daftar Lampiran Terunggah
        </h2>

        {lampiranList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lampiranList.map((lamp) => (
              <div key={lamp.id} className="border border-gray-300 rounded overflow-hidden flex flex-col justify-between bg-gray-50">
                <div className="aspect-video w-full overflow-hidden border-b border-gray-300 bg-gray-200">
                  <img
                    src={lamp.linkFoto}
                    alt={lamp.keterangan || "Lampiran BMN"}
                    className="object-cover w-full h-full hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <p className="text-xs text-gray-700 line-clamp-2">{lamp.keterangan || "Tanpa keterangan"}</p>
                  <button
                    type="button"
                    onClick={() => handleDeleteLampiran(lamp.id)}
                    className="w-full py-1 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-semibold rounded text-center"
                  >
                    Hapus Lampiran
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-400 italic">
            Belum ada lampiran gambar terunggah untuk DTM ini.
          </div>
        )}
      </div>
    </div>
  );
}
