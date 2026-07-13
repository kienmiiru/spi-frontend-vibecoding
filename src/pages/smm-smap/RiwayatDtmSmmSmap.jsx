import { useState, useEffect, useRef } from "react";
import * as docx from "docx-preview";
import { Eye, Download, Loader2, FileText, FileDown } from "lucide-react";

import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import Table from "../../components/Table";
import { apiFetch, apiFetchBlob } from "../../lib/api";
import { useConfirm } from "../../context/ConfirmContext";

export default function RiwayatDtmSmmSmap() {
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [fakultasList, setFakultasList] = useState([]);
  const [dtmList, setDtmList] = useState([]);

  // Preview state for docx-preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const previewContainerRef = useRef(null);

  // Loading & notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Load initial faculties and DTM lists
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [fakData, dtmData] = await Promise.all([
        apiFetch("/api/fakultas"),
        apiFetch(`/api/smm-smap/dtm?tahunAnggaran=${selectedYear}`),
      ]);
      setFakultasList(fakData);
      setDtmList(dtmData);
    } catch (err) {
      showNotification(err.message || "Gagal mengambil data awal", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [selectedYear]);

  // Find Faculty (Unit Kerja) name from id
  const getFacultyName = (fakultasId) => {
    const fakultas = fakultasList.find((f) => f.id === fakultasId);
    return fakultas ? fakultas.namaFakultas : "Tidak Diketahui";
  };

  // Filter only completed ones (statusDtm === "SUDAH_DITERUSKAN")
  const completedDtms = dtmList.filter(
    (dtm) => dtm.statusDtm === "SUDAH_DITERUSKAN"
  );

  // Action: Export to DOCX
  const handleExportDocx = async (dtm) => {
    if (!dtm) return;
    setIsSaving(true);
    try {
      const unitKerjaName = getFacultyName(dtm.fakultasId);
      const blob = await apiFetchBlob("/api/smm-smap/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: dtm.id }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTM_SMM_SMAP_${unitKerjaName}_${selectedYear}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("Berkas Word (DOCX) berhasil diekspor dan diunduh");
    } catch (err) {
      showNotification("Gagal mengekspor dokumen Word: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Preview DOCX using docx-preview
  const handlePreviewDocx = async (dtm) => {
    if (!dtm) return;
    setIsSaving(true);
    try {
      const unitKerjaName = getFacultyName(dtm.fakultasId);
      setPreviewTitle(`Pratinjau DTM SMM-SMAP - ${unitKerjaName}`);

      const blob = await apiFetchBlob("/api/smm-smap/office/export-docx", {
        method: "POST",
        body: JSON.stringify({ dtmId: dtm.id }),
      });
      setPreviewBlob(blob);
      setIsPreviewOpen(true);
    } catch (err) {
      showNotification("Gagal memuat pratinjau dokumen: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Render preview document on open
  useEffect(() => {
    if (isPreviewOpen && previewBlob && previewContainerRef.current) {
      previewContainerRef.current.innerHTML = '<div class="text-xs text-gray-500 text-center py-8">Merender dokumen...</div>';

      docx.renderAsync(previewBlob, previewContainerRef.current, null, {
        className: "docx",
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        experimental: false
      }).then(() => {
        previewContainerRef.current.querySelectorAll('iframe').forEach(iframe => {
          iframe.style.width = '100%';
          iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 50 + 'px';
        });
      }).catch((err) => {
        console.error("docx-preview error:", err);
        if (previewContainerRef.current) {
          previewContainerRef.current.innerHTML = `<div class="p-4 text-xs text-red-500 font-semibold">Gagal me-render pratinjau dokumen: ${err.message}</div>`;
        }
      });
    }
  }, [isPreviewOpen, previewBlob]);

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
            Riwayat DTM SMM-SMAP
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Menampilkan semua DTM SMM-SMAP yang telah ditandai selesai.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Tahun Anggaran:</span>
          <YearDropdown value={selectedYear} onChange={setSelectedYear} />
        </div>
      </div>

      {/* MAIN VIEW */}
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white border border-gray-300">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-xs font-semibold">Memuat data riwayat...</span>
          </div>
        ) : completedDtms.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-16 text-center">No</Table.HeaderCell>
                <Table.HeaderCell>Unit Kerja</Table.HeaderCell>
                <Table.HeaderCell className="text-center w-40">Tahun Anggaran</Table.HeaderCell>
                <Table.HeaderCell className="text-center w-56">Aksi</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {completedDtms.map((dtm, index) => (
                <Table.Row key={dtm.id}>
                  <Table.Cell className="text-center font-medium">
                    {index + 1}
                  </Table.Cell>
                  <Table.Cell className="font-semibold text-gray-900">
                    {getFacultyName(dtm.fakultasId)}
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    {dtm.tahunAnggaran}
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePreviewDocx(dtm)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded text-xs font-medium transition-colors disabled:opacity-50"
                        title="Pratinjau Dokumen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Pratinjau
                      </button>
                      <button
                        onClick={() => handleExportDocx(dtm)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-800 bg-gray-800 text-white hover:bg-gray-900 rounded text-xs font-medium transition-colors disabled:opacity-50"
                        title="Ekspor ke Word"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Ekspor Word
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <div className="border border-gray-300 p-12 flex flex-col items-center justify-center text-center bg-gray-50/50">
            <span className="text-xs text-gray-400 font-semibold">
              Tidak ada riwayat DTM SMM-SMAP yang sudah ditandai selesai untuk tahun anggaran {selectedYear}.
            </span>
          </div>
        )}
      </div>

      {/* DOCX PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded border border-gray-300 shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">{previewTitle}</h3>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewBlob(null);
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-100 flex justify-center">
              <div
                ref={previewContainerRef}
                className="bg-white shadow p-8 max-w-[800px] w-full min-h-[500px] h-fit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}