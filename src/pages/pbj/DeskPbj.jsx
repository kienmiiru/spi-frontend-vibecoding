import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDFJS global worker source to load from CDN matching the package version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
import {
  ArrowLeft,
  Loader2,
  Upload,
  Edit2,
  Trash2,
  FileText,
  ChevronRight,
  Plus,
  Save,
  X,
  CheckCircle,
  File
} from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import Table from "../../components/Table";
import { apiFetch } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";

export default function DeskPbj() {
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "packets" | "detail"

  // Selected entities
  const [selectedFakultas, setSelectedFakultas] = useState(null);
  const [packetList, setPacketList] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [kelengkapanList, setKelengkapanList] = useState([]);
  const [numPages, setNumPages] = useState(null);

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(500);

  const setContainerRef = (node) => {
    if (node !== null) {
      containerRef.current = node;
      setContainerWidth(node.clientWidth - 32); // 32px accounts for p-4 padding
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Upload Form states
  const [uploadTipe, setUploadTipe] = useState("BARANG");
  const [uploadFile, setUploadFile] = useState(null);

  // Edit Form states
  const [editForm, setEditForm] = useState({
    id: null,
    nomor: "",
    nama: ""
  });

  // Loading & Notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPackets, setIsLoadingPackets] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Load initial faculties
  const loadFaculties = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/api/fakultas");
      setFakultasList(data || []);
    } catch (err) {
      showNotification(err.message || "Gagal memuat data unit kerja", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFaculties();
  }, []);

  // Fetch packets for a faculty and year
  const loadPackets = async (fakultasName) => {
    setIsLoadingPackets(true);
    try {
      const data = await apiFetch(
        `/api/pbj/paket/dtm/${encodeURIComponent(fakultasName)}/${selectedYear}`
      );
      setPacketList(data || []);
    } catch (err) {
      // If DTM not found (404), treat as empty list
      setPacketList([]);
    } finally {
      setIsLoadingPackets(false);
    }
  };

  // Select faculty
  const handleSelectFakultas = async (fakultas) => {
    setSelectedFakultas(fakultas);
    setViewMode("packets");
    await loadPackets(fakultas.namaFakultas);
  };

  // File Upload Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showNotification("Silakan pilih berkas PDF terlebih dahulu", "error");
      return;
    }
    if (!selectedFakultas) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("tipeDokumen", uploadTipe);
      formData.append("fakultas", selectedFakultas.namaFakultas);
      formData.append("tahunAnggaran", selectedYear);

      await apiFetch("/api/pbj/paket", {
        method: "POST",
        body: formData
      });

      confirm({
        title: "",
        message: "Paket baru berhasil diunggah",
        type: "info"
      });
      setIsUploadOpen(false);
      setUploadFile(null);
      // Reset input element
      const fileInput = document.getElementById("packet-pdf-upload");
      if (fileInput) fileInput.value = "";

      // Refresh list
      await loadPackets(selectedFakultas.namaFakultas);
    } catch (err) {
      showNotification("Gagal mengunggah paket: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (packet) => {
    setEditForm({
      id: packet.id,
      nomor: packet.nomor || "",
      nama: packet.nama || ""
    });
    setIsEditOpen(true);
  };

  // Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.id) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/pbj/paket/${editForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nomor: editForm.nomor,
          nama: editForm.nama
        })
      });

      confirm({
        title: "",
        message: "Paket berhasil diperbarui",
        type: "info"
      });
      setIsEditOpen(false);
      await loadPackets(selectedFakultas.namaFakultas);
    } catch (err) {
      showNotification("Gagal memperbarui paket: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Packet
  const handleDeletePacket = async (packetId) => {
    const confirmed = await confirm({
      title: "",
      message: "Apakah Anda yakin ingin menghapus paket ini beserta semua kelengkapan dan temuannya?",
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger"
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/pbj/paket/${packetId}`, {
        method: "DELETE"
      });
      confirm({
        title: "",
        message: "Paket berhasil dihapus",
        type: "info"
      });
      await loadPackets(selectedFakultas.namaFakultas);
    } catch (err) {
      showNotification("Gagal menghapus paket: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Detail View (Split View)
  const handleOpenDetail = async (packet) => {
    setSelectedPacket(packet);
    setNumPages(null);
    setIsLoadingDetail(true);
    try {
      const data = await apiFetch(`/api/pbj/kelengkapan/paket/${packet.id}`);
      setKelengkapanList(data || []);
      setViewMode("detail");
    } catch (err) {
      showNotification("Gagal memuat kriteria kelengkapan: " + err.message, "error");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Kelengkapan State Updates locally
  const handleKelengkapanChange = (itemId, field, value) => {
    setKelengkapanList((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  // Save Kelengkapan Checklist
  const handleSaveKelengkapan = async () => {
    if (!selectedPacket) return;
    setIsSaving(true);
    try {
      const payload = kelengkapanList.map((item) => ({
        checklistPbjId: item.checklistPbjId,
        kelengkapanPbjId: item.id, // send both to be safe
        ada: !!item.ada,
        sesuai: !!item.sesuai,
        catatan: item.catatan || ""
      }));

      await apiFetch(`/api/pbj/kelengkapan/paket/${selectedPacket.id}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      confirm({
        title: "",
        message: "Kelengkapan dokumen paket berhasil disimpan",
        type: "info"
      });
    } catch (err) {
      showNotification("Gagal menyimpan kelengkapan: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Group kelengkapan by category
  const getGroupedKelengkapan = () => {
    return kelengkapanList.reduce((acc, item) => {
      const cat = item.checklistPbj?.kategori || "Umum";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  };

  const grouped = getGroupedKelengkapan();

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
            Desk PBJ
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === "list" && "Pilih unit kerja untuk mengelola berkas paket dan kelengkapan dokumen pengadaan."}
            {viewMode === "packets" && `Daftar paket pengadaan di unit kerja: ${selectedFakultas?.namaFakultas}`}
            {viewMode === "detail" && `Detail Evaluasi Kelengkapan: ${selectedPacket?.nama || "Paket"}`}
          </p>
        </div>

        {viewMode === "list" ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Tahun Anggaran:</span>
            <YearDropdown value={selectedYear} onChange={setSelectedYear} />
          </div>
        ) : viewMode === "packets" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Unggah Paket Baru
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                setSelectedFakultas(null);
                setPacketList([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setViewMode("packets");
              setSelectedPacket(null);
              setNumPages(null);
              setKelengkapanList([]);
              loadPackets(selectedFakultas.namaFakultas);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Paket
          </button>
        )}
      </div>

      {/* VIEW 1: UNIT KERJA LIST */}
      {viewMode === "list" && (
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white border border-gray-300">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="text-sm font-medium">Memuat data unit kerja...</span>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="w-16 text-center">No</Table.HeaderCell>
                  <Table.HeaderCell>Unit Kerja</Table.HeaderCell>
                  <Table.HeaderCell className="text-center w-48">Aksi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fakultasList.map((fak, index) => (
                  <Table.Row key={fak.id}>
                    <Table.Cell className="text-center font-medium text-gray-500">
                      {index + 1}
                    </Table.Cell>
                    <Table.Cell className="font-semibold text-gray-800">
                      {fak.namaFakultas}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <button
                        onClick={() => handleSelectFakultas(fak)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        Pilih Unit Kerja
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      )}

      {/* VIEW 2: PACKETS LIST FOR FACULTY */}
      {viewMode === "packets" && (
        <div>
          {isLoadingPackets ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white border border-gray-300">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="text-sm font-medium">Memuat daftar paket...</span>
            </div>
          ) : packetList.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="w-16 text-center">No</Table.HeaderCell>
                  <Table.HeaderCell>Nama Paket</Table.HeaderCell>
                  <Table.HeaderCell className="w-48 text-center">Tipe</Table.HeaderCell>
                  <Table.HeaderCell className="w-48 text-center">Tanggal Diupload</Table.HeaderCell>
                  <Table.HeaderCell className="w-72 text-center">Aksi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {packetList.map((packet, index) => (
                  <Table.Row key={packet.id}>
                    <Table.Cell className="text-center font-medium text-gray-500">
                      {index + 1}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-semibold text-gray-900 truncate max-w-lg">
                        {packet.nama || "Tanpa Nama"}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        No: {packet.nomor || "-"}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        packet.tipeDokumen === "BARANG"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : packet.tipeDokumen === "JASA"
                          ? "bg-teal-50 border-teal-200 text-teal-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}>
                        {packet.tipeDokumen}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-center text-xs text-gray-500">
                      {packet.tanggalUpload ? new Date(packet.tanggalUpload).toLocaleDateString("id-ID") : "-"}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(packet)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-800 bg-white text-gray-800 hover:bg-gray-100 rounded text-xs font-semibold transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Detail
                        </button>
                        <button
                          onClick={() => handleOpenEdit(packet)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded text-xs font-semibold transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePacket(packet.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-transparent bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <div className="border border-gray-300 p-16 flex flex-col items-center justify-center text-center bg-gray-50/50">
              <File className="w-12 h-12 text-gray-300 stroke-1 mb-2" />
              <span className="text-xs text-gray-400 font-semibold">
                Belum ada paket pengadaan diunggah untuk unit kerja ini di tahun {selectedYear}.
              </span>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Unggah Paket Pertama
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: SPLIT VIEW DETAIL & CHECKLIST */}
      {viewMode === "detail" && selectedPacket && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: PDF VIEWER */}
          <div className="lg:col-span-6 border border-gray-300 rounded p-4 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gray-500" />
                Pratinjau PDF Berkas
              </h2>
            </div>
            {selectedPacket.linkPdf ? (
              <div
                ref={setContainerRef}
                className="w-full h-[650px] border border-gray-300 rounded overflow-y-auto bg-gray-50 flex flex-col items-center p-4"
              >
                <Document
                  file={selectedPacket.linkPdf}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-xs">Memuat PDF...</span>
                    </div>
                  }
                  error={
                    <div className="text-xs text-red-500 font-semibold p-4 text-center">
                      Gagal memuat berkas PDF.
                    </div>
                  }
                  externalLinkTarget="_blank"
                >
                  {Array.from(new Array(numPages || 0), (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      renderAnnotationLayer={true}
                      renderTextLayer={true}
                      className="mb-4 shadow-md bg-white border border-gray-250"
                      width={containerWidth}
                    />
                  ))}
                </Document>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] border border-dashed border-gray-200 rounded text-xs text-gray-400">
                PDF tidak tersedia
              </div>
            )}
          </div>

          {/* RIGHT PANEL: CHECKLIST REQUIREMENTS */}
          <div className="lg:col-span-6 border border-gray-300 rounded p-4 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Kriteria Kelengkapan Dokumen
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Tipe Dokumen: {selectedPacket.tipeDokumen}
                </p>
              </div>
              <button
                onClick={handleSaveKelengkapan}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="text-xs font-semibold">Memuat kelengkapan...</span>
              </div>
            ) : kelengkapanList.length > 0 ? (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
                {Object.keys(grouped).map((kategori) => (
                  <div key={kategori} className="space-y-2">
                    <h3 className="text-[11px] font-extrabold text-gray-950 uppercase tracking-wider bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200">
                      {kategori}
                    </h3>
                    <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {grouped[kategori].map((item) => (
                        <div key={item.id} className="p-3 hover:bg-gray-50/50 space-y-2">
                          <div className="text-xs font-semibold text-gray-900 leading-relaxed">
                            {item.checklistPbj?.uraian}
                            {item.checklistPbj?.namaSingkat && (
                              <span className="ml-1 text-[10px] text-gray-400 font-bold">
                                ({item.checklistPbj.namaSingkat})
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 pt-1">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={!!item.ada}
                                onChange={(e) => {
                                  handleKelengkapanChange(item.id, "ada", e.target.checked)
                                  if (!e.target.checked) handleKelengkapanChange(item.id, "sesuai", false)
                                }}
                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-500 w-3.5 h-3.5"
                              />
                              Ada
                            </label>
                            
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                              <input
                                type="checkbox"
                                disabled={!item.ada}
                                checked={!!item.sesuai}
                                onChange={(e) =>
                                  handleKelengkapanChange(item.id, "sesuai", e.target.checked)
                                }
                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-500 w-3.5 h-3.5"
                              />
                              Sesuai
                            </label>

                            <input
                              type="text"
                              value={item.catatan || ""}
                              onChange={(e) =>
                                handleKelengkapanChange(item.id, "catatan", e.target.value)
                              }
                              placeholder="Tambah catatan..."
                              className="flex-1 min-w-[120px] text-[11px] border border-gray-300 rounded px-2.5 py-1 focus:outline-none focus:border-gray-500 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-gray-400">
                Tidak ada data kriteria kelengkapan untuk tipe dokumen paket ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: UPLOAD NEW PACKET */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-250 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Unggah Paket Pengadaan Baru</h3>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tipe / Kategori Pengadaan
                </label>
                <select
                  value={uploadTipe}
                  onChange={(e) => setUploadTipe(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                >
                  <option value="BARANG">Barang</option>
                  <option value="JASA">Jasa</option>
                  <option value="KONSTRUKSI">Konstruksi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Berkas Paket PDF (.pdf)
                </label>
                <input
                  id="packet-pdf-upload"
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-gray-600 border border-gray-300 rounded p-1 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadFile(null);
                  }}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-55"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !uploadFile}
                  className="inline-flex items-center gap-1 px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Unggah Berkas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PACKET DETAILS */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-250 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Ubah Informasi Paket</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nomor Paket
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nomor}
                  onChange={(e) => setEditForm({ ...editForm, nomor: e.target.value })}
                  placeholder="Masukkan nomor paket pengadaan"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nama Paket
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  placeholder="Masukkan nama paket pengadaan"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-105">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-55"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

