import { useState, useEffect, useRef } from "react";
import { Loader2, Upload, FileSpreadsheet, Plus, Edit, Trash2, ArrowLeft, Search, Download, HelpCircle, Save, X, Maximize2, Minimize2 } from "lucide-react";
import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import Table from "../../components/Table";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";
import DataTable from "datatables.net-dt";
import "datatables.net-searchbuilder-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";
import "datatables.net-searchbuilder-dt/css/searchBuilder.dataTables.css";


const isDateHeader = (header) => {
  const h = String(header).toLowerCase();
  return h.includes("tanggal") || h.includes("tgl") || h.includes("date") || h.includes("waktu");
};

const isCurrencyHeader = (header) => {
  const h = String(header).toLowerCase();
  return (
    h.includes("debet") ||
    h.includes("kredit") ||
    h.includes("jumlah") ||
    h.includes("saldo") ||
    h.includes("nominal") ||
    h.includes("rupiah") ||
    h.includes("total") ||
    h.includes("nilai") ||
    h.includes("harga") ||
    h.includes("biaya")
  );
};

const formatDate = (val) => {
  if (val === null || val === undefined || val === "") return "";
  let date = null;
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    date = new Date(Math.round((val - 25569) * 86400 * 1000));
  } else {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }
  if (date && !isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
  return String(val);
};

const formatNumber = (val) => {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") {
    return new Intl.NumberFormat("id-ID").format(val);
  }
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  if (!isNaN(num)) {
    return new Intl.NumberFormat("id-ID").format(num);
  }
  return String(val);
};

