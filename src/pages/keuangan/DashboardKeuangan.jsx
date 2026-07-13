import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Wallet } from "lucide-react";
import YearDropdown from "../../components/YearDropdown";
import Notification from "../../components/Notification";
import { apiFetch } from "../../lib/api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useConfirm } from "../../context/ConfirmContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardKeuangan() {
  const confirm = useConfirm();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch(`/api/keuangan/opname/grafik/${selectedYear}`);
      
      const labels = Object.keys(data || {});
      if (labels.length > 0) {
        const realValues = labels.map((label) => data[label].real || 0);
        const visitasiValues = labels.map((label) => data[label].visitasi || 0);
        const selisihValues = labels.map((label) => data[label].selisih || 0);

        setChartData({
          labels,
          datasets: [
            {
              label: "Saldo Sistem",
              data: realValues,
              backgroundColor: "#2563EB", // Blue-600
              borderColor: "#1D4ED8",
              borderWidth: 1,
            },
            {
              label: "Saldo Fisik",
              data: visitasiValues,
              backgroundColor: "#5A0D08", // Maroon
              borderColor: "#4A0A06",
              borderWidth: 1,
            },
            {
              label: "Selisih",
              data: selisihValues,
              backgroundColor: "#DC2626", // Red-600
              borderColor: "#B91C1C",
              borderWidth: 1,
            },
          ],
        });
      } else {
        setChartData(null);
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Gagal memuat data grafik cash opname", "error");
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, [selectedYear]);

  const formatIDR = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            family: "Poppins, sans-serif",
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += formatIDR(context.parsed.y);
            }
            return label;
          },
        },
        titleFont: {
          family: "Poppins, sans-serif",
          size: 12,
        },
        bodyFont: {
          family: "Poppins, sans-serif",
          size: 11,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function (value) {
            return formatIDR(value);
          },
          font: {
            family: "Poppins, sans-serif",
            size: 10,
          },
        },
        grid: {
          color: "#E5E7EB",
        },
      },
      x: {
        ticks: {
          font: {
            family: "Poppins, sans-serif",
            size: 10,
          },
        },
        grid: {
          display: false,
        },
      },
    },
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
            Dashboard Keuangan
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Visualisasi perbandingan saldo cash opname (sistem vs fisik) di seluruh Unit Kerja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-700">Tahun Anggaran:</span>
          <YearDropdown value={selectedYear} onChange={setSelectedYear} />
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="bg-white border border-gray-300 rounded p-6 shadow-sm">
        <h2 className="text-xs font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-c-maroon" />
          Grafik Cash Opname Seluruh Unit Kerja T.A. {selectedYear}
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="text-xs font-semibold">Memuat data grafik...</span>
          </div>
        ) : chartData ? (
          <div className="h-[450px] w-full">
            <Bar data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-lg p-20 text-center flex flex-col items-center justify-center bg-gray-50/50">
            <Wallet className="w-12 h-12 text-gray-300 stroke-1 mb-2" />
            <span className="text-xs text-gray-400 font-semibold">
              Tidak ada data cash opname untuk tahun anggaran {selectedYear}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
