import { useState, useEffect } from "react";
import { Loader2, Plus, Edit, Wallet, AlertCircle, X, Check } from "lucide-react";
import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import Table from "../../components/Table";
import { apiFetch } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";

export default function CashOpnameKeuangan() {
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [faculties, setFaculties] = useState([]);
  const [opnameRecords, setOpnameRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetFaculty, setTargetFaculty] = useState(null);
  const [inputSistem, setInputSistem] = useState("");
  const [inputFisik, setInputFisik] = useState("");

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [facData, opData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/keuangan/opname/${selectedYear}`),
      ]);
      setFaculties(facData || []);
      setOpnameRecords(opData || []);
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Gagal memuat data cash opname", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const findRecord = (facultyId) => {
    return opnameRecords.find((rec) => rec.fakultasId === facultyId);
  };

  const handleOpenModal = (faculty) => {
    const record = findRecord(faculty.id);
    setTargetFaculty(faculty);
    setInputSistem(record ? record.saldoSistem : "");
    setInputFisik(record ? record.saldoFisik : "");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTargetFaculty(null);
    setInputSistem("");
    setInputFisik("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetFaculty) return;

    setIsSaving(true);
    try {
      await apiFetch("/api/keuangan/opname", {
        method: "POST",
        body: JSON.stringify({
          fakultas: targetFaculty.namaFakultas,
          tahunAnggaran: selectedYear,
          saldoSistem: parseFloat(inputSistem || 0),
          saldoFisik: parseFloat(inputFisik || 0),
        }),
      });

      confirm({
        title: "",
        message: `Cash opname untuk ${targetFaculty.namaFakultas} berhasil disimpan`,
        type: "info"
      });
      handleCloseModal();
      loadData(); // refresh list
    } catch (err) {
      showNotification(err.message || "Gagal menyimpan data cash opname", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const formatIDR = (value) => {
    if (value === undefined || value === null) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
            Cash Opname Keuangan
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Input dan kelola saldo sistem serta fisik kas untuk seluruh Unit Kerja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-700">Tahun Anggaran:</span>
          <YearDropdown value={selectedYear} onChange={setSelectedYear} />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-300 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-xs font-semibold">Memuat data cash opname...</span>
          </div>
        ) : faculties.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-16 text-center">No</Table.HeaderCell>
                <Table.HeaderCell>Unit Kerja</Table.HeaderCell>
                <Table.HeaderCell className="text-right w-52">Saldo Sistem</Table.HeaderCell>
                <Table.HeaderCell className="text-right w-52">Saldo Fisik</Table.HeaderCell>
                <Table.HeaderCell className="text-right w-52">Selisih</Table.HeaderCell>
                <Table.HeaderCell className="text-center w-40">Aksi</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {faculties.map((fac, index) => {
                const record = findRecord(fac.id);
                const hasRecord = !!record;
                const selisih = hasRecord ? record.saldoFisik - record.saldoSistem : 0;

                return (
                  <Table.Row key={fac.id}>
                    <Table.Cell className="text-center font-medium text-gray-500">
                      {index + 1}
                    </Table.Cell>
                    <Table.Cell className="font-semibold text-gray-900">
                      {fac.namaFakultas}
                    </Table.Cell>
                    <Table.Cell className="text-right font-mono">
                      {hasRecord ? formatIDR(record.saldoSistem) : "-"}
                    </Table.Cell>
                    <Table.Cell className="text-right font-mono">
                      {hasRecord ? formatIDR(record.saldoFisik) : "-"}
                    </Table.Cell>
                    <Table.Cell
                      className={`text-right font-mono font-bold ${
                        hasRecord
                          ? selisih < 0
                            ? "text-red-600"
                            : selisih > 0
                            ? "text-blue-600"
                            : "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {hasRecord ? formatIDR(selisih) : "-"}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <button
                        onClick={() => handleOpenModal(fac)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        {hasRecord ? "Ubah Saldo" : "Input Saldo"}
                      </button>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        ) : (
          <div className="border border-gray-300 p-16 flex flex-col items-center justify-center text-center bg-gray-50/50">
            <Wallet className="w-12 h-12 text-gray-300 stroke-1 mb-2" />
            <span className="text-xs text-gray-400 font-semibold">
              Tidak ada data Unit Kerja yang tersedia.
            </span>
          </div>
        )}
      </div>

      {/* INPUT MODAL */}
      {isModalOpen && targetFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-md flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-250 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                Input Saldo Opname - {targetFaculty.namaFakultas}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Saldo Sistem (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={inputSistem}
                  onChange={(e) => setInputSistem(e.target.value)}
                  placeholder="Masukkan saldo kas menurut sistem"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Saldo Fisik (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={inputFisik}
                  onChange={(e) => setInputFisik(e.target.value)}
                  placeholder="Masukkan saldo kas riil secara fisik"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-55"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