export default function KeuanganKeuangan() {
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [faculties, setFaculties] = useState([]);
  const [dtmList, setDtmList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Navigation State
  const [viewMode, setViewMode] = useState("list"); // "list" | "workspace"
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedDtm, setSelectedDtm] = useState(null);

  // Excel Upload State
  const [excelFile, setExcelFile] = useState(null);
  const [excelRows, setExcelRows] = useState([]); // [headers, row1, row2, ...]
  
  const tableRef = useRef(null);
  const dtInstanceRef = useRef(null);

  // Table expansion state
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Findings State
  const [findings, setFindings] = useState([]);
  
  // New Finding Form State
  const [formNoBuku, setFormNoBuku] = useState("");
  const [formUraian, setFormUraian] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formKategori, setFormKategori] = useState("DITEMUKAN");
  const [formKode, setFormKode] = useState("");

  // Edit Finding State
  const [editingFinding, setEditingFinding] = useState(null);
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [editKategori, setEditKategori] = useState("DITEMUKAN");
  const [editKode, setEditKode] = useState("");
  const [editUraian, setEditUraian] = useState("");
  const [editNoBuku, setEditNoBuku] = useState("");

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [facData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/keuangan/dtm/${selectedYear}`),
      ]);
      setFaculties(facData || []);
      setDtmList(dtmData || []);
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Gagal memuat data awal", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const findDtm = (facultyId) => {
    return dtmList.find((d) => d.fakultasId === facultyId);
  };

  const loadFindings = async (dtmId) => {
    try {
      const data = await apiFetch(`/api/keuangan/temuan/dtm/${dtmId}`);
      // Filter only sebelum visitasi
      const filtered = (data || []).filter(item => item.statusTemuan === "SEBELUM_VISITASI");
      setFindings(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFaculty = async (faculty) => {
    setSelectedFaculty(faculty);
    const dtm = findDtm(faculty.id);
    setSelectedDtm(dtm || null);
    
    // Reset workspace state
    setExcelFile(null);
    setExcelRows([]);
    setFindings([]);
    resetForm();

    if (dtm) {
      await loadFindings(dtm.id);
    }
    setViewMode("workspace");
  };

  const resetForm = () => {
    setFormNoBuku("");
    setFormUraian("");
    setFormDeskripsi("");
    setFormKategori("DITEMUKAN");
    setFormKode("");
  };

  // Excel Import
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      showNotification("Pilih berkas Excel terlebih dahulu", "error");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);

      const res = await apiFetch("/api/keuangan/office/import-excel", {
        method: "POST",
        body: formData,
      });

      if (res && res.data && res.data.length > 0) {
        setExcelRows(res.data);
        showNotification("Berkas Excel berhasil diimpor dan diproses");
      } else {
        showNotification("Format data Excel tidak valid atau kosong", "error");
      }
    } catch (err) {
      showNotification(err.message || "Gagal mengunggah berkas Excel", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Finding
  const handleAddFinding = async (e) => {
    e.preventDefault();
    if (!formNoBuku || !formDeskripsi) {
      showNotification("Nomor Buku dan Deskripsi Temuan wajib diisi", "error");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch("/api/keuangan/temuan/sebelum-visitasi", {
        method: "POST",
        body: JSON.stringify({
          fakultas: selectedFaculty.namaFakultas,
          tahunAnggaran: selectedYear,
          noBuku: parseInt(formNoBuku, 10),
          uraianTransaksi: formUraian,
          deskripsiTemuan: formDeskripsi,
          kategoriTemuan: formKategori,
          kodeTemuan: formKode,
        }),
      });

      confirm({
        title: "",
        message: "Temuan sebelum visitasi berhasil ditambahkan",
        type: "info"
      });
      resetForm();
      
      // Reload DTMs and findings
      const dtmData = await apiFetch(`/api/keuangan/dtm/${selectedYear}`);
      setDtmList(dtmData || []);
      
      const newDtm = (dtmData || []).find(d => d.fakultasId === selectedFaculty.id);
      if (newDtm) {
        setSelectedDtm(newDtm);
        await loadFindings(newDtm.id);
      }
    } catch (err) {
      showNotification(err.message || "Gagal menambahkan temuan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Finding
  const handleDeleteFinding = async (id) => {
    const confirmed = await confirm({
      title: "",
      message: "Apakah Anda yakin ingin menghapus temuan ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/keuangan/temuan/${id}`, {
        method: "DELETE",
      });
      confirm({
        title: "",
        message: "Temuan berhasil dihapus",
        type: "info"
      });
      if (selectedDtm) {
        await loadFindings(selectedDtm.id);
      }
    } catch (err) {
      showNotification(err.message || "Gagal menghapus temuan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Start edit mode
  const handleStartEdit = (finding) => {
    setEditingFinding(finding);
    setEditDeskripsi(finding.deskripsiTemuan || "");
    setEditKategori(finding.kategoriTemuan || "DITEMUKAN");
    setEditKode(finding.kodeTemuan || "");
    setEditUraian(finding.uraianTransaksi || "");
    setEditNoBuku(finding.noBuku || "");
  };

  // Update Finding
  const handleUpdateFinding = async (e) => {
    e.preventDefault();
    if (!editingFinding) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/keuangan/temuan/${editingFinding.id}`, {
        method: "PUT",
        body: JSON.stringify({
          noBuku: parseInt(editNoBuku, 10),
          uraianTransaksi: editUraian,
          deskripsiTemuan: editDeskripsi,
          kategoriTemuan: editKategori,
          kodeTemuan: editKode,
          statusTemuan: "SEBELUM_VISITASI",
        }),
      });

      confirm({
        title: "",
        message: "Temuan berhasil diperbarui",
        type: "info"
      });
      setEditingFinding(null);
      if (selectedDtm) {
        await loadFindings(selectedDtm.id);
      }
    } catch (err) {
      showNotification(err.message || "Gagal memperbarui temuan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Export temporary DTM to Docx
  const handleExportSebelum = async () => {
    if (!selectedDtm) return;
    setIsSaving(true);
    try {
      const blob = await apiFetchBlob("/api/keuangan/office/export-docx/sebelum", {
        method: "POST",
        body: JSON.stringify({ dtmKeuanganId: selectedDtm.id }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_Sementara_Keuangan_${selectedFaculty?.namaFakultas || "Unit_Kerja"}_${selectedYear}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("Dokumen DTM Sementara (Sebelum Visitasi) berhasil diekspor");
    } catch (err) {
      showNotification(err.message || "Gagal mengekspor dokumen", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle excel row click
  const handleSelectExcelRow = (row, headers) => {
    const noBukuIdx = headers.findIndex(h => h.toUpperCase() === "NO BUKU");
    const uraianIdx = headers.findIndex(h => h.toUpperCase() === "URAIAN");

    const noBuku = noBukuIdx !== -1 ? row[noBukuIdx] : "";
    const uraian = uraianIdx !== -1 ? row[uraianIdx] : "";

    setFormNoBuku(noBuku);
    setFormUraian(uraian);

    // Scroll right side form into view
    const formEl = document.getElementById("temuan-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  // check if a row is sampled (if noBuku matches any in findings list)
  const isRowSampled = (row, headers) => {
    const noBukuIdx = headers.findIndex(h => h.toUpperCase() === "NO BUKU");
    if (noBukuIdx === -1) return false;
    const noBuku = row[noBukuIdx];
    return findings.some(f => f.noBuku === parseInt(noBuku, 10));
  };

  const excelHeaders = excelRows[0] || [];
  const excelDataRows = excelRows.slice(1) || [];

  // DataTables Integration
  useEffect(() => {
    if (excelRows.length === 0 || !tableRef.current) {
      if (dtInstanceRef.current) {
        dtInstanceRef.current.destroy();
        dtInstanceRef.current = null;
        const tableEl = tableRef.current;
        if (tableEl) {
          while (tableEl.firstChild) {
            tableEl.removeChild(tableEl.firstChild);
          }
        }
      }
      return;
    }

    const columns = excelHeaders.map((header, idx) => ({
      title: header,
      data: idx,
      render: (data, type, row) => {
        if (type === 'display') {
          if (isDateHeader(header)) {
            return formatDate(data);
          }
          if (isCurrencyHeader(header)) {
            return formatNumber(data);
          }
        }
        return data !== null && data !== undefined ? String(data) : '';
      }
    }));

    columns.push({
      title: "Aksi",
      data: null,
      orderable: false,
      searchable: false,
      className: "text-center sticky right-0 bg-white z-20 border-l border-gray-250",
      render: (data, type, row, meta) => {
        return `<button 
          type="button"
          data-row-idx="${meta.row}"
          class="detail-btn inline-flex items-center gap-0.5 px-2 py-1 border border-gray-300 bg-white hover:bg-gray-50 text-[9px] font-bold rounded shadow-2xs cursor-pointer"
          title="Pilih baris ini untuk temuan"
        >
          Detail
        </button>`;
      }
    });

    if (dtInstanceRef.current) {
      dtInstanceRef.current.destroy();
      const tableEl = tableRef.current;
      if (tableEl) {
        while (tableEl.firstChild) {
          tableEl.removeChild(tableEl.firstChild);
        }
      }
    }

    const dt = new DataTable(tableRef.current, {
      data: excelDataRows,
      columns: columns,
      destroy: true,
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50, 100, -1], [5, 10, 25, 50, 100, 'Semua']],
      layout: {
        topStart: 'searchBuilder',
        top2Start: 'pageLength',
        bottomStart: 'info',
        bottomEnd: 'paging'
      },
      createdRow: (row, rowData, dataIndex) => {
        if (isRowSampled(rowData, excelHeaders)) {
          row.classList.add('bg-sampled');
        } else {
          row.classList.remove('bg-sampled');
        }
      },
      language: {
        search: "Cari:",
        lengthMenu: "Tampilkan _MENU_ data",
        info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
        infoEmpty: "Menampilkan 0 sampai 0 dari 0 data",
        infoFiltered: "(disaring dari _MAX_ total data)",
        zeroRecords: "Tidak ditemukan data yang cocok",
        paginate: {
          first: "Pertama",
          last: "Terakhir",
          next: "Berikutnya",
          previous: "Sebelumnya"
        },
        searchBuilder: {
          add: "Tambah Kondisi",
          condition: "Kondisi",
          clearAll: "Bersihkan Semua",
          delete: "Hapus",
          deleteTitle: "Hapus Judul",
          data: "Kolom",
          left: "Kiri",
          leftTitle: "Kiri Judul",
          right: "Kanan",
          rightTitle: "Kanan Judul",
          value: "Nilai",
          valueTitle: "Nilai Judul",
          title: {
            0: "Pencarian Kustom",
            _: "Pencarian Kustom (%d)"
          }
        }
      }
    });

    dtInstanceRef.current = dt;

    const handleTableClick = (e) => {
      const btn = e.target.closest('.detail-btn');
      if (btn) {
        const rowIdx = parseInt(btn.getAttribute('data-row-idx'), 10);
        const rowData = excelDataRows[rowIdx];
        handleSelectExcelRow(rowData, excelHeaders);
      }
    };

    const tableEl = tableRef.current;
    if (tableEl) {
      tableEl.addEventListener('click', handleTableClick);
    }

    return () => {
      if (tableEl) {
        tableEl.removeEventListener('click', handleTableClick);
      }
      if (dtInstanceRef.current) {
        dtInstanceRef.current.destroy();
        dtInstanceRef.current = null;
      }
    };
  }, [excelRows, findings]);

  useEffect(() => {
    if (dtInstanceRef.current) {
      setTimeout(() => {
        if (dtInstanceRef.current) {
          dtInstanceRef.current.columns.adjust();
        }
      }, 50);
    }
  }, [isTableExpanded]);

  const totalKasRows = excelRows.length > 1 ? excelRows.length - 1 : 0;
  const findingPercentage = totalKasRows > 0 ? ((findings.length / totalKasRows) * 100).toFixed(1) : "0.0";

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* VIEW: UNIT KERJA LIST */}
      {viewMode === "list" && (
        <>
          <div className="flex items-center justify-between border-b border-gray-300 pb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Evaluasi Keuangan
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Pilih Unit Kerja untuk mengunggah berkas transaksi dan mengelola temuan awal (sebelum visitasi).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700">Tahun Anggaran:</span>
              <YearDropdown value={selectedYear} onChange={setSelectedYear} />
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-300 gap-3 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="text-xs font-semibold">Memuat daftar Unit Kerja...</span>
              </div>
            ) : faculties.length > 0 ? (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="w-16 text-center">No</Table.HeaderCell>
                    <Table.HeaderCell>Unit Kerja</Table.HeaderCell>
                    <Table.HeaderCell className="text-center w-52">Status DTM</Table.HeaderCell>
                    <Table.HeaderCell className="text-center w-52">Temuan Sementara</Table.HeaderCell>
                    <Table.HeaderCell className="text-center w-40">Aksi</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {faculties.map((fac, index) => {
                    const dtm = findDtm(fac.id);
                    const isCreated = !!dtm;

                    return (
                      <Table.Row key={fac.id}>
                        <Table.Cell className="text-center font-medium text-gray-500">
                          {index + 1}
                        </Table.Cell>
                        <Table.Cell className="font-semibold text-gray-900">
                          {fac.namaFakultas}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {isCreated ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                                dtm.statusDtm === "SUDAH_DITERUSKAN"
                                  ? "bg-green-50 border-green-300 text-green-800"
                                  : "bg-gray-50 border-gray-300 text-gray-800"
                              }`}
                            >
                              {dtm.statusDtm === "SUDAH_DITERUSKAN" ? "Selesai" : "Belum Selesai"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Belum ada temuan</span>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-center font-bold">
                          {isCreated ? dtm._count?.TemuanKeuangan.sebelumVisitasi ?? 0 : 0} temuan
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <button
                            onClick={() => handleSelectFaculty(fac)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold border border-gray-800 bg-white text-gray-800 rounded hover:bg-gray-100 transition-colors"
                          >
                            Pilih
                          </button>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            ) : (
              <div className="border border-gray-300 p-16 text-center text-xs text-gray-400 bg-gray-50/50">
                Tidak ada data Unit Kerja yang tersedia.
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW: WORKSPACE */}
      {viewMode === "workspace" && selectedFaculty && (
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-gray-300 pb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Evaluasi Keuangan - {selectedFaculty.namaFakultas}
              </h1>
              <p className="text-xs text-gray-500">
                Impor jurnal kas, cari transaksi mencurigakan, dan input temuan sebelum visitasi (sementara).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSebelum}
                disabled={isSaving || !selectedDtm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-800 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor DTM Sementara
              </button>
              <button
                onClick={() => {
                  setViewMode("list");
                  setSelectedFaculty(null);
                  setSelectedDtm(null);
                  setExcelRows([]);
                  setIsTableExpanded(false);
                  loadData();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali
              </button>
            </div>
          </div>

          {/* MAIN SPLIT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANEL: EXCEL PARSER AND SEARCH (span 7 or 12) */}
            <div className={`${isTableExpanded ? "lg:col-span-12" : "lg:col-span-7"} space-y-6`}>
              
              {/* UPLOADER */}
              <div className="bg-white border border-gray-300 rounded p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Unggah Jurnal Keuangan (Excel)
                </h3>
                
                <form onSubmit={handleExcelUpload} className="flex gap-2 items-center">
                  <input
                    type="file"
                    required
                    accept=".xlsx, .xls"
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="flex-1 text-xs text-gray-600 border border-gray-300 rounded p-1 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !excelFile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Impor
                  </button>
                </form>
              </div>

              {/* EXCEL GRID TABLE */}
              {excelRows.length > 0 && (
                <div className="bg-white border border-gray-300 rounded p-4 shadow-sm space-y-4">
                  <style>{`
                    /* Custom overrides for DataTables to match our UI */
                    .dt-container {
                      font-size: 10px;
                      font-family: inherit;
                    }
                    .dt-container .dt-layout-row {
                      margin-bottom: 8px;
                      display: block !important;
                    }
                    .dt-container select, .dt-container input {
                      font-size: 10px;
                      padding: 4px 8px;
                      border: 1px solid #d1d5db;
                      border-radius: 4px;
                      background-color: #fff;
                    }
                    .dt-container select:focus, .dt-container input:focus {
                      outline: none;
                      border-color: #5A0D08;
                    }
                    th.sticky.right-0 {
                      background-color: #f3f4f6 !important; /* bg-gray-100 */
                      position: sticky;
                      right: 0;
                      z-index: 20;
                    }
                    td.sticky.right-0 {
                      background-color: #ffffff !important; /* bg-white */
                      position: sticky;
                      right: 0;
                      z-index: 20;
                    }
                    .dt-container .dt-search input {
                      margin-left: 0.5em;
                    }
                    /* SearchBuilder styling adjustments */
                    .dtsb-searchBuilder {
                      background-color: #f9fafb;
                      border: 1px solid #e5e7eb;
                      border-radius: 6px;
                      padding: 12px;
                      margin-bottom: 12px;
                    }
                    .dtsb-title {
                      font-weight: 700;
                      font-size: 11px;
                      color: #111827;
                      margin-bottom: 8px;
                    }
                    .dtsb-group {
                      background-color: #fff !important;
                      border: 1px solid #e5e7eb !important;
                    }
                    .dtsb-button {
                      font-size: 10px !important;
                      padding: 4px 8px !important;
                      background: #fff !important;
                      border: 1px solid #d1d5db !important;
                      border-radius: 4px !important;
                      color: #374151 !important;
                      cursor: pointer;
                    }
                    .dtsb-button:hover {
                      background: #f3f4f6 !important;
                    }
                    .dtsb-criteria select, .dtsb-criteria input {
                      font-size: 10px !important;
                      height: auto !important;
                      padding: 4px 8px !important;
                    }
                    .dt-layout-table {
                      overflow-x: auto;
                      border: 1px solid #e5e7eb;
                      border-radius: 4px;
                      max-height: 500px;
                    }
                    tr.bg-sampled td {
                      background-color: #f0fdf4 !important; /* bg-green-50 */
                    }
                    tr.bg-sampled:hover td {
                      background-color: #dcfce7 !important; /* bg-green-100 */
                    }
                  `}</style>
                  
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xs font-bold text-gray-900">
                      Isi Jurnal Kas ({excelDataRows.length} baris)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsTableExpanded(!isTableExpanded)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded shadow-2xs transition-colors cursor-pointer"
                      title={isTableExpanded ? "Perkecil Tabel" : "Perluas Tabel"}
                    >
                      {isTableExpanded ? (
                        <>
                          <Minimize2 className="w-3 h-3 text-gray-500" />
                          <span>Perkecil</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3 h-3 text-gray-500" />
                          <span>Perluas</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <table ref={tableRef} className="w-full border-collapse text-[10px] text-gray-800 text-left display"></table>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-semibold mt-2">
                    <span className="inline-block w-3 h-3 bg-green-50 border border-green-200 rounded"></span>
                    <span>Baris yang ditandai hijau adalah yang nomor bukunya sudah memiliki temuan (tersampel).</span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: ADD / EDIT FINDINGS (span 5 or 12) */}
            <div className={`${isTableExpanded ? "lg:col-span-12" : "lg:col-span-5"} space-y-6`}>
              
              {/* FORM BOX */}
              <div id="temuan-form" className="bg-white border border-gray-300 rounded p-4 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-c-maroon" />
                  {editingFinding ? "Edit Temuan Sementara" : "Tambah Temuan Sebelum Visitasi"}
                </h3>

                {editingFinding ? (
                  /* EDIT FINDING FORM */
                  <form onSubmit={handleUpdateFinding} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nomor Buku</label>
                      <input
                        type="number"
                        required
                        value={editNoBuku}
                        onChange={(e) => setEditNoBuku(e.target.value)}
                        className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none bg-white font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Uraian Transaksi</label>
                      <textarea
                        rows="2"
                        value={editUraian}
                        onChange={(e) => setEditUraian(e.target.value)}
                        className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        placeholder="Contoh: Transaksi UP nomor kuitansi..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Deskripsi Temuan</label>
                      <textarea
                        rows="3"
                        required
                        value={editDeskripsi}
                        onChange={(e) => setEditDeskripsi(e.target.value)}
                        className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        placeholder="Tuliskan catatan detail temuan..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kategori</label>
                        <select
                          value={editKategori}
                          onChange={(e) => setEditKategori(e.target.value)}
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        >
                          <option value="DITEMUKAN">Ditemukan</option>
                          <option value="PERLU_KONFIRMASI">Perlu Konfirmasi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kode Temuan</label>
                        <input
                          type="text"
                          value={editKode}
                          onChange={(e) => setEditKode(e.target.value)}
                          placeholder="Kode temuan..."
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingFinding(null)}
                        className="px-3 py-1.5 border border-gray-300 text-[10px] font-bold rounded hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded"
                      >
                        {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ADD NEW FINDING FORM */
                  <form onSubmit={handleAddFinding} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nomor Buku</label>
                      <input
                        type="number"
                        required
                        value={formNoBuku}
                        onChange={(e) => setFormNoBuku(e.target.value)}
                        placeholder="Klik 'Detail' di tabel kas atau ketik langsung..."
                        className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none bg-white font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Uraian Transaksi</label>
                      <textarea
                        rows="2"
                        value={formUraian}
                        onChange={(e) => setFormUraian(e.target.value)}
                        className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        placeholder="Prefilled otomatis dari baris jurnal yang dipilih..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Deskripsi Temuan</label>
                      <textarea
                        rows="3"
                        required
                        value={formDeskripsi}
                        onChange={(e) => setFormDeskripsi(e.target.value)}
                        className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        placeholder="Contoh: Kurang kuitansi, PPH belum dibayar, dll..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kategori</label>
                        <select
                          value={formKategori}
                          onChange={(e) => setFormKategori(e.target.value)}
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white"
                        >
                          <option value="DITEMUKAN">Ditemukan</option>
                          <option value="PERLU_KONFIRMASI">Perlu Konfirmasi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Kode Temuan</label>
                        <input
                          type="text"
                          value={formKode}
                          onChange={(e) => setFormKode(e.target.value)}
                          placeholder="Contoh: KEU-01"
                          className="w-full border border-gray-350 rounded px-2.5 py-1.5 text-xs focus:outline-none bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-3 py-1.5 border border-gray-300 text-[10px] font-bold rounded hover:bg-gray-50"
                      >
                        Reset Form
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded"
                      >
                        {isSaving ? "Menyimpan..." : "Simpan Temuan"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* LIST OF TEMPORARY FINDINGS */}
              <div className="bg-white border border-gray-300 rounded p-4 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  Daftar Temuan Sementara ({findings.length}
                  {totalKasRows > 0 ? ` | ${findingPercentage}%` : ""})
                </h3>

                {findings.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {findings.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 hover:border-gray-300 rounded p-3 bg-white space-y-2 relative shadow-2xs group"
                      >
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 border text-[9px] font-bold rounded font-mono bg-indigo-50 border-indigo-200 text-indigo-700">
                            Buku: {item.noBuku || "-"}
                          </span>
                          <span
                            className={`px-2 py-0.5 border text-[9px] font-bold rounded ${
                              item.kategoriTemuan === "DITEMUKAN"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {item.kategoriTemuan === "DITEMUKAN" ? "Ditemukan" : "Perlu Konfirmasi"}
                          </span>
                        </div>
                        
                        <div className="text-[10px] text-gray-800 space-y-1">
                          <div>
                            <strong className="text-gray-900">Uraian Transaksi:</strong>{" "}
                            {item.uraianTransaksi || "-"}
                          </div>
                          <div>
                            <strong className="text-gray-900">Temuan Audit:</strong>{" "}
                            {item.deskripsiTemuan}
                          </div>
                          {item.kodeTemuan && (
                            <div className="text-[9px] text-gray-400 font-mono">
                              Kode: {item.kodeTemuan}
                            </div>
                          )}
                        </div>

                        {/* HOVER ACTIONS */}
                        <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-[9px] border border-gray-350 bg-white hover:bg-gray-100 text-gray-700 rounded font-bold transition-colors"
                          >
                            <Edit className="w-2.5 h-2.5" />
                            Ubah
                          </button>
                          <button
                            onClick={() => handleDeleteFinding(item.id)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-[9px] border border-transparent bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-gray-200 rounded text-xs text-gray-400 italic">
                    Belum ada temuan sementara yang diinput. Klik 'Detail' di baris transaksi kas untuk memulainya.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
