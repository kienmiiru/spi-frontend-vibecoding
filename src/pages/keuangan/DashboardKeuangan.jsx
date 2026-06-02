import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { apiFetch } from "../../lib/api";
import YearDropdown from "../../components/YearDropdown";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function DashboardKeuangan() {
  const chartRef = useRef(null);
  const [data, setData] = useState({});
  const [tahunAnggaran, setTahunAnggaran] = useState(`${new Date().getFullYear()}`);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch(`/api/keuangan/opname/grafik/${tahunAnggaran}`, {
          method: "GET",
        });
        setData(response);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [tahunAnggaran]);

  // Get labels (fakultas names)
  const labels = Object.keys(data);

  // Prepare data arrays
  const realData = labels.map((f) => data[f].real || 0);
  const visitasiData = labels.map((f) => data[f].visitasi || 0);
  const selisihData = labels.map(
    (f, i) => (visitasiData[i] || 0) - (realData[i] || 0),
  );

  // 3 datasets: Saldo Sistem & Fisik (tampil), Selisih (tersembunyi)
  // Selisih otomatis muncul ketika Sistem & Fisik keduanya di-hide via legenda
  const chartDatasets = [
    {
      label: "Saldo Sistem",
      data: realData,
      backgroundColor: "#5A0D08",
      borderColor: "#5A0D08",
      borderWidth: 0,
      borderRadius: 5,
      borderSkipped: false,
      hoverBackgroundColor: "#7a1610",
      barPercentage: 0.85,
      categoryPercentage: 0.85,
    },
    {
      label: "Saldo Fisik",
      data: visitasiData,
      backgroundColor: "#d97706",
      borderColor: "#d97706",
      borderWidth: 0,
      borderRadius: 5,
      borderSkipped: false,
      hoverBackgroundColor: "#b45309",
      barPercentage: 0.85,
      categoryPercentage: 0.85,
    },
    {
      label: "Selisih",
      data: selisihData,
      backgroundColor: selisihData.map((s) =>
        s < 0 ? "rgba(239,68,68,0.85)" : "rgba(34,197,94,0.85)",
      ),
      borderColor: selisihData.map((s) => (s < 0 ? "#ef4444" : "#22c55e")),
      borderWidth: 0,
      borderRadius: 5,
      borderSkipped: false,
      hoverBackgroundColor: selisihData.map((s) =>
        s < 0 ? "#dc2626" : "#16a34a",
      ),
      barPercentage: 0.85,
      categoryPercentage: 0.85,
      hidden: true, // tersembunyi secara default
    },
  ];

  // Custom legend click handler
  // Logika: ketika Sistem & Fisik keduanya di-hide → Selisih muncul
  //         ketika salah satu di-show → Selisih tersembunyi
  const handleLegendClick = (e, legendItem) => {
    const chart = chartRef.current;
    if (!chart) return;

    const clickedIndex = legendItem.datasetIndex;

    // Toggle visibility dataset yang diklik
    const meta = chart.getDatasetMeta(clickedIndex);
    meta.hidden =
      meta.hidden === null ? !chart.data.datasets[clickedIndex].hidden : null;

    // Cek apakah Sistem (index 0) dan Fisik (index 1) keduanya hidden
    const sistemHidden = chart.getDatasetMeta(0).hidden;
    const fisikHidden = chart.getDatasetMeta(1).hidden;
    const bothHidden = sistemHidden && fisikHidden;

    // Jika dataset yang diklik adalah Selisih (index 2), biarkan toggle biasa
    if (clickedIndex === 2) {
      chart.update();
      return;
    }

    // Auto-toggle Selisih berdasarkan kondisi Sistem & Fisik
    const selisihMeta = chart.getDatasetMeta(2);
    if (bothHidden) {
      selisihMeta.hidden = null; // tampilkan Selisih
    } else {
      selisihMeta.hidden = true; // sembunyikan Selisih
    }

    chart.update();
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: "easeOutQuart",
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { family: "Poppins", size: 12, weight: "500" },
          boxWidth: 14,
          boxHeight: 14,
          padding: 20,
          usePointStyle: true,
          pointStyle: "rectRounded",
          color: "#374151",
        },
        onClick: handleLegendClick,
      },
      tooltip: {
        backgroundColor: "rgba(30,30,30,0.92)",
        titleFont: { family: "Poppins", size: 13, weight: "600" },
        bodyFont: { family: "Poppins", size: 12 },
        padding: { top: 12, bottom: 12, left: 16, right: 16 },
        cornerRadius: 10,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            let value = context.raw;
            const prefix = value < 0 ? "-" : "";
            return ` ${label}: ${prefix}Rp ${Math.abs(value).toLocaleString("id-ID")}`;
          },
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(0,0,0,0.04)",
          drawBorder: false,
        },
        border: { display: false },
        ticks: {
          callback: (v) => {
            const prefix = v < 0 ? "-" : "";
            return `${prefix}Rp ${(Math.abs(v) / 1000000).toFixed(1)}jt`;
          },
          font: { family: "Poppins", size: 11 },
          maxTicksLimit: 8,
          color: "#9ca3af",
          padding: 6,
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 12,
          font: { family: "Poppins", size: 10 },
          maxRotation: 30,
          minRotation: 0,
          color: "#6b7280",
          padding: 4,
        },
      },
    },
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#000000" }}>
          Grafik Cash Opname
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Visualisasi data Saldo Sistem, Saldo Fisik, dan Selisih per fakultas
        </p>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">
          Perbandingan Saldo per Unit Kerja
        </h2>
        <YearDropdown value={tahunAnggaran} onChange={(tahun) => setTahunAnggaran(tahun)} />
        <div className="h-[300px] sm:h-[380px] md:h-[440px]">
          <Bar
            ref={chartRef}
            data={{ labels, datasets: chartDatasets }}
            options={chartOptions}
          />
        </div>
      </div>
    </div>
  );
}
